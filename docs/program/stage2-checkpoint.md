# Giai đoạn 2 — V12.1 tự đánh giá và cải thiện

Chỉ bắt đầu sau commit V12 `81a4a30`. Vai trò Codex Knowledge Expert đánh giá riêng, không phải tác giả runtime V12; đã xem triển khai và tạo 20 hợp đồng kiểm thử tổng hợp mới có độ khó trước khi sửa. Tính độc lập trong nhóm phát triển này không thay thế dữ liệu chuẩn từ merchant được đánh giá độc lập. Nội dung đóng băng, phản hồi baseline và 20 nguyên nhân: stage2-review.md; toàn bộ bản ghi V11/V12/V12.1: stage2-evidence.json.

## Đã hoàn thành và đo lường

Trên bộ thử thách mới: V11 đạt 1/20; V12 đạt 0/20; V12.1 đạt 20/20. V12 làm mất một hợp đồng kiểm thử vốn đạt ở phiên bản cũ trên bộ mới phát hiện này; V12.1 đã sửa. Bộ hồi quy đóng băng giai đoạn 1 vẫn đạt 80/80 (V11 đạt 9/80). Có 20 tình huống mới cải thiện so với V12, 0 hồi quy. Không gộp số liệu này thành độ chính xác production.

Các sửa đổi ưu tiên phản hồi thực tế cho merchant: ngữ cảnh khôi phục hỏi tiếp tục mà không dùng lại consent; phục hồi hoàn toàn sau bước đã thử được kết thúc đúng, còn phục hồi một phần vẫn giữ phiên; phủ định điện thoại/POS được tách phạm vi; giữ lựa chọn từ chối tự nhiên mà không hỏi consent lặp lại; không lưu câu từ chối địa chỉ như vị trí; ưu tiên trừ tiền hai lần và đối soát; nhớ phương thức chip; dùng dữ kiện QR/sạc ngay từ câu đầu; thẻ đang xử lý kích hoạt xác minh giao dịch; phân biệt đăng nhập Portal với bộ lọc báo cáo; yêu cầu bản sao hóa đơn không dẫn đến thanh toán mới; ghi nhận pending mà không suy diễn kết quả; rút ý định hủy cho phép chuyển sang vấn đề máy in. Giải thích khái quát có giới hạn về authorization/capture/payout và tranh chấp, tránh chính sách riêng của ngân hàng hoặc lời hứa. Không có kiến thức mới được phê duyệt.

Đánh giá bảo mật đóng băng riêng 16 test, baseline 0/16 → 16/16: bốn cách diễn đạt thu hồi yêu cầu khi đang thu thập địa chỉ và mười hai trường hợp API-key/token/session/cookie tổng hợp qua ticket/tên/địa chỉ. Giá trị nhạy cảm bị chặn trước khi phản chiếu hoặc lưu trữ. Thu hồi thực sự xóa yêu cầu chuyển tiếp đang chờ; từ chối chuyển hỗ trợ vẫn giữ ngữ cảnh kiểm tra giao dịch.

Kiểm chứng: `npm test` đạt 279/279, 0 bỏ qua; hội thoại thực tế theo bộ đóng băng đạt 100/100; bộ quét bảo mật kiểm tra 133 file, 0 vi phạm. Các lệnh legacy/quality/knowledge bắt buộc đã đạt ở giai đoạn 1; toàn bộ kiểm tra bắt buộc sẽ được chạy lại khi kết thúc giai đoạn 3. CI hiện chạy hợp đồng dữ liệu V12 đóng băng qua `npm test`, ngoài unit test của bộ đánh giá. Script so sánh trích xuất các revision vào thư mục tạm và giữ nguyên byte/hash của dữ liệu kiểm thử.

## Giới hạn và công việc còn lại

Phạm vi ngôn ngữ tất định vẫn giới hạn; corpus nguồn vẫn là 0/5000 mục được xác minh. Các định nghĩa khái quát mới do nhóm phát triển viết, không phải quy trình ngân hàng đã được xác minh bên ngoài. Các assertion hiện có là tổng hợp, chỉ được Codex đánh giá. Không kiểm thử giám sát trực tiếp/Zalo/merchant, không triển khai hoặc merge. Giai đoạn 3 phải dùng tình huống đối kháng chưa được thiết kế trong giai đoạn 2: mâu thuẫn, phạm vi, lặp bước thất bại, ưu tiên nhiều triệu chứng, từ chối và gián đoạn ngữ cảnh. Kiểm tra bộ nhớ/giới hạn dung lượng và cơ chế dự phòng khi gặp lỗi dưới đầu vào đối kháng, so sánh cả bốn revision và giữ khả năng hoàn tác.

Commit hoàn thành giai đoạn 2: `094bdd8`.
