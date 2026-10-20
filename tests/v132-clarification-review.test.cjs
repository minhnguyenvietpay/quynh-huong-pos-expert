'use strict';
// Independent Director-review probe: a vague first request needs minimum context, not immediate OPS.
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('./helpers/sdk-listener.cjs');
test('V13.2 first vague addressed request asks what needs checking before offering OPS',()=>{
 const r=run({events:[{kind:'direct',group:'G-A',user:'merchant-A',text:'@Quỳnh Hương em xem cái này giúp',mentionBot:true}]});
 assert.equal(r.tickets,0);assert.deepEqual(r.errors,[]);
 const response=r.sent.at(-1)?.msg||'';assert.match(response,/mô tả|tin nhắn|thông báo|kiểm tra.{0,20}(?:gì|phần nào)|vấn đề.{0,20}(?:nào|gì)/iu);
 assert.doesNotMatch(response,/muốn.{0,40}(?:OPS|CS)|chuẩn bị.{0,40}(?:OPS|CS)/iu);
});
