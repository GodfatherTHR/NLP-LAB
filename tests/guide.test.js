/* =====================================================================
   Guide content tests — validates the beginner guidance in guide.js.
   These assertions guard quality: no empty pitfalls, no answers that are
   too thin to help, and full coverage of every lab.
   Run:  node tests/guide.test.js
   ===================================================================== */
const path = require('path');
require(path.join(__dirname, '..', 'assets', 'js', 'data.js'));
require(path.join(__dirname, '..', 'assets', 'js', 'guide.js'));

const D = globalThis.NLP.data;
const G = globalThis.NLP.guide;

let pass = 0;
let fail = 0;
const failures = [];

function ok(cond, label, extra) {
  if (cond) { pass++; return; }
  fail++;
  failures.push(label + (extra ? ' — ' + extra : ''));
}
const words = (s) => String(s || '').trim().split(/\s+/).filter(Boolean).length;

/* ---------- structure ---------- */
ok(!!G, 'guide object exists');
['pitfalls', 'setup', 'troubleshooting', 'rules', 'notation', 'checklist', 'nextSteps', 'plans']
  .forEach((k) => ok(!!G[k], 'guide has section: ' + k));

/* ---------- pitfalls: every lab, every field, substantive ---------- */
let totalPitfalls = 0;
D.labs.forEach((lab) => {
  const list = G.pitfalls[lab.id];
  ok(Array.isArray(list), 'pitfalls exist for lab ' + lab.id);
  if (!Array.isArray(list)) return;
  ok(list.length >= 3, lab.id + ' has 3+ pitfalls (' + list.length + ')');
  list.forEach((p, i) => {
    totalPitfalls++;
    const tag = lab.id + ' pitfall ' + (i + 1);
    ok(!!p.wrong && words(p.wrong) >= 5, tag + ': wrong is described (>=5 words)');
    ok(!!p.why && words(p.why) >= 8, tag + ': why is explained (>=8 words)');
    ok(!!p.fix && words(p.fix) >= 8, tag + ': fix is actionable (>=8 words)');
    ok(p.wrong !== p.fix, tag + ': wrong and fix differ');
  });
});
ok(totalPitfalls >= 40, 'at least 40 pitfalls documented (got ' + totalPitfalls + ')');

// No orphan pitfalls for labs that do not exist
Object.keys(G.pitfalls).forEach((id) => {
  ok(D.labs.some((l) => l.id === id) || id === 'overview', 'pitfall key maps to a real lab: ' + id);
});

/* ---------- setup ---------- */
ok(G.setup.length >= 5, 'setup has 5+ steps (' + G.setup.length + ')');
G.setup.forEach((s, i) => {
  ok(!!s.title && !!s.body, 'setup step ' + (i + 1) + ' has title and body');
  ok(words(s.body) >= 10, 'setup step ' + (i + 1) + ' is explained');
});
ok(G.setup.some((s) => s.cmd && /python --version|python3 --version/.test(s.cmd)), 'setup shows how to check Python');
ok(G.setup.some((s) => s.cmd && /venv/.test(s.cmd)), 'setup covers virtual environments');
ok(G.setup.some((s) => s.cmd && /nltk\.download/.test(s.cmd)), 'setup includes the NLTK data download');
ok(G.setup.some((s) => s.cmd && /pip install/.test(s.cmd)), 'setup includes pip install');

/* ---------- troubleshooting ---------- */
ok(G.troubleshooting.length >= 8, 'troubleshooting has 8+ entries (' + G.troubleshooting.length + ')');
G.troubleshooting.forEach((t, i) => {
  ok(!!t.error && !!t.cause && !!t.fix, 'troubleshooting entry ' + (i + 1) + ' is complete');
  ok(words(t.cause) >= 5, 'troubleshooting ' + (i + 1) + ' explains the cause');
  ok(words(t.fix) >= 8, 'troubleshooting ' + (i + 1) + ' gives an actionable fix');
});
// The errors beginners actually hit must be covered.
const errText = G.troubleshooting.map((t) => t.error.toLowerCase()).join(' | ');
['modulenotfounderror', 'lookuperror', 'empty vocabulary', 'indexerror', 'typeerror']
  .forEach((needle) => ok(errText.includes(needle), 'troubleshooting covers "' + needle + '"'));

/* ---------- rules ---------- */
ok(G.rules.length === 7, 'exactly 7 rules');
G.rules.forEach((r, i) => {
  ok(r.n === i + 1, 'rule numbering is sequential at ' + (i + 1));
  ok(!!r.title && words(r.body) >= 15, 'rule ' + r.n + ' is explained properly');
});
const ruleText = G.rules.map((r) => (r.title + ' ' + r.body).toLowerCase()).join(' ');
['leak', 'baseline', 'seed', 'data'].forEach((needle) =>
  ok(ruleText.includes(needle), 'rules mention "' + needle + '"'));

/* ---------- notation ---------- */
ok(G.notation.length >= 12, 'notation covers 12+ symbols (' + G.notation.length + ')');
G.notation.forEach(([sym, def], i) => {
  ok(!!sym && words(def) >= 4, 'notation entry ' + (i + 1) + ' has a real definition');
});

/* ---------- checklist ---------- */
ok(G.checklist.length >= 10, 'checklist has 10+ items (' + G.checklist.length + ')');
G.checklist.forEach((c, i) => ok(words(c) >= 5, 'checklist item ' + (i + 1) + ' is specific'));
const checkText = G.checklist.join(' ').toLowerCase();
['split', 'baseline', 'seed'].forEach((n) => ok(checkText.includes(n), 'checklist mentions "' + n + '"'));

/* ---------- next steps ---------- */
ok(G.nextSteps.length >= 5, 'next-steps table has 5+ goals');
G.nextSteps.forEach((n, i) => {
  ok(!!n.goal && !!n.path && !!n.tip, 'next step ' + (i + 1) + ' is complete');
  // Each recommended path must reference labs that exist.
  const nums = (n.path.match(/Lab (\d+)/g) || []).map((s) => s.replace('Lab ', '').padStart(2, '0'));
  nums.forEach((num) => {
    ok(D.labs.some((l) => l.num === num), 'next step ' + (i + 1) + ' points to a real lab (' + num + ')');
  });
});

/* ---------- plans ---------- */
ok(G.plans.length === 3, 'three study plans');
G.plans.forEach((p) => {
  ok(!!p.name && p.steps.length >= 3, 'plan "' + p.name + '" has steps');
  p.steps.forEach((s) => ok(words(s) >= 2, 'plan step is meaningful: ' + s));
});

/* ---------- no placeholder text leaked ---------- */
const allText = JSON.stringify(G);
['TODO', 'FIXME', 'lorem ipsum', 'undefined', 'null,'].forEach((bad) =>
  ok(!allText.toLowerCase().includes(bad.toLowerCase()), 'guide contains no "' + bad + '"'));

/* ---------- report ---------- */
console.log(`\n${pass} passed, ${fail} failed`);
if (fail) {
  console.log('\nFailures:\n' + failures.map((f, i) => `${i + 1}. ${f}`).join('\n'));
  process.exit(1);
}
