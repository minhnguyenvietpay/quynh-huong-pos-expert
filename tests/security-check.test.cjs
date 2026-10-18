'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {scan} = require('../scripts/security-check.cjs');
function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'qh-security-'));
  t.after(() => fs.rmSync(root, {recursive:true, force:true}));
  execFileSync('git', ['init', '--quiet'], {cwd: root});
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, name)), {recursive:true});
    fs.writeFileSync(path.join(root, name), content);
  }
  execFileSync('git', ['add', '.'], {cwd:root});
  return root;
}
test('detects staged session artifacts and synthetic secrets without exposing values', t => {
  const fake = ['ghp', '_', 'S'.repeat(36)].join('');
  const root = fixture(t, {'session.json':'{}', 'source.js': `const key = '${fake}';`});
  const result = scan(root);
  assert.deepEqual(result.violations.map(x=>x.rule).sort(), ['possible-hardcoded-secret', 'sensitive-runtime-artifact']);
  assert.equal(JSON.stringify(result).includes(fake), false);
});
test('rejects PR target, write permission and transitive live npm startup', t => {
  const root = fixture(t, {'package.json':JSON.stringify({scripts:{unsafe:'npm run bridge', bridge:'node listener.mjs'}}), '.github/workflows/qa.yml':'on:\n  pull_request_target:\npermissions:\n  contents: write\njobs:\n  qa:\n    steps:\n      - run: npm run unsafe\n'});
  assert.deepEqual(scan(root).violations.map(x=>x.rule).sort(), ['live-zalo-ci-command', 'privileged-pr-trigger', 'workflow-write-permissions']);
});
test('permits read-only offline QA, environment references and sample configuration', t => {
  const root = fixture(t, {'.env.example':'QH_AGENT_API_KEY=\n', 'package.json':'{"scripts":{"test":"node --test tests/*.test.cjs"}}', 'source.js':'const key = process.env.QH_AGENT_API_KEY;', '.github/workflows/qa.yml':'on:\n  pull_request:\npermissions:\n  contents: read\njobs:\n  qa:\n    steps:\n      - run: npm test\n'});
  assert.deepEqual(scan(root).violations, []);
});
test('write exception requires explicit manual opt-in workflow only', t => {
  const root = fixture(t, {'.github/workflows/autonomous-coding.yml':'on:\n  workflow_dispatch:\nenv:\n  QH_OPT_IN_CODING_WORKFLOW: true\npermissions:\n  contents: write\n'});
  assert.deepEqual(scan(root).violations, []);
  fs.appendFileSync(path.join(root, '.github/workflows/autonomous-coding.yml'), '\n  push:\n');
  assert.equal(scan(root).violations[0].rule, 'workflow-write-permissions');
});
test('default scans tracked files; pre-stage option also checks untracked files', t => {
  const root = fixture(t, {'README.md':'Synthetic fixture.'});
  fs.writeFileSync(path.join(root, 'qr.png'), 'synthetic');
  assert.deepEqual(scan(root).violations, []);
  assert.equal(scan(root, {includeUntracked:true}).violations[0].rule, 'sensitive-runtime-artifact');
});
