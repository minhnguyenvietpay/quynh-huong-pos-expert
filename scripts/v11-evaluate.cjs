'use strict';
// Offline synthetic evaluation: no listener, network, customer logs or model API.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const fixture=require('../tests/fixtures/v11-conversations.json');
function evaluate({root=path.resolve(__dirname,'..'),limit=fixture.conversations.length,start=0,onRow}={}){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v11-qa-'));
 for(const [key,file] of Object.entries({POS_CARE_STATE_FILE:'state.json',POS_CARE_EVENTS_FILE:'events.jsonl',POS_CARE_TICKETS_FILE:'tickets.jsonl'}))process.env[key]=path.join(tmp,file);
 process.env.QH_GAP_LOG='0';
 const d=require(path.join(root,'dialogue'));const state=require(path.join(root,'state'));let passed=0,total=0;const rows=[];
 try{for(let i=start;i<start+limit;i++){
  state.reset();const c=fixture.conversations[i%fixture.conversations.length],group=`synthetic-v11-${i}`,user='synthetic-merchant';const replies=[],turns=[],issues=[];
  for(const [index,t]of c.turns.entries()){
   let reply='';try{reply=d.processMessage(group,user,t.input);}catch(e){issues.push(`turn${index}:runtime_error:${e.message}`);}
   const failures=[];if(typeof reply!=='string'||!reply.trim())failures.push('empty_response');reply=String(reply||'');
   for(const pattern of t.must||[])if(!new RegExp(pattern,'iu').test(reply))failures.push(`missing:${pattern}`);
   for(const pattern of t.mustNot||[])if(new RegExp(pattern,'iu').test(reply))failures.push(`forbidden:${pattern}`);
   if(Number.isInteger(t.differentFrom)&&reply===replies[t.differentFrom])failures.push('repeated_failed_step_response');
   if(t.noPending&&(d.getPendingHandover(group,user)||d.hasEscalation(group,user)))failures.push('stale_handover_or_consent');
   if(/(?:xin|cung cấp|gửi|nhập).{0,25}\b(?:MID|TID)\b/iu.test(reply)&&!/(?:không|chẳng|khong).{0,25}(?:MID|TID)/iu.test(reply))failures.push('merchant_identifier_requested');
   if(/OPS đã tiếp nhận|đã gửi ticket|tiền chắc chắn|đảm bảo.*hoàn/iu.test(reply))failures.push('unsupported_status_claim');
   replies.push(reply);issues.push(...failures.map(f=>`turn${index}:${f}`));turns.push({input:t.input,actual:reply,assertions:{must:t.must||[],mustNot:t.mustNot||[],differentFrom:t.differentFrom,noPending:!!t.noPending},failures,state:{session:d.sessionInfo(group,user),pendingHandover:!!d.getPendingHandover(group,user),escalation:d.hasEscalation(group,user)}});
  }
  const row={id:c.id,iteration:i,reviewStatus:c.reviewStatus,independentReview:false,passed:issues.length===0,issues,turns};total++;if(row.passed)passed++;
  if(onRow)onRow(row);else rows.push(row);
  // Release in-memory escalation maps as well as persisted state between synthetic chats.
  d.processMessage(group,user,'/reset');
 }
 return {reviewStatus:'ai_authored_unreviewed',independentAccuracyClaim:false,datasetSize:fixture.conversations.length,total,passed,failed:total-passed,rows};
 }finally{state.reset();fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module){const args=process.argv.slice(2);const val=(key,fallback)=>args.includes(key)?args[args.indexOf(key)+1]:fallback;const limit=Number(val('--limit',fixture.conversations.length)),start=Number(val('--start',0));if(!Number.isSafeInteger(limit)||limit<1||!Number.isSafeInteger(start)||start<0)throw Error('limit/start must be nonnegative safe integers; limit > 0');
 const streaming=args.includes('--jsonl'),summaryOnly=args.includes('--summary-only');const result=evaluate({root:val('--root',path.resolve(__dirname,'..')),limit,start,onRow:summaryOnly?()=>{}:streaming?row=>process.stdout.write(JSON.stringify(row)+'\n'):undefined});
 process.stdout.write(JSON.stringify(result,null,streaming?0:2)+'\n');if(args.includes('--fail-on-regression'))process.exitCode=result.failed?1:0;
}
module.exports={evaluate};
