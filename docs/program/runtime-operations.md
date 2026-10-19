# V12.2: vận hành và quay lại V11

Cả ba giai đoạn chỉ được kiểm chứng ngoại tuyến. Không coi test synthetic hoặc lịch CI là bằng chứng Zalo live đã chạy. Tài liệu này không bật phiên bản nào trong production. Codex chỉ là công cụ phát triển; runtime không gọi inference trả phí và không cần AI API key.

## Cờ mặc định và fallback

`QH_V12_ENABLED` chỉ bật khi giá trị chính xác là `true`; mặc định không đặt cờ. `QH_V11_ENABLED` cũng mặc định tắt nếu không được cấu hình. Khi bật V12, dispatcher ưu tiên engine V12 và giữ engine V11 làm fallback nếu V12 không trả kết quả hoặc ném lỗi. Fallback này là cơ chế định tuyến, không bảo đảm bắt được mọi phản hồi sai về nghiệp vụ. Không bật V12 trong cấu hình production như một phần của thay đổi QA.

Quay lại V11 ở cấu hình runtime đã được duyệt bằng cách đặt `QH_V12_ENABLED=false` và `QH_V11_ENABLED=true`, sau đó thực hiện quy trình restart có phê duyệt của hệ thống triển khai. Đặt cả hai `false` đưa dispatcher về đường xử lý cũ hơn, không phải V11. Không thay session/authentication Zalo để chuyển phiên bản. Không lưu cờ chứa bí mật hoặc thông tin khách hàng vào Git.

## Điều kiện trước triển khai (cần phê duyệt riêng)

Người vận hành ghi lại commit hiện hành và commit ứng viên, cấu hình cờ hiện tại chỉ gồm tên/giá trị không nhạy cảm và cách phục hồi deployment theo nền tảng đang dùng. Không đoán tên service, máy chủ hoặc lệnh restart. Xác nhận trước tác động của restart: context hội thoại trong bộ nhớ bị xóa, nên không suy diễn rằng đồng ý chuyển OPS trước restart còn hiệu lực. Không tự gửi lại ticket hoặc yêu cầu thương nhân gửi lại dữ liệu nhạy cảm.

Trên checkout ngoại tuyến, chạy `npm ci`, `npm test`, `npm run qa:v12`, `QH_V11_ENABLED=true QH_V12_ENABLED=false npm run qa:v11`, `npm run qa:language`, `npm run qa:legacy`, `node qa-v3.js --self-test`, `npm run qa:quality`, `npm run knowledge:report` và `npm run security:check`. Bộ `qa:v12` bao gồm các file `tests/v12*.test.cjs` và hợp đồng hội thoại cố định cả ba giai đoạn, đánh giá understanding, memory, retrieval, bảo mật và red team bằng dữ liệu tổng hợp. `npm test` cũng thu thập các file này. Bước CI riêng giúp nhận diện lỗi V12 trên Node 22 và 24; không gọi listener hoặc tài khoản Zalo.

Giữ báo cáo thô ở đường dẫn ignore nội bộ; chỉ đưa số lượng và lỗi đã làm sạch vào PR. Chưa có ground truth được duyệt độc lập thì cổng đánh giá chất lượng độc lập vẫn bị chặn, dù test đạt. Chỉ sau khi chủ hệ thống duyệt commit, phạm vi bật cờ và kế hoạch rollback mới được thao tác live; tài liệu này không cấp quyền triển khai.

## Theo dõi và rollback sau khi được duyệt

Các dấu hiệu rollback gồm phản hồi bịa trạng thái thanh toán/hoàn tiền, yêu cầu MID/TID hoặc thông tin nhạy cảm, chuyển OPS thiếu đồng ý, lẫn context giữa người dùng hoặc hồi quy hội thoại. Dừng mở rộng, đưa cờ về V11 theo cấu hình trên và phục hồi commit deployment trước nếu lỗi nằm ngoài dispatcher. Người vận hành kiểm tra lại bằng dữ liệu tổng hợp và số liệu tổng hợp đã làm sạch; không gửi thử cho thương nhân thật và không xuất log khách hàng ra CI. Không tự merge, triển khai hoặc chạy `npm start` trong quá trình kiểm chứng này.
