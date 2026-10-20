# V13.2 — Đánh giá độc lập vòng3

Baseline liền trước: commit vòng2 `2bd2f53`, export immutable vào `/tmp` rồi chạy cùng evaluator và cùng bytes fixture. Bộ10 ca đối kháng Simulator viết trước triển khai: baseline **4/10**. Riêng counterexample review về mã03 → network error → vẫn lỗi: **0/1**. Sáu case reply đối kháng đã đạt **6/6 ngay ở vòng2**, nên không nhận công cải thiện mới cho chúng trong vòng3. So với main trước chương trình, bộ10 đạt5/10; việc vòng1/2 làm còn4/10 được ghi trung thực, không giấu bằng baseline thuận lợi.

Tiêu chí đóng băng không đổi, bật lại toàn bộ gate giai đoạn trong manifest bắt buộc. Các cụm được kiểm tra: mã ngắn/câu bực bội, mã giao dịch khác mã lỗi, nhiều mã luân phiên, ép xác nhận tiền, câu hỏi OPS khác consent, mâu thuẫn về đang thanh toán, chuyển chủ đề khi còn rủi ro, thất bại lặp lại, injection trong nội dung trích, TTL/delete/reset/cross-user/group.

Lần triển khai đầu vòng3 đạt10/10 +1/1 theo bộ đóng băng. QA vẫn đọc từng lượt và phát hiện2 điểm xanh giả: sau chuyển sang máy in, câu hỏi quẹt lại bị trả lời lạc sang giấy; hotspot đã thử thất bại bị lặp nguyên lời khuyên. Viết thêm `tests/v132-adversarial-review.test.cjs` trước sửa tiếp, baseline bổ sung0/2. Đây là kiểm tra review sau triển khai, không được gọi là blind test trước code.

Review khác: quoted hai mã02 rồi06 bị canonical hóa thiếu mã. Director nêu counterexample, QA viết assertion listener riêng trước sửa (`tests/v132-reply-multicode.test.cjs`): baseline0/1, sau sửa1/1. Hai mã phải giữ nguyên và hỏi màn hình hiện mã nào; không tự chọn một ý nghĩa ngân hàng. POS Expert giữ riêng3 gate về scope phủ định/mâu thuẫn và hướng dẫn restart đã verified nhưng đang có rủi ro thanh toán; các fixture verified chỉ là nguồn giả lập có review phục vụ kiểm tra đường truy xuất, không làm knowledge thật được verified.

Chưa có ground truth OPS bên ngoài; không có bằng chứng live Zalo/Windows. Knowledge thật chưa có nguồn đủ điều kiện cho02/03/06, nên response chất lượng hơn là giữ đúng mã/ngữ cảnh, hỏi thiếu thông tin tối thiểu và thừa nhận thiếu xác minh, không bịa cách sửa mã.

Kết quả chốt do QA chạy lại trên nguồn ổn định: **10/10 direct +1/1 review stale-code +6/6 listener**. Hai test manual-risk/network đạt2/2; quoted-multicode1/1; date-boundary2/2 (ngày không biến thành mã, mã lỗi thật gần ngày vẫn giữ); vague-first-request1/1 (làm rõ trước OPS). C1 được chạy lại18/18 và C2 listener14/14. Các file before/after/comparison lưu lời đáp thực tế giả lập; không gộp test nhóm assertion thành số lỗi hay số khách thật.
