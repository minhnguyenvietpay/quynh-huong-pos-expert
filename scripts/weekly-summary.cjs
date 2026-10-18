#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
function count(value) { return Number.isSafeInteger(value) && value >= 0 ? value : null; }
function summarize({ quality = {}, knowledge = {}, security = {} } = {}) {
  // Explicit allowlist: never copy messages, fixture rows, paths, or review records.
  return {
    schemaVersion: 1,
    quality: { total: count(quality.total), passed: count(quality.passed), failed: count(quality.failed), independentlyReviewed: count(quality.independentQualityGate?.reviewedFixtures), syntheticOnly: quality.syntheticOnly === true },
    knowledge: { total: count(knowledge.total), verified: count(knowledge.verified), unverified: count(knowledge.unverified), duplicateGroups: count(knowledge.duplicateGroups), possibleContradictionGroups: count(knowledge.possibleContradictionGroups), reviewItems: Array.isArray(knowledge.reviewQueue) ? knowledge.reviewQueue.length : null },
    security: { filesScanned: count(security.filesScanned), violations: Array.isArray(security.violations) ? security.violations.length : null }
  };
}
if (require.main === module) {
  try {
    const dir = path.resolve(process.argv[2] || 'qa-reports');
    const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
    const result = summarize({ quality: read('quality.json'), knowledge: read('knowledge-growth.json'), security: read('security.json') });
    const output = JSON.stringify(result, null, 2) + '\n';
    fs.writeFileSync(path.join(dir, 'weekly-summary.json'), output, { mode: 0o600 });
    process.stdout.write(output);
  } catch { console.error('Cannot summarize: required aggregate reports are missing or invalid.'); process.exitCode = 1; }
}
module.exports = { summarize };
