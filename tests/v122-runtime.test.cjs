'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createEngine } = require('../lib/v12/engine.cjs');
const { createMemory } = require('../lib/v12/memory.cjs');
const setup = (options = {}) => { const memory = createMemory(options); return { memory, engine: createEngine({ memory }) }; };
function boundedReply(reply) {
  assert.ok(reply === null || typeof reply === 'string' || (typeof reply === 'object' && reply !== null));
  if (typeof reply === 'string') assert.ok(reply.length < 3000, 'reply must remain bounded');
}

test('V12.2 actual engine stays within 2000 sessions and isolates group/user pairs under churn', () => {
  const { memory, engine } = setup();
  for (let i = 0; i < 2010; i++) {
    boundedReply(engine.reply('synthetic-group-' + (i % 7), 'synthetic-user-' + i, 'máy POS không in bill'));
    assert.ok(memory.size <= 2000);
  }
  assert.equal(memory.size, 2000);
  assert.equal(engine.getContext('synthetic-group-0', 'synthetic-user-0'), null);
  assert.equal(engine.getContext('other-group', 'synthetic-user-2009'), null);
  assert.equal(engine.getContext('synthetic-group-' + (2009 % 7), 'synthetic-user-2009').topic, 'printer');
  engine.reply('tuple:a', 'b', 'máy POS không lên nguồn');
  assert.equal(engine.getContext('tuple', 'a:b'), null);
});

test('V12.2 rejects non-string and oversized input before coercion, consent or state mutation', () => {
  const { engine } = setup();
  engine.reply('g', 'u', 'máy POS vẫn treo đã khởi động rồi');
  const before = engine.getContext('g', 'u');
  assert.equal(before.consent, false);
  let coerced = false;
  const invalid = [null, undefined, false, 42, [], {}, { toString() { coerced = true; throw Error('synthetic coercion must not run'); } }, { toString() { coerced = true; return 'đồng ý chuyển OPS'; } }, 'đồng ý chuyển OPS' + ' '.repeat(6000) + 'không đồng ý chuyển OPS'];
  for (const input of invalid) {
    const reply = engine.reply('g', 'u', input);
    boundedReply(reply);
    assert.ok(!reply || reply.handover !== true, 'invalid input cannot create handover');
    assert.deepEqual(engine.getContext('g', 'u'), before, 'invalid input must preserve prior safe context');
  }
  assert.equal(coerced, false);
  const oversized = engine.reply('g', 'new', 'máy POS treo' + ' '.repeat(6001));
  boundedReply(oversized);
  assert.ok(!oversized || oversized.handover !== true);
  assert.equal(engine.getContext('g', 'new'), null);
});

test('V12.2 repeated runtime responses terminate without growing histories or granting consent', () => {
  const { memory, engine } = setup();
  engine.reply('g', 'u', 'máy POS không in bill');
  for (let i = 0; i < 250; i++) {
    const reply = engine.reply('g', 'u', i % 2 ? 'vẫn chưa được' : 'giấy không chạy');
    boundedReply(reply);
    assert.ok(!reply || reply.handover !== true);
    const state = engine.getContext('g', 'u');
    assert.equal(state.consent, false);
    for (const key of ['answers', 'previousQuestions', 'attempted', 'failed', 'tried']) assert.ok(state[key].length <= 10);
    assert.ok(state.interruptions.length <= 2);
    assert.ok(JSON.stringify(state).length < 5000);
  }
  assert.equal(memory.size, 1);
});

test('V12.2 expiry clears payment and consent context without inventing transaction status', () => {
  let now = 0; const { memory, engine } = setup({ ttlMs: 10, now: () => now });
  boundedReply(engine.reply('g', 'u', 'khách bị trừ tiền nhưng POS chưa có giao dịch'));
  assert.equal(engine.getContext('g', 'u').pendingVerification, true);
  now = 10;
  assert.equal(engine.getContext('g', 'u'), null);
  assert.equal(memory.size, 0);
  const consent = engine.reply('g', 'u', 'đồng ý chuyển OPS');
  assert.ok(!consent || consent.handover !== true, 'expired issue cannot authorize handover');
  const reply = engine.reply('g', 'u', 'tiền quyết toán đã về chưa');
  assert.equal(typeof reply, 'string');
  assert.match(reply, /chưa.*(?:dữ liệu|xác minh)|không.*(?:xác nhận|kết luận)|đối chiếu|kiểm tra/iu);
  assert.doesNotMatch(reply, /(?:em xác nhận|chắc chắn|đảm bảo).*(?:thành công|tiền đã về|đã chi trả)/iu);
  assert.equal(engine.getContext('g', 'u').consent, false);
});
