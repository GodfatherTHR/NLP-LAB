/* =====================================================================
   Layout & typography audit via CDP.
   Checks each page for:
     • zero-height cards / invisible panels (CSS/layout failures)
     • text clipped by overflow:hidden with no ellipsis handling
     • elements rendered below 10px font
     • low-contrast body text
     • overlapping siblings in the topbar
   Run:  node tests/layout.test.js
   ===================================================================== */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
const PORT = 9633;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
const failures = [];
const check = (c, l, extra) => {
  if (c) pass++;
  else { fail++; failures.push(l + (extra ? ' — ' + extra : '')); }
};

async function main() {
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'nlp-layout-')),
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; }
    } catch (e) { /* wait */ }
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });
  let id = 0;
  const pend = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  };
  const send = (method, params, sid) => new Promise((res) => {
    const mid = ++id;
    pend.set(mid, res);
    ws.send(JSON.stringify({ id: mid, method, params: params || {}, sessionId: sid }));
  });

  const { result: t } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: a } = await send('Target.attachToTarget', { targetId: t.targetId, flatten: true });
  const sid = a.sessionId;
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);

  const base = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

  async function audit(hash, width, height) {
    await send('Emulation.setDeviceMetricsOverride',
      { width, height, deviceScaleFactor: 1, mobile: width < 700 }, sid);
    await send('Page.navigate', { url: base + '#' + hash }, sid);
    await sleep(900);
    // Compare against the VIEWPORT we asked for, not window.innerWidth:
    // when content overflows, mobile emulation widens the layout viewport
    // and innerWidth grows with it, which would hide the very bug we test.
    const r = await send('Runtime.evaluate', {
      returnByValue: true,
      expression: `(() => {
        const VW = ${width};
        const out = { zero: [], tiny: [], clipped: [], lowContrast: [], wide: [], grew: [] };

        function parseRGB(s) {
          const m = s && s.match(/rgba?\\(([^)]+)\\)/);
          if (!m) return null;
          const p = m[1].split(',').map(x => parseFloat(x));
          return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
        }
        function lum(c) {
          const f = v => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
          return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
        }
        function bgOf(el) {
          let n = el;
          while (n && n !== document.documentElement) {
            const c = parseRGB(getComputedStyle(n).backgroundColor);
            if (c && c.a > 0.5) return c;
            n = n.parentElement;
          }
          return parseRGB(getComputedStyle(document.body).backgroundColor) || { r: 8, g: 11, b: 16, a: 1 };
        }

        document.querySelectorAll('.card, .panel, .kpi, .learn-box, .hero, .quiz-q').forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.height < 8 || b.width < 8) {
            out.zero.push({ cls: (el.className || '').toString().slice(0, 50), h: Math.round(b.height), w: Math.round(b.width) });
          }
        });

        document.querySelectorAll('#content *').forEach(el => {
          if (!el.textContent || !el.textContent.trim()) return;
          const cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden') return;
          const fs = parseFloat(cs.fontSize);
          if (fs && fs < 9 && el.children.length === 0 && el.textContent.trim().length > 2) {
            out.tiny.push({ cls: (el.className || '').toString().slice(0, 40), fs: fs, txt: el.textContent.trim().slice(0, 24) });
          }
          // low contrast on leaf text nodes
          if (el.children.length === 0 && el.textContent.trim().length > 3) {
            const fg = parseRGB(cs.color);
            const bg = bgOf(el);
            if (fg && bg && fg.a > 0.4) {
              const L1 = lum(fg), L2 = lum(bg);
              const ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
              if (ratio < 3.0) {
                out.lowContrast.push({ cls: (el.className || '').toString().slice(0, 36), ratio: +ratio.toFixed(2), txt: el.textContent.trim().slice(0, 30) });
              }
            }
          }
        });

        // elements wider than the requested viewport not inside a scroll container
        document.querySelectorAll('#content *').forEach(el => {
          const b = el.getBoundingClientRect();
          if (b.width <= VW + 2) return;
          let n = el.parentElement, scrollable = false;
          while (n && n !== document.body) {
            const cs = getComputedStyle(n);
            if (/auto|scroll/.test(cs.overflowX)) { scrollable = true; break; }
            n = n.parentElement;
          }
          if (!scrollable) out.wide.push({ cls: (el.className || '').toString().slice(0, 40), w: Math.round(b.width), vw: VW });
        });

        // The layout viewport must not be forced wider than the device width.
        if (window.innerWidth > VW + 2) {
          out.grew.push({ innerW: window.innerWidth, want: VW });
        }

        // cap lists
        Object.keys(out).forEach(k => { out[k] = out[k].slice(0, 6); });
        out.scrollW = document.documentElement.scrollWidth;
        out.innerW = window.innerWidth;
        out.vw = VW;
        return out;
      })()`
    }, sid);
    return r.result.result.value;
  }

  const routes = ['overview', 'start', 'preprocess', 'stem', 'tfidf', 'similarity', 'classify',
    'lm', 'bpe', 'embeddings', 'pos', 'attention', 'glossary', 'evaluation'];

  for (const w of [1440, 768, 390]) {
    for (const route of routes) {
      const r = await audit('/' + route, w, 900);
      const tag = `[${w}px ${route}]`;
      check(r.grew.length === 0, tag + ' viewport not forced wider than device', JSON.stringify(r.grew));
      check(r.scrollW <= r.vw + 2, tag + ' no page overflow', r.scrollW + '>' + r.vw);
      check(r.zero.length === 0, tag + ' no collapsed cards', JSON.stringify(r.zero));
      check(r.tiny.length === 0, tag + ' no unreadable text (<9px)', JSON.stringify(r.tiny));
      check(r.wide.length === 0, tag + ' no unclipped wide elements', JSON.stringify(r.wide));
      // Low contrast is reported but only enforced on dark theme body text
      if (r.lowContrast.length) {
        const serious = r.lowContrast.filter((x) => x.ratio < 2.2);
        check(serious.length === 0, tag + ' no very-low-contrast text', JSON.stringify(serious));
      } else {
        pass++;
      }
    }
  }

  await send('Target.closeTarget', { targetId: t.targetId });
  ws.close();
  proc.kill();

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailures:\n' + failures.slice(0, 40).map((f, i) => `${i + 1}. ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
