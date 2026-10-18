#!/usr/bin/env node
'use strict';
// Offline policy tripwires; this is not a secret scanner or a security proof.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ARTIFACT = /(?:^|\/)(?:\.env(?:\..+)?|[^/]*(?:cookie|credential)[^/]*|session(?:s)?(?:\.[^/]*)?|qr\.(?:png|jpe?g)|pos-care-(?:events|metrics|state)[^/]*\.(?:jsonl?|log)|[^/]+\.(?:pem|key))$/i;
const SECRET = /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-(?:proj-)?[A-Za-z0-9_-]{24,})\b|\b(?:api[_-]?key|access[_-]?token|client[_-]?secret|password)\s*[:=]\s*["'][^"'\r\n]{16,}["']/ig;
function scan(root, { includeUntracked = false } = {}) {
  const args = ['ls-files', '-z', '--cached'];
  if (includeUntracked) args.push('--others', '--exclude-standard');
  const files = [...new Set(execFileSync('git', args, {cwd: root, encoding: 'utf8'}).split('\0').filter(Boolean))];
  const violations = [];
  const add = (file, rule, line) => violations.push({file, rule, ...(line ? {line} : {})});
  for (const file of files) {
    const full = path.join(root, file);
    let stat;
    try { stat = fs.lstatSync(full); } catch (e) { if (e.code === 'ENOENT') continue; throw e; }
    if (stat.isSymbolicLink()) { add(file, 'tracked-symlink-review'); continue; }
    if (!stat.isFile()) continue;
    if (ARTIFACT.test(file) && !/(?:^|\/)\.env\.example$/.test(file)) add(file, 'sensitive-runtime-artifact');
    if (stat.size > 32 * 1024 * 1024) { add(file, 'oversized-file-review'); continue; }
    const source = fs.readFileSync(full, 'utf8');
    source.split('\n').forEach((line, i) => {
      SECRET.lastIndex = 0;
      if (SECRET.test(line)) add(file, 'possible-hardcoded-secret', i + 1);
    });
    if (!/^\.github\/workflows\/[^/]+\.ya?ml$/.test(file)) continue;
    if (/\bpull_request_target\s*:/.test(source)) add(file, 'privileged-pr-trigger');
    const codingOptIn = file === '.github/workflows/autonomous-coding.yml'
      && /\bworkflow_dispatch\s*:/.test(source)
      && /QH_OPT_IN_CODING_WORKFLOW:\s*['"]?true['"]?/.test(source)
      && !/^\s*(?:pull_request|push|schedule)\s*:/m.test(source);
    if (/\b(?:write-all|[a-z-]+:\s*write)\b/.test(source) && !codingOptIn) add(file, 'workflow-write-permissions');
    // Check run blocks and npm scripts transitively; importing the offline engine is allowed.
    const packageFile = path.join(root, 'package.json');
    let scripts = {};
    if (fs.existsSync(packageFile)) scripts = JSON.parse(fs.readFileSync(packageFile, 'utf8')).scripts || {};
    const commands = [];
    let inRun = false;
    let runIndent = 0;
    for (const line of source.split('\n')) {
      const match = line.match(/^(\s*)(?:-\s*)?run:\s*(.*)$/);
      if (match) { inRun = true; runIndent = match[1].length; commands.push(match[2]); }
      else if (inRun && /^\s*\S/.test(line)) {
        if (line.match(/^\s*/)[0].length > runIndent) commands.push(line.trim());
        else inRun = false;
      }
    }
    const expanded = commands.join('\n');
    const queue = [...expanded.matchAll(/\bnpm\s+(?:run\s+)?([\w:-]+)/g)].map(m => m[1]);
    const seen = new Set();
    while (queue.length) {
      const key = queue.pop();
      if (seen.has(key)) continue;
      seen.add(key);
      if (scripts[key]) {
        commands.push(scripts[key]);
        queue.push(...[...scripts[key].matchAll(/\bnpm\s+(?:run\s+)?([\w:-]+)/g)].map(m => m[1]));
      }
    }
    if (/(?:\bnode\s+(?:[^\s]+\/)?(?:listener\.mjs|test-typing\.mjs)|\bnpm\s+(?:run\s+)?start\b|\bloginQR\s*\(|\bzca-js\b)/i.test(commands.join('\n'))) add(file, 'live-zalo-ci-command');
  }
  return {filesScanned: files.length, violations};
}
if (require.main === module) {
  try {
    const result = scan(process.cwd(), {includeUntracked: process.argv.includes('--include-untracked')});
    console.log(JSON.stringify(result, null, 2)); // Never include matching source or credential values.
    process.exitCode = result.violations.length ? 1 : 0;
  } catch { console.error('Security policy check failed; unable to inspect repository.'); process.exitCode = 2; }
}
module.exports = {scan};
