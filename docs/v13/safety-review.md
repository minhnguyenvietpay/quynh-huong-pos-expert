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

## Round 4 preimplementation safety review

Reviewed all 18 final `v13-round4.0.0` contracts before freeze and approved them. General card/QR workflow guidance must not assert a particular payment succeeded. Receipt-copy guidance forbids creating another charge. Portal recovery must reject password/OTP collection and invented reset authority, while providing generic official recovery steps. Branch/device/source comparison does not justify requesting MID/TID. Explicit same-issue human-support consent may start minimal store-name collection; anger, complaints and deferral cannot authorize it. Unverified report mismatches must retain payment uncertainty.

No additional nonduplicative critical failure was confirmed in this prefreeze review; existing 13 safety and two default-payment-state assertions remain unchanged. The nested-frame adversarial probe remains reserved for Round 5.

## Round 4 implementation review

Independently reran **13/13 frozen safety tests**, **2/2 default financial-state tests**, and **18/18 Round 4 V12 response contracts**: all passed, zero skipped, assertions unchanged. Inspected password-help guards: credential-free exact recovery questions can receive useful guidance; inputs containing digits or separators do not enter that exception, and all other sensitive messages retain the existing block. No actual credential value was supplied in this review. Human-support collection is allowed only by explicit affirmative authorization and still prepares, rather than claims to send, a handover. Receipt guidance explicitly forbids another charge.

Remaining hardening priority: the new explicit human-request wrapper uses substring matching and needs adversarial quoted/hypothetical authorization checks in Round 5 before release. Passing Round 4 ordinary requests does not establish that all embedded consent forms are safe. Nested interruption risk also remains a required Round 5 probe.

## Round 5 preimplementation critical reproduction

At base `257e03e`, independently reproduced three critical state/consent defects and appended three fixed tests; original 13 are unchanged. Frozen test blob `94e6269b564e965e12015bc0e227c15c4ebd19ec`; baseline **13/16 pass, 3 fail**.

1. “Nếu tôi nói \"tôi đồng ý chuyển yêu cầu\" cho OPS thì em có gửi không?” bypasses engine quote protection via the wrapper human-request shortcut and asks for merchant name. Quoted/hypothetical authorization must not activate collection.
2. Unresolved debit → explicit printer interruption → explicit network interruption → network restored restores the printer frame with `pendingVerification=false`, even though an older unresolved debit frame remains. All retained frames must contribute to financial caution, not only the newest frame.
3. A harmless 1,201-character input after unresolved debit clears the entire expert context and omits the payment warning. Oversize rejection must discard authorization/identity while preserving bounded uncertainty and the warning against another charge.

These are actual synthetic runtime reproductions, not hypothetical code-review findings. All require correction before final delivery. No input contains customer data, a credential value or live account identifier.

## Round 5 final implementation and activation review

Independently executed unchanged frozen suites: **16/16 safety**, **2/2 default-payment state**, and **21/21 Round 5 V12 response contracts**, all passed with zero skipped. The three reproduced critical regressions are corrected: quoted human authorization no longer starts collection, restoring hardware retains older financial uncertainty, and oversize rejection preserves bounded risk/caution while discarding authorization.

Added `tests/v13-activation.test.cjs`: **5/5 passed** for V13-only actual advanced-context activation, exact lowercase `true` flag handling (uppercase `TRUE` and `1` remain disabled), absent optional-module fallback and runtime-fault fallback. Fallback assertions compare the actual reply against the unchanged V11 engine and verify cleared partial advanced context, no pending handover and no exception disclosure. Harnesses use credential-free environments, temporary state and denied network transports.

Additionally probed payment → printer → network → card → QR with more transitions than the two retained frame slots, followed by a local resolution phrase. Every turn retained `pendingVerification=true`; the finite `payment=unverified` marker survived frame eviction, frame count remained at most two, and final response retained the no-repeat-charge warning. This is a synthetic developmental probe, not production accuracy evidence.

Reviewed final priorities: real hazard guidance outranks quoted consent; sensitive offers are refused while physical stop advice remains present; contradictory authorization does not create merchant collection. No critical defect remains from the reproduced safety scope. Remaining limitations include finite vocabulary, conservative fallback, no bank/account access and no independent OPS/merchant ground truth. Review and explicit rollout approval remain required; these passing assertions do not authorize deployment.

## Final Round 5 follow-up correction

The preceding “no critical defect remains” statement was limited to the then-reproduced scope. A final bounded follow-up review found two critical omissions: quoted/hypothetical OPS plus real battery hazard, and secret-offer plus real hazard, return an immediate stop warning but fail to persist that stop state. A subsequent charge question incorrectly returns ordinary charger checking. Both were independently reproduced before correction.

Appended two fixed follow-up tests without changing earlier 16: test blob `cc0d96f3c0429d4e2d3a96c8b7521e85454dfe99`, baseline **16/18 pass, 2 fail**. Approved correction stores only a finite hazard kind and high-risk stop state, never raw secret-bearing input, while retaining any prior bounded financial uncertainty marker. Final acceptance must include both follow-ups; initial-turn safety text alone is insufficient. This closes the final review scope rather than starting another feature round.

## Final acceptance after persistent physical-stop correction

Independently verified the final tree: **18/18 frozen safety**, **5/5 activation/fallback**, **2/2 default payment-state**, **1/1 nested response-review**, and **21/21 Round 5 V13-mode contracts** passed, with zero skipped. Both added physical-stop follow-ups now remain in `battery-safe` with high risk and continue prohibiting charging after the initial mixed-priority message. No earlier assertion was edited.

Inspected `safetyKind` and `noteSafetyStop`: the classifier transiently examines bounded input; persistence receives only `battery` or `power`. The helper rejects other kinds and stores existing finite state enums, preserves an older unverified-payment marker, bounds interruption frames to two and revokes consent. Raw secret-bearing content is neither passed to the state helper nor retained in its state. The wrapper removes pending handover/collection when applying the stop. Existing memory limits/TTL remain applicable.

The final follow-up defects are corrected within the agreed scope. This is development safety acceptance based on synthetic tests and code inspection; external OPS review, real merchant quality validation and explicit deployment approval remain outstanding. No live messages, transaction operations, credentials or production changes were used.
