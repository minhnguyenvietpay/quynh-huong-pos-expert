'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createMemory } = require('../lib/v11/memory.cjs');

test('V11 memory isolates group/user tuples and clones all nested state', () => {
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

test('V11 memory expires on reads, writes, size, delete and clear', () => {
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

test('V11 memory bounds entries, histories and interruption frames', () => {
  const memory = createMemory({ maxEntries: 2 });
  memory.set('g', 'a', {}); memory.set('g', 'b', {}); memory.set('g', 'c', {});
  assert.equal(memory.size, 2); assert.equal(memory.get('g', 'a'), null);
  memory.set('g', 'b', { answers: Array(20).fill('yes'), previousQuestions: Array(20).fill('clarify'), attempted: Array(20).fill('wifi-check'), failed: Array(20).fill('wifi-check'), interruptions: Array(8).fill({ topic: 'printer' }) });
  const state = memory.get('g', 'b');
  for (const key of ['answers', 'previousQuestions', 'attempted', 'failed']) assert.equal(state[key].length, 10);
  assert.equal(state.interruptions.length, 2);
  memory.set('g', 'd', {}); assert.equal(memory.get('g', 'c'), null);
});

test('V11 memory rejects free text, identifiers, unknown keys and unsafe frames', () => {
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

test('V11 memory validates limits and supports deletion without persistence', () => {
  for (const options of [{ ttlMs: 0 }, { ttlMs: Infinity }, { maxEntries: 0 }, { maxEntries: 1.5 }, { now: null }]) assert.throws(() => createMemory(options), TypeError);
  const memory = createMemory();
  memory.set('g', 'u', { topic: null, currentQuestion: null, risk: 'unknown', pendingVerification: true, consent: false });
  assert.equal(memory.delete('g', 'u'), true);
  assert.equal(memory.get('g', 'u'), null);
  assert.throws(() => memory.set('g', { value: 'u' }, {}), TypeError);
  assert.equal(memory.size, 0);
});
