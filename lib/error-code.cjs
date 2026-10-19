'use strict';
const {extractErrorCode,normalize}=require('../intent');
const {searchCodeKnowledge}=require('../search');
const {analyze}=require('./v12/understanding.cjs');
const contexts=new Map(),TTL=30*60*1000,MAX=2000;
const key=(g,u)=>JSON.stringify([String(g),String(u)]);
function get(g,u){const k=key(g,u),s=contexts.get(k);if(s&&Date.now()-s.time>=TTL){contexts.delete(k);return null;}return s?{...s}:null;}
function clear(g,u){contexts.delete(key(g,u));}
// Accept only short model/bank identifiers after explicit labels, never arbitrary message text.
function extractCodeScope(input){
 const q=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
 const device=q.match(/\b(?:model|synthetic)-[a-z0-9]{1,20}\b|\b(?:pax\s+|ingenico\s+|sunmi\s+)?(?:a920(?:pro)?|a930|a80|s920|s90|d210|dx8000|move\s*5000|p2)\b/)?.[0];
 const acquirer=q.match(/\bacquirer-[a-z0-9]{1,20}\b|\bsynthetic-bank\b|\b(?:ngan hang|bank|don vi xu ly)\s+([a-z][a-z0-9-]{1,24})\b/);
 return {...(device?{device:device.replace(/^(?:pax|ingenico|sunmi)\s+/, '')}:{}),...(acquirer?{acquirer:acquirer[1]||acquirer[0]}:{})};
}
function route(g,u,input,{retriever=searchCodeKnowledge,paymentPending=false}={}){
 const q=normalize(input),old=get(g,u),scope=extractCodeScope(input);
 if(old&&/(?:thoi|bo|doi|chuyen|hoi).*(?:portal|settlement|doi soat|van de khac|case khac)/.test(q)){clear(g,u);return null;}
 let code=extractErrorCode(input);
 if(!code&&old&&/nhin nham|dinh chinh|a khong/.test(q))code=q.match(/\b(?:la|ma|loi)\s+(\d{2,3})\b/)?.[1]||null;
 const follow=old&&(Object.keys(scope).length||/van.*loi|chua co.*(?:nguon|huong dan|xac minh)|can gi nua/.test(q));
 if(!code&&!follow)return null;
 const s={...(old||{}),...scope,code:code||old.code,time:Date.now(),status:'unknown',selectedRecordId:null};
 contexts.delete(key(g,u));contexts.set(key(g,u),s);
 for(const [k,v] of contexts)if(Date.now()-v.time>=TTL)contexts.delete(k);
 while(contexts.size>MAX)contexts.delete(contexts.keys().next().value);
 const a=analyze(input);
 // Preserve risk in the actual diagnostic engine before interpreting a response code.
 if(a.facts.hotBattery||a.facts.unsafeHardware||a.facts.inFlight||a.facts.debit==='yes')return null;
 let result;try{result=typeof retriever==='function'?retriever(s.code,{device:s.device,acquirer:s.acquirer}):retriever.search(s.code,{device:s.device,acquirer:s.acquirer});}catch{result={status:'unavailable'};}
 s.status=result?.status||'unavailable';
 const warning=paymentPending?' Giao dịch trước chưa xác minh: kiểm tra POS/Portal; chưa thanh toán lại hoặc khởi động lại.':'';
 if(result?.status==='matched'&&result.item){s.selectedRecordId=result.item.id;return `Mã lỗi ${s.code}: ${result.item.answer}`+warning;}
 const prefix=`Em ghi nhận mã lỗi ${s.code}; chưa có hướng dẫn đã xác minh phù hợp để kết luận ý nghĩa mã này.`;
 if(!s.device)return prefix+' Máy đang dùng dòng/model nào ạ? Không cần gửi mã thiết bị.'+warning;
 if(!s.acquirer)return prefix+' Em đã ghi nhận dòng máy. Máy đang dùng ứng dụng của ngân hàng/đơn vị xử lý nào ạ?'+warning;
 return prefix+' Em đã ghi nhận dòng máy và đơn vị xử lý; không cần cung cấp lại. Cần tài liệu đúng cấu hình được người phụ trách xác minh trước khi hướng dẫn theo mã.'+warning;
}
module.exports={route,get,clear,extractCodeScope};
