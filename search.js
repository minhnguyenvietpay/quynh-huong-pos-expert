const fs=require('node:fs');
const path=require('node:path');
const {extractErrorCode}=require('./intent');
const {reviewed}=require('./lib/v12/retrieval.cjs');
const KB=path.join(__dirname,'knowledge.json');
let cache={mtime:-1,records:[]};
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const STOP=new Set('anh chi em toi minh ban cho hoi giup voi la bi cua tren duoc khong nhu the nao sao tai vi va o mot may giao dich pos care merchant nhe a oi da'.split(' '));
const GROUPS=[
 ['freeze',['do','treo','dung may','dung hinh','khong phan hoi','khong thao tac','bi lag','bi treo','bi do','may dung im','may khong bam duoc']],
 ['loading',['xoay vong','quay vong','loading','dang xu ly','processing','cho mai','xu ly lau']],
 ['debit',['tru tien','bi tru tien','da tru tien','tai khoan bi tru','mat tien','tru tai khoan','tien da tru']],
 ['failed',['that bai','khong thanh cong','fail','failed','bao loi giao dich']],
 ['missing',['khong hien thi','khong thay','thieu giao dich','khong co giao dich','khong len portal']],
 ['print',['in bill','in hoa don','in bien lai','may in','khong in','het giay']],
 ['qr',['qr','quet ma','ma qr']],
 ['refund',['hoan tien','refund','tra lai tien']],
 ['void',['huy giao dich','void']],
 ['reconcile',['doi soat','reconcile','reconciliation']],
 ['settlement',['quyet toan','settlement','chot so']],
 ['network',['mat mang','khong ket noi','loi mang','mat internet','wifi','wi fi','4g']]
];
function feature(s){const n=' '+norm(s)+' ';const t=new Set(n.trim().split(' ').filter(w=>w.length>1&&!STOP.has(w)));for(const [name,aliases] of GROUPS){if(aliases.some(x=>n.includes(' '+x+' ')))t.add('~'+name)}return t}
function load(){const st=fs.statSync(KB);if(st.mtimeMs===cache.mtime)return cache.records;const a=JSON.parse(fs.readFileSync(KB,'utf8'));if(!Array.isArray(a))throw Error('knowledge.json must be an array');cache={mtime:st.mtimeMs,records:a.map(item=>{const title=feature(item.title),keys=(item.keywords||[]).map(norm),all=new Set([...title,...feature(keys.join(' '))]);return {item,title,all,titleNorm:norm(item.title),keys}})};return cache.records}
function searchKnowledge(question){const q=norm(question),qt=feature(question);if(!q)return {status:'unknown',confidence:0};const records=load();
 // A bare code is not sufficient: require a code/error indicator. Do not guess bank-specific meanings.
 const code=extractErrorCode(question);
 if(code)return defaultCodeRetriever(code,{});
 // Prioritize exact incident semantics; do not conflate 'debited but failed' with a normal failure.
 const freeze=qt.has('~freeze') && (q.includes('may')||q.includes('pos')||q.includes('thiet bi'));
 if(freeze&&!qt.has('~debit')&&!qt.has('~failed')){const r=records.find(x=>x.item.id==='POS-001');if(r)return {status:'matched',confidence:95,item:r.item}}
 const scored=[];
 for(const r of records){if(r.item.category==='code')continue;let common=0,titleHits=0;for(const t of qt){if(r.all.has(t))common++;if(r.title.has(t))titleHits++}if(!common)continue;
 const precision=common/Math.max(1,qt.size),recall=common/Math.max(2,Math.min(qt.size,r.all.size));let score=.64*precision+.21*recall+.10*titleHits/Math.max(1,qt.size);
 if(q===r.titleNorm)score+=.5;else if(q.length>=8&&r.titleNorm.includes(q))score+=.18;
 if(r.keys.includes(q))score+=.36;
 const markers=['~debit','~failed','~refund','~void','~settlement','~reconcile','~missing'];
 for(const marker of markers){if(qt.has(marker)&&!r.all.has(marker))score-=.24;if(!qt.has(marker)&&r.title.has(marker))score-=.08}
 if(qt.has('~debit')&&qt.has('~failed')&&!(r.all.has('~debit')&&r.all.has('~failed')))score-=.2;
 scored.push({r,score})}
 scored.sort((a,b)=>b.score-a.score);if(!scored.length||scored[0].score<.56)return {status:'unknown',confidence:scored.length?Math.max(0,Math.round(scored[0].score*100)):0};
 const best=scored[0],second=scored[1];if((best.score<.82&&second&&second.score>.5&&best.score-second.score<.09)|| (qt.has('~debit')&&qt.has('~failed')&&!(best.r.all.has('~debit')&&best.r.all.has('~failed'))))return {status:'ambiguous',confidence:Math.min(100,Math.round(best.score*100))};
 return {status:'matched',confidence:Math.min(100,Math.round(best.score*100)),item:best.r.item}}
const variantIndex=require('./variant-index');
const baseSearchKnowledge=searchKnowledge;
function searchKnowledgeV87(question){
 const original=baseSearchKnowledge(question);
 // Preserve all existing safety behavior for codes, ambiguous financial questions, and confident base matches.
 if(original.status==='matched'||original.status==='ambiguous'||original.exactCode!==undefined)return original;
 const id=variantIndex.lookup(question);
 if(!id||id==='AMBIGUOUS')return original;
 const item=load().find(r=>r.item.id===id)?.item;
 if(!item||item.category==='code')return original;
 // No draft is promoted into a verified response. Existing dialogue.js controls bot_usage/review_status.
 // Financial and payment status cases are deliberately not promoted from a generated paraphrase alone.
 const n=norm(question);
 if(/(?:tru tien|hoan tien|refund|void|huy giao dich|settlement|doi soat|thanh cong|that bai|fail|payout)/.test(n))return original;
 return {status:'matched',confidence:92,item,variantMatch:true};
}
module.exports={searchKnowledge:searchKnowledgeV87,norm};

// Exact codes share the intent extractor. Scope and evidence are independent gates.
function createCodeRetriever(records){
 const rows=Array.isArray(records)?records:[];
 const retrieve=(query,scope={})=>{
  const code=/^\d{2,3}$/.test(String(query))?String(query):extractErrorCode(query);
  const result=(status,extra={})=>({status,confidence:0,exactCode:true,code,...extra});
  if(!code)return result('missing');
  const candidates=rows.filter(row=>String(row.code||String(row.id||'').match(/^code-(\d{2,3})$/i)?.[1]||'')===code);
  if(!candidates.length)return result('missing');
  const verified=candidates.filter(reviewed);
  if(!verified.length)return result('unverified');
  const deviceKey=value=>norm(value).replace(/^(?:pax|ingenico|sunmi) /,'');
  const scoped=verified.filter(row=>row.scope==='universal'||(row.device&&row.acquirer&&scope.device&&scope.acquirer&&deviceKey(row.device)===deviceKey(scope.device)&&norm(row.acquirer)===norm(scope.acquirer)));
  if(!scoped.length)return result(scope.device&&scope.acquirer?'scope_mismatch':'scope_required');
  if(new Set(scoped.map(row=>norm(row.answer))).size>1)return result('conflict');
  return result('matched',{confidence:100,item:scoped[0]});
 };
 retrieve.search=retrieve;return retrieve;
}
const defaultCodeRetriever=(code,scope)=>createCodeRetriever(load().map(row=>row.item))(code,scope);
module.exports.createCodeRetriever=createCodeRetriever;
module.exports.searchCodeKnowledge=defaultCodeRetriever;
