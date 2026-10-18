'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const retrieve = require('../lib/v11/retrieval.cjs');
const { createRetriever } = retrieve;
// Fictional review fixtures exercise gates; these are never loaded as production knowledge.
const fixture = overrides => ({ id: 'synthetic-print', domain: 'printer', question: 'Máy in giấy trắng', keywords: ['máy in giấy trắng'], answer: 'Kiểm tra chiều giấy theo hướng dẫn máy.', review_status: 'approved', requires_human_review: false, bot_usage: 'approved', sources: [{type:'official_document',reference:'https://example.org/synthetic-manual'}], evidence: [{reference:'https://example.org/synthetic-manual',reviewer:'synthetic-reviewer',reviewedAt:new Date().toISOString()}], verificationStatus:'verified',verifiedAt:new Date().toISOString(),confidence:0.95,...overrides });
test('V11 original corpus has no verified retrieval and is unchanged', () => {
 const kb = require('../knowledge.json'); const before = JSON.stringify(kb);
 assert.equal(retrieve('máy in giấy trắng').status, 'unknown');
 assert.equal(JSON.stringify(kb), before);
});
test('V11 retrieves Vietnamese synonyms with sanitized provenance', () => {
 const result = createRetriever([fixture()]).search('printer giay trang', {topic:'printer'});
 assert.equal(result.status, 'matched');
 assert.equal(result.item.answer, fixture().answer);
 assert.deepEqual(Object.keys(result.provenance).sort(), ['reference','type']);
 assert.ok(!JSON.stringify(result).includes('synthetic-reviewer'));
});
test('V11 publication flags, confidence and unrelated evidence cannot establish verification', () => {
 for (const overrides of [{verificationStatus:'unverified'}, {evidence:[]}, {requires_human_review:true}, {review_status:'pending'}, {evidence:[{reference:'https://example.org/unrelated', reviewer:'reviewer',reviewedAt:new Date().toISOString()}]}, {verifiedAt:'2099-01-01'}, {verifiedAt:'2020-01-01'}]) {
  assert.equal(createRetriever([fixture(overrides)]).search('máy in giấy trắng').status,'unknown');
 }
});
test('V11 fails closed on weak relevance, topic mismatch, and empty input', () => {
 const r = createRetriever([fixture()]);
 for (const [query,opts] of [['xin chào',{}],['máy in giấy trắng',{topic:'settlement_payout'}],['',{}],['khách muốn hoàn tiền giao dịch hôm qua',{}]]) assert.equal(r.search(query,opts).status,'unknown');
});
test('V11 conflicting reviewed answers are ambiguous rather than first-match wins', () => {
 const r = createRetriever([fixture(),fixture({id:'synthetic-conflict',answer:'Không đổi chiều giấy; cần dùng cách khác.'})]);
 assert.equal(r.search('máy in giấy trắng').status,'ambiguous');
});
test('V11 refuses unsafe approved answers even with review metadata', () => {
 for (const answer of ['Gửi MID TID để em xử lý.', 'Cung cấp OTP.', 'Giao dịch đã thành công.', 'Tiền chắc chắn về trong 2 ngày.', 'Em đã chuyển OPS.']) assert.equal(createRetriever([fixture({answer})]).search('máy in giấy trắng').status,'unknown');
});
