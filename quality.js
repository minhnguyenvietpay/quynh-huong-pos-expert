const fs=require('node:fs');
const path=require('node:path');
const LOG=path.resolve(process.env.POS_CARE_EVENTS_FILE||'pos-care-events.jsonl');
function log(event,extra={}){try{fs.appendFileSync(LOG,JSON.stringify({at:new Date().toISOString(),event,...extra})+'\n',{mode:0o600});}catch(e){console.warn('[QUALITY]',e.message);}}
function summarize(limit=10000){let rows=[];try{rows=fs.readFileSync(LOG,'utf8').split('\n').filter(Boolean).slice(-limit).map(x=>{try{return JSON.parse(x)}catch{return null}}).filter(Boolean)}catch{};const counts={};for(const r of rows)counts[r.event]=(counts[r.event]||0)+1;return {total:rows.length,counts,rows};}
module.exports={log,summarize};
