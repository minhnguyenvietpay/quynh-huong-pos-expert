# Stage 2 — V12.1 self-critique and improvement

Started only after V12 commit `81a4a30`. Independent Codex Knowledge Expert did not author V12 runtime; reviewed implementation and generated20 new challenging synthetic contracts before fixes. This independence within development does not provide independently reviewed merchant ground truth. Freeze, baseline outputs and20 root causes: stage2-review.md; complete V11/V12/V12.1 transcripts: stage2-evidence.json.

## Completed and measured

New holdout: V11 1/20; V12 0/20; V12.1 20/20. V12 lost one legacy contract on this newly discovered holdout; V12.1 fixes it. Stage1 frozen regression remains80/80 (V11 9/80). New20 improved over V12,0 regressed. Do not aggregate as production accuracy.

Fixes prioritize actual merchant responses: restored context asks resume without reusing consent; full recovery after reported attempts closes correctly, partial recovery stays open; phone/POS negation scoped separately; natural refusal retained without repeated consent; address refusal not stored as location; double debit and settlement prioritized; chip remembered; initial QR/charging facts used; processing card triggers payment verification; Portal login distinguished from report filters; receipt copy avoids new payment; pending reported without invented result; withdrawn void permits printer topic. Bounded general authorization/capture/payout and dispute explanations avoid bank-specific policies and promises. No newly approved knowledge.

Security review separately froze16 tests, baseline0/16→16/16: four withdrawal forms during address collection and twelve synthetic API-key/token/session/cookie checks across ticket/name/address. Sensitive values are blocked before echo/storage. Genuine withdrawal clears pending handover; refusal to escalate retains payment checking context.

Validation: npm test279/279,0 skipped; actual frozen conversations100/100; security scanner133 files0 violations. Stage1 required legacy/quality/knowledge commands previously passed; full required checks repeated at final Stage3. CI now runs actual frozen V12 dataset contracts via npm test, not only evaluator unit tests. Comparison script archives revisions into temp directories and keeps dataset bytes/hash fixed.

## Known limits and remaining work

Deterministic language coverage remains limited; source corpus still0/5000 verified. New generic definitions are development-written, not externally verified bank procedures. Existing assertions are synthetic, reviewed by Codex only. No live monitoring/Zalo/merchant test, deploy or merge. Stage3 must use adversarial cases not designed during Stage2: contradictions, scope, repeated failed steps, multi-symptom prioritization, refusal and context interruptions. Test memory/cap and failure fallback under adversarial input, compare all four revisions and preserve rollback.
