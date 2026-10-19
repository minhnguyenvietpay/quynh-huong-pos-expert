'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
test('resolved printer is absent from resumed nested topics while uncertain payment stays pending',()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v13-response-review-'));
 try{
 const root=path.resolve(__dirname,'..'),turns=['Khách bị trừ tiền nhưng POS không thấy giao dịch','Máy in bill trắng','Giấy đúng rồi, giờ bill in rõ','Máy lại mất mạng SIM','SIM có mạng lại rồi, còn giao dịch lúc nãy thì sao?'];
 const script=`const d=require(${JSON.stringify(path.join(root,'dialogue.js'))});const actual=${JSON.stringify(turns)}.map(x=>d.processMessage('synthetic-review','synthetic-user',x));process.stdout.write(JSON.stringify({actual,last:d.v12Context('synthetic-review','synthetic-user')}));`;
 const child=cp.spawnSync(process.execPath,['-e',script],{encoding:'utf8',env:{...process.env,QH_V11_ENABLED:'false',QH_V12_ENABLED:'true',QH_V13_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(tmp,'state.json'),POS_CARE_EVENTS_FILE:path.join(tmp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(tmp,'tickets.jsonl')}});
 assert.equal(child.status,0);const run=JSON.parse(child.stdout);assert.equal(run.last.pendingVerification,true);assert.equal(run.last.topic,'debit');assert.doesNotMatch(run.actual.at(-1),/còn máy in|tiếp tục.{0,15}máy in/iu);assert.match(run.actual.at(-1),/giao dịch.{0,20}(?:chưa xác minh|xác minh)/iu);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
