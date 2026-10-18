'use strict';
// Auto Safe: add only language variants mapped to already VERIFIED knowledge; no business answers generated.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=process.cwd(), report=path.join(root,'qa-reports','v3');
const args=new Set(process.argv.slice(2));
const dry=args.has('--dry-run'), selftest=args.has('--self-test');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const approvedStatus=new Set(['approved','verified','ops_approved','validated']);
const blocked=/(?:\b(?:otp|pin|cvv|password|mat khau|so the|refund|hoan tien|void|huy giao dich|settlement|payout|tru tien|that bai|thanh cong|doi soat|phi giao dich|ngan hang|code|error)\b|\b\d{4,}\b)/;
const rules=[
 ['khong ket noi','mat ket noi'],['mat ket noi','khong ket noi'],
 ['khong in hoa don','khong in bill'],['khong in bill','khong in hoa don'],
 ['khong len nguon','khong bat duoc nguon'],['khong bat duoc nguon','khong len nguon'],
 ['may bi treo','may bi do'],['may bi do','may bi treo'],
 ['khong thao tac duoc','khong bam duoc'],['khong bam duoc','khong thao tac duoc'],
 ['khong co internet','mat internet'],['mat internet','khong co internet']
];
function atomic(p,content){fs.mkdirSync(path.dirname(p),{recursive:true});const t=p+'.tmp-'+process.pid;fs.writeFileSync(t,content,{flag:'wx'});fs.renameSync(t,p)}
function generate(records,existing){
 const byId=new Map(records.map(x=>[String(x.id),x]));const owners=new Map();
 for(const x of existing){const k=norm(x.q);if(!k||!byId.has(String(x.id)))continue;const prev=owners.get(k);owners.set(k,prev&&prev!==String(x.id)?'AMBIGUOUS':String(x.id));}
 const candidates=new Map(), rejected=[];
 for(const item of records){
  const id=String(item.id),verified=approvedStatus.has(String(item.review_status||'').toLowerCase())&&item.requires_human_review!==true&&item.bot_usage!=='reference_with_guardrails'&&item.bot_usage!=='draft_only';
  if(!verified)continue;
  for(const source of [item.title,...(Array.isArray(item.keywords)?item.keywords:[])]){
   const s=norm(source);if(!s||blocked.test(s))continue;
   for(const [a,b] of rules){if(!s.includes(a))continue;const candidate=s.replace(a,b);if(candidate===s||candidate.length<9||blocked.test(candidate))continue;
    if(owners.has(candidate)){if(owners.get(candidate)!==id)rejected.push({candidate,id,reason:'existing_collision'});continue;}
    if(!candidates.has(candidate))candidates.set(candidate,new Set());candidates.get(candidate).add(id);
   }
  }
 }
 const accepted=[];for(const [q,ids] of candidates){if(ids.size!==1){rejected.push({candidate:q,reason:'generated_collision',ids:[...ids]});continue;}accepted.push({q,id:[...ids][0],rule:'verified_synonym',source_hash:sha(q).slice(0,16)});}
 accepted.sort((a,b)=>a.q.localeCompare(b.q));return {accepted,rejected,verifiedCount:records.filter(x=>approvedStatus.has(String(x.review_status||'').toLowerCase())&&x.requires_human_review!==true).length};
}
function run(dataRoot=root,apply=!dry){
 const kp=path.join(dataRoot,'knowledge.json'),vp=path.join(dataRoot,'variants-50000.jsonl'),overlay=path.join(dataRoot,'qa-approved-variants.jsonl');
 if(!fs.existsSync(kp)||!fs.existsSync(vp))throw Error('Missing knowledge.json or variants-50000.jsonl');
 const records=JSON.parse(fs.readFileSync(kp,'utf8'));if(!Array.isArray(records))throw Error('knowledge.json must be an array');
 const variants=fs.readFileSync(vp,'utf8').split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s));
 const old=fs.existsSync(overlay)?fs.readFileSync(overlay,'utf8').split(/\r?\n/).filter(Boolean).map(s=>JSON.parse(s)):[];
 // Revalidate the entire overlay on every run. A previously verified item can be revoked.
 const byId=new Map(records.map(x=>[String(x.id),x]));
 const verified=x=>x&&approvedStatus.has(String(x.review_status||'').toLowerCase())&&x.requires_human_review!==true&&x.bot_usage!=='reference_with_guardrails'&&x.bot_usage!=='draft_only';
 const owners=new Map();for(const x of variants){const k=norm(x.q),id=String(x.id);if(!k)continue;const prev=owners.get(k);owners.set(k,prev&&prev!==id?'AMBIGUOUS':id)}
 const safeOld=old.filter(x=>x.rule==='verified_synonym'&&verified(byId.get(String(x.id)))&&!blocked.test(norm(x.q))&&(!owners.has(norm(x.q))||owners.get(norm(x.q))===String(x.id)));
 const result=generate(records,variants.concat(safeOld));
 const combined=new Map(safeOld.map(x=>[norm(x.q),x]));for(const x of result.accepted)combined.set(norm(x.q),x);
 const output=[...combined.values()].sort((a,b)=>a.q.localeCompare(b.q));
 // Fail-closed: conflicting mapping across source variants and overlay.
 for(const x of output){if(owners.has(norm(x.q))&&owners.get(norm(x.q))!==String(x.id))throw Error('Unsafe mapping collision');}
 const audit={at:new Date().toISOString(),mode:apply?'AUTO_SAFE':'DRY_RUN',baseKnowledge:records.length,baseVariants:variants.length,verifiedKnowledge:result.verifiedCount,previousOverlay:old.length,retainedOverlay:safeOld.length,newApproved:result.accepted.length,rejected:result.rejected.length,totalOverlay:output.length,requiresManualReview:records.length-result.verifiedCount,sourceHash:sha(fs.readFileSync(kp)),status:'PASS',note:'Only preverified knowledge synonyms. No new facts. No production code edits.'};
 if(apply){const content=output.map(x=>JSON.stringify(x)).join('\n')+(output.length?'\n':'');atomic(overlay,content);}
 fs.mkdirSync(report,{recursive:true});atomic(path.join(report,'qa-v3-report.json'),JSON.stringify({audit,rejected:result.rejected.slice(0,100)},null,2));
 fs.appendFileSync(path.join(report,'audit.jsonl'),JSON.stringify(audit)+'\n');
 console.log('QA V3 AUTO SAFE:',JSON.stringify(audit));return audit;
}
function test(){const tmp=fs.mkdtempSync(path.join(require('node:os').tmpdir(),'qh-qav3-'));try{
 const base=[{id:'A',title:'Máy không in hóa đơn',keywords:['không in hóa đơn'],review_status:'approved',requires_human_review:false},{id:'B',title:'Máy bị treo',keywords:['máy bị treo'],review_status:'draft_needs_ops_validation',requires_human_review:true},{id:'C',title:'Hoàn tiền',keywords:['refund'],review_status:'approved',requires_human_review:false}];
 fs.writeFileSync(path.join(tmp,'knowledge.json'),JSON.stringify(base));fs.writeFileSync(path.join(tmp,'variants-50000.jsonl'),'');
 const a=generate(base,[]);if(!a.accepted.some(x=>x.id==='A'&&x.q.includes('bill')))throw Error('approved synonym missing');if(a.accepted.some(x=>x.id!=='A'))throw Error('draft or financial rule was promoted');
 const result=run(tmp,true);if(result.newApproved<1)throw Error('no safe additions');
 const repeat=run(tmp,true);if(repeat.newApproved!==0)throw Error('not idempotent');
 base[0].review_status='draft_needs_ops_validation';base[0].requires_human_review=true;fs.writeFileSync(path.join(tmp,'knowledge.json'),JSON.stringify(base));const revoke=run(tmp,true);if(revoke.totalOverlay!==0)throw Error('revocation failed');
 console.log('PASS: verified-only, financial exclusion, idempotence, revocation, atomic overlay');
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}}
try{if(selftest)test();else run()}catch(e){console.error('QA V3 FAILED:',e.stack||e);process.exitCode=1}
