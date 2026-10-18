# Red team và nguyên nhân QA không tạo cải thiện

Kiểm tra này dùng dữ liệu giả lập, chạy trực tiếp `dialogue.processMessage` và giao diện monitoring mới. Không nhập listener Zalo, không gửi tin nhắn, không dùng thông tin merchant thật. Chạy lại bằng `node --test tests/redteam.test.cjs`.

## Kết quả đã tái lập

- Trước sửa: câu “khách chưa bị trừ tiền nhưng POS báo thất bại” nhận câu mở đầu “khách bị trừ tiền nhưng POS báo thất bại”. Nguyên nhân: so khớp chuỗi `bi tru` bỏ qua phủ định `chua`; bộ định tuyến có thể bỏ qua ngữ cảnh thanh toán để vào engine ưu tiên trước. Đã chuyển cho chủ sở hữu dialogue/conversation; test mới xác minh không khẳng định khách bị trừ tiền.
- Trước sửa: sau chuỗi lỗi không biết → đồng ý → tên giả lập → địa chỉ giả lập, tăng đồng hồ 31 phút vẫn lấy được pending handover. Nguyên nhân: getter của pending handover không kiểm tra thời hạn consent. Chủ sở hữu dialogue đã thêm TTL; test xác minh getter trả null sau 31 phút.
- Bộ test còn kiểm tra consent không dùng chéo merchant/nhóm, không tạo pending khi từ chối, hủy xóa pending, không lặp lại OTP/số thẻ/mật khẩu trong `/ticket`, cảnh báo tránh thu tiền lại khi đồng thời treo máy và lỗi in, và không tuân theo yêu cầu giả lập bịa trạng thái quyết toán.
- Monitoring mới từ chối event chứa trường text ngoài schema, chỉ xuất số liệu tổng hợp và mã replay tổng hợp. Hai lần phản hồi cùng chuỗi được ghi nhận repetition mà không đưa chuỗi hay khóa merchant vào snapshot. HTTP từ chối Host/Origin ngoài localhost. Test Host dùng `node:http` để bảo đảm thực sự gửi Host tùy chỉnh, vì Fetch có thể ghi đè trường này.

Kết quả lần chạy độc lập sau sửa: **12/12 đạt**, không skip. Đây là phạm vi hữu hạn của deterministic regression; không chứng nhận trạng thái ngân hàng, độ an toàn toàn bộ production hoặc tích hợp Zalo thật.

## Vì sao QA cũ báo không cải thiện

Không có bằng chứng đủ để kết luận mọi lần chạy trước đều đã thực thi cùng thuật toán. Trong mã đã kiểm tra:

1. V3 chỉ sinh synonym từ knowledge đủ trạng thái duyệt. Knowledge hiện tại không có bản ghi đủ yêu cầu review, nên không sinh bổ sung là hành vi bảo vệ hợp lệ. Không hạ yêu cầu duyệt để tăng số liệu.
2. V2/V3 phụ thuộc `variants-50000.jsonl` bị loại khỏi Git. Thiếu file phải ghi BLOCKED/FAIL, không diễn giải thành PASS với 0 cải thiện.
3. V2 dùng patch chuỗi theo cấu trúc cũ của engine; khi không còn khớp, không tạo thay đổi. Đây không phải bộ sửa lỗi tổng quát.
4. V4.3 đánh giá normalizer/intent theo kịch bản, không thực thi đầy đủ câu trả lời của dialogue. Tăng điểm intent không đồng nghĩa tăng chất lượng hội thoại.
5. Synonym đã có, collision hoặc dữ liệu tài chính bị loại có thể cho 0 bổ sung đúng thiết kế. Chạy idempotent lần hai cũng phải cho 0 mới.
6. Commit gốc có tên nhắc đến Adaptive V4.7 nhưng không có runner Adaptive V4.7. V4.8 chỉ có overlay approved và loader, chưa có vòng sinh ứng viên/đánh giá/autofix đủ kiểm chứng. Phải mô tả phần mới là triển khai mới, không gán kết quả cho lịch sử không có dữ liệu.

## Giới hạn và lưu ý vận hành

- `expert.logGap` cũ chỉ bật khi `QH_GAP_LOG=1`, nhưng khi bật sẽ ghi nguyên văn câu hỏi tối đa 250 ký tự vào `knowledge-gaps.jsonl` trong checkout. Bộ redteam chủ động tắt biến này; không đưa file gap/runtime vào báo cáo công khai hoặc CI artifact. Đây là nhánh logging cũ cần review riêng trước bật production.
- State và ticket là dữ liệu riêng tư cục bộ, không phải public telemetry. Dùng đường dẫn runtime ngoài checkout và quyền file phù hợp; không xuất state/tickets/phiên Zalo trong PR.
- Test không kích hoạt công cụ sửa tự động bên ngoài, không chứng nhận sandbox hệ điều hành hoặc quyền mạng của công cụ đó. Review candidate và kiểm tra diff là các cổng cần duy trì; kết quả unit test không thay thế phê duyệt triển khai.
