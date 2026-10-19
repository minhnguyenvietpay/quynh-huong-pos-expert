'use strict';
const { usableKnowledge } = require('../../knowledge-policy.js');
const { validate } = require('../knowledge/index.cjs');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/[^a-z0-9]+/g, ' ').trim();
const aliases = { print:'printer', printing:'printer', paper:'printer', may_in:'printer', printer:'printer', network:'network_integration', wifi:'network_integration', sim:'network_integration', settlement:'settlement_payout', payout:'settlement_payout', refund:'refund_reversal', reversal:'refund_reversal', payment:'card_payment', card:'card_payment', pos:'pos_device', device:'pos_device', ops:'ops_escalation' };
const domainOf = value => aliases[normalize(value).replace(/ /g, '_')] || normalize(value).replace(/ /g, '_');
const stop = new Set(['anh','chi','oi','em','a','la','va','cua','cho','voi','toi','dang','bi','the','nao','xin','may','loi','giup','kiem','tra','huong','dan']);
function tokens(value) {
  let text = normalize(value).replace(/\b(?:wi fi|internet|4g|sim)\b/g, ' network ').replace(/\b(?:wifi|ket noi|mat mang|loi mang)\b/g, ' network ').replace(/\b(?:printer|may in|in hoa don)\b/g, ' print ').replace(/\b(?:trang giay|giay trang)\b/g, ' blank ').replace(/\b(?:khong len nguon|mat nguon)\b/g, ' power ');
  return new Set(text.split(/\s+/).filter(t => t.length > 1 && !stop.has(t)));
}
function safeAnswer(answer) {
  if (typeof answer !== 'string' || /(?:\d[\s.-]?){8,}|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|(?:https?:\/\/|token|session|password|mat khau)/i.test(answer)) return false;
  const text = normalize(answer);
  return !(/(?:transaction|settlement|refund|payment).{0,70}(?:successful|completed|confirmed|guaranteed|within|will arrive)|(?:fee|phi|lai suat).{0,30}\d|(?:tien|quyet toan|hoan tien|thanh toan|ngan hang).{0,70}(?:se ve|se nhan|se duoc|luon|mien phi|\d+\s*(?:gio|ngay|phut|%))|(?:chuyen|bao|gui).{0,15}ops.{0,20}(?:ngay|tu dong)/.test(text) || /\b(?:mid|tid|otp|pin|cvv)\b/.test(text) || /(?:so the|card number).{0,25}(?:day du|full)|(?:day du|full).{0,25}(?:so the|card number)/.test(text) || /(?:giao dich|tien|hoan tien|quyet toan|thanh toan).{0,45}(?:da thanh cong|da ve|da nhan|chac chan|dam bao|trong \d+|sau \d+)/.test(text) || /(?:da chuyen|da bao|da gui|tu dong chuyen).{0,20}(?:ops|van hanh)/.test(text));
}
function evidenceSource(row) {
  const now = Date.now();
  return row.sources.find(s => ['official_document','approved_runbook'].includes(s.type) && row.evidence.some(e => e && s.reference === e.reference && typeof e.reviewer === 'string' && e.reviewer.trim() && Number.isFinite(Date.parse(e.reviewedAt)) && Date.parse(e.reviewedAt) <= now && now - Date.parse(e.reviewedAt) <= 180 * 86400000));
}
function reviewed(row) {
  if (!usableKnowledge(row) || row.verificationStatus !== 'verified' || validate(row).length || !safeAnswer(row.answer)) return false;
  const age = Date.now() - Date.parse(row.verifiedAt);
  return age >= 0 && age <= 180 * 86400000 && !!evidenceSource(row);
}
const unknown = reason => ({ status: 'unknown', confidence: 0, reason });
function createRetriever(records) {
  const rows = (Array.isArray(records) ? records : []).filter(reviewed).map(row => ({ row, question: tokens(row.question || row.title), keywords: tokens((row.keywords || []).join(' ')), key: [...tokens(row.question || row.title)].sort().join(' ') }));
  return { search(query, { topic, context } = {}) {
    const q = tokens(query);
    if (!q.size) return unknown('empty_query');
    const weight = t => ['network','print','blank','power'].includes(t) ? 2 : 1;
    const overlap = set => { const shared = [...q].filter(t => set.has(t)).reduce((n,t) => n + weight(t), 0); const total = [...q].reduce((n,t) => n + weight(t), 0); const coverage = shared / Math.max(1, [...set].reduce((n,t) => n + weight(t), 0)); return shared / total * 0.8 + Math.min(1,coverage) * 0.2; };
    const requested = topic || (context && (context.topic || context.intent));
    const ranked = rows.filter(({ row }) => reviewed(row)).filter(({ row }) => !requested || domainOf(row.domain) === domainOf(requested) || domainOf(row.topic) === domainOf(requested) || row.id === requested).map(entry => {
      const base = overlap(entry.question);
      const keyword = overlap(entry.keywords);
      const ctx = context && (domainOf(context.topic || context.intent) === domainOf(entry.row.domain)) ? 0.04 : 0;
      return { ...entry, score: Math.min(1, Math.max(base, keyword * 0.9) + ctx), base: Math.max(base, keyword * 0.9) };
    }).filter(e => e.base >= 0.6).sort((a,b) => b.score - a.score);
    if (!ranked.length) return unknown('no_verified_relevant_knowledge');
    const first = ranked[0];
    const conflict = ranked.some(e => e !== first && (e.key === first.key || (e.row.domain === first.row.domain && e.base >= 0.65)) && normalize(e.row.answer) !== normalize(first.row.answer));
    if (conflict) return { status: 'ambiguous', confidence: first.score, reason: 'conflicting_reviewed_answers' };
    const source = evidenceSource(first.row);
    return { status: 'matched', item: { id: first.row.id, answer: first.row.answer, domain: first.row.domain }, confidence: first.score, provenance: { type: source.type, reference: source.reference } };
  } };
}
let cached;
function retrieve(query, context = {}) {
  if (!cached) cached = createRetriever(require('../../knowledge.json'));
  return cached.search(query, { topic: context.topic, context });
}
module.exports = retrieve;
module.exports.retrieve = retrieve;
module.exports.createRetriever = createRetriever;

module.exports.reviewed = reviewed;
module.exports.safeAnswer = safeAnswer;
