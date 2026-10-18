'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { createMonitor } = require('../lib/monitoring/index.cjs');
const { createServer } = require('../scripts/online-qa-server.cjs');
const event = { outcome: 'answered', durationMs: 42, repeated: false, escalated: false, consent: false };
test('monitor strictly rejects raw fields and invalid metric values', () => {
  const monitor = createMonitor();
  for (const field of ['message', 'customerId', 'session', 'error', 'token', '__proto__']) {
    const bad = { ...event }; Object.defineProperty(bad, field, { value: 'SECRET_CUSTOMER', enumerable: true });
    assert.throws(() => monitor.record(bad), TypeError);
  }
  assert.throws(() => monitor.record({ ...event, durationMs: NaN }));
  assert.throws(() => monitor.record({ ...event, outcome: 'SECRET' }));
  assert.equal(monitor.snapshot().counts.total, 0);
});
test('adapter counts actual results, failures, repetition, consent and latency without exporting content', async () => {
  let clock = 0; const monitor = createMonitor({ now: () => clock });
  const process = monitor.wrap(async value => { clock += 150; if (value === 'fail') throw Error('SECRET_ERROR'); return value; }, {
    conversationKey: () => 'SECRET_CUSTOMER_ID', classify: () => ({ escalated: true, consent: false, message: 'SECRET_MESSAGE' })
  });
  await process('SECRET_RESPONSE'); await process('SECRET_RESPONSE'); await process('');
  await assert.rejects(process('fail'), /SECRET_ERROR/);
  const snap = monitor.snapshot();
  assert.deepEqual(snap.counts, { total: 4, answered: 2, unanswered: 1, failed: 1, repetition: 1, escalations: 3, unsafeEscalation: 3 });
  assert.equal(snap.latency.meanMs, 150); assert.equal(snap.latency.buckets.under1000, 4);
  assert.equal(JSON.stringify(snap).includes('SECRET'), false);
  assert.deepEqual(snap.replayCases, ['synthetic.processor-error', 'synthetic.empty-response', 'synthetic.repeated-response', 'synthetic.escalation-without-consent']);
});
test('consent metrics, snapshot isolation and bounded repetition state', async () => {
  let clock = 0; const monitor = createMonitor({ maxConversations: 1, conversationTtlMs: 10, now: () => clock });
  const run = monitor.wrap(async () => 'same', { conversationKey: key => key, classify: () => ({ escalated: true, consent: true }) });
  await run('a'); await run('b'); await run('a'); clock = 11; await run('a');
  assert.equal(monitor.snapshot().counts.repetition, 0);
  assert.equal(monitor.snapshot().counts.unsafeEscalation, 0);
  const snapshot = monitor.snapshot(); snapshot.counts.total = 99; assert.equal(monitor.snapshot().counts.total, 4);
});
test('classifier failure cannot change application result', async () => {
  const monitor = createMonitor(); const run = monitor.wrap(async () => 'ok', { classify: () => { throw Error('SECRET'); } });
  assert.equal(await run(), 'ok'); assert.equal(monitor.snapshot().counts.answered, 1);
});
test('dashboard only serves local read-only aggregate routes', async t => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const request = (path, method = 'GET', headers = {}) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.address().port, path, method, headers }, res => {
      let body = ''; res.on('data', chunk => { body += chunk; }); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    }); req.on('error', reject); req.end();
  });
  const response = await request('/api/metrics'); assert.equal(response.status, 200); assert.equal(response.headers['access-control-allow-origin'], undefined); assert.equal(JSON.parse(response.body).counts.total, 0);
  assert.equal((await request('/')).status, 200);
  assert.equal((await request('/api/metrics', 'POST')).status, 405);
  assert.equal((await request('/?token=SECRET')).status, 404);
  assert.equal((await request('/', 'GET', { Host: 'evil.example' })).status, 403);
  assert.equal((await request('/', 'GET', { Origin: 'https://evil.example' })).status, 403);
});
