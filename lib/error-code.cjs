'use strict';
const {extractErrorCode,extractErrorCodes,normalize}=require('../intent');
const {searchCodeKnowledge}=require('../search');
const {analyze}=require('./v12/understanding.cjs');
const contexts=new Map(),TTL=30*60*1000,MAX=2000;
const key=(g,u)=>JSON.stringify([String(g),String(u)]);
function get(g,u){const k=key(g,u),s=contexts.get(k);if(s&&Date.now()-s.time>=TTL){contexts.delete(k);return null;}return s?{...s}:null;}
function clear(g,u){contexts.delete(key(g,u));}
// Accept only short model/bank identifiers after explicit labels, never arbitrary message text.
function extractCodeScope(input){
 const q=String(input||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
 const deviceRe=/\b(?:model|synthetic)-[a-z0-9]{1,20}\b|\b(?:pax\s+|ingenico\s+|sunmi\s+)?(?:a920(?:pro)?|a930|a80|s920|s90|d210|dx8000|move\s*5000|p2)\b/g;
 const bankRe=/\bacquirer-[a-z0-9]{1,20}\b|\bsynthetic-bank\b|\b(?:ngan hang|bank|don vi xu ly)\s+([a-z][a-z0-9-]{1,24})\b/g;
 const field=(re,canonical)=>{
  const matches=[...q.matchAll(re)];if(!matches.length)return undefined;
  const values=[...new Set(matches.map(canonical))];
  const denied=matches.some(m=>/\b(?:khong phai|chua chac|khong biet|co the la)\b[^,;.!?]{0,35}$/.test(q.slice(Math.max(0,m.index-60),m.index)));
  return denied||values.length!==1?null:values[0];
 };
 const device=field(deviceRe,m=>m[0].replace(/^(?:pax|ingenico|sunmi)\s+/,''));
 const acquirer=field(bankRe,m=>m[1]||m[0]);
 return {...(device!==undefined?{device}:{}),...(acquirer!==undefined?{acquirer}:{})};
}
function route(g,u,input,{retriever=searchCodeKnowledge,paymentPending=false}={}){
 const q=normalize(input),old=get(g,u),scope=extractCodeScope(input),a=analyze(input);
 let codes=extractErrorCodes(input),code=codes.at(-1)||null;
 if(!code&&old&&/nhin nham|dinh chinh|a khong/.test(q)){code=q.match(/\b(?:la|ma|loi)\s+(\d{2,3})\b/)?.[1]||null;if(code)codes=[code];}
 const bare=old&&q.match(/^(\d{2,3})(?: van y vay| van vay| do| nhe| em)?$/)?.[1];
 if(bare){code=bare;codes=[bare];}
 const statusDemand=old&&/(?:xac nhan|noi chac|noi la|ket luan|xac dinh).*(?:tien|giao dich|thanh cong)|(?:tien|giao dich).*(?:da ve|thanh cong)/.test(q);
 const opsQuestion=old&&/ops/.test(q)&&/la gi|co can|chuyen khong/.test(q);
 const referenceCorrection=old&&/(?:dung lay|khong phai).*(?:lam loi|ma loi)/.test(q);
 const follow=old&&(Object.keys(scope).length||/van.*loi|chua co.*(?:nguon|huong dan|xac minh)|can gi nua/.test(q)||statusDemand||opsQuestion||referenceCorrection);
 const newTopic=!code&&!Object.keys(scope).length&&!statusDemand&&!opsQuestion&&!referenceCorrection&&a.primary;
 if(old&&(!code&&/(?:thoi|bo|doi|chuyen|hoi).*(?:portal|settlement|doi soat|van de khac|case khac)/.test(q)||newTopic)){clear(g,u);return null;}
 if(!code&&!follow)return null;
 const candidates=codes.length>1?codes:code?[]:old?.candidates||[];
 const s={...(old||{}),...scope,code:candidates.length?null:code||old.code,candidates,time:Date.now(),status:'unknown',selectedRecordId:null};
 contexts.delete(key(g,u));contexts.set(key(g,u),s);
 for(const [k,v] of contexts)if(Date.now()-v.time>=TTL)contexts.delete(k);
 while(contexts.size>MAX)contexts.delete(contexts.keys().next().value);
 // Preserve risk in the actual diagnostic engine before interpreting any response code.
 if(a.facts.hotBattery||a.facts.unsafeHardware||a.facts.inFlight||a.facts.debit==='yes')return null;
 if(paymentPending){s.status='payment_guard';return `Em ghi nhận ${s.code?'mã lỗi '+s.code:'các mã '+s.candidates.join(', ')}; giao dịch trước chưa xác minh. Chưa khởi động lại hoặc thanh toán lại; kiểm tra đúng giao dịch trên POS/Portal và đối chiếu kết quả trước khi xử lý theo mã.`;}
 if(statusDemand){s.status='status_unavailable';return 'Em không thể xác nhận kết quả giao dịch hay tiền về từ tin nhắn hoặc mã lỗi. Cần kiểm tra lịch sử POS/Portal và đối chiếu qua kênh được phép; em không tự truy cập dữ liệu ngân hàng.';}
 if(opsQuestion){s.status='escalation_information';return 'CS/OPS là bộ phận hỗ trợ xử lý và xác minh qua kênh được phép. Chỉ cân nhắc chuyển khi còn lỗi hoặc rủi ro sau kiểm tra an toàn, và khách đồng ý rõ ràng; câu hỏi này chưa phải đồng ý, em chưa chuyển yêu cầu.';}
 if(s.candidates.length){s.status='ambiguous_code';return `Em ghi nhận các mã ${s.candidates.join(' và ')} luân phiên, chưa đủ cơ sở chọn một mã hay kết luận ý nghĩa. Hiện màn hình đang hiển thị mã nào và ở bước nào ạ? Không tạo giao dịch mới để thử mã.`;}

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
