QUỲNH HƯƠNG V7.2 (bao gồm V7.0 + V7.1 + V7.2)
====================================================
ĐÂY LÀ BẢN PATCH: giữ nguyên knowledge.json, flows.js, search.js, package.json, node_modules hiện có.
Không bao gồm kết nối CS/OPS thực tế, không tự gửi ticket, không có AI API.

CÀI ĐẶT TRÊN WINDOWS
1. Dừng bot Ctrl+C. Sao lưu thư mục zalo-pos-care-v5.
2. Copy 6 file listener.mjs, dialogue.js, intent.js, state.js, report.js, test-v72.js vào C:\Users\LENOVO\zalo-pos-care-v5.
3. cd $HOME\zalo-pos-care-v5
4. node --check listener.mjs
5. node test-v72.js
6. $env:GROUP_MODE="all"
   $env:AUTO_REPLY="true"
   $env:TYPING_ENABLED="true"
   $env:LOG_UNKNOWN="true"
   node listener.mjs

QUẢN TRỊ NHÓM
- Khai báo $env:ADMIN_USER_IDS="ZALO_USER_ID_1,ZALO_USER_ID_2" trước khi chạy.
- Người có ID được cấp quyền gửi /bot off, /bot on, /bot status trong nhóm.
- Nếu chưa khai báo ADMIN_USER_IDS, không ai dùng được lệnh quản trị.
- Chỉ quản trị viên được cấp quyền mới có thể dùng lệnh. Bot vẫn hỗ trợ tất cả nhóm theo GROUP_MODE=all.

TICKET
- Gửi /ticket MID 12345678 TID 7654321 POS bị đơ để nhận bản nháp ticket.
- KHÔNG tự gửi ticket sang hệ thống khác. CS/OPS cần kiểm tra và gửi thủ công.

DASHBOARD
- Mở PowerShell ở thư mục dự án, chạy: node report.js
- Mở pos-care-dashboard.html bằng trình duyệt.
- Dashboard được tạo từ pos-care-metrics.jsonl, không chạy web server, không có realtime.

BẢO MẬT / RIÊNG TƯ
- pos-care-state.json lưu trạng thái phiên, có thể chứa lựa chọn flow và ID nhóm/người gửi; KHÔNG đưa file này lên public repo.
- pos-care-metrics.jsonl có ID nhóm (không lưu nội dung tin nhắn); giữ file trong máy nội bộ.
- Dùng tài khoản thử nghiệm và nhóm đã đồng ý dùng bot. zca-js là thư viện Zalo cá nhân không chính thức.
- Không nhập hoặc gửi OTP, PIN, CVV, mật khẩu, số thẻ đầy đủ trong nhóm.
- Bản vá không thay đổi nội dung 456 mục kiến thức; mức độ xác thực của kiến thức phụ thuộc bộ dữ liệu hiện có.

GIỚI HẠN
- Nhận diện tiếng Việt vẫn dựa trên quy tắc, không phải LLM.
- Session TTL mặc định 30 phút; trạng thái lưu ra file JSON, phù hợp một tiến trình bot.
- Không chạy nhiều listener cùng tài khoản.
- Kiểm thử cục bộ không thay thế kiểm thử Zalo và OPS duyệt nội dung.
