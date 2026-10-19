# Bàn giao chương trình V12 → V12.1 → V12.2

Ba giai đoạn chạy tuần tự trên `feat/v12-three-stage-program`, từ main `180adac`, không paid inference, không Zalo live, không deploy/merge. Commit V12 `81a4a30`, V12.1 `094bdd8`, V12.2 `99f3c22`.

## So sánh cùng dữ liệu cố định

| Revision | Stage1 (80) | Stage2 (20) | Stage3 (24) | Tổng124 |
|---|---:|---:|---:|---:|
| V11 |9|1|15|25|
| V12 |80|0|16|96|
| V12.1 |80|20|16|116|
| V12.2 |80|20|24|124|

Tất cả là hợp đồng hội thoại synthetic do Codex tạo, chưa có OPS/merchant ground truth được duyệt độc lập. Không chuyển các tỷ lệ này thành độ chính xác production. Stage1 tái lập71 ca lỗi thuộc15 nhóm nguyên nhân; không tuyên bố71 lỗi nghiệp vụ độc lập. Stage2 do người review Codex không viết runtime Stage1 tạo20 thử thách mới trước sửa. Stage3 khóa24 ca đối kháng trước sửa. Hash cố định được npm test kiểm tra; không sửa/nới assertion cũ.

`four-version-comparison.json` có commit đầy đủ, hash và ID cải thiện/hồi quy. Có3 hồi quy lịch sử trên các bộ tương lai: V12 làm mất `s2-payout-substantive-definition` và `s3-withdraw-and-new-risk`; V12.1 làm mất `s3-compound-negative-resolution`. V12.2 sửa cả3 và không hồi quy với V12.1. Lệnh so sánh trả exit1 vì chủ động báo các hồi quy lịch sử đó; không che lỗi hoặc đổi exit status. Bộ regression hiện hành bắt buộc0 lỗi.

## Phản hồi tốt hơn ở đâu

- Khi khách chỉ nói “vẫn chưa được” sau lỗi in, V11 tự ghi đã thử rồi hỏi chuyển OPS; V12.2 hỏi giấy không chạy hay giấy trắng/mờ, không tự coi bước hướng dẫn là đã làm.
- “Điện thoại cùng Wi-Fi cũng không vào mạng”: V11 có thể suy ngược điện thoại dùng được; V12.2 kiểm tra đường truyền/router chung. Khi điện thoại được nhưng POS không được, khoanh vùng bằng mạng/hotspot được phép.
- Rút consent từng bị dùng làm tên/địa chỉ; V12.2 dừng collection/pending, kể cả kèm dữ liệu nhạy cảm. “Có” để tiếp tục vấn đề cũ không còn thành consent OPS.
- “Đã kiểm tra giấy xong và in được rồi” được ghi nhận phục hồi; “in được rồi nhưng vẫn trắng không có chữ” tiếp tục chẩn đoán, không đóng phiên.
- Giao dịch đang xử lý khi đang kiểm tra giấy/Wi-Fi được ưu tiên xác minh POS/Portal; thiết bị hoạt động lại không chứng minh giao dịch thành công. Định nghĩa refund/void cũng không che nguy cơ pin hoặc thanh toán.

Transcript trước/sau đầy đủ chỉ dùng hội thoại tổng hợp nằm trong stage1-evidence.json, stage2-evidence.json, stage3-evidence.json. Rationale từng ca và phản hồi baseline trong stage2-review.md, stage3-review.md.

## Kiểm chứng và tự động hóa

Cục bộ Node24.19.0: npm test306/306, qa:v12 142/142, không skip. Bộ56 hội thoại V11 đạt56/56 trên V11 fallback và V12.2. qa:language30/30; qa:legacy25/25; V3 self-test PASS; qa:quality24/24 synthetic nhưng independent gate BLOCKED; knowledge report0/5000 verified. Security check không có vi phạm. Không đổi corpus, lockfile hoặc module V11.

GitHub Actions chạy npm ci/test, frozen response regression, tương thích56 hội thoại V11 và scanner trên Node22/24; PR có trạng thái CI riêng, không đồng nhất kiểm tra cục bộ với CI từ xa. SDK giả lập kiểm tra đường listener → dialogue → V12, không đăng nhập/gửi thử nhóm thật. Test load kiểm tra giới hạn2000 phiên, TTL, lịch sử hữu hạn và250 lượt lặp; không tính số lượt này thành ca độc lập.

Các nguyên nhân QA cũ “0 cải thiện” được kiểm tra lại trong checkpointStage1 và ../QA-REVIEW-VI.md: thiếu dataset variants, không có knowledge đủ duyệt, template patch không khớp, QA chỉ đo intent, và tính idempotent. Không đủ lịch sử để khẳng định mọi lần V4.7/V4.8 đều có cùng nguyên nhân. Không mở lại API coding trả phí; runner run vẫn bị chặn theo zero-cost.

## Báo cáo, triển khai và rollback

- [Checkpoint V12](stage1-checkpoint.md): cải thiện, số liệu, giới hạn, ưu tiên tiếp theo.
- [Checkpoint V12.1](stage2-checkpoint.md):20 lỗi còn lại, sửa và regression.
- [Checkpoint V12.2](stage3-checkpoint.md): đối kháng, bộ nhớ, an toàn và phần chưa xác minh.
- [Hướng dẫn vận hành/rollback](runtime-operations.md): cờ mặc định tắt; cần review và phê duyệt riêng trước staging/production. Không đoán service/server/restart command.

V12.2 được tích hợp vào listener bằng `QH_V12_ENABLED=true` sau phê duyệt; V11 giữ nguyên để fallback khi module lỗi/thiếu/không có kết quả. Rollback: `QH_V12_ENABLED=false`, `QH_V11_ENABLED=true` và restart theo quy trình được duyệt. Không thay session/authentication. Cờ fallback không phát hiện được mọi câu trả lời sai về nghiệp vụ.

Đã triển khai và kiểm chứng offline: runtime, bộ nhớ/retrieval guard, response QA, CI definition, listener mock, checkpoint và công cụ so sánh. Chưa xác minh: hiệu quả merchant thật, online monitoring live, source/domain correctness bởi OPS. Cần cấu hình/phê duyệt: rollout production. Không triển khai trong phạm vi này: paid coding runner, tự động duyệt knowledge, auto merge/deploy. Không có nguồn mới được tự gắn verified.

Giới hạn: ngôn ngữ hữu hạn, không tương đương LLM, không truy cập hệ thống giao dịch, không biết chính sách ngân hàng. Dữ liệu handover RAM giới hạn2000 và TTL logic30 phút, dọn khi có hoạt động; không hứa timer xóa khi nhàn rỗi. Tin không hợp lệ/quá dài cần gửi lại, có thể mất context. Cần người nghiệp vụ duyệt dữ liệu/định nghĩa và đánh giá staging được phép trước rollout.
