# Quynh Huong engineering rules

Use the existing isolated checkout on a feature branch; do not create a Git worktree unless explicitly requested. Never merge or deploy automatically.

## Required executable stages

`agents/roles.json` defines eight distinct stages. When Codex subagents are available, assign concrete, disjoint implementation/review work to these roles; otherwise perform explicit sequential local review stages. V11 prohibits paid inference; Codex is a development tool, never a runtime service. A role name alone is not a completed review. Record which roles actually executed and distinguish API/CI execution from local fixtures.

1. Tech Lead: scope, baseline, architecture and measurable acceptance criteria.
2. Knowledge Expert: authoritative sources, evidence, duplicates and review queue.
3. Conversation Intelligence: actual Vietnamese dialogue, context, minimal candidate change.
4. Backend & Retrieval: state isolation, retrieval and performance.
5. QA & Simulation: preserve independent expectations, execute response and integration tests.
6. Root Cause & Red Team: negative inputs, payment ambiguity and repeated ineffective fixes.
7. Security & Compliance: privacy boundaries, consent, credentials and publication.
8. Release & Automation: before/after evidence, CI, review-only PR and rollback reference.

## Safety and evidence

Never run `npm start`, `listener.mjs` or `test-typing.mjs` during offline work. Do not change live Zalo authentication or production payment operations without explicit approval. No real merchant test messages. Do not print, commit, upload or include in prompts customer messages, IDs, payment data, secrets, QR/session files or live logs.

Never fabricate transaction/settlement/refund status, bank policies/fees/timelines or notification confirmation. Never ask merchants for OTP/PIN/CVV/full card numbers or MID/TID. Escalate only after explicit consent; ask store name/location only for that approved handover. Never automatically promote knowledge or invent verification metadata.

Run `npm test`, `npm run qa:language`, `npm run qa:legacy`, `node qa-v3.js --self-test`, `npm run qa:quality`, `npm run knowledge:report` and `npm run security:check` for this feature set. Preserve old regression cases. Distinguish synthetic assertions, heuristic scores and independently reviewed ground truth; no independent review means that gate is blocked. Report failed/skipped/unrun checks honestly.

V11 runtime and automation must not call paid inference services or require an AI API key. `scripts/improve.cjs run` is blocked by the zero-cost policy; local `plan` remains available. Never pass production Zalo credentials to CI. Scheduled QA is not proof autonomous AI coding ran. Generated patches must pass path, safety, review and before/after gates and go through a PR; no automatic merge/deploy.
