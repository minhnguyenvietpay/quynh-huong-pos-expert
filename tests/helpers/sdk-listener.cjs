'use strict';
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
// The real listener source runs in a VM; zca-js/login/network are never loaded.
async function worker(options,root){
 const vm=require('node:vm'),assert=require('node:assert/strict');
 const deny=()=>{throw Error('NETWORK_FORBIDDEN');};
 for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}
 require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;
 const d=require(root+'/dialogue.js'),intent=require(root+'/intent.js');
 const handlers={},sent=[],inputs=[],tickets=[],errors=[],snapshots=[];
 const modules={
  './dialogue.js':{...d,processMessage:(group,user,text)=>{inputs.push({group,user,text});return d.processMessage(group,user,text);}},
  './intent.js':intent,'./state.js':{isDisabled:()=>false,setDisabled(){}},
  './incident.js':{create:value=>{tickets.push(value);return{id:'VP-SYNTHETIC-1'};}},
  './quality.js':{log(){}},'./qh-v43-language.js':{normalize:text=>({text,changed:false})}
 };
 if(fs.existsSync(root+'/lib/reply-context.cjs'))modules['./lib/reply-context.cjs']=require(root+'/lib/reply-context.cjs');
 const api={getOwnId:()=> '900',listener:{on:(name,fn)=>{handlers[name]=fn;},start(){}},sendMessage:async payload=>{sent.push(payload);}};
 let source=fs.readFileSync(root+'/listener.mjs','utf8');
 for(const statement of ["import { Zalo, ThreadType } from 'zca-js';","import { createRequire } from 'node:module';","import fs from 'node:fs';",'const require = createRequire(import.meta.url);'])source=source.replace(statement,'');
 let clock=Date.now();class Clock extends Date{static now(){return clock;}}
 // Resolver has its own module realm; inject test time through the listener's now callback.
 const env={QH_V13_ENABLED:'true',QH_V12_ENABLED:'false',QH_V11_ENABLED:'false',LOG_UNKNOWN:'false',TYPING_ENABLED:'false',COOLDOWN_MS:'0',REPLY_DELAY_MIN_MS:'0',REPLY_DELAY_MAX_MS:'0',STAFF_ZALO_IDS:'111,222',QH_CASE_ANALYSIS_GROUP_IDS:'G-A',GROUP_MODE:'allowlist',ALLOWED_GROUP_IDS:'G-A,G-B',MAX_REPLIES_PER_GROUP_PER_MINUTE:'100',AUTO_REPLY:'true',...options.env};
 const context=vm.createContext({Zalo:class{async loginQR(){return api;}},ThreadType:{Group:1},require:name=>{assert.ok(Object.hasOwn(modules,name),name);return modules[name];},fs:{appendFileSync:deny},process:{env},Date:Clock,console:{log(){},warn(){},error:()=>errors.push('handler-error')},setTimeout:fn=>{fn();return 0;}});
 await vm.runInContext(`(async()=>{${source}\n})()`,context);
 const refs=new Map(),delivered=new Map();let sequence=1000;
 const ids={ 'merchant-A':'301','merchant-B':'302','staff-A':'111','staff-B':'222','unknown-A':'401'};
 for(const item of options.events){
  if(item.kind==='advanceClock'){clock+=item.milliseconds;continue;}
  const ref=refs.get(item.reference||item.message);
  if(item.kind==='deleted'){
   if(handlers.undo)await handlers.undo({isGroup:true,threadId:item.group||ref?.threadId||'G-A',data:{uidFrom:ref?.data.uidFrom||'301',content:{globalMsgId:Number(ref?.data.msgId),cliMsgId:Number(ref?.data.cliMsgId),deleteMsg:1}}});
   snapshots.push({sent:sent.length,inputs:inputs.length,tickets:tickets.length});continue;
  }
  if(item.kind==='duplicate'){const prior=delivered.get(item.message);if(!prior)throw Error('invalid synthetic duplicate');await handlers.message(prior);snapshots.push({sent:sent.length,inputs:inputs.length,tickets:tickets.length});continue;}
  const id=String(++sequence),text=item.text||'';
  const event={type:1,threadId:item.group||'G-A',data:{uidFrom:ids[item.user]||item.user||'301',content:text,msgId:id,cliMsgId:String(sequence+10000)}};
  if(item.mentionBot)event.data.mentions=[{uid:item.mentionUid||'900',pos:0,len:'@Quỳnh Hương'.length,type:0}];
  if(item.kind==='reply')event.data.quote=item.quote||{ownerId:ref?.data.uidFrom||'301',globalMsgId:Number(ref?.data.msgId||999),cliMsgId:Number(ref?.data.cliMsgId||10999),msg:item.quoteText||ref?.data.content||'UNTRUSTED_UNSEEN_CONTENT'};
  if(item.message){refs.set(item.message,event);delivered.set(item.message,event);}
  await handlers.message(event);
  snapshots.push({sent:sent.length,inputs:inputs.length,tickets:tickets.length});
 }
 return {sent,inputs,tickets: tickets.length,errors,snapshots};
}
function run(options={}){
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v132-sdk-'));
 try{
  const root=options.root||path.resolve(__dirname,'../..');
  const source=`const fs=require('node:fs');(${worker.toString()})(${JSON.stringify(options)},${JSON.stringify(root)}).then(r=>process.stdout.write(JSON.stringify(r))).catch(()=>process.exit(2));`;
  const result=spawnSync(process.execPath,['-e',source],{encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,env:{PATH:process.env.PATH,QH_V13_ENABLED:'true',QH_V12_ENABLED:'false',QH_V11_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
  if(result.status!==0)throw Error('Isolated mocked SDK listener failed (output suppressed)');
  return JSON.parse(result.stdout);
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={run};
