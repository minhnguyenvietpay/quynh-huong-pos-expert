# V13 — Vòng 3: phản hồi thanh toán hữu ích và giữ ngữ cảnh rủi ro

Baseline `40516c6`. Khóa18 hội thoại mới sau review riêng QA/POS/Safety, SHA `dadc700ad3410d05d31b8c9db000278d8a1861e3be7088d8c3e1e471e5167b03`. Engine expert7/18→18/18,11 ca cải thiện,0 hồi quy; mọi ca Round1/2 giữ đạt. Hai ca trạng thái default khóa riêng0/2→2/2. Full npm test333/333 (sau guard cuối),0 skip/fail; bộ56 cũ chạy trên expert56/56. Safety độc lập13/13, không đổi assertion.

Đã sửa: thông tin đang kiểm tra/chưa rõ, QR đã quét chưa xác minh, yêu cầu quẹt lại để lấy bill, thẻ riêng lẻ, đối chiếu nhiều thông báo/thu trùng, mâu thuẫn POS/Portal và chi trả/hoàn/đảo chưa rõ. Phản hồi trả lời câu hỏi cụ thể trước bước xin OPS, không ép mọi follow-up thành consent loop. Không phê duyệt thao tác hoàn/hủy, không xác nhận trạng thái hoặc hẹn tiền về.

Rút consent ở dialogue xóa collector/pending nhưng giữ incident tài chính hữu hạn và cảnh báo; API engine trực tiếp vẫn giữ hợp đồng clear cũ, với ưu tiên withdrawal trước restart. Không đổi các assertion khác nhau của hai API để làm xanh. Default conversation giữ trạng thái payment qua “chưa rõ”, cảm ơn và máy treo, không cho module sau ghi đè thành sự cố an toàn để restart.

Runtime: conversation.js, dialogue.js, lib/v12/engine.cjs. Bằng chứng: round3-before/after-v12.json, round3-before/after-default.json, round3-comparison.json và complementary default raw-state tests. Không truy cập tài khoản/ngân hàng, không sửa corpus/V11/credential hoặc triển khai.

Giới hạn: thông tin ngân hàng/POS/Portal vẫn chỉ là điều merchant báo, chưa phải hệ thống xác minh. Các hướng dẫn chung cần OPS/domain review. Nhánh tài chính chưa bao phủ mọi cách nói. Khôi phục rủi ro qua nhiều lớp ngắt quãng là ưu tiên probe ở vòng5; chưa tuyên bố đã xác minh/sửa ngoài tập hiện tại. Vòng4 tập trung sử dụng POS, Portal/chi nhánh, yêu cầu gặp người hỗ trợ và giọng điệu merchant; không lặp lại vòng3 nếu không có tái hiện mới.
