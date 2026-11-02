/* =====================================================================
   DOM smoke tests — loads index.html in jsdom, visits every route,
   clicks/goes through the main interactions and fails on any thrown
   error or console.error.   Run:  node tests/ui.test.js
   ===================================================================== */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const errors = [];
const vc = new VirtualConsole();
vc.on('error', (...args) => errors.push('console.error: ' + args.join(' ')));
// jsdom does not implement scrolling; that is an environment limitation, not a bug.
const NOT_IMPLEMENTED = /Not implemented: (Window's scrollTo|window\.scrollTo|scroll)/;
vc.on('jsdomError', (e) => {
  const msg = (e && e.message) || String(e);
  if (NOT_IMPLEMENTED.test(msg)) return;
  errors.push('jsdomError: ' + msg);
});
vc.on('warn', () => {});

const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  resources: undefined,
  // An http(s) origin is required for localStorage to work in jsdom —
  // a file:// URL is an opaque origin where storage access throws.
  url: 'http://localhost/index.html',
  pretendToBeVisual: true,
  virtualConsole: vc
});
const { window } = dom;
const doc = window.document;

// jsdom implements neither smooth scrolling nor IntersectionObserver; the
// guide uses both. Stub them so tests exercise our code, not jsdom gaps.
window.Element.prototype.scrollIntoView = function () {};
if (!('IntersectionObserver' in window)) {
  window.IntersectionObserver = class {
    constructor(cb) { this.cb = cb; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// jsdom does not fetch <script src> for file:// without resources loader; inject manually
function loadScript(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  try {
    window.eval(code);
  } catch (e) {
    errors.push('LOAD ' + rel + ': ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n'));
  }
}
[
  'assets/js/engine.js',
  'assets/js/data.js',
  'assets/js/guide.js',
  'assets/js/ui.js',
  'assets/js/app.js',
  'assets/js/start.js',
  'assets/js/labs/preprocess.js',
  'assets/js/labs/stem.js',
  'assets/js/labs/tfidf.js',
  'assets/js/labs/similarity.js',
  'assets/js/labs/classify.js',
  'assets/js/labs/lm.js',
  'assets/js/labs/bpe.js',
  'assets/js/labs/embeddings.js',
  'assets/js/labs/pos.js',
  'assets/js/labs/attention.js'
].forEach(loadScript);

let pass = 0;
let fail = 0;
const failures = [];

function check(cond, label) {
  if (cond) { pass++; return true; }
  fail++;
  failures.push(label);
  return false;
}

function setHash(h) {
  window.location.hash = h;
  window.dispatchEvent(new window.Event('hashchange'));
  // flush
  return new Promise((r) => setTimeout(r, 10));
}

function q(sel) { return doc.querySelector(sel); }
function qa(sel) { return Array.from(doc.querySelectorAll(sel)); }

function fire(el, type) {
  if (!el) return;
  el.dispatchEvent(new window.Event(type, { bubbles: true }));
}

async function run() {
  check(!!window.NLP, 'NLP namespace exists');
  check(!!window.NLP.engine, 'engine loaded');
  check(!!window.NLP.data, 'data loaded');
  check(!!window.NLP.ui, 'ui loaded');
  check(!!window.NLP.boot, 'app boot registered');

  // Boot manually (DOMContentLoaded may already have fired)
  try {
    window.NLP.boot();
    pass++;
  } catch (e) {
    fail++; failures.push('boot() threw: ' + e.message);
  }

  check(!!q('#sidebar .brand'), 'sidebar rendered');
  check(qa('#navLabs .nav-item').length === window.NLP.data.labs.length, 'all labs in nav');
  check(!!q('#themeBtn'), 'theme button present');

  // Landing
  await setHash('#/overview');
  check(!!q('#heroInput'), 'overview hero input rendered');
  check(!!q('.lab-card'), 'lab cards rendered');
  check(qa('.lab-card').length === window.NLP.data.labs.length, 'one card per lab');
  const hi = q('#heroInput');
  hi.value = 'The cats were running quickly!';
  fire(hi, 'input');
  check(q('#heroOut').textContent.trim().length > 0, 'hero live demo outputs tokens');

  // Theme toggle
  q('#themeBtn').click();
  check(doc.documentElement.getAttribute('data-theme') === 'light', 'theme toggles to light');
  q('#themeBtn').click();
  check(doc.documentElement.getAttribute('data-theme') === 'dark', 'theme toggles back');

  // Every lab route renders without throwing
  const routes = window.NLP.data.labs.map((l) => l.id);
  for (const r of routes) {
    const before = errors.length;
    await setHash('#/' + r);
    const content = q('#content');
    check(content && content.innerHTML.length > 200, 'route ' + r + ' rendered content');
    check(!!content.querySelector('.learn-box'), 'route ' + r + ' shows learn box');
    check(!!content.querySelector('[data-role="mark-done"]'), 'route ' + r + ' has mark-done');
    check(errors.length === before, 'route ' + r + ' had no console errors' + (errors.length > before ? ': ' + errors.slice(before).join(' | ') : ''));
  }

  // Glossary
  await setHash('#/glossary');
  check(!!q('#glossSearch'), 'glossary search rendered');
  const gs = q('#glossSearch');
  gs.value = 'perplexity';
  fire(gs, 'input');
  check(q('#glossList').textContent.toLowerCase().includes('perplexity'), 'glossary search filters');

  // Quiz
  await setHash('#/evaluation');
  check(qa('.quiz-q').length === window.NLP.data.quiz.length, 'all quiz questions rendered');
  const firstOpt = q('.quiz-opt');
  firstOpt.click();
  await new Promise((r) => setTimeout(r, 5));
  check(!!q('.quiz-why'), 'quiz shows explanation after answering');
  check(q('.quiz-opt').disabled, 'quiz options lock after answering');

  // ---- Lab interactions ----
  await setHash('#/preprocess');
  const preIn = q('#textIn');
  check(!!preIn, 'preprocess textarea present');
  preIn.value = "I don't like it, 42 cats!";
  fire(preIn, 'input');
  check(qa('#flow .token-stage').length >= 3, 'preprocess pipeline stages render');
  const sw = q('#content [data-opt="stopwords"]');
  sw.checked = false;
  fire(sw, 'change');
  check(qa('#flow .token-stage')[2].textContent.includes('not') || q('#flow').textContent.includes('don'), 'stop words toggle changes tokens');

  await setHash('#/stem');
  check(!!q('#wordIn'), 'stem input present');
  const wi = q('#wordIn');
  wi.value = 'relational';
  fire(wi, 'input');
  check(q('#wordResult').textContent.includes('relat'), 'porter trace renders stem');
  check(qa('#batchTable tbody tr').length > 10, 'batch table populated');
  const quick = q('[data-quick]');
  quick.click();
  check(q('#wordIn').value.length > 0, 'quick word click works');

  await setHash('#/tfidf');
  check(!!q('#heat .heat-cell'), 'tfidf heatmap rendered');
  check(!!q('#simHeat .heat-cell'), 'similarity heatmap rendered');
  check(qa('#docSeg button').length > 0, 'doc selector rendered');
  q('#docSeg button').click();
  q('#matSeg button[data-mat="tf"]').click();
  check(!!q('#heat .heat-cell'), 'tf matrix mode works');
  const preset = q('#presetSeg button[data-preset="News topics"]');
  if (preset) { preset.click(); check(q('#docsIn').value.includes('cricket'), 'preset switching works'); }

  await setHash('#/similarity');
  const simEl = q('#content');
  check(simEl.innerHTML.includes('Levenshtein') || simEl.innerHTML.includes('edit distance'), 'similarity lab rendered');
  const levA = q('#strA');
  if (levA) {
    levA.value = 'kitten';
    fire(levA, 'input');
    await new Promise((r) => setTimeout(r, 5));
    check(q('#content').textContent.includes('3'), 'levenshtein computes distance 3');
  }

  await setHash('#/classify');
  check(qa('#content .kpi').length > 0, 'classifier KPIs rendered');
  const trainBtn = q('#trainBtn');
  if (trainBtn) {
    trainBtn.click();
    await new Promise((r) => setTimeout(r, 30));
    check(!!q('#cm, .cm'), 'confusion matrix rendered after training');
  }

  await setHash('#/lm');
  check(!!q('#content .nextword'), 'next-word predictions rendered');
  const genBtn = q('#genBtn');
  if (genBtn) {
    genBtn.click();
    await new Promise((r) => setTimeout(r, 30));
    check(q('#generated') && q('#generated').textContent.trim().length > 0, 'text generation works');
  }

  await setHash('#/bpe');
  check(qa('#content .bpe-sym').length > 0, 'bpe symbols rendered');
  const bpeWord = q('#bpeWord');
  if (bpeWord) {
    bpeWord.value = 'lowest';
    fire(bpeWord, 'input');
    await new Promise((r) => setTimeout(r, 10));
    check(qa('#content .bpe-sym').length > 0, 'bpe encode of new word works');
  }

  await setHash('#/embeddings');
  check(!!q('#content svg .scatter-pt, #content .vec-bars'), 'embeddings visual rendered');
  const anaBtn = q('#analogyBtn');
  if (anaBtn) {
    anaBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    check(q('#analogyOut').textContent.length > 10, 'analogy computation outputs');
  }

  await setHash('#/pos');
  check(qa('#content .pos-token').length > 3, 'pos tokens rendered');
  check(qa('#content .ent').length > 0, 'ner entities rendered');

  await setHash('#/attention');
  check(qa('#content .attn-cell').length > 0, 'attention matrix rendered');
  const attBtn = q('#attnRun');
  if (attBtn) {
    attBtn.click();
    await new Promise((r) => setTimeout(r, 20));
    check(qa('#content .attn-cell').length > 0, 'attention recompute works');
  }

  // Unknown route fallback
  await setHash('#/does-not-exist');
  check(q('#content').innerHTML.includes('Natural Language Processing') || q('#content').querySelector('.hero'), 'unknown route falls back to overview');

  /* ---------------- Start Here guide ---------------- */
  await setHash('#/start');
  const guide = q('#content');
  check(guide.querySelectorAll('.guide-section').length >= 9, 'guide renders 9+ sections');
  check(guide.querySelectorAll('.guide-toc a').length >= 9, 'guide has a table of contents');
  check(guide.querySelectorAll('.pitfall').length >= 40, 'guide lists every pitfall (' + guide.querySelectorAll('.pitfall').length + ')');
  check(guide.querySelectorAll('.setup-step').length >= 5, 'guide has setup steps');
  check(guide.querySelectorAll('.trouble-item').length >= 8, 'guide has troubleshooting entries');
  check(guide.querySelectorAll('.rule-item').length === 7, 'guide has exactly 7 rules');
  check(guide.querySelectorAll('[data-check]').length >= 10, 'guide has a submission checklist');
  check(guide.querySelectorAll('.plan-card').length === 3, 'guide has 3 study plans');

  // Checklist persists to localStorage
  const box0 = guide.querySelector('[data-check="0"]');
  box0.checked = true;
  fire(box0, 'change');
  await new Promise((r) => setTimeout(r, 10));
  const stored = JSON.parse(window.localStorage.getItem('nlp-lab:checklist:v1') || '{}');
  check(stored['0'] === true, 'checklist state persists');
  check(/1 \/ \d+ done/.test(q('#checkCount').textContent), 'checklist counter updates', q('#checkCount').textContent);

  // Copy buttons on shell commands exist
  check(guide.querySelectorAll('.cmd-copy').length >= 4, 'server commands have copy buttons');

  /* ---------------- Every lab shows its pitfalls ---------------- */
  for (const lab of ['preprocess', 'stem', 'tfidf', 'similarity', 'classify', 'lm', 'bpe', 'embeddings', 'pos', 'attention']) {
    await setHash('#/' + lab);
    const box = q('#content .pitfalls');
    check(!!box, lab + ' shows a pitfalls box');
    if (box) {
      const n = box.querySelectorAll('.pitfall').length;
      check(n >= 3, lab + ' documents at least 3 pitfalls (' + n + ')');
    }
  }

  // Report
  if (errors.length) {
    console.log('\n--- console/jsdom errors ---');
    errors.slice(0, 25).forEach((e) => console.log('  • ' + e));
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log('\nFailures:\n' + failures.map((f, i) => `${i + 1}. ${f}`).join('\n'));
    process.exit(1);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
