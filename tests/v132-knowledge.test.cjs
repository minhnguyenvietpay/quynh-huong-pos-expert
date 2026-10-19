'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {audit,verified,codeOf}=require('../scripts/v132-knowledge-audit.cjs');
// Fictional mechanism fixtures, not verified merchant knowledge and never loaded in production.
const fixture=(overrides={})=>({id:'synthetic-code-03',code:'03',category:'code',device:'PAX A920',acquirer:'SyntheticBank',domain:'pos_device',question:'Máy POS báo lỗi 03',answer:'Kiểm tra màn hình chi tiết theo tài liệu thiết bị.',keywords:['lỗi 03'],review_status:'approved',requires_human_review:false,bot_usage:'approved',sources:[{type:'official_document',reference:'https://example.org/synthetic-pos-manual'}],evidence:[{reference:'https://example.org/synthetic-pos-manual',reviewer:'fictional-fixture-reviewer',reviewedAt:new Date().toISOString()}],verificationStatus:'verified',verifiedAt:new Date().toISOString(),confidence:0.95,...overrides});
const retriever=rows=>require('../search').createCodeRetriever(rows);
test('knowledge audit matches unchanged original corpus; real verified-code denominator zero is explicitly vacuous',()=>{
 const a=require('../knowledge.json'),r=audit(a);assert.equal(r.total,5000);assert.equal(r.codeBearingRecords,121);assert.equal(r.publicationUsable,0);assert.equal(r.verifiedUsableCodeRecords,0);assert.equal(r.realVerifiedCodeCoverage.vacuous,true);assert.equal(r.sameCodeScopePossibleConflictGroups,0);
 for(const code of ['02','03','06'])assert.deepEqual(r.requestedCodes[code],{records:1,verifiedUsable:0,missingVerified:true});
 assert.deepEqual(JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/v132/knowledge-audit.json'),'utf8')),r);
});
test('synthetic reviewed code requires exact known device and acquirer, never another scope',()=>{
 const r=retriever([fixture()]);assert.equal(r.search('03',{device:'PAX A920',acquirer:'SyntheticBank'}).status,'matched');
 for(const scope of [{},{device:'PAX A920'},{acquirer:'SyntheticBank'},{device:'PAX A920',acquirer:'OtherBank'},{device:'OtherTerminal',acquirer:'SyntheticBank'}])assert.notEqual(r.search('03',scope).status,'matched');
 assert.notEqual(r.search('06',{device:'PAX A920',acquirer:'SyntheticBank'}).status,'matched');
});
test('synthetic code publication flags without linked fresh evidence never establish usable knowledge',()=>{
 for(const fields of [{verificationStatus:'unverified'},{requires_human_review:true},{review_status:'pending'},{evidence:[]},{verifiedAt:'2020-01-01'},{verifiedAt:'2099-01-01'},{evidence:[{reference:'https://example.org/unrelated',reviewer:'fictional',reviewedAt:new Date().toISOString()}]}])assert.notEqual(retriever([fixture(fields)]).search('03',{device:'PAX A920',acquirer:'SyntheticBank'}).status,'matched');
});
test('conflicting synthetic reviewed code guidance fails closed and unsafe answers cannot publish',()=>{
 const scope={device:'PAX A920',acquirer:'SyntheticBank'};
 assert.notEqual(retriever([fixture(),fixture({id:'synthetic-conflict',answer:'Dừng kiểm tra màn hình và dùng phương án khác.'})]).search('03',scope).status,'matched');
 for(const answer of ['Gửi MID TID để xử lý.','Giao dịch đã thành công.','Tiền chắc chắn về trong 2 ngày.','Em đã chuyển OPS.','Cung cấp OTP.'])assert.notEqual(retriever([fixture({answer})]).search('03',scope).status,'matched');
});
function runDialogue(rows,turns,{actualScope=false,scope={device:'PAX A920',acquirer:'SyntheticBank'}}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v132-knowledge-'));
 try{const root=path.resolve(__dirname,'..');const script=`const d=require('./dialogue');const r=require('./search').createCodeRetriever(${JSON.stringify(rows)});const actual=${JSON.stringify(turns)}.map(x=>d.processMessage('synthetic-knowledge-group','synthetic-knowledge-user',x,{codeRetriever:(code,actualScope)=>r.search(code,${actualScope?'actualScope':JSON.stringify(scope)})}));process.stdout.write(JSON.stringify({actual,context:typeof d.getErrorCodeContext==='function'?d.getErrorCodeContext('synthetic-knowledge-group','synthetic-knowledge-user'):null}));`;
 const run=cp.spawnSync(process.execPath,['-e',script],{cwd:root,encoding:'utf8',env:{...process.env,QH_V13_ENABLED:'true',QH_V12_ENABLED:'false',QH_V11_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(tmp,'state.json'),POS_CARE_EVENTS_FILE:path.join(tmp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(tmp,'tickets.jsonl')}});assert.equal(run.status,0,run.stderr);return JSON.parse(run.stdout);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
test('actual dialogue router uses selected synthetic reviewed answer for realistic explicit-code phrasings',()=>{
 for(const text of ['máy báo lỗi 03','máy bị lỗi 03','E03','error 03','POS báo 03']){
  const r=runDialogue([fixture()],[text]);assert.match(r.actual[0],/Kiểm tra màn hình chi tiết theo tài liệu thiết bị/u);assert.equal(r.context?.selectedRecordId,'synthetic-code-03');
 }
});
test('actual dialogue keeps uncertain payment ahead of synthetic code advice',()=>{
 const r=runDialogue([fixture({answer:'Kiểm tra màn hình chi tiết theo tài liệu thiết bị.'})],['Khách đã bị trừ tiền, POS báo lỗi 03']);
 assert.match(r.actual[0],/chưa|xác minh|kiểm tra|đối chiếu/iu);assert.match(r.actual[0],/(?:chưa|không).{0,15}khởi động lại/iu);assert.doesNotMatch(r.actual[0],/(?:hãy|vui lòng|anh\/chị)\s+(?:thử\s+)?khởi động lại|thanh toán lại ngay|đã thành công|tiền sẽ về|gửi.{0,12}(?:MID|TID)/iu);
});
const realRows=require('../knowledge.json').filter(r=>r.category==='code'&&verified(r));
test('each real verified code traverses actual dialogue (zero rows is not accuracy evidence)',t=>{
 t.diagnostic(`real verified code records=${realRows.length}; ${realRows.length?'mechanism coverage only':'VACUOUS: no verified production code knowledge'}`);
 for(const row of realRows){const code=row.code||codeOf(row);assert.ok(code);for(const text of [`máy báo lỗi ${code}`,`error ${code}`,`POS báo ${code}`]){const r=runDialogue([row],[text],{scope:{device:row.device,acquirer:row.acquirer}});assert.equal(r.context?.selectedRecordId,row.id);}}
});

// Independent post-implementation probe: parser and retrieval scope must agree, not a preset injection scope.
test('actual dialogue passes real parsed model/acquirer to code retrieval across followups',()=>{
 const r=runDialogue([fixture()],['Máy báo lỗi 03','Máy PAX A920','Ngân hàng SyntheticBank'],{actualScope:true});
 assert.match(r.actual[0],/03/u);assert.match(r.actual[1],/ngân hàng|đơn vị/iu);assert.match(r.actual[2],/Kiểm tra màn hình chi tiết theo tài liệu thiết bị/u);assert.equal(r.context?.selectedRecordId,'synthetic-code-03');
});
