const fs=require('node:fs');
const path=require('node:path');
const file=path.resolve(process.env.POS_CARE_STATE_FILE||'pos-care-state.json');
const TTL=Number(process.env.SESSION_TTL_MS||30*60*1000);
const MAX=2000;
let state={sessions:{},welcomed:{},disabledGroups:{}};
try {const x=JSON.parse(fs.readFileSync(file,'utf8'));if(x&&typeof x==='object')state={...state,...x};}catch{}
const now=()=>Date.now();
function prune(){for(const [k,v] of Object.entries(state.sessions))if(!v||now()-v.time>TTL)delete state.sessions[k];for(const [k,v] of Object.entries(state.welcomed))if(now()-v>86400000)delete state.welcomed[k];for(const k of ['sessions','welcomed']){const a=Object.keys(state[k]);for(const id of a.slice(0,Math.max(0,a.length-MAX)))delete state[k][id];}}
let lastSave=0;
function save(){prune();try{const tmp=file+'.tmp';fs.writeFileSync(tmp,JSON.stringify(state),{mode:0o600});fs.renameSync(tmp,file);lastSave=now();}catch(e){console.warn('[STATE WRITE]',e.message);}}
function getSession(k){prune();return state.sessions[k]||null;}
function setSession(k,v){state.sessions[k]=v;save();}
function deleteSession(k){delete state.sessions[k];save();}
function isWelcomed(k){prune();return Boolean(state.welcomed[k]);}
function welcome(k){state.welcomed[k]=now();save();}
function isDisabled(groupId){return !!state.disabledGroups[String(groupId)];}
function setDisabled(groupId,value){if(value)state.disabledGroups[String(groupId)]=true;else delete state.disabledGroups[String(groupId)];save();}
function reset(){state={sessions:{},welcomed:{},disabledGroups:{}};save();}
module.exports={getSession,setSession,deleteSession,isWelcomed,welcome,isDisabled,setDisabled,save,reset};
