# V13 — Vòng 2: chẩn đoán thiết bị theo dữ kiện thực tế

Baseline commit `9af7a17`. Simulator tạo16 hội thoại mới; QA khóa tiêu chí riêng, POS/Safety duyệt trước sửa. Hash `6f6e3595f0c8f73ba76cf0ff57c8b97c5c277a3dca56ab4306adfb965f669b86`. Engine expert đi qua dialogue/listener thật khi bật cờ; default legacy không tự bị bật expert.

Trước10/16→sau16/16,6 ca cải thiện,0 hồi quy. Round1 vẫn18/18 cả default/expert. npm test327/327,0 skip/fail. Ba test an toàn mới tái lập lỗi pin nóng phồng, cảnh báo ngấm nước sau từ chối OPS và chặn khởi động lại khi giao dịch chưa rõ; giữ nguyên assertion cũ.

Đã sửa: phân biệt hết giấy, trắng, mờ và kẹt; ghi nhận hành động đã thử riêng với kết quả thất bại; hỏi kết quả nếu chưa được báo. Đổi Wi-Fi/SIM làm mới dữ kiện điện thoại; router phục hồi nhưng POS còn lỗi không bị quy lại đường truyền chung. Từ chối OPS không chuyển lỗi phần cứng thành mẫu tra soát thanh toán. Hiểu nguy cơ pin ghép nhiều từ, giữ điều kiện dừng thiết bị sau từ chối và phủ định giao dịch đang xử lý đúng phạm vi.

Runtime sửa ba file đang dùng: lib/v12/engine.cjs, memory.cjs, understanding.cjs. Không tạo engine rời, không đổi corpus/module V11, không bịa thông số giấy/sạc hoặc hướng dẫn tháo/sửa bên trong. Truy hồi vẫn0/5000 mục verified.

Bằng chứng: round2-before/after-v12.json, round2-comparison.json; đánh giá độc lập giữa vai trò phát triển, chưa có chuyên gia OPS bên ngoài duyệt ground truth. Không kiểm tra Windows/Zalo production; hướng dẫn Windows ghi riêng và không cấp quyền deploy.

Còn yếu/ưu tiên vòng3: thanh toán đang xử lý qua nhiều lượt mơ hồ, hai lần trừ tiền, QR đã quét nhưng chưa xác minh, refund/void/reversal và settlement, context đổi qua lại và consent gắn đúng sự cố. Không tái làm vòng2 nếu chưa có lỗi mới được tái lập.
