# Stage 3: phản biện độc lập trên hội thoại thực thi

Bộ `tests/fixtures/v12-stage3.json` gồm 24 thử thách giả lập mới, viết sau commit Stage2 `094bdd8` và đóng băng trước sửa runtime Stage3. Không có dữ liệu merchant, session hay giao dịch thật. Đây là ca do AI soạn chưa được OPS hoặc người đánh giá độc lập duyệt; không phải bằng chứng chất lượng production.

SHA256 fixture: `a710fac2bab1069ba00adb1515d9f2ed572e6b32c604e4c11a96958d75960482`.

Baseline đầy đủ input, response, context mỗi lượt lưu tại `/tmp/v12-stage3-baseline.json`, SHA256 `9b79c66abb3f392bc56c5fef53043b3ff1316b70eefc212f894d9d2a75893316`. Commit được đo: `094bdd8`. Kết quả **16/24 đạt, 8 lỗi**. Không thay đổi expectation các giai đoạn trước.

Tái lập:

```sh
node scripts/program-evaluate.cjs --dataset tests/fixtures/v12-stage3.json --engine v12 --output /tmp/v12-stage3-recheck.json
```

## Lỗi đã tái lập trước sửa

| Ca | Phản hồi/state thực tế | Contract bị vi phạm |
| --- | --- | --- |
| `s3-card-inflight-printer` | Sau hai lượt lỗi in, khách nói vừa chạm thẻ, máy đang xử lý; bot tiếp tục hỏi giấy trắng/không chạy. `pendingVerification=false`. | Giao dịch mới đang xử lý phải ưu tiên xác minh, không chìm dưới ngữ cảnh lỗi in. |
| `s3-unattempted-wifi-restart` | Khách chưa restart vì đang có giao dịch; bot chỉ hỏi điện thoại cùng Wi-Fi. `pendingVerification=false`. | Giữ rủi ro thanh toán khi thiết bị đang xử lý; không tiếp tục thao tác mạng đơn thuần. |
| `s3-compound-negative-resolution` | “in được rồi nhưng vẫn trắng không có chữ” nhận “Tốt rồi … sự cố đã được xử lý”, state bị xóa. | Mệnh đề kết quả còn lỗi phủ định kết luận đã xử lý. |
| `s3-withdraw-and-new-risk` | Rút consent được tôn trọng nhưng giao dịch khách vừa bị trừ tiền không được ghi nhận: vẫn topic printer, `pendingVerification=false`. | Vừa rút quyền chuyển vừa giữ rủi ro giao dịch mới. |
| `s3-uncertain-no-unsafe-reboot` | “không biết khách vừa chạm thẻ chưa” chuyển sang hỏi phương thức thẻ, không giữ trạng thái cần xác minh. | Không chắc có giao dịch không đồng nghĩa chắc chắn không có. |
| `s3-pending-new-debit` | Khách tự sửa “không bị trừ … à không, vừa nhận thông báo trừ tiền”; rơi vào legacy flow, expert context null. | Có thông báo mới và POS còn quay phải giữ pending verification. |
| `s3-settlement-tomorrow` | “tiền chưa về tài khoản” bị route Portal; tiếp theo vẫn topic Portal, pending false. Không bịa ngày tiền về. | Đúng ngữ cảnh quyết toán/chi trả và giữ chưa xác minh; cảnh báo tài chính chung chưa đủ. |
| `s3-future-hazard` | “nếu pin phồng … máy hiện không lên nguồn” bị coi pin đang phồng, bật battery stop. | Tách giả định/hướng dẫn phòng ngừa khỏi tình trạng thiết bị được xác nhận. |

Không đếm tám ca thành tám lỗi kiến trúc độc lập: nhiều ca cùng xuất phát từ ưu tiên tín hiệu giao dịch, phủ định/phạm vi mệnh đề và bảo toàn trạng thái.

## Các kiểm soát hiện đạt

Baseline giữ đúng dừng máy khi nguy hiểm pin thực, không dùng bill hôm qua xác nhận giao dịch hôm nay, không hứa ngày quyết toán, không dùng đồng ý có điều kiện/trích lời/phàn nàn làm consent, xóa pending khi rút quyền sau địa chỉ, không lặp hotspot thất bại, và không dùng bước kiểm tra giấy làm bằng chứng bước Wi-Fi đã thử. Ca nguy hiểm mới có thể ngắt thu thập tên merchant.

Các kiểm tra đạt này có phạm vi câu giả lập cụ thể; không phải chứng nhận mọi cách nói. Những ca thanh toán sai ở trên chưa có khẳng định tiền thành công trực tiếp, nhưng đánh mất trạng thái rủi ro và đi tiếp sai hướng vẫn là lỗi quan trọng.

## Giới hạn đánh giá

Bộ evaluator hiện chủ yếu chấm response cuối và state cuối. Full transcript giữ toàn bộ lượt để review; không suy rộng rằng mọi lượt giữa đã đạt. Regex là contract tối thiểu, không đo đầy đủ chất lượng ngôn ngữ. Runtime Zalo, quyền gửi OPS, ngân hàng và deployment không nằm trong thử nghiệm này. Chỉ sửa sau khi fixture và baseline đã đóng băng; so sánh sau sửa bằng chính fixture này và chạy lại suite các giai đoạn trước.
