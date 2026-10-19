'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
function run(source,flag='true'){
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v13-activation-'));
 try{
  const deny=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const n of ['http','https']){require('node:'+n).request=deny;require('node:'+n).get=deny;}require('node:net').connect=deny;require('node:tls').connect=deny;global.fetch=deny;`;
  const p=spawnSync(process.execPath,['-e',deny+source],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V13_ENABLED:flag,QH_V12_ENABLED:'false',QH_V11_ENABLED:'false',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(tmp,'state.json'),POS_CARE_EVENTS_FILE:path.join(tmp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(tmp,'tickets.jsonl')}});
  assert.equal(p.status,0,'offline isolated activation completes');return JSON.parse(p.stdout);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
}
const setup=`const d=require('./dialogue');const g='synthetic-activation',u='synthetic-user';const response=d.processMessage(g,u,'máy không in bill');`;
test('V13-only flag activates actual advanced dialogue context',()=>{
 const r=run(setup+`console.log(JSON.stringify({response,eligible:d.shouldRespondV13('máy không in bill'),context:d.v12Context(g,u)}));`);
 assert.equal(r.eligible,true);assert.equal(r.context?.topic,'printer');assert.match(r.response,/giấy|bill|in/iu);
});
for(const flag of ['TRUE','1'])test('V13 flag requires exact true: '+flag,()=>{
 const r=run(setup+`console.log(JSON.stringify({eligible:d.shouldRespondV13('máy không in bill'),context:d.v12Context(g,u)}));`,flag);
 assert.equal(r.eligible,false);assert.equal(r.context,null);
});
test('V13-only optional module missing safely selects unchanged V11 fallback',()=>{
 const source=`const Module=require('node:module'),load=Module._load;Module._load=function(request,...args){if(request==='./lib/v12/engine.cjs')throw Error('SYNTHETIC_PRIVATE_EXCEPTION');return load.call(this,request,...args);};`+setup+`console.log(JSON.stringify({response,eligible:d.shouldRespondV13('máy không in bill'),context:d.v12Context(g,u)}));`;
 const r=run(source);const v11=require('../lib/v11/engine.cjs').createEngine();
 assert.equal(r.response,v11.reply('synthetic-baseline','synthetic-user','máy không in bill'));
 assert.equal(r.eligible,false);assert.equal(r.context,null);assert.doesNotMatch(r.response,/SYNTHETIC_PRIVATE_EXCEPTION/);
});
test('V13-only reply fault clears partial context and safely selects V11',()=>{
 const r=run(`const e=require('./lib/v12/engine.cjs'),reply=e.reply;e.reply=(...args)=>{reply(...args);throw Error('SYNTHETIC_PRIVATE_EXCEPTION')};`+setup+`console.log(JSON.stringify({response,context:d.v12Context(g,u),pending:d.getPendingHandover(g,u)}));`);
 const v11=require('../lib/v11/engine.cjs').createEngine();assert.equal(r.response,v11.reply('synthetic-baseline','synthetic-user','máy không in bill'));
 assert.equal(r.context,null);assert.equal(r.pending,null);assert.doesNotMatch(r.response,/SYNTHETIC_PRIVATE_EXCEPTION/);
});
