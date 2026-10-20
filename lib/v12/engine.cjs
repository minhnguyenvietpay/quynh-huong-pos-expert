'use strict';
// Local deterministic diagnostics. No inference API, network or merchant text persistence.
const {analyze,normalize}=require('./understanding.cjs');
const {createMemory}=require('./memory.cjs');
const retrieve=require('./retrieval.cjs');
const TOPICS={freeze:'máy POS bị treo',power:'máy không lên nguồn',battery:'pin và sạc',printer:'máy in hóa đơn',network:'kết nối mạng',qr:'thanh toán QR',card:'đọc thẻ',debit:'giao dịch chưa xác minh',missing:'giao dịch chưa hiển thị',duplicate:'nghi giao dịch trùng',refund:'yêu cầu hoàn tiền',void:'yêu cầu hủy giao dịch',reversal:'trạng thái đảo giao dịch',settlement:'quyết toán và chi trả',portal:'báo cáo Merchant Portal'};
const FINANCIAL=new Set(['debit','missing','duplicate','refund','void','reversal','settlement']);
const payments='Chưa yêu cầu khách thanh toán lại khi chưa xác minh kết quả trên POS/Portal.';
const legacyFailure=q=>/van (?:vay|loi|trang|do|treo|khong|chua)|thu roi|lam het|lam roi|da (?:thu|khoi dong|kiem tra|lap|lat|doi|ket noi|quen mang)|chua duoc|khong duoc|dung bao.*lai/.test(q);
function safetyKind(input){const a=analyze(String(input||'').slice(0,6000));return a.facts.unsafeHardware?'power':a.facts.hotBattery?'battery':null;}
function safetyAdvice(input){return safetyKind(input)?' Ngừng sử dụng và ngừng sạc thiết bị có dấu hiệu nguy hiểm; không bật thử hoặc tự tháo máy.':'';}
function createEngine({memory=createMemory(),retriever=retrieve}={}){
 const relevantAttempt=(q,topic)=>analyze(q).facts.previousAttempt===true&&q.split(/ nhung | van |,|;/).some(clause=>analyze(clause).facts.previousAttempt&&({printer:/giay|nap|mat in|giay nhiet/,network:/mang|wifi|sim|ket noi|hotspot/,freeze:/khoi dong|restart|bat lai/,power:/sac|cap|nguon|o dien/,battery:/sac|cap|nguon|o dien/,card:/the|chip|cham|quet/,qr:/qr|ma|ung dung/}[topic]||/$^/).test(clause));
 const explicitFailure=(q,topic)=>relevantAttempt(q,topic)&&legacyFailure(q);

 function getContext(group,user){return memory.get(group,user);}
 function clear(group,user){memory.delete(group,user);}
 function interruptSocial(group,user){
  const s=memory.get(group,user);if(!s)return null;
  s.consent=false;
  if(['offer-consent','battery-safe'].includes(s.currentQuestion)){s.lastQuestionContext=s.currentQuestion;s.currentQuestion='clarify-context';s.decision='clarify';}
  memory.set(group,user,s);return memory.get(group,user);
 }
 function revokeConsent(group,user){const s=memory.get(group,user);if(!s)return null;if(!s.pendingVerification){clear(group,user);return null;}s.consent=false;s.declined=true;s.refusal='cancelled';remember(group,user,s,'escalation-declined');return memory.get(group,user);}
 function noteSafetyStop(group,user,kind){
  if(!['battery','power'].includes(kind))return null;
  const prior=memory.get(group,user),safe=initial(kind);
  const financial=prior?.pendingVerification&&(FINANCIAL.has(prior.topic)||prior.knownAnswers?.payment==='unverified'||prior.interruptions.some(f=>FINANCIAL.has(f.topic)||f.knownAnswers?.payment==='unverified'));
  if(financial){safe.knownAnswers.payment='unverified';safe.interruptions=[...(prior.interruptions||[]),{topic:prior.topic,currentQuestion:prior.currentQuestion,attempted:prior.attempted,failed:prior.failed,risk:prior.risk,knownAnswers:prior.knownAnswers}].slice(-2);}
  safe.risk='high';safe.pendingVerification=true;remember(group,user,safe,'battery-safe');return memory.get(group,user);
 }
 function meaningful(input){const a=analyze(input);if(/\bpos\b/.test(a.text)&&/\b(?:loi|khong hoat dong|van de)\b/.test(a.text))return true;return Boolean(a.primary&&(/\b(?:may|pos|pin|khach|giao dich|wifi|sim|4g|hoa don|giay|bill|qr|the|portal)\b/.test(a.text)||a.intents[0]?.score>=9));}
 function shouldInterrupt(group,user,raw){const a=analyze(raw);return meaningful(raw)&&/\b(?:loi|khong|chua|mat|bi|nong|phong|treo|trang|het|sac|do)\b/.test(a.text)&&!/^cua hang\b/.test(a.text);}
 function initial(topic,prior){return {topic,currentQuestion:null,previousQuestions:[],answers:[],attempted:[],failed:[],risk:FINANCIAL.has(topic)?'high':'unknown',pendingVerification:FINANCIAL.has(topic),consent:false,knownAnswers:FINANCIAL.has(topic)?{payment:'unverified'}:{},tried:[],declined:false,refusal:'none',decision:'diagnose',lastQuestionContext:null,interruptions:prior?.interruptions||[]};}
 function remember(group,user,s,question,attempt=[]){s.previousQuestions=[...s.previousQuestions,...(s.currentQuestion?[s.currentQuestion]:[])].slice(-10);s.lastQuestionContext=s.currentQuestion;s.currentQuestion=question;s.decision=question==='offer-consent'?'offer-consent':question==='escalation-declined'?'declined':'diagnose';s.attempted=[...new Set([...s.attempted,...attempt])].slice(-10);memory.set(group,user,s);}
 function offer(group,user,s,reason){if(s.declined){memory.set(group,user,s);return reason+' Em chưa chuyển hỗ trợ và không hỏi lại đồng ý.';}remember(group,user,s,'offer-consent');return `${reason} Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?`;}
 function recordAnswer(s,a){capture(s,a);if(a.signals.yes)s.answers.push('yes');else if(a.signals.no)s.answers.push('no');else if(a.facts.wifi)s.answers.push('wifi');else if(a.facts.sim)s.answers.push('sim');else if(a.facts.receiptBlank)s.answers.push('blank');else if(a.signals.failed)s.answers.push('failed');s.answers=s.answers.slice(-10);}
 function fail(s,steps){s.tried=[...new Set([...s.tried,...steps])].slice(-10);s.failed=[...new Set([...s.failed,...steps])].slice(-10);}
 function capture(s,a){
  s.knownAnswers||={};s.tried||=[];const q=a.text;
  if(/chip|cam the/.test(q))s.knownAnswers.cardMethod='chip';else if(/cham|contactless/.test(q))s.knownAnswers.cardMethod='contactless';else if(/quet tu|quet the/.test(q))s.knownAnswers.cardMethod='swipe';
  const oldConnection=s.knownAnswers.connection;
  if(/(?:chuyen|doi).*sang wifi/.test(q))s.knownAnswers.connection='wifi';
  else if(/(?:chuyen|doi).*sang (?:sim|4g)/.test(q))s.knownAnswers.connection='sim';
  else if(a.facts.sim&&!/khong (?:co |dung )?(?:sim|4g)/.test(q))s.knownAnswers.connection='sim';
  else if(a.facts.wifi&&!/khong (?:co |dung )?wifi/.test(q))s.knownAnswers.connection='wifi';
  if(oldConnection&&oldConnection!==s.knownAnswers.connection)delete s.knownAnswers.phoneWifi;
  if(/dien thoai/.test(q))s.knownAnswers.phoneWifi=(()=>{const phone=q.split(/ nhung | con pos | pos /).find(c=>/dien thoai/.test(c))||q;return /khong|mat mang|cung loi|cung mat|cung.*loi/.test(phone)?'failed':/duoc|internet|co mang|van vao|binh thuong|vao mang lai roi/.test(phone)?'working':'unknown';})();
  if(/het giay|khong con giay|khong co (?:cuon )?giay/.test(q))s.knownAnswers.paper='empty';
  else if(a.facts.receiptBlank||/giay.*trang|khong co chu/.test(q)||/\bchu\b.*\b(?:mo|nhat)\b|\b(?:mo|nhat)\b.*\bchu\b/.test(q))s.knownAnswers.paper=/mo|nhat/.test(q)?'faint':'blank';
  if(/(?:giay.*khong.*(?:chay|ra|day)|khong.*(?:chay|day|ra).*giay)/.test(q))s.knownAnswers.paper='not-feeding';
  if(/ket giay|giay.*(?:ket|mac)/.test(q))s.knownAnswers.paper='stuck';
  if(a.facts.inFlight)s.knownAnswers.location='processing';else if(/man hinh chinh/.test(q))s.knownAnswers.location='main';
  if(a.facts.debit==='yes')s.knownAnswers.payment='merchant-reported';
  if(relevantAttempt(q,s.topic)){const step=s.topic==='printer'?'paper-orientation':s.topic==='network'?(s.knownAnswers.connection==='sim'?'sim-check':'wifi-check'):s.topic==='freeze'?'restart-safe':['power','battery'].includes(s.topic)?'charger-check':null;if(step)s.tried=[...new Set([...s.tried,step])].slice(-10);}
 }
 function definition(q){
  if(!/(?:la gi|khac nhau|khac .*the nao|nghia la|giai thich|phan biet)/.test(q))return null;
  if(/authorization|capture/.test(q))return 'Authorization là bước xin chấp thuận/ủy quyền của đơn vị phát hành; capture là bước ghi nhận thu tiền theo cơ chế xử lý. Một bước được chấp thuận không tự xác nhận đã chi trả cho cửa hàng. Quy trình cụ thể cần đối chiếu hệ thống và đơn vị xử lý.';
  if(/payout/.test(q))return 'Payout là chi trả cho đơn vị chấp nhận thanh toán (cửa hàng) theo dữ liệu và quy trình đối soát. Trạng thái giao dịch khác với trạng thái chi trả; em chưa có dữ liệu để xác nhận tiền đã về hoặc thời hạn cụ thể.';
  if(/refund|void|reversal|hoan tien|huy giao dich|dao giao dich/.test(q))return 'Hoàn tiền (Refund), hủy giao dịch (Void) và đảo giao dịch (Reversal) là các khái niệm khác nhau. Tên trạng thái không xác nhận tiền đã về; điều kiện thao tác phải kiểm tra trên hệ thống và theo đơn vị xử lý. Em không tự thực hiện hoàn/hủy hoặc cam kết thời gian.';
  if(/settlement|payout|quyet toan|doi soat/.test(q))return 'Quyết toán (settlement) và chi trả (payout) cần phân biệt với trạng thái giao dịch. Báo cáo phải được đối chiếu với dữ liệu thực tế; em không xác nhận tiền đã về hay hẹn thời gian chỉ từ tên trạng thái.';
  return null;
 }
 function nextDiagnostic(group,user,s,a){const q=a.text;capture(s,a);const known=s.knownAnswers;
  if(s.topic==='printer'){
   if(/^(?:van vay|van the|y nhu cu|khong thay doi)$/.test(q)&&s.currentQuestion==='printer-type'){remember(group,user,s,'receipt-paper');return 'Em chưa đủ thông tin để chọn bước khác. Anh/chị đã kiểm tra giấy nhiệt đúng chiều và nắp máy chưa, hay chưa thực hiện? Không cần thử in liên tục.';}
   if(s.knownAnswers.paper==='empty'){remember(group,user,s,'receipt-paper');return 'Máy hết giấy: lắp cuộn giấy nhiệt tương thích, đúng chiều và đóng nắp theo hướng dẫn dòng máy; không tạo giao dịch mới để thử in. Giấy đã chạy lại chưa ạ?';}
   if(relevantAttempt(q,s.topic)&&!a.signals.failed){remember(group,user,s,'printer-type');return 'Em ghi nhận bước giấy vừa thực hiện; hiện chưa có kết quả nên chưa coi là thất bại. Bản in đã có chữ, còn trắng hay mờ ạ?';}
   if(relevantAttempt(q,s.topic)&&a.signals.failed){fail(s,['paper-orientation']);return offer(group,user,s,'Em ghi nhận bước kiểm tra giấy/nắp đã thực hiện nhưng bản in còn trắng/mờ hoặc kẹt; không kéo mạnh hay tự tháo bộ phận in, không làm lại bước đó.');}
   if(known.paper==='blank'||known.paper==='faint'){remember(group,user,s,'printer-type',['paper-orientation']);return 'Bill có chữ mờ/nhạt hoặc giấy trắng vẫn là lỗi in, chưa coi đã xử lý xong. Kiểm tra đúng giấy nhiệt và mặt in theo hướng dẫn dòng máy; anh/chị đã thử bước này chưa?';}
   if(known.paper==='not-feeding'||known.paper==='stuck'){remember(group,user,s,'receipt-paper',['printer-check']);return 'Giấy không chạy hoặc bị kẹt: khi không có giao dịch đang xử lý, kiểm tra cuộn giấy và nắp theo hướng dẫn dòng máy. Không kéo mạnh hoặc tự tháo bộ phận in. Anh/chị đã kiểm tra giấy/nắp chưa?';}
   remember(group,user,s,'printer-type');return 'Mình phân biệt thêm để chọn đúng bước: giấy không chạy ra, hay giấy chạy ra nhưng trắng/mờ ạ? Chưa có bằng chứng anh/chị đã thử bước kiểm tra nên em không tự ghi là đã thử.';
  }
  if(s.topic==='network'){
   if(s.currentQuestion==='network-localize'&&a.facts.previousAttempt&&a.signals.failed){fail(s,[known.connection==='sim'?'sim-check':'wifi-check']);return offer(group,user,s,'Em ghi nhận anh/chị đã thử nhưng kết nối vẫn lỗi; không yêu cầu lặp lại bước mạng vừa hướng dẫn. Cần ghi rõ bước đã thử và thông báo lỗi hiện tại để người hỗ trợ kiểm tra đúng phạm vi.');}
   if(/dung hoi lai|khong hoi lai|da noi.*wifi/.test(q))return offer(group,user,s,'Em đã ghi nhận thông tin Wi-Fi và bước mạng trước đó; không hỏi lại hay yêu cầu thử lại cùng bước. Nếu lỗi còn tồn tại thì cần kiểm tra qua kênh hỗ trợ được phép.');
   if(relevantAttempt(q,s.topic)&&a.signals.failed&&!/dien thoai.*(?:vao mang lai roi|binh thuong|duoc)|chuyen.*sang/.test(q))return offer(group,user,s,'Kết nối vẫn lỗi sau thao tác vừa báo; không quên mạng hoặc khởi động lại lần nữa. Cần phân biệt dịch vụ SIM/4G và lỗi mạng Wi-Fi/POS.');
   if(known.connection==='sim'){
    remember(group,user,s,'network-localize',['sim-check']);return /khong co dich vu|mat song|yeu|mot vach/.test(q)?'SIM/4G không có dịch vụ hoặc sóng yếu: kiểm tra thông báo dịch vụ theo hướng dẫn dòng máy, không tự đổi cấu hình nhà mạng. Chỗ khác được phép dùng trong cửa hàng có sóng tốt hơn không ạ?':'Máy có sóng/biểu tượng 4G nhưng chưa kết nối được thì cần phân biệt tín hiệu với dịch vụ dữ liệu SIM. Kiểm tra thông báo kết nối của ứng dụng và trạng thái dịch vụ qua kênh được phép.';
   }
   if(known.phoneWifi==='failed'){
    remember(group,user,s,'network-localize',['wifi-check']);return 'Điện thoại cùng Wi-Fi cũng mất mạng thì ưu tiên kiểm tra đường truyền chung/bộ phát (router), không quy ngay lỗi POS. Kiểm tra đèn kết nối của bộ phát hoặc kênh mạng nội bộ được phép; chưa thanh toán lại khi giao dịch chưa rõ kết quả.';
   }
   if(known.phoneWifi==='working'){
    remember(group,user,s,'network-localize',['wifi-check']);return 'Điện thoại cùng mạng có internet nhưng POS chưa kết nối: nếu được phép, thử hotspot hoặc mạng khác để khoanh vùng lỗi POS. Không chia sẻ mật khẩu trong nhóm và không thay cấu hình nhà mạng.';
   }
   if(known.connection==='wifi'){
    remember(group,user,s,'wifi-other');return 'Mình đang kiểm tra Wi-Fi: điện thoại cùng mạng có internet hay cũng mất kết nối ạ? Câu trả lời này giúp phân biệt đường truyền chung với POS.';
   }
   remember(group,user,s,'network-mode');return 'Để hướng dẫn đúng, máy đang dùng Wi-Fi hay SIM/4G ạ?';
  }
  if(s.topic==='card'){
   if(relevantAttempt(q,s.topic))return offer(group,user,s,'Đã thử đúng phương thức thẻ mà vẫn lỗi thì cần kiểm tra thông báo thiết bị, không quẹt liên tục hoặc gửi số thẻ/PIN.');
   remember(group,user,s,'card-message',['card-check']);
   return known.cardMethod==='chip'?'Với cắm chip, kiểm tra thao tác và hướng thẻ theo hướng dẫn dòng máy; không tự tháo khe đọc. Máy báo thông báo lỗi gì sau khi cắm chip ạ?':/cham|contactless/.test(q)?'Với chạm thẻ, kiểm tra vị trí chạm theo hướng dẫn dòng máy và thông báo đang hiển thị. Nếu giao dịch đã xử lý, chưa chạm lại khi chưa xác minh kết quả.':'Mình đang phân biệt quẹt từ, cắm chip và chạm thẻ; cho em biết phương thức cùng thông báo lỗi, không gửi số thẻ/PIN nhé.';
  }
  if(s.topic==='qr'&&/khong.*(?:hien|tao|co)|chua.*hien/.test(q)){
   remember(group,user,s,'qr-stage',['qr-check']);return 'QR chưa hiển thị/chưa tạo được: kiểm tra kết nối mạng và thông báo lỗi của ứng dụng theo dòng máy. Chưa có mã không phải bằng chứng về kết quả của một giao dịch khác; không yêu cầu khách quét lại khi còn giao dịch chưa rõ.';
  }
  if(['power','battery'].includes(s.topic)&&/co (?:den|bieu tuong)|den sac sang|co bieu tuong sac/.test(q)){
   remember(group,user,s,'power-charge',['charger-check']);return 'Đã ghi nhận có đèn/biểu tượng sạc nhưng màn hình chưa lên. Đối chiếu thao tác bật máy theo hướng dẫn đúng dòng máy và theo dõi thông báo màn hình; nếu nóng/phồng pin thì dừng, không tự tháo máy.';
  }
  return null;
 }
 function first(group,user,s,a){capture(s,a);const q=a.text,failed=explicitFailure(q,s.topic);
  if(a.facts.inFlight&&!a.facts.hotBattery&&!a.facts.unsafeHardware){s.topic='debit';return financial(group,user,s,a,true);}
  if(s.topic==='qr'&&/khong.*(?:tao|hien)|chua.*(?:tao|hien)/.test(q))return nextDiagnostic(group,user,s,a);
  if(['power','battery'].includes(s.topic)&&/co (?:den|bieu tuong)|den sac sang/.test(q))return nextDiagnostic(group,user,s,a);
  if(a.facts.unsafeHardware){s.topic='power';s.risk='high';s.pendingVerification=true;remember(group,user,s,'battery-safe');return 'Ngừng sử dụng thiết bị có màn hình vỡ hoặc ngấm nước; không cắm sạc, bật thử hay tự tháo máy. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra thiết bị không ạ?';}
  if(a.facts.hotBattery){s.topic='battery';s.risk='high';s.pendingVerification=true;remember(group,user,s,'battery-safe');return 'Ngừng sử dụng và ngừng sạc máy đang nóng bất thường hoặc pin phồng; không tự tháo, chọc pin hay khởi động thử. Để máy xa vật dễ cháy nếu có thể làm an toàn. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra thiết bị không ạ?';}
  if(FINANCIAL.has(s.topic))return financial(group,user,s,a,true);
  if(s.topic==='printer'){
   if(['stuck','not-feeding'].includes(s.knownAnswers.paper))return nextDiagnostic(group,user,s,a);
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
   if(/dang nhap|truy cap/.test(q)){remember(group,user,s,'clarify');return 'Không đăng nhập được Portal: kiểm tra đúng địa chỉ truy cập và thông báo lỗi. Dùng chức năng khôi phục chính thức hoặc liên hệ hỗ trợ qua kênh được phép; không gửi mật khẩu, OTP hoặc phiên đăng nhập trong nhóm.';}
   remember(group,user,s,'portal-filters',['filters-check']);return 'Với Merchant Portal, kiểm tra bộ lọc ngày và chi nhánh/nguồn POS-QR đúng giao dịch đang xem. Giao dịch tương ứng có trên lịch sử POS không ạ? Thiếu trên Portal chưa chứng minh giao dịch thất bại.';
  }
  return null;
 }
 function financial(group,user,s,a,isFirst=false){
  const q=a.text;
  s.risk='high';s.pendingVerification=true;
  const caution='Chưa khởi động lại máy khi giao dịch còn chưa xác minh. '+payments;
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
   if(!isFirst)return offer(group,user,s,'Em không truy cập dữ liệu ngân hàng và chưa có bằng chứng xác nhận chi trả. Cần đối chiếu kỳ quyết toán, số tiền và trạng thái chi trả trên Portal; em không hẹn thời điểm nhận tiền.');
   remember(group,user,s,'settlement-status',['history-check']);return 'Giao dịch thành công, quyết toán và tiền đã chi trả là các trạng thái cần đối chiếu riêng. Em chưa thể xác nhận lịch tiền về. Anh/chị kiểm tra kỳ đối soát và trạng thái chi trả trên Portal; đang thiếu cả kỳ hay một giao dịch ạ?';
  }
  if(!isFirst){
   if(a.facts.debit==='yes'){remember(group,user,s,'payment-history',['history-check']);return 'Em ghi nhận khách báo đã trừ tiền, chưa xác nhận kết quả giao dịch. Kiểm tra đúng giao dịch trên lịch sử POS/Portal; chưa thanh toán lại để tránh thu trùng. Lịch sử đang hiển thị trạng thái gì ạ?';}
   if(/pending|processing|dang xu ly/.test(q))return offer(group,user,s,'Em ghi nhận anh/chị báo pending/đang xử lý, chưa xác nhận kết quả từ hệ thống. Tiếp tục đối chiếu đúng giao dịch trên POS/Portal, chưa thanh toán lại.');
   if(/qu[e]?t lai|tra lai lan nua|thanh toan lai|tra tien lai/.test(q))return offer(group,user,s,'Chưa cho khách thanh toán lại để tránh thu trùng khi kết quả lần trước chưa rõ. Cần xác minh lịch sử POS/Portal và đối chiếu thông báo ngân hàng.');
   if(a.facts.debit==='no')return offer(group,user,s,'Chưa có thông báo trừ tiền cũng chưa khẳng định giao dịch thất bại. Cần kiểm tra lịch sử POS/Portal; chưa thu tiền lại khi chưa xác minh.');
   if(a.signals.yes||/co (?:giao dich|trong lich su)|thay.*giao dich/.test(q)&&!/khong|chua/.test(q))return offer(group,user,s,'Có giao dịch trong lịch sử vẫn cần đối chiếu đúng thời điểm, số tiền và trạng thái; em chưa thể xác nhận kết quả từ tin nhắn.');
   return offer(group,user,s,'Chưa thấy hoặc chưa xác định được giao dịch thì cần tra soát, không suy ra đã thành công/thất bại và chưa thu tiền lại.');
  }
  remember(group,user,s,'payment-history',['history-check']);
  return (a.facts.debit==='no'?'Khách chưa có thông báo trừ tiền cũng chưa đủ để kết luận giao dịch thất bại. ':'Thông báo trừ tiền hoặc chuyển khoản chưa đủ để xác nhận kết quả giao dịch. ')+caution+' Kiểm tra lịch sử POS/Portal đúng thời điểm và số tiền. Giao dịch có hiển thị không ạ?';
 }
 function operationDetail(group,user,s,a){
  const q=a.text;let op=s?.knownAnswers?.operation;
  const save=(purpose,topic='portal')=>{if(!s)s=initial(topic);s.knownAnswers.operation=purpose;s.consent=false;remember(group,user,s,'clarify-context');op=purpose;};
  if(/(?:moi nhan ca|chua biet|huong dan)/.test(q)&&/thanh toan the/.test(q))save('card-use','card');
  else if(/huong dan.*(?:nhan )?thanh toan qr/.test(q))save('qr-use','qr');
  else if(/in lai|ban sao|xin lai bill|xin lai hoa don/.test(q))save('receipt-copy','printer');
  else if(/portal/.test(q)&&/dang nhap|khong vao trang|quay vong|cham|truy cap|quen mat khau|huong dan.*vao/.test(q))save('portal-access');
  else if(/cuoi ca.*doi chieu|so ban hang|tien mat/.test(q)&&!/tru tien/.test(q))save('reconcile');
  else if(/portal/.test(q)&&/bao cao|chi nhanh|hai may|thieu giao dich|loc|tong/.test(q)&&!/thanh cong/.test(q))save('portal-report');
  if(/(?:xem|kiem tra|tim).*lich su giao dich/.test(q)&&!a.facts.inFlight&&a.facts.debit!=='yes')return 'Để xem lịch sử giao dịch, dùng chức năng lịch sử trên POS hoặc Portal theo quyền được cấp; chọn đúng thời gian và đối chiếu phương thức, số tiền, trạng thái. Không cần gửi mã giao dịch hay dữ liệu khách hàng trong nhóm.';
  if(/khong co quyen|ho tro chinh thuc|doi lai.*mat khau/.test(q)&&/chi|em|quyen|mat khau/.test(q))return 'Em không có quyền đổi hoặc đặt lại mật khẩu. Dùng chức năng khôi phục trên địa chỉ Portal chính thức do đơn vị cung cấp, hoặc liên hệ quản trị viên/CS qua kênh đã được cửa hàng xác minh; không gửi mật khẩu hay OTP trong nhóm.';
  if(op==='card-use'&&/the|chip|kiem tra|khi xong/.test(q))return 'Trước thanh toán thẻ chip, đối chiếu đơn hàng và số tiền, thực hiện theo hướng dẫn đúng dòng POS và quyền thu ngân. Khách tự nhập PIN trên thiết bị, không đọc/gửi PIN. Sau thao tác, kiểm tra đúng số tiền, thời điểm và trạng thái giao dịch trong lịch sử POS/Portal; chưa thu lại nếu kết quả chưa rõ.';
  if(op==='qr-use'&&/qr|quet|doi chieu|ket thuc/.test(q))return 'Đối chiếu đơn hàng và số tiền trước khi hiển thị QR theo chức năng được cấp. Khách quét xong chưa xác nhận đã trả tiền: kiểm tra đúng số tiền, thời điểm và trạng thái giao dịch POS/Portal theo quy trình cửa hàng; không dựa riêng ảnh thông báo hoặc yêu cầu trả lại khi chưa rõ kết quả.';
  if(op==='receipt-copy'){
   if(/(?:khong|chua) (?:tim|thay)|van chua thay/.test(q))return 'Chưa tìm thấy giao dịch thì chưa có cơ sở in lại bản sao. Đối chiếu đúng khoảng ngày, cửa hàng và nguồn giao dịch trên POS/Portal; nếu vẫn không thấy thì cần xác minh qua kênh hỗ trợ, không tạo giao dịch mới để lấy bill.';
   if(/bill|hoa don|lich su|in|quet/.test(q))return 'Không quẹt thẻ lại hoặc thu tiền mới để in bản sao. Tìm đúng giao dịch trong lịch sử, đối chiếu thời điểm và số tiền rồi dùng chức năng in lại theo dòng máy/quyền được cấp nếu có; em chưa xác nhận kết quả tiền từ tin nhắn.';
  }
  if(op==='portal-access'){
   if(/phan nan|chua dong y|tu kiem tra|trang|truy cap|dang nhap|quay|cham|huong dan.*vao/.test(q))return 'Mình ưu tiên truy cập trang trước khi lọc báo cáo: kiểm tra đúng địa chỉ Portal được cung cấp, kết nối và thông báo trình duyệt. Nếu được phép, thử tải lại hoặc trình duyệt/mạng được phép khác; trang chưa tải không chứng minh thiếu giao dịch. Không gửi mật khẩu, OTP hay phiên đăng nhập.';
  }
  if(op==='portal-report'){
   if(/hom nay/.test(q)&&/hom qua/.test(q))return 'Ca đi qua hai ngày: chọn khoảng ngày/thời gian bao phủ từ lúc bắt đầu hôm qua đến kết thúc sáng nay theo các bộ lọc hệ thống có hỗ trợ. Đối chiếu thời điểm từng giao dịch; em không tự đặt giờ chốt hay quy tắc quyết toán.';
   if(/chi nhanh/.test(q)&&/dang loc|thuc hien o|phat sinh o/.test(q))return 'Đang lọc khác nơi phát sinh thì chọn đúng chi nhánh thực hiện giao dịch trong phạm vi quyền được cấp, rồi đối chiếu cùng khoảng ngày và nguồn thanh toán. Chưa kết luận mất tiền từ báo cáo khác phạm vi.';
   if(/loc.*may|may thu|thiet bi|hai may/.test(q))return 'Kiểm tra phạm vi báo cáo có đang giới hạn một máy/thiết bị không; nếu hệ thống có hỗ trợ bộ lọc đó và quyền được cấp, đối chiếu các máy cùng cửa hàng, ngày và nguồn thanh toán. Không cần mã MID/TID trong nhóm; em không biết chính xác giao diện đang dùng.';
   if(/the|qr|tien mat/.test(q)&&/loc|nguon|bao cao/.test(q))return 'Báo cáo chỉ lọc thẻ có phạm vi khác tổng doanh thu gồm QR và tiền mặt. Tách từng nguồn/phương thức và chỉ so cùng phạm vi, thời gian, cửa hàng; QR và tiền mặt có được hiển thị hay không phụ thuộc hệ thống, không tự coi tổng POS là toàn bộ bán hàng.';
   if(/da.*(?:doi|chon|kiem tra)|pos co bill|chua xac minh/.test(q)&&/van|chua|khong/.test(q)){s.pendingVerification=true;s.risk='high';remember(group,user,s,'portal-filters',['filters-check']);return 'Đã thu hẹp phạm vi nhưng vẫn thiếu: đối chiếu POS/Portal theo thời điểm, số tiền, nguồn và trạng thái từng giao dịch. Bill là thông tin cần đối chiếu, chưa xác minh kết quả ngân hàng; không thu tiền lại chỉ vì chưa thấy báo cáo.';}
   return 'Để xem báo cáo Portal ở mức tổng quát, truy cập kênh chính thức bằng quyền được cấp, chọn cùng khoảng ngày/thời gian, cửa hàng/chi nhánh và nguồn thanh toán. Đối chiếu số lượng, số tiền và trạng thái với lịch sử POS; chỉ dùng bộ lọc có trên hệ thống, không suy ra tiền đã về từ tổng báo cáo.';
  }
  if(op==='reconcile'&&/doi chieu|so ban hang|tien mat|cung ngay|nguon|loai thanh toan/.test(q))return 'Đối chiếu cùng khoảng ngày/thời gian, cửa hàng/chi nhánh và nguồn/loại thanh toán: số lượng, số tiền và trạng thái từng giao dịch. Tách tiền mặt, thẻ và QR trong sổ bán hàng; phạm vi báo cáo và tiền chi trả có thể khác tổng sổ, em không tự suy ra phí, thời hạn hoặc mất tiền.';
  return null;
 }
 function paymentDetail(group,user,s,a){
  const q=a.text;const active=s&&FINANCIAL.has(s.topic);
  if(/(?:void|huy giao dich)/.test(q)&&/nao cung|tat ca|moi giao dich/.test(q))return 'Không phải mọi giao dịch đều được Void. Điều kiện và quyền thao tác phụ thuộc trạng thái thực tế, cấu hình hệ thống và quy trình đơn vị xử lý; kiểm tra trên POS/Portal trước, không tự hủy chỉ từ suy đoán.';
  if(/ngan hang.*(?:kiem tra|hoan)|khong xem duoc|dung doan/.test(q))return 'Em không có quyền truy cập ngân hàng hoặc tự thao tác hoàn tiền. Bước tiếp theo là đối chiếu đúng giao dịch trên POS/Portal, giữ chứng từ theo quy trình và nhờ CS/OPS qua kênh chính thức nếu chưa xác minh; em không đoán kết quả.';
  if(/(?:chac chan|phai khong).*(?:tien|ve)|tien.*(?:ve|hoan).*phai khong/.test(q))return 'Em chưa xác nhận tiền đã về hoặc hoàn chỉ từ tên trạng thái hay thông báo. Kiểm tra trạng thái giao dịch và nghiệp vụ hoàn/đảo tương ứng trên POS/Portal, đối chiếu qua kênh chính thức; không tự kết luận.';
  if((!s||s.topic==='card')&&/the khac|chi the|rieng the/.test(q))return 'Chỉ một thẻ bị từ chối còn thẻ khác dùng được thì khoanh vùng riêng thẻ/phương thức hoặc đơn vị phát hành; khách liên hệ ngân hàng phát hành qua kênh chính thức. Không gửi số thẻ/PIN và kiểm tra kết quả lần thử trước trên POS/Portal; chưa tự khẳng định thất bại.';
  if(!active)return null;
  const keep=()=>{s.consent=false;remember(group,user,s,'payment-history',['history-check']);};
  if(/dang (?:tim|kiem tra)|chua kiem tra (?:xong|het)|de toi xem|xem them/.test(q)){keep();return 'Dạ, mình tiếp tục kiểm tra lịch sử POS/Portal đúng thời điểm và số tiền; đang tìm hoặc chưa kiểm tra xong chưa phải kết quả thất bại. Chưa thanh toán lại, em chưa chuyển hỗ trợ.';}
  if(/quet lai|thanh toan lai|thu tien lai/.test(q)){keep();return 'Chưa quẹt lại hoặc thanh toán lại khi kết quả trước chưa xác minh, kể cả để lấy bill. Đối chiếu lịch sử POS/Portal đúng giao dịch; dùng chức năng in lại theo quyền được cấp nếu có, không tạo giao dịch mới.';}
  if(/giao hang|quet xong|quet qr/.test(q)){keep();return 'Khách quét xong chưa đủ xác nhận đã thanh toán. Kiểm tra đúng giao dịch trên POS/Portal và thực hiện quy trình xác nhận của cửa hàng trước quyết định giao hàng; chưa thu tiền lại khi kết quả chưa rõ.';}
  if(/the khac|chi the|rieng the/.test(q)){keep();return 'Chỉ một thẻ bị từ chối còn thẻ khác dùng được thì khoanh vùng riêng thẻ/phương thức hoặc đơn vị phát hành; khách liên hệ ngân hàng phát hành qua kênh chính thức. Không gửi số thẻ/PIN và vẫn kiểm tra kết quả lần thử trước trên POS/Portal; chưa tự khẳng định thất bại.';}
  if(s.topic==='duplicate'&&/mot|1|hai|2|hoan/.test(q)){keep();return 'Một bill hoặc một dòng POS chưa loại trừ hai thông báo trừ tiền. Đối chiếu từng lần thử, thời điểm, số tiền và lịch sử POS/Portal; chưa tự hoàn/hủy một lần trước khi xác minh có hai lần thu thực tế, không yêu cầu số thẻ trong nhóm.';}
  if(s.topic==='settlement'&&/xem|xac nhan|phut|bao lau|khi nao|co duoc/.test(q)){keep();return 'Về đối soát, em không truy cập ngân hàng hay kiểm tra trực tiếp tiền chi trả. Đối chiếu kỳ đối soát, trạng thái chi trả và số tiền trên Portal qua kênh được phép; em không xác nhận mốc thời gian do bên khác báo.';}
  if(/xac nhan|thong bao tru|da nhin|anh chup/.test(q)){keep();return 'Thông báo trừ tiền khách cung cấp vẫn là thông tin cần đối chiếu, em chưa xác nhận kết quả từ ngân hàng. Kiểm tra lịch sử POS/Portal đúng thời điểm, số tiền và trạng thái; chưa thu tiền lại.';}
  return null;
 }
 function declinedGuidance(group,user,s){
  s.consent=false;s.declined=true;s.refusal='declined';memory.set(group,user,s);
  if(['power','battery'].includes(s.topic)&&s.risk==='high')return 'Em chưa chuyển OPS. Tiếp tục ngừng sử dụng thiết bị hư hỏng, ngấm nước hoặc pin nóng/phồng; không cắm sạc, bật thử hay tự tháo máy. Chỉ kiểm tra qua kênh kỹ thuật được phép khi anh/chị chủ động cần.';
  if(s.topic==='portal')return s.knownAnswers.operation==='portal-access'?'Em chưa chuyển OPS. Kiểm tra truy cập Portal: đúng địa chỉ chính thức, kết nối và thông báo trình duyệt; nếu được phép thử tải lại hoặc trình duyệt khác, không gửi mật khẩu/phiên đăng nhập.':'Em chưa chuyển OPS. Kiểm tra báo cáo cùng khoảng ngày, cửa hàng/chi nhánh và nguồn thanh toán trên Portal; giữ lại kết quả bộ lọc đã thử, chưa kết luận tình trạng tiền từ báo cáo.';
  if(s.topic==='printer')return 'Em chưa chuyển OPS. Với giấy/bản in còn lỗi, giữ lại bước đã thử: chỉ kiểm tra cuộn giấy nhiệt tương thích và nắp theo hướng dẫn dòng máy nếu chưa làm; không kéo mạnh giấy kẹt, cạy hoặc tự tháo bộ phận in.';
  if(s.topic==='network')return 'Em ghi nhận các bước mạng đã báo và giới hạn hướng dẫn tại chỗ; chưa chuyển OPS. Với kết nối mạng còn lỗi, xem thông báo Wi-Fi/SIM và thử mạng được phép khác nếu chưa thử; giữ lại kết quả trước đó, không tự sửa cấu hình nhà mạng hay gửi mật khẩu.';
  if(['power','battery'].includes(s.topic))return 'Em chưa chuyển OPS. Kiểm tra nguồn, cáp và bộ sạc tương thích nếu chưa làm; giữ lại đèn sạc/màn hình đã quan sát, không tự tháo máy hoặc thử sạc lạ.';
  return 'Em chưa chuyển OPS; giữ yêu cầu tự kiểm tra kết quả giao dịch trên POS/Portal, chưa thanh toán lại khi chưa xác minh.';
 }
 function reply(group,user,input){
  if(typeof input!=='string'||input.length>6000)return 'Tin nhắn quá dài hoặc không đúng dạng văn bản; em chưa ghi nhận đồng ý từ tin này. Anh/chị gửi mô tả ngắn nhé.';
  let s=memory.get(group,user);const a=analyze(input,{topic:s?.topic,question:s?.currentQuestion});const q=a.text;
  if(s?.topic==='printer'&&!a.signals.failed&&/\b(?:bill|hoa don) in ro\b|\bin (?:bill )?ro roi\b/.test(q))a.signals.resolved=true;
  if(s?.topic==='network'&&!a.signals.failed&&/\b(?:sim|wifi|mang)\b.*(?:co mang lai roi|vao mang duoc|dung lai duoc roi)|(?:sim|wifi) co mang lai roi/.test(q))a.signals.resolved=true;
  if(s&&!a.facts.hotBattery&&!a.facts.unsafeHardware&&a.signals.quotedOrHypothetical&&/dong y|chuyen.*ops/.test(normalize(input))){s.consent=false;memory.set(group,user,s);return 'Em chưa coi câu giả định hoặc có điều kiện là đồng ý chuyển OPS; hiện chưa chuyển yêu cầu.';}
  if(!a.facts.hotBattery&&!a.facts.unsafeHardware&&/dung doan|khong xem duoc/.test(normalize(input)))return 'Em không có quyền truy cập ngân hàng hoặc tự thao tác hoàn tiền. Kiểm tra đúng giao dịch trên POS/Portal và liên hệ CS/OPS qua kênh chính thức nếu chưa xác minh; em không đoán kết quả.';
  if(!q)return null;
  if(/rut lai|thu hoi|huy.*(?:dong y|yeu cau.*chuyen)|(?:khong|dung|thoi khoi|ngung).*gui/.test(q)){clear(group,user);return 'Em đã dừng và thu hồi đồng ý chuyển OPS; không tiếp tục thu thập thông tin cửa hàng.';}
  if(s?.pendingVerification&&(FINANCIAL.has(s.topic)||s.knownAnswers.payment==='unverified'||s.interruptions.some(f=>FINANCIAL.has(f.topic)||f.knownAnswers?.payment==='unverified'))&&/khoi dong|restart|tat may|quet lai|thanh toan lai|thu tien lai|tra lai lan nua/.test(q)){s.consent=false;memory.set(group,user,s);return 'Chưa quẹt hoặc thanh toán lại, khởi động lại hay tắt máy khi kết quả giao dịch còn chưa xác minh. Kiểm tra lịch sử POS/Portal đúng giao dịch và chưa yêu cầu khách thanh toán lại; em không tự xác nhận trạng thái tiền.';}
  if(s&&a.signals.consent&&/\b(?:ops|cs)\b/.test(q)&&!a.facts.hotBattery&&!a.facts.unsafeHardware){s.consent=true;s.declined=false;s.refusal='none';memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; khách chủ động đồng ý chuyển hỗ trợ'};}
  const detail=!a.facts.hotBattery&&!a.facts.unsafeHardware&&!a.signals.consent?paymentDetail(group,user,s,a):null;if(detail)return detail;
  const paymentRisk=a.facts.inFlight||a.facts.debit==='yes'||(/khong biet|khong chac|chua ro/.test(q)&&/cham the|cam chip|giao dich|thanh toan/.test(q));
  if(/khong.*dong y|(?:chua|khong|hong|hông).*chuyen|khong phai.*muon.*nhan vien ho tro|dung.*(?:hoi.*ops|chuyen)|ngung chuyen|khong chuyen|chua chuyen|chua cho phep.*(?:gui|chuyen)|(?:dia chi|ten cua hang).*(?:chua muon|khong muon|khong cung cap)/.test(q)){if(paymentRisk&&!FINANCIAL.has(s?.topic)){s=initial('debit');s.pendingVerification=true;}if(s){s.consent=false;s.declined=true;s.refusal='declined';remember(group,user,s,'escalation-declined');if(!FINANCIAL.has(s.topic))return declinedGuidance(group,user,s);}return 'Em chưa chuyển OPS và không hỏi lại đồng ý. Anh/chị có thể tự kiểm tra lịch sử POS/Portal đúng thời điểm và số tiền; chưa thanh toán lại khi kết quả chưa rõ.';}
  if(a.signals.cancel||a.signals.restart){clear(group,user);return 'Đã kết thúc phiên hỗ trợ. Anh/chị mô tả sự cố mới khi cần nhé.';}
  if(s?.currentQuestion==='battery-safe'){
   const stop=s.topic==='power'?'Ngừng sử dụng thiết bị hư hỏng/ngấm nước, không cắm sạc, bật thử hoặc tự tháo.':'Ngừng sử dụng máy nóng bất thường/phồng pin; không cắm sạc hoặc khởi động thử.';
   if(a.signals.consent||a.signals.yes||/^(dong y|dong y chuyen ops|chuyen giup)$/.test(q)){s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:s.topic==='power'?'Thiết bị hư hỏng/ngấm nước: cần kiểm tra an toàn':'Pin nóng bất thường/phồng: cần kiểm tra an toàn'};}
   if(a.signals.no||/khong dong y/.test(q))return 'Em chưa chuyển OPS. '+stop;
   return stop+' Anh/chị đồng ý để em chuẩn bị yêu cầu hỗ trợ thiết bị không ạ?';
  }
  if(a.facts.hotBattery||a.facts.unsafeHardware){const safe=noteSafetyStop(group,user,a.facts.unsafeHardware?'power':'battery');return first(group,user,safe,a);}
  if(paymentRisk&&!FINANCIAL.has(s?.topic)){const prior=s?[...s.interruptions,{topic:s.topic,currentQuestion:s.currentQuestion,attempted:s.attempted,failed:s.failed,risk:s.risk,knownAnswers:s.knownAnswers}].slice(-2):[];s=initial(/hai lan|2 lan/.test(q)&&/tru tien|bi tru/.test(q)?'duplicate':a.primary==='settlement'?'settlement':'debit',{interruptions:prior});return financial(group,user,s,a,true);}
  const operational=!a.facts.hotBattery&&!a.facts.unsafeHardware&&!paymentRisk?operationDetail(group,user,s,a):null;if(operational)return operational;
  if(/chargeback|khieu nai|tranh chap/.test(q))return 'Tranh chấp/khiếu nại giao dịch cần tra soát qua kênh chính thức của đơn vị xử lý. Giữ chứng từ theo quy trình được phép, không gửi dữ liệu thẻ trong nhóm và không tự hoàn tiền khi chưa xác minh; em không cam kết kết quả.';
  if(/in lai|ban sao|in them/.test(q)&&/bill|hoa don|giao dich/.test(q))return 'Nếu cần in lại bản sao, tìm đúng giao dịch trong lịch sử POS và chức năng in lại theo hướng dẫn dòng máy/quyền được cấp. Không tạo giao dịch hoặc thu tiền mới để lấy hóa đơn; chưa xác nhận kết quả giao dịch từ tin nhắn.';
  const explained=definition(q);if(explained)return explained;
  const explicitResolved=a.signals.resolved||/^(?:binh thuong roi|may binh thuong roi|on roi|ok roi|het loi roi|in duoc roi|da xu ly xong|duoc roi)(?: em| anh| chi| cam on| cam on em)?$/.test(q);
  if(s&&explicitResolved){
   if(s.pendingVerification&&!(!FINANCIAL.has(s.topic)&&s.interruptions.some(f=>FINANCIAL.has(f.topic))))return offer(group,user,s,'Em ghi nhận thiết bị có thể đã hoạt động, nhưng giao dịch trước đó vẫn chưa xác minh. Kiểm tra POS/Portal và chưa thu tiền lại; em không xác nhận kết quả chỉ từ tin nhắn.');
   const frame=s.interruptions.at(-1);clear(group,user);
   if(frame){const rest=initial(frame.topic);Object.assign(rest,frame,{currentQuestion:'resume',previousQuestions:[],answers:[],interruptions:s.interruptions.slice(0,-1),pendingVerification:FINANCIAL.has(frame.topic)||frame.risk==='high'||frame.knownAnswers?.payment==='unverified'||s.interruptions.slice(0,-1).some(f=>FINANCIAL.has(f.topic)||f.knownAnswers?.payment==='unverified'),consent:false});memory.set(group,user,rest);return `Tốt rồi, em ghi nhận vấn đề vừa rồi đã được xử lý. Mình còn ${TOPICS[frame.topic]} trước đó; anh/chị muốn tiếp tục phần đó không ạ?`+(rest.pendingVerification?' Giao dịch trước đó vẫn cần xác minh trên POS/Portal; chưa thu tiền lại.':'');}
   return 'Tốt rồi, em ghi nhận sự cố đã được xử lý. Nếu có vấn đề mới, anh/chị cứ mô tả nhé.';
  }
  if(!s&&q==='van chua duoc')return 'Anh/chị đang chưa xử lý được lỗi in bill, kết nối hay giao dịch thanh toán ạ? Em cần biết bước vừa thử để không yêu cầu làm lại.';
  // Burning/swollen battery is a stop condition even when other work is active.
  if(a.facts.hotBattery||a.facts.unsafeHardware){const safe=noteSafetyStop(group,user,a.facts.unsafeHardware?'power':'battery');return first(group,user,safe,a);}
  let topic=a.primary;
  if(/ket giay|giay.*mac/.test(q)&&!a.facts.hotBattery&&!a.facts.unsafeHardware)topic='printer';
  if(/the/.test(q)&&/tu choi/.test(q)&&a.facts.debit!=='yes')topic='card';
  if(/qr/.test(q)&&/quet.*(?:roi|xong)|chua.*ket qua/.test(q)){topic='debit';}
  if(/hai lan|2 lan/.test(q)&&/tru tien|bi tru/.test(q))topic='duplicate';
  if(/doi soat|quyet toan|settlement/.test(q))topic='settlement';
  if(/pos/.test(q)&&/thanh cong/.test(q)&&/portal/.test(q)&&/khong|chua/.test(q))topic='missing';
  if(s?.topic==='printer'&&['power','battery'].includes(topic)&&/khong (?:nong|co mui khet)/.test(q)&&!a.facts.hotBattery&&!a.facts.unsafeHardware)topic='printer';
  if(s&&['power','battery'].includes(s.topic)&&['power','battery'].includes(topic))topic=s.topic;
  if(s?.topic==='freeze'&&/het treo|het do/.test(q)&&/in.*(?:mo|trang)|bill.*mo/.test(q))topic='printer';
  if(s?.topic==='printer'&&(a.facts.scopedResolution||/chu.*(?:mo|nhat)|giay.*ket/.test(q)))topic='printer';
  if(s?.topic==='duplicate'&&['refund','void'].includes(topic))topic='duplicate';
  if(s&&!/khong.*(?:huy|hoan|dao).*nua/.test(q)&&['refund','void','reversal'].includes(s.topic)&&['refund','void','reversal','missing'].includes(topic))topic=s.topic;
  if(s?.topic==='settlement'&&['portal','missing'].includes(topic))topic='settlement';
  if(s?.topic==='network'&&topic==='power'&&explicitFailure(q,s.topic))topic='network';
  if(s&&!/khong.*(?:huy|hoan|dao).*nua/.test(q)&&s.pendingVerification&&['freeze','printer','network','card','qr'].includes(topic)&&!(/^\b(?:doi van de|van de khac|khong phai|gio may|khoan gio)\b/.test(q)||['offer-consent','payment-verify','escalation-declined'].includes(s.currentQuestion)||(['printer','network'].includes(topic)&&a.intents[0]?.score>=5)))topic=s.topic;
  if(s&&topic&&topic!==s.topic&&a.intents[0]?.score>=5){
   const interrupts=s.topic?[...s.interruptions,{topic:s.topic,currentQuestion:s.currentQuestion,attempted:s.attempted,failed:s.failed,risk:s.risk,knownAnswers:s.knownAnswers}].slice(-2):s.interruptions;
   const priorPayment=s.pendingVerification&&(FINANCIAL.has(s.topic)||s.knownAnswers.payment==='unverified'||s.interruptions.some(f=>FINANCIAL.has(f.topic)||f.knownAnswers?.payment==='unverified'));
   s=initial(topic,{interruptions:interrupts});if(priorPayment){s.pendingVerification=true;s.knownAnswers.payment='unverified';}
   const response=first(group,user,s,a);return typeof response==='string'&&priorPayment?response+' Giao dịch trước vẫn chưa xác minh; kiểm tra POS/Portal và chưa thu tiền lại.':response;
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
  if(s.currentQuestion==='resume'){s.consent=false;return first(group,user,s,a);}
  if(s.declined&&a.signals.consent){s.declined=false;s.refusal='none';s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; khách chủ động đồng ý chuyển hỗ trợ'};}
  if(s.declined)return declinedGuidance(group,user,s);
  if(s.currentQuestion==='offer-consent'&&!FINANCIAL.has(s.topic)&&!a.signals.consent&&!a.signals.yes&&!a.signals.no){const detail=nextDiagnostic(group,user,s,a);if(detail)return detail;}
  const diagnostic=!['offer-consent','payment-verify','battery-safe'].includes(s.currentQuestion)?nextDiagnostic(group,user,s,a):null;if(diagnostic)return diagnostic;
  if(!s.topic){remember(group,user,s,'clarify');return 'Em chưa có đủ chi tiết để chọn bước an toàn. Máy lỗi nguồn, in hóa đơn, kết nối hay đang xử lý giao dịch ạ?';}
  if(s.currentQuestion==='offer-consent'){
   if(a.signals.no||/^(?:khong|chua|thoi)(?: (?:dong y|chuyen)(?: ops)?)?$/.test(q)){
    s.consent=false;remember(group,user,s,'payment-verify');return 'Em chưa chuyển yêu cầu hoặc thu thập thông tin cửa hàng. Khi cần, anh/chị có thể nói rõ “đồng ý chuyển OPS”.';
   }
   if(a.signals.consent||/^(?:dong y|dong y chuyen ops|chuyen giup|nho em chuyen|cho phep chuyen ops)$/.test(q)){
    s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; đã thử hướng dẫn hoặc cần xác minh, khách đồng ý chuyển hỗ trợ'};
   }
   if(/^ok(?: em)?$/.test(q))return 'Em chưa coi “ok” là đồng ý chuyển hỗ trợ. Nếu muốn chuyển CS/OPS, anh/chị xác nhận rõ “đồng ý chuyển OPS” nhé.';
   return 'Để chuyển hỗ trợ cần đồng ý rõ ràng; hiện em chưa thu thập thông tin cửa hàng. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra không ạ?';
  }
  if(s.currentQuestion==='payment-verify'&&s.consent===false){
   if(a.signals.consent||/^(dong y chuyen ops|dong y|chuyen giup)$/.test(q)){s.consent=true;memory.set(group,user,s);return {handover:true,consented:true,issue:TOPICS[s.topic]+'; khách chủ động đồng ý chuyển hỗ trợ'};}
   memory.set(group,user,s);return 'Em chưa chuyển hỗ trợ. Mình giữ nguyên yêu cầu kiểm tra kết quả thực tế; khi muốn chuyển CS/OPS, anh/chị xác nhận rõ nhé.';
  }
  if(FINANCIAL.has(s.topic))return financial(group,user,s,a);
  if(s.topic==='freeze'){
   if(s.currentQuestion==='payment-history')return financial(group,user,s,a);
   if(a.facts.inFlight){s.pendingVerification=true;s.risk='high';remember(group,user,s,'payment-history',['history-check']);return 'Máy treo lúc thanh toán: chưa khởi động hoặc cho khách thanh toán lại. Kiểm tra thông báo trừ tiền và lịch sử POS/Portal trước; hiện có thông báo trừ tiền không ạ?';}
   if(explicitFailure(q,s.topic)){fail(s,['restart-safe']);return offer(group,user,s,'Em ghi nhận máy vẫn treo sau bước đã thử; không yêu cầu khởi động lại hoặc làm lại từ đầu.');}
   if(/man hinh chinh|khong.*giao dich|khong.*thanh toan/.test(q)){remember(group,user,s,'freeze-location',['restart-safe']);return 'Nếu chắc chắn không có giao dịch đang xử lý, có thể khởi động lại theo hướng dẫn đúng dòng máy. Anh/chị đã thử chưa và máy còn đứng không ạ?';}
   return offer(group,user,s,'Để tránh thao tác lặp hoặc ảnh hưởng giao dịch, cần xác định màn hình và tình trạng thiết bị.');
  }
  if(s.topic==='printer'){
   if(['stuck','not-feeding'].includes(s.knownAnswers.paper))return nextDiagnostic(group,user,s,a);
   if(a.facts.receiptBlank||/giay.*trang|khong.*chu|\bmo\b/.test(q)){
    if(explicitFailure(q,s.topic)||s.failed.includes('paper-orientation')){fail(s,['paper-orientation']);return offer(group,user,s,'Đã kiểm tra chiều giấy mà vẫn trắng/mờ: không lặp lại. Cần kiểm tra giấy nhiệt tương thích và bộ phận/đầu in.');}
    remember(group,user,s,'printer-type',['paper-orientation']);return 'Giấy chạy ra trắng thì kiểm tra đúng giấy nhiệt và mặt giấy tiếp xúc đầu in theo hướng dẫn dòng máy. Anh/chị đã kiểm tra chiều giấy chưa ạ?';
   }
   if(/khong (?:day|chay|ra).*giay|giay khong (?:day|chay|ra)|ket giay/.test(q)){
    fail(s,['printer-check']);return offer(group,user,s,'Giấy không đẩy hoặc bị kẹt sau bước kiểm tra: không kéo mạnh và không tự tháo bộ phận in; cần hỗ trợ thiết bị.');
   }
   if(explicitFailure(q,s.topic)){
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
   if(explicitFailure(q,s.topic)||a.signals.failed||a.signals.no||/mat song|khong co dich vu/.test(q)){
    fail(s,[s.currentQuestion==='sim-signal'?'sim-check':'wifi-check']);return offer(group,user,s,'Kết nối vẫn lỗi sau bước đã thử; không quên mạng hay khởi động lại lần nữa. Nếu được phép, dùng hotspot/Wi-Fi hoặc SIM/4G khác để phân biệt lỗi đường truyền và lỗi POS.');
   }
   if(a.signals.yes||/dien thoai.*duoc/.test(q)){remember(group,user,s,'wifi-other',['wifi-check']);return 'Điện thoại dùng được cùng Wi-Fi nhưng POS không vào được: nếu chính sách cho phép, thử một hotspot/mạng được phép khác để khoanh vùng lỗi POS. Không đổi cấu hình nhà mạng hoặc thu tiền lại khi trạng thái giao dịch chưa rõ.';}
   return offer(group,user,s,'Em giữ lại tình trạng mạng đang kiểm tra, không yêu cầu làm lại bước cũ. Cần xác minh kết nối và thiết bị tiếp.');
  }
  if(s.topic==='power'||s.topic==='battery'){
   if(explicitFailure(q,s.topic)){fail(s,['charger-check']);return offer(group,user,s,'Đã thử cáp/nguồn hoặc bộ sạc mà máy vẫn không lên/sạc không vào: không lặp lại và không tự tháo máy; cần hỗ trợ thiết bị.');}
   if(!explicitFailure(q,s.topic)){remember(group,user,s,'power-charge');return 'Nếu chưa kiểm tra nguồn, cáp hoặc bộ sạc tương thích thì kiểm tra theo hướng dẫn dòng máy; không thử sạc lạ hay tự tháo máy. Giữ lại tình trạng màn hình và đèn sạc đã báo.';}
   return offer(group,user,s,'Cần xác định biểu tượng sạc và nguồn phù hợp theo dòng máy; nếu chưa rõ, không thử bộ sạc lạ hoặc tự mở máy.');
  }
  if(s.topic==='portal'){
   if(explicitFailure(q,s.topic)||a.signals.no||/van thieu|khong thay/.test(q)){fail(s,['filters-check']);return offer(group,user,s,'Đã kiểm tra bộ lọc mà vẫn lệch: cần đối chiếu lịch sử POS/Portal đúng ngày và chi nhánh, không tự kết luận trạng thái tiền.');}
   return offer(group,user,s,'Cần đối chiếu đúng nguồn POS/QR, ngày và chi nhánh; em không có dữ liệu hệ thống để xác nhận giao dịch hay quyết toán.');
  }
  if(s.topic==='qr'||s.topic==='card'){
   if(a.facts.inFlight||/da quet|khach quet|tru|dang xu ly/.test(q)){s.topic='debit';return financial(group,user,s,a,true);}
   if(explicitFailure(q,s.topic)||a.signals.failed){fail(s,[s.topic==='qr'?'qr-check':'card-check']);return offer(group,user,s,'Lỗi vẫn còn sau bước đã thử; cần kiểm tra thông báo màn hình và đúng phương thức/dòng máy, không thử thanh toán liên tục.');}
   return offer(group,user,s,s.topic==='card'?'Em ghi nhận phương thức thẻ; không yêu cầu gửi số thẻ/PIN hay quẹt liên tục. Cần kiểm tra thông báo lỗi cụ thể.':'Cần xác định QR không hiển thị hay đã quét chưa có kết quả; không yêu cầu thanh toán lại khi kết quả chưa rõ.');
  }
  return null;
 }
 return {reply,clear,interruptSocial,revokeConsent,noteSafetyStop,getContext,hasSession:(g,u)=>Boolean(memory.get(g,u)),shouldRespond:(input,{ongoing=false,explicit=false}={})=>ongoing||explicit||meaningful(input),shouldInterrupt};
}
module.exports={version:'13.0',safetyAdvice,safetyKind,createEngine,...createEngine()};
