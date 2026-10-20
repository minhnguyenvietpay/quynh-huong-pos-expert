'use strict';
// Independent QA contract for a Director review counterexample, frozen before its reply fix.
// Additional review probe, not one of the original14 blind scenarios.
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('./helpers/sdk-listener.cjs');
test('V13.2 actual listener preserves both sequential quoted error codes and clarifies current display',()=>{
 const r=run({events:[
  {kind:'received',group:'G-A',user:'merchant-A',message:'M-MULTI',text:'POS báo lỗi 02 rồi lỗi 06, chưa có khách thanh toán.'},
  {kind:'reply',group:'G-A',user:'staff-A',reference:'M-MULTI',mentionBot:true,text:'@Quỳnh Hương kiểm tra case này'}
 ]});
 assert.equal(r.tickets,0);assert.deepEqual(r.errors,[]);
 assert.match(r.inputs.at(-1).text,/02/);assert.match(r.inputs.at(-1).text,/06/);
 const response=r.sent.at(-1).msg;assert.match(response,/02/);assert.match(response,/06/);
 assert.match(response,/đang hiển thị|đang hiện|hiện tại|mã nào/iu);
 assert.doesNotMatch(response,/(?:02|06).{0,12}(?:nghĩa là|có nghĩa là)/iu);
});
