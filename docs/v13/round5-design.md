# V13 round 5: adversarial consistency and safety

Conversation Designer audit after `257e03e`. This final round targets state invariants and contradictory speech acts rather than increasing scenario totals. Runtime remains owned by Code Engineer; Simulator/QA freeze the new expectations independently of implementation.

## Concrete engine risks

### Nested unresolved payment

Topic interruption frames retain `topic`, `currentQuestion`, attempted/failed steps and `risk`, but omit `pendingVerification`. Switching hardware while an older financial incident exists sets pending on the active hardware. On resolution, however, restoring a hardware frame computes pending only from that frame's financial topic/high risk. A financial → printer → network sequence can restore printer with pending false even while its remaining interruption stack contains the unresolved financial frame. A social handler or later operational guide that reads only active pending may then omit the payment warning.

Financial safety is an independent unresolved obligation, not a property of only the currently discussed device. Restore must retain that obligation across two hardware interruptions and subsequent resolution, refusal and social turns. Bounded history must not silently evict the only remaining financial-risk marker. This does not authorize storing raw transaction text or claiming system verification.

### Quoted consent versus actual danger

The early `quotedOrHypothetical` plus `dong y|chuyen.*ops` branch returns before hardware safety checks. A message quoting a consent phrase while reporting a genuinely swollen/hot battery can therefore receive only a consent clarification. Quoted consent must remain invalid, but actual unquoted danger still requires a stop instruction. Parse the speech acts separately rather than allowing a quote anywhere to suppress the whole message.

`understanding.cjs` uses quotes/conditional markers to reject consent conservatively. This is useful; don't weaken it to increase acceptance. Negation and withdrawal prevail in “đồng ý nhưng đừng gửi”, “chưa đồng ý”, conditional consent and quoted examples. A question about what consent means is not consent.

### Short follow-up and repeated attempts

`nextDiagnostic` has a specific `vẫn vậy` clarification only for printer-type. Other short answers depend on whichever branch currently owns the state; consent questions and observation questions must not interpret the same bare word as the same action. A bare “rồi” after “đã thử chưa?” may report an attempt, while after an OPS question it requires the explicit consent policy. A bare “không” after “có đèn sạc không?” is an observation, not a refusal of all assistance.

Confirmed failed steps must remain failed across topic switches. If the merchant reports “đã làm rồi, vẫn vậy” after the same confirmed step, acknowledge the prior result and select a genuinely different safe check or explain that local guidance is exhausted. Do not fabricate a step completion from “vẫn vậy” alone or claim that a newly suggested step was already tried.

## Merchant response contracts

- Mixed actual danger and quoted OPS: “Ngừng dùng/sạc máy đang phồng/nóng bất thường, không tự tháo. Câu trích dẫn chưa được coi là đồng ý chuyển hỗ trợ.” No merchant-field collection.
- Contradictory consent: “Em chưa chuyển yêu cầu. Em hiểu anh/chị chưa cho phép gửi thông tin.” Keep the underlying unresolved incident and payment caution where applicable.
- Nested issue restored: acknowledge the resolved hardware only, name the still-open issue, and remind that the earlier payment remains unverified; never summarize the whole conversation as resolved.
- Short ambiguous follow-up: ask one specific clarification tied to the last question, without restarting the entire checklist or asking for OPS by default.
- Repeated failed troubleshooting: state the tried step once and avoid suggesting it again. If no supported safe next step exists, state the limitation honestly and respect prior refusal; no invented repair, policy or outcome.

## Invariants for frozen review

1. Consent is explicit, current-issue-specific and cannot be inferred from quotes, hypothetical examples, ambiguous acknowledgements or contradictory text.
2. Refusal/withdrawal stops collection and pending handover; it does not certify a payment outcome or erase unresolved risk.
3. Actual hardware hazard stops unsafe actions even when another intent or quoted consent is present.
4. Two hardware interruptions and their partial resolutions cannot turn unverified financial risk into a resolved payment.
5. State remains bounded, isolated per merchant/conversation and categorical; no customer text or production identifiers in evaluation evidence.
6. Default and opt-in actual responses must be reported separately; synthetic contracts are neither live Zalo execution nor independently verified business accuracy.

QA/Simulator received these causal targets before freeze. Preserve all earlier round cases; do not relax old assertions to make the final total look better.
