'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Execute the real handler with an in-memory SDK and modules: no login, files or network.
async function harness(options = {}) {
  const handlers = {};
  const sent = [], marked = [], logs = [], inputs = [];
  const pending = options.pending ? { issue: 'printer', consent: true } : null;
  const modules = {
    './lib/reply-context.cjs':require('../lib/reply-context.cjs'),
    './dialogue.js': {
      processMessage: (group, user, input) => { inputs.push(input); return 'Em hỗ trợ kiểm tra máy in.'; }, hasSession: () => false,
      hasEscalation: () => false, closing: () => false, greetingOnly: () => false,
      getPendingHandover: () => pending, markHandoverDone: (...args) => marked.push(args),
      shouldRespondV11: input => { if (options.analyzerError) throw Error('offline analyzer'); return input === 'máy cà thẻ nuốt giấy'; }
    },
    './intent.js': { normalize: x => x, detect: () => ({ respond: false, reason: 'unknown' }),
      isIntroduction: () => false, isCompliment: () => false, isAddressed: () => false, stripAddress: x => x },
    './state.js': { isDisabled: () => false },
    './incident.js': { create: () => ({ id: 'VP-TEST-1' }) },
    './quality.js': { log: (...args) => logs.push(args) },
    './qh-v43-language.js': { normalize: text => ({ text: options.normalize ? 'máy không in được bill' : text, changed: Boolean(options.normalize) }) }
  };
  const api = { listener: { on: (type, fn) => { handlers[type] = fn; }, start() {} },
    sendMessage: async payload => { sent.push(payload); if (options.failMention && payload.mentions) throw Error('synthetic send failure'); } };
  let source = fs.readFileSync(path.join(__dirname, '..', 'listener.mjs'), 'utf8');
  source = source.replace("import { Zalo, ThreadType } from 'zca-js';", '')
    .replace("import { createRequire } from 'node:module';", '')
    .replace("import fs from 'node:fs';", '')
    .replace('const require = createRequire(import.meta.url);', '');
  const context = vm.createContext({
    Zalo: class { async loginQR() { return api; } }, ThreadType: { Group: 1 },
    require: name => { assert.ok(Object.hasOwn(modules, name), name); return modules[name]; },
    fs: { appendFileSync() { throw Error('file writes forbidden'); } },
    process: { env: { QH_V11_ENABLED: options.flagValue || (options.enabled === false ? 'false' : 'true'),
      LOG_UNKNOWN: 'false', TYPING_ENABLED: 'false', COOLDOWN_MS: '0',
      REPLY_DELAY_MIN_MS: '0', REPLY_DELAY_MAX_MS: '0', STAFF_ZALO_IDS: options.ids || '111,222',
      GROUP_MODE: 'allowlist', ALLOWED_GROUP_IDS: 'synthetic-group', AUTO_REPLY: options.dry ? 'false' : 'true' } },
    console: { log() {}, warn() {}, error: (...args) => logs.push(args) },
    setTimeout: fn => { fn(); return 0; }
  });
  await vm.runInContext(`(async () => { ${source}\n })()`, context);
  return { sent, marked, logs, inputs, message: (text, group = 'synthetic-group', id = 'message-1') => handlers.message({
    type: 1, threadId: group, data: { uidFrom: 'synthetic-user', content: text, msgId: id }
  }) };
}

test('V11 opt-in admits recognized printer slang, unknown chatter remains ignored', async () => {
  const h = await harness();
  await h.message('hôm nay trời đẹp');
  assert.equal(h.sent.length, 0);
  await h.message('máy cà thẻ nuốt giấy', undefined, 'message-2');
  assert.equal(h.sent.length, 1);
});
test('flag off and analyzer failure preserve legacy rejection', async () => {
  for (const config of [{ enabled: false }, { analyzerError: true }]) {
    const h = await harness(config); await h.message('máy cà thẻ nuốt giấy'); assert.equal(h.sent.length, 0);
  }
});
test('V11 keeps allowlist, dedupe and AUTO_REPLY controls', async () => {
  const h = await harness();
  await h.message('máy cà thẻ nuốt giấy', 'forbidden'); assert.equal(h.sent.length, 0);
  await h.message('máy cà thẻ nuốt giấy'); await h.message('máy cà thẻ nuốt giấy'); assert.equal(h.sent.length, 1);
  const dry = await harness({ dry: true }); await dry.message('máy cà thẻ nuốt giấy'); assert.equal(dry.sent.length, 0);
});
test('confirmed send preserves both staff IDs and offsets after ticket prefix', async () => {
  const h = await harness({ pending: true }); await h.message('máy cà thẻ nuốt giấy');
  assert.equal(h.sent.length, 1); assert.equal(h.marked.length, 1);
  assert.deepEqual(Array.from(h.sent[0].mentions, m => m.uid), ['111', '222']);
  for (const mention of h.sent[0].mentions) assert.equal(h.sent[0].msg.slice(mention.pos, mention.pos + mention.len), mention.uid === '111' ? '@Hoàng Anh' : '@Thu Hoài');
});
test('failed mention sends fallback without marking handover complete', async () => {
  const h = await harness({ pending: true, failMention: true }); await h.message('máy cà thẻ nuốt giấy');
  assert.equal(h.sent.length, 2); assert.equal(h.marked.length, 0); assert.equal(h.sent[1].mentions, undefined);
});
test('unverified duplicate staff IDs never tag or mark handover complete', async () => {
  const h = await harness({ pending: true, ids: '111,111' }); await h.message('máy cà thẻ nuốt giấy');
  assert.equal(h.sent.length, 1); assert.equal(h.sent[0].mentions, undefined); assert.equal(h.marked.length, 0);
});

test('V11 response retains original input while disabled flag preserves legacy normalization', async () => {
  const enabled = await harness({ normalize: true }); await enabled.message('máy cà thẻ nuốt giấy');
  assert.equal(enabled.inputs[0], 'máy cà thẻ nuốt giấy');
  const disabled = await harness({ normalize: true, enabled: false }); await disabled.message('máy cà thẻ nuốt giấy');
  assert.equal(disabled.inputs[0], 'máy không in được bill');
});

test('listener opt-in uses the same exact flag semantics as dialogue', async () => {
  const h = await harness({ flagValue: 'TRUE' });
  await h.message('máy cà thẻ nuốt giấy');
  assert.equal(h.sent.length, 0);
});
