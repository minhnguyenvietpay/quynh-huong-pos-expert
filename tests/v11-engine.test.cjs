'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createEngine}=require('../lib/v11/engine.cjs');
test('repeating a symptom is not fabricated evidence that a merchant attempted a step',()=>{
 const engine=createEngine();engine.reply('synthetic','user','máy không in được bill');
 const repeated=engine.reply('synthetic','user','máy không in được bill');
 assert.doesNotMatch(repeated,/ghi nhận đã kiểm tra|đã thử|đã lật/i);
 assert.deepEqual(engine.getContext('synthetic','user').failed,[]);
 engine.reply('synthetic','user','đã kiểm tra giấy và nắp rồi vẫn chưa được');
 assert.ok(engine.getContext('synthetic','user').failed.includes('paper-orientation'));
});
test('incomplete device problem gets clarification before unnecessary OPS consent',()=>{
 const engine=createEngine();const first=engine.reply('synthetic','user','máy POS báo lỗi');
 assert.match(first,/nguồn|in bill|kết nối/);assert.doesNotMatch(first,/đồng ý|tên cửa hàng/);
 const second=engine.reply('synthetic','user','vẫn chưa được');assert.match(second,/lỗi nguồn|in hóa đơn|kết nối/);assert.doesNotMatch(second,/tên cửa hàng/);
});
test('explicit yes to the hazard support question permits only a draft handover',()=>{
 const engine=createEngine();engine.reply('synthetic','user','pin POS bị phồng');
 const result=engine.reply('synthetic','user','có');assert.equal(result.consented,true);assert.equal(result.handover,true);
 assert.doesNotMatch(result.issue,/đã gửi|đã tag|đã tiếp nhận/);
});
