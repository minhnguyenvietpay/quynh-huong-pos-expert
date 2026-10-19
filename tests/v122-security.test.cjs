'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
function run(source){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v122-security-'));
 try{
  const guard=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;const d=require('./dialogue'),e=require('./lib/v12/engine.cjs'),g='synthetic-stage3-security',u='synthetic-user';const send=q=>d.processMessage(g,u,q);`;
  const child=spawnSync(process.execPath,['-e',guard+source],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V12_ENABLED:'true',QH_V11_ENABLED:'true',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
  assert.equal(child.status,0,'synthetic dialogue safety control must complete despite optional module failure');
  return JSON.parse(child.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
const ready=`for(const q of ['máy POS vẫn treo đã khởi động rồi','đồng ý chuyển OPS','Cửa hàng Giả Lập','12 đường Giả Lập'])send(q);const prepared=!!d.getPendingHandover(g,u);`;

test('V12.2 explicit refusal survives optional reply exception and revokes pending handover',()=>{
 const value=run(ready+`e.reply=()=>{throw Error('SYNTHETIC_PRIVATE_REFUSAL_FAULT')};const response=send('không đồng ý chuyển OPS');console.log(JSON.stringify({prepared,response,pending:d.getPendingHandover(g,u)}));`);
 assert.equal(value.prepared,true,'precondition: a consented synthetic handover exists');
 assert.equal(typeof value.response,'string');
 assert.match(value.response,/chưa chuyển|không chuyển|tôn trọng|dừng|thu hồi/iu);
 assert.doesNotMatch(value.response,/SYNTHETIC_PRIVATE_REFUSAL_FAULT|stack|engine\.cjs/);
 assert.equal(value.pending,null);
});

test('V12.2 explicit refusal cannot return a contradictory module handover object',()=>{
 const value=run(ready+`e.reply=()=>({handover:true,consented:true,issue:'synthetic inconsistent module output'});const response=send('không đồng ý chuyển OPS');console.log(JSON.stringify({prepared,response,pending:d.getPendingHandover(g,u)}));`);
 assert.equal(value.prepared,true);
 assert.equal(typeof value.response,'string','refusal control must validate optional module output');
 assert.match(value.response,/chưa chuyển|không chuyển|tôn trọng|dừng|thu hồi/iu);
 assert.equal(value.pending,null);
});

test('V12.2 input truncated through a sensitive value is blocked before merchant collection',()=>{
 const value=run(`send('máy POS vẫn treo đã khởi động rồi');send('đồng ý chuyển OPS');const response=send('x'.repeat(1185)+' OTP 654321'+'y'.repeat(1000));console.log(JSON.stringify({response,pending:d.getPendingHandover(g,u),context:d.v12Context(g,u)}));`);
 assert.match(value.response,/không chia sẻ|không cung cấp|thông tin nhạy cảm/iu);
 assert.doesNotMatch(JSON.stringify(value),/654321/);
 assert.equal(value.pending,null);
});

for(const [kind,makeInput,marker] of [
 ['OTP',()=> 'không chuyển OPS nữa, OTP '+['654','321'].join(''),'654'+'321'],
 ['API credential',()=> 'đừng gửi OPS nữa, API key '+['sk','-proj-','B'.repeat(36)].join(''),['sk','-proj-','B'.repeat(36)].join('')]
]){
 test('V12.2 withdrawal revokes pending handover even when input also contains '+kind,()=>{
  const value=run(ready+`const response=send(${JSON.stringify(makeInput())});const pending=d.getPendingHandover(g,u),context=d.v12Context(g,u);console.log(JSON.stringify({prepared,response,hasPending:!!pending,hasContext:!!context,echoed:response.includes(${JSON.stringify(marker)})}));`);
  assert.equal(value.prepared,true,'precondition: consented synthetic handover exists');
  assert.equal(value.hasPending,false,'sensitive warning must not override explicit withdrawal');
  assert.equal(value.hasContext,false,'withdrawal must clear diagnostic consent context');
  assert.equal(value.echoed,false,'sensitive value must never be echoed');
  assert.match(value.response,/không chia sẻ|không cung cấp|thông tin nhạy cảm|thu hồi|dừng|chưa chuyển/iu);
 });
}

test('V12.2 rejected oversized input suspends an existing prepared handover',()=>{
 const value=run(ready+`const response=send('đồng ý chuyển OPS'+' '.repeat(1300)+'không chuyển OPS nữa');console.log(JSON.stringify({prepared,response,pending:!!d.getPendingHandover(g,u),context:!!d.v12Context(g,u)}));`);
 assert.equal(value.prepared,true);
 assert.equal(value.pending,false,'ambiguous rejected input must not dispatch a previously prepared handover');
 assert.equal(value.context,false);
 assert.match(value.response,/quá dài|chưa ghi nhận|chưa.*chuyển/iu);
});
