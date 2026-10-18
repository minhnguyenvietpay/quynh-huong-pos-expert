'use strict';
// Deterministic, local-only triage. No bank-status guesses or external calls.
const state=require('./state');
const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const key=(c,u)=>JSON.stringify([String(c),String(u)]);
const patterns=[
 {id:'printer',re:/khong in (duoc )?(bill|hoa don)|may in (khong|loi)|het giay|in bill (khong|bi)/,ask:'Dạ anh, em hỗ trợ kiểm tra phần in hóa đơn nhé. Anh xem giúp em cuộn giấy nhiệt đã lắp đúng chiều và nắp máy in đã đóng kín chưa ạ? Nếu máy vừa thanh toán, mình kiểm tra lịch sử giao dịch trước, không thực hiện lại thanh toán chỉ vì chưa in được bill.',follow:'Dạ anh, nếu đã kiểm tra giấy và nắp máy mà vẫn không in được, anh cho em biết máy báo lỗi gì hoặc giấy có chạy ra nhưng không có chữ không ạ?',risk:false},
 {id:'power',re:/khong len nguon|khong bat (duoc )?may|may (bi )?tat nguon|may khong mo|man hinh den thui|may het pin/,ask:'Dạ anh, máy POS không lên nguồn thì mình kiểm tra cáp sạc, bộ sạc và ổ điện trước nhé. Anh thử nguồn điện và phụ kiện sạc phù hợp với dòng máy, rồi cho em biết máy có hiện biểu tượng sạc không ạ?',follow:'Dạ anh, nếu đã kiểm tra nguồn và bộ sạc mà máy vẫn không lên, anh cho em biết có đèn báo hoặc biểu tượng pin nào không ạ? Em sẽ không yêu cầu anh thử lặp lại.',risk:false},
 {id:'network',re:/mat mang|khong co mang|khong ket noi (duoc )?(wifi|wi fi|4g|internet)|loi (wifi|4g|ket noi)|mang yeu/,ask:'Dạ anh, mình kiểm tra kết nối trước nhé. Máy đang dùng Wi-Fi hay SIM/4G ạ? Nếu có giao dịch đang xử lý, anh chưa thanh toán lại cho đến khi kiểm tra được kết quả.',follow:'Dạ anh, nếu đã thử kết nối lại mà vẫn lỗi, anh cho em biết máy đang dùng Wi-Fi hay SIM/4G và có thông báo lỗi cụ thể nào không ạ?',risk:false},
 {id:'portal',re:/khong thay giao dich (tren|o) (merchant )?portal|portal khong (hien|co) giao dich|giao dich khong hien tren portal/,ask:'Dạ anh, mình kiểm tra bộ lọc ngày, chi nhánh, thiết bị và trạng thái giao dịch trên Merchant Portal trước nhé. Anh cho em biết giao dịch có hiển thị trên máy POS không ạ? Chưa thấy trên Portal không đồng nghĩa giao dịch thất bại.',follow:'Dạ anh, nếu đã kiểm tra bộ lọc mà vẫn không thấy, anh cho em biết giao dịch có xuất hiện trên POS hoặc hóa đơn cuối ca không ạ? Em có thể hỗ trợ chuyển CS/OPS tra soát.',risk:true},
 {id:'qr',re:/qr (khong|ko) (quet|thanh toan)|khong quet (duoc )?ma qr|ma qr (bi )?loi|qr khong hien/,ask:'Dạ anh, lỗi QR đang xảy ra ở bước hiển thị mã hay khi khách quét mã ạ? Nếu khách đã nhận thông báo trừ tiền, mình chưa yêu cầu thanh toán lại cho đến khi xác minh kết quả.',follow:'Dạ anh, anh cho em biết mã QR không hiện trên máy hay khách quét rồi nhưng không có kết quả ạ? Nếu đã bị trừ tiền, em sẽ ưu tiên chuyển tra soát.',risk:true},
 {id:'card',re:/khong doc (duoc )?the|loi chip|khong cham (duoc )?the|the (khong|ko) nhan|quet the (bi )?loi/,ask:'Dạ anh, máy đang lỗi khi chạm thẻ, cắm chip hay quẹt từ ạ? Anh kiểm tra xem máy có thông báo lỗi cụ thể không nhé. Nếu giao dịch đã xử lý hoặc khách bị trừ tiền, mình chưa thanh toán lại trước khi xác minh.',follow:'Dạ anh, mình đã thử đúng thao tác nhưng vẫn lỗi. Anh cho em biết phương thức thẻ và thông báo trên màn hình để em hướng dẫn tiếp nhé.',risk:true},
 {id:'settlement',re:/chua nhan (duoc )?tien|chua duoc thanh toan|chua duoc doi soat|settlement|payout|tien chua ve tai khoan/,ask:'Dạ anh, em giúp mình phân biệt trạng thái giao dịch, quyết toán và tiền đã chi trả nhé. Anh đang thấy giao dịch ở trạng thái nào trên Portal ạ? Em chưa thể xác nhận lịch chuyển tiền nếu không có dữ liệu ngân hàng.',follow:'Dạ anh, nếu Portal không thể hiện rõ trạng thái hoặc số tiền đối soát lệch, em có thể chuyển CS/OPS kiểm tra theo thông tin cửa hàng. Anh có muốn chuyển hỗ trợ không ạ?',risk:true},
 {id:'refund',re:/hoan tien|refund|huy giao dich|void|reversal/,ask:'Dạ anh, mình cần phân biệt hủy giao dịch (void/reversal) với hoàn tiền (refund) theo trạng thái thực tế. Anh đang muốn hủy giao dịch vừa thực hiện hay hoàn tiền cho giao dịch trước đó ạ? Em chưa thể xác nhận tiền đã hoàn khi chưa có dữ liệu.',follow:'Dạ anh, trường hợp này cần xác minh trạng thái giao dịch và quyền thao tác của cửa hàng. Em có thể chuyển CS/OPS hỗ trợ, anh đồng ý không ạ?',risk:true}
];
const failed=q=>/van (chua|khong|bi)|thu roi|lam roi|chua duoc|khong duoc|khong thay|chua het|van vay|khong an thua/.test(q);
const completed=q=>/^(xong|xong roi|da duoc|het loi|on roi|cam on|cam on em|ok roi|duoc roi)$/.test(q);
const explicitNew=q=>patterns.find(p=>p.re.test(q));
function reply(chat,user,raw){const q=normalize(raw),k=key(chat,user);if(!q)return null;let s=state.getSession(k);if(s&&s.flowId!=='qh_pos_v10')s=null;
 if(s&&completed(q)){state.deleteSession(k);return 'Dạ tốt quá anh. Nếu máy phát sinh lỗi khác, anh cứ nhắn em nhé.';}
 const found=explicitNew(q);
 if(s&&found&&found.id!==s.issue){state.deleteSession(k);s=null;}
 if(!s){if(!found)return null;state.setSession(k,{flowId:'qh_pos_v10',issue:found.id,step:0,time:Date.now()});return found.ask;}
 const p=patterns.find(x=>x.id===s.issue);if(!p){state.deleteSession(k);return null;}
 if(failed(q)||found){const step=(s.step||0)+1;state.setSession(k,{...s,step,time:Date.now()});if(step>=2)return {handover:true,issue:`${p.id}: khách đã thử hướng dẫn nhưng vẫn chưa khắc phục được`};return p.follow;}
 if(/^(co|dong y|duoc|yes|chuyen di|chuyen giup|ok)$/.test(q)&&s.step>=1)return {handover:true,issue:`${p.id}: khách yêu cầu chuyển hỗ trợ`};
 if(q.length>65&&!found){state.deleteSession(k);return null;}
 return p.follow;
}
module.exports={reply,normalize,patterns};
