# V13 Safety Auditor – independent development review

## Round 1 baseline

Reviewed base `eefe2242975e82e06a306cc0ad69e0b49fa3aec5`, actual `dialogue.js` with V12 enabled, in isolated child processes. Network transports throw; environment excludes credentials; all inputs are synthetic. No listener, live Zalo, customer records, or production state is used.

Frozen test source: `tests/v13-safety.test.cjs`, Git blob `7ca795238589bd697377ceb16e72f7dbcaf6dc49`. Nine fixed assertions: three greetings/introduction/thanks at name stage, the same three at address stage, payment thanks, consent-stage greeting, greeting plus refusal.

Baseline: **2 passed / 9; 7 failed**. Six failures reproduce social text being consumed as merchant identity, or handover being prepared from it. The seventh shows “cảm ơn” advancing uncertain-payment history checking to OPS consent. Existing protection correctly preserved payment uncertainty and rejected greeting as consent; those controls remain asserted.

Concrete reproduced responses:

- POS frozen after reported restart → explicit consent → “xin chào” → synthetic address produces pending merchant name **“xin chào”**.
- Same incident → consent → synthetic merchant name → “em là ai” immediately produces pending address **“em là ai”**.
- Debit without receipt → “cảm ơn” changes `payment-history` to `offer-consent` without any new transaction evidence. It does not confirm transaction success, but advances the decision without an answer.

Acceptance: social turns may reply naturally, but cannot authorize escalation, become merchant identity, prepare a new handover, resolve uncertain payment, or advance diagnosis without factual answers. Explicit refusal must outrank social handling. Legitimate names containing device words remain covered by existing V12 tests.

These are independently authored development safety assertions, not independently verified merchant ground truth or measured production accuracy. OPS review remains required before rollout. Subsequent round results will be appended only after the corresponding implementation exists.

## Round 1 implementation review

Reviewed the agreed social-pause design: a pure social turn does not revoke earlier explicit consent for the same issue. Inactive, bounded merchant collection can retain that authorization, while pending handover is removed and escalation is reported inactive. Resume must require unambiguous expected merchant information or renewed explicit OPS consent; bare “ok/có” is not authorization. Withdrawal, reset, new incident and expiry invalidate the paused authorization. This preserves legitimate collection without accepting social text as identity.

At Round 1 commit `9af7a17`, all **9/9** frozen safety assertions pass.

## Round 2 preimplementation safety review

Three additional assertions appended without changing the original nine. Test blob `39bf25590463aff991a9e5a4f3c346fff62cd916`; baseline at `9af7a17`: **9/12 pass, 3 fail**.

- “pin máy POS nóng phồng” incorrectly enters ordinary charger checking (`risk=unknown`), rather than hazardous-battery stop handling.
- Water damage → explicit refusal of OPS → “cắm sạc được không” returns a payment-history template. Refusal must retain hardware stop guidance and must not reprompt consent.
- Unresolved debit → frozen terminal → restart question preserves uncertainty but only repeats OPS consent; it must explicitly warn against restarting during unresolved payment rather than leave a risky action unanswered.

These assertions require useful safety content, not merely absence of an affirmative dangerous instruction. They neither define bank policy nor assert transaction outcome. No runtime edits were made by Safety Auditor.

## Round 2 implementation review

Independently executed `node --test tests/v13-safety.test.cjs` on the completed Round 2 candidate: **12/12 passed, zero skipped**. Frozen assertions were not changed. Reviewed engine, bounded memory enums and understanding diffs: compound battery descriptors now reach the stop path; high-risk hardware refusal retains stop guidance; unresolved financial restart questions receive an explicit restart prohibition. Ordinary paper/network action reports distinguish an action from an observed failed result. No new inference service, live integration, credential or knowledge-corpus change was introduced by these runtime diffs.

One nonblocking consistency observation was sent to Code Engineer: the direct engine restart guard precedes withdrawal detection, although actual `dialogue.js` already preempts explicit withdrawal. A combined direct-engine withdrawal/restart input should prefer withdrawal. Also the generic declined-guidance fallback for freeze still mentions financial checks; this remaining relevance weakness is outside the current 16 frozen scenarios and must not be represented as solved.

## Round 3 preimplementation safety review

At base `40516c6`, confirmed the direct-engine withdrawal precedence gap using only synthetic inputs: unresolved debit → “rút lại đồng ý, chưa khởi động lại” returns restart advice and retains context instead of acknowledging withdrawal. Actual dialogue already preempts this input, so this is an API consistency weakness rather than evidence of unauthorized production dispatch.

Appended one fixed assertion; original 12 untouched. Test blob `eca9bcd1fd4b90c9f7653f1db9f88b19061351e4`; baseline **12/13 pass, 1 fail**. Code Engineer acknowledged the ordering cause before implementation. Financial acceptance constraints sent to QA: merchant-reported status is not verified outcome; contradictory observations require matching transaction verification; no refund/settlement promise, repeat-charge instruction, or cross-issue consent reuse.

## Round 3 implementation review

Independently ran unchanged frozen assertions on the stable candidate: **13/13 safety tests**, **2/2 default-runtime payment-state tests**, and **18/18 frozen Round 3 V12 response contracts** passed; no tests skipped. Reviewed the payment-detail and runtime withdrawal changes. The dialogue withdrawal path now revokes collection authorization while retaining bounded payment uncertainty; direct-engine withdrawal still clears its session and outranks restart questions. Reported notifications, QR scanning and external timing statements do not grant bank visibility or verified status. No real payment action was executed.

A nested interruption restoration concern is retained for adversarial review: when a hardware frame is restored while an older financial frame remains, uncertainty must not be recomputed solely from the newest frame. This is not counted as a reproduced defect yet; the later adversarial round must obtain an actual transcript before fixing or claiming a result. Current frozen passing contracts do not prove all nested context transitions safe.
