# zca-js: kiểm tra tương thích V13.2

Kiểm tra tĩnh gói đã cài: **zca-js 2.2.0**, `node_modules/zca-js/package.json:3`; lockfile `package-lock.json:367` khóa gói 2.2.0. Không đăng nhập, gọi mạng SDK hoặc gửi tin Zalo trong kiểm tra này. Các đường dẫn node_modules dưới đây là bằng chứng nguồn của phiên bản khóa, không phải tệp được đưa vào Git.

| Dữ liệu | Nguồn đã xác nhận |
|---|---|
| Tin hiện tại | `dist/models/Message.d.ts:15-25`: msgId, cliMsgId, uidFrom, idTo, content; content có thể là object, không mặc nhiên là văn bản |
| Nhóm | `dist/models/Message.js:17-26`: GroupMessage.threadId = data.idTo; data.uidFrom là người gửi hiện tại |
| Reply | `dist/models/Message.d.ts:49-63`: data.quote có ownerId, cliMsgId, globalMsgId, msg, ts; không có quote.messageId hoặc quote.senderId trong kiểu này |
| Người gửi gốc | quote.ownerId; constructor chuẩn hóa ownerId thành chuỗi (`Message.js:25-26`), không thay đổi msg |
| Mention | `Message.d.ts:51-69`: data.mentions = [{ uid, pos, len, type }]; kiểm tra uid so với tài khoản bot, không tin tên hiển thị |
| Bot ID | `dist/apis/getOwnId.js:2-3`: getOwnId() trả ctx.uid cục bộ |
| Thu hồi/xóa | `dist/apis/listen.d.ts:41`: sự kiện undo; `dist/models/Undo.d.ts`: threadId, isGroup, data.uidFrom và content.globalMsgId/cliMsgId/deleteMsg |
| Lịch sử nhóm | `dist/apis/getGroupChatHistory.d.ts:8`, `.js:14-32`: getGroupChatHistory(groupId,count=50), trả groupMsgs và thông tin more; không phải lookup một message ID |
| Lịch sử listener | `dist/apis/listen.d.ts:35,93`: requestOldMessages(threadType,lastMsgId), kết quả qua old_messages; không phải getMessageById |

## Giới hạn thiết kế

SDK có API lấy lịch sử; không được nói rằng SDK hoàn toàn không hỗ trợ lịch sử. Tuy nhiên các API đã kiểm tra không cung cấp lookup chính xác một ID với kiểm chứng nhóm/chủ sở hữu trong một lời gọi. V13.2 nên dùng cache RAM có giới hạn cho tin bot thực sự nhận được, không gọi lịch sử và không hứa phân tích tin cũ chưa nhận được.

ID msgId/cliMsgId của tin là chuỗi nhưng quote.globalMsgId/cliMsgId được khai báo number. Chỉ chuyển số nguyên an toàn sang chuỗi; từ chối number đã mất độ chính xác, không đoán ID. So khớp đủ nhóm + chủ sở hữu gốc + ID; khi cả hai ID được cung cấp phải khớp cùng một tin. Không chọn tin gần nhất để bù reference thiếu/sai. Quote.msg có thể chỉ là bản xem trước, không tự coi đó là toàn bộ nội dung hay dữ liệu đã kiểm chứng.

Cache phải giới hạn số tin, độ dài, TTL; chỉ RAM, không ghi log nội dung/ID; bỏ tin nhạy cảm; xóa tin và case liên quan khi nhận undo. Chỉ cache nhóm được phép, không cache nội dung khi bot tắt. Thiếu cache, tin bị xóa hoặc hết hạn: hỏi người dùng reply lại tin phù hợp, không khẳng định đã tra lịch sử. Thiếu mention bot được xác nhận: không kích hoạt đường phân tích case. Quyền staff lấy từ cấu hình ID đã xác minh và giới hạn nhóm hiện có, không từ văn phong.

Đây là kiểm tra hợp đồng SDK tĩnh và đề xuất thiết kế. Bằng chứng listener mock và giới hạn triển khai cuối cùng nằm trong báo cáo delivery; không suy ra tương thích Zalo trực tiếp hay xác nhận vận hành Windows từ tài liệu này.
