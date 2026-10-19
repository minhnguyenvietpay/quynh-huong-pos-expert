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

## V13 development rounds

For the V13 program use seven real Codex development roles when available: Merchant Simulator (new multi-turn inputs), Conversation Designer (natural dialogue), POS Expert (domain/source limits), QA Judge (separate executable expectations and evidence), Safety Auditor (independent payment/privacy/consent review), Code Engineer (existing runtime changes), and Improvement Director (architecture, backend/retrieval coordination, release and checkpoints). This maps the eight responsibility stages above into the user's seven requested actors; it does not remove their safety or release duties. These are development agents, not paid runtime inference or a scheduled coding service.

Run SIMULATE → TEST → EVALUATE → DESIGN → CODE → RETEST → IMPROVE. Freeze scenario bytes/criteria and capture actual baseline responses from the preceding commit before code changes. Keep simulator, judge and implementation ownership separate. Review business/safety expectations before freezing; never weaken them after freeze. Record manually discovered counterexamples even if a regex suite is green, and label tests written after a fix honestly. Keep single-turn guard probes separate from full merchant conversations; do not count repeated variants, aliases or load turns as independent cases.

After each meaningful round, run all retained regressions, save a commit/checkpoint with failures/limits and next priorities, then continue within available execution limits. Five rounds are the initial V13 minimum when feasible; 500/5000/10000 coverage figures are goals, not permission to duplicate unsupported fixtures. Use docs/v13/frozen-rounds.json and the round reports to continue. No external OPS ground truth means the independent quality gate remains blocked.

QH_V13_ENABLED=true and the compatibility QH_V12_ENABLED=true select the same updated expert module under lib/v12; V11 remains the module fallback. Disabling13 and enabling12 does not restore old V12.2 code. Full rollback needs the recorded deployment commit and previous configuration. Do not infer a live service, Windows validation, rollout approval or automatic task resumption from passing offline/CI checks.
