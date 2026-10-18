 'use strict';
// V12 deterministic dialogue coordinator; isolated per group and sender, persisted by state.js.
const state=require('./state');
const n=x=>String(x||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const key=(g,u)=>JSON.stringify([String(g),String(u)]);
const maxAge=30*60*1000;
const resolved=q=>/^(binh thuong roi|may binh thuong roi|chay binh thuong roi|on roi|ok roi em|ok roi|het loi|khong can ho tro nua|in duoc roi|in ra roi|may in duoc roi|da in duoc|(may )?hoat dong lai roi|chay duoc roi|het loi roi|khac phuc duoc roi|da xu ly xong|on roi|duoc roi|xong roi)( em| anh)?$/.test(q);
const thanks=q=>/^(ok|oke|ok em|ok cam on e|ok cam on em|cam on|cam on em|cam on nha|cam on nhe|thanks|thank you)$/.test(q);
const no=q=>/^(khong|khong em|chua|chua em|khong co|khong thay|chua thay)$/.test(q);
const yes=q=>/^(co|co em|roi|roi em|da roi|dung roi|yes)$/.test(q);
const failed=q=>/van (chua|khong|bi)|thu roi|lam roi|khong duoc|chua duoc|chua het|van vay|khong an thua/.test(q);
const printer=q=>/khong in (duoc )?(bill|hoa don|bien lai)|may (pos )?khong in|may in (bi loi|khong in)|loi may in|khong ra (bill|giay)|in khong ra/.test(q);
const payment=q=>/dang thanh toan|luc thanh toan|khi thanh toan|dang xu ly giao dich|khach bi tru tien/.test(q);
const risk='Nếu vừa thanh toán, mình kiểm tra trạng thái giao dịch trước; không thu tiền lại chỉ vì chưa in được hóa đơn nhé anh.';
function load(k){const s=state.getSession(k);return s?.flowId==='qh_v12'&&Date.now()-s.time<maxAge?s:null;}
function save(k,s){state.setSession(k,{...s,flowId:'qh_v12',time:Date.now()});}
function clear(k){if(load(k))state.deleteSession(k);}
function reply(group,user,raw){const q=n(raw),k=key(group,user);if(!q)return null;let s=load(k);
 if(/^\/(huy|lai|reset|done|restart)$/.test(q)){clear(k);return null;}
 // Resolution is higher priority than a pending question; never infer resolution from bare 'ok'.
 if(s&&resolved(q)){clear(k);return 'Dạ tốt quá anh, em ghi nhận sự cố đã được xử lý. Nếu máy gặp vấn đề khác, anh cứ nhắn em nhé!';}
 if(s&&thanks(q))return s.stage==='closed'?null:'Dạ em cảm ơn anh. Máy đã hoạt động bình thường chưa ạ, hay anh vẫn cần em hỗ trợ thêm?';
 if(s&&s.issue==='printer'){
  if(payment(q)){save(k,{issue:'printer',stage:'payment'});return 'Dạ anh, nếu máy không in bill khi đang thanh toán, mình kiểm tra lịch sử giao dịch trên POS hoặc Portal khi có thể nhé. Chưa có bill không có nghĩa giao dịch thất bại. Anh có thấy giao dịch trong lịch sử không ạ?';}
  if(s.stage==='payment'){
   if(no(q)||failed(q)){save(k,{issue:'printer',stage:'offer',reason:'Không xác minh được giao dịch khi máy không in hóa đơn'});return 'Dạ anh, hiện chưa xác minh được kết quả thanh toán nên mình chưa thu tiền lại nhé. Em có thể chuyển CS/OPS tra soát, anh đồng ý không ạ?';}
   if(yes(q)){save(k,{issue:'printer',stage:'paper'});return 'Dạ anh, vậy mình kiểm tra lại thông tin giao dịch và thử in lại hóa đơn theo chức năng của đúng dòng máy nếu có nhé. Máy đã in được chưa ạ?';}
  }
  if(s.stage==='paper'){
   if(failed(q)||no(q)){save(k,{issue:'printer',stage:'print_type'});return 'Dạ anh, em ghi nhận đã kiểm tra giấy và nắp máy nhưng vẫn chưa in được. Em không yêu cầu anh thử lặp lại. Giấy có chạy ra nhưng trắng không có chữ, hay không đẩy giấy ra ạ?';}
   if(yes(q)){clear(k);return 'Dạ tốt rồi anh! Máy đã in được hóa đơn. Em ghi nhận sự cố đã xử lý xong nhé.';}
  }
  if(s.stage==='print_type'){
   if(/giay (chay|ra)|trang|khong co chu|khong co muc/.test(q)){save(k,{issue:'printer',stage:'offer',reason:'Máy in ra giấy trắng'});return 'Dạ anh, giấy có chạy nhưng không có chữ. Anh kiểm tra lại chiều lắp giấy nhiệt theo hướng dẫn của dòng máy nhé. Nếu vẫn trắng, em có thể chuyển CS/OPS kiểm tra bộ phận in. Anh đồng ý không ạ?';}
   if(/khong (ra|day|chay)|dung|ket|mac|loi/.test(q)||failed(q)||no(q)){save(k,{issue:'printer',stage:'offer',reason:'Máy in không đẩy giấy sau khi đã kiểm tra giấy và nắp'});return 'Dạ anh, máy không đẩy giấy dù đã kiểm tra. Em đề xuất chuyển CS/OPS kiểm tra máy in, anh đồng ý không ạ?';}
   return 'Dạ anh, em cần phân biệt hai tình huống: giấy không chạy ra, hay giấy chạy ra nhưng không có chữ ạ?';
  }
  if(s.stage==='offer'){
   if(no(q))return 'Dạ anh, em chưa chuyển hỗ trợ. Nếu muốn em chuyển CS/OPS, anh nhắn “đồng ý” nhé.';
   if(/^(dong y|ok chuyen|chuyen di|chuyen giup|duoc em|yes|co)$/.test(q)){clear(k);return {handover:true,issue:s.reason||'Sự cố máy in chưa khắc phục'};}
   if(failed(q))return 'Dạ anh, em đã ghi nhận vẫn chưa xử lý được. Anh đồng ý để em chuyển CS/OPS hỗ trợ không ạ?';
  }
  if(printer(q))return 'Dạ anh, em vẫn đang theo dõi lỗi máy in. Anh cho em biết kết quả bước vừa thử nhé, em sẽ không yêu cầu làm lại từ đầu.';
  // Explicit unrelated new incident is routed to existing specialist modules.
  if(q.length>=12&&!failed(q)&&!no(q)&&!yes(q)&&!thanks(q)&&!printer(q)){clear(k);return null;}
 }
 if(printer(q)){
  save(k,{issue:'printer',stage:'paper'});
  return 'Dạ anh, em hỗ trợ lỗi máy không in hóa đơn nhé. Anh kiểm tra cuộn giấy nhiệt lắp đúng chiều và nắp máy đã đóng kín chưa ạ? '+risk+' Anh thử rồi báo em kết quả nhé.';
 }
 return null;
}
module.exports={reply,clear,normalize:n};
