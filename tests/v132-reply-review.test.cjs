'use strict';
// Post-implementation independent manual review found these gaps despite14 frozen cases passing.
// These are additional regression contracts, not preimplementation blind evaluation evidence.
const test=require('node:test'),assert=require('node:assert/strict');
const {run}=require('./helpers/sdk-listener.cjs');
const data=require('../docs/v132/cycle2-scenarios.json');
test('V13.2 reply review retains known payment-screen uncertainty instead of asking if payment is active',()=>{
 const r=run({events:data.scenarios.find(s=>s.id==='c2-see-message').events});
 assert.match(r.inputs.at(-1).text,/thanh toán|giao dịch/iu);
 assert.match(r.inputs.at(-1).text,/chưa xác minh|chưa rõ|chưa biết/iu);
 assert.doesNotMatch(r.sent.at(-1).msg,/màn hình chính hay đang thanh toán/iu);
});
test('V13.2 reply review preserves blank receipt on exact case switch',()=>{
 const r=run({events:data.scenarios.find(s=>s.id==='c2-case-switch').events});
 assert.match(r.inputs.at(-1).text,/giấy trắng|bill.{0,15}trắng/iu);
 assert.match(r.sent.at(-1).msg,/mặt (?:giấy|in)|chiều|giấy nhiệt/iu);
 assert.doesNotMatch(r.sent.at(-1).msg,/giấy không chạy ra hay chạy ra nhưng trắng/iu);
});
