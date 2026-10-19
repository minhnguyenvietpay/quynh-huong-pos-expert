# V13 POS Expert domain review

Reviewer role: POS Expert, executed as a separate development agent. This is a code and synthetic-contract review, not merchant ground truth or approval of operational knowledge.

## Evidence and authority

- Reviewed repository engineering rules, V12.2 deterministic engine, and verified retrieval gate.
- Executed `node scripts/knowledge-report.cjs`: 5,000 records, **0 verified**, 5,003 review items. No knowledge was promoted or metadata invented.
- Runtime retrieval requires reviewed, current evidence from an official document or approved runbook. Its conservative refusal to use the current corpus is appropriate.
- Generic diagnostics must remain conditional on the actual device instructions and merchant authorization. No bank fees, settlement/refund timing, device button sequences, or transaction outcomes may be invented.

## Round 1 acceptance review boundaries

Social acknowledgment is not transaction confirmation, issue resolution, escalation consent, or permission to collect store identity. A greeting/thanks during unresolved payment troubleshooting should be natural while preserving the pending transaction uncertainty and the warning against charging again. A social interruption must not replace a recorded failure with a new troubleshooting session or revive withdrawn consent.

Reviewed all 18 draft contracts in `tests/fixtures/v13-round1.json` before freeze. Their merchant-facing expectations contain no invented payment status, bank policy, fee or timeline. Consent withdrawal and literal synthetic store-name controls are appropriate. Identified a material coverage gap to QA: `pending: false` concerns the handover artifact, not unresolved financial risk. Requested a payment-memory assertion or a post-social repayment probe so a handler cannot discard transaction uncertainty while passing only the social response assertions. Final freeze approval remains subject to that added safety coverage; this review does not independently validate merchant accuracy.

QA added `stateByMode.v12` checks for `context.pendingVerification: true` and `context.consent: false` on the payment/social detours. Inspected these additions and approved the Round 1 domain contracts at SHA-256 `1948e180be9f623b72d6ab7b325d9377d368a92ab4852e50ebc35ba5e554c6ef`. This resolves the identified contract gap; baseline pass counts remain QA execution evidence rather than domain accuracy.

## Priorities for subsequent rounds

1. **Portal localization:** currently most followups lead to a generic comparison/escalation offer. Distinguish login/access, missing records, wrong filters, aggregate totals, source (POS/QR), branch, and date range without declaring a financial outcome. Use volunteered facts rather than repeatedly asking the same filter question.
2. **Payment ambiguity:** preserve uncertainty across thanks, topic switches, partial hardware recovery, and repeated followups. A working printer/network does not verify the preceding transaction.
3. **Reported diagnostic outcome:** an attempted network action should not automatically mean it failed. Record the merchant's explicit outcome and avoid treating an unrelated or hypothetical action as a completed repair step.
4. **Hardware refusal:** retain refusal while continuing relevant safe hardware guidance. A declined printer escalation should not become an unrelated payment-history script.
5. **Diagnostic specificity without invented runbooks:** distinguish paper motion/blank/faint, SIM signal versus service, Wi-Fi shared versus POS-only failure, chip/contactless/swipe, and screen/charging indicator. Avoid model-specific settings or destructive operations.

## Round 2 prefreeze review

Reviewed all 16 Simulator scenarios in `docs/v13/round2-scenarios.json` and independently reviewed the resulting 16 QA contracts in `tests/fixtures/v13-round2.json` before freeze. Approved domain expectations: no paper means install a compatible roll, not diagnose printed blank output; switching SIM/Wi-Fi updates the active transport; restored phone connectivity with residual POS failure localizes the remaining fault; an unrelated paper action does not prove a network/power diagnostic failed.

Raised two material criteria before freeze: a completed step without a reported result must not automatically become a failed step or an OPS offer, and declining OPS must not require an invented additional repair procedure. QA addressed both: the intermediate paper-action checkpoint checks an empty failed-step list and no premature OPS offer; refusal cases accept relevant conservative guidance or an honest DIY safety boundary. Hardware hazards must interrupt routine paper instructions; absent a payment incident, a printer refusal should not turn into a transaction-history script.

No operational knowledge was approved. Permitted guidance remains compatible consumables/charger, paper orientation and cover per the actual device guide, no force/disassembly/internal cleaning, and authorized network comparisons. Restored connectivity is not evidence of a transaction result.

Approved frozen Round 2 SHA-256: `6f6e3595f0c8f73ba76cf0ff57c8b97c5c277a3dca56ab4306adfb965f669b86`.

## Round 3 prefreeze payment review

Reviewed all 18 new Simulator inputs and 18 QA draft contracts. Appropriate boundaries include QR scanning not proving paid status; reported debit taking priority over simplistic declined-and-retry advice; one receipt not authorizing refund of an alleged duplicate; merchant-observed notifications not giving the bot bank access; and settlement timing claims not becoming promises. Definitions of refund, void and reversal must not imply universal eligibility or funds already returned. Withdrawal revokes consent but does not resolve the transaction uncertainty.

Requested one material contract improvement before freeze: POS-success/Portal-missing after relevant filter checks must require a useful comparison (time, amount, source, status or reconciliation), rather than passing on an OPS consent phrase alone. Also noted that lexical status prohibitions can falsely match a negated certainty phrase; synthetic regex pass rates are not a comprehensive payment-safety classifier. A history check still in progress must not be marked failed, and a separate printer issue must preserve prior financial risk without trapping the merchant in an OPS loop.

No bank policy, timing, fee, verified merchant status or operational authority was approved by this review. Bot capability boundaries must be paired with practical authorized next checks, not a fabricated system lookup.

Inspected the corrected concrete-comparison requirement and approved final Round 3 contracts before freeze. Frozen SHA-256: `dadc700ad3410d05d31b8c9db000278d8a1861e3be7088d8c3e1e471e5167b03`.

## Remaining evidence limitations

Synthetic fixtures can verify executable safety and response contracts. They cannot demonstrate bank policy correctness, device compatibility, actual merchant satisfaction, or independent business approval. OPS/domain owners must review future authoritative sources before corpus promotion or production rollout.
