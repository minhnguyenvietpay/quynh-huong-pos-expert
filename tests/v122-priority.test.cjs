'use strict';
// Definition questions must never preempt a reported live safety incident.
const test=require('node:test'),assert=require('node:assert/strict');
const {createEngine}=require('../lib/v12/engine.cjs');
for(const [id,input] of [
 ['swollen','refund là gì nhưng máy pin phồng'],
 ['smoke-payment','void là gì, máy đang bốc khói và khách vừa bị trừ tiền']
])test('V12.2 physical hazard takes priority over definition: '+id,()=>{
 const engine=createEngine();const actual=engine.reply('synthetic-priority-'+id,'synthetic-user',input);
 const state=engine.getContext('synthetic-priority-'+id,'synthetic-user');
 assert.match(String(actual),/ngừng sử dụng|ngừng sạc|không cắm sạc/iu);
 assert.equal(state?.currentQuestion,'battery-safe');assert.equal(state?.risk,'high');
});
test('V12.2 pending payment takes priority over refund definition',()=>{
 const engine=createEngine(),group='synthetic-priority-processing';
 const actual=engine.reply(group,'synthetic-user','refund là gì nhưng POS đang xử lý khách vừa chạm thẻ');
 const state=engine.getContext(group,'synthetic-user');
 assert.equal(state?.pendingVerification,true);
 assert.match(String(actual),/chưa.{0,40}(?:thanh toán lại|thu tiền lại)|không.{0,40}(?:thanh toán lại|thu tiền lại)/iu);
 assert.match(String(actual),/POS|Portal|xác minh/iu);
});
test('V12.2 device recovery does not discard interrupted unverified payment',()=>{
 const engine=createEngine(),group='synthetic-priority-payment-frame';
 engine.reply(group,'synthetic-user','máy không in bill');
 engine.reply(group,'synthetic-user','khách bị trừ tiền POS đang xử lý');
 const actual=engine.reply(group,'synthetic-user','máy bình thường rồi');
 const state=engine.getContext(group,'synthetic-user');
 assert.equal(state?.pendingVerification,true,'Device recovery cannot verify the payment or restore a low-risk printer frame');
 assert.match(String(actual),/giao dịch|POS|Portal|xác minh/iu);
 assert.doesNotMatch(String(actual),/sự cố đã được xử lý/iu);
});
