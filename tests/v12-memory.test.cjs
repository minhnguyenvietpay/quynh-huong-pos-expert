'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemory } = require('../lib/v12/memory.cjs');

test('V12 memory isolates group/user tuples and clones all nested state', () => {
  const memory = createMemory();
  const state = { topic: 'printer', currentQuestion: 'paper-checked', answers: ['yes'], attempted: ['printer-check'], failed: [], interruptions: [{ topic: 'network', currentQuestion: 'network-mode', attempted: [], failed: [], risk: 'low' }], consent: false };
  const saved = memory.set('a:b', 'c', state);
  saved.answers.push('no'); state.interruptions[0].topic = 'power';
  assert.equal(memory.get('a', 'b:c'), null);
  assert.equal(memory.get('other', 'c'), null);
  const found = memory.get('a:b', 'c');
  assert.deepEqual(found.answers, ['yes']);
  assert.equal(found.interruptions[0].topic, 'network');
  found.interruptions[0].attempted.push('wifi-check');
  assert.deepEqual(memory.get('a:b', 'c').interruptions[0].attempted, []);
});

test('V12 memory expires on reads, writes, size, delete and clear', () => {
  let time = 0;
  const memory = createMemory({ ttlMs: 10, now: () => time });
  memory.set('g', 'a', { topic: 'power' }); time = 9;
  assert.equal(memory.get('g', 'a').topic, 'power'); time = 10;
  assert.equal(memory.get('g', 'a'), null);
  memory.set('g', 'b', {}); time = 20;
  assert.equal(memory.size, 0);
  memory.set('g', 'c', {}); time = 30;
  assert.equal(memory.delete('g', 'c'), false);
  memory.set('g', 'd', {}); time = 40;
  memory.set('g', 'e', {});
  assert.equal(memory.size, 1);
  memory.clear(); assert.equal(memory.size, 0);
});

test('V12 memory bounds entries, histories and interruption frames', () => {
  const memory = createMemory({ maxEntries: 2 });
  memory.set('g', 'a', {}); memory.set('g', 'b', {}); memory.set('g', 'c', {});
  assert.equal(memory.size, 2); assert.equal(memory.get('g', 'a'), null);
  memory.set('g', 'b', { answers: Array(20).fill('yes'), previousQuestions: Array(20).fill('clarify'), attempted: Array(20).fill('wifi-check'), failed: Array(20).fill('wifi-check'), interruptions: Array(8).fill({ topic: 'printer' }) });
  const state = memory.get('g', 'b');
  for (const key of ['answers', 'previousQuestions', 'attempted', 'failed']) assert.equal(state[key].length, 10);
  assert.equal(state.interruptions.length, 2);
  memory.set('g', 'd', {}); assert.equal(memory.get('g', 'c'), null);
});

test('V12 memory rejects free text, identifiers, unknown keys and unsafe frames', () => {
  const memory = createMemory();
  for (const state of [
    { message: 'synthetic private message' }, { topic: 'merchant_name' },
    { currentQuestion: 'arbitrary-customer-value' }, { answers: ['123456789'] },
    { attempted: ['restart device please'] }, { risk: 'secret' }, { consent: 'yes' },
    { pendingVerification: 1 }, { interruptions: [{ name: 'Synthetic Name' }] },
    { interruptions: [{ interruptions: [] }] }, { failed: [null] },
    JSON.parse('{"__proto__":{"polluted":true}}')
  ]) assert.throws(() => memory.set('g', 'u', state), TypeError);
  assert.equal(memory.size, 0);
  assert.throws(() => memory.set('g', 'u', { answers: ['raw input', ...Array(10).fill('yes')] }), TypeError);
  assert.equal({}.polluted, undefined);
});

test('V12 memory validates limits and supports deletion without persistence', () => {
  for (const options of [{ ttlMs: 0 }, { ttlMs: Infinity }, { maxEntries: 0 }, { maxEntries: 1.5 }, { now: null }]) assert.throws(() => createMemory(options), TypeError);
  const memory = createMemory();
  memory.set('g', 'u', { topic: null, currentQuestion: null, risk: 'unknown', pendingVerification: true, consent: false });
  assert.equal(memory.delete('g', 'u'), true);
  assert.equal(memory.get('g', 'u'), null);
  assert.throws(() => memory.set('g', { value: 'u' }, {}), TypeError);
  assert.equal(memory.size, 0);
});

 test('V12 remembers finite diagnostic facts independently of proposed and tried steps', () => {
  const memory = createMemory();
  const state = { topic: 'printer', knownAnswers: { paper: 'not-feeding', connection: 'wifi', phoneWifi: 'working', payment: 'merchant-reported', location: 'main' }, attempted: ['paper-orientation'], tried: [], declined: true, refusal: 'declined', decision: 'diagnose', lastQuestionContext: 'receipt-paper', interruptions: [{ topic: 'network', knownAnswers: { phoneWifi: 'working' }, lastQuestionContext: 'network-localize', declined: false }] };
  memory.set('g', 'u', state);
  state.knownAnswers.paper = 'blank';
  const result = memory.get('g', 'u');
  assert.equal(result.knownAnswers.paper, 'not-feeding');
  assert.deepEqual(result.tried, []);
  assert.deepEqual(result.attempted, ['paper-orientation']);
  result.knownAnswers.connection = 'sim';
  assert.equal(memory.get('g', 'u').knownAnswers.connection, 'wifi');
  assert.equal(result.interruptions[0].knownAnswers.phoneWifi, 'working');
});
test('V12 rejects private facts and non-finite clocks/keys; caps capacity at 2000', () => {
  const memory = createMemory();
  for (const state of [{ knownAnswers: { name: 'customer' } }, { knownAnswers: { paper: 'giấy không chạy' } }, { knownAnswers: { payment: 'settled' } }, { knownAnswers: { connection: null } }, { declined: 'yes' }, { refusal: 'free text' }, { decision: 'payment successful' }, { lastQuestionContext: 'customer address' }, { tried: ['raw recommendation'] }]) assert.throws(() => memory.set('g', 'u', state), TypeError);
  assert.throws(() => createMemory({ maxEntries: 2001 }), TypeError);
  for (const invalid of [Infinity, NaN, -Infinity]) {
    assert.throws(() => createMemory({ now: () => invalid }).get('g', 'u'), TypeError);
    assert.throws(() => memory.set(invalid, 'u', {}), TypeError);
    assert.throws(() => memory.get('g', invalid), TypeError);
  }
});
test('V12 registers next diagnostic questions without retaining merchant text', () => {
  const memory = createMemory();
  for (const currentQuestion of ['receipt-paper', 'network-localize', 'card-message', 'refund-clarify', 'retry-clarify', 'offer-consent', 'escalation-declined', 'resume', 'clarify-context']) {
    memory.set('g', 'u', { currentQuestion, lastQuestionContext: currentQuestion });
    assert.equal(memory.get('g', 'u').currentQuestion, currentQuestion);
  }
});
