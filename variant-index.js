'use strict';
// Compatible variant lookup + automatically approved SAFE language overlay.
const fs=require('node:fs'),path=require('node:path');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
let index=null;
function getIndex(){if(index)return index;index=new Map();
 for(const file of ['variants-50000.jsonl','qa-approved-variants.jsonl']){
  const p=path.join(__dirname,file);if(!fs.existsSync(p))continue;
  for(const line of fs.readFileSync(p,'utf8').split(/\r?\n/)){
   if(!line)continue;let x;try{x=JSON.parse(line)}catch(e){throw Error('Invalid variant JSONL in '+file)}
   const key=norm(x.q);if(!key)continue;const id=String(x.id);
   if(index.has(key)&&index.get(key)!==id)index.set(key,null);
   else if(!index.has(key))index.set(key,id);
  }
 }
 return index;
}
function lookup(question){const k=norm(question);if(!k||!getIndex().has(k))return null;return getIndex().get(k)||'AMBIGUOUS';}
module.exports={lookup,norm};
