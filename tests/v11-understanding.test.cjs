'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analyze } = require('../lib/v11/understanding.cjs');
test('V11 recognizes Vietnamese payment multiissues without guessing a status', () => {
  const result = analyze('Khách quét QR đã trừ tiền 2 lần nhưng cửa hàng chưa nhận tiền');
  for (const id of ['qr', 'debit', 'duplicate', 'missing']) assert.ok(result.intents.some(x => x.id === id), id);
  assert.equal(result.facts.debit, 'yes');
  assert.ok(['debit', 'duplicate', 'missing'].includes(result.primary));
});
test('V11 negation keeps unsuccessful printing unresolved and understands slang', () => {
  const result = analyze('vẫn chưa in dc, ko ra giấy');
  assert.equal(result.primary, 'printer');
  assert.equal(result.signals.failed, true);
  assert.equal(result.signals.resolved, false);
  assert.equal(result.facts.paperMoves, false);
  assert.equal(analyze('chưa bị trừ tiền').facts.debit, 'no');
  assert.equal(analyze('không trừ tiền').intents.some(x => x.id === 'debit'), false);
});
test('V11 explicit consent remains separate from acknowledgement and resolution', () => {
  for (const input of ['ok', 'cảm ơn', 'được rồi', 'không đồng ý', 'chưa đồng ý']) {
    assert.equal(analyze(input, { question: 'consent' }).signals.consent, false, input);
  }
  assert.equal(analyze('ok', { question: 'consent' }).signals.resolved, false);
  assert.equal(analyze('đồng ý', { question: 'consent' }).signals.consent, true);
  assert.equal(analyze('đồng ý').signals.consent, false);
  assert.equal(analyze('đồng ý chuyển OPS').signals.consent, true);
});
test('V11 context and clarification are bounded rather than manufacturing intent', () => {
  assert.equal(analyze('ok', { topic: 'printer' }).primary, 'printer');
  assert.equal(analyze('hôm nay trời đẹp').primary, null);
  assert.equal(analyze('máy lỗi').ambiguous, true);
  assert.equal(analyze('in được rồi').signals.resolved, true);
  assert.equal(analyze('hết lỗi rồi').signals.resolved, true);
  assert.equal(analyze('chưa hết lỗi').signals.resolved, false);
  assert.equal(analyze('chưa in được rồi').signals.resolved, false);
});
test('V11 detects dangerous battery, blank receipts and in-flight facts', () => {
  assert.equal(analyze('pin phồng và nóng bất thường').facts.hotBattery, true);
  const receipt = analyze('máy vẫn ra giấy nhưng giấy trắng không có chữ');
  assert.equal(receipt.facts.paperMoves, true);
  assert.equal(receipt.facts.receiptBlank, true);
  assert.equal(analyze('đang thanh toán qua wifi').facts.inFlight, true);
  assert.equal(analyze('mất mạng sim 4g').facts.sim, true);
});

test('V11 does not treat peripheral recognition failures as missing merchant funds', () => {
  for (const input of ['chạm thẻ POS không nhận', 'cắm chip không nhận', 'máy POS sạc không vào']) {
    assert.equal(analyze(input).intents.some(x => x.id === 'missing'), false, input);
  }
  assert.equal(analyze('in bill lỗi').primary, 'printer');
  assert.equal(analyze('tiền hoàn chưa vào').intents.some(x => x.id === 'refund'), true);
  assert.equal(analyze('kết nối hotspot').primary, 'network');
});
test('V11 recognizes physical hazards and card operations in flight', () => {
  for (const input of ['màn hình POS vỡ', 'POS rơi vào nước']) {
    const result = analyze(input);
    assert.equal(result.facts.unsafeHardware, true);
    assert.equal(result.primary, 'power');
    assert.ok(result.intents[0].score >= 13);
  }
  assert.equal(analyze('pin bị phồng').facts.hotBattery, true);
  for (const input of ['đang quẹt thẻ', 'đang chạm thẻ', 'đang cắm chip']) assert.equal(analyze(input).facts.inFlight, true, input);
});
test('V11 preserves common listener chat expansions while using original merchant input',()=>{
 assert.equal(analyze('máy inbill bị lỗi').primary,'printer');
 assert.equal(analyze('khách ck r mà ko thấy gd').primary,'missing');
 assert.equal(analyze('ok r e',{topic:'printer'}).text,'ok roi em');
 assert.equal(analyze('bth r e',{topic:'printer'}).text,'binh thuong roi em');
 assert.equal(analyze('bth').primary,null);
});
