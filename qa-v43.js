'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {normalize}=require('./qh-v43-language');
const root=path.resolve(process.env.QH_ROOT||process.cwd());
const out=path.join(root,'qa-reports','v43');
const cases=[
 ['may k in dc bill','printer_problem'],['máy ko in đc hóa đơn','printer_problem'],['may hok in hoa don','printer_problem'],['máy không in được hóa đơn','printer_problem'],
 ['khách bị trừ tiền r','payment_review'],['khach ck r ma chua thay','payment_review'],
 ['chưa đc','unresolved'],['van k dc','unresolved'],
 ['đúng r','affirmative_answer',null,'question'],['dung roi e','affirmative_answer',null,'question'],
 ['k','negative_answer',null,'question'],['ko e','negative_answer',null,'question'],
 ['ok r e','resolved','printer'],['bth r','resolved','printer'],['ok r e','social'],
 ['cảm ơn em','thanks'],['may do r e','frozen'],
 ['dk','unknown'],['ch','unknown'],['bt','unknown']
];
const dialogues=[
 {name:'printer_resolved',turns:[['máy k in dc bill','printer_problem'],['ok r e','resolved']],issue:'printer'},
 {name:'printer_still_failing',turns:[['may ko in dc hd','printer_problem'],['chưa đc','unresolved']],issue:'printer'},
 {name:'payment_switch',turns:[['máy k in bill','printer_problem'],['khách bị trừ tiền r','payment_review']],issue:'printer'},
 {name:'negative_answer',turns:[['máy k in dc bill','printer_problem'],['k','negative_answer']],issue:'printer',stage:'question'},
 {name:'positive_answer',turns:[['máy k in dc bill','printer_problem'],['đúng r','affirmative_answer']],issue:'printer',stage:'question'}
];
function run(){let results=[];for(const [input,expected,issue,stage] of cases){const got=normalize(input,{issue,stage});results.push({type:'abbreviation',input,expected,actual:got.intent,normalized:got.text,pass:got.intent===expected});}
for(const flow of dialogues){for(const [i,[input,expected]] of flow.turns.entries()){const got=normalize(input,{issue:i?flow.issue:null,stage:i?flow.stage:null});results.push({type:'dialogue',scenario:flow.name,turn:i+1,input,expected,actual:got.intent,pass:got.intent===expected});}}
const passed=results.filter(x=>x.pass).length;const report={version:'4.3',at:new Date().toISOString(),mode:'offline-deterministic',total:results.length,passed,failed:results.length-passed,status:passed===results.length?'PASS':'FAIL',scope:'Language normalizer + scripted multi-turn expectations. Does not test live Zalo or guarantee dialogue.js correctness.',results};fs.mkdirSync(out,{recursive:true});const p=path.join(out,'latest.json');const temp=p+'.'+process.pid+'.tmp';fs.writeFileSync(temp,JSON.stringify(report,null,2));fs.renameSync(temp,p);console.log(JSON.stringify({status:report.status,total:report.total,passed,failed:report.failed,report:p}));return report;}
if(require.main===module){const r=run();if(r.status!=='PASS')process.exitCode=1;}
module.exports={run};
