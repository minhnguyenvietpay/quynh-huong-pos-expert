'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../scripts/weekly-summary.cjs');
test('weekly summary exports aggregate counts and excludes raw customer content', () => {
  const summary = summarize({ quality: { total: 2, passed: 1, failed: 1, rows: [{ reply: 'PRIVATE CUSTOMER' }], syntheticOnly: true, independentQualityGate: { reviewedFixtures: 0 } }, knowledge: { total: 10, verified: 2, reviewQueue: [{ reason: 'PRIVATE CUSTOMER' }] }, security: { filesScanned: 42, violations: [{ file: 'PRIVATE CUSTOMER' }] } });
  assert.equal(summary.quality.total, 2);
  assert.equal(summary.knowledge.reviewItems, 1);
  assert.equal(summary.security.violations, 1);
  assert.equal(JSON.stringify(summary).includes('PRIVATE CUSTOMER'), false);
});
test('missing and malformed counts remain unknown rather than becoming successes', () => {
  const summary = summarize({ quality: { total: -1, passed: '40' } });
  assert.equal(summary.quality.total, null);
  assert.equal(summary.quality.passed, null);
  assert.equal(summary.security.violations, null);
  assert.equal(summary.quality.syntheticOnly, false);
});
