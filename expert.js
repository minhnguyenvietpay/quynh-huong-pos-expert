'use strict';
const fs=require('fs');const path=require('path');
const norm=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const has=(q,words)=>words.some(w=>q.includes(w));
const caution='\n\n🔒 Anh/chị không gửi OTP, PIN, CVV, mật khẩu hoặc số thẻ đầy đủ nhé.';
function reply(raw){const q=norm(raw);if(q.length<7)return null;
 const freeze=has(q,['bi do','bi treo','dung hinh','dung may','khong phan hoi','khong bam duoc','khong thao tac','bi lag']);
 const debited=has(q,['tru tien','bi tru','da tru','mat tien']);
 const fail=has(q,['that bai','bao fail','bao loi','khong thanh cong','failed']);
 const inPayment=has(q,['dang thanh toan','dang giao dich','luc thanh toan','trong khi thanh toan']);
 if(debited&&fail)return 'Dạ anh/chị, trường hợp khách đã bị trừ tiền nhưng POS báo thất bại cần tra soát trạng thái trước ạ. Anh/chị chưa yêu cầu khách thanh toán lại ngay để tránh thanh toán trùng. Mình kiểm tra lịch sử giao dịch trên POS và Merchant Portal, lưu lại thời điểm và số tiền. Nếu hai nơi không khớp hoặc không thấy giao dịch, anh/chị báo em để em xin phép chuyển CS/OPS kiểm tra. Em chưa thể kết luận tiền đã về cửa hàng hay tự động hoàn.'+caution;
 if(freeze&&(has(q,['may','pos','thiet bi'])||q.length<50))return inPayment?'Dạ anh/chị, máy POS bị treo khi đang thanh toán thì mình chưa thao tác thanh toán lại hoặc tắt máy ngay nhé. Anh/chị cho em biết màn hình đang hiện “đang xử lý”, mã lỗi hay đứng yên không có thông báo ạ? Em sẽ hướng dẫn bước tiếp theo theo trạng thái đó.'+caution:'Dạ anh/chị, nếu máy POS bị đứng và không bấm được, mình kiểm tra xem có giao dịch nào đang xử lý không ạ. Nếu không có, anh/chị thử khởi động lại theo hướng dẫn của đúng dòng máy. Nếu đang có giao dịch, mình chưa thanh toán lại cho đến khi kiểm tra trạng thái nhé. Máy đang đứng ở màn hình chính hay lúc thanh toán ạ?'+caution;
 if(has(q,['khong len nguon','khong bat duoc','khong mo nguon']))return 'Dạ anh/chị, mình kiểm tra bộ sạc, cáp và ổ điện phù hợp trước nhé. Nếu máy nóng bất thường hoặc pin phồng thì ngừng sạc, không tự tháo máy. Anh/chị cho em biết khi cắm sạc có đèn hoặc biểu tượng pin không ạ?'+caution;
 if(has(q,['khong in bill','khong in hoa don','khong in bien lai','ket giay','het giay']))return 'Dạ anh/chị, mình kiểm tra giấy nhiệt, chiều lắp giấy và nắp máy in nhé. Việc không in được hóa đơn không có nghĩa giao dịch thất bại. Anh/chị kiểm tra thêm trạng thái trong lịch sử giao dịch trước khi thu tiền lại ạ.'+caution;
 if(has(q,['khong thay giao dich','khong hien thi giao dich','thieu giao dich'])&&has(q,['portal','app','web']))return 'Dạ anh/chị, mình kiểm tra bộ lọc ngày, nguồn thanh toán, chi nhánh và trạng thái giao dịch trên Merchant Portal trước nhé. Nếu vẫn thiếu so với POS, em có thể xin phép chuyển CS/OPS đối chiếu. Em chưa thể xác nhận kết quả thanh toán chỉ từ một màn hình.'+caution;
 return null;
}
function logGap(question,reason){if(process.env.QH_GAP_LOG!=='1')return;try{const p=path.join(__dirname,'knowledge-gaps.jsonl');fs.appendFileSync(p,JSON.stringify({at:new Date().toISOString(),reason,question:String(question).slice(0,250)})+'\n');}catch(_){}}
module.exports={reply,logGap,norm};
