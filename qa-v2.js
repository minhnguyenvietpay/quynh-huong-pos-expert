'use strict';
// Offline QA Lab V2: isolated evaluation, staged candidate patch, regression, no production writes.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=process.cwd(),reportDir=path.join(root,'qa-reports','v2');
const deps=['dialogue.js','v12-brain.js','flows.js','search.js','intent.js','state.js','quality.js','expert.js','conversation.js','pos-diagnostics.js','incident.js','variant-index.js','knowledge.json','variants-50000.jsonl'];
for(const f of deps.filter(x=>!fs.existsSync(path.join(root,x)))){console.error('Missing required file:',f);process.exit(2)}
fs.mkdirSync(reportDir,{recursive:true});
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-qav2-'));
function copyFiles(dir){fs.mkdirSync(dir,{recursive:true});for(const f of deps)fs.copyFileSync(path.join(root,f),path.join(dir,f));}
const scenarios=[
{id:'printer_normal',turns:['máy không in bill','bình thường rồi'],type:'resolved'},
{id:'printer_ok',turns:['máy không in bill','ok rồi em'],type:'resolved'},
{id:'printer_working',turns:['máy không in bill','in được rồi em'],type:'resolved'},
{id:'printer_fixed',turns:['máy không in bill','hết lỗi rồi'],type:'resolved'},
{id:'printer_good',turns:['máy không in bill','ổn rồi'],type:'resolved'},
{id:'printer_normal_after_thanks',turns:['máy không in bill','ok cảm ơn em','bình thường rồi'],type:'resolved'},
{id:'printer_normal_after_offer',turns:['máy không in bill','vẫn chưa được','giấy không chạy','bình thường rồi'],type:'resolved'},
{id:'printer_ok_after_offer',turns:['máy không in bill','vẫn chưa được','giấy không chạy','ok rồi em'],type:'resolved'},
{id:'printer_ack_after_resolution',turns:['máy không in bill','in được rồi','ok em'],type:'ack'},
{id:'printer_retry',turns:['máy không in bill','anh thử rồi vẫn chưa được'],type:'progress'},
{id:'printer_paper',turns:['máy không in bill','vẫn chưa được','giấy không chạy'],type:'progress'},
{id:'printer_payment',turns:['máy không in bill','đang thanh toán em'],type:'payment'},
{id:'printer_payment_no',turns:['máy không in bill','đang thanh toán em','không em'],type:'payment'},
{id:'printer_reopen',turns:['máy không in bill','in được rồi','máy lại không in bill'],type:'reopen'},
{id:'printer_offer_decline',turns:['máy không in bill','vẫn chưa được','giấy không chạy','không'],type:'decline'},
{id:'printer_offer_accept',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý'],type:'handover'},
{id:'printer_consent_then_resolved',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý','bình thường rồi'],type:'resolved'},
{id:'printer_consent_then_ok',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý','ok rồi em'],type:'resolved'},
{id:'printer_consent_then_decline',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý','không cần hỗ trợ nữa'],type:'resolved'},
{id:'printer_consent_then_name',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý','Cửa hàng Hoa Sen'],type:'name'},
{id:'printer_consent_then_address',turns:['máy không in bill','vẫn chưa được','giấy không chạy','đồng ý','Cửa hàng Hoa Sen','12 Trần Phú, Đà Nẵng'],type:'address'},
{id:'device_freeze',turns:['máy anh bị đơ không bấm được','vẫn chưa được'],type:'progress'},
{id:'device_payment',turns:['máy anh bị đơ không bấm được','đang thanh toán em'],type:'payment'},
{id:'qr',turns:['khách quét QR nhưng máy không báo thành công'],type:'nonempty'},
{id:'portal',turns:['không thấy giao dịch trên portal'],type:'nonempty'},
{id:'otp',turns:['máy lỗi OTP 123456'],type:'security'},
{id:'password',turns:['mật khẩu của anh là 123abc'],type:'security'},
{id:'refund',turns:['khách muốn hoàn tiền giao dịch'],type:'nonempty'},
{id:'power',turns:['máy không lên nguồn'],type:'nonempty'},
{id:'printer_then_new',turns:['máy không in bill','in được rồi','máy không lên nguồn'],type:'nonempty'}
];
const runner=`'use strict';const fs=require('node:fs');const d=require('./dialogue.js');const scenarios=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const rows=[];for(let i=0;i<scenarios.length;i++){const s=scenarios[i],answers=[];let error=null;for(const msg of s.turns){try{answers.push(String(d.processMessage('qa-group-'+i,'qa-user-'+i,msg)||''));}catch(e){error=e.stack;break}}rows.push({...s,answers,error});}process.stdout.write(JSON.stringify(rows));`;
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
const res=/(da xu ly|xu ly xong|binh thuong|het loi|in duoc|duoc roi|on roi|tot qua|ghi nhan su co)/;
const esc=/(chuyen cs|chuyen ops|chuyen ho tro|co muon.*chuyen|yeu cau.*chuyen|chuan bi yeu cau|ten cua hang|dia chi cua hang)/;
function assess(rows){return rows.map(r=>{const out=norm(r.answers.at(-1)),prev=norm(r.answers.at(-2)),issues=[];if(r.error)issues.push('runtime_error');if(!out.trim())issues.push('empty_response');if(r.type==='resolved'&&(!res.test(out)||esc.test(out)))issues.push('resolution_not_respected');if(r.type==='ack'&&esc.test(out))issues.push('acknowledgement_escalated');if(r.type==='progress'&&r.answers.length>1&&out===prev)issues.push('repeated_response');if(r.type==='payment'&&!/(giao dich|thanh toan|tru tien)/.test(out))issues.push('payment_context_lost');if(r.type==='decline'&&/ten cua hang|dia chi cua hang/.test(out))issues.push('handover_without_consent');if(r.type==='handover'&&!/ten cua hang/.test(out))issues.push('handover_not_started');if(r.type==='security'&&/123456|123abc/.test(out))issues.push('sensitive_value_echoed');if(r.type==='reopen'&&!/(in|giay|hoa don|bill)/.test(out))issues.push('incident_not_reopened');if(r.type==='name'&&!/dia chi|chi nhanh/.test(out))issues.push('name_not_recorded');if(r.type==='address'&&!/hoa sen/.test(out))issues.push('address_not_recorded');return {...r,issues,passed:issues.length===0}})}
function execute(dir){fs.writeFileSync(path.join(dir,'scenarios.json'),JSON.stringify(scenarios));fs.writeFileSync(path.join(dir,'runner.js'),runner);const p=cp.spawnSync(process.execPath,['runner.js','scenarios.json'],{cwd:dir,encoding:'utf8',timeout:45000,maxBuffer:8e6,env:{...process.env,POS_CARE_STATE_FILE:path.join(dir,'isolated-state.json'),POS_CARE_EVENTS_FILE:path.join(dir,'isolated-events.jsonl'),POS_CARE_METRICS_FILE:path.join(dir,'isolated-metrics.jsonl'),POS_CARE_GAPS_FILE:path.join(dir,'isolated-gaps.jsonl')}});if(p.status!==0)throw Error('Sandbox runner failed: '+(p.stderr||p.stdout).slice(0,1200));return assess(JSON.parse(p.stdout));}
function patch(dir){let brain=fs.readFileSync(path.join(dir,'v12-brain.js'),'utf8');const original=brain;
brain=brain.replace('const resolved=q=>/\\b(in duoc roi','const resolved=q=>/\\b(binh thuong roi|may binh thuong roi|chay binh thuong roi|on roi|ok roi em|ok roi|het loi|khong can ho tro nua|in duoc roi');
if(brain===original)throw Error('Unexpected v12-brain version; refusing patch');
fs.writeFileSync(path.join(dir,'v12-brain.js'),brain);
let dialogue=fs.readFileSync(path.join(dir,'dialogue.js'),'utf8');const marker=' if(escalation.has(k)){const result=escalationReply(k,raw,q);if(result!==undefined)return result;}';
if(!dialogue.includes(marker))throw Error('Unexpected dialogue version; refusing patch');
const block=` // Resolution/closure must preempt pending handover and all diagnostic modules.\n if(!/^\\//.test(raw) && /^(binh thuong roi|may binh thuong roi|chay binh thuong roi|on roi|ok roi em|ok roi|het loi roi|in duoc roi|duoc roi|da xu ly xong|khong can ho tro nua)$/.test(q)){\n   escalation.delete(k);pendingHandover.delete(k);sessions.delete(k);v12.clear(chatId,userId);\n   return 'Dạ tốt rồi anh! Em ghi nhận sự cố đã được xử lý. Nếu cần hỗ trợ thêm, anh cứ nhắn em nhé.';\n }\n`;
dialogue=dialogue.replace(marker,block+marker);fs.writeFileSync(path.join(dir,'dialogue.js'),dialogue);
}
function stats(rows){return {cases:rows.length,passed:rows.filter(x=>x.passed).length,failed:rows.filter(x=>!x.passed).length}}
try{
 const base=path.join(temp,'baseline'),candidate=path.join(temp,'candidate');copyFiles(base);copyFiles(candidate);
 const before=execute(base);patch(candidate);const after=execute(candidate);
 const beforeMap=new Map(before.map(x=>[x.id,x]));const regressions=after.filter(x=>beforeMap.get(x.id)?.passed&&!x.passed);
 const improved=after.filter(x=>!beforeMap.get(x.id)?.passed&&x.passed);
 const patchReady=regressions.length===0&&improved.length>0;
 const stage=path.join(reportDir,'staged-patch');fs.mkdirSync(stage,{recursive:true});
 const manifest={version:'QA Lab V2',generatedAt:new Date().toISOString(),patchReady,requiresApproval:true,baseline:stats(before),candidate:stats(after),improved:improved.map(x=>x.id),regressions:regressions.map(x=>x.id),remaining:after.filter(x=>!x.passed).map(x=>({id:x.id,issues:x.issues})),notes:['Heuristic tests, not proof of business correctness.','No production source or state modified.','Review staged patch before deploying.','Never auto-deploy.']};
 if(patchReady){for(const f of ['dialogue.js','v12-brain.js'])fs.copyFileSync(path.join(candidate,f),path.join(stage,f));for(const f of ['dialogue.js','v12-brain.js'])manifest[f+'_sha256']=crypto.createHash('sha256').update(fs.readFileSync(path.join(root,f))).digest('hex');}
 fs.writeFileSync(path.join(reportDir,'qa-v2-results.json'),JSON.stringify({manifest,before,after},null,2));
 fs.writeFileSync(path.join(reportDir,'qa-v2-report.md'),`# Quỳnh Hương QA Lab V2\n\nBaseline: ${stats(before).passed}/${before.length} passed.\nCandidate: ${stats(after).passed}/${after.length} passed.\nImproved: ${improved.map(x=>x.id).join(', ')||'none'}.\nRegressions: ${regressions.map(x=>x.id).join(', ')||'none'}.\nPatch staged: ${patchReady?'YES, APPROVAL REQUIRED':'NO'}.\n\nThis is offline deterministic simulation, not live Zalo QA.\n`);
 console.log('QA LAB V2 baseline:',JSON.stringify(stats(before)));console.log('QA LAB V2 candidate:',JSON.stringify(stats(after)));console.log('Improved:',improved.map(x=>x.id).join(', ')||'none');console.log('Regressions:',regressions.map(x=>x.id).join(', ')||'none');console.log('Staged patch:',patchReady?'YES - NOT DEPLOYED':'NO');console.log('Report:',reportDir);
}finally{fs.rmSync(temp,{recursive:true,force:true})}
