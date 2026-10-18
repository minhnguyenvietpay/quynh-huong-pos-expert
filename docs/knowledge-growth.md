# Knowledge Growth Engine — chế độ đề xuất ngoại tuyến

Chạy `node scripts/knowledge-report.cjs` để tạo `qa-reports/knowledge-growth.json`. CLI chỉ in số lượng và đường dẫn. Không gọi Zalo, không gửi mạng, không chỉnh `knowledge.json`, không tự đưa kiến thức vào câu trả lời.

Module `lib/knowledge/index.cjs` xuất `adaptLegacy(rows)`, `validate(record)`, `analyze(records, { now, staleDays })`, `domains`, `taxonomy`. Bản ghi gồm `id`, `domain`, `question`, `answer`, `sources`, `evidence`, `confidence` (0–1), `verificationStatus`, `verifiedAt`. Trạng thái cho phép: `unverified`, `review_pending`, `verified`, `rejected`. Không coi confidence hay nhãn nguồn là chứng cứ. `verified` yêu cầu nguồn `official_document`/`approved_runbook`, evidence có reviewer và ngày review, ngày verified. Tham chiếu nguồn mới và evidence phải dùng HTTPS, không chứa userinfo, query hoặc fragment; người review vẫn phải kiểm tra nội dung URL và tài liệu thực tế. Validator kiểm tra cấu trúc, không chứng thực quyền hạn reviewer hoặc tính đúng đắn nguồn.

Tập 5.000 mục cũ được chuyển thành bản ghi đọc riêng: toàn bộ `unverified`, confidence 0, evidence rỗng. Nhãn nguồn cũ được giữ loại `legacy_label`, tuyệt đối không nâng cấp thành nguồn chính thức. Chưa thêm seed đã xác minh vì chưa kiểm tra tài liệu chính thức. Không sử dụng số lượng 5.000 để tuyên bố độ chính xác.

Taxonomy bao gồm thiết bị, pin, giấy/in, kết nối, onboarding, QR/thẻ, authorization/capture, trạng thái giao dịch, refund/reversal, settlement/payout, reconciliation/reporting, dispute, multi-branch, bảo mật và hỗ trợ OPS. Nhóm chưa có mapping rõ ràng giữ trống hoặc `unclassified`; không suy diễn phạm vi từ tên nhóm chung.

Phát hiện trùng dựa trên domain + câu hỏi chuẩn hóa và câu trả lời giống nhau; câu trả lời khác nhau chỉ là **nghi vấn xung đột**, cần review, chưa khẳng định mâu thuẫn. Chưa dò được paraphrase hoặc mâu thuẫn ngữ nghĩa; kết quả 0 không có nghĩa corpus không có lỗi. Review lại sau 180 ngày mặc định, đánh dấu ngày tương lai và ID trùng. Review queue chỉ có ID băm và mã lý do; không xuất câu hỏi, câu trả lời, nhãn nguồn hoặc dữ liệu khách hàng. ID adapter ổn định theo thứ tự corpus hiện tại; đổi thứ tự sẽ đổi ID.

Kết quả chạy trên corpus hiện tại: 5.000 mục, 0 mục verified, 0 nhóm trùng chính xác, 0 nhóm nghi vấn xung đột cùng câu hỏi, 5.003 yêu cầu review (một mục có thể có nhiều lý do). Ba bản ghi thiếu nhãn nguồn được đánh dấu invalid, ngoài yêu cầu evidence review chung. Đây là đo chất lượng metadata, không phải đánh giá nội dung bot.

Kiểm chứng: `node --test tests/knowledge-growth.test.cjs` — 6 test đạt, gồm evidence/source gate, không tự xác minh corpus cũ, duplicate/conflict, đầu ra không chứa raw content, staleness/ID và aggregate corpus thực. Fixture nguồn example.org chỉ dùng kiểm thử cấu trúc, không phải tài liệu POS thật.
