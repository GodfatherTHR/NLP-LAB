/* =====================================================================
   Run every suite in order and print a summary.
   Usage:  node tests/run-all.js
   ===================================================================== */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const SUITES = [
  ['engine', 'engine.test.js', 'algorithms + data integrity'],
  ['guide', 'guide.test.js', 'beginner guidance content quality'],
  ['python', 'python.test.js', 'all Python snippets parse'],
  ['jsdom', 'ui.test.js', 'every route in a simulated DOM'],
  ['browser', 'browser.test.js', 'real Chrome: rendering + interactions'],
  ['layout', 'layout.test.js', '3 breakpoints: overflow / contrast / type size']
];

const useColor = process.stdout.isTTY;
const c = (code, s) => (useColor ? `\u001b[${code}m${s}\u001b[0m` : s);
const green = (s) => c('32', s);
const red = (s) => c('31', s);
const dim = (s) => c('2', s);
const bold = (s) => c('1', s);

let failed = 0;
const results = [];

for (const [name, file, blurb] of SUITES) {
  const full = path.join(__dirname, file);
  if (!fs.existsSync(full)) {
    results.push([name, 'SKIP', 'file not found']);
    continue;
  }
  process.stdout.write(`${bold(name.padEnd(9))} ${dim(blurb)}\n`);
  const started = Date.now();
  const res = spawnSync(process.execPath, [full], {
    encoding: 'utf8',
    timeout: 300000,
    env: process.env
  });
  const ms = Date.now() - started;
  const out = (res.stdout || '') + (res.stderr || '');
  const match = out.match(/(\d+) passed, (\d+) failed/);
  if (match) {
    const [, p, f] = match;
    const ok = res.status === 0 && Number(f) === 0;
    results.push([name, ok ? 'PASS' : 'FAIL', `${p} passed, ${f} failed`, ms]);
    console.log(`          ${ok ? green('✓') : red('✗')} ${p} passed, ${f} failed ${dim('(' + ms + 'ms)')}`);
    if (!ok) {
      failed++;
      console.log(out.split('\n').filter((l) => /^\s*\d+\./.test(l)).slice(0, 12).map((l) => '          ' + red(l.trim())).join('\n'));
    }
  } else if (res.status === 0) {
    results.push([name, 'PASS', 'completed', ms]);
    console.log(`          ${green('✓')} completed ${dim('(' + ms + 'ms)')}`);
  } else {
    results.push([name, 'FAIL', 'no summary line', ms]);
    console.log(`          ${red('✗')} failed ${dim('(' + ms + 'ms)')}`);
    console.log(out.split('\n').slice(-12).join('\n'));
    failed++;
  }
  console.log('');
}

console.log(bold('─'.repeat(58)));
const totalMs = results.reduce((s, r) => s + (r[3] || 0), 0);
for (const [name, status, detail] of results) {
  const mark = status === 'PASS' ? green('✓') : status === 'SKIP' ? dim('–') : red('✗');
  console.log(`${mark} ${name.padEnd(9)} ${dim(detail)}`);
}
console.log(bold('─'.repeat(58)));
console.log(failed === 0 ? green(bold('All suites passed')) : red(bold(failed + ' suite(s) failed')));
console.log(dim(`total ${(totalMs / 1000).toFixed(1)}s`));

process.exit(failed === 0 ? 0 : 1);
