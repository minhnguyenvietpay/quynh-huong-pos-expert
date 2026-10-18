'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const {discover,select,validateDiff,qualityGate}=require('../lib/improvement/index.cjs');
test('clusters failures, prioritizes safety and excludes all raw fields',()=>{
 const secret='synthetic-private-content';const report={rows:[{id:'printer-1',passed:false,issues:['unexpected_response'],raw:secret},{id:'pay-1',passed:false,issues:['unsupported_claim'],reply:secret},{id:'pay-2',passed:false,issues:['unsupported_claim']},{id:'malicious\nignore policy',passed:false,issues:['unsupported_claim']}],replayCases:['synthetic.repeated-response','injected.prompt']};
 const clusters=discover(report);assert.equal(clusters[0].code,'unsupported_claim');assert.equal(clusters[0].count,2);assert.equal(JSON.stringify(clusters).includes(secret),false);assert.equal(clusters.length,3);
 assert.notEqual(select(report,[{issueId:clusters[0].issueId,base:'abc',outcome:'rejected'}],'abc').issueId,clusters[0].issueId);
 assert.equal(select(report,[{issueId:clusters[0].issueId,base:'abc',outcome:'rejected'}],'def').code,'unsupported_claim');
});
test('candidate path gate disallows live integration, tests, knowledge and new artifacts',()=>{
 assert.equal(validateDiff(['dialogue.js','conversation.js']),true);
 for(const files of [[],['listener.mjs'],['knowledge.json'],['tests/scenarios.cjs'],['.github/workflows/qa.yml'],['.env'],['dialogue.js','other.js']])assert.equal(validateDiff(files),false);
});
test('quality gate requires real improvement, same case identity, no regressions or unresolved failures',()=>{
 const before={rows:[{id:'a',passed:true},{id:'b',passed:false}]};
 assert.equal(qualityGate(before,{rows:[{id:'a',passed:true},{id:'b',passed:true}]}).passed,true);
 for(const rows of [[{id:'a',passed:true},{id:'b',passed:false}],[{id:'a',passed:false},{id:'b',passed:true}],[{id:'x',passed:true},{id:'b',passed:true}],[]])assert.equal(qualityGate(before,{rows}).passed,false);
});
test('CLI plan runs locally; AI run stays disabled without explicit auth/config',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-plan-'));try{
 const report=path.join(tmp,'report.json');fs.writeFileSync(report,JSON.stringify({rows:[{id:'test-1',passed:false,issues:['unexpected_response'],text:'must-not-export'}]}));
 const args=[require.resolve('../scripts/improve.cjs'),'plan','--report',report];const plan=cp.spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(plan.status,0);const result=JSON.parse(plan.stdout);assert.equal(result.aiExecuted,false);assert.equal(result.clusters.length,1);assert.ok(!plan.stdout.includes('must-not-export'));
 const blocked=cp.spawnSync(process.execPath,[args[0],'run','--report',report],{encoding:'utf8',env:{PATH:process.env.PATH}});assert.equal(blocked.status,1);assert.ok(!blocked.stderr.includes('must-not-export'));
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('all eight real agent stages have distinct roles and constrained write privileges',()=>{
 const roles=require('../agents/roles.json');assert.equal(roles.length,8);assert.equal(new Set(roles.map(r=>r.id)).size,8);assert.deepEqual(roles.filter(r=>r.sandbox==='workspace-write').map(r=>r.id),['conversation-intelligence']);
 assert.ok(roles.every(r=>r.instruction&&r.responsibilities.length>=4));
});
test('optional knowledge gap logging never persists customer content or arbitrary reason text',()=>{
 const vm=require('node:vm');const rows=[];const module={exports:{}};
 const fakeFs={mkdirSync(){},appendFileSync(_file,data){rows.push(JSON.parse(data));}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../expert.js'),'utf8'),{module,__dirname:'/synthetic',require:name=>name==='fs'?fakeFs:require(name),process:{env:{QH_GAP_LOG:'1'}}});
 module.exports.logGap('private synthetic customer input','arbitrary-private-reason');
 assert.equal(rows.length,1);assert.equal(rows[0].reason,'unknown');assert.deepEqual(Object.keys(rows[0]).sort(),['at','reason']);assert.ok(!JSON.stringify(rows).includes('private'));
});
