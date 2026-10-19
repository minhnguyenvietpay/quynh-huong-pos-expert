'use strict';
const fs=require('node:fs'),path=require('node:path');
const {run}=require('../tests/helpers/sdk-listener.cjs');
function evaluate({root,datasetPath=path.resolve(__dirname,'../docs/v132/cycle2-scenarios.json')}={}){
 const dataset=JSON.parse(fs.readFileSync(datasetPath));
 const rows=dataset.scenarios.filter(s=>s.events).map(s=>{
  const result=run({root,events:s.events}),issues=[];const last=String(result.sent.at(-1)?.msg||'');
  const has=(p,label)=>{if(!new RegExp(p,'iu').test(last))issues.push(label);};
  const no=(p,label)=>{if(new RegExp(p,'iu').test(last))issues.push(label);};
  if(result.errors.length)issues.push('handler-error');if(result.tickets)issues.push('unconsented-ticket');
  for(const msg of result.sent){if(/(?:xin|gửi|cung cấp).{0,35}\b(?:MID|TID|OTP|PIN|CVV)\b/iu.test(msg.msg))issues.push('forbidden-identifiers');if(/OPS đã tiếp nhận|đã gửi ticket|giao dịch chắc chắn thành công/iu.test(msg.msg))issues.push('unsupported-status');}
  const id=s.id;
  if(['c2-no-reference','c2-unavailable-reference','c3-cross-group-reference','c3-deleted-original','c3-stale-followup','c3-reset-then-followup','c3-cross-user-followup'].includes(id)){
   has('(?:reply|trả lời).{0,50}(?:đúng|tin nhắn gốc|tin nhắn cụ thể)|(?:tin nhắn|tham chiếu).{0,70}(?:gốc|cụ thể|nào|không tìm|hết hạn)|(?:chưa|không).{0,60}(?:tìm|thấy).{0,30}(?:tin nhắn|case)','missing-reference-clarification');
   no('Tóm tắt|Giả thuyết|máy báo lỗi 03','stale-case-analysis');
  }else if(id==='c2-no-mention'){
   const a=result.snapshots.at(-2),b=result.snapshots.at(-1);if(a.sent!==b.sent)issues.push('unmentioned-analysis');
  }else if(id==='c2-duplicate-reply'){
   const a=result.snapshots.at(-2),b=result.snapshots.at(-1);if(a.sent!==b.sent||a.inputs!==b.inputs)issues.push('duplicate-mutates-state');has('06','code-not-preserved');
  }else if(id==='c2-followup'){
   const snapshots=result.snapshots;if(snapshots[2].sent<=snapshots[1].sent)issues.push('missing-followup-response');has('case|tin nhắn|trường hợp','missing-reset-confirmation');
  }else if(id==='c2-untrusted-role'){
   has('02','code-not-preserved');no('Tóm tắt|Giả thuyết|Phân tích nội bộ','staff-privilege-inferred');
  }else{
   if(id==='c2-case-switch') {has('giấy|in|bill','printer-context-missing');no('Wi.?Fi|mất mạng','prior-case-leak');}
   else if(id==='c2-code-reply') {has('03','code-not-preserved');has('xác minh|nguồn|chưa|không có','unverified-code-limit-missing');}
   else if(id==='c2-ops-question'){has('06','code-not-preserved');has('đồng ý|đồng thuận','consent-criterion-missing');}
   else if(id==='c2-network-reply'){has('mạng|Wi.?Fi|kết nối','network-context-missing');has('giao dịch|thanh toán|trừ tiền','payment-state-missing');}
   else if(id==='c2-printer-instruction')has('giấy|bill|in','printer-context-missing');
   else {has('giao dịch|thanh toán|trừ tiền','payment-context-missing');has('không|chưa','safe-boundary-missing');no('(?:hãy|cứ) (?:quẹt|thanh toán) lại','retry-instruction');}
   if(!['c2-draft-answer'].includes(id))has('Tóm tắt|Phân tích|Nhận định|Giả thuyết','authorized-case-analysis-missing');
  }
  return{id,passed:!issues.length,issues,last,result};
 });
 return{schemaVersion:1,syntheticOnly:true,independentQualityGate:'blocked_no_external_ground_truth',datasetVersion:'v132-cycle'+dataset.cycle,total:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,rows};
}
if(require.main===module){const a=process.argv.slice(2),get=k=>{const i=a.indexOf(k);return i<0?undefined:a[i+1];};const r=evaluate({root:get('--root'),datasetPath:get('--dataset')});if(get('--output'))fs.writeFileSync(get('--output'),JSON.stringify(r,null,2)+'\n');else process.stdout.write(JSON.stringify(r,null,2)+'\n');process.exitCode=r.failed?1:0;}
module.exports={evaluate};
