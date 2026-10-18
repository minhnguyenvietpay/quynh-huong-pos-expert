# Quỳnh Hương V11: engine POS cục bộ, không API suy luận

## Kết quả

Đã tích hợp vào đường hiện có `listener.mjs → dialogue.js → V11 → hiểu câu / bộ nhớ / truy hồi đã duyệt / chẩn đoán → phản hồi`, không dựng bot hay dịch vụ song song. Cờ `QH_V11_ENABLED` mặc định tắt; chỉ chuỗi chính xác `true` mới bật. Không gọi AI API, không cần API key, không thêm dependency, hosting hoặc subscription. Codex chỉ dùng để phát triển và review. Không merge/deploy hay nhắn merchant thật.

Cùng 56 hội thoại tổng hợp nhiều lượt và cùng hash dataset: bản nền `6378028e530ea54cb0b582a92246ca1713d7b21d` đạt **26/56**, V11 đạt **56/56**. Có **30 kịch bản chuyển từ fail sang pass, 0 hồi quy theo assertion**. Khi tắt cờ, mọi phản hồi trong dataset khớp snapshot nền. Đây là 30 lỗi hợp đồng phản hồi tái hiện, không phải 30 nguyên nhân gốc độc lập hoặc độ chính xác nghiệp vụ thực tế.

Chi tiết từng câu hỏi, câu trả lời cũ/mới, trạng thái, lỗi và lý do: [v11-before-after.json](v11-before-after.json); bản tóm tắt: [v11-before-after.md](v11-before-after.md). Cả ca pass, fail nền và thay đổi chưa đủ bằng chứng tốt hơn đều được giữ. Dataset luôn ghi `ai_authored_unreviewed`, `independentReview=false`. Chưa có chuyên gia độc lập duyệt; không tự tạo nhãn golden đã xác minh.

## Những lỗi đã xử lý

- Nhận câu tự nhiên về giấy trắng/mờ/kẹt, chip/chạm thẻ, sạc/SIM; tránh fallback chung khi có thể hỏi hoặc chỉ bước cụ thể.
- Không hiểu “không nhận thẻ/sạc không vào” thành thiếu tiền. Phân biệt phủ định, nhiều vấn đề, tín hiệu thất bại với câu kết thúc; “ok” không tự thành consent.
- Ưu tiên xác minh giao dịch khi có rủi ro trừ tiền, trùng giao dịch hoặc đang xử lý; không khẳng định ngân hàng đã hoàn tiền/tiền đã về và không hẹn thời gian.
- Nhớ bước đã hướng dẫn, bước khách báo đã thử và thất bại; không bịa rằng khách đã thử chỉ vì họ nhắc lại triệu chứng.
- Chuyển ngữ cảnh có khung gián đoạn, giữ rủi ro trước đó và có thể quay lại. Thành công của giao dịch cũ không kết thúc giao dịch đang cần xác minh.
- Pin phồng/nóng bất thường, máy ngấm nước/màn hình vỡ là điều kiện dừng; kết quả in bill không xóa cảnh báo an toàn.
- Chỉ chuẩn bị bàn giao sau đồng ý rõ ràng; từ chối rồi nói “ok” không cấp consent. Sự cố mới khi đang hỏi tên không bị ghi thành tên/địa chỉ.

Bộ so sánh gom 30 ca fail nền thành bốn nhóm triage: nhận diện/chẩn đoán cụ thể (12), bước đã thử/consent/ngữ cảnh (8), ngữ cảnh thanh toán (5), ưu tiên an toàn phần cứng (5). Nhóm do developer phân tích, không phải kết luận kiểm toán độc lập.

## Triển khai

| Thành phần | Hành vi thực tế |
| --- | --- |
| `lib/v11/understanding.cjs` | Chuẩn hóa tiếng Việt, từ chat/typo có giới hạn, chấm trọng số, đa ý định, phủ định, mơ hồ và ngữ cảnh. Không tương đương LLM. |
| `lib/v11/memory.cjs` | State riêng group/user, chỉ mã nội bộ, không lưu raw message/tên/địa chỉ; RAM, TTL 30 phút, tối đa 2.000 phiên, 10 lịch sử, 2 khung gián đoạn. |
| `lib/v11/engine.cjs` | Câu hỏi, nhánh, bước an toàn, phương án sau thất bại, điều kiện dừng và xin consent cho 15 topic thiết bị/thanh toán. Composer trả ít bước mỗi lượt, không tự thực hiện nghiệp vụ. |
| `lib/v11/retrieval.cjs` | Token/trọng số/chủ đề/ngữ cảnh, ngưỡng, nguồn và xung đột; chỉ phục vụ record đã qua cổng duyệt, evidence phù hợp và còn hạn. Không promote 5.000 mục đang unverified. |
| `dialogue.js` | Định tuyến theo flag, API session và handover tương thích. Thiếu module/lỗi engine/helper không làm mất đường engine cũ; không lộ exception. |
| `listener.mjs` | Thêm eligibility V11 và giữ câu gốc khi bật cờ. Xác thực, allowlist/admin, dedupe, cooldown, AUTO_REPLY, typing, tạo ticket và send/mention giữ nguyên. |

Các workflow gồm: treo POS, nguồn, pin/sạc, in hóa đơn, Wi-Fi/SIM, QR, đọc thẻ, giao dịch chưa rõ, thiếu giao dịch, nghi trùng, Refund, Void, Reversal, settlement/payout, Portal. Quy tắc chỉ hướng dẫn kiểm tra chung theo đúng dòng máy/nguồn được duyệt, không tạo SOP ngân hàng. Khi không rõ dòng máy/quyền/trạng thái, hỏi lại hoặc xin phép CS/OPS, không tự điền thông tin.

Truy hồi có unit fixture giả lập để kiểm tra lọc/ranking/xung đột. Corpus hiện có **0/5.000 mục đáp ứng xác minh**; V11 thực tế dùng quy tắc chẩn đoán trong code và không đưa answer chưa duyệt ra khách. Không có source acquisition hay kiểm chứng nghiệp vụ mới trong nhiệm vụ này. Cần OPS review quy tắc và nguồn trước rollout.

## Kiểm thử đã thực hiện

- **161/161 test trên Node 22 và Node 24**, không skip: suite cũ, V11 actual outputs, bộ nhớ, retrieval, transport, fallback và privacy.
- Red-team V11 **24/24**; integration dialogue thật **9/9**; listener handler với SDK giả lập **8/8**. Không gọi Zalo thật. Đã kiểm tra cả mention thành công, thất bại và offset hai nhân viên; chỉ đánh dấu gửi sau `sendMessage` thành công.
- Ngôn ngữ cũ 30/30, QA Lab 25/25, V3 isolated self-test PASS; quality/knowledge/security command cũ tiếp tục chạy.
- Load summary **100.000 lượt lặp từ 56 hội thoại**, 100.000 đạt, khoảng 23 giây tại lần đo. Xem `v11-scale-result.json`. Không phải 100.000 ca độc lập, không tạo thêm ground truth. Summary/JSONL không giữ mọi transcript trong RAM.
- Scanner chính sách không phát hiện vi phạm; không thay `knowledge.json`, lockfile hoặc `incident.js`.

Hai script legacy ngoài `npm test` (`test-hotfix.js`, `test-social.js`) vẫn có mock/kỳ vọng lỗi thời đã chẩn đoán từ lần trước; không thay assertion để tô xanh. Không chạy `test-typing.mjs` vì đăng nhập/gửi sự kiện Zalo thật. Dataset V2/V3 đầy đủ vẫn thiếu `variants-50000.jsonl`.

## Tái lập và rollback

```sh
npm ci
npm test
QH_V11_ENABLED=true npm run qa:v11
node scripts/v11-compare.cjs --output qa-reports/v11-comparison.json
QH_V11_ENABLED=true node scripts/v11-evaluate.cjs --summary-only --limit 100000 --fail-on-regression
npm run security:check
```

So sánh cần Git có commit nền; nếu clone shallow thì tải commit lịch sử trước. Script dùng `git archive`, cùng fixture/evaluator cho hai phiên bản và tiến trình Node tách biệt; không tạo worktree. `--jsonl --start N --limit M` hỗ trợ chia lô; số lượt vượt 56 là lặp fixture, không sinh nhãn đúng mới.

Sau review, người vận hành có thể bật `QH_V11_ENABLED=true` trong môi trường test được cho phép và khởi động bot bằng quy trình hiện hữu. Chỉ thử với tài khoản/nhóm được phép; giữ nguyên các biến nhóm/staff/admin đã xác minh. Không đưa giá trị session/key vào Git. Chưa chạy quy trình này với SDK/network Zalo thật, chưa xác nhận chất lượng trên merchant thật.

Rollback: bỏ `QH_V11_ENABLED` hoặc đặt `false`, khởi động lại bằng quy trình hiện hữu. Không đổi tài khoản/phiên đăng nhập. Flag không phải phê duyệt deploy. Không có paid inference, model server, inference key hay dịch vụ mới cần bật; runner API trả phí cũ đã bị loại khỏi đường thực thi, workflow coding cũ chỉ thông báo chính sách zero-cost. Xem `v11-zero-cost.md`.

## Phần cần người duyệt

OPS cần duyệt dataset/ràng buộc nghiệp vụ và các quy tắc nguồn/thiết bị; sau đó kiểm thử cờ trên bot test với dữ liệu được phép. Cần thêm hội thoại thực đã ẩn danh theo quy trình riêng để đo độ đúng, độ tự nhiên tiếng Việt và relevance ngoài tập synthetic. Không cam kết V11 đã tốt hơn trên production chưa quan sát hoặc biến điểm assertion thành độ chính xác thực tế.
