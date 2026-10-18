# Monitoring QA cục bộ: giao diện, chưa kết nối Zalo

`node scripts/online-qa-server.cjs` mở dashboard chỉ đọc tại `http://127.0.0.1:3048/`; JSON tại `/api/metrics`. Tiến trình độc lập khởi tạo bộ đếm bằng 0. Không phải số liệu live, không có lịch sử production, không có connector Zalo. Không thay đổi listener hoặc dialogue engine để kích hoạt. Việc gắn vào tích hợp thật cần review và phê duyệt riêng.

## Giao diện

`require('../lib/monitoring/index.cjs').createMonitor()` trả về:

- `record({outcome, durationMs, repeated, escalated, consent})`: chỉ chấp nhận outcome `answered`, `unanswered`, `failed`; thời gian hữu hạn 0–86400000 ms và các cờ boolean. Từ chối trường bổ sung, kể cả message, customerId, token, session hoặc exception.
- `snapshot()`: bản sao bộ đếm, phân bố/giá trị trung bình/tối đa latency và khóa replay synthetic cố định. Không xuất timestamp, định danh, nội dung, exception hoặc metadata tự do.
- `wrap(process, {classify, conversationKey})`: adapter opt-in bao quanh hàm async; giữ nguyên kết quả hoặc ném lại lỗi gốc cho bên gọi. Không ghi exception hoặc log nội dung. `classify(result, ...args)` cần trả metadata đáng tin `outcome`, `escalated`, `consent` từ hệ thống nghiệp vụ; trường khác bị bỏ. Khi không có classifier, null/chuỗi rỗng là unanswered, kết quả khác là answered. Đây là kiểm tra có phản hồi, **không phải** chứng minh phản hồi đúng nghiệp vụ. Classifier lỗi không làm hỏng hàm xử lý thành công.

Khi có `conversationKey`, adapter so sánh hash SHA-256 của hai phản hồi chuỗi liên tiếp trong cùng hội thoại; không lưu chuỗi gốc. Hash định danh và phản hồi chỉ tồn tại trong RAM, không xuất ra ngoài. Mặc định giới hạn 1000 hội thoại, hết hạn sau 30 phút và dọn khi có phản hồi mới; process restart xóa toàn bộ. Hash không phải kỹ thuật ẩn danh mạnh; vẫn phải giữ process riêng tư. Không truyền credential hoặc session làm conversationKey. Cơ chế chỉ phát hiện lặp lại chính xác, không đánh giá tương đương ngữ nghĩa. Theo dõi consent do classifier cung cấp; không tự suy luận đồng ý từ câu nói hay tự thực hiện escalation. Khi metadata escalated thiếu, không thể phát hiện escalation xảy ra bên ngoài adapter.

Các replay key được ánh xạ cố định: `synthetic.processor-error`, `synthetic.empty-response`, `synthetic.repeated-response`, `synthetic.escalation-without-consent`. Chỉ dùng chúng để chọn tình huống kiểm thử được biên soạn trước; không tạo corpus từ dữ liệu khách hàng.

## Bảo vệ dashboard

Chỉ GET `/` và `/api/metrics`, không có API ghi, CORS, token hay logging request. Host và Origin ngoài localhost bị từ chối; CSP cấm script và framing; response không cache. CLI bind `127.0.0.1`; không public hoặc reverse-proxy dashboard ra Internet. Đây là dashboard local không có cơ chế xác thực và không phải ranh giới bảo mật cho máy có nhiều người dùng. Không truyền URL có credential.

## Kiểm chứng

`node --test tests/monitoring.test.cjs`: kiểm tra trường dữ liệu độc hại, loại bỏ dữ liệu khỏi snapshot, exception, unanswered, lặp lại, latency, consent, giới hạn/hết hạn trạng thái, classifier lỗi, snapshot isolation, GET và Host/Origin. Toàn bộ input synthetic. Không cần dependency mới hoặc tài khoản Zalo.
