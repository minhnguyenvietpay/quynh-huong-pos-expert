'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cases=[
 {id:'r1-greeting-payment-mixed',turns:['Hi em, khách báo bị trừ tiền mà POS báo lỗi, có quẹt lại không?','Tôi chưa kiểm tra xong, khách đang giục thanh toán lại'],type:'payment'},
 {id:'r5-social-payment-same-turn',turns:['Chào em, giới thiệu để sau nhé, giờ khách bị trừ tiền mà POS báo lỗi, tôi có nên thu thêm lần nữa không?','Cảm ơn, nhưng tôi vẫn chưa rõ kết quả; chưa đồng ý chuyển OPS'],type:'payment'},
 {id:'r5-hazard-secret-offer',turns:['Máy đang sạc thì pin phồng, có mùi khét; có cần tôi gửi OTP hoặc PIN cho em kiểm tra không?','Tôi đã ngừng sạc, giờ bật thử lại được chưa?'],type:'hazard'}
];
for(const scenario of cases)test('multi-turn counterpart for frozen probe '+scenario.id,()=>{
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'qh-v13-followup-'));
 try{
 const root=path.resolve(__dirname,'..'),script=`const d=require(${JSON.stringify(path.join(root,'dialogue.js'))});process.stdout.write(JSON.stringify(${JSON.stringify(scenario.turns)}.map(input=>({actual:d.processMessage('synthetic-followup','synthetic-user',input),context:d.v13Context('synthetic-followup','synthetic-user'),pending:!!d.getPendingHandover('synthetic-followup','synthetic-user'),escalation:d.hasEscalation('synthetic-followup','synthetic-user')}))));`;
 const c=cp.spawnSync(process.execPath,['-e',script],{encoding:'utf8',env:{...process.env,QH_V11_ENABLED:'false',QH_V12_ENABLED:'false',QH_V13_ENABLED:'true',QH_GAP_LOG:'0',POS_CARE_STATE_FILE:path.join(tmp,'state.json'),POS_CARE_EVENTS_FILE:path.join(tmp,'events.jsonl'),POS_CARE_TICKETS_FILE:path.join(tmp,'tickets.jsonl')}});assert.equal(c.status,0);const turns=JSON.parse(c.stdout),last=turns.at(-1);
 for(const turn of turns){assert.equal(turn.pending,false);assert.equal(turn.escalation,false);assert.equal(turn.context?.consent,false);}
 if(scenario.type==='payment'){assert.equal(last.context.pendingVerification,true);assert.match(last.actual,/(?:chưa|không).{0,35}(?:thu|thanh toán|quẹt).{0,15}lại/iu);assert.doesNotMatch(last.actual,/xin.{0,15}tên cửa hàng|đã hoàn tiền|giao dịch đã thành công/iu);}
 else{assert.equal(last.context.currentQuestion,'battery-safe');assert.match(last.actual,/không.{0,20}(?:bật|sử dụng|sạc)|ngừng.{0,15}(?:sử dụng|sạc)/iu);assert.match(turns[0].actual,/(?:không|đừng).{0,25}(?:gửi|cung cấp|chia sẻ).{0,20}(?:OTP|PIN)|không chia sẻ OTP/iu);}
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
