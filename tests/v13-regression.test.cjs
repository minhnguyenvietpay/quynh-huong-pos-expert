'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {evaluate}=require('../scripts/v13-evaluate.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/v13/frozen-rounds.json')));
for(const round of manifest.rounds){
 test('V13 Round'+round.round+' retains frozen independent-role contracts',()=>{
  const datasetPath=path.join(root,round.dataset),bytes=fs.readFileSync(datasetPath),d=JSON.parse(bytes);
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),round.sha256);assert.equal(d.fixtures.length,round.fixtures);
 });
 for(const mode of round.modes)test('V13 Round'+round.round+' actual merchant responses pass in '+mode+' mode',()=>{
  const report=evaluate({root,datasetPath:path.join(root,round.dataset),engine:mode});
  assert.equal(report.total,round.fixtures);assert.equal(report.failed,0,JSON.stringify(report.failures));assert.equal(report.syntheticOnly,true);assert.equal(report.independentQualityGate,'blocked_no_independent_review');
 });
}
