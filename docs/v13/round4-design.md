# V13 round 4: practical merchant operations

Conversation Designer read-only audit after `2e1db67`. This round addresses ordinary use, Portal access/report scope, human support requests and receipt copies. No new operational authority, menu layout, fee, settlement schedule or credential handling is proposed.

## Runtime causes and gaps

`lib/v12/engine.cjs` `first(portal)` recognizes login/access only on the initial turn and otherwise asks about report filters. Its later `portal` branch always offers OPS. A bare no or “không thấy” marks `filters-check` failed and says filters were already checked, even if the user is still selecting a branch or cannot log in. This is a new Portal-specific reproduction, not a reason to reopen fixed printer logic.

The intent/engine stack has issue-oriented topics but no explicit ordinary operation request. “Cách nhận thanh toán thẻ” can fall through rather than provide a bounded safe overview or ask which operation is intended. Do not turn a supported ordinary-use question into an unknown incident or a consent offer.

Human requests and complaints are distinct speech acts. Explicitly asking to meet a support person expresses intent to seek human help; expressing frustration or saying an answer is unclear does not authorize disclosure or collection. `understanding.cjs` has explicit support-consent patterns, but the response layer needs a consistent route even without an existing `offer-consent` state. Never claim a person was contacted merely because a support request was prepared.

The receipt-copy shortcut answers before most diagnostic state handling and does not retain a finite receipt-copy purpose. A follow-up such as “không thấy chức năng in lại” can lose that purpose. Do not invent a button path to compensate. First ask/use correct device guide and granted permission; acknowledge when the available generic guidance ends.

## Concise response contracts

| Merchant purpose | Natural useful response | Boundary |
|---|---|---|
| Start ordinary card/QR collection | Clarify card versus QR when missing; use authorized device procedure, verify entered amount before customer confirmation and inspect displayed/history result. | No invented menus, bank acceptance rules, fees, bypass or test charge. Any prior uncertain payment takes priority before a new one. |
| Portal login failure | Ask the visible error category without credentials; use official Portal address/recovery supplied through existing authorized channels. | Do not invent a Portal URL, ask OTP/password/session or assert permission was granted. |
| Report has wrong date/source/branch/device | Acknowledge which scope is uncertain; ask one relevant scope question and guide checking available filters through authorized interface. | Do not say filters were tried when not reported; do not ask merchant to supply MID/TID. No invented exact device filter if unsupported. |
| No permission/access to another branch | Explain account permissions require the authorized administrator/support channel; keep lookup within granted scope. | No privilege workaround, credential sharing or claim a missing transaction is failed. |
| Explicit human support request | “Dạ, anh/chị muốn gặp nhân viên hỗ trợ. Em có thể chuẩn bị yêu cầu; em chưa gửi hay liên hệ nhân viên từ đây.” Follow the chosen explicit consent contract before store fields. | No silent handover, fake ticket success or delivery time. Match current issue rather than stale diagnostic topic. |
| Frustration or unclear answer | Briefly acknowledge; simplify into one step/question or ask which part was unclear. | No automatic OPS consent or personal-data collection. Do not scold or repeat the same long checklist. |
| Receipt copy/reprint | Find original entry in permitted POS history and use reprint/copy function only if model and rights support it; identify as a copy. | No new transaction/charge, no false certification of payment, no invented shortcut/menu. If unavailable, use authorized device support. |

Suggested tone: “Dạ, em nói ngắn lại nhé. Mình đang cần xem giao dịch thẻ hay QR trên Portal ạ?” instead of a repeated full OPS prompt. A failed login is not a failed payment. A missing report row is not proof of missing funds.

## State and review guidance

Keep bounded operational purposes separate from incident payment status: login, report scope, receipt copy and ordinary-use help. New factual details should refine the question; social interruption and explicit withdrawal retain prior safety guarantees. Receipt-copy help must not reset unresolved original-payment risk.

Simulator and QA should freeze initial and follow-up examples, default and opt-in behavior, explicit human request versus complaint, correct-scope report recovery, missing access, unavailable receipt function and ordinary operations after an unresolved payment. Expectations must be semantic and safety-specific, not exact verbose templates. Existing repository guidance supports only generic checks; independent merchant/manual validation is still absent.
