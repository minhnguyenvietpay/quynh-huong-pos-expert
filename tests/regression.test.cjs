'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const evaluated=spawnSync(process.execPath,[require.resolve('../scripts/evaluate.cjs')],{encoding:'utf8'});
if(evaluated.error)throw evaluated.error;
const report=JSON.parse(evaluated.stdout);
assert.equal(evaluated.status,report.failed?1:0,'Evaluator exit status must reflect failures');
assert.equal(report.rows.length,require('./scenarios.cjs').length);
for(const row of report.rows)test(row.id,()=>assert.deepEqual(row.issues,[],row.id+': '+row.issues.join(', ')));
const {usableKnowledge}=require('../knowledge-policy');
test('knowledge requires explicit approval and completed human review',()=>{
 const good={review_status:'verified',requires_human_review:false,bot_usage:'approved',answer:'Kiểm tra giấy.'};
 assert.equal(usableKnowledge(good),true);
 for(const status of ['draft','draft_needs_ops_validation','requires_bank_mapping_validation','reference_requires_ops_validation',undefined])assert.equal(usableKnowledge({...good,review_status:status}),false);
 assert.equal(usableKnowledge({...good,requires_human_review:true}),false);
 assert.equal(usableKnowledge({...good,requires_human_review:undefined}),false);
 assert.equal(usableKnowledge({...good,answer:'Vui lòng gửi MID/TID'}),false);
});
test('every legacy flow completion avoids requesting merchant IDs',()=>{
 for(const flow of require('../flows').flows){
  // Exercise all combinations of numeric choices, including conditional branches.
  const visit=(i,a)=>{if(i===flow.steps.length){assert.doesNotMatch(flow.finish(a),/(?:gửi|cung cấp|kèm|xin).{0,40}\b(?:MID|TID)\b/iu,flow.id);return;}
   const step=flow.steps[i];if(step.when&&!step.when(a))return visit(i+1,a);
   step.options.forEach((_,n)=>visit(i+1,{...a,[step.id]:n}));};visit(0,{});
 }
});
test('conversation state is isolated by merchant and group',()=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qh-isolation-'));
 process.env.POS_CARE_STATE_FILE=path.join(dir,'state.json');
 process.env.POS_CARE_EVENTS_FILE=path.join(dir,'events.jsonl');
 const d=require('../dialogue');
 try{
 d.processMessage('isolation-a','merchant-a','lỗi 999');
 assert.equal(d.hasEscalation('isolation-a','merchant-a'),true);
 assert.equal(d.hasEscalation('isolation-b','merchant-a'),false);
 assert.equal(d.hasEscalation('isolation-a','merchant-b'),false);
 d.processMessage('isolation-a','merchant-a','/huy');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
