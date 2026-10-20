# Chu kỳ 2 — hiểu reply trong listener thật

Đã tích hợp `listener.mjs → lib/reply-context.cjs → dialogue.js`, chỉ bật reply mới với `QH_V13_ENABLED=true`. SDK đã kiểm tra là zca-js 2.2.0; không gọi login/history trong QA. Resolver yêu cầu mention metadata trỏ đúng bot, đối chiếu group, chủ tin gốc và cả hai ID. Không dùng quote.msg làm nguồn, không chọn tin gần nhất.

Cache chỉ giữ dữ kiện chuẩn hóa hữu hạn, không giữ nguyên văn: tối đa 1.000 tin, 500 liên kết case, TTL15 phút, hết hạn/thu hồi/eviction làm mất liên kết. Tin nhạy cảm bị loại bỏ. Không tải tin lịch sử chưa nhận. Scope case bao gồm nhóm, người đang hỏi và tham chiếu gốc; không lấy consent hay lệnh trong quote. Case analysis không tạo ticket/handover. Staff phải nằm trong STAFF_ZALO_IDS và nhóm QH_CASE_ANALYSIS_GROUP_IDS; không suy quyền từ câu chữ. Chưa cấu hình quyền thì trả lời merchant-safe.

Actual listener VM với fake SDK, chặn network: **1/14 → 14/14** trên bộ đóng băng. Safety resolver độc lập **13/13**; hai bộ listener cũ **15/15**. Đọc phản hồi sau bộ xanh phát hiện hai mất mát dữ kiện (màn hình thanh toán chưa rõ kết quả, bill trắng); thêm regression trước sửa, **0/2 → 2/2**. Không tính hai ca đó là đánh giá mù trước triển khai. Toàn bộ `npm test`: **398/398**, 0 lỗi, 0 skip.

Giới hạn: parser dữ kiện hữu hạn; nội dung ngoài tập hỗ trợ hoặc có dữ liệu nhạy cảm cần gửi lại mô tả tối thiểu, không tự đoán. Follow-up “đã thử rồi” yêu cầu chỉ rõ bước và kết quả thay vì tự đánh dấu mọi bước thất bại. Chưa xử lý mọi câu trả lời cụ thể/biến thể tự do cho case. Không có ground truth OPS độc lập và chưa kiểm thử Zalo live/Windows.

Còn lại ưu tiên chu kỳ3: câu mã ngắn, nhiều mã, áp lực xác nhận tiền, từ chối OPS tự nhiên, đổi chủ đề không hồi sinh mã cũ, scope mơ hồ/phủ định, payment-risk trước lời khuyên đã duyệt; chạy bộ đối kháng listener và toàn bộ hồi quy/CI. Chưa merge hoặc triển khai.
