'use strict';
// Stage 1 independent synthetic red-team contracts. No connector or paid model.
const test=require('node:test'),assert=require('node:assert/strict');
const {createEngine}=require('../lib/v12/engine.cjs');
let counter=0;
function replay(turns){const engine=createEngine(),id='synthetic-v12-redteam-'+(++counter);const outputs=turns.map(t=>engine.reply(id,'synthetic-user',t));return {outputs,last:outputs.at(-1),state:engine.getContext(id,'synthetic-user')};}
for(const input of [
 'máy không in bill, máy không có mùi khét',
 'máy mất WiFi, máy không bốc khói',
 'máy không lên nguồn, máy không ngấm nước',
 'máy không in bill, không có phồng pin',
 'không phải máy vào nước, chỉ mất WiFi',
 'máy không có hiện tượng phồng pin, không lên nguồn',
 'không thấy bốc khói, máy mất mạng',
 'máy chưa ngấm nước, mất nguồn'
])test('V12 redteam negated physical hazard: '+input,()=>{
 const r=replay([input]);assert.notEqual(r.state?.currentQuestion,'battery-safe');assert.doesNotMatch(String(r.last),/^Ngừng sử dụng thiết bị có|^Ngừng sử dụng và ngừng sạc máy đang/iu);
});
for(const input of ['không chuyển OPS nữa','rút lại đồng ý','tôi rút lại sự đồng ý chuyển OPS','hủy yêu cầu chuyển OPS','đừng chuyển thông tin của tôi','chưa cho phép gửi thông tin','không đồng ý chuyển nữa'])test('V12 redteam withdrawal clears consent: '+input,()=>{
 const r=replay(['máy không in bill','đã kiểm tra giấy, vẫn không in','không đẩy giấy','đồng ý chuyển OPS',input]);
 assert.notEqual(r.state?.consent,true);assert.notEqual(r.last?.handover,true);
});
for(const [start,answer,forbidden] of [
 ['máy không lên nguồn','đã kiểm tra mạng rồi nhưng vẫn không lên nguồn','charger-check'],
 ['máy bị đơ','đã kiểm tra giấy rồi, máy vẫn treo','restart-safe'],
 ['máy mất WiFi','đã đổi giấy rồi, vẫn không vào mạng','wifi-check']
])test('V12 redteam unrelated attempt is not failed diagnostic evidence: '+answer,()=>{
 const r=replay([start,answer]);assert.ok(!r.state?.failed?.includes(forbidden),'Cannot mark '+forbidden+' failed from an unrelated reported step');
});
for(const input of ['chưa kiểm tra giấy, vẫn không in được','chưa kiểm tra nắp, vẫn không in được','chưa khởi động lại, máy vẫn treo'])test('V12 redteam unattempted step is not recorded complete: '+input,()=>{
 const r=replay([input]);assert.deepEqual(r.state?.failed||[],[]);assert.doesNotMatch(String(r.last),/Em ghi nhận đã kiểm tra giấy|máy vẫn treo sau bước đã thử/iu);
});
for(const input of ['máy không đang thanh toán, bị treo','máy không còn đang xử lý, bị treo'])test('V12 redteam negated processing is not current payment: '+input,()=>{
 const r=replay([input]);assert.notEqual(r.state?.pendingVerification,true);
});
test('V12 redteam genuine swollen battery remains a stop condition',()=>{
 const r=replay(['pin POS bị phồng','WiFi đã kết nối được']);assert.equal(r.state?.currentQuestion,'battery-safe');assert.match(String(r.last),/ngừng sử dụng|không cắm sạc|không.*khởi động/iu);
});
