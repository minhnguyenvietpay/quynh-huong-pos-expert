'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
// Real listener + real dialogue in an isolated process; the SDK is never imported.
async function worker(options){
 const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
 const deny=()=>{throw Error('NETWORK_FORBIDDEN');};
 for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}
 require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;
 const d=require('./dialogue.js'),realIntent=require('./intent.js');
 const handlers={},sent=[],inputs=[],marked=[],tickets=[],errors=[];
 const modules={
  './dialogue.js':{...d,processMessage:(g,u,text)=>{inputs.push(text);return d.processMessage(g,u,text);},markHandoverDone:(...args)=>{marked.push(args);return d.markHandoverDone(...args);}},
  './intent.js':{...realIntent,detect:()=>({respond:false,reason:'synthetic-legacy-miss'})},
  './state.js':{isDisabled:()=>false,setDisabled:()=>{throw Error('unauthorized state change');}},
  './incident.js':{create:value=>{tickets.push(value);return{id:'VP-SYNTHETIC-1'};}},
  './quality.js':{log(){}},
  './qh-v43-language.js':{normalize:text=>({text:options.normalize?'máy không in được bill':text,changed:Boolean(options.normalize)})}
 };
 const api={listener:{on:(name,fn)=>{handlers[name]=fn;},start(){}},sendMessage:async payload=>{sent.push(payload);}};
 let source=fs.readFileSync('listener.mjs','utf8');
 for(const statement of ["import { Zalo, ThreadType } from 'zca-js';","import { createRequire } from 'node:module';","import fs from 'node:fs';",'const require = createRequire(import.meta.url);'])source=source.replace(statement,'');
 const context=vm.createContext({Zalo:class{async loginQR(){return api;}},ThreadType:{Group:1},require:name=>{assert.ok(Object.hasOwn(modules,name));return modules[name];},fs:{appendFileSync:deny},
  process:{env:{QH_V12_ENABLED:options.mode==='default'?'false':'true',QH_V11_ENABLED:'false',LOG_UNKNOWN:'false',TYPING_ENABLED:'false',COOLDOWN_MS:'0',REPLY_DELAY_MIN_MS:'0',REPLY_DELAY_MAX_MS:'0',STAFF_ZALO_IDS:'111,222',GROUP_MODE:'allowlist',ALLOWED_GROUP_IDS:'synthetic-group',AUTO_REPLY:options.dry?'false':'true'}},
  console:{log(){},warn(){},error:()=>errors.push('handler-error')},setTimeout:fn=>{fn();return 0;}});
 await vm.runInContext(`(async()=>{${source}\n})()`,context);
 for(const [i,item] of options.messages.entries()){
  const message=typeof item==='string'?{text:item}:item;
  await handlers.message({type:1,threadId:message.group||'synthetic-group',data:{uidFrom:'synthetic-user',content:message.text,msgId:message.id||'synthetic-'+i}});
 }
 return {sent,inputs,marked,ticketCount:tickets.length,errors,context:d.v12Context('synthetic-group','synthetic-user')};
}
function isolated(options){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v122-listener-'));
 try{
  const result=spawnSync(process.execPath,['-e',`(${worker.toString()})(${JSON.stringify(options)}).then(r=>process.stdout.write(JSON.stringify(r))).catch(()=>process.exit(1));`],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V12_ENABLED:options.mode==='default'?'false':'true',QH_V11_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
  assert.equal(result.status,0,'isolated SDK-mocked listener completed');
  return JSON.parse(result.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
test('V12 listener preserves raw Vietnamese and uses improved diagnostic response with V11 flag off',()=>{
 const raw='máy không in bill, chưa kiểm tra giấy';
 const result=isolated({normalize:true,messages:[raw]});
 assert.deepEqual(result.errors,[]);assert.equal(result.inputs[0],raw);assert.equal(result.sent.length,1);
 assert.match(result.sent[0].msg,/giấy.*(?:chạy|ra)|(?:chạy|ra).*giấy/iu);
 assert.equal(result.context.topic,'printer');assert.equal(result.ticketCount,0);
 assert.doesNotMatch(result.sent[0].msg,/sau các bước đã thử|OPS đã tiếp nhận/iu);
});
test('V12 real listener requires explicit OPS consent before collecting handover details and sending mentions',()=>{
 const prefix=['máy POS vẫn treo đã khởi động rồi'];
 const rejected=isolated({messages:[...prefix,'không đồng ý chuyển OPS']});
 assert.equal(rejected.ticketCount,0);assert.equal(rejected.marked.length,0);
 assert.ok(rejected.sent.every(p=>!p.mentions));
 const approved=isolated({messages:[...prefix,'đồng ý chuyển OPS','Cửa hàng Kiểm Thử','12 Đường Giả Lập']});
 assert.deepEqual(approved.errors,[]);assert.equal(approved.ticketCount,1);assert.equal(approved.marked.length,1);
 assert.match(approved.sent[1].msg,/tên cửa hàng/iu);
 assert.deepEqual(approved.sent.at(-1).mentions.map(m=>m.uid),['111','222']);
 assert.doesNotMatch(approved.sent.map(p=>p.msg).join('\n'),/(?:gửi|cung cấp|xin).{0,35}\b(?:MID|TID)\b/iu);
});
test('V12 transport retains allowlist, admin authorization, dedupe and dry-run controls',()=>{
 const text='máy cà thẻ nuốt giấy';
 const result=isolated({messages:[{text,group:'forbidden'},'/bot off',{text,id:'repeat'},{text,id:'repeat'}]});
 assert.deepEqual(result.errors,[]);assert.equal(result.sent.length,1);assert.equal(result.inputs.length,1);
 const dry=isolated({dry:true,messages:[text]});assert.equal(dry.sent.length,0);assert.equal(dry.inputs.length,0);
});

for(const mode of ['default','v12']){
 test('V13 reported greeting/introduction/decline uses real listener without OPS: '+mode,()=>{
  const result=isolated({mode,normalize:true,messages:['@Quỳnh Hương hi em','@Quỳnh Hương em giới thiệu đi','Không']});
  assert.deepEqual(result.errors,[]);
  assert.equal(result.inputs.length,3,'short social followup must stay in its addressed conversation');
  assert.equal(result.sent.length,3);
  assert.match(result.sent[0].msg,/chào|Quỳnh Hương/iu);
  assert.match(result.sent[1].msg,/Quỳnh Hương|trợ lý/iu);
  assert.equal(result.ticketCount,0);assert.equal(result.marked.length,0);
  assert.ok(result.sent.every(p=>!p.mentions));
  assert.doesNotMatch(result.sent.map(p=>p.msg).join(' '),/đồng ý.{0,30}(?:CS|OPS)|(?:xin|cung cấp).{0,20}(?:tên cửa hàng|địa chỉ)/iu);
 });
}
