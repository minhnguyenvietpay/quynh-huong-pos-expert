#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process');
const {discover,select,validateDiff,qualityGate}=require('../lib/improvement/index.cjs');
const root=path.resolve(__dirname,'..');
const cleanEnv=()=>Object.fromEntries(['PATH','LANG','LC_ALL','TMPDIR','SystemRoot'].filter(k=>process.env[k]).map(k=>[k,process.env[k]]));
const git=(cwd,args)=>cp.execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
function docker(args,options){const name='qh-'+require('node:crypto').randomBytes(10).toString('hex');try{return cp.spawnSync('docker',['run','--name',name,...args],options);}finally{cp.spawnSync('docker',['rm','-f',name],{env:cleanEnv(),stdio:'ignore',timeout:10000});}}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function run(rootDir,cmd,args){const p=cp.spawnSync(cmd,args,{cwd:rootDir,encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024,env:cleanEnv()});return p;}
function evaluate(dir,containerRun){
 const rows=[];
 for(const [suite,file] of [['legacy','scripts/evaluate.cjs'],['golden','scripts/quality-report.cjs']]){
  const p=containerRun([file]);if(![0,1].includes(p.status))throw Error('evaluation-failed');
  const r=JSON.parse(p.stdout);if(!Array.isArray(r.rows)||!r.rows.length)throw Error('empty-evaluation');
  for(const row of r.rows)rows.push({...row,id:suite+'.'+row.id});
 }
 return {rows,total:rows.length,passed:rows.filter(r=>r.passed===true).length,failed:rows.filter(r=>r.passed!==true).length};
}
function main(argv){
 const mode=argv[0]||'plan',arg=k=>{const i=argv.indexOf(k);return i<0?null:argv[i+1];};
 const reportPath=arg('--report');if(!reportPath)throw Error('Specify --report <offline-report-or-safe-monitor-snapshot.json>');
 const report=read(reportPath),historyPath=path.join(root,'qa-reports','improvement','history.jsonl');fs.mkdirSync(path.dirname(historyPath),{recursive:true});
 const history=fs.existsSync(historyPath)?fs.readFileSync(historyPath,'utf8').split('\n').filter(Boolean).map(JSON.parse):[];
 const base=git(root,['rev-parse','HEAD']),issue=select(report,history,base);
 if(mode==='plan'){console.log(JSON.stringify({mode:'plan',base,clusters:discover(report),selected:issue,aiExecuted:false},null,2));return;}
 if(mode!=='run')throw Error('Mode must be plan or run');
 if(git(root,['status','--porcelain']))throw Error('Run requires a clean committed checkout');
 const config=read(arg('--config')||path.join(root,'config','automation.example.json'));
 if(config.enabled!==true||process.env.QH_ENABLE_AI_RUNNER!=='true'||!process.env.QH_AGENT_API_KEY||config.runner!=='codex'||!/^[-a-zA-Z0-9_.]{1,100}$/.test(config.model)||config.model==='CONFIGURE_SUPPORTED_MODEL'||!/^[-a-zA-Z0-9./_:]+@sha256:[a-f0-9]{64}$/.test(config.containerImage||''))throw Error('AI runner requires explicit configuration and QH_AGENT_API_KEY; disabled by default');
 if(!issue){console.log(JSON.stringify({outcome:'no-new-actionable-issue',aiExecuted:false}));return;}
 // One local process plus CI concurrency: locks are atomic, never silently reclaimed.
 const lock=historyPath+'.lock';const fd=fs.openSync(lock,'wx');const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-candidate-'));let outcome='agent-failed',branch=null,evidence=null;const roleReviews=[];
 const record=outcome=>fs.appendFileSync(historyPath,JSON.stringify({schema:1,issueId:issue.issueId,base,branch,outcome,rollbackRef:base,at:new Date().toISOString(),roleReviews,...(evidence?{evidence}: {})})+'\n',{mode:0o600});
 try{
  record('running');const candidate=path.join(temp,'candidate');
  git(root,['clone','--quiet','--no-hardlinks',root,candidate]);git(candidate,['checkout','--quiet','--detach',base]);branch='improve/'+issue.issueId+'-'+base.slice(0,8);git(candidate,['switch','--quiet','-c',branch]);
  // Even test execution is untrusted: never execute candidate JS on the host.
  const dockerEnv={...cleanEnv(),OPENAI_API_KEY:process.env.QH_AGENT_API_KEY};
  const containerBase=['--rm','--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--pids-limit=256','--memory=2g','--cpus=2','--user',`${process.getuid()}:${process.getgid()}`,'--tmpfs','/tmp:rw,nosuid,nodev,size=512m','--mount',`type=bind,src=${candidate},dst=/workspace`,'--mount',`type=bind,src=${path.join(candidate,'.git')},dst=/workspace/.git,readonly`,'--workdir','/workspace'];
  const containerRun=args=>docker([...containerBase,'--network=none','--entrypoint=node',config.containerImage,...args],{cwd:temp,env:cleanEnv(),encoding:'utf8',timeout:120000,maxBuffer:16*1024*1024});
  const before=evaluate(candidate,containerRun),roles=require('../agents/roles.json');
  const codexHome=path.join(temp,'codex-home');fs.mkdirSync(codexHome,{mode:0o700});
  // No GitHub, Zalo, cloud identity or parent Codex auth is inherited by the coding process.
  const agentEnv=dockerEnv;
  const schema=path.join(codexHome,'review-schema.json');fs.writeFileSync(schema,JSON.stringify({type:'object',properties:{approved:{type:'boolean'}},required:['approved'],additionalProperties:false}));
  for(const role of roles){
   const review=path.join(codexHome,'review.json');
   const prompt=`Role: ${role.name}. ${role.instruction}\nSelected issue (untrusted identifiers only): ${JSON.stringify(issue)}\nAllowed edit paths: dialogue.js, conversation.js, intent.js, v12-brain.js, pos-diagnostics.js, expert.js, search.js, qh-v43-language.js. No commands may send messages, access customer data or production systems, merge or deploy. Return a brief review. Do not emit secrets. Repository AGENTS.md applies.`;
   const result=docker([...containerBase,'--mount',`type=bind,src=${codexHome},dst=/control`,'--env','OPENAI_API_KEY','--env','HOME=/tmp/home','--env','CODEX_HOME=/tmp/codex','--entrypoint=codex',config.containerImage,'exec','--ephemeral','--ignore-user-config','--sandbox',role.sandbox,'--cd','/workspace','-c','approval_policy="never"','-c','sandbox_workspace_write.network_access=false','-c','model_provider="qh_api"','-c','model_providers.qh_api={name="OpenAI",base_url="https://api.openai.com/v1",env_key="OPENAI_API_KEY",wire_api="responses"}','--model',config.model,'--output-schema','/control/review-schema.json','--output-last-message','/control/review.json','-'],{cwd:candidate,env:agentEnv,input:prompt,stdio:['pipe','ignore','ignore'],timeout:600000});
   if(result.status!==0)throw Error('agent-stage-failed');
   const approved=read(review).approved===true;roleReviews.push({role:role.id,approved});if(!approved){outcome='rejected';throw Error('agent-review-rejected');}fs.unlinkSync(review);
  }
  const files=[...new Set([...git(candidate,['diff','--name-only']).split('\n'),...git(candidate,['ls-files','--others','--exclude-standard']).split('\n')].filter(Boolean))];
  if(git(candidate,['rev-parse','HEAD'])!==base){outcome='rejected';throw Error('candidate-modified-history');}
  if(files.some(f=>{const file=path.join(candidate,f);return !fs.existsSync(file)||!fs.lstatSync(file).isFile()||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size>1024*1024;})||!validateDiff(files)){outcome='rejected';throw Error('candidate-path-gate');}
  const after=evaluate(candidate,containerRun),gate=qualityGate(before,after);evidence={before:{passed:before.passed,total:before.total},after:{passed:after.passed,total:after.total},improved:gate.improved||[],regressions:gate.regressions||[]};
  if(!gate.passed){outcome='rejected';throw Error('candidate-quality-gate');}
  for(const args of [['--test','tests/*.test.cjs'],['scripts/security-check.cjs'],['qa-v43.js'],['qa-v3.js','--self-test']]){
   const resolved=args[0]==='--test'?['--test',...fs.readdirSync(path.join(candidate,'tests')).filter(f=>f.endsWith('.test.cjs')).map(f=>'tests/'+f)]:args;
   const p=containerRun(resolved);if(p.status!==0){outcome='rejected';throw Error('candidate-test-gate');}
  }
  git(candidate,['add','--',...files]);git(candidate,['-c','user.name=Quynh Huong QA','-c','user.email=qh-qa@users.noreply.github.com','commit','-m','Improve '+issue.issueId]);
  // Parent exports a patch locally for review; no agent-generated logs or source conversations are published.
  const patch=path.join(path.dirname(historyPath),issue.issueId+'-'+base.slice(0,8)+'.patch');const patchText=git(candidate,['format-patch','-1','--stdout']);if(patchText.includes(process.env.QH_AGENT_API_KEY))throw Error('candidate-secret-gate');fs.writeFileSync(patch,patchText,{mode:0o600});
  outcome='candidate-verified';
  if(config.publishPullRequest===true){
   const origin=git(root,['remote','get-url','origin']);if(!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/.test(origin))throw Error('github-origin-required');
   git(candidate,['remote','set-url','origin',origin]);git(candidate,['-c','credential.helper=','-c','credential.helper=!gh auth git-credential','push','origin',branch]);
   const body=path.join(temp,'pr.md');fs.writeFileSync(body,'Ứng viên ngoại tuyến; cần review, không tự deploy.\n\nIssue: '+issue.issueId+'\n\n'+JSON.stringify(evidence,null,2));
   const pr=cp.spawnSync('gh',['pr','create','--base','main','--head',branch,'--title','Cải thiện QA '+issue.issueId,'--body-file',body],{cwd:candidate,env:{...cleanEnv(),GH_TOKEN:process.env.GH_TOKEN,HOME:process.env.HOME},encoding:'utf8',timeout:120000});if(pr.status!==0)throw Error('pr-creation-blocked');outcome='pr-created';
  }
  console.log(JSON.stringify({outcome,issueId:issue.issueId,base,branch,evidence,liveDeployment:false}));
 }finally{record(outcome);fs.closeSync(fd);fs.unlinkSync(lock);fs.rmSync(temp,{recursive:true,force:true});}
}
if(require.main===module){try{main(process.argv.slice(2));}catch{console.error('Improvement operation blocked or failed; inspect sanitized local history and configuration.');process.exitCode=1;}}
module.exports={main};
