# Cập nhật và rollback V13.2 trên Windows

Đây là hướng dẫn cho người vận hành sau khi PR được review và có phê duyệt triển khai. Tác vụ Codex chỉ chạy offline, không kiểm chứng dịch vụ Windows hoặc đăng nhập Zalo.

## Chuẩn bị và kiểm tra offline

Dùng Node.js 22 hoặc 24 và checkout riêng để kiểm thử. Không chạy QA trong thư mục đang chứa dữ liệu/session Zalo sản xuất. Không sao chép session, .env hoặc thông tin khách vào Git/CI. Ghi lại commit và cấu hình cờ đang chạy trong nơi lưu trữ vận hành an toàn trước thay đổi.

```powershell
Set-Location 'C:\duong-dan\quynh-huong-pos-expert'
git status --short
git rev-parse HEAD
git fetch origin
git switch feat/v13-2-knowledge-reply-intelligence
git rev-parse HEAD
node --version
npm ci
npm test
npm run qa:v132
npm run qa:language
npm run qa:legacy
node qa-v3.js --self-test
npm run qa:quality
npm run knowledge:report
npm run security:check
```

Không reset hoặc ghi đè thay đổi cục bộ nếu checkout chưa sạch. Pin đúng SHA đã được review thay vì tự lấy tip mới sau review. Nếu môi trường kiểm thử không ghi được npm cache mặc định, có thể chỉ định thư mục cache ghi được; cloud đã xác minh `npm ci --cache /tmp/qh-npm-cache`, đường dẫn đó dành cho Linux, không phải Windows.

## Cờ tính năng và quyền

Trong cấu hình của tiến trình thực tế, đặt chuỗi **chính xác** `QH_V13_ENABLED=true`. Các ví dụ PowerShell sau chỉ có tác dụng với tiến trình con của shell hiện tại; không tự cập nhật Windows service/task đang chạy:

```powershell
$env:QH_V13_ENABLED='true'
$env:QH_V12_ENABLED='false'
$env:QH_V11_ENABLED='false'
```

V13.2 cải thiện expert dùng cờ13; cờ12 vẫn là alias cho cùng module expert mới. Reply intelligence chỉ bật bằng cờ13. V11 module vẫn là fallback khi expert tùy chọn lỗi; fallback không chứng minh mọi câu trả lời V11 có chất lượng như V13.2.

`STAFF_ZALO_IDS` phải là danh sách UID nhân viên được người quản trị xác minh. `QH_CASE_ANALYSIS_GROUP_IDS` là danh sách nhóm được phép phân tích staff, phân cách bằng dấu phẩy. Cần **cả** UID staff và nhóm; thiếu cấu hình thì chỉ merchant-safe. Không suy quyền từ lời tự giới thiệu. Giữ GROUP_MODE/ALLOWED_GROUP_IDS, ADMIN_USER_IDS, AUTO_REPLY, cooldown và giới hạn gửi theo cấu hình đã phê duyệt. Không điền UID thật vào tệp mẫu hay PR.

zca-js2.2.0 cung cấp getOwnId() để đối chiếu mention; QH_BOT_ZALO_ID chỉ là fallback khi hàm đó không có. Tên hiển thị không đủ kích hoạt phân tích reply. Cache chỉ RAM, TTL15 phút, tối đa1000 tin/500 case; chỉ giữ dữ kiện hữu hạn từ tin bot đã nhận, không tải lịch sử. Khởi động lại làm mất cache; tin hết hạn/thu hồi/không hỗ trợ cần mô tả tối thiểu hoặc tin gốc mới hợp lệ, không đoán từ quote preview.

Không chạy `npm start`, `listener.mjs`, `test-typing.mjs` trong QA. Việc dừng/khởi động bot, dùng đăng nhập/session hiện có và thử trên nhóm thật phải do người vận hành thực hiện sau phê duyệt; tài liệu này không giả định tên Windows service, PM2 hoặc Task Scheduler.

## Rollback

Ưu tiên SHA và cấu hình đã ghi nhận trước triển khai. Baseline main trước chương trình V13.2 là `1a33422e34beb25747238c24214097de4465e5c1`. Sau khi dừng tiến trình bằng cơ chế vận hành thực tế đã được phê duyệt, kiểm tra checkout sạch và chuyển lại commit đã ghi nhận:

```powershell
git switch --detach 1a33422e34beb25747238c24214097de4465e5c1
npm ci
npm test
```

Khôi phục cấu hình cờ trước đó trong nơi quản lý tiến trình và chỉ khởi động lại theo phê duyệt vận hành. Không dùng `git clean` hoặc reset phá hủy dữ liệu/session. Không khẳng định rollback chỉ bằng tắt13/bật12: hai cờ chọn cùng mã expert đã cập nhật. Chọn V11 bằng cờ chỉ đổi module expert, không khôi phục toàn bộ listener/intent/shared code. Không có migration dữ liệu/cập nhật credentials trong PR này.
