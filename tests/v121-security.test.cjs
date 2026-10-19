'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
for(const withdrawal of ['không gửi nữa','đừng gửi','thôi khỏi gửi','em dừng gửi giúp anh']){
 test('V12.1 withdrawal during address collection revokes consent: '+withdrawal,()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v121-security-'));
  try{
   const source=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;const d=require('./dialogue');const g='synthetic-revocation',u='synthetic-user';const replies=[];for(const q of ['máy POS vẫn treo đã khởi động rồi','đồng ý chuyển OPS','Cửa hàng Giả Lập',${JSON.stringify(withdrawal)}])replies.push(d.processMessage(g,u,q));console.log(JSON.stringify({replies,pending:d.getPendingHandover(g,u),context:d.v12Context(g,u)}));`;
   const result=spawnSync(process.execPath,['-e',source],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V12_ENABLED:'true',QH_V11_ENABLED:'true',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
   assert.equal(result.status,0,'synthetic dialogue must complete offline');
   const value=JSON.parse(result.stdout);
   assert.match(value.replies[1],/tên cửa hàng/iu,'precondition: explicit consent accepted');
   assert.match(value.replies[2],/địa chỉ|chi nhánh/iu,'precondition: address collection active');
   assert.equal(value.pending,null,'withdrawal must never become a merchant address or pending handover');
   assert.equal(value.context,null,'withdrawal must clear consent and diagnostic context');
   assert.match(value.replies[3],/dừng|chưa chuyển|không chuyển|thu hồi/iu);
   assert.doesNotMatch(value.replies[3],/đã chuẩn bị yêu cầu hỗ trợ|địa chỉ\/chi nhánh:/iu);
  }finally{fs.rmSync(temp,{recursive:true,force:true});}
 });
}

const credentialCases=[
 ['API key',()=>['sk','-proj-','A'.repeat(36)].join('')],
 ['access token',()=>['SYNTHETIC','ACCESS','PRIVATE','V121'].join('_')],
 ['Zalo session',()=>['SYNTHETIC','SESSION','PRIVATE','V121'].join('_')],
 ['cookie',()=>['SYNTHETIC','COOKIE','PRIVATE','V121'].join('_')]
];
for(const [kind,makeMarker] of credentialCases){
 for(const destination of ['ticket','name','address']){
  test('V12.1 credential is neither echoed nor collected: '+kind+' at '+destination,()=>{
   const temp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v121-privacy-'));
   try{
    const marker=makeMarker();
    const input=kind+' '+marker;
    const prefix=destination==='ticket'?[]:['máy POS vẫn treo đã khởi động rồi','đồng ý chuyển OPS',...(destination==='address'?['Cửa hàng Giả Lập']:[])];
    const source=`const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;const d=require('./dialogue'),g='synthetic-privacy',u='synthetic-user';for(const q of ${JSON.stringify(prefix)})d.processMessage(g,u,q);const marker=${JSON.stringify(marker)};const first=d.processMessage(g,u,${JSON.stringify((destination==='ticket'?'/ticket ':'')+input)});const second=${destination==='name'?"d.processMessage(g,u,'12 đường Giả Lập')":"''"};const pending=d.getPendingHandover(g,u),context=d.v12Context(g,u);console.log(JSON.stringify({firstBlocked:/không chia sẻ|không cung cấp|không gửi|thông tin nhạy cảm/iu.test(first),echoed:[first,second].some(r=>r.includes(marker)),stored:JSON.stringify({pending,context}).includes(marker),pending:!!pending}));`;
    const result=spawnSync(process.execPath,['-e',source],{cwd:path.join(__dirname,'..'),encoding:'utf8',timeout:20000,env:{PATH:process.env.PATH,QH_V12_ENABLED:'true',QH_V11_ENABLED:'true',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(temp,'state.json'),POS_CARE_EVENTS_FILE:path.join(temp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(temp,'tickets.jsonl')}});
    assert.equal(result.status,0,'synthetic dialogue must complete offline');
    const value=JSON.parse(result.stdout);
    assert.equal(value.echoed,false,'credential must never appear in a reply');
    assert.equal(value.stored,false,'credential must never enter handover or engine context');
    assert.equal(value.pending,false,'credential must not be accepted as merchant name/address');
    assert.equal(value.firstBlocked,true,'sensitive input must receive explicit safety guidance');
   }finally{fs.rmSync(temp,{recursive:true,force:true});}
  });
 }
}
