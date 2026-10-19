'use strict';
// Compare trusted local Git revisions with one evaluator and identical frozen fixtures.
// No worktree, network, dependency install, listener or live merchant data.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const {evaluate}=require('./program-evaluate.cjs');
function parseArgs(args){
 const versions=[],datasets=[];let output=null,transcripts=false,evaluator='program';
 for(let i=0;i<args.length;i++){
  const flag=args[i];if(flag==='--transcripts'){transcripts=true;continue;}
  if(!['--version','--dataset','--output','--evaluator'].includes(flag))throw Error('Unknown argument: '+flag);
  const value=args[++i];if(!value||value.startsWith('--'))throw Error('Missing value for '+flag);
  if(flag==='--version'){
   const match=/^([^:]+):([^:]+):(default|v11|v12|v13)$/.exec(value);if(!match)throw Error('Version format: label:gitref:default|v11|v12|v13');
   if(versions.some(v=>v.label===match[1]))throw Error('Duplicate version label');versions.push({label:match[1],ref:match[2],engine:match[3]});
  }else if(flag==='--evaluator'){if(!['program','v13'].includes(value))throw Error('Evaluator must be program or v13');evaluator=value;}else if(flag==='--dataset'){const filename=path.resolve(value);if(datasets.includes(filename))throw Error('Duplicate dataset');datasets.push(filename);}
  else{if(output)throw Error('Only one --output is supported');output=path.resolve(value);}
 }
 if(versions.length<2||!datasets.length)throw Error('Use at least two --version label:gitref:engine and one --dataset PATH; repeat flags in chronological order. Optional --output FILE --transcripts.');
 if(evaluator==='program'&&versions.some(v=>!['v11','v12'].includes(v.engine)))throw Error('Use --evaluator v13 for default/v13 runtime modes');
 return {versions,datasets,output,transcripts,evaluator};
}
function git(repo,args,options={}){
 const result=cp.spawnSync('git',['-C',repo,...args],{encoding:'utf8',maxBuffer:64*1024*1024,...options});
 if(result.error||result.status!==0)throw Error('Local Git operation failed: '+args[0]);return result.stdout;
}
function compare({versions,datasets,transcripts=false,evaluator='program',repo=path.resolve(__dirname,'..')}){
 const evaluateTarget=evaluator==='v13'?require('./v13-evaluate.cjs').evaluate:evaluate;
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-program-compare-'));
 try{
  // Snapshot fixtures before evaluating any historical code, and record content hashes.
  const frozen=datasets.map((filename,index)=>{const content=fs.readFileSync(filename);const parsed=JSON.parse(content);const snapshot=path.join(tmp,'dataset-'+index+'.json');fs.writeFileSync(snapshot,content,{mode:0o600});return {path:filename,snapshot,datasetVersion:parsed.datasetVersion,sha256:crypto.createHash('sha256').update(content).digest('hex')};});
  const report={schemaVersion:1,evaluator,syntheticOnly:true,reviewStatus:'ai_authored_unreviewed',independentQualityGate:'blocked_no_independent_review',scope:'Offline synthetic response contracts only; results do not establish production accuracy or deployment approval',comparisonBasis:'Same evaluator and exact frozen dataset bytes for every target revision; adjacent supplied versions compared in argument order',datasets:frozen.map(({snapshot,...meta})=>meta),versions:[]};
  for(const [index,version] of versions.entries()){
   // Resolve to a commit first: refs cannot become Git options or archive paths.
   const commit=git(repo,['rev-parse','--verify','--end-of-options',version.ref+'^{commit}']).trim();
   if(!/^[a-f0-9]{40,64}$/.test(commit))throw Error('Invalid resolved commit');
   const destination=path.join(tmp,'version-'+index);fs.mkdirSync(destination);
   const archive=path.join(tmp,'version-'+index+'.tar');git(repo,['archive','--format=tar','--output='+archive,commit]);
   const extracted=cp.spawnSync('tar',['-xf',archive,'-C',destination],{encoding:'utf8'});
   if(extracted.error||extracted.status!==0)throw Error('Local trusted revision extraction failed');
   const row={label:version.label,ref:version.ref,commit,engine:version.engine,datasets:[]};
   for(const dataset of frozen){
    const result=evaluateTarget({root:destination,datasetPath:dataset.snapshot,engine:version.engine});const previous=report.versions.at(-1)?.datasets.find(d=>d.sha256===dataset.sha256);const prior=new Map((previous?.rows||[]).map(r=>[r.fixtureId,r]));const current=new Map(result.rows.map(r=>[r.fixtureId,r]));
    const improved=previous?result.rows.filter(r=>prior.has(r.fixtureId)&&!prior.get(r.fixtureId).passed&&r.passed).map(r=>r.fixtureId):[];
    const regressed=previous?result.rows.filter(r=>prior.has(r.fixtureId)&&prior.get(r.fixtureId).passed&&!r.passed).map(r=>r.fixtureId):[];
    row.datasets.push({datasetVersion:dataset.datasetVersion,sha256:dataset.sha256,total:result.total,passed:result.passed,failed:result.failed,rootCauses:result.rootCauses,failures:result.failures,comparison:previous?{previousVersion:report.versions.at(-1).label,improvedCount:improved.length,improvedIds:improved,regressedCount:regressed.length,regressedIds:regressed,addedIds:result.rows.filter(r=>!prior.has(r.fixtureId)).map(r=>r.fixtureId),removedIds:previous.rows.filter(r=>!current.has(r.fixtureId)).map(r=>r.fixtureId)}:null,rows:result.rows.map(r=>transcripts?r:{id:r.id,fixtureId:r.fixtureId,category:r.category,rootCause:r.rootCause,passed:r.passed,issues:r.issues})});
   }
   report.versions.push(row);
  }
  return report;
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
if(require.main===module){try{const args=parseArgs(process.argv.slice(2));const report=compare(args);const json=JSON.stringify(report,null,2)+'\n';if(args.output)fs.writeFileSync(args.output,json,{mode:0o600});else process.stdout.write(json);
 // Historical failures are expected evidence; only a newly introduced regression fails comparison.
 process.exitCode=report.versions.some(v=>v.datasets.some(d=>d.comparison?.regressedCount))?1:0;
 }catch(error){console.error(error.message);process.exitCode=2;}}
module.exports={compare,parseArgs};
