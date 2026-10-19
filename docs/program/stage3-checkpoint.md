# Giai đoạn 3 — V12.2 kiểm thử đối kháng và ổn định runtime

Bắt đầu sau commit V12.1 `094bdd8`. Root Cause & Red Team khóa24 hội thoại mới trước sửa; hash, lỗi và phản hồi baseline trong stage3-review.md, stage3-evidence.json. Baseline V12.1 đạt16/24; V12.2 đạt24/24:8 ca cải thiện,0 hồi quy trên bộ này. Hai bộ trước giữ80/80 và20/20. Tổng124 hợp đồng synthetic đều đạt, không phải độ chính xác độc lập trên merchant thật.

## Đã hoàn thành

- Ưu tiên giao dịch đang xử lý/khách báo trừ tiền trước ngữ cảnh máy in hoặc Wi-Fi. Không cho trạng thái thiết bị phục hồi xóa nghĩa vụ kiểm tra giao dịch, kể cả khi có khung gián đoạn.
- Giữ phần rủi ro mới khi khách rút consent; không suy ra consent từ câu điều kiện/giả định. Câu giải thích refund/void không che cảnh báo pin phồng/bốc khói hoặc giao dịch đang xử lý.
- Phân biệt nguy cơ pin giả định với thực tế; nhận câu sửa lời về trừ tiền; không kết luận xử lý xong khi bill vẫn trắng/thiếu chữ; phân loại tiền chưa về tài khoản vào kiểm tra chi trả thay vì bộ lọc Portal.
- Chặn ép kiểu object và tin vượt giới hạn trước xử lý. Đầu vào quá dài trong dialogue dừng pending handover/context để không dispatch từ thông tin bị cắt. Engine trực tiếp từ chối đầu vào sai kiểu/quá dài mà không mutation.
- Nhánh từ chối kiểm tra kiểu trả về và bắt lỗi module; không trả object handover trái lời từ chối. OTP/API key kèm rút consent vẫn xóa pending và consent trước cảnh báo, không lưu/echo giá trị.
- Bộ nhớ engine và các Map thu thập/chuẩn bị handover đều tối đa2000 phiên; lịch sử hữu hạn, cô lập người dùng. TTL30 phút; dữ liệu hết hạn được dọn khi có hoạt động (quét toàn cục tối đa mỗi phút), cổng đọc loại mục quá hạn. Không có timer cam kết xóa RAM đúng phút khi hệ thống hoàn toàn nhàn rỗi.
- Kiểm thử listener dùng SDK giả lập và dialogue thật, chặn mạng: V12 bật/V11 tắt, giữ tiếng Việt gốc, consent trước tạo/send ticket, allowlist/admin/dedupe/AUTO_REPLY. Không đăng nhập hay gửi Zalo thật.

## Bằng chứng kiểm thử

Node cục bộ24.19.0: npm test306/306,0 fail/skip; qa:v12 142/142. Bộ V11 cũ56/56 chạy cả V11 fallback và V12.2; các kỳ vọng cũ giữ nguyên. Đã sửa những lỗi thật phát hiện khi đối chiếu56 ca: ghi nhận quên/kết nối lại Wi-Fi, giấy trắng sau phục hồi mạng, phản hồi lặp khi chưa đủ thông tin. Một assertion cũ bắt cả cụm phủ định về tiền đã về; diễn đạt lại rõ chưa có bằng chứng chi trả, không nới assertion.

Các kiểm tra bắt buộc: qa:language30/30; qa:legacy25/25; V3 self-test PASS; qa:quality24/24 synthetic, quality gate độc lập BLOCKED; knowledge:report0/5000 verified; security142 file không vi phạm trước thêm báo cáo này. npm run qa:v11 lần đầu không bật cờ chỉ đạt26/56; chẩn đoán runner yêu cầu QH_V11_ENABLED=true, chạy lại đúng cờ56/56. Đây không được tính là cải thiện bot. CI thiết lập Node22/24, thêm kiểm tra V12.2 tương thích bộ V11; trạng thái chạy GitHub ghi ở báo cáo bàn giao sau khi tạo PR.

Test riêng xác nhận2010 phiên engine/250 lượt lặp không phình state;2001 luồng consented handover loại mục cũ; TTL dọn dữ liệu người dùng khác; guard từ chối không thoát exception. Bốn ca ưu tiên được thêm sau kiểm tra định nghĩa:3 ca baseline lỗi và1 ca khôi phục thiết bị làm mất pending giao dịch đã tái lập; sau sửa4/4 đạt. Không cộng các lượt load thành ca độc lập.

## Còn yếu và bàn giao

Ngôn ngữ vẫn là quy tắc hữu hạn; không tương đương LLM. Không có truy cập trạng thái giao dịch/ngân hàng. Không nguồn mới nào được duyệt; kiến thức chung trong code vẫn cần OPS/domain review. Dataset và các kỳ vọng đều do Codex tạo, chưa là golden truth do người nghiệp vụ duyệt. Không xác minh chất lượng merchant thật hoặc kết nối giám sát live. Tin sai dạng/quá dài cần gửi lại và có thể mất context. Chưa giải quyết mọi cách nói ngoài tập thử.

Tiếp theo: so sánh V11/V12/V12.1/V12.2 bằng program-compare.cjs trên đúng124 ca; lưu mọi hồi quy lịch sử và số liệu; tạo PR review, không merge/deploy. Người vận hành duyệt nghiệp vụ và thử staging riêng trước bật cờ; rollback QH_V12_ENABLED=false, QH_V11_ENABLED=true theo runtime-operations.md, không thay authentication/session.
