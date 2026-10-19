# V13.2 — Đánh giá độc lập vòng 1

QA Judge giữ riêng tiêu chí với Code Engineer; đầu vào do Merchant Simulator viết. Dataset 18 hội thoại được đóng băng trước sửa, hash trong `frozen-cycles.json`, baseline commit `1a33422`. Đây là kiểm tra tổng hợp do các vai phát triển độc lập viết, chưa phải ground truth được OPS xác nhận.

Kết quả actual `dialogue.processMessage`: **6/18 → 18/18**, 12 ca cải thiện theo bộ tiêu chí, không có ca thoái lui trong bộ này. Các biến thể mã thuộc một cụm, không được tính là nhiều lỗi nghiệp vụ độc lập. Hai trường hợp người dùng nêu (hi em → giới thiệu; đơ → hỏi settlement) đã đạt trên main, không nhận công sửa mới.

Đọc thủ công toàn bộ 18 phản hồi cuối và lượt trung gian xác nhận:

- Câu hỏi khả năng không còn mời OPS; liệt kê POS/mạng/QR/thẻ/tra soát/đối soát/Portal và giới hạn không truy cập ngân hàng thời gian thực.
- Network error đi vào chẩn đoán mạng, giữ rào thanh toán. Dữ kiện điện thoại cùng Wi-Fi cũng mất mạng được dùng để phân biệt đường truyền chung.
- 02/03/06 giữ số 0 đầu, thừa nhận thiếu hướng dẫn xác minh. Model-A/Acquirer-A đã cung cấp không bị hỏi lại sau khi ghi nhận; sửa 03 thành06 không dùng mã cũ.
- Số tiền/ngày/mã giao dịch không bị biến thành mã lỗi. Chuyển sang Portal thoát luồng mã lỗi.
- Khách báo trừ tiền không bị suy diễn thành giao dịch thành công/thất bại, không yêu cầu quẹt lại hoặc MID/TID; không có pending handover.

Giới hạn: bộ tiêu chí regex+state không chứng minh câu trả lời hoàn hảo. Phản hồi network đầu tiên hỏi loại kết nối, kèm cảnh báo nhưng chưa hỏi rõ tình trạng giao dịch; cần vòng đối kháng kiểm tra việc không đề xuất khởi động lại trước khi loại trừ rủi ro. Toàn bộ knowledge thực tế chưa có bản ghi đủ điều kiện xác minh; câu trả lời theo mã phải dừng ở làm rõ/thiếu nguồn, không được coi là đã giải quyết nguyên nhân mã. Baseline/after JSON chứa duy nhất câu chữ giả lập, không có dữ liệu khách hàng.

Ưu tiên vòng2: tham chiếu reply chính xác, phân quyền staff bằng cấu hình, tách tác giả gốc/người đang hỏi, cache giới hạn và ngăn rò ca. Vòng3: mâu thuẫn/trả lời ngắn/nhiều mã/ép xác nhận tiền, cùng prompt injection và vòng đời reply.
