const {log,summarize}=require('./quality');
const crypto=require('node:crypto');
const path=require('node:path');
const fs=require('node:fs');
const FILE=path.resolve(process.env.POS_CARE_TICKETS_FILE||'pos-care-tickets.jsonl');
function clean(s,max=300){return String(s||'').replace(/[\r\n]+/g,' ').slice(0,max)}
function create(data){const id='VP-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(2).toString('hex');const row={id,at:new Date().toISOString(),status:'OPEN',groupId:clean(data.groupId,40),senderId:clean(data.senderId,40),store:clean(data.name,100),address:clean(data.address,180),issue:clean(data.issue,400)};fs.appendFileSync(FILE,JSON.stringify(row)+'\n',{mode:0o600});log('ticket_created',{ticketId:id,groupId:row.groupId});return row;}
function get(id){try{return fs.readFileSync(FILE,'utf8').split('\n').filter(Boolean).map(x=>JSON.parse(x)).reverse().find(x=>x.id===id)||null}catch{return null}}
function status(id,status,actor){if(!['ACKNOWLEDGED','IN_PROGRESS','WAITING_BANK','RESOLVED','CLOSED'].includes(status))return null;const old=get(id);if(!old)return null;const update={...old,status,updatedAt:new Date().toISOString(),actor:clean(actor,40)};fs.appendFileSync(FILE,JSON.stringify(update)+'\n',{mode:0o600});log('ticket_status',{ticketId:id,status});return update;}
module.exports={create,get,status};
