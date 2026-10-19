# V13 — Vòng 5: đối kháng, cờ phiên bản và kiểm chứng cuối

Baseline `257e03e`. Khóa21 hội thoại sau POS/Safety review, SHA `a8d174dc4036866c62c29f5e8f83242b609805bea10b477aac41109ff29ba1db`. Expert11/21→21/21,10 ca cải thiện,0 hồi quy; cả91 ca của5 vòng đạt. Cờ V13 và cờ V12 tương thích cho kết quả/context giống nhau trên cả5 bộ. Round1 default18/18 và hai ca raw payment state default vẫn đạt.

## Mã thực tế đã sửa

Giữ marker tài chính hữu hạn qua nhiều lớp phần cứng và khi frame bị giới hạn2; khôi phục frame không làm mất nghĩa vụ xác minh. Tin quá dài thu hồi quyền chuyển hỗ trợ nhưng giữ rủi ro/cảnh báo tài chính. Consent trích dẫn, giả định, điều kiện hoặc mâu thuẫn không được cấp quyền thu thập/gửi. Thông tin sai/đã làm bước nào được phân biệt theo ngữ cảnh, không tự thử lại bước thất bại.

Nguy cơ pin/ngấm nước thực được ưu tiên cả khi có trích dẫn OPS hoặc cảnh báo secret. Đọc transcript và self-review phát hiện thêm hai follow-up: cảnh báo nguy hiểm trả ra nhưng chưa lưu để lượt hỏi sạc tiếp theo còn an toàn. Hai test được khóa trước sửa (16/18→18/18). noteSafetyStop chỉ chấp nhận mã battery/power, không truyền/lưu raw secret; giữ marker thanh toán nếu đã có và xóa pending handover.

QA đọc transcript còn phát hiện giấy đã in rõ nhưng bị nhắc lại là lỗi chưa xử lý dù21 hợp đồng đã PASS. Sửa scoped resolution, bổ sung test hồi quy **sau sửa**, ghi rõ provenance trong manual-response-review.json; không gọi test đó là holdout hoặc cải thiện độc lập. Không sửa21 assertion đã khóa để tăng PASS.

`QH_V13_ENABLED=true` chọn cùng engine hiện có tại lib/v12/engine.cjs (version13.0), không tạo bản sao runtime. V12 flag giữ tương thích; V11 nguyên trạng để fallback module thiếu/lỗi. Listener có eligibility13 và giữ câu gốc, test SDK giả lập kiểm tra reported greeting→introduction→Không và đường expert thực với chỉ cờ13. Thiếu/lỗi module không lộ exception, không lẫn context.

## Kết quả kiểm chứng

Node cục bộ24.19.0, cây mã cuối: npm test356/356, qa:v13 53/53, qa:v12 146/146,0 skip/fail. Frozen56 cũ chạy cờ13-only56/56. qa:language30/30; qa:legacy25/25; V3 self-test PASS; qa:quality24/24 synthetic nhưng quality gate độc lập BLOCKED; knowledge0/5000 verified; security203 file0 vi phạm trước thêm checkpoint này. Các lệnh bắt buộc hoàn tất exit0.

Safety độc lập chạy18 test, activation/fallback5, default payment2, review regression1 và21 hợp đồng V13 đều đạt. Probe hơn2 lần ngắt quãng giữ marker/rủi ro, history hữu hạn và TTL/cap kế thừa. Không tính load/repeated turns thành ca merchant độc lập.

GitHub Actions cấu hình Node22/24, chạy runner bằng file arguments (hỗ trợ shell Windows không glob), npm ci/test, V13 QA, V11/V12/V13 compatibility và scanner. Kết quả CI từ xa sẽ ghi trong PR sau push; không coi cấu hình là đã chạy.

## Phần chưa hoàn thành và bàn giao

Đã làm đủ5 vòng có thay đổi runtime và regression riêng, không phải5 lần sinh thêm test. Chỉ có91 hội thoại synthetic mới; chưa đạt mục tiêu500 core/5000 hội thoại/10000 biến thể. Không nhân bản cho đủ số. Chưa có chuyên gia OPS bên ngoài duyệt ground truth, chưa chứng minh chất lượng merchant thật hoặc Windows/Zalo live. Corpus vẫn0 verified. Rule-based NLU, nguồn/model SOP và các cách nói chưa gặp còn giới hạn.

Không deploy/merge, không đọc/gửi tin Zalo thật hoặc thay credential/session. Tiếp theo lưu so sánh baseline main với V13 cùng91 ca, báo cáo tiếng Việt, hướng dẫn Windows/rollback và PR review. Bật cờ12 không phục hồi mã V12.2 sau khi đã cập nhật V13 vì hai cờ dùng cùng engine; rollback đầy đủ cần commit deployment/baseline đã ghi, xem WINDOWS-UPDATE-VI.md. Không có auto-resume hoặc coding API trả phí được cấu hình.

Đính chính coverage khi bàn giao:21 fixture khóa gồm19 đa lượt và2 probe một lượt. Cả chương trình91 fixture gồm88 đa lượt+3 probe; bổ sung3 counterpart đa lượt sau sửa, giữ nguyên mọi hash, không gọi chúng là holdout hoặc3 cải thiện độc lập. Xem multi-turn-coverage.json.

Kiểm chứng bàn giao sau bổ sung3 counterpart: full npm test359/359, qa:v13 56/56, scanner208 file0 vi phạm; không đổi runtime sau commit84de999.
