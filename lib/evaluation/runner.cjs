'use strict';
// Child process only: set all persistence paths before importing application modules.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const scratch=fs.mkdtempSync(path.join(os.tmpdir(),'qh-synthetic-eval-'));
try {
 for(const [key,file] of Object.entries({POS_CARE_STATE_FILE:'state.json',POS_CARE_EVENTS_FILE:'events.jsonl',POS_CARE_TICKETS_FILE:'tickets.jsonl'})) process.env[key]=path.join(scratch,file);
 process.env.QH_GAP_LOG='0';
 const root=path.resolve(process.argv[2]);const dataset=JSON.parse(fs.readFileSync(process.argv[3],'utf8'));
 const dialogue=require(path.join(root,'dialogue.js')),intent=require(path.join(root,'intent.js'));
 const rows=dataset.cases.map((fixture,index)=>{
  const chat='synthetic-golden-'+index,user='synthetic-merchant';const turns=[];
  for(const input of fixture.turns){
   const reply=dialogue.processMessage(chat,user,input);const pending=dialogue.getPendingHandover(chat,user);
   turns.push({input,reply,intent:intent.classify(input).intent||null,state:{session:dialogue.hasSession(chat,user),escalation:dialogue.hasEscalation(chat,user),pending:Boolean(pending),pendingName:pending?.name||null,pendingAddress:pending?.address||null}});
  }
  return {fixtureId:fixture.id,turns};
 });
 process.stdout.write(JSON.stringify(rows));
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
