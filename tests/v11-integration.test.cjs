'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function isolated(script, flag = 'true') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qh-v11-integration-'));
  try {
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8',
      env: { ...process.env, QH_V11_ENABLED: flag, POS_CARE_STATE_FILE: path.join(dir, 'state.json'),
        POS_CARE_EVENTS_FILE: path.join(dir, 'events.jsonl') }
    });
    assert.equal(result.status, 0, result.stderr);
    return JSON.parse(result.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}

test('real dialogue V11 flag defaults off and preserves legacy responses', () => {
  const script = `const d=require('./dialogue'); const result=['máy không in bill','khách đã bị trừ tiền','POS mất mạng'].map((q,i)=>d.processMessage('synthetic-'+i,'synthetic-user',q)); console.log(JSON.stringify({result,eligible:d.shouldRespondV11('máy in bill trắng')}));`;
  const disabled = isolated(script, 'false');
  assert.deepEqual(isolated(script, ''), disabled);
  assert.deepEqual(isolated(script, 'TRUE'), disabled);
  assert.equal(disabled.eligible, false);
});

test('real eligibility and typo route printer support while rejecting group chatter', () => {
  const result = isolated(`const d=require('./dialogue'); console.log(JSON.stringify({support:d.shouldRespondV11('máy ko in dc bill'),chatter:d.shouldRespondV11('hôm nay trời đẹp quá'),response:d.processMessage('synthetic-printer','synthetic-user','máy ko in dc bill'),context:d.v11Context('synthetic-printer','synthetic-user')}));`);
  assert.equal(result.support, true); assert.equal(result.chatter, false);
  assert.match(result.response, /giấy|in bill/i); assert.equal(result.context.topic, 'printer');
});

test('engine reply failure clears partial V11 state and returns conservative legacy answer', () => {
  const result = isolated(`const d=require('./dialogue'), e=require('./lib/v11/engine.cjs'); const original=e.reply; e.reply=(...args)=>{original(...args);throw Error('PRIVATE_FAILURE_8361');}; const response=d.processMessage('synthetic-failure','synthetic-user','máy không in bill'); console.log(JSON.stringify({response,context:d.v11Context('synthetic-failure','synthetic-user'),pending:d.getPendingHandover('synthetic-failure','synthetic-user')}));`);
  assert.equal(typeof result.response, 'string'); assert.ok(result.response.length > 0);
  assert.doesNotMatch(result.response, /PRIVATE_FAILURE|stack|engine\.cjs|credential/i);
  assert.equal(result.context, null); assert.equal(result.pending, null);
});

test('V11 hands existing integration only a consented merchant record and completion clears pending', () => {
  const result = isolated(`const d=require('./dialogue'); const g='synthetic-consent',u='synthetic-user'; const replies=[]; for(const q of ['máy POS vẫn treo đã khởi động rồi','đồng ý chuyển OPS','Cửa hàng kiểm thử','12 đường Kiểm Thử'])replies.push(d.processMessage(g,u,q)); const pending=d.getPendingHandover(g,u); d.markHandoverDone(g,u); console.log(JSON.stringify({replies,pending,after:d.getPendingHandover(g,u)}));`);
  assert.match(result.replies[0], /đồng ý/i);
  assert.match(result.replies[1], /tên cửa hàng/i);
  assert.equal(result.pending.name, 'Cửa hàng kiểm thử'); assert.equal(result.pending.address, '12 đường Kiểm Thử');
  assert.equal(result.after, null);
  for (const response of result.replies) assert.doesNotMatch(response, /(?:gửi|cung cấp|cho em xin).{0,25}(?:MID|TID)/i);
});

test('V11 decline never creates a pending handover', () => {
  const result = isolated(`const d=require('./dialogue'); const g='synthetic-decline',u='synthetic-user'; d.processMessage(g,u,'máy POS vẫn treo đã khởi động rồi'); const response=d.processMessage(g,u,'không đồng ý chuyển OPS'); console.log(JSON.stringify({response,pending:d.getPendingHandover(g,u)}));`);
  assert.match(result.response, /chưa chuyển/i); assert.equal(result.pending, null);
});

test('per-message options cannot enable V11 when environment flag is off', () => {
  const result = isolated(`const d=require('./dialogue'),e=require('./lib/v11/engine.cjs'); let called=false; e.reply=()=>{called=true;return 'FORBIDDEN_OVERRIDE';}; const response=d.processMessage('synthetic-options','synthetic-user','máy không in bill',{QH_V11_ENABLED:true,v11:true,enabled:true}); console.log(JSON.stringify({called,response}));`, 'false');
  assert.equal(result.called, false); assert.doesNotMatch(result.response, /FORBIDDEN_OVERRIDE/);
});

test('optional V11 module failure preserves startup and legacy support with flag on or off', () => {
  const script = `const Module=require('node:module'); const load=Module._load; Module._load=function(request,parent,isMain){if(request==='./lib/v11/engine.cjs')throw Error('PRIVATE_MODULE_UNAVAILABLE');return load.call(this,request,parent,isMain);}; const d=require('./dialogue'); const response=d.processMessage('synthetic-missing','synthetic-user','máy không in bill'); console.log(JSON.stringify({response,eligible:d.shouldRespondV11('máy không in bill'),context:d.v11Context('synthetic-missing','synthetic-user')}));`;
  const disabled = isolated(script, 'false');
  const enabled = isolated(script, 'true');
  assert.deepEqual(enabled, disabled);
  assert.equal(enabled.eligible, false); assert.equal(enabled.context, null);
  assert.match(enabled.response, /giấy|bill|in/i); assert.doesNotMatch(enabled.response, /PRIVATE_MODULE_UNAVAILABLE/);
});

test('faulting optional state helpers fail closed without interrupting legacy support or controls', () => {
  const result = isolated(`const d=require('./dialogue'), e=require('./lib/v11/engine.cjs'); for(const method of ['getContext','clear','hasSession','shouldRespond','shouldInterrupt'])e[method]=()=>{throw Error('PRIVATE_STATE_FAULT');}; const eligible=d.shouldRespondV11('máy không in bill'); const context=d.v11Context('synthetic-fault','synthetic-user'); const session=d.hasSession('synthetic-fault','synthetic-user'); const info=d.sessionInfo('synthetic-fault','synthetic-user'); e.reply=()=>{throw Error('PRIVATE_REPLY_FAULT');}; const response=d.processMessage('synthetic-fault','synthetic-user','máy không in bill'); const reset=d.processMessage('synthetic-fault','synthetic-user','/huy'); console.log(JSON.stringify({eligible,context,session,info,response,reset}));`);
  assert.equal(result.eligible, false); assert.equal(result.context, null);
  assert.equal(result.session, false); assert.equal(result.info, null);
  assert.match(result.response, /giấy|bill|in/i); assert.match(result.reset, /kết thúc/i);
  assert.doesNotMatch(JSON.stringify(result), /PRIVATE_STATE_FAULT|PRIVATE_REPLY_FAULT/);
});

test('faulting interruption analyzer preserves a consented escalation without crashing', () => {
  const result = isolated(`const d=require('./dialogue'), e=require('./lib/v11/engine.cjs'); const g='synthetic-interrupt-fault',u='synthetic-user'; d.processMessage(g,u,'máy POS vẫn treo đã khởi động rồi'); d.processMessage(g,u,'đồng ý chuyển OPS'); e.shouldInterrupt=()=>{throw Error('PRIVATE_INTERRUPT_FAULT');}; const response=d.processMessage(g,u,'Cửa hàng kiểm thử'); console.log(JSON.stringify({response,pending:d.getPendingHandover(g,u)}));`);
  assert.match(result.response, /địa chỉ/i); assert.equal(result.pending, null);
  assert.doesNotMatch(result.response, /PRIVATE_INTERRUPT_FAULT/);
});
