# V13 round 3: useful payment-risk dialogue

Conversation Designer audit after `40516c6`. Scope is new financial progression defects, not round 2 hardware repetition. Existing repository distinctions and POS/Portal checks only; no invented bank policies, timelines, settlement status or runtime access.

## Engine causes

`financial()` marks every financial session pending/high risk, which is appropriately cautious. However duplicate, refund/void/reversal and settlement all route every non-initial answer directly to `offer()`. Generic pending, no debit, history present and history absent also all call `offer()`. This changes `currentQuestion` to `offer-consent` before enough of the merchant's observations have been used.

The later `reply()` `offer-consent` branch consumes financial follow-ups as consent answers before calling `financial()` again. The round 2 exception only lets *nonfinancial* sessions re-enter `nextDiagnostic`. Thus a useful new observation such as POS success/Portal missing can receive “đồng ý ... không?” rather than an explanation of the discrepancy. Repeated unclear answers never advance to a more accessible safe check.

`definition()` responds to refund/void/reversal questions without updating the active financial purpose. The sticky same-family topic rules can keep a previous refund topic when the merchant corrects it to a void/reversal inquiry. `offer-consent` handover issue uses only `TOPICS[s.topic]` plus a generic reason, so an explicit issue correction must precede consent acceptance; never apply old consent to a different newly described incident.

`capture` retains a coarse `merchant-reported` payment fact but no finite distinction for POS one/two/missing/pending or Portal discrepancy. Those observations should be bounded categorical facts rather than persisted free-text transaction records. Merchant-reported POS status remains a report, not independently verified status.

## Desired merchant progression

1. Acknowledge the exact uncertainty, without certifying outcome: “Anh/chị báo POS hiển thị thành công nhưng Portal chưa có; hai nguồn đang chưa khớp.”
2. Give one concrete permitted comparison and ask one next question. Compare the same transaction's date/time and amount in POS history and Portal's relevant date/source/branch filters; do not request actual sensitive values in group chat.
3. If one source is inaccessible, offer the other available history or official authorized lookup channel. Do not invent a workaround, reset the device during processing or repeat payment.
4. Offer OPS when the mismatch is established or authorized lookup is unavailable. While waiting for consent, answer newly volunteered material facts rather than repeating the consent question. Consent remains explicit, issue-specific and reversible.
5. If declined, retain relevant verification guidance without asking again. If repeated answers add no new information, acknowledge the limit and name the permitted verification channel; do not imply further local questions can resolve unavailable bank data.

| Incident | Useful distinction and next step | Forbidden inference |
|---|---|---|
| QR/card pending or customer says debited | Compare original transaction in POS/Portal; ask whether a corresponding entry is present or a status discrepancy exists. | Pending means failed; debit notification proves merchant receipt; retry is safe. |
| POS success, Portal missing | Acknowledge mismatch; verify same date/source/branch and original entry. If still inconsistent, explain reconciliation requires authorized review. | Declare settled or paid merely from one label; invent synchronization delay. |
| Two bank notifications, one POS entry | Distinguish notifications from two confirmed collections; compare authorized transaction records, preserve evidence through official process. | Automatically refund or void the one visible entry. |
| Two POS entries | Treat as suspected duplicate requiring review of actual records; no automatic refund and no third charge. | Both settled or refund guaranteed. |
| Refund/void/reversal inquiry | Ask whether user wants a permitted operation or status clarification; explain these are distinct. Correct active issue when user explicitly says which inquiry is intended. | Guarantee available operation, successful refund, timeline or automatic reversal. |
| Portal paid label, bank credit missing | Separate reported Portal payout status from bank receipt; compare relevant settlement period and payout information through authorized channels. | Bank already credited, fixed posting time or fabricated fee/hold reason. |
| No POS/Portal access | Use official access recovery/authorized support, keep original-payment caution. | Ask OTP/password/session, ask MID/TID, fabricate remote verification. |

Keep responses about two or three sentences. The warning “chưa thu tiền lại khi kết quả chưa rõ” is useful; repeating the full definition and an OPS prompt on every turn is not progression.

## Pre-freeze review requests

Simulator/QA should cover material observations after an OPS offer; duplicate one-record/two-notification distinction; refund purpose correction before consent; settlement-versus-bank contradiction; inability to access either history; and mixed QR/card messages that change context without asserting success. Check both default and opt-in runtime, actual response plus state/handover issue. Synthetic contractual evaluation does not establish business accuracy. No new verified corpus records or paid runtime service is proposed.
