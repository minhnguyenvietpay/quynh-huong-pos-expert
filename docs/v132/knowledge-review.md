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

## Chu kỳ 3: phản biện độc lập trước sửa

Sau checkpoint C2 `2bd2f53`, bổ sung ba kiểm thử hành vi trước khi Code Engineer sửa nhánh phạm vi/rủi ro. Baseline: 8 đạt, 3 thất bại. Các câu đều giả lập, không lấy tin khách hàng.

1. Phủ định hoặc nhiều khả năng về model/ngân hàng vẫn được parser lấy lựa chọn đầu. Ví dụ `Máy báo lỗi 03, không phải PAX A920, ngân hàng SyntheticBank` vẫn trả hướng dẫn fixture chỉ áp dụng PAX A920. Tiêu chí: không chọn bản ghi scoped khi phạm vi bị phủ định hoặc chưa phân định; không suy ra lựa chọn từ thứ tự câu.
2. Sau khi ghi nhớ model/ngân hàng, câu `Không phải PAX A920` hoặc `Không phải ngân hàng SyntheticBank` vẫn giữ bản ghi đã chọn. Tiêu chí: vô hiệu hóa phạm vi bị bác bỏ và selectedRecordId, hỏi lại tối thiểu nếu cần; không lấy phạm vi cũ làm bằng chứng.
3. Giao dịch trước chưa xác minh, sau đó hỏi mã có fixture đã duyệt hướng dẫn khởi động lại: runtime trả `Hãy khởi động lại máy theo tài liệu thiết bị` rồi nối cảnh báo `chưa ... khởi động lại`. Tiêu chí: phải chặn hướng dẫn mâu thuẫn ngay từ đầu; nối cảnh báo không khắc phục được lời khuyên nguy hiểm. Kiểm thử truyền scope thực do parser thu nhận, không preset scope trong injection.

Các fixture chứng minh cơ chế ưu tiên an toàn/phạm vi; không chứng minh tri thức thật đã được duyệt. Corpus vẫn 0 bản mã đã xác minh.

Retest C3: `node --test tests/v132-knowledge.test.cjs` đạt 11/11; cùng byte kiểm thử C3 SHA-256 `0ec337df02b6ca405c7f58076968999aa4236c845a8ce45c9de903c07029e854`, không đổi tiêu chí sau sửa. Ba nhóm mới từ thất bại chuyển sang đạt. Parser dùng giá trị null để bác bỏ/không phân định phạm vi thay vì giữ phạm vi cũ; rủi ro giao dịch chặn trả hướng dẫn mã trước khi truy xuất. Chưa đánh giá mọi cách phủ định tiếng Việt: parser có tập mẫu/model hữu hạn và tên đơn vị xử lý một token, nên tên thương mại nhiều từ hoặc cách nói chưa hỗ trợ có thể cần hỏi lại. Đây là giới hạn độ hiểu, không phải lý do suy diễn ý nghĩa mã hoặc nâng trạng thái tri thức.
