'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {analyze}=require('../lib/v12/understanding.cjs');
const baseline=require('../lib/v11/understanding.cjs');
const cases=[
 ['negated battery danger','pin không nóng bất thường',{},r=>r.facts.hotBattery===false],
 ['local negation retains another danger','pin không nóng và pin phồng',{},r=>r.facts.hotBattery===true],
 ['historical failure does not erase recovery','hôm qua không in được, giờ in được rồi',{topic:'printer'},r=>r.signals.resolved&&!r.signals.failed],
 ['payment success alone never resolves device incident','giao dịch thành công rồi',{topic:'freeze'},r=>!r.signals.resolved],
 ['quoted danger is not asserted','khách hỏi "pin phồng" nghĩa là gì',{},r=>!r.facts.hotBattery&&r.signals.quotedOrHypothetical],
 ['hypothetical debit is unknown','giả sử khách đã bị trừ tiền thì sao',{},r=>r.facts.debit==='unknown'],
 ['bank transfer permission is not OPS consent','đồng ý chuyển tiền',{},r=>!r.signals.consent],
 ['quoted consent is not permission','"đồng ý chuyển OPS" là câu mẫu',{},r=>!r.signals.consent],
 ['unknown slang freeze has bounded recognition','máy đứng im',{},r=>r.primary==='freeze'],
 ['previous action fact','đã khởi động lại rồi mà vẫn chưa được',{topic:'freeze'},r=>r.facts.previousAttempt&&r.signals.failed],
 ['specified Wi-Fi method','tôi đã thử wifi rồi',{topic:'network'},r=>r.facts.specifiedMethod==='wifi'&&r.facts.previousAttempt],
 ['partial resolution is scoped','in được rồi nhưng mạng vẫn lỗi',{},r=>!r.signals.resolved&&r.facts.scopedResolution],
];
for(const [name,input,context,predicate] of cases)test(`V12 ${name}`,()=>assert.ok(predicate(analyze(input,context)),name));
test('V12 regression fixture measures actual V11 analysis before and V12 after',()=>{
 const before=cases.filter(([,text,ctx,predicate])=>predicate(baseline.analyze(text,ctx))).length;
 const after=cases.filter(([,text,ctx,predicate])=>predicate(analyze(text,ctx))).length;
 assert.ok(before<after);assert.equal(after,cases.length);
});
test('V12 preserves multiintent payment uncertainty without asserting bank outcome',()=>{
 const r=analyze('khách quét QR đã trừ tiền 2 lần nhưng cửa hàng chưa nhận tiền');
 for(const id of ['qr','debit','duplicate','missing'])assert.ok(r.intents.some(x=>x.id===id),id);
 assert.equal(r.facts.debit,'yes');assert.equal(r.signals.resolved,false);
});
test('V12 explicit consent requires OPS target or pending question',()=>{
 assert.equal(analyze('đồng ý chuyển OPS').signals.consent,true);
 assert.equal(analyze('có',{question:'consent'}).signals.consent,true);
 for(const text of ['ok','được rồi','đồng ý','không đồng ý chuyển OPS','nếu đồng ý chuyển OPS'])assert.equal(analyze(text).signals.consent,false,text);
});
test('V12 contextual answers and homographs never manufacture new labels',()=>{
 assert.equal(analyze('ok',{topic:'freeze'}).primary,'freeze');
 for(const text of ['thế là sao','có thể giúp tôi','hôm nay trời đẹp','thành công là gì'])assert.equal(analyze(text).primary,null,text);
 assert.equal(analyze('khách chưa bị trừ tiền').facts.debit,'no');
});

for(const text of ['không có phồng pin','không phải máy vào nước','không có hiện tượng phồng pin','không thấy bốc khói','máy không có mùi khét','máy chưa ngấm nước'])test('V12 denied hazard is not promoted: '+text,()=>{
 const r=analyze(text);assert.equal(r.facts.hotBattery,false);assert.equal(r.facts.unsafeHardware,false);assert.notEqual(r.primary,'power');
});
for(const text of ['không đang thanh toán','không còn đang xử lý'])test('V12 denied current processing: '+text,()=>assert.equal(analyze(text).facts.inFlight,false));
test('V12 scoped negation preserves simultaneous positive hazards and processing',()=>{
 assert.equal(analyze('không thấy bốc khói nhưng pin phồng').facts.hotBattery,true);
 assert.equal(analyze('máy không vào nước nhưng màn hình POS vỡ').facts.unsafeHardware,true);
 assert.equal(analyze('không đang quẹt thẻ nhưng đang xử lý giao dịch').facts.inFlight,true);
});

test('V12 prior restart does not require the word lại',()=>{
 for(const text of ['máy POS vẫn treo đã khởi động rồi','khởi động rồi máy vẫn treo','đã khởi động lại rồi']) assert.equal(analyze(text).facts.previousAttempt,true,text);
 assert.equal(analyze('chưa khởi động máy vẫn treo').facts.previousAttempt,false);
});

test('V12 successful reported checks resolve printing and networking',()=>{
 for(const text of ['đã kiểm tra giấy xong và in được rồi','đã thử mạng khác rồi, POS kết nối được rồi']) {
  const r=analyze(text);assert.equal(r.signals.resolved,true,text);assert.equal(r.signals.failed,false,text);assert.equal(r.facts.previousAttempt,true,text);
 }
});
for(const [operation,id] of [['hủy giao dịch','void'],['hoàn tiền','refund'],['đảo giao dịch','reversal']])test('V12 declined operation does not hijack active printer: '+id,()=>{
 const r=analyze('không '+operation+' nữa, máy không in bill');assert.equal(r.primary,'printer');assert.equal(r.intents.some(x=>x.id===id),false);
 assert.ok(analyze(operation+' không được').intents.some(x=>x.id===id));
 assert.ok(analyze('không '+operation+' được').intents.some(x=>x.id===id));
 assert.ok(analyze('không '+operation+' nữa nhưng khách khác cần '+operation).intents.some(x=>x.id===id));
});

for(const symptom of ['chữ còn mờ','vẫn mất chữ','giấy ra mờ','bị thiếu chữ','hóa đơn không đủ chữ','máy còn lỗi','chữ nhạt','chữ bị nhạt','giấy vẫn kẹt'])test('V12 partial printer recovery retains residual defect: '+symptom,()=>{
 const r=analyze('in được rồi nhưng '+symptom,{topic:'printer'});assert.equal(r.signals.resolved,false);assert.equal(r.signals.failed,true);assert.equal(r.facts.scopedResolution,true);assert.equal(r.facts.residualDefect,true);
});
test('V12 full successful printing is distinct from a denied residual defect',()=>{
 for(const text of ['đã kiểm tra giấy xong và in được rồi','in được rồi, chữ không còn mờ','in được rồi, không còn thiếu chữ'])assert.equal(analyze(text,{topic:'printer'}).signals.resolved,true,text);
});

test('V12 hypothetical hazard does not erase separately reported actual power fault',()=>{
 const r=analyze('nếu pin phồng thì xử lý sao, máy hiện không lên nguồn');assert.equal(r.facts.hotBattery,false);assert.equal(r.primary,'power');assert.equal(r.signals.quotedOrHypothetical,true);
 assert.equal(analyze('pin phồng, máy hiện không lên nguồn').facts.hotBattery,true);
});
test('V12 blank output is partial recovery rather than resolved printing',()=>{
 const r=analyze('in được rồi nhưng vẫn trắng không có chữ',{topic:'printer'});assert.equal(r.signals.resolved,false);assert.equal(r.signals.failed,true);assert.equal(r.facts.scopedResolution,true);
});
test('V12 explicit debit correction and spinning terminal retain payment risk',()=>{
 const r=analyze('khách không bị trừ tiền à không, vừa nhận thông báo trừ tiền rồi, POS vẫn quay');assert.equal(r.facts.debit,'yes');assert.equal(r.facts.inFlight,true);assert.equal(r.signals.resolved,false);
 assert.equal(analyze('khách không bị trừ tiền, khách khác nhận thông báo trừ tiền rồi').facts.debit,'unknown');
 assert.equal(analyze('POS không còn vẫn quay').facts.inFlight,false);
});
test('V12 missing settlement wording outranks generic account mention',()=>{
 assert.equal(analyze('tiền chưa về tài khoản').primary,'settlement');
 assert.equal(analyze('tiền vẫn chưa về tài khoản').primary,'settlement');
});

test('V12 reports forgetting and reconnecting network as a previous attempt',()=>{
 assert.equal(analyze('đã quên mạng kết nối lại rồi vẫn lỗi').facts.previousAttempt,true);
 assert.equal(analyze('chưa quên mạng chưa kết nối lại').facts.previousAttempt,false);
});
test('V12 network recovery cannot close a remaining blank printer issue',()=>{
 const r=analyze('mạng được rồi nhưng in ra giấy trắng');assert.equal(r.signals.resolved,false);assert.equal(r.signals.failed,true);assert.equal(r.primary,'printer');
 assert.equal(analyze('đã thử mạng khác rồi, POS kết nối được rồi').signals.resolved,true);
});
