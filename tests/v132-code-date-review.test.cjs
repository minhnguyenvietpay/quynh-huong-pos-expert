'use strict';
// Director counterexample, independently reproduced and asserted before the boundary fix.
const test=require('node:test'),assert=require('node:assert/strict');
const {extractErrorCode,extractErrorCodes}=require('../intent');
test('V13.2 date boundary does not interpret displayed dates as error codes',()=>{
 for(const input of ['POS báo 03/06/2026','POS báo 03-06-2026','POS báo 03.06.2026','màn hình hiện ngày 03/06/2026']){
  assert.equal(extractErrorCode(input),null,input);assert.deepEqual(extractErrorCodes(input),[],input);
 }
});
test('V13.2 date boundary preserves a separate explicit error code adjacent to a date',()=>{
 for(const input of ['POS báo mã lỗi 03 ngày 06/10/2026','Máy hiện E02 vào ngày 03-06-2026']){
  const expected=input.includes('E02')?'02':'03';assert.equal(extractErrorCode(input),expected,input);assert.deepEqual(extractErrorCodes(input),[expected],input);
 }
});
