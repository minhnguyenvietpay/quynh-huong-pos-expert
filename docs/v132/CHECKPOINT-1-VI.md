# Chu kỳ 1 — sửa định tuyến thực tế

Baseline: main `1a33422e34beb25747238c24214097de4465e5c1`. Đầu vào, tiêu chí và phản hồi trước sửa được QA giữ riêng trước thay đổi runtime; xem frozen-cycles.json và cycle1-{before,after}.json.

Đã sửa câu hỏi khả năng; nhận diện network error; dùng một extractor mã lỗi chung, giữ số 0 đầu và đưa tra cứu mã lên trước chẩn đoán chung trong expert V13/V12. Truy xuất yêu cầu đúng phạm vi thiết bị/đơn vị xử lý và bằng chứng xác minh, từ chối xung đột. Context mã lỗi RAM có TTL/cap, ghi nhận scope đã trả lời. Kho thật giữ nguyên, không nâng trạng thái duyệt.

Actual dialogue: **6/18 → 18/18** trên hội thoại mô phỏng đóng băng; hai ca chào/giới thiệu và chuyển settlement đã đạt trước sửa. POS/knowledge + safety: **21/21**. Toàn bộ npm test đã đạt sau sửa tương thích. Lần chạy đầu phát hiện các contract legacy bị đổi và bộ tương lai bị kích hoạt sớm; đã giới hạn router mới theo cờ expert, giữ fallback default/V11 và tách manifest bộ chưa triển khai. Không sửa yếu kỳ vọng để bỏ qua lỗi.

Knowledge: 5.000 bản ghi, 121 thuộc mã lỗi, **0 đủ xác minh**; 02/03/06 mỗi mã có một bản chưa xác minh. Coverage mã thật có mẫu số 0, không phải bằng chứng đúng 100%. Các fixture đã duyệt giả lập chỉ chứng minh cơ chế. Một regex evaluator an toàn đã sửa để không nhận nhầm cảnh báo phủ định thành hướng dẫn khởi động lại; được ghi rõ trong knowledge-review.md.

Còn lại: reply + metadata chưa được triển khai, các thử thách chu kỳ 3 vẫn là lỗi đã biết, scopeparser hữu hạn và chưa có đánh giá OPS độc lập. Chu kỳ 2 ưu tiên tham chiếu chính xác, quyền staff cấu hình, cách ly case, giới hạn RAM và quoted instruction. Chu kỳ 3 xử lý câu ngắn/mâu thuẫn/nhiều mã/đổi chủ đề và hardening toàn bộ.

Chưa chạy Zalo thật, chưa triển khai, chưa merge. Cờ V13/V12 cùng chọn module expert đã cập nhật; quay lại mã V13 cũ cần rollback commit và cấu hình đã ghi nhận.
