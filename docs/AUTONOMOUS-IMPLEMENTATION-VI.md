# Báo cáo triển khai Quỳnh Hương POS Quality Platform

## Kết quả và phạm vi

Nhánh `feat/autonomous-pos-quality-platform`, dựa trên phiên bản đã sửa QA `921f6e4`. Đây là lát cắt có code và kiểm thử: phản hồi thực tế → đánh giá synthetic có version → phân nhóm lỗi/lịch sử → giới hạn ứng viên → các gate → đường tạo PR mặc định tắt. Không đăng nhập/gửi tin Zalo, không sửa `listener.mjs`, không deploy/merge, không gọi API coding trả phí.

Đã sử dụng tám vai trò thực trong nhiệm vụ: root giữ Tech Lead và bảy Codex subagent lần lượt thực hiện Knowledge, Conversation, Backend/Monitoring, QA/Simulation, Root Cause/Red Team, Security, Release. Mỗi vai trò có file triển khai hoặc kiểm thử/review cụ thể, không chỉ là tên trên sơ đồ. `AGENTS.md` và `agents/roles.json` tái sử dụng tám giai đoạn; runner API tương lai chạy tuần tự để kiểm soát quyền và chi phí.

## Kết quả trước/sau đã chạy

Cùng evaluator và dataset `golden-v1.1.0`, mã nền lấy bằng `git archive 921f6e4` vào thư mục tạm:

| Phép kiểm tra | Trước | Sau |
| --- | --- | --- |
| 24 hội thoại synthetic có version | 21/24 | 24/24 |
| Ca từ fail thành pass | — | 3 |
| Ca trước pass sau fail | — | 0 |
| Suite `npm test` | 44/44 ở đầu nhiệm vụ | 93/93 trên Node 22 và 24 |
| Ngôn ngữ V4.3 | 30/30 | 30/30 |
| QA Lab | 25/25 | 25/25 |
| V3 self-test cô lập | PASS | PASS |

Ba cải thiện là ưu tiên giao dịch chưa xác minh khi POS treo/khách báo trừ tiền; hướng dẫn kiểm tra chuyển khoản chưa xuất hiện; kết thúc escalation với câu “bình thường rồi em”. Bổ sung kiểm tra phủ định trừ tiền, hết hạn consent, không lặp xử lý, không thu thập merchant information trước đồng ý và chống xuất nội dung nhạy cảm. Xem số liệu không chứa hội thoại tại `autonomous-comparison.json`.

Dataset vẫn **AI authored, chưa duyệt độc lập**. Gate độc lập trả blocked/exit 2 đúng thiết kế; 24/24 là các ràng buộc synthetic, không phải 100% đúng nghiệp vụ. Retrieval relevance chưa có trace nên trả null, không tạo điểm giả. Không có bài kiểm thử bị skip trong suite 93.

Hai script cũ ngoài suite vẫn lỗi, đã chạy và chẩn đoán: `test-hotfix.js` dùng mock require cũ thiếu `v12.reply`; `test-social.js` đòi lời chào thay cho phản hồi chẩn đoán hiện tại. Không đổi assertion để tô xanh. `test-typing.mjs` không chạy vì đăng nhập và gửi sự kiện Zalo thật. V2/V3 dữ liệu đầy đủ vẫn thiếu `variants-50000.jsonl`; không tạo dataset giả để vượt kiểm tra. V4.7/Auto Fix V4.8 đầy đủ không có trong checkout, chỉ có overlay V4.8.

## Trạng thái từng phần

| Tính năng | Trạng thái | Bằng chứng và giới hạn |
| --- | --- | --- |
| Tám vai trò, AGENTS và phân công subagent thực | IMPLEMENTED AND VERIFIED | Tám vai trò đã thực hiện trong nhiệm vụ; role definition/gate có test. |
| Knowledge Growth Engine | IMPLEMENTED AND VERIFIED | Schema/adapter, taxonomy, HTTPS source/evidence constraints, confidence/review, duplicate/conflict/staleness, coverage và hàng đợi băm; corpus 5.000 được đếm đầy đủ. |
| Tự thu thập nguồn và tăng knowledge đã xác minh | NOT IMPLEMENTED | Không có người duyệt/nguồn xác minh đủ để tạo bản ghi customer-facing mới. 0/5.000 được xác minh; không nâng trạng thái để đạt chỉ tiêu. |
| Conversation Intelligence | IMPLEMENTED AND VERIFIED | Actual `processMessage`, synthetic before/after và red-team; không khẳng định kiểm chứng với merchant thật. |
| Interface monitoring và dashboard chỉ đọc | IMPLEMENTED AND VERIFIED | Allowlist metadata, latency/outcome, lỗi/rỗng/lặp/consent; HTTP/Host/Origin/privacy tests. Chỉ là interface đã test synthetic. |
| Kết nối Online QA với Zalo production | REQUIRES CONFIGURATION | Chưa có live adapter được phê duyệt hay access thật. Không sửa listener để gắn monitoring. |
| Offline QA có version và metric theo chiều | IMPLEMENTED AND VERIFIED | 24 hội thoại, state assertions, safety metrics, baseline/regression, cổng independently reviewed bị chặn đúng. |
| Golden dataset duyệt độc lập và đo retrieval relevance | NOT IMPLEMENTED | Cần OPS review cùng nguồn/evidence và retrieval tracing; hiện reviewed=0/retrieval=null. |
| Phân nhóm lỗi, chọn ưu tiên, chống thử lại, quality/path gates | IMPLEMENTED AND VERIFIED | Planner local, lỗi metadata có allowlist, gate yêu cầu cải thiện/no regression, history commit/issue/outcome và rollback ref; test không dùng API. Root cause hiện là nhãn heuristic cần điều tra. |
| API coding-agent tám stage, container, tạo PR | REQUIRES CONFIGURATION | Code đã có, default off; cần trusted image digest, model, key và quyền GitHub. Chưa chạy end-to-end container/provider/PR, chưa chứng minh tự sửa mã thành công bằng API. |
| Workflow QA sáu giờ, PR, knowledge hằng ngày, tổng hợp tuần | IMPLEMENTED BUT NOT VERIFIED | YAML đã parse, các command chạy cục bộ; chưa có run GitHub Actions xác nhận. Tổng hợp tuần là snapshot tại lần chạy, chưa phải xu hướng bảy ngày. |
| Security checks và red-team | IMPLEMENTED AND VERIFIED | Scanner/artifact/workflow checks, adversarial cases; không coi regex hoặc sandbox config là bằng chứng an toàn tuyệt đối. |
| PR của lần triển khai này | IMPLEMENTED AND VERIFIED | Đã tạo [PR #2](https://github.com/minhnguyenvietpay/quynh-huong-pos-expert/pull/2), nhánh feature đã push; chưa merge/deploy. |

Knowledge report hiện có 5.000 mục unverified, 5.003 review items (một record có thể có nhiều lý do); không có exact duplicate hoặc same-question possible conflict được detector tìm thấy. Điều này không chứng minh không có trùng ngữ nghĩa/mâu thuẫn nghiệp vụ. Không thay đổi `knowledge.json`. Cổng source/evidence kiểm tra cấu trúc, không thay người xác minh nguồn.

## Cách chạy

```sh
npm ci
npm test
npm run qa:language
npm run qa:legacy
node qa-v3.js --self-test
npm run qa:quality
npm run knowledge:report
npm run security:check
node scripts/improve.cjs plan --report qa-reports/quality.json
npm run monitor:dashboard
```

Dashboard monitoring dùng cổng cục bộ 3048, chỉ GET; CLI mặc định không gắn processor production. Test tích hợp truyền monitor có synthetic events vào server. Không đưa đường dẫn loopback thành preview công khai. Wrapper opt-in không lưu raw input/output/exception; classifier nghiệp vụ phải cung cấp consent/escalation đáng tin cậy. Chỉ metadata không đủ phát hiện mọi câu trả lời sai.

Log gap tùy chọn trong `expert.js` đã chuyển sang `qa-reports/knowledge-gaps.jsonl`, chỉ thời điểm và mã lý do; không lưu câu hỏi hay hash câu hỏi. Không đưa log cũ/production vào pipeline. Báo cáo synthetic chi tiết vẫn chỉ để local; weekly output chỉ có số tổng hợp.

## Bật AI sau khi chuẩn bị hạ tầng

Xem `automation.md` và `config/automation.example.json`. Cần Docker Linux, image Node/Git/Codex 0.163.0 đã review và pin digest, model hỗ trợ, secret riêng `QH_AGENT_API_KEY`, biến `QH_ENABLE_AI_RUNNER=true`, `QH_AGENT_MODEL`, `QH_AGENT_CONTAINER_IMAGE`, cùng quyền tạo PR. Không gửi secret trong chat.

AI container chỉ nhận key API riêng, không nhận GitHub/Zalo/session/host home; test container không có mạng. `.git` được mount chỉ đọc, file sửa giới hạn engine; cấm sửa listener, test, golden data, knowledge approvals và CI. Mọi stage phải trả review approved; yêu cầu cải thiện trên tổng hai bộ synthetic, không hồi quy và tất cả test/security gate đạt. Không deploy/merge. Docker/API image thực chưa được kiểm chứng; không mặc định bật workflow. Lịch sử an toàn có cache CI best effort, chưa phải audit store bền vững. Candidate patch chỉ xuất local sau gate, không upload báo cáo thô.

## Công việc tiếp theo chính xác

1. OPS review 24 fixture và nguồn bằng chứng; tạo quy trình sign-off độc lập trước khi mở gate nghiệp vụ. Không tự ghi reviewed metadata.
2. Chọn một chủ đề POS có SOP chính thức, kiểm chứng nguồn và đưa một nhóm nhỏ bản ghi đã duyệt vào store; thêm retrieval trace/test relevance trước mở rộng tới 5.000 verified.
3. Build/review image bằng Dockerfile mẫu với context chỉ `containers/`; kiểm tra sandbox trên runner thật, cấu hình model/key giới hạn ngân sách; chạy một lỗi synthetic đã biết để xác nhận toàn đường agent→patch→tests→PR.
4. Thêm durable improvement history và metric store, kiểm tra khôi phục/rollback; không dựa cache CI cho audit sản xuất.
5. Sau phê duyệt riêng, triển khai adapter monitoring read-only vào bản test của bot; xác minh classifier consent/escalation, tải/latency và fail-open trước khi gắn production. Không gửi test tới merchant thật.
6. Bổ sung semantic contradiction/duplicate review và chỉnh hai legacy test stale trong nhiệm vụ tương thích riêng; không xem chúng là kiểm chứng nghiệp vụ.
