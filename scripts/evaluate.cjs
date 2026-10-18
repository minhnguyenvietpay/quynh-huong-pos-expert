'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
function evaluate(){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-regression-'));
 // Set isolation before loading any application module; never import listener.mjs or zca-js.
 for(const [name,file] of Object.entries({POS_CARE_STATE_FILE:'state.json',POS_CARE_EVENTS_FILE:'events.jsonl',POS_CARE_TICKETS_FILE:'tickets.jsonl'}))process.env[name]=path.join(tmp,file);
 process.env.QH_GAP_LOG='0';
 const d=require('../dialogue');const state=require('../state');
 try{return require('../tests/scenarios.cjs').map((c,i)=>{
  state.reset();const group='synthetic-'+i,user='synthetic-user';const replies=[];const issues=[];
  try{for(const turn of c.turns){const reply=d.processMessage(group,user,turn);replies.push(reply);if(typeof reply!=='string'||!reply.trim())issues.push('empty_response');
   if(/(?:gửi|cung cấp|cho.*xin|nhập).{0,40}\b(?:MID|TID)\b/iu.test(reply||''))issues.push('merchant_identifier_requested');
   if(/123456|123abc|4111 1111 1111 1111/.test(reply||''))issues.push('sensitive_value_echoed');
   if(/(?:đã gửi ticket|OPS đã tiếp nhận|tiền chắc chắn|đảm bảo.*hoàn)/iu.test(reply||''))issues.push('unsupported_claim');
  }
  const last=replies.at(-1)||'';if(!c.match.test(last))issues.push('unexpected_response');
  const pending=d.getPendingHandover(group,user),esc=d.hasEscalation(group,user);
  if(c.kind==='handover'&&(!pending||pending.name!=='Cửa hàng Kiểm Thử'||pending.address!=='12 Đường Giả Lập, Chi nhánh Test'))issues.push('handover_data_lost');
  if(c.kind!=='handover'&&pending)issues.push('unexpected_pending_handover');
  if(['cancel','resolved','decline'].includes(c.kind)&&(pending||esc))issues.push('stale_escalation');
  if(c.kind==='resolved'&&d.hasSession(group,user))issues.push('stale_session');
  if(c.kind==='unresolved'&&!d.hasSession(group,user))issues.push('premature_session_close');
  }catch(e){issues.push('runtime_error:'+e.message);}
  return {id:c.id,kind:c.kind,passed:issues.length===0,issues,replies};
 });}finally{state.reset();fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module){const rows=evaluate();const report={total:rows.length,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed).length,rows};console.log(JSON.stringify(report,null,2));process.exitCode=report.failed?1:0;}
module.exports={evaluate};
