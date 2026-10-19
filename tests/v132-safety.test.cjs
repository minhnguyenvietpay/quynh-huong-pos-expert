'use strict';
// Independent Safety Auditor, frozen pre-fix synthetic probes. No external accuracy claim.
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function run(turns){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v132-safety-'));
 try{
  const source=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const n of ['http','https']){const m=require('node:'+n);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:tls').connect=deny;global.fetch=deny;const d=require('./dialogue');console.log(JSON.stringify(${JSON.stringify(turns)}.map(q=>({response:d.processMessage('synthetic-v132-safety','synthetic-user',q),pending:d.getPendingHandover('synthetic-v132-safety','synthetic-user'),context:d.v13Context('synthetic-v132-safety','synthetic-user')}))));`;
  const p=spawnSync(process.execPath,['-e',source],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V13_ENABLED:'true',QH_V12_ENABLED:'false',QH_V11_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
  assert.equal(p.status,0,'offline actual dialogue completes');return JSON.parse(p.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
for(const code of ['02','03','06'])test('V13.2 error '+code+' never outranks simultaneous uncertain debit',()=>{
 const row=run(['POS báo lỗi '+code+', khách đã bị trừ tiền nhưng máy báo thất bại'])[0];
 assert.equal(row.pending,null);
 assert.match(row.response,/(?:chưa|không|đừng).{0,40}(?:thu tiền|thanh toán|quẹt).{0,15}lại/iu);
 assert.doesNotMatch(row.response,/(?:giao dịch|thanh toán) đã (?:thành công|thất bại)|tiền đã (?:hoàn|về)|(?:xin|gửi|cung cấp).{0,20}\b(?:MID|TID|OTP|PIN|CVV)\b/iu);
});
test('V13.2 a subsequent code cannot erase unresolved payment risk',()=>{
 const rows=run(['khách bị trừ tiền nhưng POS không có bill','máy báo E03','khởi động lại được không']);
 assert.match(rows.at(-1).response,/(?:chưa|không|đừng).{0,35}(?:khởi động|restart|tắt máy)/iu);
 assert.equal(rows.at(-1).pending,null);
});
test('V13.2 network error during payment prevents restart and duplicate collection',()=>{
 const row=run(['nó ghi network error khi đang thanh toán, chưa biết tiền bị trừ chưa'])[0];
 assert.match(row.response,/(?:chưa|không|đừng).{0,35}(?:khởi động|restart|tắt máy)/iu);
 assert.match(row.response,/(?:chưa|không|đừng).{0,40}(?:thu tiền|thanh toán).{0,15}lại/iu);
 assert.equal(row.pending,null);
});
test('V13.2 unsupported code clarification cannot collect escalation identity without consent',()=>{
 const rows=run(['máy báo lỗi 03','chưa biết model','không đồng ý chuyển OPS']);
 for(const row of rows){assert.equal(row.pending,null);assert.doesNotMatch(row.response,/(?:xin|cung cấp|cho em).{0,20}(?:tên cửa hàng|địa chỉ|\bMID\b|\bTID\b)/iu);}
});
for(const text of ['mã giao dịch 03','TID 03','MID 06','số tiền 03 đồng','ngày 03/06/2026','mã đơn 02','transaction ID 03'])test('V13.2 numeric identifier is not POS error: '+text,()=>{
 assert.equal(require('../intent').extractErrorCode(text),null);
});
