 'use strict';
// Offline, read-only review proposals. Does not auto-publish knowledge.
const fs=require('node:fs'),path=require('node:path');
const kb=JSON.parse(fs.readFileSync(path.join(__dirname,'knowledge.json'),'utf8'));
const count={};for(const e of kb){const k=e.review_status||'unknown';count[k]=(count[k]||0)+1;}
const gaps=path.join(__dirname,'knowledge-gaps.jsonl');const lines=fs.existsSync(gaps)?fs.readFileSync(gaps,'utf8').split(/\r?\n/).filter(Boolean):[];
const norm=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const unique=new Map();for(const line of lines){try{const x=JSON.parse(line);const k=norm(x.question);if(k&&!unique.has(k))unique.set(k,{question:x.question,reason:x.reason,proposal_status:'pending_human_review',draft_answer:'',source_required:true});}catch{}}
const report={version:'12.0',total:kb.length,review_status:count,unanswered_examples:[...unique.values()].slice(0,300),publication_policy:'No automatic promotion; OPS review required for payment/bank rules'};
const out=process.argv[2]||path.join(__dirname,'v12-review-report.json');fs.writeFileSync(out,JSON.stringify(report,null,2));console.log('V12 review report:',out,'unanswered:',unique.size);
