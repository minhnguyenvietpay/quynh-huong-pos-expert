# Chu kỳ 3 — đối kháng và chốt hồi quy

Baseline là commit chu kỳ2 `2bd2f53`, được export vào thư mục tạm trước khi đánh giá bằng cùng fixture/evaluator. Bộ đối kháng direct **4/10 → 10/10**; probe hồi sinh mã cũ **0/1 → 1/1**. Sáu tình huống listener đối kháng đã đạt6/6 ở chu kỳ2 và vẫn6/6, không nhận công cải thiện mới. C1 giữ18/18, C2 giữ14/14. Bộ direct đối kháng từng có5/10 trên main nhưng còn4/10 sau vòng1/2; thoái lui trung gian đó được công khai và đã sửa.

Đã sửa mã ngắn theo ngữ cảnh, nhiều mã luân phiên không tự chọn nghĩa, mã giao dịch khác mã lỗi, ngày tháng không thành mã, đổi chủ đề xóa context mã cũ, scope phủ định/mơ hồ, câu hỏi OPS khác consent, áp lực xác nhận tiền. Khi giao dịch trước chưa xác minh, router chặn cả lời khuyên đã duyệt theo mã thay vì ghép hướng dẫn restart với cảnh báo trái chiều. Context thanh toán vẫn chặn quẹt lại sau khi chuyển sang máy in. Lời yêu cầu mơ hồ đầu tiên hỏi thêm trước OPS, không đổi fallback legacy.

Đọc phản hồi sau bộ10/10 vẫn tìm thêm hai lỗi (thiếu cảnh báo quẹt lại sau detour máy in, lặp hotspot đã thử); QA thêm assertions trước sửa tiếp,0/2→2/2. Probe quoted nhiều mã0/1→1/1; ngày tháng0/2→2/2; yêu cầu mơ hồ0/1→1/1. Cùng hai probe review của vòng2, có8 ca review bổ sung, ghi rõ là sau triển khai ban đầu, không giả danh blind test. POS Expert xác nhận ba nhóm scope/payment mới8/11→11/11 trên bộ knowledge tổng hợp; corpus thật không đổi.

Kiểm tra chốt local Node24.19.0: `npm test` **413/413**, `qa:v132` **54/54**, language30/30, legacy25/25, QA V3 self-test PASS, quality24/24 contract tổng hợp (gate ngoài blocked), security0 vi phạm. Bộ56 V11 cũ đạt56/56 ở từng mode11/12/13. Không có skip hoặc lỗi chưa xử lý trong các lệnh này. CI bổ sung gate V13.2 và audit knowledge trên Node22/24; trạng thái CI được ghi trong DELIVERY-VI.md sau khi PR chạy.

Môi trường cài lại bằng npm ci với lockfile/integrity giữ nguyên. Cache npm mặc định ngoài workspace không ghi được; dùng cache trong /tmp đã thành công. Đã lưu install_script/start_skill offline vào bản nháp cấu hình cloud; lưu không đồng nghĩa publish hay triển khai.

Giới hạn còn lại:0 nguồn mã thật đủ xác minh; ngữ pháp/model/scope hữu hạn; cảnh báo thanh toán dài; lặp mã chưa rõ có thể lặp giải thích thiếu nguồn; người chỉ nói đừng hỏi Wi-Fi chưa hẳn đã từ chối OPS. Cache không hỗ trợ tin lịch sử chưa nhận, nội dung bị thu hồi/hết hạn hoặc bị loại do nhạy cảm. Không có ground truth OPS, Zalo live hay Windows được kiểm chứng. Chỉ sẵn sàng review PR; chưa merge/deploy.
