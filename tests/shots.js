/* Capture clean preview screenshots (viewport-sized, no distortion).
   Run: node tests/shots.js   → writes tests/shots/*.png */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const CHROME = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
].find((p) => fs.existsSync(p));

const PORT = 9644;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const proc = spawn(CHROME, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--no-first-run', '--hide-scrollbars',
    '--remote-debugging-port=' + PORT,
    '--user-data-dir=' + fs.mkdtempSync(path.join(os.tmpdir(), 'nlp-shots-')),
    'about:blank'
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 60; i++) {
    await sleep(250);
    try {
      const j = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
      if (j.webSocketDebuggerUrl) { wsUrl = j.webSocketDebuggerUrl; break; }
    } catch (e) {}
  }
  const ws = new WebSocket(wsUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
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

  async function shot(name, hash, w, h, action) {
    await send('Emulation.setDeviceMetricsOverride',
      { width: w, height: h, deviceScaleFactor: 2, mobile: w < 700 }, sid);
    await send('Page.navigate', { url: base + '#' + hash }, sid);
    await sleep(1100);
    if (action) {
      await send('Runtime.evaluate', { expression: action, awaitPromise: true }, sid);
      await sleep(700);
    }
    const { result } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid);
    fs.writeFileSync(path.join(SHOTS, name + '.png'), Buffer.from(result.data, 'base64'));
    console.log('  ✓ ' + name + '.png');
  }

  console.log('Capturing previews…');
  await shot('home', '/overview', 1440, 940);
  await shot('start-here', '/start', 1440, 940);
  await shot('start-pitfalls', '/start', 1440, 940,
    "document.getElementById('g-pitfalls').scrollIntoView()");
  await shot('start-trouble', '/start', 1440, 940,
    "document.getElementById('g-trouble').scrollIntoView()");
  await shot('preprocess', '/preprocess', 1440, 940);
  await shot('stem', '/stem', 1440, 940);
  await shot('tfidf', '/tfidf', 1440, 940);
  await shot('classify', '/classify', 1440, 940);
  await shot('lm', '/lm', 1440, 940);
  await shot('bpe', '/bpe', 1440, 940);
  await shot('embeddings', '/embeddings', 1440, 940);
  await shot('attention', '/attention', 1440, 940);
  await shot('similarity', '/similarity', 1440, 940);
  await shot('pos', '/pos', 1440, 940);
  await shot('quiz', '/evaluation', 1440, 940);
  await shot('glossary', '/glossary', 1440, 940);
  await shot('home-light', '/overview', 1440, 940,
    "document.getElementById('themeBtn').click()");
  await shot('mobile-home', '/overview', 390, 844);

  await send('Target.closeTarget', { targetId: t.targetId });
  ws.close();
  proc.kill();
  console.log('done');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
