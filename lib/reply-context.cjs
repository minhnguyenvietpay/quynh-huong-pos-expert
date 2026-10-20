'use strict';
const {normalize,extractErrorCodes}=require('../intent');
const {analyze}=require('./v12/understanding.cjs');
const {extractCodeScope}=require('./error-code.cjs');
const id=value=>typeof value==='string'&&value.length>0&&value.length<=128?value:typeof value==='number'&&Number.isSafeInteger(value)&&value>=0?String(value):null;
const key=(...parts)=>JSON.stringify(parts);
const request=q=>/kiem tra.*case nay|kiem tra.*huong dan.*case nay|xu ly (?:truong hop|case) nay|phan tich giup|huong dan khach|soan cau tra loi|co can chuyen (?:cs )?ops khong|(?:em )?xem giup tin nay/.test(q);
const follow=q=>/^(?:khach(?: noi)? |khach hang(?: noi)? )?(?:da thu roi|da kiem tra roi|van loi|van chua duoc)(?: em)?$/.test(q);
const reset=q=>/^(?:thoi )?(?:xem|doi|chuyen|hoi) (?:case|truong hop) khac$/.test(q)||/^\/(?:huy|reset|lai|done)$/.test(q);
function complaintFacts(raw){
 if(typeof raw!=='string'||!raw.trim()||raw.length>1200)return null;
 // Reject sensitive source messages entirely. Nothing raw is retained or echoed.
 if(/(?:\d[\s.-]?){8,}|\b(?:token|cookie|session|password|otp|cvv|mid|tid)\b|(?:mật khẩu|mat khau)\s*[:=]|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(raw))return null;
 const a=analyze(raw),q=a.text,scope=extractCodeScope(raw),codes=extractErrorCodes(raw),code=codes.length>0,parts=[];
 const has=topic=>a.intents.some(x=>x.id===topic);
 if(a.facts.hotBattery)parts.push('pin POS phồng hoặc nóng bất thường');
 if(a.facts.unsafeHardware)parts.push('máy POS bị ngấm nước hoặc màn hình vỡ');
 if(a.facts.debit==='yes')parts.push('khách báo bị trừ tiền, chưa xác minh kết quả giao dịch');
 if(a.facts.inFlight)parts.push('máy POS đang thanh toán, chưa xác minh kết quả');
 else if(/man hinh thanh toan/.test(q)&&/chua (?:biet|ro)|thanh cong chua/.test(q))parts.push('máy POS treo ở màn hình thanh toán, chưa biết giao dịch đã thành công chưa');
 if(/that bai|khong thanh cong/.test(q))parts.push('POS báo giao dịch thất bại');
 for(const value of codes)parts.push('máy POS báo lỗi '+value);
 if(has('network'))parts.push('máy POS mất kết nối mạng');
 if(a.facts.wifi)parts.push('máy dùng WiFi');
 else if(a.facts.sim)parts.push('máy dùng SIM 4G');
 if(has('printer'))parts.push(a.facts.receiptBlank||/\b(?:bill|giay|hoa don)\b.*\btrang\b/.test(q)?'máy in bill ra giấy trắng':/khong.*(?:ra|chay).*giay|giay.*khong.*(?:ra|chay)/.test(q)?'máy không in bill, giấy không chạy ra':'máy không in bill');
 if(has('freeze'))parts.push('máy POS bị đơ');
 if(has('power'))parts.push('máy POS không lên nguồn');
 if(has('qr'))parts.push('QR báo lỗi');
 if(has('card'))parts.push('máy POS lỗi đọc thẻ');
 if(has('settlement'))parts.push('cần hướng dẫn đối soát settlement');
 if(has('portal'))parts.push('cần hướng dẫn Merchant Portal');
 if(scope.device)parts.push('model '+scope.device);
 if(scope.acquirer)parts.push('ngân hàng '+scope.acquirer);
 if(!parts.length)return null;
 const issue=a.facts.hotBattery||a.facts.unsafeHardware?'hazard':a.facts.debit==='yes'||a.facts.inFlight||/man hinh thanh toan/.test(q)&&/chua (?:biet|ro)|thanh cong chua/.test(q)?'payment':code?'code':has('printer')?'printer':has('network')?'network':has('freeze')?'freeze':has('settlement')?'settlement':has('portal')?'portal':'pos';
 return {input:parts.join('; '),summary:parts.join('; '),issue};
}
function createReplyContext({now=Date.now,ttlMs=15*60*1000,maxMessages=1000,maxCases=500,staffIds=[],staffGroups=[]}={}){
 const ttl=Math.max(1,Math.min(Number(ttlMs)||900000,1800000));
 const limit=Math.max(1,Math.min(Number(maxMessages)||1000,1000)),caseLimit=Math.max(1,Math.min(Number(maxCases)||500,500));
 const messages=new Map(),cases=new Map(),staff=new Set(staffIds.filter(x=>/^\d+$/.test(x))),groups=new Set(staffGroups);
 function prune(){const time=now();for(const [k,v] of messages)if(time-v.time>=ttl)messages.delete(k);for(const [k,v] of cases)if(time-v.time>=ttl||!messages.has(v.cacheKey))cases.delete(k);}
 function trim(map,n){while(map.size>n)map.delete(map.keys().next().value);}
 function observe(event){
  prune();if(event?.isSelf||event?.type!==1)return;
  const d=event.data||{},group=id(event.threadId),owner=id(d.uidFrom),global=id(d.msgId),client=id(d.cliMsgId);
  if(!group||!owner||!global||!client||d.quote)return;
  const facts=complaintFacts(d.content);if(!facts)return;
  const k=key(group,owner,global,client);messages.set(k,{group,owner,global,client,...facts,time:now()});trim(messages,limit);prune();
 }
 function mentioned(d,botId){return Boolean(id(botId)&&Array.isArray(d.mentions)&&d.mentions.some(m=>id(m.uid)===id(botId)&&Number.isInteger(m.pos)&&m.pos>=0&&Number.isInteger(m.len)&&m.len>0&&m.pos+m.len<=String(d.content||'').length));}
 function missing(reason){return {kind:'missing',reason,mode:'merchant',input:'',reply:'Anh/chị reply đúng tin nhắn gốc cần xem và tag Quỳnh Hương nhé. Em chưa tìm thấy tin gốc hợp lệ trong các tin đã nhận; không dùng tin gần nhất để đoán.'};}
 function resolve(event,{botId}={}){
  if(event?.isSelf||event?.type!==1)return null;
  prune();const d=event?.data||{},group=id(event?.threadId),user=id(d.uidFrom),q=normalize(d.content).replace(/^quynh huong\s*/,''),actor=key(group,user);
  if(!group||!user)return null;
  const prior=cases.get(actor),mention=mentioned(d,botId),asked=request(q),isFollow=follow(normalize(String(d.content||'').replace(/@?Quỳnh\s*Hương/giu,'').trim()));
  if(reset(q)){cases.delete(actor);return prior?{kind:'reset',mode:'merchant',input:'',reply:'Em đã dừng case này. Anh/chị reply tin nhắn gốc của case khác và tag em để xem tiếp nhé.'}:null;}
  if(asked||d.quote){
   if(!mention)return {kind:'ignore'};
   if(!asked)return missing('instruction-required');
   const quote=d.quote;
   if(!quote){cases.delete(actor);return missing('reference-required');}
   const owner=id(quote.ownerId),global=id(quote.globalMsgId),client=id(quote.cliMsgId);
   const k=key(group,owner,global,client),original=owner&&global&&client?messages.get(k):null;
   if(!original){cases.delete(actor);return missing('unavailable');}
   const mode=staff.has(user)&&groups.has(group)&&!/soan cau tra loi/.test(q)?'staff':'merchant';
   const ref={ownerId:owner,globalMsgId:global,cliMsgId:client};
   const entry={...original,cacheKey:k,mode,reference:ref,scope:key('qh-reply',group,user,owner,global,client),time:now()};
   cases.delete(actor);cases.set(actor,entry);trim(cases,caseLimit);
   return {kind:'reply',...entry,currentSender:user,originalSender:owner,instruction:/co can chuyen/.test(q)?'escalation-advice':/soan cau tra loi/.test(q)?'draft':'diagnose'};
  }
  if(isFollow){
   if(!prior)return mention?missing('no-active-case'):null;
   return {kind:'followup',...prior,input:'',reply:'Khách đã thử bước nào và kết quả cụ thể ra sao ạ? Em giữ đúng case đang xem, chưa kết luận đã xử lý hoặc chuyển OPS.',currentSender:user,originalSender:prior.owner};
  }
  // An unrelated direct question ends the implicit binding; never guess a case.
  if(prior)cases.delete(actor);
  return null;
 }
 function invalidate(event){
  if(!event?.isGroup)return;const group=id(event.threadId),content=event.data?.content||{},global=id(content.globalMsgId),client=id(content.cliMsgId);
  for(const [k,v] of messages)if(v.group===group&&global&&client&&v.global===global&&v.client===client)messages.delete(k);
  prune();
 }
 return {observe,resolve,invalidate,hasContext:(group,user)=>{prune();return cases.has(key(String(group),String(user)));},stats:()=>{prune();return {messages:messages.size,cases:cases.size};}};
}
function renderCase(context,response){
 if(context.mode!=='staff')return response;
 const hypotheses={payment:'Kết quả giao dịch có thể chưa được xác minh đầy đủ; cần đối chiếu POS/Portal, chưa kết luận ngân hàng.',network:'Có thể do đường truyền hoặc kết nối của POS; cần phân biệt hai phía.',printer:'Có thể liên quan mặt giấy nhiệt hoặc đường giấy; cần kiểm tra thực tế.',code:'Ý nghĩa mã phụ thuộc model và đơn vị xử lý; chưa có nguồn xác minh phù hợp.',hazard:'Có dấu hiệu nguy hiểm thiết bị; ưu tiên dừng sử dụng an toàn.',freeze:'Có thể ứng dụng hoặc thiết bị không phản hồi; cần loại trừ giao dịch đang xử lý.'};
 return `Tóm tắt theo tin được reply: ${context.summary}.\nVấn đề: ${context.issue==='payment'?'rủi ro giao dịch chưa xác minh':context.issue==='code'?'mã lỗi cần đúng phạm vi':context.issue==='printer'?'in hóa đơn':context.issue==='network'?'kết nối mạng':'sự cố cần làm rõ'}.\nGiả thuyết (chưa xác minh): ${hypotheses[context.issue]||'Cần thêm dữ kiện thực tế, chưa kết luận nguyên nhân.'}\nHướng xử lý: ${response}\nThông tin còn thiếu: ${context.issue==='payment'?'kết quả đối chiếu lịch sử POS/Portal; không gửi dữ liệu thanh toán nhạy cảm':context.issue==='code'?'chỉ bổ sung model/đơn vị xử lý nếu chưa có; cần tài liệu đúng cấu hình được xác minh':'bước đã kiểm tra và kết quả; tình trạng giao dịch nếu chưa rõ'}.\nChỉ cân nhắc CS/OPS khi rủi ro hoặc lỗi còn tồn tại sau kiểm tra an toàn và khách đồng ý; phân tích này chưa chuyển yêu cầu.`;
}
module.exports={createReplyContext,complaintFacts,renderCase};
