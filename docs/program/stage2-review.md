# Stage 2 — independent development review of V12

Reviewer role: Knowledge Expert; did not author Stage1. This is a separate AI development review, **not independent external merchant/OPS acceptance**. All inputs and store names are synthetic; no customer records, credentials, sessions, live Zalo calls, transaction-system access or deployment.

Frozen dataset: `tests/fixtures/v12-stage2.json`, version `v12-stage2.0.0`. SHA-256: `887acf70b14cbef65fe6f38fbddee0c469f2bdf751e45d855d2f79fe074dba1e`. Baseline commit: `81a4a3047124d0094f324db9b1970cbebefd241f`. Assertions frozen before Stage2 runtime fixes. Do not change them to fit responses.

Command: `node scripts/program-evaluate.cjs --dataset tests/fixtures/v12-stage2.json --engine v12 --output /tmp/stage2-baseline.json`. Exit1 is expected for failed contracts. Baseline: **0/20 passed; 20/20 failed**. This deliberately selected challenge set measures 20 consequential remaining response weaknesses, not a representative production accuracy rate. Some weaknesses share mechanisms (success after attempt, first-turn known-answer handling); scenario count is not a claim of20 independent bugs.

Each contract checks actual final processMessage output, plus selected context/consent state. Global evaluator checks every turn for MID/TID requests and unsupported claims. State escalation=true can mean consent collection offered, not an actual dispatched OPS message; only the resume scenario demonstrates unintended name collection. Regex checks cannot establish comprehensive semantic correctness. Definitions must remain general and acknowledge uncertainty; no fixture authorizes transaction/status claims, timelines, fees, financial operations or unverified source promotion. No current official operating manuals were independently validated here.

## Frozen failures and causes

### s2-resume-not-consent

Priority: high. Category: consent. Mechanism: `resumed-question-consent-confusion`.

Có trả lời câu hỏi tiếp tục vấn đề cũ, không phải đồng ý chuyển OPS.

Inputs: ["khách bị trừ tiền","không thấy","máy không in bill","in được rồi","có"]

Failed contracts: `required_response_0`, `forbidden_response_0`, `state_escalation`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Dạ anh, em sẽ chuẩn bị yêu cầu chuyển CS/OPS. Anh cho em xin tên cửa hàng nhé.

Observed cause: Khôi phục frame currentQuestion=offer-consent nhưng câu hỏi hiển thị là tiếp tục vấn đề cũ. “có” được hiểu nhầm là consent OPS.

### s2-printer-recovered-after-attempt

Priority: medium. Category: printer. Mechanism: `attempt-success-misclassified-failure`.

Bước đã thử kèm kết quả thành công không chứng minh lỗi còn.

Inputs: ["máy không in bill","đã kiểm tra giấy xong và in được rồi"]

Failed contracts: `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em ghi nhận bước kiểm tra giấy/nắp đã thực hiện nhưng lỗi còn; cần hỗ trợ bộ phận in, không làm lại bước đó. Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?

Observed cause: nextDiagnostic printer coi relevantAttempt luôn là thất bại; explicitResolved chỉ khớp câu ngắn toàn chuỗi, bỏ qua kết quả thành công trong câu dài.

### s2-network-recovered-after-attempt

Priority: medium. Category: network. Mechanism: `network-attempt-success-misclassified`.

Kết nối phục hồi sau đổi mạng cần ghi nhận phục hồi, không báo thất bại.

Inputs: ["máy mất mạng Wi-Fi","đã thử mạng khác rồi, POS kết nối được rồi"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Kết nối vẫn lỗi sau thao tác vừa báo; không quên mạng hoặc khởi động lại lần nữa. Cần phân biệt dịch vụ SIM/4G và lỗi mạng Wi-Fi/POS. Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?

Observed cause: nextDiagnostic network ưu tiên relevantAttempt rồi luôn nói vẫn lỗi; không đối chiếu kết quả hiện tại đã kết nối.

### s2-phone-pos-subjects

Priority: medium. Category: network. Mechanism: `phone-pos-negation-scope`.

Không áp dụng phủ định của POS sang kết quả điện thoại.

Inputs: ["máy mất mạng Wi-Fi","điện thoại vào được nhưng POS không vào được"]

Failed contracts: `forbidden_response_0`, `state_context.knownAnswers.phoneWifi`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Điện thoại cùng Wi-Fi cũng mất mạng thì ưu tiên kiểm tra đường truyền chung/bộ phát (router), không quy ngay lỗi POS. Kiểm tra đèn kết nối của bộ phát hoặc kênh mạng nội bộ được phép; chưa thanh toán lại khi giao dịch chưa rõ kết quả.

Observed cause: capture phoneWifi tìm phủ định trên toàn câu có điện thoại, nên phủ định POS bị gán cho điện thoại.

### s2-no-more-consent-prompts

Priority: high. Category: consent. Mechanism: `natural-language-escalation-refusal`.

Tôn trọng từ chối rõ ràng và cung cấp kiểm tra an toàn thay vì lặp xin consent.

Inputs: ["khách bị trừ tiền","không thấy","đừng hỏi chuyển OPS nữa, hướng dẫn tôi tự kiểm tra"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em đã ghi nhận bước vừa thử; không yêu cầu lặp lại. Anh/chị đồng ý để em chuẩn bị yêu cầu CS/OPS kiểm tra không ạ?

Observed cause: Mẫu refusal không nhận “đừng hỏi chuyển”; nhánh offer-consent dùng lời mặc định tưởng tượng đã thử bước và hỏi lại.

### s2-address-refusal-not-address

Priority: high. Category: consent. Mechanism: `handover-refusal-treated-as-location`.

Không lưu câu từ chối như địa chỉ và không hoàn thành yêu cầu với dữ liệu đó.

Inputs: ["khách bị trừ tiền","không thấy","đồng ý","Cửa hàng Tổng hợp Minh chứng","địa chỉ chưa muốn cung cấp"]

Failed contracts: `forbidden_response_0`, `state_pending`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em đã chuẩn bị yêu cầu hỗ trợ:
> 
> 🏪 Cửa hàng: Cửa hàng Tổng hợp Minh chứng
> 📍 Địa chỉ/chi nhánh: địa chỉ chưa muốn cung cấp
> 🔧 Sự cố: giao dịch chưa xác minh; đã thử hướng dẫn hoặc cần xác minh, khách đồng ý chuyển hỗ trợ
> 
> Em sẽ thông báo cho nhân viên hỗ trợ trong nhóm nếu xác định được đúng tài khoản Zalo của họ. Nếu không thể tag, em sẽ thông báo rõ để anh/chị liên hệ CS/OPS. Gõ “xong” để kết thúc.

Observed cause: escalationReply nhận mọi chuỗi dài làm địa chỉ, không phát hiện merchant từ chối trường dữ liệu; tạo pending handover chứa câu từ chối.

### s2-refusal-retains-payment

Priority: high. Category: context. Mechanism: `consent-withdrawal-erases-payment-context`.

Từ chối chuyển OPS không có nghĩa xóa sự cố giao dịch đang cần tự kiểm tra.

Inputs: ["khách bị trừ tiền","không thấy","không đồng ý chuyển OPS","kiểm tra lịch sử ở đâu"]

Failed contracts: `required_response_0`, `forbidden_response_0`, `state_escalation`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em chưa thể xử lý chắc chắn trường hợp này bằng hướng dẫn hiện có. Anh/chị có muốn em chuẩn bị yêu cầu để chuyển CS/OPS của Vietpay không ạ? Trả lời “có” hoặc “không”.

Observed cause: Guard withdrawal ở dialogue xóa toàn bộ engine context; follow-up kiểm tra lịch sử rơi xuống generic fallback mở lại đề nghị OPS.

### s2-double-debit-priority

Priority: high. Category: payment. Mechanism: `double-debit-hidden-by-generic-debit`.

Cần phân biệt hai lần thu thực tế với thông báo trùng, không kết luận tiền đã thu.

Inputs: ["khách bị trừ tiền hai lần cho một đơn hàng"]

Failed contracts: `required_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Thông báo trừ tiền hoặc chuyển khoản chưa đủ để xác nhận kết quả giao dịch. Chưa yêu cầu khách thanh toán lại khi chưa xác minh kết quả trên POS/Portal. Kiểm tra lịch sử POS/Portal đúng thời điểm và số tiền. Giao dịch có hiển thị không ạ?

Observed cause: NLU debit và duplicate cùng điểm; thứ tự rule debit thắng nên mất chẩn đoán đếm giao dịch.

### s2-settlement-not-missing-sale

Priority: medium. Category: settlement. Mechanism: `settlement-shortfall-hidden-by-missing`.

Thiếu tiền đối soát cần đối chiếu kỳ/chi trả, không tự suy rằng mất bản ghi giao dịch.

Inputs: ["đối soát thiếu tiền","chỉ một giao dịch ở chi nhánh A, cả kỳ còn lại đã đủ"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Chưa thấy hoặc chưa xác định được giao dịch thì cần tra soát, không suy ra đã thành công/thất bại và chưa thu tiền lại. Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?

Observed cause: NLU missing thắng settlement khi đồng điểm và mở payment-history; câu trả lời chi nhánh/kỳ không sửa loại sự cố.

### s2-card-method-retained

Priority: medium. Category: card. Mechanism: `card-method-answer-not-remembered`.

Đã biết phương thức chip; phản hồi mã lỗi cần dùng ngữ cảnh thay vì hỏi phương thức lại.

Inputs: ["máy không đọc thẻ","cắm chip","máy hiện mã 05"]

Failed contracts: `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Mình đang phân biệt quẹt từ, cắm chip và chạm thẻ; cho em biết phương thức cùng thông báo lỗi, không gửi số thẻ/PIN nhé.

Observed cause: knownAnswers không lưu phương thức chip; nextDiagnostic card chỉ nhìn câu hiện tại nên mã05 làm hỏi lại phương thức.

### s2-qr-uncreated-known-first-turn

Priority: medium. Category: qr. Mechanism: `known-initial-qr-stage-ignored`.

Merchant đã nói rõ chưa tạo được mã; cần bước mạng/ứng dụng thay vì hỏi lại giai đoạn.

Inputs: ["máy không tạo được mã QR"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> QR đang lỗi ở bước không hiện mã hay khách đã quét nhưng POS chưa báo kết quả? Nếu đã quét, kiểm tra lịch sử POS/Portal trước; chưa yêu cầu khách quét hoặc thanh toán lại.

Observed cause: first qr hỏi giai đoạn cố định; bước nextDiagnostic có xử lý không tạo mã nhưng không dùng ở lượt đầu.

### s2-charge-indicator-known-first-turn

Priority: medium. Category: power. Mechanism: `known-initial-charge-indicator-ignored`.

Thông tin biểu tượng pin có trong câu đầu, không hỏi lại cùng thông tin.

Inputs: ["máy không lên nguồn nhưng cắm sạc có biểu tượng pin"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Máy không lên nguồn hoặc sạc không vào: nếu không nóng bất thường/phồng pin, kiểm tra cáp, bộ sạc tương thích và ổ điện. Khi cắm sạc có đèn hoặc biểu tượng pin không ạ? Không tự tháo máy.

Observed cause: first power hỏi biểu tượng sạc cố định; xử lý biểu tượng đã có chỉ ở follow-up.

### s2-processing-card-prioritized

Priority: high. Category: payment. Mechanism: `initial-processing-card-lacks-verification`.

Giao dịch đang xử lý phải kích hoạt kiểm tra giao dịch thay vì chẩn đoán phương thức đọc thẻ.

Inputs: ["POS đang processing sau khi cắm chip, khách đang chờ"]

Failed contracts: `forbidden_response_0`, `state_context.pendingVerification`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Thẻ không nhận ở thao tác chạm, cắm chip hay quẹt từ ạ? Kiểm tra thông báo màn hình theo hướng dẫn của dòng máy, không gửi số thẻ/PIN. Nếu đã xử lý giao dịch, chưa thử thu tiền lại khi chưa xác minh kết quả.

Observed cause: first card không ưu tiên inFlight như freeze; pendingVerification vẫn false và hỏi lại phương thức đã nêu.

### s2-portal-login-not-filters

Priority: medium. Category: portal. Mechanism: `portal-login-routed-to-report-filters`.

Không truy cập Portal khác với thiếu giao dịch trên báo cáo; không xin mật khẩu/OTP.

Inputs: ["không đăng nhập được Merchant Portal"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Với Merchant Portal, kiểm tra bộ lọc ngày và chi nhánh/nguồn POS-QR đúng giao dịch đang xem. Giao dịch tương ứng có trên lịch sử POS không ạ? Thiếu trên Portal chưa chứng minh giao dịch thất bại.

Observed cause: Một topic portal dùng câu trả lời cố định về báo cáo; không tách quyền truy cập/đăng nhập khỏi bộ lọc giao dịch.

### s2-reprint-copy-not-hardware

Priority: medium. Category: printer. Mechanism: `receipt-copy-routed-to-print-failure`.

Yêu cầu bản sao hóa đơn không đồng nghĩa lỗi giấy, không thực hiện thu tiền lần nữa.

Inputs: ["giao dịch POS thành công nhưng chỉ in một bill, cần in lại bản sao"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Máy không in bill: kiểm tra giấy nhiệt đúng chiều và nắp máy đã đóng kín. Giấy không chạy ra hay chạy ra nhưng trắng ạ? Không thu tiền lại chỉ vì chưa in được hóa đơn.

Observed cause: printer không phân biệt ý định in bản sao với lỗi in; first trả giấy/nắp và hỏi trắng/kẹt.

### s2-reported-pending-not-absent

Priority: high. Category: payment. Mechanism: `reported-pending-called-not-found`.

Ghi nhận trạng thái merchant báo pending mà không xác nhận kết quả từ hệ thống.

Inputs: ["khách bị trừ tiền","POS báo pending cùng số tiền và thời điểm"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Chưa thấy hoặc chưa xác định được giao dịch thì cần tra soát, không suy ra đã thành công/thất bại và chưa thu tiền lại. Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?

Observed cause: financial follow-up không nhận reported pending, rơi xuống chưa thấy; facts.inFlight có nhưng lời đáp không dùng.

### s2-withdraw-void-new-printer

Priority: high. Category: context. Mechanism: `negated-void-hides-new-topic`.

Ý định hủy bị phủ định; xử lý sự cố máy in mới mà không đề nghị chuyển nghiệp vụ hủy.

Inputs: ["muốn hủy giao dịch","không hủy giao dịch nữa, máy không in bill"]

Failed contracts: `required_response_0`, `forbidden_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Hủy (Void), hoàn tiền (Refund) và đảo giao dịch (Reversal) là các nghiệp vụ khác nhau; quyền thao tác phụ thuộc trạng thái thực tế và đơn vị xử lý. Em chưa có dữ liệu để xác nhận tiền đã hoàn/đã chi trả hay cam kết thời gian tiền về; cần kiểm tra trạng thái và đối chiếu POS/Portal. Anh/chị đồng ý để em chuẩn bị yêu cầu chuyển CS/OPS kiểm tra không ạ?

Observed cause: Intent void không loại mệnh đề “không hủy nữa”; ưu tiên tài chính ngăn chuyển printer.

### s2-authorization-capture-explanation

Priority: medium. Category: payment-literacy. Mechanism: `authorization-capture-not-explained`.

Câu hỏi kiến thức cần phân biệt phê duyệt/ủy quyền với bước ghi nhận/thu tiền; không mở luồng thu thông tin cửa hàng.

Inputs: ["authorization khác capture thế nào"]

Failed contracts: `required_response_0`, `state_escalation`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em chưa thể xử lý chắc chắn trường hợp này bằng hướng dẫn hiện có. Anh/chị có muốn em chuẩn bị yêu cầu để chuyển CS/OPS của Vietpay không ạ? Trả lời “có” hoặc “không”.

Observed cause: Không có định nghĩa bounded authorization/capture, fallback đề nghị OPS dù câu hỏi kiến thức.

### s2-dispute-safe-guidance

Priority: medium. Category: dispute. Mechanism: `dispute-intent-generic-fallback`.

Cần nhận diện tranh chấp giao dịch và hướng dẫn kênh chính thức an toàn, không đảm bảo kết quả.

Inputs: ["khách nói không thực hiện giao dịch và muốn khiếu nại chargeback"]

Failed contracts: `required_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Em chưa thể xử lý chắc chắn trường hợp này bằng hướng dẫn hiện có. Anh/chị có muốn em chuẩn bị yêu cầu để chuyển CS/OPS của Vietpay không ạ? Trả lời “có” hoặc “không”.

Observed cause: Không có intent dispute/chargeback nên chỉ generic escalation thay vì nhận diện tra soát/khiếu nại an toàn.

### s2-payout-substantive-definition

Priority: medium. Category: payment-literacy. Mechanism: `payout-defined-only-by-name`.

Cần giải thích chi trả cho đơn vị chấp nhận thanh toán, không chỉ lặp tên hoặc xác nhận tiền đã về.

Inputs: ["payout là gì"]

Failed contracts: `required_response_0`. The numbered required/forbidden checks correspond to zero-based `must`/`mustNot` entries in the frozen JSON; state checks compare the last-turn runtime state.

Actual final response (verbatim synthetic baseline):

> Quyết toán (settlement) và chi trả (payout) cần phân biệt với trạng thái giao dịch. Báo cáo phải được đối chiếu với dữ liệu thực tế; em không xác nhận tiền đã về hay hẹn thời gian chỉ từ tên trạng thái.

Observed cause: definition settlement/payout chỉ nói cần phân biệt, không giải thích payout là chi trả cho đơn vị chấp nhận thanh toán.

## Review boundaries

Baseline output is frozen by the recorded fixture hash and commit; runtime workers use isolated temporary state/events/ticket paths and remove them afterward. Full multi-turn synthetic evidence may be reproduced from the commit using the command above. The frozen fixture includes both positive and prohibited behavior; retain safety constraints and test Stage1 for regressions after fixes. New security cases discovered after this freeze belong in separate tests, including “không gửi nữa” during address collection. Final remediation must report unchanged hash, before/after exact case results, broader tests and remaining review/deployment restrictions.
