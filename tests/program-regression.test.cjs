'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { evaluate } = require('../scripts/program-evaluate.cjs');
// Only reviewer-frozen contracts belong here. Stage 2/3 remain unfrozen until review.
const frozen = {
  1: '04782319dfb9b7b8d2d340b55fdd7e03bfc0deb177363c948d9c49521b01007d',
  2: '887acf70b14cbef65fe6f38fbddee0c469f2bdf751e45d855d2f79fe074dba1e',
  3: 'a710fac2bab1069ba00adb1515d9f2ed572e6b32c604e4c11a96958d75960482'
};
for (const [stage, digest] of Object.entries(frozen)) {
  test(`Program regression preserves frozen Stage ${stage} bytes`, () => {
    const file = path.join(__dirname, 'fixtures', `v12-stage${stage}.json`);
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'), digest);
  });
}
const stages = [1, 2, 3].map(stage => ({ stage, file: path.join(__dirname, 'fixtures', `v12-stage${stage}.json`) }));
assert.ok(fs.existsSync(stages[0].file), 'Required Stage 1 dataset is missing');
for (const { stage, file } of stages.filter(({ file }) => fs.existsSync(file))) {
  test(`V12 retains zero synthetic response/state failures on Stage ${stage}`, { timeout: 70000 }, () => {
    const dataset = JSON.parse(fs.readFileSync(file, 'utf8'));
    const report = evaluate({ engine: 'v12', datasetPath: file });
    assert.equal(report.engine, 'v12');
    assert.equal(report.total, dataset.fixtures.length);
    assert.equal(report.syntheticOnly, true);
    assert.equal(report.independentQualityGate, 'blocked_no_independent_review');
    // Keep raw synthetic turns out of failure output; publish fixture IDs/issues only.
    assert.equal(report.failed, 0, JSON.stringify(report.failures));
    assert.equal(report.passed, report.total);
  });
}
