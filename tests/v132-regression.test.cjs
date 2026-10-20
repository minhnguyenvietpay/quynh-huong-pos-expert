'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {evaluate}=require('../scripts/v132-evaluate.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/v132/frozen-cycles.json')));
for(const cycle of manifest.cycles){
 test('V13.2 cycle '+cycle.cycle+' preserves frozen independent-role contracts',()=>{
  const bytes=fs.readFileSync(path.join(root,cycle.dataset));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),cycle.sha256);assert.equal(JSON.parse(bytes).fixtures.length,cycle.fixtures);
 });
 for(const engine of cycle.modes)test('V13.2 cycle '+cycle.cycle+' actual responses in '+engine,()=>{
  const report=evaluate({root,datasetPath:path.join(root,cycle.dataset),engine});assert.equal(report.failed,0,JSON.stringify(report.failures));assert.equal(report.total,cycle.fixtures);assert.equal(report.independentQualityGate,'blocked_no_independent_review');
 });
}

test('V13.2 additional manual-review assertion files retain independent contracts',()=>{
 const probes=JSON.parse(fs.readFileSync(path.join(root,'docs/v132/additional-review-probes.json')));
 for(const probe of probes.probes)assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,probe.file))).digest('hex'),probe.sha256,probe.file);
 assert.equal(probes.externalGroundTruthGate,'blocked');
});
