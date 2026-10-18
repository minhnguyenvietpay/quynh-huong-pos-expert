QUỲNH HƯƠNG V7.7 – TAG ĐỒNG THỜI HOÀNG ANH & THU HOÀI

1. Sao lưu listener.mjs và dialogue.js đang chạy.
2. Giải nén và CHỈ chép đè listener.mjs, dialogue.js vào thư mục dự án.
   Chép test-v77.js vào cùng thư mục nếu muốn kiểm thử.
   GIỮ NGUYÊN intent.js, state.js, flows.js, search.js, knowledge.json, package.json, node_modules.
3. Mỗi nhân viên tự nhắn /myid trong nhóm có bot. Bot sẽ trả về Zalo User ID của người gửi.
   Đối chiếu trực tiếp với đúng người, KHÔNG dựa trên tên hiển thị.
4. Trong PowerShell, chạy trước khi khởi động bot (điền ID thực):
   $env:STAFF_ZALO_IDS="ID_HOANG_ANH,ID_THU_HOAI"
   $env:GROUP_MODE="all"
   $env:AUTO_REPLY="true"
   node --check listener.mjs
   node test-v77.js
   node listener.mjs

LUỒNG: tra kiến thức -> không xử lý được -> xin đồng ý -> hỏi tên -> hỏi địa chỉ -> gửi 1 tin kèm 2 Zalo mentions. Không hỏi MID/TID.

QUAN TRỌNG:
- Zalo User ID cần đúng thứ tự: Hoàng Anh trước, Thu Hoài sau.
- Nếu thiếu/sai cấu hình, bot không tag nhầm mà thông báo chuyển thủ công.
- Nếu gửi mentions bị lỗi, bot thử gửi tin thường với cảnh báo; không báo sai rằng đã tag.
- Chưa tích hợp hệ thống ticket công ty; tin nhắn nhóm là thông báo nội bộ, không xác nhận CS/OPS đã tiếp nhận.
- Không tự động dò theo tên vì có thể trùng tên/biệt danh.
- zca-js là thư viện không chính thức; định dạng mention và quyền gửi có thể thay đổi. Kiểm tra trên nhóm thử nghiệm.
- Mỗi yêu cầu tag 1 lần sau khi gửi thành công; nếu bot khởi động lại, trạng thái chuyển tiếp chưa hoàn tất có thể mất.
- Lệnh /myid hiển thị ID trong nhóm; chỉ dùng nhóm nội bộ phù hợp.
