# Đánh giá hội thoại ngoại tuyến

`node scripts/quality-report.cjs --output /tmp/quality.json` chạy 24 hội thoại tổng hợp qua `dialogue.processMessage` trong tiến trình con. Các tệp trạng thái, sự kiện và ticket nằm trong thư mục tạm được xóa sau chạy. Không import listener, không kết nối Zalo, không dùng hội thoại khách hàng.

Dataset `tests/fixtures/golden-v1.json` có `schemaVersion`, `datasetVersion`, ID ổn định, nhóm vấn đề, chuỗi lượt thoại, trạng thái review và các hợp đồng mong đợi. Tất cả fixture do AI viết, mang `ai_authored_unreviewed`: đây là ứng viên golden dataset, chưa phải ground truth được xác minh độc lập. Không đổi trường thành verified để vượt gate; cần thiết kế quy trình duyệt độc lập trước khi hỗ trợ nhãn đó.

Các chiều đo gồm intent (nhãn public classifier), answer correctness (hợp đồng regex), context (trạng thái session/escalation/pending và dữ liệu cửa hàng tổng hợp), usefulness (phản hồi không rỗng), consent/payment safety (không xin MID/TID, không echo giá trị nhạy cảm mẫu, không có pending handover trước consent), unsupported claims (mẫu khẳng định không có bằng chứng), regression (không mất case đã pass trong báo cáo nền). Chúng là heuristic/hợp đồng máy, không chứng minh chất lượng hay tính đúng nghiệp vụ trong thực tế. Retrieval relevance trả `null` vì chưa có trace truy xuất độc lập; usefulness chỉ là kiểm tra tối thiểu, không phải thang đánh giá trải nghiệm người dùng.

`independentQualityGate` luôn blocked với số fixture được duyệt độc lập bằng 0. `--require-independent-review` trả exit 2 dù synthetic checks đạt; mặc định exit 0 khi synthetic checks đạt, exit 1 khi fail. CI cần phân biệt hai loại gate này.

So sánh cùng dataset và evaluator với checkout nền: chạy `node scripts/quality-report.cjs --root /tmp/baseline --output /tmp/before.json`, sau đó `node scripts/quality-report.cjs --baseline /tmp/before.json --output /tmp/after.json`. `--root` chỉ đổi mã ứng dụng được nạp; dữ liệu và cách chấm giữ nguyên. Chỉ dùng checkout mã đáng tin. Không so điểm của hai dataset khác phiên bản.

Báo cáo JSON chứa `metrics`, `rows` (input/output tổng hợp và state facts) và `failures: [{id, fixtureId, category, issues}]` để improvement engine tìm nguyên nhân. Không đưa đầu vào thật, credentials hoặc phiên Zalo vào dataset/báo cáo. Kiểm thử evaluator: `node --test tests/evaluation.test.cjs`.

Phiên bản golden-v1.1.0 bổ sung ba regression từ hành vi lỗi quan sát được: treo máy kèm báo trừ tiền cần ưu tiên xác minh và không hướng dẫn khởi động lại; chuyển khoản chưa thấy giao dịch cần kiểm tra Portal; thông báo đã hoạt động lại có hậu tố phải đóng trạng thái escalation. Các case vẫn chưa được duyệt độc lập.

Kết quả đo cùng evaluator/dataset v1.1.0: mã nền `921f6e4` đạt 21/24, mã thay đổi đạt 24/24, ba case cải thiện và không mất case nền đã đạt. Đây là kết quả regression tổng hợp, không phải tỷ lệ chính xác thực tế hoặc phê duyệt triển khai.
