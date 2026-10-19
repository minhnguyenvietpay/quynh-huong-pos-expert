# V13 — Bàn giao 5 vòng phát triển hội thoại merchant

Nhánh `feat/v13-merchant-conversation`, từ main `eefe224` đã chứa V12.2. Đã dùng usage Codex để thực hiện5 vòng có thay đổi runtime, không gọi paid AI API, không tạo dịch vụ inference và không yêu cầu AI key. Không deploy/merge/gửi tin Zalo thật hoặc đọc log merchant.

## Kết quả trên cùng dữ liệu

Replay cùng91 fixture/tiêu chí khóa bằng evaluator có kiểm tra từng lượt và trạng thái:

| Phiên bản | Round1/18 | Round2/16 | Round3/18 | Round4/18 | Round5/21 | Tổng/91 |
|---|---:|---:|---:|---:|---:|---:|
| Main V12.2 expert `eefe224` |8|10|7|2|6|33|
| V13 `84de999` |18|16|18|18|21|91|

58 fixture cải thiện,0 hồi quy so với main trên tập này; không tuyên bố58 lỗi nghiệp vụ độc lập. Baseline expert được bật cờ V12, V13 bật riêng cờ13; chưa biết cấu hình hay độ đúng production của merchant thật. Lỗi chào/giới thiệu còn được kiểm tra default:2/18→18/18. Trạng thái payment default qua “chưa rõ”/máy treo0/2→2/2.

Đây là synthetic do Merchant Simulator tạo, QA Judge riêng đặt hợp đồng và POS Expert/Safety Auditor là các vai trò Codex review. **Chưa có OPS/domain owner bên ngoài xác minh ground truth; quality gate độc lập vẫn BLOCKED.** Regex/state assertions và review transcript không đo trọn độ đúng/tự nhiên trên merchant thật.

Coverage audit:91 fixture khóa gồm88 hội thoại nhiều lượt và3 probe một lượt. Đã bổ sung3 counterpart hội thoại nhiều lượt cho ba probe đó, giữ nguyên hash/assertion của91 fixture. Các counterpart được viết sau sửa lỗi, không phải holdout hoặc3 ca cải thiện độc lập; xem multi-turn-coverage.json. Không đếm chạy alias, load hay biến thể lặp thành hội thoại mới.

## Năm vòng thực tế

| Vòng | Baseline của vòng | Trước→sau | Commit | Trọng tâm |
|---|---|---|---|---|
|1|main eefe224|expert8→18/18; default2→18/18|`9af7a17`|chào/giới thiệu, ưu tiên social, tạm dừng OPS, listener câu ngắn|
|2|9af7a17|10→16/16|`40516c6`|hết/trắng/mờ/kẹt giấy, kết quả thao tác, Wi-Fi/SIM, từ chối OPS|
|3|40516c6|7→18/18; default0→2/2|`2e1db67`|QR/thẻ chưa rõ, nghi thu trùng, đối chiếu và giữ rủi ro khi rút consent|
|4|2e1db67|3→18/18|`257e03e`|sử dụng POS, Portal/chi nhánh/nguồn, bản sao bill, hỗ trợ người thật|
|5|257e03e|11→21/21|`84de999`|đối kháng consent, ngữ cảnh lồng, tin dài, nguy hiểm và cờ V13|

Từng vòng có Simulator → thực thi chatbot → QA/domain/safety review → thiết kế → code → full regression → checkpoint. Các baseline của từng vòng khác với replay cùng main ở bảng đầu; không cộng chúng thành một độ chính xác tổng. Mỗi vòng lưu commit và điểm tiếp tục, không tự hẹn giờ hoặc hứa tự resume khi usage reset.

## Lỗi người dùng báo và thay đổi phản hồi thực

Chuỗi `@Quỳnh Hương hi em` → `@Quỳnh Hương em giới thiệu đi` → `Không` được tái hiện offline. greetingOnly bỏ sót “hi em”; giới thiệu chạy sau collector/engine, nên câu xã giao có thể bị lưu làm tên/địa chỉ. Đây là nguyên nhân xác định trong runtime repo; chưa truy cập bot production để xác nhận cấu hình live.

Social toàn câu nay đi trước các nhánh có mutation; listener giữ câu gốc và có cửa sổ follow-up hữu hạn. Ba lượt được kiểm tra bằng listener thật với SDK giả lập ở default, cờ12 và cờ13: không ticket, không mention OPS, không lấy tên/địa chỉ từ xã giao. Consent cũ cho cùng sự cố có thể PAUSE, không tự gửi; chỉ field rõ ràng hoặc xác nhận OPS rõ mới tiếp tục, rút consent/đổi sự cố xóa collector.

Một số cặp trước/sau đã đọc transcript:

- Khách nói đã thay giấy nhưng chưa báo kết quả: trước coi đã thử thất bại và hỏi OPS; nay hỏi kết quả, phân biệt giấy hết/trắng/mờ/kẹt.
- Đổi SIM/Wi-Fi: trước giữ dữ kiện điện thoại cũ hoặc xin OPS ngay; nay dùng kết nối hiện tại và kết quả mới để khoanh vùng.
- Khách hỏi dùng chip: trước hỏi lỗi ở chạm/chip/quẹt; nay đối chiếu đơn hàng/số tiền, làm theo thiết bị/quyền thu ngân và kiểm tra đúng giao dịch sau thao tác, không thu lại khi chưa rõ.
- Portal đang lọc sai chi nhánh/ngày/nguồn: trước generic filter/OPS; nay nêu đúng phạm vi cần đối chiếu, không bịa nút hoặc URL.
- Khách báo quét QR/nhận thông báo tiền: không suy ra đã thành công, không hẹn hoàn/settlement; dùng POS/Portal đúng thời điểm/số tiền/nguồn/trạng thái.
- Quoted/hypothetical “đồng ý” không thành consent. Ngắt qua nhiều lỗi phần cứng, rút consent hoặc tin dài không làm biến mất nghĩa vụ xác minh giao dịch.

PASS không kết thúc review: QA phát hiện giấy đã in rõ nhưng bot còn nhắc lại lỗi in dù21 contract đã đạt. Đã sửa và thêm test sau sửa, ghi đúng provenance. Hai follow-up nguy hiểm khác được khóa trước sửa: stop reply chưa persist sau câu hỗn hợp; nay chỉ lưu mã battery/power, không raw secret, và lượt hỏi sạc tiếp theo vẫn bị chặn.

## Mã nguồn và các vai trò

Runtime sửa trực tiếp7 file đang dùng: intent.js, dialogue.js, listener.mjs, conversation.js, lib/v12/engine.cjs, memory.cjs, understanding.cjs. Cờ13 dùng cùng module expert lịch sử, không dựng engine rời hoặc sao chép module chỉ để tăng file. Source retrieval/corpus không được promote vì0/5000 mục đáp ứng verified. Module V11 và lockfile giữ nguyên.

Bảy vai trò đã thực thi bằng subagent: Merchant Simulator, Conversation Designer, POS Expert, QA Judge, Safety Auditor, Code Engineer; root là Improvement Director kiêm kiến trúc/backend coordination/release. Mỗi vai trò có artifact và công việc riêng. AGENTS.md lưu workflow tiếp tục, vẫn giữ trách nhiệm safety/release cũ. Không gọi một lịch QA hay danh sách tên là autonomous coding service; runner paid inference vẫn bị chặn.

## Kiểm chứng và CI

Cây mã bàn giao cuối: **npm test359/359; qa:v13 56/56; qa:v12 146/146,0 skip/fail**. Full inventory đã chạy lại sau khi thêm3 counterpart; security scan208 file không vi phạm. Bộ56 cũ qua QH13-only56/56. Safety18/18, activation/fallback5/5, default payment2/2, manual review1/1. Tất cả fixture cũ, cả ba bộ V12, giữ nguyên tiêu chí.

qa:language30/30; qa:legacy25/25; V3 isolated self-test PASS; qa:quality24/24 synthetic (independent gate BLOCKED); knowledge0/5000 verified; scanner không vi phạm. Không đọc giá trị credential/session; SDK/network bị chặn trong listener tests. Node cục bộ24.19.0. CI Node22/24 chạy npm ci, full tests, V13 profile, compatibility V11/V12/V13 và scanner; kết quả từ xa ghi trong PR, không nhầm cấu hình với job đã chạy.

Runner truyền file test bằng argument list để không phụ thuộc glob của PowerShell/cmd/Unix; reset cờ test để baseline không bị cờ production trong shell thay đổi. Chưa thực thi Windows thật; hướng dẫn cập nhật/kiểm chứng trên Windows nằm trong [WINDOWS-UPDATE-VI.md](WINDOWS-UPDATE-VI.md).

## Cập nhật, rollback và phần còn yếu

Chỉ sau review/phê duyệt deployment mới chọn commit, bật `QH_V13_ENABLED=true` và restart bằng cơ chế đang dùng. Không đoán Windows service/restart command, không đổi Zalo session. Cờ12 tương thích chọn cùng engine mới, nên bật12 không rollback mã về V12.2. Full rollback cần commit deployment trước cập nhật và cấu hình đã ghi; baseline repo là eefe224, không nhất thiết commit đang chạy trên máy người dùng. Có thể chọn V11 cho expert path bằng tắt13/12 và bật11, nhưng logic social dùng chung vẫn thuộc commit hiện tại.

Chưa đạt500 core/5000 hội thoại/10000 biến thể. Không tạo bản sao cho đủ chỉ tiêu. Chưa có ground truth chuyên môn bên ngoài, source bank/model mới được duyệt, transaction access, live online monitoring hay xác minh hiệu quả merchant thật. NLU quy tắc hữu hạn có thể sai ngoài tập; nguồn/thiết bị/quyền thao tác thực phải được OPS kiểm tra. Giới hạn RAM/TTL có eviction và reset mất context; khuyến cáo giao dịch chưa rõ không bị biến thành kết luận thất bại/thành công.

Bước tiếp tục: OPS review các contract/nguồn, thêm hội thoại được phép đã ẩn danh bằng quy trình riêng; ưu tiên lỗi thật chưa bao phủ, đóng băng dữ liệu trước sửa, giữ vòng đo cùng baseline và PR review. Không tự lấy dữ liệu live, duyệt knowledge, merge hoặc deploy.

## Tái lập

```sh
npm ci
npm test
npm run qa:v13
node scripts/program-compare.cjs --evaluator v13 --version V12.2-main:eefe224:v12 --version V13:84de999:v13 --dataset tests/fixtures/v13-round1.json --dataset tests/fixtures/v13-round2.json --dataset tests/fixtures/v13-round3.json --dataset tests/fixtures/v13-round4.json --dataset tests/fixtures/v13-round5.json --output qa-reports/v13-comparison.json
```

Cần có các commit lịch sử để git archive; không tạo worktree. Báo cáo so sánh dùng cùng evaluator, byte dataset và hash cho hai phiên bản, không thay checkout. Five checkpoints: round1-checkpoint.md đến round5-checkpoint.md; toàn bộ before/after/comparison và review trong thư mục này.
