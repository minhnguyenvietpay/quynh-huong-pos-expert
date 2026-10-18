#!/usr/bin/env node
'use strict';
// V11 permits local planning only. Codex is a development tool, not a paid runtime.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {discover,select}=require('../lib/improvement/index.cjs');
const root=path.resolve(__dirname,'..');
function main(argv){
 const mode=argv[0]||'plan';
 // This guard precedes filesystem, Git, environment credentials and subprocess access.
 if(mode==='run')throw Error('V11_ZERO_COST: paid inference and automatic API coding are disabled');
 if(mode!=='plan')throw Error('Only local plan mode is supported by V11');
 const index=argv.indexOf('--report');if(index<0||!argv[index+1])throw Error('Specify --report <offline-report-or-safe-monitor-snapshot.json>');
 const report=JSON.parse(fs.readFileSync(argv[index+1],'utf8'));
 const historyPath=path.join(root,'qa-reports','improvement','history.jsonl');
 const history=fs.existsSync(historyPath)?fs.readFileSync(historyPath,'utf8').split('\n').filter(Boolean).map(JSON.parse):[];
 const base=cp.execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 console.log(JSON.stringify({mode:'plan',base,clusters:discover(report),selected:select(report,history,base),aiExecuted:false},null,2));
}
if(require.main===module){try{main(process.argv.slice(2));}catch(error){console.error(error.message.startsWith('V11_ZERO_COST:')?'V11_ZERO_COST: paid inference and automatic API coding are disabled':'V11_PLAN_INVALID: local report or repository unavailable');process.exitCode=1;}}
module.exports={main};
