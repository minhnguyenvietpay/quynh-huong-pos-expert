# Stage 1 — V12 POS Expert Pro

Base main `180adac`; feature branch `feat/v12-three-stage-program`. Offline local Node, no paid inference or Zalo transport. V11 modules unchanged; V12 opt-in dispatcher with guarded V11 fallback, raw input routed through listener eligibility. No deployment.

## Completed

Frozen 80 synthetic actual-dialogue scenarios (hash and all transcripts in stage1-evidence.json), 71 reproducible failed scene contracts across 15 root-cause groups, not 71 independent business defects. Baseline V11 9/80; V12 80/80; 71 improved, 0 regressed. This meets the requested 50 reproducible examples, not independently reviewed ground truth.

V12 retains SIM/Wi-Fi/phone connectivity, paper status and scoped prior attempts; asks relevant diagnostic questions rather than premature escalation; preserves partial printer failures; recognizes definitions without starting financial operations; withdraws consent before merchant collection; acknowledges charge indicators. Scoped negation protects real battery hazards and avoids invented in-flight payments. Memory has finite fields, TTL/cap and clone isolation. Retrieval requires current matching approved evidence and blocks contradictory/unsafe answers. Existing corpus remains 0/5000 verified.

Validation: npm test 244/244, no skipped; qa:language 30/30; qa:legacy 25/25; V3 self-test PASS; qa:quality 24/24 synthetic (independent quality gate BLOCKED); knowledge report 0 verified; security check no violations. Tests include real dialogue dispatch, missing/faulted V12 fallback, consent, sensitive input and synthetic merchant-name collection. Required commands completed with exit 0. CI Node22/24 now runs V12 tests; remote CI not yet observed.

## Earlier zero improvement reports

Rechecked the diagnoses in ../QA-REVIEW-VI.md: absent ignored variants dataset blocks V2/V3; no approved knowledge makes V3 expansion ineligible; exact-string patch templates can fail to match; intent-only QA does not measure processMessage responses; duplicate/synonym exclusions make repeated expansion idempotent. There is insufficient historical V4.7/V4.8 execution evidence to claim a universal cause. Do not bypass approval gates to inflate improvement counts.

## Known limits and next stage

Rules remain deterministic, bounded Vietnamese patterns, no external source verification or transaction-system access. Definition answers remain high-level. Current development dataset is now known to implementation authors. Stage 2 must independently inspect V12 and freeze 20 new consequential challenges before fixing them. Stage 3 adversarial work follows Stage 2 commit. OPS review, permitted staging validation and explicit production approval remain outstanding; runtime flags remain off by default. See runtime-operations.md for rollback.

Executed roles: Tech Lead (root integration), Knowledge Expert (retrieval), Conversation Intelligence (NLU), Backend & Retrieval (memory), QA & Simulation (frozen evaluator), Root Cause & Red Team (adversarial tests), Security & Compliance (isolated dialogue tests), Release & Automation (CI/operations). These are Codex development reviews, not independent merchant/OPS validation.
