'use strict';
// Frozen Round 1 safety expectations. Synthetic, offline, actual dialogue runtime.
const test=require('node:test');
const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function run(turns){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v13-safety-'));
 try{
  const source=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const n of ['http','https']){const m=require('node:'+n);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:tls').connect=deny;global.fetch=deny;const d=require('./dialogue');const rows=${JSON.stringify(turns)}.map(q=>({response:d.processMessage('synthetic-v13-safety','synthetic-user',q),pending:d.getPendingHandover('synthetic-v13-safety','synthetic-user'),context:d.v12Context('synthetic-v13-safety','synthetic-user')}));console.log(JSON.stringify(rows));`;
  const p=spawnSync(process.execPath,['-e',source],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V12_ENABLED:'true',QH_V11_ENABLED:'true',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
  assert.equal(p.status,0,'isolated runtime completes without network');return JSON.parse(p.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
const offer='máy POS vẫn treo đã khởi động rồi',consent='đồng ý chuyển OPS';
for(const social of ['xin chào','em là ai','cảm ơn']){
 test('V13 social at merchant-name stage never becomes merchant identity: '+social,()=>{
  const rows=run([offer,consent,social,'Cửa hàng Tổng Hợp','12 đường Giả Lập']);
  assert.equal(rows[2].pending,null);
  assert.match(rows[3].response,/địa chỉ|chi nhánh/iu);
  assert.equal(rows[4].pending?.name,'Cửa hàng Tổng Hợp');
  assert.equal(rows[4].pending?.address,'12 đường Giả Lập');
 });
 test('V13 social at address stage never dispatches handover: '+social,()=>{
  const rows=run([offer,consent,'Cửa hàng Tổng Hợp',social,'12 đường Giả Lập']);
  assert.equal(rows[3].pending,null);
  assert.equal(rows[4].pending?.name,'Cửa hàng Tổng Hợp');
  assert.equal(rows[4].pending?.address,'12 đường Giả Lập');
 });
}
test('V13 thank-you does not resolve or advance uncertain payment',()=>{
 const rows=run(['khách bị trừ tiền nhưng POS không có bill','cảm ơn']);
 assert.equal(rows[1].context?.pendingVerification,true);
 assert.equal(rows[1].context?.currentQuestion,rows[0].context?.currentQuestion);
 assert.equal(rows[1].pending,null);
 assert.doesNotMatch(rows[1].response,/giao dịch đã (?:thành công|thất bại)|đã (?:hoàn|chuyển) tiền/iu);
});
test('V13 greeting at consent stage does not authorize merchant collection',()=>{
 const rows=run([offer,'xin chào']);
 assert.equal(rows[1].context?.consent,false);assert.equal(rows[1].pending,null);
 assert.doesNotMatch(rows[1].response,/(?:xin|cung cấp).{0,20}(?:tên cửa hàng|địa chỉ)/iu);
});
test('V13 social refusal takes priority over greeting',()=>{
 const rows=run([offer,consent,'xin chào, không đồng ý chuyển OPS']);
 assert.equal(rows[2].pending,null);assert.notEqual(rows[2].context?.consent,true);
 assert.doesNotMatch(rows[2].response,/(?:xin|cung cấp).{0,20}(?:tên cửa hàng|địa chỉ)/iu);
});

// Round 2 additions frozen before implementation; prior nine assertions unchanged.
test('V13 compound hot-swollen battery is an immediate stop condition',()=>{
 const row=run(['pin máy POS nóng phồng'])[0];
 assert.match(row.response,/(?:ngừng|dừng|không).{0,25}(?:sạc|sử dụng|dùng)/iu);
 assert.equal(row.context?.currentQuestion,'battery-safe');
 assert.equal(row.pending,null);
});
test('V13 refusing OPS does not erase water-damage stop guidance',()=>{
 const rows=run(['máy POS ngấm nước','không đồng ý chuyển OPS','cắm sạc được không']);
 assert.match(rows[2].response,/(?:không|ngừng|dừng).{0,25}(?:sạc|sử dụng|dùng|bật)/iu);
 assert.doesNotMatch(rows[2].response,/lịch sử giao dịch|đúng ngày|số tiền/iu);
 assert.notEqual(rows[2].context?.consent,true);assert.equal(rows[2].pending,null);
});
test('V13 unresolved debit explicitly blocks restart advice',()=>{
 const rows=run(['khách bị trừ tiền nhưng POS không có bill','máy bị treo','khởi động lại được không']);
 assert.match(rows[2].response,/(?:chưa|không|đừng).{0,35}(?:khởi động|restart|tắt máy)/iu);
 assert.equal(rows[2].context?.pendingVerification,true);assert.equal(rows[2].pending,null);
});

// Round 3 direct-engine API precedence: actual dialogue already guards withdrawal.
test('V13 direct engine withdrawal outranks a simultaneous restart question',()=>{
 const e=require('../lib/v12/engine.cjs').createEngine();
 e.reply('synthetic-withdraw','synthetic-user','khách bị trừ tiền nhưng POS không có bill');
 const response=e.reply('synthetic-withdraw','synthetic-user','rút lại đồng ý, chưa khởi động lại');
 assert.match(response,/thu hồi|rút lại|dừng.{0,20}đồng ý/iu);
 assert.equal(e.getContext('synthetic-withdraw','synthetic-user'),null);
});

// Round 5: three independently reproduced critical regressions, frozen pre-fix.
test('V13 quoted human-support authorization is not consent',()=>{
 const rows=run(['Máy treo','Nếu tôi nói "tôi đồng ý chuyển yêu cầu" cho OPS thì em có gửi không?']);
 assert.equal(rows[1].pending,null);
 assert.doesNotMatch(rows[1].response,/(?:xin|cung cấp|cho).{0,20}tên cửa hàng/iu);
 assert.notEqual(rows[1].context?.consent,true);
});
test('V13 restoring hardware frame retains older unresolved financial risk',()=>{
 const rows=run(['khách bị trừ tiền nhưng POS không có bill','chưa rõ','Khoan, giờ máy in bị kẹt giấy, hướng dẫn cái này trước','đổi vấn đề, máy mất mạng wifi','vào mạng được rồi']);
 assert.equal(rows[4].context?.topic,'printer');
 assert.equal(rows[4].context?.pendingVerification,true);
 assert.match(rows[4].response,/giao dịch.{0,35}(?:chưa|cần).{0,20}xác minh|chưa.{0,15}thu tiền lại/iu);
 assert.equal(rows[4].pending,null);
});
test('V13 oversized message cannot erase prior unresolved payment warning',()=>{
 const rows=run(['khách bị trừ tiền nhưng POS không có bill','x'.repeat(1201)]);
 assert.equal(rows[1].context?.pendingVerification,true);
 assert.notEqual(rows[1].context?.consent,true);
 assert.equal(rows[1].pending,null);
 assert.match(rows[1].response,/chưa.{0,25}(?:thanh toán|thu tiền).{0,12}lại|giao dịch.{0,35}chưa.{0,15}xác minh/iu);
});

// Final Round 5 follow-up consistency: stop guidance must persist past priority guards.
for(const [label,turns]of [
 ['hypothetical consent',['Máy POS không lên nguồn','Nếu tôi nói đồng ý chuyển OPS thì sao? Hiện giờ pin máy đang phồng và có mùi khét thật, không phải ví dụ.','cắm sạc được không']],
 ['secret offer',['Máy đang sạc thì pin phồng, có mùi khét; có cần tôi gửi OTP hoặc PIN cho em kiểm tra không?','cắm sạc được không']]
])test('V13 physical stop persists after competing '+label,()=>{
 const rows=run(turns),last=rows.at(-1);
 assert.match(last.response,/(?:ngừng|dừng|không).{0,25}(?:sạc|sử dụng|dùng|bật)/iu);
 assert.equal(last.context?.currentQuestion,'battery-safe');
 assert.equal(last.context?.risk,'high');
 assert.notEqual(last.context?.consent,true);assert.equal(last.pending,null);
});
