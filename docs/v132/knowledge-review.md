# V13.2 — rà soát tri thức bởi vai trò POS Expert

Đây là rà soát mã nguồn và dữ liệu nội bộ, không phải xác nhận nghiệp vụ từ ngân hàng/OPS. Không sửa knowledge.json và không nâng trạng thái duyệt tự động.

## Kết quả corpus

Chạy `node scripts/v132-knowledge-audit.cjs --write` tạo báo cáo tổng hợp, không xuất nội dung khách hàng. Corpus có 5.000 bản ghi; 121 bản ghi thuộc mã lỗi (100 mã số và 21 mã chữ-số). Không có bản ghi đạt điều kiện xuất bản; không có bản ghi đã xác minh bằng bằng chứng còn hạn. 4.862 bản nháp, 17 bản tham khảo cần OPS, 121 bản mã cần xác nhận ánh xạ ngân hàng. Các mã 02/03/06 mỗi mã có một bản ghi, nhưng đều chưa xác minh. Không được trả ý nghĩa cụ thể dựa trên các bản đó.

Không phát hiện nhóm cùng mã/cùng phạm vi có câu trả lời khác nhau; bộ phân tích legacy không phát hiện nhóm câu hỏi trùng có trả lời khác nhau. Đây chỉ là phát hiện cấu trúc, không chứng minh corpus không có mâu thuẫn ngữ nghĩa.

## Nguyên nhân runtime và tiêu chí chấp nhận

Trong baseline V13, dialogue.js gọi nhánh expert và có thể return trước extractErrorCode/searchKnowledge. Vì corpus không có mã được duyệt, không thể dùng dữ liệu thật để chứng minh một câu trả lời mã đã xác minh bị chặn. Có thể chứng minh lỗi định tuyến: câu có mã cụ thể bị hỏi chung về phần cứng, thay vì ghi nhận chính xác mã và hỏi phạm vi còn thiếu.

Mã 03 không có ý nghĩa phổ quát giữa mọi thiết bị/đơn vị thanh toán. Phải giữ số 0 đầu, không suy luận ý nghĩa theo ISO8583 hoặc theo kinh nghiệm khi chưa có tài liệu khớp phạm vi. Thiếu phạm vi thì hỏi thiết bị/ứng dụng hoặc đơn vị cung cấp mà khách biết; không hỏi MID/TID. Đã trả lời thông tin nào thì không hỏi lại. Mã giao dịch, ngày, số tiền và định danh thiết bị không phải mã lỗi.

Tài liệu xuất bản phải có đồng thời trạng thái duyệt, requires_human_review=false, verificationStatus=verified, schema hợp lệ, nguồn chính thức/runbook được duyệt và bằng chứng đánh giá liên kết còn hạn; nội dung phải vượt kiểm tra an toàn. Hai bản đã duyệt cùng mã/phạm vi nhưng khác hướng dẫn phải trả ambiguous/conflict, không chọn bản đầu. Thông tin phạm vi thiếu không được ngầm coi là áp dụng cho mọi máy.

Rủi ro thanh toán đứng trước tra mã: đã trừ tiền/chưa rõ kết quả thì không đề nghị thanh toán lại, khởi động máy hoặc cam kết trạng thái. Có thể cung cấp hướng dẫn kiểm chứng; chuyển OPS chỉ sau đồng ý rõ ràng. Settlement/hoàn tiền chưa xác minh không được suy ra lịch tiền về.

## Bằng chứng kiểm thử

`tests/v132-knowledge.test.cjs` tách (1) kiểm tra corpus và coverage mã đã xác minh thật, (2) fixture giả lập có metadata bằng chứng để kiểm tra cơ chế, không phải nguồn tri thức xuất bản hay chứng nhận nghiệp vụ ngân hàng. Coverage mã thật có mẫu số 0: vacuous, không được ghi là 100% sử dụng tri thức. Các fixture scoped không được ghi vào knowledge.json. Đánh giá độ đúng nghiệp vụ độc lập vẫn bị chặn do chưa có ground truth OPS bên ngoài.
