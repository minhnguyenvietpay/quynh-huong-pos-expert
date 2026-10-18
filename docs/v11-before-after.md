# V11: bằng chứng kiểm thử trước/sau

Bản gốc `6378028`, snapshot độc lập tại /tmp trước sửa engine. Cùng 56 hội thoại, SHA-256 `fcba8c8914444e9aaa7769dea5055acb0a4984f4aff6ea1e148b457a4383589e` ở cả hai lần.

- Trước: 26/56 đạt, 30 ca lỗi ràng buộc.
- Sau bật V11: 56/56 đạt; 30 ca cải thiện, 0 hồi quy theo assertion.
- Tắt cờ trên mã hiện tại: 26/56 đạt; phản hồi khớp snapshot gốc: true.
- Test evaluator: 3/3 đạt; kiểm tra streaming ranh giới 55..57. Đã chạy tải lặp 100.000 lượt từ 56 hội thoại trong khoảng 23 giây, 0 lỗi ràng buộc; đây không phải 100.000 ca độc lập hay bằng chứng nghiệp vụ.

30 ca lỗi hợp đồng phản hồi là 30 kịch bản tái hiện, không phải 30 nguyên nhân độc lập. Nhóm nguyên nhân: thiếu nhận diện thiết bị; mất ngữ cảnh thanh toán; thiếu ưu tiên nguy hiểm vật lý; xử lý bước đã thử/từ chối/chuyển chủ đề.

Tất cả gắn `ai_authored_unreviewed`, `independentReview=false`. Chưa có thẩm định chuyên gia, không công bố độ chính xác thực tế hay kiến thức mới đã được xác minh. Fallback an toàn đôi khi fail vì thiếu chẩn đoán cụ thể. Không kết nối Zalo hay ngân hàng.

Chi tiết từng câu hỏi, câu trả lời cũ/mới, trạng thái, assertion lỗi và lý do cải thiện lưu trong [v11-before-after.json](v11-before-after.json). Tái lập cả hai phiên bản: `node scripts/v11-compare.cjs --output qa-reports/v11-comparison.json`. CLI: `QH_V11_ENABLED=true node scripts/v11-evaluate.cjs`; tải lặp có kiểm soát: `--jsonl --start 0 --limit 1000`. Dữ liệu lặp không tạo thêm ground truth.
