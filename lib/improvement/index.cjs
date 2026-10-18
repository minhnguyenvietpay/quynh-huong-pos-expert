'use strict';
const crypto=require('node:crypto');
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const safeId=x=>typeof x==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(x);
const knownIssues=new Set(['empty_response','unexpected_response','unsupported_claim','sensitive_value_echoed','merchant_identifier_requested','stale_escalation','premature_session_close','handover_without_consent','runtime_error','repetition','unsafeEscalation','unanswered','failed']);
function discover(report){
 if(!report||typeof report!=='object')throw Error('Invalid report');
 const rows=Array.isArray(report.failures)?report.failures:Array.isArray(report.rows)?report.rows.filter(r=>r.passed===false):[];
 const failures=[];
 for(const row of rows){if(!row||!safeId(row.fixtureId||row.id))continue;for(const issue of row.issues||[]){let code=String(issue).split(':')[0];if(/^response_contract_\d+$/.test(code)||['nonempty_responses','no_prior_pass_lost'].includes(code))code='unexpected_response';else if(/^state_(?:session|escalation|pending)$/.test(code))code='stale_escalation';else if(['no_merchant_identifiers_requested','no_sensitive_echo','pending_requires_explicit_consent','no_unverified_payment_or_dispatch_claim'].includes(code))code=({no_merchant_identifiers_requested:'merchant_identifier_requested',no_sensitive_echo:'sensitive_value_echoed',pending_requires_explicit_consent:'handover_without_consent',no_unverified_payment_or_dispatch_claim:'unsupported_claim'})[code];if(knownIssues.has(code))failures.push({fixtureId:row.fixtureId||row.id,code});}}
 const replay={ 'synthetic.processor-error':'failed','synthetic.empty-response':'unanswered','synthetic.repeated-response':'repetition','synthetic.escalation-without-consent':'unsafeEscalation' };
 for(const key of report.replayCases||[])if(Object.hasOwn(replay,key))failures.push({fixtureId:key,code:replay[key]});
 const groups=new Map();
 for(const f of failures){if(!groups.has(f.code))groups.set(f.code,new Set());groups.get(f.code).add(f.fixtureId);}
 return [...groups].map(([code,ids])=>({issueId:'qh-'+digest(code+':'+[...ids].sort().join(',')).slice(0,16),code,fixtureIds:[...ids].sort(),count:ids.size,priority:/sensitive|identifier|consent|unsafe|unsupported/.test(code)?100:code==='runtime_error'||code==='failed'?80:50,rootCause:({unexpected_response:'routing-or-response-expectation',stale_escalation:'state-cleanup',premature_session_close:'resolution-routing',repetition:'progress-tracking',unsafeEscalation:'consent-boundary'})[code]||'requires-investigation'})).sort((a,b)=>b.priority-a.priority||b.count-a.count||a.issueId.localeCompare(b.issueId));
}
function select(report,history,base){return discover(report).find(issue=>!history.some(h=>h.issueId===issue.issueId&&h.base===base&&['rejected','pr-created','candidate-verified','running','agent-failed'].includes(h.outcome)))||null;}
const allowed=new Set(['dialogue.js','conversation.js','intent.js','v12-brain.js','pos-diagnostics.js','expert.js','search.js','qh-v43-language.js']);
function validateDiff(files){return files.length>0&&files.every(f=>allowed.has(f));}
function qualityGate(before,after){
 if(!before||!after||!Array.isArray(before.rows)||!Array.isArray(after.rows)||before.rows.length===0||before.rows.length!==after.rows.length)return {passed:false,reason:'incomparable-reports'};
 const prior=new Map(before.rows.map(r=>[r.id,r]));
 if(prior.size!==before.rows.length||new Set(after.rows.map(r=>r.id)).size!==after.rows.length||after.rows.some(r=>!prior.has(r.id)))return {passed:false,reason:'changed-case-identities'};
 const improved=after.rows.filter(r=>r.passed===true&&prior.get(r.id).passed===false).map(r=>r.id),regressions=after.rows.filter(r=>r.passed!==true&&prior.get(r.id).passed===true).map(r=>r.id);
 return {passed:improved.length>0&&regressions.length===0&&after.rows.every(r=>r.passed===true),improved,regressions,reason:'synthetic-regression-gate-only'};
}
module.exports={discover,select,validateDiff,qualityGate};
