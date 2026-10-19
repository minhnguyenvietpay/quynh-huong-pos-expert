# Rà soát tiêu chí QA

Các tiêu chí hội thoại cycle1 được đóng băng trước runtime sửa; không thay đổi để tăng điểm. QA tái dùng evaluator V13 và khẳng định cả câu trả lời lẫn pending/escalation state.

Trước khi triển khai reply cycle2, QA phát hiện regex làm rõ tham chiếu quá rộng: câu generic “Trả lời có hoặc không” đã lọt như một yêu cầu reply. Đã **siết chặt** evaluator để bắt buộc tin nhắn gốc/cụ thể/đúng hoặc thông báo không tìm thấy tham chiếu. Baseline được chạy lại từ archive main `1a33422`, kết quả chính thức **1/14**, thay vì bản nháp3/14. Không thay tiêu chí nghiệp vụ; không hạ assertion sau khi sửa code. SHA evaluator lưu trong manifest đóng băng. Bản `cycle2-before.json` chính thức thay bản nháp.

Các ca cycle3 giữ metadata riêng `staged-frozen-cycles.json` trong vòng1/2; chưa chạy gate bắt buộc trước khi thực hiện vòng3. Đây là quản lý giai đoạn, không bỏ ca khỏi lần phát hành cuối. Dataset11direct (10 simulator,1 code-review counterexample) phải được đưa vào manifest bắt buộc khi kết thúc vòng3. Các sự kiện reply dùng SDK giả lập qua listener thật, không khẳng định tương đương kết quả Zalo live.
