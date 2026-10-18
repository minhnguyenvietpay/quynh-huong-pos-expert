'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),ref=process.argv[2];
if(!ref){console.error('Usage: node scripts/compare.cjs <baseline-commit>');process.exit(2);}
const commit=cp.execFileSync('git',['rev-parse','--verify',ref+'^{commit}'],{cwd:root,encoding:'utf8'}).trim();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-baseline-'));
function run(dir){const p=cp.spawnSync(process.execPath,['scripts/evaluate.cjs'],{cwd:dir,encoding:'utf8',timeout:60000});if(p.error)throw p.error;if(![0,1].includes(p.status))throw Error('Evaluator crashed');const r=JSON.parse(p.stdout);if(!r.total||r.total!==r.rows.length||p.status!==(r.failed?1:0))throw Error('Invalid evaluation outcome');return r;}
try{
 const archive=path.join(tmp,'base.tar'),base=path.join(tmp,'baseline');fs.mkdirSync(base);
 cp.execFileSync('git',['archive','--format=tar','--output',archive,commit],{cwd:root});
 cp.execFileSync('tar',['-xf',archive,'-C',base]);
 for(const file of ['scripts/evaluate.cjs','tests/scenarios.cjs']){const dest=path.join(base,file);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(path.join(root,file),dest);}
 const before=run(base),after=run(root);const prev=new Map(before.rows.map(x=>[x.id,x]));
 if(before.total!==after.total)throw Error('Different case counts');
 const improved=after.rows.filter(x=>x.passed&&!prev.get(x.id).passed).map(x=>x.id),regressions=after.rows.filter(x=>!x.passed&&prev.get(x.id).passed).map(x=>x.id);
 const report={baselineCommit:commit,scenarioSha256:require('node:crypto').createHash('sha256').update(fs.readFileSync(path.join(root,'tests/scenarios.cjs'))).digest('hex'),before:{passed:before.passed,total:before.total},after:{passed:after.passed,total:after.total},improved,regressions};
 console.log(JSON.stringify(report,null,2));process.exitCode=after.failed||regressions.length?1:0;
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
