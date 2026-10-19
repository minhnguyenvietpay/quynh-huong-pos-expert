# V13 round 2: diagnostic conversation design

Conversation Designer read-only review after round 1 commit `9af7a17`. Runtime changes and frozen QA assertions belong to other roles. Only existing repository guidance is proposed; no device model manual, bank policy or verified knowledge is invented.

## Current response defects traced to code

`lib/v12/engine.cjs` `nextDiagnostic` printer/network branches treat `relevantAttempt` alone as a failed outcome, call `fail`, then offer OPS. `relevantAttempt` proves an action verb plus relevant object, not a continuing fault. Thus “đã thay giấy mới” and “đã đổi sang hotspot” can be treated as failed troubleshooting even when the user has not reported the result. Initial `explicitFailure` is more cautious, so initial and follow-up turns disagree.

`capture` collapses paper white/faint into `knownAnswers.paper='blank'`; there is no explicit empty-roll answer. Printer general routing asks whether paper moves despite an explicit exhausted roll. Power indicator handling acknowledges charge but provides only vague “đối chiếu thao tác” guidance, while a follow-up without an indicator can jump to OPS. Network known connection survives change unless the new connection is parsed; a newly selected approved network should invalidate old phone-comparison facts rather than reuse them.

The `s.declined` branch unconditionally replies with transaction history checks. A printer/power/network merchant refusing OPS therefore receives payment advice even when no payment uncertainty was reported. Refusal should control escalation, not replace the diagnostic topic or imply a financial incident.

## Merchant-facing conversation contract

Separate four facts: action suggested, action actually attempted, observed result, and incident resolved. An action report updates tried steps; only explicit continuing fault updates failed steps. “Đã thay giấy” is not “thay giấy rồi vẫn không in”. If outcome is missing, ask one focused question rather than claim success, failure or exhausted troubleshooting.

| Reported observation | Useful short response from existing guidance | Boundary |
|---|---|---|
| Hết giấy | “Mình thay cuộn giấy nhiệt phù hợp, lắp đúng chiều và đóng kín nắp theo hướng dẫn dòng máy. Sau khi thay, máy có đẩy giấy/in được chưa ạ?” | No new payment to test printing; no invented roll dimensions. |
| Paper feeds, blank | Check thermal paper suitability and printing side/orientation; ask result after that actual step. | No assumption ink cartridge is needed; no cleaning chemicals or internal disassembly. |
| Text faint/missing | Acknowledge partial printing remains faulty; check compatible thermal roll and printing side, then ask whether still faint. | Never mark fully resolved merely because paper feeds. No asserted broken head without evidence. |
| Jam/no feed | No pulling hard or disassembly; when no processing transaction, check accessible roll/cover according to device instructions; ask observed blockage/error. | No blade, force, internal mechanism or repeated printing. |
| Charge light/icon, dark screen | Acknowledge indicator; use normal power-on procedure from correct model guide, ask screen response. | No invented seconds/button combination, factory reset, unfamiliar charger, or forcing restart during transaction. |
| No charge indicator | Check suitable cable/charger/approved outlet once if safe; ask result. | Hot/swollen/wet/damaged device stops all charge/power experiments. |
| Approved network changed | Record current Wi-Fi/hotspot/SIM; ask whether POS now connects or still reports an error. | Action alone is not failure; old network comparison does not prove new network works. No APN/router policy changes. |
| OPS declined for hardware | “Dạ, em chưa chuyển OPS. Mình tiếp tục phần …” followed by one relevant safe check not already confirmed failed. | No consent loop, store fields or unrelated transaction-history checklist. |

Use two or three short sentences, one next question. Do not put internal evidence bookkeeping (“chưa có bằng chứng…”) into merchant responses when “Anh/chị đã thử chưa?” suffices.

## Payment and refusal rules

An unresolved financial incident retains its warning across hardware discussion: no new collection until the original result is checked. A hardware-only refusal does not create payment uncertainty. If all safe available checks were actually tried and failed, acknowledge that limitation without repeating them; explain that hands-on support remains available if the merchant later explicitly requests it, without repeatedly soliciting consent.

Safety stop conditions outrank diagnostic progression and refusal. Refusing OPS is not permission to suggest dangerous home repair. A payment-status report is merchant-reported information, never system confirmation.

## Independent QA review priorities

Simulator supplies new inputs; QA freezes expectations before implementation. Cover both default coordinator and opt-in engine where applicable, and retain old contracts. Include action-only → outcome question, attempted+stillfault → appropriate next step, partial improvement → remaining fault, connection change → fresh outcome, hardware refusal → relevant self-help, financial refusal → verification warning, and hazard → stop. Synthetic coverage is not merchant-verified accuracy.
