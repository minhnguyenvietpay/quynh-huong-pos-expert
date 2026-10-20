'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {evaluate}=require('../scripts/v132-listener-evaluate.cjs');
const root=path.resolve(__dirname,'..'),manifest=JSON.parse(fs.readFileSync(path.join(root,'docs/v132/frozen-cycles.json')));
for(const cycle of manifest.eventContracts||[]){
 test('V13.2 cycle '+cycle.cycle+' actual listener handles frozen reply scenarios',()=>{
  for(const [file,hash]of [[cycle.scenarios,cycle.scenarioSha256],...(cycle.contracts?[[cycle.contracts,cycle.contractSha256]]:[])])assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex'),hash);
  const r=evaluate({root,datasetPath:path.join(root,cycle.scenarios)});assert.equal(r.total,cycle.scenarioCount);assert.equal(r.failed,0,JSON.stringify(r.rows.filter(x=>!x.passed).map(({id,issues})=>({id,issues}))));assert.equal(r.independentQualityGate,'blocked_no_external_ground_truth');
 });
}
