'use strict';
// Additional independent manual-review findings after the frozen10 adversarial contracts passed.
// Preserve the original10; do not count these as blind preimplementation improvements.
const test=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {evaluate}=require('../scripts/v132-evaluate.cjs');
const report=()=>evaluate({datasetPath:path.resolve(__dirname,'fixtures/v132-cycle3.json'),engine:'v13'});
test('V13.2 manual review directly refuses repeat charge after printer detour and apparent resolution',()=>{
 const row=report().rows.find(r=>r.id==='c3-topic-with-risk'),last=row.turns.at(-1).actual;
 assert.match(last,/(?:không|chưa).{0,50}(?:quẹt|thanh toán|thu tiền).{0,20}lại/iu);
 assert.match(last,/xác minh|POS|Portal|tra soát/iu);
});
test('V13.2 manual review progresses beyond the same failed network action',()=>{
 const row=report().rows.find(r=>r.id==='c3-repeated-failed-network');
 const step=row.turns[2].actual,failed=row.turns[3].actual,refusal=row.turns[4].actual;
 assert.notEqual(failed,step,'A failed hotspot/moving-network attempt cannot receive identical instruction');
 assert.match(failed,/đã thử|đã kiểm tra|kết quả|vẫn lỗi|OPS|bước nào|bước vừa/iu);
 assert.notEqual(refusal,step,'Frustration cannot trigger the original action unchanged');
});
