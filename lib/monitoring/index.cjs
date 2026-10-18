'use strict';
const { createHash } = require('node:crypto');
const OUTCOMES = Object.freeze(['answered', 'unanswered', 'failed']);
const REPLAY = Object.freeze({ failed: 'synthetic.processor-error', unanswered: 'synthetic.empty-response', repetition: 'synthetic.repeated-response', unsafeEscalation: 'synthetic.escalation-without-consent' });
function createMonitor({ maxConversations = 1000, conversationTtlMs = 1800000, now = Date.now } = {}) {
  if (!Number.isInteger(maxConversations) || maxConversations < 1 || maxConversations > 10000 || !Number.isFinite(conversationTtlMs) || conversationTtlMs < 1) throw new TypeError('Invalid monitor bounds');
  const counts = { total: 0, answered: 0, unanswered: 0, failed: 0, repetition: 0, escalations: 0, unsafeEscalation: 0 };
  const latency = { count: 0, totalMs: 0, maxMs: 0, buckets: { under100: 0, under1000: 0, under5000: 0, other: 0 } };
  const states = new Map();
  function record(event) {
    const allowed = ['outcome', 'durationMs', 'repeated', 'escalated', 'consent'];
    if (!event || typeof event !== 'object' || Object.keys(event).some(k => !allowed.includes(k)) || !OUTCOMES.includes(event.outcome) || !Number.isFinite(event.durationMs) || event.durationMs < 0 || event.durationMs > 86400000 || ['repeated', 'escalated', 'consent'].some(k => typeof event[k] !== 'boolean')) throw new TypeError('Invalid monitoring event');
    counts.total++; counts[event.outcome]++;
    if (event.repeated) counts.repetition++;
    if (event.escalated) { counts.escalations++; if (!event.consent) counts.unsafeEscalation++; }
    const ms = Math.round(event.durationMs); latency.count++; latency.totalMs += ms; latency.maxMs = Math.max(latency.maxMs, ms);
    latency.buckets[ms < 100 ? 'under100' : ms < 1000 ? 'under1000' : ms < 5000 ? 'under5000' : 'other']++;
  }
  function snapshot() {
    return { version: 1, mode: 'offline-interface', counts: { ...counts }, latency: { count: latency.count, meanMs: latency.count ? Math.round(latency.totalMs / latency.count) : 0, maxMs: latency.maxMs, buckets: { ...latency.buckets } }, replayCases: Object.entries(REPLAY).filter(([key]) => counts[key] > 0).map(([, value]) => value) };
  }
  // Opt-in integration only: this module does not attach itself to any listener.
  function wrap(process, { classify = () => ({}), conversationKey = () => undefined } = {}) {
    if (typeof process !== 'function') throw new TypeError('Processor required');
    return async function (...args) {
      const start = now(); let result;
      try { result = await process.apply(this, args); }
      catch (error) { record({ outcome: 'failed', durationMs: Math.min(86400000, Math.max(0, now() - start)), repeated: false, escalated: false, consent: false }); throw error; }
      let metadata = {};
      try {
        const candidate = classify(result, ...args) || {};
        metadata = { outcome: candidate.outcome, escalated: candidate.escalated === true, consent: candidate.consent === true };
      } catch { /* Observability must not break a successful processor. */ }
      const outcome = OUTCOMES.includes(metadata.outcome) ? metadata.outcome : (result == null || result === '' ? 'unanswered' : 'answered');
      let repeated = false;
      try {
        const key = conversationKey(...args); const time = now();
        for (const [stored, state] of states) if (time - state.time >= conversationTtlMs) states.delete(stored);
        if (typeof key === 'string' && key.length > 0 && key.length <= 256 && typeof result === 'string' && result.length > 0) {
          const id = createHash('sha256').update(key).digest('hex');
          const hash = createHash('sha256').update(result).digest('hex');
          const old = states.get(id); repeated = Boolean(old && old.hash === hash);
          states.delete(id); states.set(id, { hash, time });
          while (states.size > maxConversations) states.delete(states.keys().next().value);
        }
      } catch { /* No input or exception is retained. */ }
      record({ outcome, durationMs: Math.min(86400000, Math.max(0, now() - start)), repeated, escalated: metadata.escalated === true, consent: metadata.consent === true });
      return result;
    };
  }
  return Object.freeze({ record, snapshot, wrap });
}
module.exports = { createMonitor };
