'use strict';
// Read-only conversation simulation. Uses isolated temporary state, never production data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const root=process.cwd();
const reportDir=path.join(root,'qa-reports');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-qa-'));
process.env.POS_CARE_STATE_FILE=path.join(temp,'state.json');
let dialogue;
try{dialogue=require(path.join(root,'dialogue.js'));}catch(e){console.error('Cannot load dialogue.js:',e.message);process.exit(2)}
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
const resolution=/(da (duoc )?xu ly|xu ly xong|tot qua|binh thuong|het loi|in duoc|cam on|duoc roi|on roi)/;
const escalation=/(chuyen cs|chuyen ops|chuyen ho tro|dong y|co muon.*chuyen|yeu cau.*chuyen|ho tro.*nhan vien)/;
const cases=[
 ['printer_resolved',['máy không in bill','in được rồi em'],'resolved'],
 ['printer_normal',['máy không in bill','bình thường rồi'],'resolved'],
 ['printer_ok',['máy không in bill','ok rồi em'],'resolved'],
 ['printer_fixed',['máy không in bill','hết lỗi rồi'],'resolved'],
 ['printer_thanks',['máy không in bill','ok cảm ơn e'],'ack'],
 ['printer_retry',['máy không in bill','anh thử rồi vẫn chưa được'],'progress'],
 ['printer_paper',['máy không in bill','vẫn chưa được','giấy không chạy'],'progress'],
 ['printer_payment',['máy không in bill','đang thanh toán em'],'payment'],
 ['printer_payment_no',['máy không in bill','đang thanh toán em','không em'],'payment'],
 ['printer_reopen',['máy không in bill','in được rồi','máy lại không in bill'],'reopen'],
 ['printer_short_no',['máy không in bill','vẫn chưa được','không em'],'progress'],
 ['printer_offer_decline',['máy không in bill','vẫn chưa được','giấy không chạy','không'],'decline'],
 ['printer_offer_accept',['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý'],'handover'],
 ['printer_offer_resolved',['máy không in bill','vẫn chưa được','giấy không chạy','bình thường rồi'],'resolved'],
 ['printer_offer_ok',['máy không in bill','vẫn chưa được','giấy không chạy','ok rồi em'],'resolved'],
 ['device_freeze',['máy anh bị đơ không bấm được','vẫn chưa được'],'progress'],
 ['device_freeze_payment',['máy anh bị đơ không bấm được','đang thanh toán em'],'payment'],
 ['portal_missing',['không thấy giao dịch trên portal'],'nonempty'],
 ['qr_problem',['khách quét QR nhưng máy không báo thành công'],'nonempty'],
 ['otp_security',['máy lỗi OTP 123456'],'security'],
 ['password_security',['mật khẩu của anh là 123abc'],'security'],
 ['unrelated_hello',['chào em'],'nonempty'],
 ['refund',['khách muốn hoàn tiền giao dịch'],'nonempty'],
 ['no_power',['máy không lên nguồn'],'nonempty'],
 ['printer_resolution_then_thanks',['máy không in bill','in được rồi','cảm ơn em'],'ack'],
];
const rows=[];
for(let i=0;i<cases.length;i++){
 const [id,turns,expected]=cases[i],user='qa-'+i,group='qa-sandbox';let answers=[],error=null;
 for(const msg of turns){try{answers.push(String(dialogue.processMessage(group,user,msg)||''))}catch(e){error=e.message;break}}
 const out=normalize(answers.at(-1)||''),prev=normalize(answers.at(-2)||'');let issues=[];
 if(error)issues.push('runtime_error');
 if(!out.trim())issues.push('empty_response');
 if(expected==='resolved'&&(!resolution.test(out)||escalation.test(out)))issues.push('resolution_not_respected');
 if(expected==='ack'&&escalation.test(out))issues.push('acknowledgement_escalated');
 if(expected==='progress'&&answers.length>1&&out===prev)issues.push('repeated_response');
 if(expected==='payment'&&!(out.includes('giao dich')||out.includes('thanh toan')||out.includes('tru tien')))issues.push('payment_context_lost');
 if(expected==='decline'&&/(cho em xin ten cua hang|dia chi cua hang)/.test(out))issues.push('handover_without_consent');
 if(expected==='handover'&&!/ten cua hang/.test(out))issues.push('handover_not_started');
 if(expected==='security'&&out.includes('123456'))issues.push('sensitive_value_echoed');
 if(expected==='reopen'&&!/(in|giay|hoa don|bill)/.test(out))issues.push('incident_not_reopened');
 rows.push({id,expected,turns,answers,passed:issues.length===0,issues});
}
const summary={generatedAt:new Date().toISOString(),engine:'offline rule-based',cases:rows.length,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed).length,notes:['Heuristic checks only; passing does not guarantee a correct answer.','No Zalo messages sent; no live state modified.','Suggestions are not automatically applied.']};
const suggestions=[...new Set(rows.flatMap(x=>x.issues))].map(issue=>({issue,action:{resolution_not_respected:'Prioritize explicit resolved phrases before fallback and escalation; clear pending handover and session.',acknowledgement_escalated:'Treat thanks and acknowledgements as social turns, not an escalation request.',repeated_response:'Track the last question and response; do not repeat when customer reports failure.',payment_context_lost:'Carry payment risk across turns and do not imply failed/successful settlement.',handover_without_consent:'Require explicit consent before collecting store details.',handover_not_started:'Start consented handover with store name and branch, not MID/TID.',sensitive_value_echoed:'Mask OTP/PIN/CVV and never echo credential values.',incident_not_reopened:'Open a new incident after the previous one is resolved.',empty_response:'Provide a safe fallback response.',runtime_error:'Inspect stack trace and add regression coverage.'}[issue]||'Review dialogue state and add a focused regression test',status:'PROPOSED_ONLY',requiresApproval:true}));
fs.mkdirSync(reportDir,{recursive:true});
fs.writeFileSync(path.join(reportDir,'qa-results.json'),JSON.stringify({summary,rows},null,2));
fs.writeFileSync(path.join(reportDir,'qa-suggestions.json'),JSON.stringify(suggestions,null,2));
const md=['# Quỳnh Hương QA Lab','',`Run: ${summary.generatedAt}`,`**${summary.passed}/${summary.cases} passed; ${summary.failed} failed**`,'','## Failed cases',...rows.filter(x=>!x.passed).map(x=>`- **${x.id}**: ${x.issues.join(', ')}; last reply: ${JSON.stringify(x.answers.at(-1)||'').slice(0,250)}`),'','## Safeguards','- No production state or Zalo access','- Proposed fixes are never auto-applied','- Passing tests do not establish business-policy correctness'];
fs.writeFileSync(path.join(reportDir,'qa-report.md'),md.join('\n')+'\n');
console.log(`QA LAB: ${summary.passed}/${summary.cases} passed, ${summary.failed} failed`);console.log('Reports:',reportDir);if(summary.failed)console.log('Failures:',rows.filter(x=>!x.passed).map(x=>x.id).join(', '));
fs.rmSync(temp,{recursive:true,force:true});
process.exitCode=summary.failed?1:0;
