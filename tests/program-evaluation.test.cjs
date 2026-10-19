'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),os=require('node:os');
const {evaluate,validate}=require('../scripts/program-evaluate.cjs');
const fixturePath=path.join(__dirname,'fixtures/v12-stage1.json');const dataset=JSON.parse(fs.readFileSync(fixturePath,'utf8'));
test('Stage1 scenario contracts remain frozen and explicitly unreviewed',()=>{
 assert.equal(crypto.createHash('sha256').update(fs.readFileSync(fixturePath)).digest('hex'),'04782319dfb9b7b8d2d340b55fdd7e03bfc0deb177363c948d9c49521b01007d');
 assert.equal(dataset.fixtures.length,80);assert.ok(new Set(dataset.fixtures.map(f=>f.rootCause)).size<dataset.fixtures.length);
 assert.ok(dataset.fixtures.every(f=>f.reviewStatus==='ai_authored_unreviewed'&&f.rationale));assert.equal(validate(dataset),dataset);
 assert.throws(()=>validate({...dataset,fixtures:[dataset.fixtures[0],dataset.fixtures[0]]}));
 assert.throws(()=>validate({...dataset,fixtures:[{...dataset.fixtures[0],reviewStatus:'verified'}]}));
});
test('program evaluator measures real isolated conversation outputs and state',()=>{
 const report=evaluate({engine:'v11'});
 assert.equal(report.total,80);assert.equal(report.passed+report.failed,80);assert.equal(report.independentQualityGate,'blocked_no_independent_review');
 for(const row of report.rows){assert.equal(row.turns.length,dataset.fixtures.find(f=>f.id===row.id).turns.length);for(const turn of row.turns){assert.equal(typeof turn.actual,'string');assert.equal(typeof turn.pending,'boolean');assert.equal(typeof turn.escalation,'boolean');assert.equal(typeof turn.session,'boolean');}}
 assert.ok(report.rows.some(row=>row.turns.at(-1).context));
});
test('impossible assertions fail and expose machine issue codes',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'program-contract-'));
 try{const file=path.join(tmp,'fixture.json');const f={...dataset.fixtures[0],must:['NEVER_SYNTHETIC_SENTINEL'],mustNot:['.'],state:{pending:true}};fs.writeFileSync(file,JSON.stringify({...dataset,fixtures:[f]}));const report=evaluate({engine:'v11',datasetPath:file});assert.equal(report.failed,1);assert.ok(report.failures[0].issues.includes('required_response_0'));assert.ok(report.failures[0].issues.includes('forbidden_response_0'));assert.ok(report.failures[0].issues.includes('state_pending'));assert.equal(report.failures[0].fixtureId,f.id);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
