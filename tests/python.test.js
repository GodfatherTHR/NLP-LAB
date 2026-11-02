/* =====================================================================
   Verifies that every Python snippet shown in the site is valid Python.
   Extracts NLP.data.python from data.js and parses each with ast.
   Run:  node tests/python.test.js
   (uses the bundled Python runtime discovered via PYTHON env or PATH)
   ===================================================================== */
const { execFileSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

require(path.join(__dirname, '..', 'assets', 'js', 'data.js'));
const snippets = Object.entries(globalThis.NLP.data.python).map(([name, code]) => ({ name, code }));

const PYTHON = process.env.PYTHON || 'python';
const tmp = path.join(os.tmpdir(), 'nlp-snips-' + Date.now() + '.json');
fs.writeFileSync(tmp, JSON.stringify(snippets), 'utf8');

const script = `
import json, ast, sys
snips = json.load(open(sys.argv[1], encoding='utf-8'))
bad = 0
for s in snips:
    try:
        ast.parse(s['code'])
        print(f"  OK    {s['name']:12} {len(s['code'].splitlines()):3} lines")
    except SyntaxError as e:
        bad += 1
        print(f"  FAIL  {s['name']:12} line {e.lineno}: {e.msg}")
print(('FAILED: %d snippet(s)' % bad) if bad else ('All %d snippets are valid Python' % len(snips)))
sys.exit(1 if bad else 0)
`;

try {
  const out = execFileSync(PYTHON, ['-c', script, tmp], { encoding: 'utf8' });
  console.log(out.trim());
  console.log('\n1 passed, 0 failed');
} catch (e) {
  if (e.stdout) console.log(e.stdout);
  if (e.stderr) console.error(e.stderr);
  console.error('\nPython snippet validation FAILED');
  process.exit(1);
} finally {
  try { fs.unlinkSync(tmp); } catch (err) { /* ignore */ }
}
