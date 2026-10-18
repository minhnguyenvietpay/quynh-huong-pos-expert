# Rà soát QA và phản hồi Quỳnh Hương

## Phạm vi và cách tái lập

Rà soát checkout duy nhất tại commit gốc `aedde19a0ea677e7d22132e2db83da934b655e87`, gồm các file JS/MJS, tài liệu, manifest/lockfile, dashboard và metadata của toàn bộ 5.000 mục kiến thức. Dữ liệu kiểm thử mới hoàn toàn giả lập. Không đăng nhập Zalo, không gửi tin nhắn, không gọi ngân hàng, không sửa `listener.mjs`, không triển khai.

```sh
npm ci
npm test
npm run qa:responses
npm run qa:language
node qa-v3.js --self-test
npm run qa:legacy
node scripts/compare.cjs aedde19a0ea677e7d22132e2db83da934b655e87
```

`compare.cjs` xuất commit gốc vào thư mục tạm, dùng chính bộ hội thoại và evaluator hiện tại cho cả hai phiên bản, sau đó xóa thư mục tạm. Không thay đổi checkout và không cần dataset biến thể bị thiếu. JSON gồm hash của bộ tình huống, ca cải thiện và hồi quy. Xem `offline-comparison.json` để đối chiếu kết quả đã chạy.

## Kiến trúc và vấn đề

| Thành phần | Kết quả rà soát |
| --- | --- |
| `listener.mjs`, `test-typing.mjs` | Đăng nhập QR và có thể gửi tin nhắn thật; loại khỏi mọi test/CI. Listener có kiểm tra admin/staff, chống trùng, cooldown và giới hạn tần suất. Chưa xác minh API Zalo hay mentions thật. |
| `dialogue.js` | Điều phối nhiều engine theo thứ tự, giữ consent/handover trong bộ nhớ và session qua `state.js`. Trước sửa, lệnh điều khiển bị chặn bởi escalation; `/ticket` chạy trước kiểm tra bí mật; consent thanh toán bị hỏi hai lần. |
| `v12-brain.js`, `conversation.js`, `pos-diagnostics.js`, `expert.js`, `flows.js` | Các bộ quy tắc chồng lấn; câu phủ định bị regex kết thúc phiên bắt nhầm; flow cũ yêu cầu MID/TID. Các sửa đổi chỉ là ứng viên để review, chưa áp dụng lên bot thật. |
| `intent.js`, `qh-v43-language.js`, overlay V4.6/V4.8 | Intent và expansion độc lập với chất lượng phản hồi. Engine trước đây không nhất quán với preprocessing của listener. Đã đưa expansion vào đầu vào engine, giữ nguyên tên/địa chỉ merchant khi thu thập thông tin. |
| `search.js`, `variant-index.js`, `knowledge.json` | Điểm truy hồi không phải phê duyệt nghiệp vụ. 5.000/5.000 mục có `requires_human_review=true`; 4.862 draft, 121 cần ánh xạ ngân hàng, 17 tài liệu tham khảo cần OPS duyệt. Có 7 answer chứa mẫu yêu cầu gửi/cung cấp MID/TID. Không sửa nội dung hàng loạt; thêm cổng phê duyệt rõ ràng, fail closed cho response truy hồi. |
| `state.js`, `quality.js`, `incident.js`, `report.js`, dashboard V8.5 | Có dữ liệu trạng thái/sự kiện/ticket trên đĩa; test mới chuyển state/events/tickets vào thư mục tạm. Dashboard V8.5 là báo cáo HTML ngoại tuyến. Không đưa runtime data vào Git hay CI artifacts. |
| QA dashboard V4.2 | Trước đây phụ thuộc dataset bị loại khỏi Git và có bước auto-apply. Lệnh RUN hiện chạy test phản hồi, ngôn ngữ và self-test cô lập, không auto-apply. Khôi phục snapshot cũ vẫn là thao tác thủ công riêng. HTTP test xác minh token, job hoàn tất và report mới. |
| Adaptive QA V4.7 | Không có thư mục `qh-v47/` hoặc runner Adaptive V4.7 trong 47 file tracked của commit gốc. README nhắc tên nhưng không đủ để kiểm chứng thuật toán hay lịch sử cải thiện. |
| Auto Fix V4.8 | Chỉ có `qa-v48-approved.json` và loader allowlist `qh-v46-overlay.js`; không có runner sinh/đánh giá Auto Fix V4.8. Loader chỉ thay token ngôn ngữ đã cho phép, không tạo tri thức nghiệp vụ. |

Cổng knowledge mới yêu cầu trạng thái approved/verified/ops_approved/validated, `requires_human_review=false`, không dùng chế độ draft/reference guardrails và không chứa yêu cầu MID/TID. Vì dữ liệu hiện tại chưa đạt các điều kiện này, trả lời trực tiếp từ knowledge bị chặn và chuyển sang xin phép hỗ trợ. Đây là thay đổi độ bao phủ có chủ ý cần OPS review; không khẳng định 5.000 answer đã được xác minh. Các flow hướng dẫn cục bộ vẫn hoạt động.

## Vì sao QA cũ không cải thiện

1. V3 chỉ sinh synonym cho kiến thức đã phê duyệt và không cần human review. Dữ liệu hiện tại không có mục đủ điều kiện; không nên nới cổng duyệt để tăng con số.
2. `variants-50000.jsonl` bị gitignore và không có trong checkout. Chạy thực tế V2 và V3 dry-run đều dừng vì thiếu file này. V4.2 cũ phụ thuộc cùng file. BLOCKED không phải 0 cải thiện, càng không phải PASS.
3. V2 dùng thay thế chuỗi chính xác cho một phiên bản `v12-brain.js` cũ; mẫu đó đã thay đổi trong mã hiện tại. Code chủ động từ chối patch khi không khớp. Không phải một hệ thống tự tìm lỗi/tự sửa tổng quát.
4. QA V4.3 chỉ kiểm tra intent/normalizer, không chạy `processMessage`. Cải thiện nhận diện không chứng minh cải thiện hội thoại.
5. QA Lab cũ có 5 false negative vì không nhận cụm “đã được xử lý”; đồng thời không trả exit code lỗi khi test fail. Sửa matcher này là sửa phép đo, không tính thành cải thiện bot.
6. V3 bỏ qua nội dung tài chính, collision và synonym đã tồn tại; chạy lần hai có 0 bổ sung là hành vi idempotent mong đợi. Không có lịch sử V4.7/V4.8 đủ để khẳng định nguyên nhân của mọi lần chạy trước đây.

## Kết quả xác minh

| Phép đo | Trước | Sau |
| --- | --- | --- |
| Cùng 40 hội thoại, cùng evaluator | 31/40 | 40/40 |
| Ca hồi quy trong bộ hội thoại | — | 0; 9 ca chuyển từ fail sang pass |
| `npm test` | Thiếu `test-v85.js`, không chạy suite | 44/44, không skip |
| QA Lab cũ | 20/25, exit code không phản ánh fail | 25/25, exit code phản ánh fail |
| Ngôn ngữ V4.3 | 30/30 | 30/30 |
| V3 self-test | PASS | PASS |
| Dashboard HTTP | Chưa có automated smoke test | GET HTML, token 403, POST QA, job/report PASS đã kiểm tra |

Chín ca cải thiện thực: hủy consent, bắt đầu lại khi xin consent, hủy sau khi chuẩn bị handover, consent thanh toán, viết tắt máy in, phủ định không bị kết thúc phiên, chặn OTP trong `/ticket`, chặn số thẻ trong `/ticket`, chặn ánh xạ mã lỗi ngân hàng chưa được duyệt. Ngoài 40 hội thoại, suite kiểm tra cổng knowledge, mọi tổ hợp kết thúc legacy flow, cô lập merchant/group và HTTP dashboard.

Đã chạy 44/44 test thành công cục bộ trên cả Node 22 và Node 24 sau cài đặt bằng lockfile.

Đây là kiểm thử deterministic trên dữ liệu giả lập, không chứng minh độ chính xác nghiệp vụ hay mọi cách diễn đạt tiếng Việt. Chưa xác minh gửi/nhận Zalo, tra soát ngân hàng, đồng bộ Portal, thông báo OPS hay deploy production. Cần review nghiệp vụ trước khi merge; merge cũng không được tự triển khai bot.

## CI và review

Workflow `.github/workflows/offline-qa.yml` chạy Node 22 và 24 trên pull request và push main, quyền `contents: read`, không dùng secret/session, không upload hội thoại/runtime logs. Runner dashboard trả exit code lỗi nếu bất kỳ bước nào fail; `npm test` không quét các script login Zalo cũ. CI trên GitHub chỉ được xác nhận sau khi workflow thực sự chạy.
