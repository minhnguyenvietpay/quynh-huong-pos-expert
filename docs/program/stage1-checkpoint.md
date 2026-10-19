# Giai đoạn 1 — V12 POS Expert Pro

Mốc main ban đầu: `180adac`; nhánh phát triển: `feat/v12-three-stage-program`. Chạy Node cục bộ, ngoại tuyến; không dùng suy luận trả phí hoặc kết nối Zalo. Giữ nguyên các module V11; bộ điều phối V12 chỉ bật khi được chọn, có cơ chế dự phòng V11 được bảo vệ; đầu vào gốc đi qua kiểm tra điều kiện phản hồi của listener. Không triển khai.

## Đã hoàn thành

Đã đóng băng 80 tình huống hội thoại tổng hợp, chạy qua luồng phản hồi thực tế (hash và toàn bộ bản ghi trong stage1-evidence.json). Tái hiện 71 tình huống không đạt hợp đồng kiểm thử, thuộc 15 nhóm nguyên nhân; không phải 71 lỗi nghiệp vụ độc lập. Baseline V11 đạt 9/80; V12 đạt 80/80; 71 tình huống cải thiện, 0 hồi quy. Đáp ứng yêu cầu 50 ví dụ có thể tái hiện, nhưng đây chưa phải dữ liệu chuẩn được đánh giá độc lập.

V12 lưu loại kết nối SIM/Wi-Fi, kết quả kết nối điện thoại, trạng thái giấy và các thao tác đã thử theo đúng phạm vi; hỏi chẩn đoán phù hợp thay vì chuyển hỗ trợ quá sớm; giữ trạng thái lỗi in khi chỉ phục hồi một phần; nhận diện câu hỏi định nghĩa mà không khởi động nghiệp vụ tài chính; thu hồi consent trước bước thu thập thông tin cửa hàng; ghi nhận biểu tượng sạc. Xử lý phủ định theo phạm vi giúp bảo vệ trước nguy cơ pin thực sự và tránh suy diễn giao dịch đang xử lý. Bộ nhớ có số trường hữu hạn, TTL/giới hạn dung lượng và bản sao cách ly. Truy xuất yêu cầu chứng cứ đã duyệt, còn hiệu lực, khớp nội dung; chặn câu trả lời mâu thuẫn hoặc không an toàn. Corpus hiện có vẫn là 0/5000 mục được xác minh.

Kiểm chứng: `npm test` đạt 244/244, không bỏ qua test; `qa:language` đạt 30/30; `qa:legacy` đạt 25/25; V3 self-test PASS; `qa:quality` đạt 24/24 tình huống tổng hợp (cổng chất lượng độc lập BLOCKED); báo cáo kiến thức có 0 mục được xác minh; kiểm tra bảo mật không phát hiện vi phạm. Các test bao gồm điều phối hội thoại thực tế, dự phòng khi V12 thiếu hoặc lỗi, consent, đầu vào nhạy cảm và thu thập tên cửa hàng tổng hợp. Các lệnh bắt buộc hoàn tất với mã thoát 0. CI Node 22/24 đã được cấu hình chạy test V12; chưa quan sát kết quả CI từ xa.

## Các báo cáo không có cải thiện trước đây

Đã kiểm tra lại chẩn đoán trong ../QA-REVIEW-VI.md: thiếu bộ dữ liệu variants nằm trong danh sách ignore khiến V2/V3 bị chặn; chưa có kiến thức được duyệt khiến V3 không đủ điều kiện mở rộng; mẫu vá khớp chuỗi chính xác có thể không khớp mã; QA chỉ đo intent không đánh giá phản hồi `processMessage`; quy tắc loại bản trùng/từ đồng nghĩa khiến lần mở rộng lặp lại không tạo thay đổi. Chưa đủ bằng chứng thực thi lịch sử V4.7/V4.8 để khẳng định một nguyên nhân chung cho mọi lần chạy. Không bỏ qua cổng phê duyệt để tăng số lượng cải thiện.

## Giới hạn và giai đoạn tiếp theo

Hệ thống vẫn dùng quy tắc tất định, các mẫu tiếng Việt có phạm vi giới hạn; không xác minh nguồn bên ngoài hoặc truy cập hệ thống giao dịch. Câu trả lời định nghĩa vẫn ở mức khái quát. Tác giả triển khai hiện đã biết bộ dữ liệu phát triển này. Giai đoạn 2 phải đánh giá V12 riêng và đóng băng 20 thử thách mới có ý nghĩa trước khi sửa. Công việc đối kháng giai đoạn 3 chỉ bắt đầu sau commit giai đoạn 2. Vẫn cần OPS đánh giá, kiểm chứng trên staging được phép và phê duyệt production rõ ràng; các cờ runtime mặc định vẫn tắt. Xem runtime-operations.md để hoàn tác.

Các vai trò đã thực hiện: Tech Lead (tích hợp), Knowledge Expert (truy xuất), Conversation Intelligence (NLU), Backend & Retrieval (bộ nhớ), QA & Simulation (bộ đánh giá đóng băng), Root Cause & Red Team (test đối kháng), Security & Compliance (test hội thoại cách ly), Release & Automation (CI/vận hành). Đây là đánh giá phát triển của Codex, không phải kiểm chứng độc lập từ merchant/OPS.

Commit hoàn thành giai đoạn 1: `81a4a30`.
