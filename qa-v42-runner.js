'use strict';
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto');
const candidates=[process.env.QH_ROOT,__dirname,process.cwd(),'C:\\Users\\LENOVO\\zalo-pos-care-v5'].filter(Boolean);
const root=path.resolve(candidates.find(p=>fs.existsSync(path.join(p,'qa-v3.js'))&&fs.existsSync(path.join(p,'knowledge.json'))) || __dirname);
const base=path.join(root,'qa-reports','v42'),snap=path.join(base,'snapshots');
const now=()=>new Date().toISOString(), sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const atomic=(p,s)=>{fs.mkdirSync(path.dirname(p),{recursive:true});const t=p+'.'+process.pid+'.tmp';fs.writeFileSync(t,s);fs.renameSync(t,p)};
function runCommand(label,command,args,timeout=120000){const p=cp.spawnSync(command,args,{cwd:root,encoding:'utf8',timeout,maxBuffer:4*1024*1024,windowsHide:true});return {label,ok:p.status===0&&!p.error,code:p.status,error:p.error?.message||null,output:(p.stdout||'').slice(-9000),stderr:(p.stderr||'').slice(-5000)};}
function snapshot(){fs.mkdirSync(snap,{recursive:true});const target=path.join(root,'qa-approved-variants.jsonl');const content=fs.existsSync(target)?fs.readFileSync(target):null;const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomBytes(3).toString('hex');const dest=path.join(snap,id+'.json');atomic(dest,JSON.stringify({id,at:now(),present:content!==null,sha256:content===null?null:sha(content),content:content===null?null:content.toString('base64')},null,2));return id;}
function run(){fs.mkdirSync(base,{recursive:true});const started=now(),steps=[];const required=['qa-v3.js','knowledge.json','variants-50000.jsonl'];for(const f of required){if(!fs.existsSync(path.join(root,f))){const report={started,finished:now(),status:'BLOCKED',reason:'Missing '+f,steps};atomic(path.join(base,'latest.json'),JSON.stringify(report,null,2));return report;}}
 const syntaxFiles=['listener.mjs','dialogue.js','intent.js','qa-v3.js','variant-index.js','qa-v43.js','qh-v43-language.js'].filter(f=>fs.existsSync(path.join(root,f)));
 for(const f of syntaxFiles){const r=runCommand('Syntax: '+f,process.execPath,['--check',f],30000);steps.push(r);if(!r.ok)break;}
 if(steps.every(s=>s.ok)){steps.push(runCommand('QA V4.3 conversation and abbreviation tests',process.execPath,['qa-v43.js']));}
 if(steps.every(s=>s.ok)){steps.push(runCommand('QA V3 self-test',process.execPath,['qa-v3.js','--self-test']));}
 if(steps.every(s=>s.ok)){steps.push(runCommand('QA V3 dry-run',process.execPath,['qa-v3.js','--dry-run']));}
 let snapshotId=null;
 if(steps.every(s=>s.ok)){snapshotId=snapshot();steps.push(runCommand('QA V3 Auto Safe apply',process.execPath,['qa-v3.js']));}
 if(steps.every(s=>s.ok)){steps.push(runCommand('QA V3 idempotence check',process.execPath,['qa-v3.js','--dry-run']));}
 let v3=null;try{v3=JSON.parse(fs.readFileSync(path.join(root,'qa-reports','v3','qa-v3-report.json'),'utf8')).audit}catch{}
 const report={started,finished:now(),status:steps.every(s=>s.ok)?'PASS':'FAIL',scope:'Offline syntax + V4.3 scripted language/dialogue scenarios + V3 self-test/dry-run/Auto Safe; NOT live Zalo or 10,000 conversations',snapshotId,steps,autoSafe:v3};
 if(report.status==='FAIL'&&snapshotId){try{restore(snapshotId);report.rollback='overlay_restored'}catch(e){report.rollback='FAILED: '+e.message}}
 atomic(path.join(base,'latest.json'),JSON.stringify(report,null,2));fs.appendFileSync(path.join(base,'history.jsonl'),JSON.stringify({started,finished:report.finished,status:report.status,snapshotId,rollback:report.rollback||null})+'\n');return report;
}
function listSnapshots(){if(!fs.existsSync(snap))return [];return fs.readdirSync(snap).filter(f=>/^\d{4}-.*\.json$/.test(f)).sort().reverse().slice(0,30).map(f=>f.slice(0,-5));}
function restore(id){if(!listSnapshots().includes(id))throw Error('Unknown snapshot');const obj=JSON.parse(fs.readFileSync(path.join(snap,id+'.json'),'utf8'));const target=path.join(root,'qa-approved-variants.jsonl');if(obj.present){const buf=Buffer.from(obj.content,'base64');if(sha(buf)!==obj.sha256)throw Error('Snapshot checksum mismatch');atomic(target,buf)}else if(fs.existsSync(target))fs.unlinkSync(target);return {id,restoredAt:now(),target:'qa-approved-variants.jsonl'};}
if(require.main===module){const a=process.argv[2]||'run';try{if(a==='run')console.log(JSON.stringify(run(),null,2));else if(a==='snapshots')console.log(JSON.stringify(listSnapshots()));else if(a==='restore')console.log(JSON.stringify(restore(process.argv[3])));else throw Error('Unknown command');}catch(e){console.error(e.stack);process.exitCode=1}}
module.exports={run,listSnapshots,restore};
