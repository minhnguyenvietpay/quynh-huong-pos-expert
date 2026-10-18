'use strict';
// Incident state is stored through the existing state.js persistence layer.
const store=require('./state');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const key=(chat,user)=>JSON.stringify([String(chat),String(user)]);
const ttl=30*60*1000;
const contains=(q,terms)=>terms.some(t=>q.includes(t));
const payment=q=>contains(q,['dang thanh toan','luc thanh toan','khi thanh toan','dang giao dich','trong luc giao dich','dang xu ly giao dich']);
const stuck=q=>contains(q,['bi do','bi treo','dung hinh','khong bam duoc','khong thao tac duoc','khong phan hoi','may do','may treo','van bi do','van bi treo']);
const failure=q=>contains(q,['van chua duoc','chua duoc','khong duoc','van bi','thu roi','lam roi','van vay','chua het','khong thay','van khong','chua khac phuc','khong an thua']);
const affirmative=q=>/^(co|roi|da roi|da thu|thu roi|dung roi|phai|da|yes)$/.test(q);
const negative=q=>/^(khong|chua|khong co|chua co|no)$/.test(q);
const debitNegated=q=>/(?:chua|khong) (?:bi )?tru(?: tien)?/.test(q);
const paymentRisk=q=>!debitNegated(q)&&contains(q,['tru tien','da tru','bi tru','mat tien','bao thanh cong','that bai','bao fail','khong thanh cong','failed']);
const terminal=q=>/^(\/huy|\/reset|\/lai|\/done|huy|ket thuc|bat dau lai|xong roi|da duoc|het loi roi|on roi)$/.test(q);
function get(k){const s=store.getSession(k);return s&&s.flowId==='qh_incident'&&Date.now()-s.time<ttl?s:null;}
function save(k,s){store.setSession(k,{...s,flowId:'qh_incident',step:0,time:Date.now()});}
function clear(k){if(get(k))store.deleteSession(k);}
function isPaymentUncertain(raw){const q=normalize(raw);return /(?:tru tien|bi tru|da tru)/.test(q)&&!/(?:chua|khong) (?:bi )?tru tien/.test(q)||/chuyen khoan/.test(q)&&/chua (?:thay|nhan)|khong (?:thay|co)|bao loi/.test(q);}
function reply(chat,user,raw){const q=normalize(raw),k=key(chat,user),s=get(k);
 if(terminal(q)){if(s)clear(k);return null;}
 if(isPaymentUncertain(q)){save(k,{kind:'payment',stage:'check',attempts:0});return 'Dạ anh/chị, thông tin khách đã chuyển khoản hoặc nhận thông báo trừ tiền chưa đủ để xác nhận kết quả giao dịch. Mình chưa yêu cầu khách thanh toán lại hoặc khởi động máy khi giao dịch còn đang xử lý nhé. Anh/chị kiểm tra lịch sử trên POS và Merchant Portal nếu truy cập được, đúng thời điểm và số tiền. Giao dịch có hiển thị ở đâu không ạ?';}
 // Explicit new issue supersedes old incident; do not force a stale dialogue.
 if(s&&s.kind==='freeze'&&contains(q,['khong in bill','khong len nguon','khong thay giao dich tren portal'])){clear(k);return null;}
 if(s&&s.kind==='payment'&&stuck(q)&&!paymentRisk(q)){clear(k);return startFreeze(k,q);}
 if(s){
  if(s.kind==='freeze'){
   if(payment(q)){save(k,{kind:'freeze',stage:'payment',attempts:(s.attempts||0)+1});return 'Dạ anh, máy đang treo trong lúc thanh toán. Mình chưa thanh toán lại hoặc khởi động máy vội để tránh giao dịch trùng nhé. Anh xem giúp em khách có nhận thông báo trừ tiền từ ngân hàng chưa ạ?';}
   if(paymentRisk(q)){save(k,{kind:'freeze',stage:'payment',attempts:(s.attempts||0)+1});return 'Dạ anh, đây là giao dịch cần tra soát. Anh chưa thu tiền lại nhé. Anh kiểm tra lịch sử giao dịch trên POS hoặc Merchant Portal nếu truy cập được. Nếu không xác định được kết quả, em có thể chuyển CS/OPS kiểm tra. Anh đồng ý không ạ?';}
   if(s.stage==='payment'){
    if(!debitNegated(q)&&(affirmative(q)||contains(q,['co tru','bi tru']))){save(k,{kind:'freeze',stage:'risk',attempts:(s.attempts||0)+1});return 'Dạ anh, khách có thông báo trừ tiền nhưng chưa đủ căn cứ xác nhận giao dịch thành công. Anh chưa yêu cầu thanh toán lại nhé. Em có thể chuyển CS/OPS tra soát, anh đồng ý không ạ?';}
    if(negative(q)||debitNegated(q)){save(k,{kind:'freeze',stage:'payment_check',attempts:(s.attempts||0)+1});return 'Dạ anh, chưa có thông báo trừ tiền cũng chưa khẳng định giao dịch thất bại. Anh kiểm tra lịch sử giao dịch khi máy hoạt động lại nhé. Máy hiện còn đứng ở màn hình đang xử lý không ạ?';}
    if(failure(q)||stuck(q)){save(k,{kind:'freeze',stage:'risk',attempts:(s.attempts||0)+1});return 'Dạ anh, máy vẫn treo khi đang thanh toán thì mình không nên thử thu tiền lại. Em đề xuất chuyển CS/OPS để kiểm tra giao dịch và thiết bị. Anh đồng ý để em chuyển hỗ trợ không ạ?';}
   }
   if(failure(q)||stuck(q)){
    if(s.stage==='location'){save(k,{kind:'freeze',stage:'location_retry',attempts:(s.attempts||0)+1});return 'Dạ anh, em hiểu máy vẫn bị đơ. Anh cho em biết máy đang đứng ở màn hình chính hay đang thanh toán ạ? Em sẽ không yêu cầu anh lặp lại bước vừa thử.';}
    save(k,{kind:'freeze',stage:'escalate',attempts:(s.attempts||0)+1});return 'Dạ anh, máy vẫn chưa hoạt động sau bước vừa thử. Em không muốn hướng dẫn anh lặp lại. Em có thể chuyển CS/OPS kiểm tra thiết bị, anh đồng ý không ạ?';
   }
   if(contains(q,['man hinh chinh','trang chu','menu chinh'])){save(k,{kind:'freeze',stage:'restart',attempts:(s.attempts||0)+1});return 'Dạ anh, nếu không có giao dịch đang xử lý, anh có thể thử khởi động lại theo hướng dẫn của đúng dòng máy. Anh đã thử khởi động lại chưa ạ?';}
   if(s.stage==='restart'&&affirmative(q)){save(k,{kind:'freeze',stage:'escalate',attempts:(s.attempts||0)+1});return 'Dạ anh, nếu đã khởi động lại mà máy vẫn đơ, em đề xuất chuyển CS/OPS kiểm tra. Anh đồng ý không ạ?';}
   if(s.stage==='restart'&&negative(q))return 'Dạ anh, anh chỉ khởi động lại khi chắc chắn không có giao dịch đang xử lý nhé. Sau đó cho em biết máy đã hoạt động lại chưa ạ?';
   if(s.stage==='escalate'||s.stage==='risk'){
    if(affirmative(q)||/^(ok|oke|dong y|duoc|chuyen giup|gui giup)$/.test(q)){clear(k);return {handover:true,consented:true,issue:'Máy POS bị treo, chưa khắc phục được'+(s.stage==='risk'?' trong khi thanh toán':'')};}
    if(negative(q)){save(k,{...s,stage:'declined'});return 'Dạ anh, em chưa chuyển hỗ trợ. Khi cần anh nhắn “chuyển hỗ trợ” nhé.';}
   }
  }
  if(s.kind==='payment'){
   if(s.stage==='escalate'&&negative(q)){save(k,{...s,stage:'declined'});return 'Dạ anh/chị, em chưa chuyển CS/OPS. Mình vẫn cần xác minh kết quả trước khi thu tiền lại nhé.';}
   if(s.stage==='declined'&&/^(co|ok|oke|dong y)$/.test(q))return 'Anh/chị muốn tiếp tục kiểm tra giao dịch hay đồng ý chuẩn bị yêu cầu chuyển CS/OPS ạ?';
   if(s.stage==='check'&&affirmative(q)){save(k,{...s,stage:'escalate'});return 'Anh/chị đối chiếu thời điểm, số tiền và trạng thái đang hiển thị của đúng giao dịch nhé. Em chưa có dữ liệu để xác nhận giao dịch thành công hay tiền đã về. Nếu trạng thái không rõ, anh/chị có đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS tra soát không ạ?';}
   if(s.stage==='check'&&negative(q)){save(k,{...s,stage:'escalate'});return 'Dạ anh/chị, chưa thấy giao dịch chưa đủ để kết luận thất bại. Mình chưa thu tiền lại nhé. Anh/chị có đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS tra soát không ạ?';}
   if(failure(q)||contains(q,['khong thay','khong co','khong hien'])){save(k,{kind:'payment',stage:'escalate',attempts:(s.attempts||0)+1});return 'Dạ anh, nếu vẫn chưa xác minh được giao dịch, mình chưa thu tiền lại nhé. Em có thể chuyển CS/OPS tra soát, anh đồng ý không ạ?';}
   if(s.stage==='escalate'&&(affirmative(q)||/^(ok|oke|dong y|duoc)$/.test(q))){clear(k);return {handover:true,consented:true,issue:'Giao dịch chưa xác minh được trạng thái'};}
  }
  // Let independent, sufficiently specific new requests use regular routing.
  if(q.length>35&&!stuck(q)&&!failure(q)&&!payment(q)&&!paymentRisk(q)){clear(k);return null;}
  if(q==='ok em'||q==='ok'||q==='oke'){return 'Dạ anh. Anh thử theo bước vừa hướng dẫn rồi báo em kết quả nhé, em sẽ hỗ trợ tiếp.';}
 }
 if(debitNegated(q)&&contains(q,['bao loi','that bai','khong thanh cong'])){save(k,{kind:'payment',stage:'check',attempts:0});return 'Dạ anh/chị, em ghi nhận khách chưa có thông báo trừ tiền và máy báo lỗi. Chưa có thông báo chưa đủ để xác nhận giao dịch thất bại. Mình kiểm tra lịch sử POS hoặc Portal trước, chưa yêu cầu khách thanh toán lại nhé. Giao dịch có hiển thị không ạ?';}
 if(stuck(q))return startFreeze(k,q);
 if(paymentRisk(q)&&contains(q,['tru tien','bi tru','da tru'])&&contains(q,['that bai','bao fail','khong thanh cong','failed','bao loi'])){save(k,{kind:'payment',stage:'check',attempts:0});return 'Dạ anh, khách bị trừ tiền nhưng POS báo thất bại thì cần kiểm tra trạng thái giao dịch trước. Anh chưa yêu cầu khách thanh toán lại nhé. Anh kiểm tra lịch sử giao dịch trên POS và Merchant Portal nếu truy cập được. Anh có thấy giao dịch ở một trong hai nơi không ạ?';}
 return null;
}
function startFreeze(k,q){const p=payment(q);save(k,{kind:'freeze',stage:p?'payment':'location',attempts:0});return p?'Dạ anh, máy đang treo trong lúc thanh toán. Anh chưa thao tác thanh toán lại hoặc khởi động máy vội nhé. Khách đã nhận thông báo trừ tiền chưa ạ?':'Dạ anh, em hiểu máy POS đang bị đơ và không bấm được. Nếu không có giao dịch đang xử lý, anh có thể khởi động lại theo hướng dẫn đúng dòng máy. Anh cho em biết máy đang đứng ở màn hình chính hay lúc thanh toán ạ?';}
module.exports={reply,clear,normalize,isPaymentUncertain};
