'use strict';
// Synthetic conversations through the real integration. No listener or customer fixtures.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
function isolated(source, flags = {}) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'qh-v12-security-'));
  try {
    const prelude = `const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;`;
    const result = spawnSync(process.execPath, ['-e', prelude + source], {
      cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 20000,
      env: {PATH: process.env.PATH, QH_V12_ENABLED:'true', QH_V11_ENABLED:'true', QH_GAP_LOG:'0',
        POS_CARE_STATE_FILE:path.join(temp,'state.json'), POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'), POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl'), ...flags}
    });
    assert.equal(result.status, 0, 'isolated dialogue must complete without network or runtime error');
    return JSON.parse(result.stdout);
  } finally { fs.rmSync(temp, {recursive:true,force:true}); }
}
const setup = `const d=require('./dialogue');const g='synthetic-security',u='synthetic-user';const send=q=>d.processMessage(g,u,q);const pending=()=>d.getPendingHandover(g,u);`;
const offer = `send('máy POS vẫn treo đã khởi động rồi');`;

test('V12 OPS consent rejects bare acknowledgement and later explicit refusal', () => {
  const result = isolated(setup + offer + `const acknowledgement=send('ok');const refusal=send('không đồng ý chuyển OPS');const later=send('ok');console.log(JSON.stringify({acknowledgement,refusal,later,pending:pending()}));`);
  assert.equal(result.pending, null);
  for (const r of [result.acknowledgement,result.refusal,result.later]) assert.doesNotMatch(r, /(?:xin|cung cấp).{0,20}(?:tên cửa hàng|địa chỉ)|đã (?:gửi|chuyển).{0,20}OPS/iu);
});

test('V12 merchant names containing device labels remain names after explicit consent', () => {
  const result = isolated(setup + offer + `const consent=send('đồng ý chuyển OPS');const name=send('Cửa hàng Máy In Bình An');const address=send('12 đường Giả Lập');console.log(JSON.stringify({consent,name,address,pending:pending()}));`);
  assert.match(result.consent, /tên cửa hàng/iu);
  assert.match(result.name, /địa chỉ|chi nhánh/iu);
  assert.equal(result.pending?.name, 'Cửa hàng Máy In Bình An');
  assert.equal(result.pending?.address, '12 đường Giả Lập');
});

for (const [label,input] of [['OTP','OTP 654321'],['PIN','PIN 654321'],['battery-adjacent PIN','máy POS nóng, mã PIN 654321'],['password','mật khẩu SYNTHETIC_PRIVATE_V12']]) {
  test('V12 sensitive input is blocked before merchant collection: '+label, () => {
    const result = isolated(setup + offer + `send('đồng ý chuyển OPS');const response=send(${JSON.stringify(input)});console.log(JSON.stringify({response,pending:pending(),context:d.v12Context(g,u)}));`);
    assert.match(result.response, /không chia sẻ|không cung cấp/iu);
    assert.doesNotMatch(JSON.stringify(result), /654321|SYNTHETIC_PRIVATE_V12/);
    assert.equal(result.pending, null);
  });
}

test('V12 battery complaint remains supportable without accepting payment PIN', () => {
  const result = isolated(setup + `const response=send('pin máy POS nóng và phồng');console.log(JSON.stringify({response,pending:pending()}));`);
  assert.match(result.response, /(?:ngừng|dừng|không).{0,35}(?:sạc|dùng|sử dụng)|(?:ngắt|rút).{0,20}sạc/iu);
  assert.doesNotMatch(result.response, /^⚠️ Không chia sẻ OTP/);
  assert.equal(result.pending, null);
});

test('V12 optional module missing falls back exactly to V11 without leaking exception', () => {
  const script = `const Module=require('node:module'),load=Module._load;Module._load=function(request,...args){if(request==='./lib/v12/engine.cjs')throw Error('SYNTHETIC_MODULE_SECRET');return load.call(this,request,...args);};` + setup + `console.log(JSON.stringify({response:send('máy không in bill'),eligible:d.shouldRespondV12('máy không in bill'),context:d.v12Context(g,u)}));`;
  const result = isolated(script);
  assert.deepEqual(result, isolated(script,{QH_V12_ENABLED:'false'}));
  assert.equal(result.eligible,false);assert.equal(result.context,null);
  assert.match(result.response,/giấy|bill|in/iu);
  assert.doesNotMatch(result.response,/SYNTHETIC_MODULE_SECRET/);
});

test('V12 reply fault clears partial context and preserves safe V11 fallback', () => {
  const result = isolated(setup + `const e=require('./lib/v12/engine.cjs'),original=e.reply;e.reply=(...args)=>{original(...args);throw Error('SYNTHETIC_RUNTIME_SECRET');};const response=send('máy không in bill');console.log(JSON.stringify({response,context:d.v12Context(g,u),pending:pending()}));`);
  assert.equal(result.context,null);assert.equal(result.pending,null);
  assert.match(result.response,/giấy|bill|in/iu);
  assert.doesNotMatch(result.response,/SYNTHETIC_RUNTIME_SECRET|stack|engine\.cjs/);
});

test('V12 context never retains raw synthetic message, merchant identity or identifiers', () => {
  const result = isolated(setup + `send('máy không in bill SYNTHETIC_RAW_MESSAGE_V12');console.log(JSON.stringify({context:d.v12Context(g,u)}));`);
  assert.ok(result.context, 'enabled V12 must exercise its own context');
  assert.doesNotMatch(JSON.stringify(result.context),/SYNTHETIC_RAW_MESSAGE_V12|synthetic-security|synthetic-user/);
});

test('V12 oversized suffix cannot authorize OPS outside the dialogue input bound', () => {
  const result = isolated(setup + offer + `const response=send(' '.repeat(0)+'x'.repeat(1300)+' đồng ý chuyển OPS');console.log(JSON.stringify({response,pending:pending()}));`);
  assert.equal(result.pending,null);
  assert.doesNotMatch(result.response,/(?:xin|cung cấp).{0,20}(?:tên cửa hàng|địa chỉ)|đã (?:gửi|chuyển).{0,20}OPS/iu);
});
