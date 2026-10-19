# Review, cập nhật và rollback V13 trên Windows

Các bước này không phải phê duyệt triển khai. Codex chỉ chạy môi trường offline Linux và GitHub Actions; chưa trực tiếp xác minh Windows hoặc Zalo production. Không cần OpenAI/API AI key. Không chạy script tạo QR/session hoặc gửi thử nhóm thật để kiểm tra bản nâng cấp.

## Chuẩn bị bản review

Dùng PowerShell, Git và Node22 hoặc24. Vào thư mục repository thực của mình; không chép token/session hay log khách hàng vào repo hoặc PR. Kiểm tra thay đổi cục bộ trước khi chuyển branch; nếu có file chưa lưu, bảo toàn chúng theo quy trình riêng, không dùng reset --hard hoặc git clean.

```powershell
Set-Location 'C:\duong-dan-thuc-te\quynh-huong-pos-expert'
git status --short
node --version
npm --version
git fetch origin
git switch --track origin/feat/v13-merchant-conversation
npm ci
npm test
npm run qa:v13
```

Nếu branch đã tồn tại cục bộ, dùng `git switch feat/v13-merchant-conversation` rồi chỉ fast-forward khi working tree sạch. `npm ci` cài từ lockfile, không sửa package/lock để vượt lỗi. Giữ kiểm tra TLS/chữ ký mặc định. Không đưa production credentials vào môi trường test.

Chạy các script QA bổ sung theo báo cáo V13 trong repository. Cổng quality độc lập vẫn BLOCKED nếu chưa có OPS/domain ground truth; kết quả synthetic PASS không thay thế bước duyệt nghiệp vụ.

## Trước khi cập nhật bot thật

Cần người có quyền duyệt PR/commit, phạm vi bật engine và kế hoạch rollback. Ghi commit đang triển khai bằng `git rev-parse HEAD`, tên service/process đang quản lý bot và cờ phiên bản không nhạy cảm. Kiểm thử staging bằng tài khoản/nhóm được phép; không thử trực tiếp với merchant thật.

Không đoán lệnh restart, tên Windows service, đường dẫn máy chủ hoặc cách quản lý tiến trình. Dừng/khởi động bằng quy trình đang được chủ hệ thống phê duyệt. Restart xóa context RAM; consent của phiên trước không được tự tái sử dụng để gửi lại ticket. Không thay session/authentication Zalo khi chỉ đổi mã nguồn.

Sau khi PR đã được duyệt/merge, fetch lại và chọn đúng commit đã duyệt. Đừng chạy git pull main với kỳ vọng có V13 khi PR chưa merge. V13 dùng lại chính engine expert hiện có, không có module AI/API riêng. Sau phê duyệt, cấu hình trong tiến trình/service thực theo cơ chế hiện hữu:

```powershell
$env:QH_V13_ENABLED = 'true'
$env:QH_V12_ENABLED = 'false'
$env:QH_V11_ENABLED = 'false'
```

Các lệnh trên chỉ đổi môi trường PowerShell hiện tại và tiến trình con khởi động sau đó, không tự cập nhật một Windows service đang chạy. Không tự restart bằng lệnh đoán. Chạy `npm test` hoặc `npm run qa:v13` vẫn đặt baseline test riêng; muốn kiểm tra bộ56 cũ qua cờ V13 trong shell test đã được phép, chạy `node scripts/v11-evaluate.cjs --fail-on-regression` với các cờ trên. Đây là compatibility test, không gọi Zalo. Không tự thêm API key. Không lưu cấu hình bí mật vào Git.

## Rollback

Dừng rollout khi có bịa trạng thái tiền, yêu cầu MID/TID/thông tin bí mật, chuyển OPS thiếu consent, lẫn phiên, lỗi listener hoặc phản hồi hồi quy nghiêm trọng. Đưa mã về commit deployment đã ghi trước cập nhật bằng quy trình Git/deployment được duyệt; bảo toàn file cấu hình ngoài Git và mọi thay đổi cục bộ. Baseline của công việc V13 là `eefe2242975e82e06a306cc0ad69e0b49fa3aec5` (main đã chứa V12.2), không nhất thiết là commit đang chạy trên máy Windows của người dùng.

`QH_V13_ENABLED` và `QH_V12_ENABLED` là hai cờ vào cùng engine mới ở commit V13. Vì vậy, tắt cờ13 rồi bật cờ12 **không** khôi phục mã V12.2 cũ. Muốn rollback toàn bộ V12.2 phải khôi phục commit baseline/deployment cũ và cấu hình cờ cũ đã ghi nhận; baseline eefe224 không có cờ13, nên dùng cờ12 cho expert V12.2 khi được duyệt. Muốn chọn engine V11 ở commit hiện tại thì tắt cả13/12 và bật11; logic xã giao dùng chung vẫn thuộc commit hiện tại.

Cờ fallback chỉ bảo vệ đường module, không thể tự phát hiện mọi câu trả lời sai về nghiệp vụ. Nếu lỗi nằm ở logic xã giao dùng chung, cần rollback commit, không chỉ tắt cờ expert. Sau rollback, kiểm tra offline/staging và dữ liệu tổng hợp; không phát lại ticket hoặc yêu cầu khách gửi thông tin nhạy cảm.
