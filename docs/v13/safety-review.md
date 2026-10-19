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
