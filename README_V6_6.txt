POS CARE V6.6 – Flexible Intent + Social Replies

Thay 3 file: listener.mjs, intent.js, dialogue.js. Giữ nguyên search.js, flows.js, knowledge.json, .env, node_modules.

Thử: node test-v66.js
Chạy: $env:ALLOWED_GROUP_IDS="<ID nhóm thử nghiệm>"; $env:AUTO_REPLY="true"; $env:TYPING_ENABLED="true"; node listener.mjs

Cải tiến:
- Nhận diện @Quỳnh Hương ở đầu, giữa hoặc cuối câu.
- Nhận diện giới thiệu: "giới thiệu xíu đi e @Quỳnh Hương", "em là ai @Quỳnh Hương".
- Nhận diện lời khen: "giỏi quá", "hay ghê", "good job", "em đỉnh quá".
- Không tự chen vào lời khen giữa các thành viên nếu không có phiên hỗ trợ hoặc gọi tên.
- Giữ typing event, độ trễ 1–2 giây, tra mã lỗi, hội thoại nhiều bước.
- Không lưu tin nhắn nhóm ngoài phạm vi cho phép; chưa kiểm thử trực tiếp với Zalo.

Lưu ý: zca-js là kết nối không chính thức; kiểm thử trong nhóm có sự đồng ý, không gửi thông tin nhạy cảm.
