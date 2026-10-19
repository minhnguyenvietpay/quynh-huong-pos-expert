'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
function validate(dataset){
 if(dataset.schemaVersion!==1||!dataset.datasetVersion||!Array.isArray(dataset.fixtures)||!dataset.fixtures.length)throw Error('Invalid program dataset');
 const ids=new Set();for(const f of dataset.fixtures){if(!f.id||ids.has(f.id)||f.reviewStatus!=='ai_authored_unreviewed'||!f.rootCause||!Array.isArray(f.turns)||!f.turns.length||!Array.isArray(f.must)||!Array.isArray(f.mustNot)||!f.state)throw Error('Invalid fixture '+f.id);ids.add(f.id);for(const p of [...f.must,...f.mustNot])new RegExp(p,'iu');}return dataset;
}
function worker(root,dataset){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-program-synthetic-'));
 try{
 for(const [key,file] of Object.entries({POS_CARE_STATE_FILE:'state.json',POS_CARE_EVENTS_FILE:'events.jsonl',POS_CARE_TICKETS_FILE:'tickets.jsonl'}))process.env[key]=path.join(tmp,file);
 process.env.QH_GAP_LOG='0';const d=require(path.join(root,'dialogue.js'));
 return dataset.fixtures.map((fixture,index)=>{
  const group='synthetic-program-'+index,user='synthetic-merchant';const turns=fixture.turns.map(input=>{
   const actual=d.processMessage(group,user,input);const context=d.expertContext?.(group,user)||d.v12Context?.(group,user)||d.v11Context?.(group,user)||null;
   return {input,actual,context:context?JSON.parse(JSON.stringify(context)):null,session:d.hasSession(group,user),pending:Boolean(d.getPendingHandover(group,user)),escalation:d.hasEscalation(group,user)};
  });return {id:fixture.id,turns};
 });
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
function evaluate({root=path.resolve(__dirname,'..'),datasetPath=path.resolve(__dirname,'../tests/fixtures/v13-round1.json'),engine='default'}={}){
 if(!['default','v11','v12'].includes(engine))throw Error('Engine must be default, v11 or v12');const dataset=validate(JSON.parse(fs.readFileSync(datasetPath,'utf8')));
 const child=cp.spawnSync(process.execPath,[__filename,'--worker',path.resolve(root),path.resolve(datasetPath)],{encoding:'utf8',timeout:60000,maxBuffer:16*1024*1024,env:{...process.env,QH_V11_ENABLED:engine==='v11'?'true':'false',QH_V12_ENABLED:engine==='v12'?'true':'false'}});
 if(child.error||child.status!==0)throw Error('Program evaluation worker failed; runtime output suppressed');const runs=JSON.parse(child.stdout);
 const rows=dataset.fixtures.map(f=>{const run=runs.find(r=>r.id===f.id),last=run.turns.at(-1),issues=[];
  f.must.forEach((p,i)=>{if(!new RegExp(p,'iu').test(last.actual))issues.push('required_response_'+i);});
  f.mustNot.forEach((p,i)=>{if(new RegExp(p,'iu').test(last.actual))issues.push('forbidden_response_'+i);});
  for(const [key,value] of Object.entries({...f.state,...(f.stateByMode?.[engine]||{})})){const actual=key.split('.').reduce((o,k)=>o?.[k],last);if(JSON.stringify(actual)!==JSON.stringify(value))issues.push('state_'+key);}
  for(const [turnIndex,contract] of (f.checkpoints||[]).map(c=>[c.turn-1,c])){const observed=run.turns[turnIndex];if(!observed)throw Error('Invalid checkpoint '+f.id);for(const [i,p] of (contract.must||[]).entries())if(!new RegExp(p,'iu').test(observed.actual))issues.push('turn_'+(turnIndex+1)+'_required_'+i);for(const [i,p] of (contract.mustNot||[]).entries())if(new RegExp(p,'iu').test(observed.actual))issues.push('turn_'+(turnIndex+1)+'_forbidden_'+i);for(const [key,value] of Object.entries(contract.state||{})){const actual=key.split('.').reduce((o,k)=>o?.[k],observed);if(JSON.stringify(actual)!==JSON.stringify(value))issues.push('turn_'+(turnIndex+1)+'_state_'+key);}}
  for(const turn of run.turns){if(typeof turn.actual!=='string'||!turn.actual.trim())issues.push('empty_response');if(/(?:gửi|cung cấp|xin|nhập).{0,35}\b(?:MID|TID)\b/iu.test(turn.actual))issues.push('merchant_ids_requested');if(/OPS đã tiếp nhận|đã gửi ticket|đảm bảo.{0,20}hoàn tiền/iu.test(turn.actual))issues.push('unsupported_claim');}
  return {id:f.id,fixtureId:f.id,category:f.category,rootCause:f.rootCause,reviewStatus:f.reviewStatus,passed:!issues.length,issues,turns:run.turns};
 });
 const causes={};for(const row of rows){const c=causes[row.rootCause]??={total:0,passed:0,failed:0};c.total++;c[row.passed?'passed':'failed']++;}
 return {schemaVersion:1,datasetVersion:dataset.datasetVersion,engine,syntheticOnly:true,mode:engine,contractReview:'separate_development_agents_only',reviewStatus:'ai_authored_unreviewed',independentQualityGate:'blocked_no_independent_review',total:rows.length,passed:rows.filter(r=>r.passed).length,failed:rows.filter(r=>!r.passed).length,rootCauses:causes,failures:rows.filter(r=>!r.passed).map(({id,fixtureId,category,rootCause,issues})=>({id,fixtureId,category,rootCause,issues})),rows};
}
if(require.main===module){
 if(process.argv[2]==='--worker'){const dataset=validate(JSON.parse(fs.readFileSync(process.argv[4],'utf8')));process.stdout.write(JSON.stringify(worker(process.argv[3],dataset)));}
 else{try{const args=process.argv.slice(2);const arg=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};const report=evaluate({root:arg('--root'),datasetPath:arg('--dataset'),engine:arg('--engine')});const json=JSON.stringify(report,null,2)+'\n';if(arg('--output'))fs.writeFileSync(arg('--output'),json);else process.stdout.write(json);process.exitCode=report.failed?1:0;}catch(e){console.error(e.message);process.exitCode=1;}}
}
module.exports={evaluate,validate};
