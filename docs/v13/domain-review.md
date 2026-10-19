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

## Remaining evidence limitations

Synthetic fixtures can verify executable safety and response contracts. They cannot demonstrate bank policy correctness, device compatibility, actual merchant satisfaction, or independent business approval. OPS/domain owners must review future authoritative sources before corpus promotion or production rollout.
