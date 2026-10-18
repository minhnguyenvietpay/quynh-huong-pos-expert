'use strict';
// Language-only hot reload. Explicit allowlist; no arbitrary regex or code execution.
const fs=require('node:fs'),path=require('node:path');
const files=[path.join(__dirname,'qa-v46-approved.json'),path.join(__dirname,'qa-v48-approved.json')];
const allow=Object.freeze({
 khg:'khong',khongg:'khong',k0:'khong',hem:'khong',duoccc:'duoc',roii:'roi',okee:'ok',okey:'ok',inbill:'in bill',
 gd:'giao dich',ttoan:'thanh toan',billl:'bill',hoadon:'hoa don',treoo:'treo',lagg:'lag',qrr:'qr',quett:'quet',
 truu:'tru',tienn:'tien',thanhhtoan:'thanh toan',chuaaa:'chua',nguonn:'nguon',mayy:'may',thatt:'that',baai:'bai'
});
let marker='',cache=Object.freeze({}),warned=false;
function getRules(){try{const id=files.map(f=>{try{const s=fs.statSync(f);return s.mtimeMs+':'+s.size;}catch(e){if(e.code==='ENOENT')return 'missing';throw e;}}).join('|');if(id!==marker){const next={};for(const file of files){if(!fs.existsSync(file))continue;const doc=JSON.parse(fs.readFileSync(file,'utf8'));if(doc.schema!==1||!Array.isArray(doc.rules))throw Error('Invalid schema');for(const r of doc.rules){if(!Object.hasOwn(allow,r.from)||allow[r.from]!==r.to)throw Error('Rule outside allowlist');next[r.from]=r.to;}}cache=Object.freeze(next);marker=id;warned=false;}}catch(e){if(!warned){console.warn('[QH V48 overlay]',e.message);warned=true;}}return cache;}
function expand(words){const r=getRules();return words.flatMap(w=>(r[w]||w).split(' '));}
module.exports={expand,getRules,allow};
