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
