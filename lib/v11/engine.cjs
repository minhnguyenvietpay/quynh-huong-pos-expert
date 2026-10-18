'use strict';
// Local deterministic diagnostics. No inference API, network or merchant text persistence.
const {analyze,normalize}=require('./understanding.cjs');
const {createMemory}=require('./memory.cjs');
const retrieve=require('./retrieval.cjs');
const TOPICS={freeze:'máy POS bị treo',power:'máy không lên nguồn',battery:'pin và sạc',printer:'máy in hóa đơn',network:'kết nối mạng',qr:'thanh toán QR',card:'đọc thẻ',debit:'giao dịch chưa xác minh',missing:'giao dịch chưa hiển thị',duplicate:'nghi giao dịch trùng',refund:'yêu cầu hoàn tiền',void:'yêu cầu hủy giao dịch',reversal:'trạng thái đảo giao dịch',settlement:'quyết toán và chi trả',portal:'báo cáo Merchant Portal'};
const FINANCIAL=new Set(['debit','missing','duplicate','refund','void','reversal','settlement']);
const payments='Chưa yêu cầu khách thanh toán lại khi chưa xác minh kết quả trên POS/Portal.';
const explicitFailure=q=>/van (?:vay|loi|trang|do|treo|khong|chua)|thu roi|lam het|lam roi|da (?:thu|khoi dong|kiem tra|lap|lat|doi|ket noi|quen mang)|chua duoc|khong duoc|dung bao.*lai/.test(q);
function createEngine({memory=createMemory(),retriever=retrieve}={}){
 function getContext(group,user){return memory.get(group,user);}
 function clear(group,user){memory.delete(group,user);}
 function meaningful(input){const a=analyze(input);if(/\bpos\b/.test(a.text)&&/\b(?:loi|khong hoat dong|van de)\b/.test(a.text))return true;return Boolean(a.primary&&(/\b(?:may|pos|pin|khach|giao dich|wifi|sim|4g|hoa don|giay|bill|qr|the|portal)\b/.test(a.text)||a.intents[0]?.score>=9));}
 function shouldInterrupt(group,user,raw){const a=analyze(raw);return meaningful(raw)&&/\b(?:loi|khong|chua|mat|bi|nong|phong|treo|trang|het|sac|do)\b/.test(a.text)&&!/^cua hang\b/.test(a.text);}
 function initial(topic,prior){return {topic,currentQuestion:null,previousQuestions:[],answers:[],attempted:[],failed:[],risk:FINANCIAL.has(topic)?'high':'unknown',pendingVerification:FINANCIAL.has(topic),consent:false,interruptions:prior?.interruptions||[]};}
 function remember(group,user,s,question,attempt=[]){s.previousQuestions=[...s.previousQuestions,...(s.currentQuestion?[s.currentQuestion]:[])].slice(-10);s.currentQuestion=question;s.attempted=[...new Set([...s.attempted,...attempt])].slice(-10);memory.set(group,user,s);}
 function offer(group,user,s,reason){remember(group,user,s,'offer-consent');return `${reason} Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?`;}
 function recordAnswer(s,a){if(a.signals.yes)s.answers.push('yes');else if(a.signals.no)s.answers.push('no');else if(a.facts.wifi)s.answers.push('wifi');else if(a.facts.sim)s.answers.push('sim');else if(a.facts.receiptBlank)s.answers.push('blank');else if(a.signals.failed)s.answers.push('failed');s.answers=s.answers.slice(-10);}
 function fail(s,steps){s.failed=[...new Set([...s.failed,...steps])].slice(-10);}
 function first(group,user,s,a){const q=a.text,failed=explicitFailure(q)||a.signals.failed&&/da |roi|van/.test(q);
  if(a.facts.unsafeHardware){s.topic='power';s.risk='high';s.pendingVerification=true;remember(group,user,s,'battery-safe');return 'Ngừng sử dụng thiết bị có màn hình vỡ hoặc ngấm nước; không cắm sạc, bật thử hay tự tháo máy. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra thiết bị không ạ?';}
  if(a.facts.hotBattery){s.topic='battery';s.risk='high';s.pendingVerification=true;remember(group,user,s,'battery-safe');return 'Ngừng sử dụng và ngừng sạc máy đang nóng bất thường hoặc pin phồng; không tự tháo, chọc pin hay khởi động thử. Để máy xa vật dễ cháy nếu có thể làm an toàn. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra thiết bị không ạ?';}
  if(FINANCIAL.has(s.topic))return financial(group,user,s,a,true);
  if(s.topic==='printer'){
   if(a.facts.receiptBlank||/\b(?:in (?:bill )?mo|thieu chu|mat chu)\b/.test(q)){
    remember(group,user,s,'printer-type',['paper-orientation']);
    if(failed){fail(s,['paper-orientation']);return offer(group,user,s,'Đã kiểm tra chiều giấy mà vẫn trắng/mờ thì không lặp lại bước đó; cần kiểm tra giấy nhiệt tương thích và bộ phận in.');}
    return 'Giấy chạy nhưng trắng/mờ thường cần kiểm tra loại giấy nhiệt và chiều mặt in theo hướng dẫn đúng dòng máy. Anh/chị đã kiểm tra hai điểm này chưa? Nếu vừa thanh toán, thiếu chữ trên bill không xác định được kết quả giao dịch.';
   }
   if(/ket giay|khong (?:day|chay|ra).*giay/.test(q)){
    remember(group,user,s,'printer-type',['printer-check']);
    if(failed){fail(s,['printer-check']);return offer(group,user,s,'Giấy vẫn kẹt hoặc không đẩy sau khi đã kiểm tra cuộn giấy: không kéo mạnh hay tự tháo bộ phận in; cần hỗ trợ kỹ thuật.');}
    return 'Nếu có giấy kẹt, không kéo mạnh hoặc tự tháo máy. Khi không có giao dịch đang xử lý, kiểm tra cuộn giấy và nắp máy theo hướng dẫn của dòng máy. Giấy có bị kẹt hay hoàn toàn không chạy ra ạ?';
   }
   remember(group,user,s,'paper-checked',['paper-orientation']);
   if(failed){fail(s,['paper-orientation']);return 'Em ghi nhận đã kiểm tra giấy và nắp máy; mình không làm lại bước đó. Giấy không chạy ra hay chạy ra nhưng trắng không có chữ ạ?';}
   return 'Máy không in bill: kiểm tra giấy nhiệt đúng chiều và nắp máy đã đóng kín. Giấy không chạy ra hay chạy ra nhưng trắng ạ? Không thu tiền lại chỉ vì chưa in được hóa đơn.';
  }
  if(s.topic==='freeze'){
   if(a.facts.inFlight){s.risk='high';s.pendingVerification=true;remember(group,user,s,'payment-history',['history-check']);return 'Máy đang treo lúc thanh toán: chưa cho khách thanh toán lại và chưa khởi động máy. Chưa thể xác nhận kết quả giao dịch. Khách có thông báo trừ tiền, và lịch sử POS/Portal có giao dịch tương ứng không ạ?';}
   if(failed){fail(s,['restart-safe']);return offer(group,user,s,'Em ghi nhận máy vẫn treo sau bước đã thử; không yêu cầu khởi động lại nữa.');}
   remember(group,user,s,'freeze-location');return 'Máy POS bị treo: trước hết cần biết có giao dịch đang xử lý không để tránh thanh toán trùng. Máy đứng ở màn hình chính hay đang thanh toán ạ?';
  }
  if(s.topic==='power'||s.topic==='battery'){
   remember(group,user,s,'power-charge',['charger-check']);
   if(failed){fail(s,['charger-check']);return offer(group,user,s,'Đã thử bộ sạc mà máy vẫn không lên thì không lặp lại; cần kiểm tra cáp/nguồn và thiết bị đúng dòng máy.');}
   return 'Máy không lên nguồn hoặc sạc không vào: nếu không nóng bất thường/phồng pin, kiểm tra cáp, bộ sạc tương thích và ổ điện. Khi cắm sạc có đèn hoặc biểu tượng pin không ạ? Không tự tháo máy.';
  }
  if(s.topic==='network'){
   if(failed){fail(s,[a.facts.sim?'sim-check':'wifi-check']);return offer(group,user,s,'Em ghi nhận đã thử kết nối lại/khởi động mà vẫn lỗi; không lặp lại bước đó. Có thể kiểm tra bằng Wi-Fi/hotspot hoặc SIM/4G được phép dùng để phân biệt lỗi mạng và lỗi POS.');}
   if(a.facts.sim){remember(group,user,s,'sim-signal',['sim-check']);return 'Máy dùng SIM/4G: kiểm tra biểu tượng sóng và trạng thái kết nối theo hướng dẫn thiết bị; không tự sửa cấu hình nhà mạng. Hiện có cột sóng/4G hay báo không có dịch vụ ạ? '+payments;}
   if(a.facts.wifi){remember(group,user,s,'wifi-other',['wifi-check']);return 'Với Wi-Fi, kiểm tra điện thoại cùng mạng có truy cập được không để phân biệt lỗi mạng và lỗi POS. Không gửi mật khẩu Wi-Fi trong nhóm. '+payments;}
   remember(group,user,s,'network-mode');return 'Máy mất mạng đang dùng Wi-Fi hay SIM/4G ạ? '+payments;
  }
  if(s.topic==='qr'){
   remember(group,user,s,'qr-stage',['qr-check']);return 'QR đang lỗi ở bước không hiện mã hay khách đã quét nhưng POS chưa báo kết quả? Nếu đã quét, kiểm tra lịch sử POS/Portal trước; chưa yêu cầu khách quét hoặc thanh toán lại.';
  }
  if(s.topic==='card'){
   remember(group,user,s,'card-method',['card-check']);return 'Thẻ không nhận ở thao tác chạm, cắm chip hay quẹt từ ạ? Kiểm tra thông báo màn hình theo hướng dẫn của dòng máy, không gửi số thẻ/PIN. Nếu đã xử lý giao dịch, chưa thử thu tiền lại khi chưa xác minh kết quả.';
  }
  if(s.topic==='portal'){
   remember(group,user,s,'portal-filters',['filters-check']);return 'Với Merchant Portal, kiểm tra bộ lọc ngày và chi nhánh/nguồn POS-QR đúng giao dịch đang xem. Giao dịch tương ứng có trên lịch sử POS không ạ? Thiếu trên Portal chưa chứng minh giao dịch thất bại.';
  }
  return null;
 }
 function financial(group,user,s,a,isFirst=false){
  const q=a.text;
  s.risk='high';s.pendingVerification=true;
  const caution=payments;
  if(s.topic==='duplicate'){
   if(!isFirst)return offer(group,user,s,'Chưa nên tự hoàn/hủy một giao dịch trước khi xác minh có hai lần thu thực tế hay chỉ trùng thông báo. Cần đối chiếu hai thời điểm/số tiền và lịch sử POS/Portal; không cung cấp số thẻ trong nhóm.');
   remember(group,user,s,'duplicate-history',['history-check']);return 'Khách báo trừ hai lần: cần phân biệt hai giao dịch thực tế với thông báo lặp. Kiểm tra lịch sử POS/Portal có một hay hai giao dịch tương ứng; chưa thu thêm hoặc tự hoàn/hủy khi chưa xác minh. Anh/chị thấy một hay hai giao dịch ạ?';
  }
  if(['refund','void','reversal'].includes(s.topic)){
   const distinctions='Hủy (Void), hoàn tiền (Refund) và đảo giao dịch (Reversal) là các nghiệp vụ khác nhau; quyền thao tác phụ thuộc trạng thái thực tế và đơn vị xử lý.';
   if(!isFirst||/khac nhau|nhan tien|hoan chua|da hoan|tien.*ve/.test(q)){
    remember(group,user,s,'refund-status',['bank-review']);return offer(group,user,s,distinctions+' Em chưa có dữ liệu để xác nhận tiền đã hoàn/đã chi trả hay cam kết thời gian tiền về; cần kiểm tra trạng thái và đối chiếu POS/Portal.');
   }
   remember(group,user,s,s.topic==='reversal'?'reversal-status':'refund-kind');return distinctions+' Em không thực hiện hoàn/hủy và chưa thể xác nhận tiền đã về. Anh/chị đang muốn hủy giao dịch vừa thực hiện, hoàn giao dịch trước đó, hay kiểm tra thông báo Reversal ạ?';
  }
  if(s.topic==='settlement'){
   if(!isFirst)return offer(group,user,s,'Em chưa truy cập tài khoản hay dữ liệu ngân hàng nên không thể xác nhận tiền đã về hoặc hẹn thời điểm. Cần đối chiếu kỳ quyết toán, số tiền và trạng thái chi trả trên Portal.');
   remember(group,user,s,'settlement-status',['history-check']);return 'Giao dịch thành công, quyết toán và tiền đã chi trả là các trạng thái cần đối chiếu riêng. Em chưa thể xác nhận lịch tiền về. Anh/chị kiểm tra kỳ đối soát và trạng thái chi trả trên Portal; đang thiếu cả kỳ hay một giao dịch ạ?';
  }
  if(!isFirst){
   if(/qu[e]?t lai|tra lai lan nua|thanh toan lai|tra tien lai/.test(q))return offer(group,user,s,'Chưa cho khách thanh toán lại để tránh thu trùng khi kết quả lần trước chưa rõ. Cần xác minh lịch sử POS/Portal và đối chiếu thông báo ngân hàng.');
   if(a.facts.debit==='no')return offer(group,user,s,'Chưa có thông báo trừ tiền cũng chưa khẳng định giao dịch thất bại. Cần kiểm tra lịch sử POS/Portal; chưa thu tiền lại khi chưa xác minh.');
   if(a.signals.yes||/co (?:giao dich|trong lich su)|thay.*giao dich/.test(q)&&!/khong|chua/.test(q))return offer(group,user,s,'Có giao dịch trong lịch sử vẫn cần đối chiếu đúng thời điểm, số tiền và trạng thái; em chưa thể xác nhận kết quả từ tin nhắn.');
   return offer(group,user,s,'Chưa thấy hoặc chưa xác định được giao dịch thì cần tra soát, không suy ra đã thành công/thất bại và chưa thu tiền lại.');
  }
  remember(group,user,s,'payment-history',['history-check']);
  return (a.facts.debit==='no'?'Khách chưa có thông báo trừ tiền cũng chưa đủ để kết luận giao dịch thất bại. ':'Thông báo trừ tiền hoặc chuyển khoản chưa đủ để xác nhận kết quả giao dịch. ')+caution+' Kiểm tra lịch sử POS/Portal đúng thời điểm và số tiền. Giao dịch có hiển thị không ạ?';
 }
 function reply(group,user,input){
  let s=memory.get(group,user);const a=analyze(input,{topic:s?.topic,question:s?.currentQuestion});const q=a.text;
  if(!q)return null;
  if(a.signals.cancel||a.signals.restart){clear(group,user);return 'Đã kết thúc phiên hỗ trợ. Anh/chị mô tả sự cố mới khi cần nhé.';}
  if(s?.currentQuestion==='battery-safe'){
   const stop=s.topic==='power'?'Ngừng sử dụng thiết bị hư hỏng/ngấm nước, không cắm sạc, bật thử hoặc tự tháo.':'Ngừng sử dụng máy nóng bất thường/phồng pin; không cắm sạc hoặc khởi động thử.';
   if(a.signals.consent||a.signals.yes||/^(dong y|dong y chuyen ops|chuyen giup)$/.test(q)){s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:s.topic==='power'?'Thiết bị hư hỏng/ngấm nước: cần kiểm tra an toàn':'Pin nóng bất thường/phồng: cần kiểm tra an toàn'};}
   if(a.signals.no||/khong dong y/.test(q))return 'Em chưa chuyển OPS. '+stop;
   return stop+' Anh/chị đồng ý để em chuẩn bị yêu cầu hỗ trợ thiết bị không ạ?';
  }
  const explicitResolved=/^(?:binh thuong roi|may binh thuong roi|on roi|ok roi|het loi roi|in duoc roi|da xu ly xong|duoc roi)(?: em| anh| chi| cam on| cam on em)?$/.test(q);
  if(s&&explicitResolved){
   if(s.pendingVerification&&!s.interruptions.length)return offer(group,user,s,'Em ghi nhận thiết bị có thể đã hoạt động, nhưng giao dịch trước đó vẫn chưa xác minh. Kiểm tra POS/Portal và chưa thu tiền lại; em không xác nhận kết quả chỉ từ tin nhắn.');
   const frame=s.interruptions.at(-1);clear(group,user);
   if(frame){const rest=initial(frame.topic);Object.assign(rest,frame,{previousQuestions:[],answers:[],interruptions:s.interruptions.slice(0,-1),pendingVerification:FINANCIAL.has(frame.topic)||frame.risk==='high',consent:false});memory.set(group,user,rest);return `Tốt rồi, em ghi nhận vấn đề vừa rồi đã được xử lý. Mình còn ${TOPICS[frame.topic]} trước đó; anh/chị muốn tiếp tục phần đó không ạ?`+(frame.risk==='high'?' Giao dịch trước đó vẫn cần xác minh trên POS/Portal; chưa thu tiền lại.':'');}
   return 'Tốt rồi, em ghi nhận sự cố đã được xử lý. Nếu có vấn đề mới, anh/chị cứ mô tả nhé.';
  }
  if(!s&&q==='van chua duoc')return 'Anh/chị đang chưa xử lý được lỗi in bill, kết nối hay giao dịch thanh toán ạ? Em cần biết bước vừa thử để không yêu cầu làm lại.';
  // Burning/swollen battery is a stop condition even when other work is active.
  if(a.facts.hotBattery||a.facts.unsafeHardware){const safe=initial(a.facts.unsafeHardware?'power':'battery');safe.risk='high';safe.pendingVerification=true;remember(group,user,safe,'battery-safe');return first(group,user,safe,a);}
  let topic=a.primary;
  if(s?.topic==='duplicate'&&['refund','void'].includes(topic))topic='duplicate';
  if(s&&['refund','void','reversal'].includes(s.topic)&&['refund','void','reversal','missing'].includes(topic))topic=s.topic;
  if(s?.topic==='settlement'&&['portal','missing'].includes(topic))topic='settlement';
  if(s?.topic==='network'&&topic==='power'&&explicitFailure(q))topic='network';
  if(s&&s.pendingVerification&&['freeze','printer','network','card','qr'].includes(topic)&&!/^\b(?:doi van de|van de khac|khong phai|gio may)\b/.test(q))topic=s.topic;
  if(s&&topic&&topic!==s.topic&&a.intents[0]?.score>=5){
   const interrupts=s.topic?[...s.interruptions,{topic:s.topic,currentQuestion:s.currentQuestion,attempted:s.attempted,failed:s.failed,risk:s.risk}].slice(-2):s.interruptions;
   s=initial(topic,{interruptions:interrupts});return first(group,user,s,a);
  }
  if(!s){
   if(!topic&&/\b(?:may|pos)\b/.test(q)&&/\b(?:loi|khong hoat dong|van de)\b/.test(q)){const clarification=initial(null);remember(group,user,clarification,'clarify');return 'Máy đang lỗi nguồn, in bill, kết nối hay giao dịch thanh toán ạ? Anh/chị mô tả thông báo trên màn hình, không gửi dữ liệu thẻ hoặc mã bảo mật nhé.';}
   if(!topic)return null;
   // Conflicting nonfinancial hardware intents need a concrete clarification.
   if(a.ambiguous&&!FINANCIAL.has(topic)&&!a.facts.inFlight&&a.intents.length>1&&topic!=='battery'&&!a.intents.every(i=>['power','battery'].includes(i.id))){
    s=initial(topic);remember(group,user,s,'clarify');return 'Em thấy hơn một vấn đề. Máy đang lỗi nguồn, kết nối hay in hóa đơn là chính ạ? Nếu có giao dịch chưa rõ kết quả, mình ưu tiên kiểm tra giao dịch trước.';
   }
   s=initial(topic);
   const knowledge=retriever(input,{topic});
   if(knowledge.status==='matched'&&knowledge.item?.answer&&knowledge.provenance){remember(group,user,s,'clarify');return `${knowledge.item.answer}\nNguồn đã duyệt: ${knowledge.provenance.reference}`;}
   return first(group,user,s,a);
  }
  recordAnswer(s,a);
  if(!s.topic){remember(group,user,s,'clarify');return 'Em chưa có đủ chi tiết để chọn bước an toàn. Máy lỗi nguồn, in hóa đơn, kết nối hay đang xử lý giao dịch ạ?';}
  if(s.currentQuestion==='offer-consent'){
   if(a.signals.no||/^(?:khong|chua|thoi).*?(?:dong y|chuyen|ops)?$/.test(q)){
    s.consent=false;remember(group,user,s,'payment-verify');return 'Em chưa chuyển yêu cầu hoặc thu thập thông tin cửa hàng. Khi cần, anh/chị có thể nói rõ “đồng ý chuyển OPS”.';
   }
   if(a.signals.consent||/^(?:dong y|dong y chuyen ops|chuyen giup|nho em chuyen|cho phep chuyen ops)$/.test(q)){
    s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; đã thử hướng dẫn hoặc cần xác minh, khách đồng ý chuyển hỗ trợ'};
   }
   if(/^ok(?: em)?$/.test(q))return 'Em chưa coi “ok” là đồng ý chuyển hỗ trợ. Nếu muốn chuyển CS/OPS, anh/chị xác nhận rõ “đồng ý chuyển OPS” nhé.';
   return 'Em đã ghi nhận bước vừa thử; không yêu cầu lặp lại. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra không ạ?';
  }
  if(s.currentQuestion==='payment-verify'&&s.consent===false){
   if(a.signals.consent||/^(dong y chuyen ops|dong y|chuyen giup)$/.test(q)){s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; khách chủ động đồng ý chuyển hỗ trợ'};}
   memory.set(group,user,s);return 'Em chưa chuyển hỗ trợ. Mình giữ nguyên yêu cầu kiểm tra kết quả thực tế; khi muốn chuyển CS/OPS, anh/chị xác nhận rõ nhé.';
  }
  if(FINANCIAL.has(s.topic))return financial(group,user,s,a);
  if(s.topic==='freeze'){
   if(s.currentQuestion==='payment-history')return financial(group,user,s,a);
   if(a.facts.inFlight){s.pendingVerification=true;s.risk='high';remember(group,user,s,'payment-history',['history-check']);return 'Máy treo lúc thanh toán: chưa khởi động hoặc cho khách thanh toán lại. Kiểm tra thông báo trừ tiền và lịch sử POS/Portal trước; hiện có thông báo trừ tiền không ạ?';}
   if(explicitFailure(q)||a.signals.failed){fail(s,['restart-safe']);return offer(group,user,s,'Em ghi nhận máy vẫn treo sau bước đã thử; không yêu cầu khởi động lại hoặc làm lại từ đầu.');}
   if(/man hinh chinh|khong.*giao dich|khong.*thanh toan/.test(q)){remember(group,user,s,'freeze-location',['restart-safe']);return 'Nếu chắc chắn không có giao dịch đang xử lý, có thể khởi động lại theo hướng dẫn đúng dòng máy. Anh/chị đã thử chưa và máy còn đứng không ạ?';}
   return offer(group,user,s,'Để tránh thao tác lặp hoặc ảnh hưởng giao dịch, cần xác định màn hình và tình trạng thiết bị.');
  }
  if(s.topic==='printer'){
   if(a.facts.receiptBlank||/giay.*trang|khong.*chu|\bmo\b/.test(q)){
    if(explicitFailure(q)||s.failed.includes('paper-orientation')){fail(s,['paper-orientation']);return offer(group,user,s,'Đã kiểm tra chiều giấy mà vẫn trắng/mờ: không lặp lại. Cần kiểm tra giấy nhiệt tương thích và bộ phận/đầu in.');}
    remember(group,user,s,'printer-type',['paper-orientation']);return 'Giấy chạy ra trắng thì kiểm tra đúng giấy nhiệt và mặt giấy tiếp xúc đầu in theo hướng dẫn dòng máy. Anh/chị đã kiểm tra chiều giấy chưa ạ?';
   }
   if(/khong (?:day|chay|ra).*giay|giay khong (?:day|chay|ra)|ket giay/.test(q)){
    fail(s,['printer-check']);return offer(group,user,s,'Giấy không đẩy hoặc bị kẹt sau bước kiểm tra: không kéo mạnh và không tự tháo bộ phận in; cần hỗ trợ thiết bị.');
   }
   if(explicitFailure(q)){
    fail(s,['paper-orientation']);
    if(s.currentQuestion==='printer-type'||s.failed.includes('paper-orientation'))return offer(group,user,s,'Em ghi nhận lỗi in vẫn còn sau các bước đã thử; cần hỗ trợ kiểm tra bộ phận in, không làm lại bước cũ.');
    fail(s,['paper-orientation']);remember(group,user,s,'printer-type');return 'Em ghi nhận đã kiểm tra giấy và nắp máy; không yêu cầu làm lại. Giấy không chạy ra hay chạy ra nhưng trắng không có chữ ạ?';
   }
   remember(group,user,s,'printer-type');return 'Để chọn bước tiếp theo, mình chỉ cần phân biệt giấy không chạy ra hay giấy ra trắng. Em giữ lại bước kiểm tra giấy/nắp đã hướng dẫn, không bắt đầu lại.';
  }
  if(s.topic==='network'){
   if(s.currentQuestion==='network-mode'){
    if(a.facts.sim){remember(group,user,s,'sim-signal',['sim-check']);return 'Với SIM/4G, kiểm tra biểu tượng sóng hoặc thông báo không có dịch vụ theo hướng dẫn dòng máy. Máy đang có sóng/4G hay không ạ?';}
    if(a.facts.wifi){remember(group,user,s,'wifi-other',['wifi-check']);return 'Với Wi-Fi, điện thoại cùng mạng có vào được không ạ? Không gửi mật khẩu Wi-Fi trong nhóm.';}
    remember(group,user,s,'clarify');return 'Mình cần xác định loại kết nối để tránh hướng dẫn sai: trên máy có biểu tượng Wi-Fi hay sóng SIM/4G ạ?';
   }
   if(s.currentQuestion==='sim-signal'&&/khong co wifi/.test(q)){remember(group,user,s,'sim-signal',['sim-check']);return offer(group,user,s,'Không có Wi-Fi thì mình không yêu cầu nhập mật khẩu. Với SIM/4G mất sóng, cần kiểm tra trạng thái dịch vụ và thiết bị qua kênh hỗ trợ.');}
   if(explicitFailure(q)||a.signals.failed||a.signals.no||/mat song|khong co dich vu/.test(q)){
    fail(s,[s.currentQuestion==='sim-signal'?'sim-check':'wifi-check']);return offer(group,user,s,'Kết nối vẫn lỗi sau bước đã thử; không quên mạng hay khởi động lại lần nữa. Nếu được phép, dùng hotspot/Wi-Fi hoặc SIM/4G khác để phân biệt lỗi đường truyền và lỗi POS.');
   }
   if(a.signals.yes||/dien thoai.*duoc/.test(q)){remember(group,user,s,'wifi-other',['wifi-check']);return 'Điện thoại dùng được cùng Wi-Fi nhưng POS không vào được: nếu chính sách cho phép, thử một hotspot/mạng được phép khác để khoanh vùng lỗi POS. Không đổi cấu hình nhà mạng hoặc thu tiền lại khi trạng thái giao dịch chưa rõ.';}
   return offer(group,user,s,'Em giữ lại tình trạng mạng đang kiểm tra, không yêu cầu làm lại bước cũ. Cần xác minh kết nối và thiết bị tiếp.');
  }
  if(s.topic==='power'||s.topic==='battery'){
   if(explicitFailure(q)||a.signals.failed||a.signals.no||/khong sang|khong vao|khong len/.test(q)){fail(s,['charger-check']);return offer(group,user,s,'Đã thử cáp/nguồn hoặc bộ sạc mà máy vẫn không lên/sạc không vào: không lặp lại và không tự tháo máy; cần hỗ trợ thiết bị.');}
   return offer(group,user,s,'Cần xác định biểu tượng sạc và nguồn phù hợp theo dòng máy; nếu chưa rõ, không thử bộ sạc lạ hoặc tự mở máy.');
  }
  if(s.topic==='portal'){
   if(explicitFailure(q)||a.signals.no||/van thieu|khong thay/.test(q)){fail(s,['filters-check']);return offer(group,user,s,'Đã kiểm tra bộ lọc mà vẫn lệch: cần đối chiếu lịch sử POS/Portal đúng ngày và chi nhánh, không tự kết luận trạng thái tiền.');}
   return offer(group,user,s,'Cần đối chiếu đúng nguồn POS/QR, ngày và chi nhánh; em không có dữ liệu hệ thống để xác nhận giao dịch hay quyết toán.');
  }
  if(s.topic==='qr'||s.topic==='card'){
   if(a.facts.inFlight||/da quet|khach quet|tru|dang xu ly/.test(q)){s.topic='debit';return financial(group,user,s,a,true);}
   if(explicitFailure(q)||a.signals.failed){fail(s,[s.topic==='qr'?'qr-check':'card-check']);return offer(group,user,s,'Lỗi vẫn còn sau bước đã thử; cần kiểm tra thông báo màn hình và đúng phương thức/dòng máy, không thử thanh toán liên tục.');}
   return offer(group,user,s,s.topic==='card'?'Em ghi nhận phương thức thẻ; không yêu cầu gửi số thẻ/PIN hay quẹt liên tục. Cần kiểm tra thông báo lỗi cụ thể.':'Cần xác định QR không hiển thị hay đã quét chưa có kết quả; không yêu cầu thanh toán lại khi kết quả chưa rõ.');
  }
  return null;
 }
 return {reply,clear,getContext,hasSession:(g,u)=>Boolean(memory.get(g,u)),shouldRespond:(input,{ongoing=false,explicit=false}={})=>ongoing||explicit||meaningful(input),shouldInterrupt};
}
module.exports={createEngine,...createEngine()};
