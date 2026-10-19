# V13 — Vòng 1: chào hỏi, giới thiệu và trạng thái OPS

Nền `eefe224` trên main (V12.2 đã merge). Đã khóa18 hội thoại đa lượt trước sửa, hash trong frozen-rounds.json. Simulator tạo đầu vào; QA lập tiêu chí riêng; POS Expert và Safety review. Đây là review phát triển bằng Codex, không phải ground truth merchant/OPS độc lập.

Baseline default2/18 và engine V12.2 8/18; sau sửa18/18 ở cả hai chế độ, không hồi quy trong bộ đã khóa. Chín test safety giữ nguyên:2/9→9/9. Đường listener thật được kiểm thử bằng SDK giả lập, không mạng/đăng nhập: toàn chuỗi chào→giới thiệu→“Không” được xử lý, không ticket hoặc mention OPS. Các kỳ vọng cũ giữ nguyên.

Nguyên nhân: greetingOnly bỏ sót “hi em”; giới thiệu chạy sau escalationReply và các engine. Bộ thu thập chỉ kiểm tra độ dài nên nhận câu xã giao làm tên/địa chỉ. Listener cũng có thể chuẩn hóa xã giao thành sự cố và bỏ câu trả lời ngắn khi không có incident session.

Thay đổi: nhận diện xã giao toàn câu trước collector/engine; giữ nguyên câu xã giao gốc từ listener; hội thoại xã giao có cửa sổ hữu hạn cho câu ngắn tiếp theo; giữ cảnh báo thanh toán và ngữ cảnh chẩn đoán; không nhận xã giao hoặc “có/ok” sau lời chào làm consent.

PAUSE đã được Safety review: nếu đã đồng ý cho cùng sự cố thì lời chào không tự rút consent cũ. Bộ thu thập tạm dừng, pending bị xóa, hasEscalation=false; chỉ tên cửa hàng/địa chỉ rõ ràng hoặc xác nhận OPS rõ mới tiếp tục. Rút consent, đổi sự cố, reset/TTL xóa phần tạm dừng. Không sửa sáu assertion safety yêu cầu tiếp tục thu thập sau xã giao; thiết kế PAUSE đáp ứng chúng đồng thời chặn tự dispatch. Collector chưa có consent không được tự tiếp tục.

File runtime: intent.js, dialogue.js, listener.mjs, lib/v12/engine.cjs. Không đổi module V11, credential, corpus hoặc lockfile. Không deploy/merge/gửi Zalo thật.

Phần còn yếu: default legacy vẫn có thể mất ngữ cảnh payment ở các lượt mơ hồ như “chưa rõ”; chưa kiểm tra sâu giấy hết, kết nối thay đổi, Portal nhiều chi nhánh. Vòng2 ưu tiên chẩn đoán thiết bị và bước đã thử; các vòng sau thanh toán, vận hành và đối kháng.

Đính chính coverage khi bàn giao:18 fixture khóa gồm17 đa lượt và1 mixed-intent probe một lượt. Probe giữ nguyên hash/assertion; đã bổ sung counterpart đa lượt sau sửa trong tests/v13-multi-turn-followups.test.cjs, không tính là ca độc lập mới.
