'use strict';

// Only finite internal codes enter this transient store. Merchant messages,
// names, addresses, payment references and consent handover details cannot.
const TOPICS = new Set('freeze power battery printer network qr card debit missing duplicate refund void reversal settlement portal'.split(' '));
const QUESTIONS = new Set('freeze-location payment-history payment-verify paper-checked printer-type network-mode wifi-other sim-signal power-charge battery-safe qr-stage card-method refund-kind refund-status settlement-status portal-filters duplicate-history reversal-status offer-consent clarify resume receipt-paper network-localize card-message refund-clarify retry-clarify escalation-declined clarify-context'.split(' '));
const STEPS = new Set('paper-orientation charger-check wifi-check sim-check history-check filters-check restart-safe card-check qr-check bank-review printer-check branch-filter network-check'.split(' '));
const ANSWERS = new Set('yes no unknown wifi sim main processing blank no-paper charged not-charging in-flight no-flight visible missing failed working declined uncertain'.split(' '));
const KNOWN = { operation: new Set(['card-use','qr-use','portal-access','portal-report','receipt-copy','reconcile']), cardMethod: new Set(['chip', 'contactless', 'swipe', 'unknown']), connection: new Set(['wifi', 'sim', 'unknown']), paper: new Set(['blank', 'stuck', 'not-feeding', 'faint', 'empty', 'unknown']), payment: new Set(['pending', 'unverified', 'merchant-reported', 'unknown']), location: new Set(['main', 'processing', 'unknown']), phoneWifi: new Set(['working', 'failed', 'unknown']) };
const DECISIONS = new Set(['clarify', 'diagnose', 'verify', 'offer-consent', 'declined', 'resume', 'resolved', 'unknown']);
const REFUSALS = new Set(['none', 'declined', 'cancelled']);
const RISKS = new Set(['low', 'unknown', 'high']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function object(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) throw new TypeError('Memory state must be a plain object');
}
function code(value, allowed) {
  if (value === null) return null;
  if (typeof value !== 'string' || !allowed.has(value)) throw new TypeError('Memory accepts only registered internal codes');
  return value;
}
function list(value, allowed, max = 10) {
  if (!Array.isArray(value)) throw new TypeError('Memory history must be an array');
  // Validate all entries, including entries that will be trimmed.
  value.forEach(item => { if (item === null) throw new TypeError('Null history entry'); code(item, allowed); });
  return value.slice(-max);
}
function sanitize(value, frame = false) {
  object(value);
  const schema = { topic: TOPICS, currentQuestion: QUESTIONS, attempted: STEPS, failed: STEPS, risk: RISKS, knownAnswers: 'known', tried: STEPS, declined: 'boolean', refusal: REFUSALS, decision: DECISIONS, lastQuestionContext: QUESTIONS };
  if (!frame) Object.assign(schema, { previousQuestions: QUESTIONS, answers: ANSWERS, pendingVerification: 'boolean', consent: 'boolean', interruptions: 'frames' });
  const result = {};
  for (const key of Object.keys(value)) {
    if (!own(schema, key)) throw new TypeError('Unknown memory state field');
    const rule = schema[key];
    if (rule === 'known') {
      object(value[key]);
      const facts = {};
      for (const fact of Object.keys(value[key])) {
        if (!own(KNOWN, fact) || value[key][fact] === null) throw new TypeError('Unknown known-answer code');
        facts[fact] = code(value[key][fact], KNOWN[fact]);
      }
      result[key] = facts;
    } else if (rule === 'boolean') {
      if (typeof value[key] !== 'boolean') throw new TypeError('Memory flags must be boolean');
      result[key] = value[key];
    } else if (rule === 'frames') {
      if (!Array.isArray(value[key])) throw new TypeError('Interruptions must be an array');
      result[key] = value[key].map(item => sanitize(item, true)).slice(-2);
    } else if (['previousQuestions', 'answers', 'attempted', 'failed', 'tried'].includes(key)) result[key] = list(value[key], rule);
    else result[key] = code(value[key], rule);
  }
  return result;
}
function createMemory({ ttlMs = 30 * 60 * 1000, maxEntries = 2000, now = Date.now } = {}) {
  if (!Number.isFinite(ttlMs) || ttlMs <= 0 || !Number.isInteger(maxEntries) || maxEntries <= 0 || maxEntries > 2000 || typeof now !== 'function') throw new TypeError('Invalid memory limits');
  const entries = new Map();
  function sweep() {
    const time = now();
    if (!Number.isFinite(time)) throw new TypeError('Invalid clock');
    for (const [key, entry] of entries) if (time >= entry.expires) entries.delete(key);
    return time;
  }
  function key(group, user) {
    if (!['string', 'number'].includes(typeof group) || !['string', 'number'].includes(typeof user) || (typeof group === 'number' && !Number.isFinite(group)) || (typeof user === 'number' && !Number.isFinite(user)) || String(group).length > 256 || String(user).length > 256) throw new TypeError('Invalid transient conversation key');
    return JSON.stringify([group, user]);
  }
  return {
    get(group, user) { sweep(); const entry = entries.get(key(group, user)); return entry ? structuredClone(entry.state) : null; },
    set(group, user, state) {
      const time = sweep(); const id = key(group, user); const safe = sanitize(state);
      if (!Number.isFinite(time + ttlMs)) throw new TypeError('Invalid expiry');
      entries.delete(id);
      while (entries.size >= maxEntries) entries.delete(entries.keys().next().value);
      entries.set(id, { state: safe, expires: time + ttlMs });
      return structuredClone(safe);
    },
    delete(group, user) { sweep(); return entries.delete(key(group, user)); },
    clear() { sweep(); entries.clear(); },
    get size() { sweep(); return entries.size; }
  };
}
module.exports = { createMemory };
