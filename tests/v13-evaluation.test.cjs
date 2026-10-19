'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {evaluate}=require('../scripts/v13-evaluate.cjs');
const fixture=path.join(__dirname,'fixtures/v13-round1.json');
test('V13 Round1 contracts stay frozen before runtime fixes',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(fixture)).digest('hex'),'1948e180be9f623b72d6ab7b325d9377d368a92ab4852e50ebc35ba5e554c6ef');
 const d=JSON.parse(fs.readFileSync(fixture));assert.equal(d.fixtures.length,18);assert.ok(d.fixtures.every(f=>f.reviewStatus==='ai_authored_unreviewed'));
});
test('V13 evaluator enforces intermediate turns and mode-specific state',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v13-contract-'));
 try{
 const file=path.join(tmp,'fixture.json');const original=JSON.parse(fs.readFileSync(fixture));
 fs.writeFileSync(file,JSON.stringify({...original,fixtures:[{...original.fixtures[0],turns:['chào em'],must:[],mustNot:[],state:{},checkpoints:[{turn:1,must:['IMPOSSIBLE_SYNTHETIC_SENTINEL']}],stateByMode:{default:{pending:true}}}]}));
 const r=evaluate({engine:'default',datasetPath:file});assert.equal(r.failed,1);assert.ok(r.failures[0].issues.includes('turn_1_required_0'));assert.ok(r.failures[0].issues.includes('state_pending'));assert.equal(r.rows[0].turns.length,1);assert.equal(r.independentQualityGate,'blocked_no_independent_review');
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
