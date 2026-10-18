#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { adaptLegacy, analyze } = require('../lib/knowledge/index.cjs');
const root = path.resolve(__dirname, '..');
const report = analyze(adaptLegacy(JSON.parse(fs.readFileSync(path.join(root, 'knowledge.json'), 'utf8'))));
const target = path.join(root, 'qa-reports', 'knowledge-growth.json');
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify({ total: report.total, verified: report.verified, duplicateGroups: report.duplicateGroups, possibleContradictionGroups: report.possibleContradictionGroups, reviewItems: report.reviewQueue.length, report: 'qa-reports/knowledge-growth.json' }));
