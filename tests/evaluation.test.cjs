'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {evaluate,validateDataset,dimensions}=require('../lib/evaluation/index.cjs');
const fixture=require('./fixtures/golden-v1.json');
test('versioned synthetic dataset rejects duplicate IDs and invented review claims',()=>{
 assert.equal(validateDataset(fixture),fixture);
 assert.throws(()=>validateDataset({...fixture,cases:[fixture.cases[0],fixture.cases[0]]}));
 assert.throws(()=>validateDataset({...fixture,cases:[{...fixture.cases[0],reviewStatus:'verified'}]}));
});
test('actual synthetic conversations expose honest evidence and block independent quality gate',()=>{
 const report=evaluate();assert.equal(report.total,fixture.cases.length);assert.equal(report.failed,0,JSON.stringify(report.failures));
 assert.equal(report.independentQualityGate.status,'blocked');assert.equal(report.independentQualityGate.reviewedFixtures,0);
 assert.deepEqual(Object.keys(report.metrics),dimensions);assert.equal(report.metrics.retrievalRelevance.rate,null);
 assert.ok(report.metrics.context.checks>0);assert.ok(report.rows.some(r=>r.turns.length>=4));
 for(const row of report.rows)for(const turn of row.turns){assert.equal(typeof turn.reply,'string');assert.equal(typeof turn.state.pending,'boolean');}
});
test('failed answer contract produces actionable machine failure and regression evidence',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qh-eval-contract-'));
 try{const dataset={...fixture,cases:[{...fixture.cases[0],expected:{...fixture.cases[0].expected,finalPatterns:['IMPOSSIBLE_SYNTHETIC_EXPECTATION']}}]};const filename=path.join(dir,'dataset.json');fs.writeFileSync(filename,JSON.stringify(dataset));
 const report=evaluate({datasetPath:filename,baseline:{rows:[{fixtureId:dataset.cases[0].id,passed:true}]}});
 assert.equal(report.failed,1);assert.deepEqual(report.failures[0],{id:dataset.cases[0].id,fixtureId:dataset.cases[0].id,category:dataset.cases[0].category,issues:['response_contract_0','no_prior_pass_lost']});
 assert.equal(report.metrics.regression.rate,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('CLI cannot report independent quality success without review',()=>{
 const child=spawnSync(process.execPath,[path.resolve(__dirname,'../scripts/quality-report.cjs'),'--require-independent-review'],{encoding:'utf8'});
 assert.equal(child.status,2);assert.equal(JSON.parse(child.stdout).independentQualityGate.status,'blocked');
});
