'use strict';
const { usableKnowledge } = require('../../knowledge-policy.js');
const { validate } = require('../knowledge/index.cjs');
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const stop = new Set(['anh','chi','oi','em','a','la','va','cua','cho','voi','toi','dang','bi','the','nao','xin']);
function tokens(value) {
  let text = normalize(value).replace(/\b(?:wi fi|internet|4g|sim)\b/g, ' network ').replace(/\b(?:wifi|ket noi|mat mang|loi mang)\b/g, ' network ').replace(/\b(?:printer|may in|in hoa don)\b/g, ' print ').replace(/\b(?:trang giay|giay trang)\b/g, ' blank ').replace(/\b(?:khong len nguon|mat nguon)\b/g, ' power ');
  return new Set(text.split(/\s+/).filter(t => t.length > 1 && !stop.has(t)));
}
function safeAnswer(answer) {
  const text = normalize(answer);
  return !(/\b(?:mid|tid|otp|pin|cvv)\b/.test(text) || /(?:so the|card number).{0,25}(?:day du|full)|(?:day du|full).{0,25}(?:so the|card number)/.test(text) || /(?:giao dich|tien|hoan tien|quyet toan|thanh toan).{0,45}(?:da thanh cong|da ve|da nhan|chac chan|dam bao|trong \d+|sau \d+)/.test(text) || /(?:da chuyen|da bao|da gui|tu dong chuyen).{0,20}(?:ops|van hanh)/.test(text));
}
function reviewed(row) {
  if (!usableKnowledge(row) || row.verificationStatus !== 'verified' || validate(row).length || !safeAnswer(row.answer)) return false;
  const now = Date.now();
  const verifiedAt = Date.parse(row.verifiedAt);
  if (verifiedAt > now || now - verifiedAt > 180 * 86400000) return false;
  // Evidence must identify the source it actually reviews, not an unrelated URL or validation score.
  return row.evidence.some(e => row.sources.some(s => ['official_document','approved_runbook'].includes(s.type) && s.reference === e.reference) && Date.parse(e.reviewedAt) <= now && now - Date.parse(e.reviewedAt) <= 180 * 86400000 && typeof e.reviewer === 'string' && e.reviewer.trim());
}
const unknown = reason => ({ status: 'unknown', confidence: 0, reason });
function createRetriever(records) {
  const rows = (Array.isArray(records) ? records : []).filter(reviewed).map(row => ({ row, question: tokens(row.question || row.title), keywords: tokens((row.keywords || []).join(' ')), key: normalize(row.question || row.title) }));
  return { search(query, { topic, context } = {}) {
    const q = tokens(query);
    if (!q.size) return unknown('empty_query');
    const overlap = set => [...q].reduce((sum, t) => sum + Number(set.has(t)), 0) / q.size;
    const ranked = rows.filter(({ row }) => !topic || row.domain === topic || row.topic === topic || row.id === topic).map(entry => {
      const base = overlap(entry.question);
      const keyword = overlap(entry.keywords);
      const ctx = context && (context.topic === entry.row.domain || context.topic === entry.row.topic) ? 0.04 : 0;
      return { ...entry, score: Math.min(1, Math.max(base, keyword * 0.9) + ctx), base: Math.max(base, keyword * 0.9) };
    }).filter(e => e.base >= 0.6).sort((a,b) => b.score - a.score);
    if (!ranked.length) return unknown('no_verified_relevant_knowledge');
    const first = ranked[0];
    const conflict = ranked.some(e => e !== first && (e.key === first.key || e.score >= first.score - 0.08) && normalize(e.row.answer) !== normalize(first.row.answer));
    if (conflict) return { status: 'ambiguous', confidence: first.score, reason: 'conflicting_reviewed_answers' };
    const source = first.row.sources.find(s => ['official_document','approved_runbook'].includes(s.type) && first.row.evidence.some(e => e.reference === s.reference));
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
