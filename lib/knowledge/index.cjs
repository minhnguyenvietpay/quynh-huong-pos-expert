'use strict';
const { createHash } = require('node:crypto');
const taxonomy = require('./taxonomy.json');
const hash = value => createHash('sha256').update(String(value)).digest('hex').slice(0, 20);
const normalized = value => String(value || '').normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
const domains = Object.keys(taxonomy);
function classify(row) {
  const fixed = { network: 'network_integration', wifi: 'network_integration', sim: 'network_integration', debit: 'card_payment', mismatch: 'reconciliation', missing: 'reconciliation', onebill: 'printer', settlement: 'settlement_payout', card: 'card_payment', wallet: 'card_payment', print: 'printer', roller: 'printer', slow: 'pos_device', baseapp: 'pos_device', power: 'pos_device', refund: 'refund_reversal', sensitive: 'security_risk' };
  return fixed[row.id] || domains.find(domain => taxonomy[domain].includes(row.category)) || 'unclassified';
}
function adaptLegacy(rows) {
  return rows.map((row, index) => ({
    id: `legacy-${hash(`${index}:${row.id}`)}`, domain: classify(row), question: String(row.title || ''),
    answer: String(row.answer || ''), sources: row.source ? [{ type: 'legacy_label', reference: String(row.source) }] : [],
    evidence: [], confidence: 0, verificationStatus: 'unverified', verifiedAt: null,
    legacyReviewStatus: String(row.review_status || 'unknown')
  }));
}
function safeHttps(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash; } catch { return false; }
}
function validate(record) {
  const errors = [];
  if (!record || typeof record !== 'object') return ['invalid_record'];
  if (typeof record.id !== 'string' || !record.id.trim()) errors.push('missing_id');
  if (!domains.includes(record.domain)) errors.push('unknown_domain');
  for (const key of ['question', 'answer']) if (typeof record[key] !== 'string' || !record[key].trim()) errors.push(`missing_${key}`);
  if (!Array.isArray(record.sources) || !record.sources.length) errors.push('missing_sources');
  if (Array.isArray(record.sources) && record.sources.some(s => !s || (s.type !== 'legacy_label' && !safeHttps(s.reference)))) errors.push('unsafe_source_reference');
  if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) errors.push('invalid_confidence');
  if (!['unverified', 'review_pending', 'verified', 'rejected'].includes(record.verificationStatus)) errors.push('invalid_verification_status');
  if (record.verificationStatus === 'verified') {
    if (!Array.isArray(record.evidence) || !record.evidence.some(e => e && safeHttps(e.reference) && typeof e.reviewer === 'string' && e.reviewer.trim() && Number.isFinite(Date.parse(e.reviewedAt)))) errors.push('verified_without_reviewed_evidence');
    if (!Number.isFinite(Date.parse(record.verifiedAt))) errors.push('missing_verified_date');
    if (!Array.isArray(record.sources) || !record.sources.some(s => s && ['official_document', 'approved_runbook'].includes(s.type) && typeof s.reference === 'string' && s.reference.trim())) errors.push('verified_without_authoritative_source');
  }
  return errors;
}
function analyze(records, { now = new Date(), staleDays = 180 } = {}) {
  if (!Number.isFinite(+new Date(now)) || !Number.isFinite(staleDays) || staleDays <= 0) throw new Error('Invalid review window');
  const coverage = Object.fromEntries(domains.map(domain => [domain, { total: 0, verified: 0 }]));
  const reviewQueue = [], groups = new Map(), idCounts = new Map();
  const enqueue = (record, reason) => reviewQueue.push({ recordId: `record-${hash(record.id)}`, reason });
  let verified = 0;
  for (const record of records) {
    const errors = validate(record);
    const domain = domains.includes(record.domain) ? record.domain : 'unclassified';
    coverage[domain].total++;
    const future = Number.isFinite(Date.parse(record.verifiedAt)) && Date.parse(record.verifiedAt) > +new Date(now);
    const isVerified = record.verificationStatus === 'verified' && !errors.length && !future;
    if (isVerified) { verified++; coverage[domain].verified++; }
    if (errors.length) enqueue(record, 'invalid_record');
    if (!isVerified) enqueue(record, 'needs_evidence_review');
    if (isVerified && (+new Date(now) - Date.parse(record.verifiedAt)) / 86400000 > staleDays) enqueue(record, 'stale_verification');
    if (future) enqueue(record, 'future_verification_date');
    idCounts.set(record.id, (idCounts.get(record.id) || 0) + 1);
    const key = `${domain}:${normalized(record.question)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(record);
  }
  let duplicateGroups = 0, possibleContradictionGroups = 0;
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const answers = new Set(group.map(r => normalized(r.answer)));
    const reason = answers.size === 1 ? 'exact_duplicate' : 'possible_conflicting_answers';
    if (answers.size === 1) duplicateGroups++; else possibleContradictionGroups++;
    for (const record of group) enqueue(record, reason);
  }
  for (const record of records) if (idCounts.get(record.id) > 1) enqueue(record, 'duplicate_id');
  return { schemaVersion: 1, generatedAt: new Date(now).toISOString(), total: records.length, verified, unverified: records.length - verified, duplicateGroups, possibleContradictionGroups, coverage, missingVerifiedDomains: domains.filter(d => d !== 'unclassified' && !coverage[d].verified), reviewQueue };
}
module.exports = { taxonomy, domains, adaptLegacy, validate, analyze };
