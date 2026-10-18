# V11: chính sách không dùng suy luận trả phí

V11 chạy bằng mã và tri thức trong repository; không yêu cầu khóa API hoặc dịch vụ suy luận trả phí. Codex chỉ được dùng trong quá trình phát triển có review. Không chạy listener Zalo hoặc gửi tin khách hàng để đánh giá ngoại tuyến.

## Chặn đường tự động gọi AI

- `node scripts/improve.cjs run` luôn thoát với mã 1 và thông báo `V11_ZERO_COST` trước khi đọc báo cáo, cấu hình, thông tin xác thực hoặc gọi Git/Docker/API. Biến opt-in cũ không vượt qua được chính sách này.
- `plan --report <báo-cáo-ngoại-tuyến.json>` vẫn hoạt động, giữ phân cụm lỗi, lịch sử và các cổng kiểm định cũ. Plan không sinh hay áp dụng bản vá.
- Workflow `autonomous-coding.yml` chỉ giải thích chính sách, quyền đọc, không nhận secret và không chạy coding agent. Đã loại mã thực thi provider/Docker cũ khỏi runner và bỏ Dockerfile coding-agent không còn dùng.
- Cấu hình mẫu tắt runner, suy luận trả phí và xuất PR. Không có model, image hoặc khóa bắt buộc.

## Kiểm định và phát hành

`offline-qa.yml` chạy kiểm thử hiện có trên Node 22/24, thêm `QH_V11_ENABLED=true node scripts/v11-evaluate.cjs --fail-on-regression`. Báo cáo đặt trong `qa-reports`, không upload hội thoại hay log vận hành. Đây là bộ hội thoại tổng hợp do AI soạn, chưa phải độ chính xác được chuyên gia duyệt độc lập.

Cờ `QH_V11_ENABLED` mặc định tắt. Chỉ bật sau review bằng biến môi trường của môi trường thử nghiệm được phê duyệt. Việc cài cờ không đồng nghĩa đã cho phép bật listener sản xuất. Khi có lỗi, bỏ cờ hoặc đặt `false` để trở lại đường xử lý cũ; giữ commit nền làm mốc rollback. CI và các cổng kiểm định không tự merge hoặc deploy.

Không tự xác nhận trạng thái thanh toán/đối soát, không xin MID/TID, chỉ chuyển OPS khi có đồng ý rõ ràng. Không dùng dữ liệu khách hàng thật trong báo cáo hoặc prompt. Người review cần duyệt trước/sau, hồi quy an toàn, nguồn tri thức và giới hạn kiểm định trước khi chấp nhận PR.
