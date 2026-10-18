'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { adaptLegacy, analyze, validate } = require('../lib/knowledge/index.cjs');
const now = '2026-10-18T00:00:00Z';
const record = overrides => ({ id: 'fixture', domain: 'printer', question: 'Printer paper blank', answer: 'Inspect approved paper orientation', sources: [{ type: 'official_document', reference: 'https://example.org/manual' }], evidence: [{ reference: 'https://example.org/manual/paper', reviewer: 'test-reviewer', reviewedAt: now }], confidence: 0.9, verificationStatus: 'verified', verifiedAt: now, ...overrides });
test('verification requires authoritative source and reviewed evidence, never confidence alone', () => {
  assert.deepEqual(validate(record()), []);
  for (const reference of ['http://example.org', 'https://user:password@example.org', 'https://example.org?token=private']) assert.ok(validate(record({ sources: [{ type: 'official_document', reference }] })).includes('unsafe_source_reference')); 
  assert.ok(validate(record({ evidence: [] })).includes('verified_without_reviewed_evidence'));
  assert.ok(validate(record({ sources: [{ type: 'legacy_label', reference: 'manual' }] })).includes('verified_without_authoritative_source'));
  assert.equal(analyze([record({ evidence: [] })], { now }).verified, 0);
});
test('legacy labels and review flags never become verified evidence', () => {
  const [adapted] = adaptLegacy([{ id: 'network', title: 'Network', answer: 'Check network', source: 'Official-looking label', review_status: 'approved' }]);
  assert.equal(adapted.domain, 'network_integration');
  assert.equal(adapted.verificationStatus, 'unverified');
  assert.equal(adapted.confidence, 0);
  assert.deepEqual(adapted.evidence, []);
});
test('conservative detection separates duplicate answers from possible contradictions', () => {
  const report = analyze([record(), record({ id: 'two', answer: ' Inspect approved paper orientation ' }), record({ id: 'three', question: 'Other question', answer: 'A' }), record({ id: 'four', question: 'Other question', answer: 'B' })], { now });
  assert.equal(report.duplicateGroups, 1);
  assert.equal(report.possibleContradictionGroups, 1);
  assert.equal(report.reviewQueue.filter(x => x.reason === 'possible_conflicting_answers').length, 2);
});
test('review queues contain hashed identifiers and reason codes only', () => {
  const sensitive = 'customer phone +84912345678 session-token-private';
  const report = analyze([record({ id: sensitive, question: sensitive, answer: sensitive, verificationStatus: 'unverified' })], { now });
  const output = JSON.stringify(report);
  assert.ok(!output.includes(sensitive));
  assert.deepEqual(Object.keys(report.reviewQueue[0]), ['recordId', 'reason']);
});
test('review windows identify stale and future evidence and duplicate IDs', () => {
  const report = analyze([record({ verifiedAt: '2020-01-01' }), record({ verifiedAt: '2099-01-01' })], { now });
  assert.ok(report.reviewQueue.some(x => x.reason === 'stale_verification'));
  assert.ok(report.reviewQueue.some(x => x.reason === 'future_verification_date'));
  assert.equal(report.verified, 1, 'Future-dated evidence cannot increase verified coverage');
  assert.equal(report.reviewQueue.filter(x => x.reason === 'duplicate_id').length, 2);
  assert.throws(() => analyze([], { now: 'invalid' }));
});
test('actual corpus is read-only, fully counted and explicitly unverified', () => {
  const rows = require('../knowledge.json');
  const before = JSON.stringify(rows);
  const report = analyze(adaptLegacy(rows), { now });
  assert.equal(report.total, 5000);
  assert.equal(Object.values(report.coverage).reduce((sum, x) => sum + x.total, 0), rows.length);
  assert.equal(report.verified, 0);
  assert.equal(report.unverified, 5000);
  assert.equal(JSON.stringify(rows), before);
  assert.ok(!JSON.stringify(report).includes(rows[0].answer));
});
