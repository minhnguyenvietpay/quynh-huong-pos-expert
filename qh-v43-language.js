'use strict';
// Conservative Vietnamese chat expansion; preserve the original when no unambiguous expansion exists.
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const dict={k:'khong',ko:'khong',hok:'khong',hong:'khong',khum:'khong',dc:'duoc',r:'roi',rui:'roi',e:'em',a:'anh'};
const overlay=require('./qh-v46-overlay.js');
function normalize(input,{issue=null,stage=null}={}){
 const original=fold(input),words=original.split(' ').filter(Boolean);let changed=false;
 const expanded=words.map(w=>{
  let replacement=dict[w]||w;
  if(w==='hd'&&/\b(in|bill|hoa don|may)\b/.test(original))replacement='hoa don';
  if(w==='ck'&&/\b(khach|tien|thanh toan|chuyen|nhan|tai khoan|bank)\b/.test(original))replacement='chuyen khoan';
  if((w==='bt'||w==='bth')&&issue&&/^(bt|bth)( roi| r)?$/.test(original))replacement='binh thuong';
  if(replacement!==w)changed=true;
  return replacement;
 });
 const overlayWords=overlay.expand(expanded); if(overlayWords.join(' ')!==expanded.join(' '))changed=true; const text=overlayWords.join(' ');
 let intent='unknown';
 if(/\b(khong|chua)\b.*\b(in|bill|hoa don)\b|\b(in|bill|hoa don)\b.*\b(khong|chua)\b/.test(text))intent='printer_problem';
 else if(/\b(tru tien|tru roi|da tru|khach bi tru|chuyen khoan roi|chuyen khoan)\b/.test(text))intent='payment_review';
 else if(/\b(chua duoc|van khong|van chua|khong duoc|chua xong)\b/.test(text))intent='unresolved';
 else if(/^(khong|chua)( em| anh)?$/.test(text))intent=stage==='question'?'negative_answer':'ambiguous_reply';
 else if(/^(dung roi|dung roi em|roi|roi em|co|co em)$/.test(text))intent=stage==='question'?'affirmative_answer':'ambiguous_reply';
 else if(/^(ok|oke|ok roi|ok roi em|on roi|binh thuong roi|binh thuong|duoc roi|xong roi|khong can nua|khong can ho tro nua)( em| anh)?$/.test(text))intent=issue?'resolved':'social';
 else if(/^(cam on|cam on em|thanks|thank you)( em| anh)?$/.test(text))intent='thanks';
 else if(/\bmay\b.*\b(do|treo|lag|dung)\b/.test(text))intent='frozen';
 return {original,text,intent,changed,ambiguous:/(^| )(dk|ch|bt|bth|ck)( |$)/.test(text)};
}
module.exports={normalize,fold};
