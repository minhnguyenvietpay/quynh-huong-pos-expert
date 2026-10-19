# V13 — Vòng 4: thao tác merchant, Portal và hỗ trợ người thật

Baseline `2e1db67`. Khóa18 hội thoại sau review riêng QA/POS/Safety, SHA `3fa70aa3e46d7cc4c5bf896e2ad1ed71d78d1b0b83a6cfc2343c24d2df0cb26d`. Expert3/18→18/18,15 ca cải thiện,0 hồi quy; các bộ trước giữ đạt. npm test335/335, bộ56 cũ trên expert56/56. Safety13/13 và default2/2 được chạy riêng, không đổi assertion.

Ngữ cảnh operation hữu hạn phân biệt: sử dụng thẻ, QR, truy cập Portal, báo cáo, đối chiếu và bản sao bill. Không lưu raw text, mã thiết bị hoặc merchant identity vào memory expert. Phản hồi dùng số tiền/đơn hàng, đúng phương thức và đối chiếu kết quả; khách quét không tự đồng nghĩa đã thanh toán.

Portal theo dõi mục đích truy cập/báo cáo: phân biệt trình duyệt/tải trang với bộ lọc; nhận ca qua hai ngày, chi nhánh sai, phạm vi máy/nguồn, so tổng thẻ/QR/tiền mặt cùng phạm vi. Chỉ nói bộ lọc/chức năng nếu được cấp và có trên hệ thống thực, không bịa nút, URL, cutoff, phí hoặc thời hạn. Bản sao tìm từ lịch sử, không tạo giao dịch mới để có bill. Không thấy bản ghi thì chưa xác minh, không bịa bản in.

Yêu cầu gặp OPS có consent rõ được chuẩn bị hỗ trợ đúng sự cố; phàn nàn không tự thành đồng ý. Câu hỏi khôi phục mật khẩu được hướng dẫn kênh chính thức trong ngữ pháp hẹp không có giá trị bí mật; không tuyên bố có quyền đổi mật khẩu. Thông tin bí mật thực vẫn bị chặn trước collector. MID/TID do OPS xử lý, không yêu cầu merchant đọc trong nhóm.

Runtime: dialogue.js, lib/v12/engine.cjs và memory.cjs. Root bổ sung runner tests bằng danh sách file rõ ràng, tránh shell glob khác nhau trên Windows; cờ phiên bản được reset trong tiến trình test để baseline không phụ thuộc cấu hình shell. npm test đã thực thi335 test với runner này; chưa chạy trên Windows thật.

Bằng chứng: round4-before/after-v12.json và round4-comparison.json giữ15 cặp phản hồi cải thiện. QA đọc thủ công mẫu chip, chi nhánh, bản sao và hỗ trợ người thật, không chỉ nhìn PASS regex. Vẫn là dữ liệu synthetic và review Codex, không phải OPS ground truth. Corpus không được promote.

Vòng5: kiểm thử đối kháng consent trích dẫn/giả định/mâu thuẫn, nhiều lớp ngắt quãng còn rủi ro thanh toán, đổi mục đích và guard ưu tiên; thêm cờ V13 rõ ràng cho cùng runtime đang dùng, kiểm tra listener/fallback/giới hạn bộ nhớ, CI và toàn bộ regression. Không deploy/merge hay dùng Zalo thật.
