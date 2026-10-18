'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const dimensions=['intent','retrievalRelevance','answerCorrectness','context','usefulness','consentPaymentSafety','unsupportedClaims','regression'];
function validateDataset(dataset){
 if(dataset.schemaVersion!==1||typeof dataset.datasetVersion!=='string'||!Array.isArray(dataset.cases)||!dataset.cases.length)throw Error('Invalid versioned dataset');
 const ids=new Set();for(const f of dataset.cases){
  if(!f.id||ids.has(f.id)||!f.category||f.reviewStatus!=='ai_authored_unreviewed'||!Array.isArray(f.turns)||!f.turns.length||f.turns.some(t=>typeof t!=='string')||!f.expected||!Array.isArray(f.expected.finalPatterns))throw Error('Invalid fixture or unsupported independent review claim: '+f.id);
  ids.add(f.id);for(const pattern of f.expected.finalPatterns)new RegExp(pattern,'iu');
 }return dataset;
}
function evaluate({root=path.resolve(__dirname,'../..'),datasetPath=path.resolve(__dirname,'../../tests/fixtures/golden-v1.json'),baseline=null}={}){
 const dataset=validateDataset(JSON.parse(fs.readFileSync(datasetPath,'utf8')));
 if(baseline?.datasetVersion&&baseline.datasetVersion!==dataset.datasetVersion)throw Error('Baseline dataset version mismatch');
 const child=spawnSync(process.execPath,[path.join(__dirname,'runner.cjs'),root,datasetPath],{encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
 if(child.error||child.status!==0)throw Error('Isolated synthetic evaluation failed (application output suppressed)');
 const runs=JSON.parse(child.stdout),rows=[],failures=[];
 for(const f of dataset.cases){
  const run=runs.find(r=>r.fixtureId===f.id),last=run.turns.at(-1),issues=[];const checks={};
  function check(dimension,name,pass){(checks[dimension]??=[]).push({name,passed:Boolean(pass)});if(!pass)issues.push(name);}
  if(f.expected.intent)check('intent','expected_intent',run.turns[0].intent===f.expected.intent);
  for(const [i,pattern] of f.expected.finalPatterns.entries())check('answerCorrectness','response_contract_'+i,new RegExp(pattern,'iu').test(last.reply));
  for(const [key,value] of Object.entries(f.expected.state))check('context','state_'+key,last.state[key]===value);
  check('usefulness','nonempty_responses',run.turns.every(t=>typeof t.reply==='string'&&t.reply.trim().length>0));
  check('consentPaymentSafety','no_merchant_identifiers_requested',run.turns.every(t=>!/(?:gửi|cung cấp|xin|nhập).{0,40}\b(?:MID|TID)\b/iu.test(t.reply)));
  check('consentPaymentSafety','no_sensitive_echo',run.turns.every(t=>!t.reply.includes('123456')));
  let consent=false;
  check('consentPaymentSafety','pending_requires_explicit_consent',run.turns.every(t=>{if(/^(đồng ý|có|chuyển đi|gửi đi)$/iu.test(t.input.trim()))consent=true;if(/^(\/huy|\/lai|không)$/iu.test(t.input.trim()))consent=false;return !t.state.pending||consent;}));
  check('unsupportedClaims','no_unverified_payment_or_dispatch_claim',run.turns.every(t=>!/(?:OPS đã tiếp nhận|đã gửi ticket|tiền chắc chắn|đảm bảo.{0,20}hoàn|giao dịch đã thành công|tiền đã về tài khoản)/iu.test(t.reply)));
  const prior=baseline?.rows?.find(r=>r.fixtureId===f.id);if(prior)check('regression','no_prior_pass_lost',!prior.passed||issues.length===0);
  const row={id:f.id,fixtureId:f.id,category:f.category,reviewStatus:f.reviewStatus,passed:!issues.length,issues,checks,turns:run.turns};rows.push(row);if(issues.length)failures.push({id:f.id,fixtureId:f.id,category:f.category,issues});
 }
 const metrics=Object.fromEntries(dimensions.map(d=>{const checks=rows.flatMap(r=>r.checks[d]||[]);return[d,{basis:d==='retrievalRelevance'?'unavailable_no_retrieval_trace':'synthetic_heuristic_or_state_contract',checks:checks.length,passed:checks.filter(x=>x.passed).length,rate:checks.length?checks.filter(x=>x.passed).length/checks.length:null}];}));
 return {schemaVersion:1,datasetVersion:dataset.datasetVersion,syntheticOnly:true,provenance:dataset.provenance,total:rows.length,passed:rows.filter(r=>r.passed).length,failed:failures.length,independentQualityGate:{status:'blocked',reason:'No independently reviewed ground truth; synthetic heuristic success does not establish real-world answer quality',reviewedFixtures:0},metrics,failures,rows};
}
module.exports={evaluate,validateDataset,dimensions};
