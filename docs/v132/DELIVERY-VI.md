# V13.2 — kết quả giao hàng để review

Nhánh `feat/v13-2-knowledge-reply-intelligence`, base main `1a33422e34beb25747238c24214097de4465e5c1`. Thực hiện3 chu kỳ,7 vai phát triển riêng: Simulator, Designer, POS Expert, QA Judge, Safety Auditor, Code Engineer, Director. Simulator giữ đầu vào, QA giữ kỳ vọng, Code Engineer không sửa assertions. Không dùng AI API trả phí hoặc thêm hạ tầng. Không chạy Zalo thật, thay credentials, merge hay triển khai.

## Nguyên nhân đã tái hiện

`dialogue.js` trước sửa gọi expert V13 trả generic trước khi tới extractErrorCode/searchKnowledge ở cuối;02/03/06 không tới bước tra cứu. Extractor/search dùng hai quy tắc khác nhau, thiếu E03/POS báo03 và không quản lý scope thiết bị/acquirer. Capability grammar thiếu “em có thể kiểm tra gì”; network English không đi đúng nhánh. Kho có bản mã nhưng toàn bộ chưa xác minh, nên không thể tự coi tồn tại bản ghi là có hướng dẫn đáng tin.

Listener cũ không đọc metadata reply/mentions để gắn complaint, chỉ gửi “kiểm tra case này” vào dialogue. QA V13 trước đó kiểm tra những hội thoại do bộ thiết kế cũ bao phủ, không có các input báo cáo và đường reply SDK này;359/359 không chứng minh các trường hợp ngoài bộ đã đúng. Trong V13.2, ngay cả bộ mới xanh cũng có thêm lỗi mất dữ kiện và lặp lời khuyên được tìm qua đọc transcript, rồi bổ sung hồi quy trước sửa tiếp.

## Thay đổi runtime

Một extractor authoritative hỗ trợ danh sách mã, giữ số0; router exact-code đứng trước generic expert, sau guard an toàn. Đúng model/acquirer, nguồn/bằng chứng đủ điều kiện, không xung đột mới trả kiến thức. Thiếu nguồn thì xác nhận mã và hỏi thông tin tối thiểu; không tự gán nghĩa ngân hàng. Context hữu hạn giữ scope đã trả lời, xóa khi đổi chủ đề, xử lý phủ định và nhiều mã. Chặn restart/thanh toán lại khi kết quả còn chưa rõ. Default/V11 fallback giữ hành vi cũ; các cải thiện router expert dùng cờ13/12.

Reply mới dùng `listener.mjs → lib/reply-context.cjs → dialogue.js` với cờ13. zca-js đã kiểm tra và cài lại theo lock là2.2.0. Resolver đối chiếu mention UID bot, nhóm, owner và cả globalMsgId/cliMsgId; quote preview không phải nguồn. Cache RAM giữ dữ kiện canonical thay vì nguyên văn, tối đa1000 tin/500 case, TTL15 phút; undo/TTL/eviction vô hiệu case. Không tải lịch sử. Người đang hỏi khác tác giả gốc, scope nhóm+requester+reference tách biệt. Staff cần UID và nhóm được cấu hình; tự nhận staff không cấp quyền. Quote là dữ liệu, không là lệnh/consent. Phân tích case không tạo handover/ticket.

## Bằng chứng trước/sau

| Bộ cố định | Baseline tương ứng | Sau sửa |
|---|---:|---:|
| C1 actual dialogue,18 hội thoại |6/18 trên main|18/18|
| C2 actual listener,14 tình huống reply|1/14 trên main|14/14|
| C3 direct,10 đối kháng|4/10 sau C2 (main5/10)|10/10|
| C3 stale-code review,1 ca|0/1 sau C2|1/1|
| C3 listener,6 đối kháng|6/6 sau C2 (main0/6)|6/6|

Không cộng biến thể thành số lỗi nghiệp vụ/khách thật. Tám ca review bổ sung đều đạt, nhưng được ghi nhãn sau triển khai ban đầu. Greeting/introduction và đơ→settlement đã đạt trên main; không nhận công sửa mới hai ca này. Chi tiết lời đáp, lượt trung gian, state và hash nằm trong cycle*-{before,after,comparison}.json, frozen-cycles.json, additional-review-probes.json và ba báo cáo QA.

Ví dụ lời đáp thực tế tái hiện offline:

- “em có thể kiểm tra gì”: trước mời chuyển CS/OPS; sau liệt kê POS/in/mạng/QR/thẻ/tra soát/đối soát/settlement/Portal và nói rõ không truy cập ngân hàng thời gian thực.
- “nó ghi network error”: trước mời OPS; sau “Máy mất mạng đang dùng Wi-Fi hay SIM/4G ạ? Chưa yêu cầu khách thanh toán lại khi chưa xác minh kết quả trên POS/Portal.”
- “máy báo lỗi03”: trước hỏi nguồn/in/kết nối/giao dịch chung; sau “Em ghi nhận mã lỗi03; chưa có hướng dẫn đã xác minh phù hợp để kết luận ý nghĩa mã này”, rồi hỏi model, không yêu cầu MID/TID.
- Reply complaint khách bị trừ tiền/POS thất bại: trước xử lý isolated “kiểm tra case này”; sau nhận đúng rủi ro từ reference, nhắc chưa restart/thanh toán lại, đối chiếu POS/Portal, staff có giả thuyết và điều kiện consent.

## Knowledge và kiểm thử

Kho thật: **5000 bản ghi,121 thuộc mã lỗi,0 đủ xác minh**;4862 draft,17 reference chờ OPS,121 chờ bank mapping.02/03/06 mỗi mã có1 bản chưa xác minh. Không thấy nhóm định nghĩa xung đột theo audit hiện tại. Số bản verified thực tế bị chặn/không truy xuất được là0 vì mẫu số verified cũng0; không suy thành accuracy100%. `knowledge-audit.json` lưu hash corpus. Fixture synthetic đã duyệt chỉ chứng minh cơ chế exact scope/evidence/conflict và actual-engine selection, không bổ sung tri thức sản xuất hay tự phê duyệt.

Local Node24.19.0: **npm test413/413**, qa:v13254/54, language30/30, legacy25/25, V3 self-test PASS, quality24/24 synthetic, security0 violations. Bộ56 hội thoại V11 đạt56/56 riêng từng mode11/12/13. Gate quality bên ngoài vẫn **blocked** vì chưa có đánh giá ground truth OPS. Xem verification.json. CI Node22/24 thực thi npm ci, tất cả suite cũ, V13.2, audit và security; kết quả cuối được cập nhật sau khi tạo PR.

Các lỗi chạy trung gian không bị giấu: lần đầu C1 phát hiện phá contract legacy, đã gate router expert và khôi phục fallback; manifest bộ tương lai được bật theo đúng chu kỳ rồi bật hết ở cuối. Regex reply quá rộng được siết trước triển khai, baseline chính thức1/14 thay bản nháp3/14. Regex an toàn nhận nhầm câu phủ định restart được sửa ở evaluator, không hạ yêu cầu an toàn. Npm cache mặc định không ghi được; cài lại thành công với cache/tmp, giữ TLS/integrity/lockfile.

## Giới hạn và vận hành

Ngữ pháp, model và tên đơn vị xử lý hữu hạn; facts ngoài tập có thể cần mô tả lại. Quoted nội dung nhạy cảm bị loại; tin chưa nhận/hết hạn/thu hồi không phân tích từ preview. Follow-up “đã thử rồi” hỏi rõ bước/kết quả, không đoán mọi bước đã thất bại. Có thể lặp giải thích thiếu nguồn khi lặp mã và nhắc OPS nếu người dùng chỉ yêu cầu ngừng hỏi Wi-Fi mà chưa từ chối OPS rõ. Phản hồi thanh toán/staff dài hơn câu thông thường. Chưa kiểm chứng live Zalo, Windows hoặc độ chính xác OPS bên ngoài.

[Checkpoint1](CHECKPOINT-1-VI.md), [Checkpoint2](CHECKPOINT-2-VI.md), [Checkpoint3](CHECKPOINT-3-VI.md); [SDK](SDK-COMPATIBILITY.md); [cập nhật Windows/cờ/rollback](WINDOWS-UPDATE-VI.md). Cờ13/12 cùng dùng expert mới, bật12 không rollback mã V13 cũ. Full rollback về SHA/cấu hình trước triển khai đã ghi nhận, baseline nêu trên. Không có migration hay thay credentials. Bản nháp cấu hình cloud đã lưu install_script/start_skill offline; người dùng review/save và publish trong environment settings nếu muốn tái sử dụng, tác vụ chưa publish.
