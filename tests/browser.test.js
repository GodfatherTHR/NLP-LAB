/* =====================================================================
   Real-browser tests via Chrome DevTools Protocol (no extra npm deps).
   Launches headless Chrome, visits every route, and checks:
     • no uncaught exceptions / console errors
     • no horizontal page overflow at 1440px and 390px
     • per-lab DOM assertions
     • screenshots into tests/shots/ (desktop + mobile)
   Run:  node tests/browser.test.js
   ===================================================================== */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
// Regression screenshots go in their own folder so the curated previews
// in tests/shots/ (produced by shots.js) stay clean.
const SHOTS = path.join(__dirname, 'shots', '_regression');
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
];
const CHROME = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) {
  console.error('No Chrome/Edge binary found.');
  process.exit(1);
}

const PORT = 9611;
const URL_BASE = 'file:///' + ROOT.replace(/\\/g, '/') + '/index.html';

let pass = 0;
let fail = 0;
const failures = [];
function check(cond, label, extra) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(label + (extra ? ' — ' + extra : ''));
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nlp-lab-chrome-'));
  const proc = spawn(CHROME, [
    '--headless=new',
    '--disable-gpu',
    '--no-sandbox',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--hide-scrollbars',
    '--allow-file-access-from-files',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + userDataDir,
    'about:blank'
  ], { stdio: 'ignore' });

  // Wait for the debugging endpoint
  let wsUrl = null;
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      const j = await res.json();
      if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; }
    } catch (e) { /* not up yet */ }
  }
  if (!wsUrl) {
    console.error('Could not connect to Chrome DevTools.');
    proc.kill();
    process.exit(1);
  }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let id = 0;
  const pending = new Map();
  const events = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve } = pending.get(msg.id);
      pending.delete(msg.id);
      resolve(msg);
    } else if (msg.method) {
      events.push(msg);
    }
  };
  const send = (method, params, sessionId) => new Promise((resolve) => {
    const mid = ++id;
    pending.set(mid, { resolve });
    ws.send(JSON.stringify({ id: mid, method, params: params || {}, sessionId }));
  });

  // Attach to a fresh tab
  const { result: target } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: attached } = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;

  await send('Page.enable', {}, sessionId);
  await send('Runtime.enable', {}, sessionId);
  await send('Log.enable', {}, sessionId);
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false }, sessionId);

  events.length = 0;

  async function evalJs(expr) {
    const r = await send('Runtime.evaluate', {
      expression: expr,
      returnByValue: true,
      awaitPromise: true
    }, sessionId);
    if (r.result && r.result.exceptionDetails) {
      return { __error: r.result.exceptionDetails.text || 'eval error' };
    }
    return r.result && r.result.result ? r.result.result.value : undefined;
  }

  function drainErrors() {
    const out = [];
    for (const e of events.splice(0)) {
      if (e.method === 'Runtime.exceptionThrown') {
        const d = e.params.exceptionDetails;
        out.push('exception: ' + (d.exception && d.exception.description ? d.exception.description.split('\n')[0] : d.text));
      } else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        out.push('console.error: ' + e.params.args.map((a) => a.value || a.description || '').join(' '));
      } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
        out.push('log: ' + e.params.entry.text);
      }
    }
    return out;
  }

  async function goto(hash, waitMs = 700) {
    await send('Page.navigate', { url: URL_BASE + '#' + hash }, sessionId);
    await sleep(waitMs);
  }

  async function screenshot(name, opts = {}) {
    const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId);
    if (result && result.data) {
      fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(result.data, 'base64'));
    }
  }

  const routes = ['overview', 'start', 'preprocess', 'stem', 'tfidf', 'similarity', 'classify', 'lm', 'bpe', 'embeddings', 'pos', 'attention', 'glossary', 'evaluation'];

  for (const route of routes) {
    events.length = 0;
    await goto('/' + route);
    const info = await evalJs(`(() => {
      const de = document.documentElement;
      const content = document.getElementById('content');
      return {
        title: document.title,
        route: location.hash,
        contentLen: content ? content.innerHTML.length : 0,
        heroTitle: (content.querySelector('h1') || {}).textContent || '',
        scrollW: de.scrollWidth,
        innerW: window.innerWidth,
        theme: de.getAttribute('data-theme'),
        cards: content.querySelectorAll('.card').length,
        kpis: content.querySelectorAll('.kpi').length,
        navActive: (document.querySelector('.nav-item.active') || {}).textContent || '',
        bodyBg: getComputedStyle(document.body).backgroundColor,
        sidebarW: document.getElementById('sidebar').getBoundingClientRect().width
      };
    })()`);
    const errs = drainErrors();

    check(!info.__error, '[' + route + '] evaluate ok', info.__error);
    check(info.contentLen > 400, '[' + route + '] content rendered', 'len=' + info.contentLen);
    check(info.scrollW <= info.innerW + 1, '[' + route + '] no horizontal overflow @1440', info.scrollW + ' > ' + info.innerW);
    check(errs.length === 0, '[' + route + '] no JS errors', errs.join(' | '));
    check(info.sidebarW > 200, '[' + route + '] sidebar visible', 'w=' + info.sidebarW);
    check(/rgb\(8, 11, 16\)|rgb\(246, 248, 252\)/.test(info.bodyBg), '[' + route + '] theme background applied', info.bodyBg);

    await screenshot('desktop-' + route);
  }

  /* ---------------- per-lab behaviour ---------------- */
  events.length = 0;

  // Preprocess: toggling stop words changes the final token count
  await goto('/preprocess');
  const preA = await evalJs(`(() => {
    const ta = document.getElementById('textIn');
    ta.value = "I do not like the boring film";
    ta.dispatchEvent(new Event('input', {bubbles:true}));
    return document.querySelectorAll('#flow .token-stage').length;
  })()`);
  check(preA >= 4, 'preprocess renders 4+ stages', 'stages=' + preA);
  const preStop = await evalJs(`(() => {
    const cb = document.querySelector('[data-opt="stopwords"]');
    cb.checked = false; cb.dispatchEvent(new Event('change', {bubbles:true}));
    const stages = document.querySelectorAll('#flow .token-stage');
    const chips = Array.from(stages[stages.length-1].querySelectorAll('.chip .w')).map(e=>e.textContent);
    return chips.join(' ');
  })()`);
  check(/\bnot\b/.test(preStop), 'preprocess keeps "not" with stop-word removal off', preStop.slice(0, 120));

  // Stem
  await goto('/stem');
  const stemOut = await evalJs(`(() => {
    const w = document.getElementById('wordIn');
    w.value = 'relational'; w.dispatchEvent(new Event('input', {bubbles:true}));
    return document.getElementById('wordResult').textContent;
  })()`);
  check(/relat/.test(stemOut), 'stem trace shows relat', stemOut.slice(0, 100));

  // TF-IDF
  await goto('/tfidf');
  const tf = await evalJs(`(() => {
    const cells = document.querySelectorAll('#heat .heat-cell');
    const sim = document.querySelectorAll('#simHeat .heat-cell');
    return { cells: cells.length, sim: sim.length, kpis: document.querySelectorAll('.kpi').length };
  })()`);
  check(tf.cells > 20, 'tfidf heatmap cells', 'cells=' + tf.cells);
  check(tf.sim > 10, 'tfidf similarity heatmap', 'sim=' + tf.sim);

  // Classify
  await goto('/classify');
  const cl = await evalJs(`(() => {
    document.getElementById('trainBtn').click();
    return {
      acc: (document.getElementById('results').textContent.match(/([0-9.]+)%/) || [])[1],
      cm: document.querySelectorAll('.cm-cell').length,
      rows: document.querySelectorAll('#predTable tbody tr').length,
      feats: document.querySelectorAll('#features .chip').length
    };
  })()`);
  check(cl.cm >= 4, 'classifier confusion matrix', 'cells=' + cl.cm);
  check(cl.rows > 3, 'classifier predictions', 'rows=' + cl.rows);
  check(cl.feats > 5, 'classifier top features', 'feats=' + cl.feats);
  check(Number(cl.acc) >= 50, 'classifier accuracy sane', 'acc=' + cl.acc + '%');

  // LM
  await goto('/lm');
  const lm = await evalJs(`(() => {
    document.getElementById('genBtn').click();
    return {
      next: document.querySelectorAll('.nextword').length,
      gen: document.getElementById('generated').textContent.trim(),
      ppl: document.getElementById('pplKpis').textContent
    };
  })()`);
  check(lm.next > 0, 'lm next words', 'n=' + lm.next);
  check(lm.gen.length > 10, 'lm generates text', lm.gen.slice(0, 60));
  check(/Perplexity/.test(lm.ppl), 'lm shows perplexity');

  // BPE
  await goto('/bpe');
  const bpe = await evalJs(`(() => {
    const w = document.getElementById('bpeWord');
    w.value = 'lowest'; w.dispatchEvent(new Event('input', {bubbles:true}));
    return {
      syms: document.querySelectorAll('#encodeOut .bpe-sym').length,
      vocab: document.querySelectorAll('#vocabChips .chip').length,
      pairs: document.querySelectorAll('#pairBars .barrow').length
    };
  })()`);
  check(bpe.syms > 0, 'bpe encodes', 'syms=' + bpe.syms);
  check(bpe.vocab > 5, 'bpe vocabulary chips', 'n=' + bpe.vocab);
  check(bpe.pairs > 3, 'bpe pair frequencies', 'n=' + bpe.pairs);

  // Embeddings — all three tabs
  await goto('/embeddings');
  const emb1 = await evalJs(`(() => ({
    pts: document.querySelectorAll('.scatter-pt').length,
    nn: document.querySelectorAll('#nnOut .barrow').length
  }))()`);
  check(emb1.pts > 40, 'embedding map points', 'n=' + emb1.pts);
  const emb2 = await evalJs(`(() => {
    document.querySelector('[data-tab="analogy"]').click();
    document.getElementById('analogyBtn').click();
    return document.getElementById('analogyOut').textContent;
  })()`);
  check(/queen/.test(emb2), 'analogy king-man+woman≈queen', emb2.slice(0, 80));
  const emb3 = await evalJs(`(() => {
    document.querySelector('[data-tab="learned"]').click();
    return { pts: document.querySelectorAll('#learnedMap .scatter-pt').length, nn: document.querySelectorAll('#learnNN .barrow').length };
  })()`);
  check(emb3.pts > 50, 'learned embedding map', 'n=' + emb3.pts);
  check(emb3.nn > 3, 'learned neighbours', 'n=' + emb3.nn);

  // POS
  await goto('/pos');
  const pos = await evalJs(`(() => ({
    toks: document.querySelectorAll('.pos-token').length,
    ents: document.querySelectorAll('.ent').length,
    tags: Array.from(document.querySelectorAll('.pos-token .t')).map(e=>e.textContent).join(',')
  }))()`);
  check(pos.toks > 10, 'pos tokens', 'n=' + pos.toks);
  check(pos.ents >= 3, 'ner entities found', 'n=' + pos.ents);

  // Attention
  await goto('/attention');
  const att = await evalJs(`(() => {
    const cells = document.querySelectorAll('.attn-cell');
    document.getElementById('headSel').value = '1';
    document.getElementById('headSel').dispatchEvent(new Event('change', {bubbles:true}));
    document.querySelector('[data-focus="3"]').click();
    return {
      cells: cells.length,
      focusBars: document.querySelectorAll('#focusBars .barrow').length,
      rowNote: document.getElementById('rowNote').textContent,
      raw: document.getElementById('rawScores').textContent
    };
  })()`);
  check(att.cells > 60, 'attention matrix cells', 'n=' + att.cells);
  check(att.focusBars > 3, 'attention focus bars', 'n=' + att.focusBars);
  check(/sums to 1/.test(att.rowNote), 'attention rows normalised', att.rowNote);
  check(/masked/.test(att.raw), 'attention shows mask', att.raw.slice(0, 60));

  // Quiz interaction
  await goto('/evaluation');
  const quiz = await evalJs(`(() => {
    document.querySelectorAll('.quiz-opt')[1].click();
    return {
      why: !!document.querySelector('.quiz-why'),
      disabled: document.querySelectorAll('.quiz-opt:disabled').length,
      score: document.getElementById('quizScore').textContent
    };
  })()`);
  check(quiz.why, 'quiz reveals explanation');
  check(quiz.disabled === 4, 'quiz locks answered question', 'disabled=' + quiz.disabled);

  // Glossary search
  await goto('/glossary');
  const gl = await evalJs(`(() => {
    const s = document.getElementById('glossSearch');
    s.value = 'attention'; s.dispatchEvent(new Event('input', {bubbles:true}));
    return { text: document.getElementById('glossList').textContent.length, has: /attention/i.test(document.getElementById('glossList').textContent) };
  })()`);
  check(gl.has, 'glossary search works');

  // Theme persistence
  await goto('/overview');
  const theme = await evalJs(`(() => {
    document.getElementById('themeBtn').click();
    const after = document.documentElement.getAttribute('data-theme');
    const stored = JSON.parse(localStorage.getItem('nlp-lab:v1') || '{}').theme;
    return { after, stored, bg: getComputedStyle(document.body).backgroundColor };
  })()`);
  check(theme.after === 'light' && theme.stored === 'light', 'theme toggles and persists', JSON.stringify(theme));
  await screenshot('desktop-overview-light');
  await evalJs(`document.getElementById('themeBtn').click()`);

  // Progress persists
  const prog = await evalJs(`(() => {
    location.hash = '#/stem';
    return new Promise(r => setTimeout(() => {
      document.querySelector('[data-role="mark-done"]').click();
      setTimeout(() => {
        const st = JSON.parse(localStorage.getItem('nlp-lab:v1') || '{}');
        r({
          stored: !!(st.done && st.done.stem),
          bar: document.getElementById('progressText').textContent,
          badge: document.querySelector('[data-role="lab-done-badge"]').textContent
        });
      }, 100);
    }, 400));
  })()`);
  check(prog.stored, 'progress saved for completed lab', JSON.stringify(prog));
  check(/1 \/ 10/.test(prog.bar), 'progress bar updates', prog.bar);

  // Mobile layout
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true }, sessionId);
  for (const r of ['overview', 'tfidf', 'attention', 'embeddings']) {
    await goto('/' + r);
    const m = await evalJs(`(() => ({
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth,
      sidebarHidden: document.getElementById('sidebar').getBoundingClientRect().left < 0 || getComputedStyle(document.getElementById('sidebar')).position === 'fixed',
      menuBtn: !!document.getElementById('menuBtn')
    }))()`);
    check(m.scrollW <= m.innerW + 1, '[mobile] ' + r + ' no horizontal overflow', m.scrollW + ' > ' + m.innerW);
    check(m.menuBtn, '[mobile] ' + r + ' hamburger present');
    await screenshot('mobile-' + r);
  }

  // Sidebar drawer opens
  const drawer = await evalJs(`(() => {
    document.getElementById('menuBtn').click();
    const sb = document.getElementById('sidebar');
    const open = sb.classList.contains('open');
    const scrim = !!document.getElementById('scrim');
    document.getElementById('scrim').click();
    return { open, scrim, closed: !sb.classList.contains('open') };
  })()`);
  check(drawer.open && drawer.scrim && drawer.closed, 'mobile drawer opens and closes', JSON.stringify(drawer));

  /* ---------------- keyboard shortcuts ---------------- */
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
  await goto('/preprocess');

  function key(k, code, keyCode) {
    return evalJs(`(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)}, code: ${JSON.stringify(code || k)}, keyCode: ${keyCode || 0}, bubbles: true }));
      return location.hash;
    })()`);
  }

  const kRight = await key('ArrowRight', 'ArrowRight', 39);
  await sleep(500);
  check(kRight === '#/stem', 'ArrowRight moves to next lab', kRight);

  const kLeft = await key('ArrowLeft', 'ArrowLeft', 37);
  await sleep(500);
  check(kLeft === '#/preprocess', 'ArrowLeft moves to previous lab', kLeft);

  const kG = await key('g', 'KeyG', 71);
  await sleep(400);
  check(kG === '#/glossary', 'G opens glossary', kG);

  const kD = await evalJs(`(() => {
    const before = document.documentElement.getAttribute('data-theme');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', keyCode: 68, bubbles: true }));
    const after = document.documentElement.getAttribute('data-theme');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', code: 'KeyD', keyCode: 68, bubbles: true }));
    return { before, after, restored: document.documentElement.getAttribute('data-theme') };
  })()`);
  check(kD.before !== kD.after && kD.restored === kD.before, 'D toggles theme', JSON.stringify(kD));

  // Shortcuts must not fire while typing in an input
  await goto('/preprocess');
  const typing = await evalJs(`(() => {
    const ta = document.getElementById('textIn');
    ta.focus();
    ta.value = 'hello world';
    ta.dispatchEvent(new KeyboardEvent('keydown', { key: 'g', code: 'KeyG', bubbles: true }));
    return location.hash;
  })()`);
  check(typing === '#/preprocess', 'shortcuts ignored while typing', typing);

  /* ---------------- Start Here guide in a real browser ---------------- */
  await goto('/start', 900);
  const gd = await evalJs(`(() => {
    const c = document.getElementById('content');
    const h2s = Array.from(c.querySelectorAll('.guide-section h2')).map(h => h.textContent);
    return {
      sections: c.querySelectorAll('.guide-section').length,
      toc: c.querySelectorAll('.guide-toc a').length,
      pitfalls: c.querySelectorAll('.pitfall').length,
      setup: c.querySelectorAll('.setup-step').length,
      trouble: c.querySelectorAll('.trouble-item').length,
      rules: c.querySelectorAll('.rule-item').length,
      checks: c.querySelectorAll('[data-check]').length,
      copyBtns: c.querySelectorAll('.cmd-copy').length,
      h2s: h2s,
      tocSticky: getComputedStyle(c.querySelector('.guide-toc')).position,
      scrollW: document.documentElement.scrollWidth,
      innerW: window.innerWidth
    };
  })()`);
  check(gd.sections >= 9, 'guide has 9+ sections', 'n=' + gd.sections);
  check(gd.toc >= 9, 'guide TOC has 9+ links', 'n=' + gd.toc);
  check(gd.tocSticky === 'sticky', 'guide TOC is sticky', gd.tocSticky);
  check(gd.pitfalls >= 40, 'guide lists 40+ pitfalls', 'n=' + gd.pitfalls);
  check(gd.setup >= 5, 'guide has setup steps', 'n=' + gd.setup);
  check(gd.trouble >= 8, 'guide decodes 8+ errors', 'n=' + gd.trouble);
  check(gd.rules === 7, 'guide has 7 rules', 'n=' + gd.rules);
  check(gd.checks >= 10, 'guide has a checklist', 'n=' + gd.checks);
  check(gd.copyBtns >= 4, 'setup commands are copyable', 'n=' + gd.copyBtns);
  check(gd.scrollW <= gd.innerW + 1, 'guide has no horizontal overflow', gd.scrollW + '>' + gd.innerW);
  check(gd.h2s.some((t) => /Python/i.test(t)), 'guide covers Python setup');
  check(gd.h2s.some((t) => /error/i.test(t)), 'guide covers error messages');

  // Troubleshooting accordion opens
  const acc = await evalJs(`(() => {
    const items = document.querySelectorAll('.trouble-item');
    const second = items[1];
    second.open = true;
    return { open: second.open, body: second.querySelector('.trouble-body').textContent.length };
  })()`);
  check(acc.open && acc.body > 50, 'troubleshooting entries expand', JSON.stringify(acc));

  // Checklist persists across a reload
  const saved = await evalJs(`(() => {
    const boxes = document.querySelectorAll('[data-check]');
    boxes[0].checked = true; boxes[0].dispatchEvent(new Event('change', {bubbles:true}));
    boxes[2].checked = true; boxes[2].dispatchEvent(new Event('change', {bubbles:true}));
    return { count: document.getElementById('checkCount').textContent,
             stored: localStorage.getItem('nlp-lab:checklist:v1') };
  })()`);
  check(/2 \/ \d+/.test(saved.count), 'checklist counter tracks ticks', saved.count);
  await goto('/start', 900);
  const persisted = await evalJs(`(() => {
    const boxes = document.querySelectorAll('[data-check]');
    return { first: boxes[0].checked, third: boxes[2].checked, second: boxes[1].checked,
             count: document.getElementById('checkCount').textContent };
  })()`);
  check(persisted.first && persisted.third && !persisted.second, 'checklist survives reload', JSON.stringify(persisted));

  // Reset clears it
  const reset = await evalJs(`(() => {
    document.getElementById('checkReset').click();
    const boxes = Array.from(document.querySelectorAll('[data-check]'));
    return { anyChecked: boxes.some(b => b.checked), count: document.getElementById('checkCount').textContent };
  })()`);
  check(!reset.anyChecked && /0 \//.test(reset.count), 'checklist reset works', JSON.stringify(reset));

  /* ---------------- guide in-page anchors must not trigger routing ------- */
  await goto('/start', 900);
  const anchors = await evalJs(`(() => {
    const before = location.hash;
    const results = [];
    // Click a TOC link and a hero button — neither may change the route.
    const tocLink = document.querySelector('.guide-toc a[href="#g-setup"]');
    tocLink.click();
    results.push({ step: 'toc', hash: location.hash, view: NLP.currentView });
    const heroBtn = document.querySelector('.guide-hero a[href="#g-pitfalls"]');
    heroBtn.click();
    results.push({ step: 'hero', hash: location.hash, view: NLP.currentView });
    const pitLink = document.querySelector('.pitfall-index-item[href="#g-pit-attention"]');
    pitLink.click();
    results.push({ step: 'pit', hash: location.hash, view: NLP.currentView });
    return { before, results, stillGuide: !!document.querySelector('.guide-section'), scrolled: window.scrollY };
  })()`);
  check(anchors.stillGuide, 'guide anchors keep the guide rendered');
  check(anchors.results.every((r) => r.view === 'start'), 'guide anchors do not route away', JSON.stringify(anchors.results));
  check(anchors.results.every((r) => !/^#\/?[a-z]/.test(r.hash.replace('#g-', '')) || r.hash === anchors.before),
    'guide anchors do not rewrite the route hash', JSON.stringify(anchors.results.map((r) => r.hash)));

  // Deep link straight into a guide section still lands on the guide.
  await goto('/start', 800);
  const deepGuide = await evalJs(`(() => ({ view: NLP.currentView, sections: document.querySelectorAll('.guide-section').length }))()`);
  check(deepGuide.view === 'start' && deepGuide.sections >= 9, 'guide route is stable', JSON.stringify(deepGuide));

  /* ---------------- pitfalls appear in every lab ---------------- */
  for (const lab of ['preprocess', 'stem', 'tfidf', 'similarity', 'classify', 'lm', 'bpe', 'embeddings', 'pos', 'attention']) {
    await goto('/' + lab, 600);
    const p = await evalJs(`(() => {
      const box = document.querySelector('#content .pitfalls');
      if (!box) return { found: false };
      return {
        found: true,
        n: box.querySelectorAll('.pitfall').length,
        closedByDefault: !box.open,
        hasWhy: box.textContent.includes('Why:'),
        hasInstead: box.textContent.includes('Instead:'),
        wide: document.documentElement.scrollWidth > window.innerWidth + 1
      };
    })()`);
    check(p.found, lab + ' renders a pitfalls box');
    check(p.n >= 3, lab + ' documents 3+ pitfalls', 'n=' + p.n);
    check(p.hasWhy && p.hasInstead, lab + ' pitfalls explain why + fix');
    check(!p.wide, lab + ' pitfalls do not overflow');
  }

  // The pitfall box expands to show content
  const expand = await evalJs(`(() => {
    const box = document.querySelector('#content .pitfalls');
    box.open = true;
    const body = box.querySelector('.pitfalls-body');
    return { open: box.open, h: body.getBoundingClientRect().height, text: body.textContent.length };
  })()`);
  check(expand.open && expand.h > 60 && expand.text > 100, 'pitfall box expands', JSON.stringify(expand));

  /* ---------------- first-visit CTA on the overview ---------------- */
  const cta = await evalJs(`(() => {
    localStorage.removeItem('nlp-lab:v1');
    // Reset in-memory state as well — earlier tests completed a lab, and the
    // CTA is intentionally hidden once you have made progress.
    NLP.state.done = {};
    NLP.state.seenGuide = false;
    location.hash = '#/glossary';
    return new Promise(r => setTimeout(() => {
      location.hash = '#/overview';
      setTimeout(() => {
        const box = document.querySelector('.start-cta');
        const link = box && box.querySelector('a[href="#/start"]');
        const dismiss = document.getElementById('dismissGuide');
        r({
          present: !!box,
          linksToGuide: !!link,
          dismissable: !!dismiss,
          body: box ? box.textContent.length : 0
        });
      }, 400);
    }, 300));
  })()`);
  check(cta.present, 'first visit shows the Start Here CTA');
  check(cta.linksToGuide, 'CTA links to the guide');
  check(cta.body > 100, 'CTA explains itself', 'len=' + cta.body);

  const dismissed = await evalJs(`(() => {
    document.getElementById('dismissGuide').click();
    const gone = !document.querySelector('.start-cta');
    const stored = JSON.parse(localStorage.getItem('nlp-lab:v1') || '{}').seenGuide;
    return { gone, stored };
  })()`);
  check(dismissed.gone, 'CTA can be dismissed');
  check(dismissed.stored === true, 'dismissal is persisted', JSON.stringify(dismissed));

  // Print stylesheet
  await goto('/tfidf');  await send('Emulation.setEmulatedMedia', { media: 'print' }, sessionId);
  await sleep(300);
  const print = await evalJs(`(() => {
    const sidebar = getComputedStyle(document.getElementById('sidebar')).display;
    const topbar = getComputedStyle(document.getElementById('topbar')).display;
    const bg = getComputedStyle(document.body).backgroundColor;
    const contentW = document.getElementById('content').getBoundingClientRect().width;
    return { sidebar, topbar, bg, contentW, vw: window.innerWidth };
  })()`);
  check(print.sidebar === 'none', 'print hides sidebar', print.sidebar);
  check(print.topbar === 'none', 'print hides topbar', print.topbar);
  check(/rgb\(255, 255, 255\)|rgba\(0, 0, 0, 0\)/.test(print.bg), 'print uses white background', print.bg);
  await send('Emulation.setEmulatedMedia', { media: '' }, sessionId);

  // Clean up
  await send('Target.closeTarget', { targetId: target.targetId });
  ws.close();
  proc.kill();
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch (e) {}

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailures:\n' + failures.map((f, i) => `${i + 1}. ${f}`).join('\n'));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
