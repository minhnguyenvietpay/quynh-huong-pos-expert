# Tự động hóa QA và cải tiến có kiểm soát

Các lịch GitHub Actions chỉ hoạt động sau khi workflow được merge vào nhánh mặc định và Actions được bật. Chưa chạy CI trên GitHub không đồng nghĩa CI đã đạt. GitHub có thể trì hoãn lịch chạy; đây không phải bộ định thời bảo đảm SLA.

| Workflow | Kích hoạt | Quyền |
| --- | --- | --- |
| `offline-qa.yml` | PR, push main, mỗi 6 giờ (00:17, 06:17, 12:17, 18:17 UTC), thủ công | đọc repository |
| `knowledge-review.yml` | mỗi ngày 02:23 UTC, thủ công | đọc repository |
| `weekly-summary.yml` | thứ Hai 03:41 UTC, thủ công | đọc repository |
| `autonomous-coding.yml` | chỉ thủ công và được quản trị viên bật rõ ràng | ghi nhánh, tạo PR |

Lịch QA tương ứng 07:17, 13:17, 19:17, 01:17 giờ Việt Nam. Knowledge chạy 09:23; tổng hợp tuần chạy thứ Hai 10:41. Các workflow có concurrency và timeout. QA chạy Node 22 và 24, không khởi động listener, không gọi Zalo, không dùng session hoặc dữ liệu khách hàng. Không upload báo cáo thô. Tổng hợp tuần chỉ đưa số lượng vào job summary; không có hội thoại, đường dẫn vi phạm hay nội dung knowledge.

## Phạm vi kết quả

`quality-report.cjs` kiểm tra phản hồi tổng hợp có version; không thay thế người đánh giá độc lập. Trạng thái gate độc lập vẫn bị chặn khi chưa có dữ liệu đã duyệt. Tổng hợp tuần hiện là ảnh chụp tại lần chạy, không phải lịch sử cải thiện bảy ngày: không cộng dồn các lần chạy hoặc tuyên bố xu hướng khi chưa có kho số liệu đáng tin cậy. Thiếu báo cáo hoặc kiểm tra thất bại làm job thất bại; số liệu thiếu giữ `null`, không coi là thành công.

Chạy tại máy: `npm test`, `node scripts/knowledge-report.cjs`, `node scripts/security-check.cjs`; tạo `qa-reports/quality.json` bằng `node scripts/quality-report.cjs --output qa-reports/quality.json`. Lưu security JSON vào `qa-reports/security.json`, rồi `node scripts/weekly-summary.cjs` để xem số tổng hợp. Báo cáo cục bộ bị ignore; không đưa vào Git.

## AI coding runner (opt-in)

Workflow coding chỉ chạy `workflow_dispatch` khi repository variable `QH_ENABLE_AI_RUNNER` có giá trị `true`, `QH_AGENT_MODEL`, `QH_AGENT_CONTAINER_IMAGE` được chỉ định và secret `QH_AGENT_API_KEY` đã cấu hình trong GitHub Settings. Không đưa secret vào chat, repository hay artifact. Chỉ dùng API coding; không sử dụng đăng nhập consumer để chạy tự động. Runner mặc định tắt và yêu cầu Docker trước khi gọi API có tính phí. `QH_AGENT_CONTAINER_IMAGE` phải là image công khai, đáng tin cậy, được duyệt và ghim bằng `image@sha256:<64 ký tự hex>`. Image phải có Node 22 trở lên, Git, Codex CLI đúng phiên bản `0.163.0` và hỗ trợ sandbox của Codex; workflow pull đúng digest, không đăng nhập registry và không cài CLI toàn cục trên host. Chưa có image sản xuất đã build/kiểm chứng: **REQUIRES CONFIGURATION**; việc build image và gọi provider thật chưa được xác minh. Không dùng digest giả làm bằng chứng hoạt động. Xem cấu hình `config/automation.example.json` và runner để biết điều kiện kiểm chứng đầu ra.

Không cấp Zalo credential cho workflow. Không tự merge, triển khai hoặc sửa tích hợp Zalo live. Thay đổi chỉ được đề xuất qua nhánh/PR và cần người duyệt. PR bên ngoài không được tiếp cận token ghi hoặc API key; workflow coding không có trigger PR hoặc lịch tự động. Chi phí API chỉ phát sinh khi quản trị viên bật và chạy thủ công. Có thể tắt ngay bằng cách bỏ `QH_ENABLE_AI_RUNNER` hoặc chuyển thành `false`.

Runner chỉ mount checkout ứng viên vào container; không mount thư mục home, credential hoặc Docker socket của host. API key chuyên dụng chỉ được truyền vào môi trường container AI; GitHub token dành cho tiến trình điều phối tạo PR, không cấp cho AI. Các test gate chạy trong container `--network none`, không có API key. Container AI cần mạng cho provider; đây không phải cơ chế giới hạn egress theo domain. Shell networking bị tắt qua sandbox Codex, nhưng kết nối mạng của container provider không được mô tả như allowlist cấp firewall. Chỉ bật sau khi image và sandbox đã được kiểm chứng trong hạ tầng thực.

Lịch sử chống lặp được restore/save bằng GitHub Actions cache, chỉ với `qa-reports/improvement/history.jsonl` (ID an toàn, outcome và commit ref/số đo); không cache patch hay báo cáo thô. Save chạy cả khi ứng viên bị từ chối hoặc runner lỗi; concurrency ngăn hai lượt coding chồng nhau. Cache là lưu trữ best effort: xóa/evict cache hoặc giới hạn phạm vi nhánh có thể làm mất lịch sử và cho phép thử lại. Đây chưa phải sổ kiểm toán bền vững; môi trường sản xuất cần kho lịch sử ngoài CI và chính sách retention riêng.

### Chuẩn bị image riêng

Dockerfile mẫu: `containers/Dockerfile.agent`. Build không dùng credential và chỉ gửi thư mục `containers/` làm build context:

```sh
docker build --file containers/Dockerfile.agent --tag YOUR_TRUSTED_IMAGE:reviewed containers/
```

Đơn vị vận hành cần review bản build, kiểm tra Node/Git/Codex và khả năng sandbox trên runner thật, sau đó phát hành image theo quy trình registry của mình. Lấy digest thực của image đã phát hành và đặt `QH_AGENT_CONTAINER_IMAGE=YOUR_TRUSTED_IMAGE@sha256:ACTUAL_DIGEST` trong GitHub repository variables. Mẫu trên không phải image/digest đã được xác minh. Không gắn Docker socket, host credential/session hay thư mục home vào container. Docker được phát hiện trong máy hiện tại nhưng chưa build/chạy image này; chưa gọi provider bằng API key.
