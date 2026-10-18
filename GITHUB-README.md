# Quynh Huong POS Expert

Zalo POS support bot and QA system.

## Source
- `listener.mjs`: Zalo integration (requires local authenticated session)
- `dialogue.js`, `intent.js`, `knowledge.json`: response logic and knowledge
- `qh-v47/`, `qh-v48/`, `qa-*`: QA components

## Setup
1. Install a supported Node.js version.
2. Run `npm ci`.
3. Review `package.json` scripts and local README instructions before starting.
4. Supply secrets/session locally, never in Git.

## Safety
Do not run live Zalo integration in GitHub Actions. Run only offline QA.
All changes affecting payments, customer data, escalation or Zalo operations require human approval.

This export excludes dependencies, runtime data, login QR, historical backups, and large generated QA outputs. Original archive remains unchanged.
