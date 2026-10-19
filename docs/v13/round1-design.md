# V13 round 1: conversation design audit

Role executed: Conversation Designer. Read-only audit of runtime; no listener run, transport call, real messages, customer data or runtime changes. Evidence below is synthetic offline `processMessage` execution in fresh temporary state files, both default flags and `QH_V12_ENABLED=true`.

## Reproduced problem and causal chain

1. `listener.mjs` computes `ongoing` from diagnostic/OPS state, then `detect(...,{ongoing,explicit})`. An ongoing conversation passes eligibility even for an otherwise unknown word. Direct addressing also passes. Standalone unaddressed `hiem` may instead be ignored before `processMessage`; offline response tests must not claim it was delivered by the listener.
2. `intent.js` `detect` recognizes introduction before generic intents, but its result governs eligibility only. It does not reorder response generation. `dialogue.js` `greetingOnly` matches bare `hi`, not `hi em` or `hiem`.
3. `dialogue.js` runs active expert engines and `escalationReply` before introduction, compliments and greetings. With flags disabled it runs the separate `v12-brain.js` coordinator before those social handlers. The two V12 implementations are distinct: default printer routing uses `v12-brain.js`, while opt-in uses `lib/v12/engine.cjs` with a V11 fallback. Tests must exercise both rather than infer production behavior from opt-in scores.
4. At OPS `consent`, `escalationReply` responds to an introduction with another consent prompt. At `name`, any text length 3–100 becomes the store name. At `address`, any text length >=5 becomes location and prepares a pending handover. There is no positive social interruption guard. At active diagnostic questions, opt-in engine can consume social as a generic answer first.
5. A new `hiem` reaches the default unknown fallback and creates an OPS consent flow. A later introduction is then trapped by that flow. Normalizing a word or testing classifier intent alone cannot repair this precedence bug.

## Actual before examples

Both default and opt-in: `/huy` → `hiem` produces “Em chưa thể xử lý chắc chắn ... chuyển CS/OPS ... có hoặc không”, and `hasEscalation=true`.

Default actual sequence:

`máy không in bill` → `đã kiểm tra giấy, vẫn không in` → `không đẩy giấy` → `đồng ý` → `hiem` → `em giới thiệu bản thân đi`.

The last two responses ask for location, then prepare a handover containing store name `hiem` and address `em giới thiệu bản thân đi`. This is direct evidence of social text being consumed as merchant fields. Opt-in reproduces the same corruption after its explicit consent path. No actual OPS message was sent in this test.

Default also rejects the longer legitimate `đồng ý chuyển OPS` in its printer coordinator, falling through to a new generic consent offer; opt-in accepts it. That is a separate consistency weakness, not the social bug itself.

## Minimal behavior design

Place a shared pure-social routing guard after input safety/session controls and before *any* name/address collector or diagnostic reply. Share normalized recognition with listener eligibility without changing login, send, credentials, group authorization or cooldown behavior.

- Recognize bounded pure greetings `hi`, `hi em`, `hiem`, `chào em`; an introduction asks what Quỳnh Hương can do. Do not globally split arbitrary joined Vietnamese words.
- Reply naturally and briefly: greeting “Dạ em đây ạ. Anh/chị cần hỗ trợ gì?”; introduction “Em là Quỳnh Hương, trợ lý hỗ trợ POS và thanh toán của Vietpay. Em hướng dẫn kiểm tra sự cố; trạng thái giao dịch cần đối chiếu trên POS/Portal.”
- Pure social text never acts as consent, store name, address, diagnostic attempt or resolution. It must not itself prepare handover, solicit store fields or repeat OPS consent.
- Recommended interruption semantics: retain unresolved incident/collection position without advancing it; explicit withdrawal or explicit topic reset cancels collection. Greeting alone is neither new consent nor withdrawal. Root/QA must lock the selected contract before implementation; a safe alternative is cancelling stale collection while independently retaining unresolved payment risk.
- If financial uncertainty remains, append “Giao dịch trước vẫn chưa rõ kết quả; mình chưa thu tiền lại nhé.” Do not infer that an unrelated greeting confirms payment or settlement success.
- Mixed messages such as `hi em, khách bị trừ tiền nhưng POS báo lỗi` must route to payment diagnostics, not be swallowed as a greeting. Explicit hardware danger also overrides social content.
- A real merchant field such as `Cửa hàng Giả Lập Xin Chào` stays a merchant field after consent; do not classify by broad `contains(chao)` checks.
- For a new unknown phrase, ask one short clarification rather than create an OPS request without a described incident.

## Review limits

These are synthetic behavioral reproductions and design recommendations, not merchant-tested UX or independently verified business accuracy. QA owns frozen per-turn assertions and simulator owns scenario inputs. Existing payment, consent and field-collection regressions must remain intact; preserve opt-out/fallback operation and assess default plus opt-in paths separately.
