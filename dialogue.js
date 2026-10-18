const {flows}=require('./flows');
const {searchKnowledge}=require('./search');
const {classify,normalize:norm,extractErrorCode,isIntroduction,isCompliment}=require('./intent');
const store=require('./state');
const quality=require('./quality');
const expert=require('./expert');
const conversation=require('./conversation');
const posDiagnostics=require('./pos-diagnostics');
const v12=require('./v12-brain');
const language=require('./qh-v43-language');
const {usableKnowledge}=require('./knowledge-policy');
const sessions={get:store.getSession,set:store.setSession,delete:store.deleteSession,has:k=>!!store.getSession(k)};
// Conversation state is kept per group + sender. It resets when the bot restarts.
const welcomed={get:k=>store.isWelcomed(k)?Date.now():null,set:(k,t)=>store.welcome(k),get size(){return 0;},delete:()=>{}};
const WELCOME_TTL=24*60*60*1000;
const now=()=>Date.now();
function wasWelcomed(k){const t=welcomed.get(k);return !!t && now()-t<WELCOME_TTL;}
function markWelcomed(k){store.welcome(k);}
function greeting(k,displayName=''){
 if(wasWelcomed(k))return '';
 markWelcomed(k);
 return 'Dạ, em chào anh/chị'+(displayName?' '+displayName:'')+'! Em là Quỳnh Hương, trợ lý hỗ trợ POS và thanh toán của Vietpay.\n\n';
}
// Rotate short social replies to reduce repetition, without random responses.
const replyCounts=new Map();
function vary(k,kind,variants){const id=k+':'+kind;const n=replyCounts.get(id)||0;replyCounts.set(id,n+1);if(replyCounts.size>4000)replyCounts.delete(replyCounts.keys().next().value);return variants[n%variants.length];}
function closing(q){if(/^(cam on|cam on em|thanks|thank you|thank|thank u|tks|thankyou|cam on nhe|cam on nha|cam on bot|cam on pos care)$/.test(q))return 'Cảm ơn anh/chị nhé! Khi cần hỗ trợ thêm, cứ nhắn em ạ.';if(/^(ok|oke|okay|ok roi|oke roi|duoc roi|on roi|xong roi|da xong|da duoc|het loi roi|khong can nua|da xu ly xong|xu ly duoc roi|ok em|ok nhe|ok nha|cam on da xu ly xong)$/.test(q))return 'Tốt quá ạ! Nếu phát sinh vấn đề khác, anh/chị cứ gọi Quỳnh Hương nhé.';return null;}
function greetingOnly(q){return /^(xin chao|chao|hello|hi|hey|alo|chao bot|chao pos care|pos care oi|bot oi|co ai ho tro khong)$/.test(q);}
const TTL=30*60*1000, MAX_SESSIONS=2000;
const key=(chat,user)=>JSON.stringify([String(chat),String(user)]);
function prune(){ /* state.js prunes expired sessions */ }
function hasSession(chat,user){prune();return sessions.has(key(chat,user));}
function sessionInfo(chat,user){prune();const s=sessions.get(key(chat,user));return s?{flowId:s.flowId,step:s.step,ageSeconds:Math.floor((now()-s.time)/1000)}:null;}
function prompt(flow,step){return `${step.ask}\n${step.options.map((o,i)=>`${i+1}. ${o[0]}`).join('\n')}\n\nAnh/chị trả lời số hoặc mô tả ngắn. /huy để kết thúc, /lai để bắt đầu lại.`;}
function nextStep(flow,answers,from){for(let i=from;i<flow.steps.length;i++)if(!flow.steps[i].when||flow.steps[i].when(answers))return i;return -1;}
function choice(step,q){if(/^[1-9]$/.test(q)){const n=+q-1;return n<step.options.length?n:-1;}const matches=[];step.options.forEach((o,i)=>{if(o.slice(1).some(v=>{const t=norm(v);return t===q||(q.length>=6&&t.length>=6&&(q.includes(t)||t.includes(q)));}))matches.push(i);});return matches.length===1?matches[0]:-1;}
function selectFlow(q){const c=classify(q);if(c.intent&&!c.ambiguous){const f=flows.find(x=>x.id===c.intent);if(f)return f;}const hits=flows.map(f=>({f,score:Math.max(0,...f.triggers.map(t=>{const p=norm(t);return (' '+q+' ').includes(' '+p+' ')?p.length:0;}))})).sort((a,b)=>b.score-a.score);return hits[0]?.score?hits[0].f:null;}
const caution='\n\n🔒 Không chia sẻ OTP, PIN, CVV, mật khẩu hoặc số thẻ đầy đủ trong nhóm.';
const safeAnswer=t=>String(t||'').slice(0,2800)+caution;
const isSensitive=q=>/\b(otp|cvv|pin|mat khau|password|ma xac thuc)\b/.test(q);
// Escalation is opt-in. Never claim a ticket was sent without an integration.
const escalation=new Map();
const pendingHandover=new Map();
const ESC_TTL=30*60*1000;
const yes=q=>/^(co|dong y|ok|oke|duoc|yes|chuyen di|gui di|can ho tro|nho em chuyen|chuyen giup|gui giup)$/.test(q);
const no=q=>/^(khong|khong can|thoi|no|huy|bo qua|chua can)$/.test(q);
const unresolved=q=>/\b(van|vẫn) (khong|ko|chua) (duoc|xu ly duoc|het|hoat dong)|\b(da|đã) (thu|lam) (het|roi|r) (ma|nhung) (van|vẫn)|\b(khong giai quyet duoc|khong xu ly duoc|can chuyen|chuyen cs|chuyen ops|bao cong ty|nho cong ty ho tro)\b/.test(q);
const looksAddress=q=>/\b(duong|phuong|quan|thanh pho|tp|so|ngo|hem|xa|huyen|tinh|street|district)\b/.test(q)||/\d+\s+[\p{L}]/u.test(q);
function createTicket(input){
 const description=String(input||'').trim().slice(0,800);
 return `📝 BẢN NHÁP YÊU CẦU HỖ TRỢ (CHƯA GỬI)\nSự cố: ${description||'Chưa có mô tả'}\nTên cửa hàng: Chưa cung cấp\nĐịa chỉ: Chưa cung cấp\nThời điểm / số tiền (nếu có): Chưa cung cấp\n\nCS/OPS sẽ tự tra cứu MID/TID. Không chia sẻ OTP, PIN, CVV hoặc số thẻ đầy đủ trong nhóm.`;
}
function escalationReply(k,raw,q){
 let e=escalation.get(k);
 if(e&&now()-e.time>ESC_TTL){escalation.delete(k);e=null;}
 if(!e)return undefined;
 if(no(q)){pendingHandover.delete(k);escalation.delete(k);return 'Vâng, em chưa lập yêu cầu chuyển tiếp. Khi cần, anh/chị cứ nhắn em nhé.';}
 if(e.step==='consent'){
  if(!yes(q))return 'Anh/chị có muốn em chuẩn bị yêu cầu để chuyển CS/OPS không ạ? Trả lời “có” hoặc “không” nhé.';
  e.step='name';e.time=now();return 'Anh/chị cho em xin tên cửa hàng để ghi vào yêu cầu hỗ trợ nhé.';
 }
 if(e.step==='name'){
  if(q.length<3||q.length>100)return 'Anh/chị cho em tên cửa hàng (không cần MID/TID) nhé.';
  e.name=raw.slice(0,100);e.step='address';e.time=now();return 'Cửa hàng ở địa chỉ nào ạ? Anh/chị cho em địa chỉ hoặc tên chi nhánh để CS/OPS xác định đúng nơi.';
 }
 if(e.step==='address'){
  if(q.length<5)return 'Anh/chị cho em địa chỉ cửa hàng hoặc tên chi nhánh cụ thể hơn nhé.';
  e.address=raw.slice(0,180);e.step='handover';e.time=now();
  pendingHandover.set(k,{name:e.name,address:e.address,issue:e.issue,time:now()});
  return `Em đã chuẩn bị yêu cầu hỗ trợ:\n\n🏪 Cửa hàng: ${e.name}\n📍 Địa chỉ/chi nhánh: ${e.address}\n🔧 Sự cố: ${e.issue}\n\nEm sẽ thông báo cho nhân viên hỗ trợ trong nhóm nếu xác định được đúng tài khoản Zalo của họ. Nếu không thể tag, em sẽ thông báo rõ để anh/chị liên hệ CS/OPS. Gõ “xong” để kết thúc.`;
 }
 if(e.step==='handover'||e.step==='confirm'){
  if(/^(xong|ok|oke|cam on|da gui|ket thuc)$/.test(q)){pendingHandover.delete(k);escalation.delete(k);return 'Em đã kết thúc phần chuẩn bị thông tin. Nếu cần hỗ trợ thêm, anh/chị cứ nhắn nhé.';}
  return 'Em đã ghi nhận yêu cầu. Nếu nhân viên chưa phản hồi, anh/chị có thể liên hệ CS/OPS qua kênh chính thức. Gõ “xong” để kết thúc.';
 }
 return undefined;
}
function offerEscalation(k,issue,consented=false){
 escalation.set(k,{step:consented?'name':'consent',issue:String(issue||'Chưa rõ sự cố').slice(0,350),time:now()});
 return consented?'Dạ anh, em sẽ chuẩn bị yêu cầu chuyển CS/OPS. Anh cho em xin tên cửa hàng nhé.':'Em chưa thể xử lý chắc chắn trường hợp này bằng hướng dẫn hiện có. Anh/chị có muốn em chuẩn bị yêu cầu để chuyển CS/OPS của Vietpay không ạ? Trả lời “có” hoặc “không”.';
}
function processMessage(chatId,userId,input,options={}){
 prune();const raw=String(input||'').trim().slice(0,1200),q=norm(raw),k=key(chatId,userId);
 if(!raw)return 'Anh/chị mô tả lỗi POS/QR/Portal để em hỗ trợ nhé.';
 // Session controls must precede consent/name/address handling.
 if(/^(\/(huy|done|reset|lai|restart)|huy|ket thuc|bat dau lai)$/.test(raw.toLowerCase()) || /^(huy|ket thuc|bat dau lai)$/.test(q)){
  escalation.delete(k);pendingHandover.delete(k);sessions.delete(k);v12.clear(chatId,userId);
  return /lai|restart/.test(q)?'Đã bắt đầu lại. Anh/chị mô tả sự cố mới nhé.':'Đã kết thúc phiên hỗ trợ. Khi cần, anh/chị mô tả sự cố mới nhé.';
 }
 if(isSensitive(q)||/(?:\d[ -]?){13,19}/.test(raw))return '⚠️ Không chia sẻ OTP, PIN, CVV, mật khẩu hay mã xác thực trong nhóm. Nếu cần hỗ trợ, liên hệ CS/OPS qua kênh chính thức.';
 if(/^\/ticket\b/i.test(raw))return createTicket(raw.slice(7));
 // Resolution/closure must preempt pending handover and all diagnostic modules.
 if(!/^\//.test(raw) && /^(binh thuong roi|may binh thuong roi|chay binh thuong roi|on roi|ok roi em|ok roi|het loi roi|in duoc roi|duoc roi|da xu ly xong|khong can ho tro nua)( em| anh)?$/.test(q)){
   escalation.delete(k);pendingHandover.delete(k);sessions.delete(k);v12.clear(chatId,userId);
   return 'Dạ tốt rồi anh! Em ghi nhận sự cố đã được xử lý. Nếu cần hỗ trợ thêm, anh cứ nhắn em nhé.';
 }
 if(escalation.has(k)){const result=escalationReply(k,raw,q);if(result!==undefined)return result;}
 // Expand only engine input; retain original merchant names/addresses above.
 const current=sessions.get(k);
 const engineInput=language.normalize(raw,{issue:current?.issue||current?.kind||null,stage:current?'question':null}).text;
 // Payment uncertainty precedes device troubleshooting, including an active printer session.
 if(!/^\//.test(raw)&&conversation.isPaymentUncertain(engineInput)){const paymentReply=conversation.reply(chatId,userId,engineInput);if(paymentReply)return paymentReply;}
 if(!/^\/(ticket|help|trogiup|huy|done|reset|lai|restart)/i.test(raw)){const r12=v12.reply(chatId,userId,engineInput);if(r12&&typeof r12==='object'&&r12.handover)return offerEscalation(k,r12.issue,true);if(r12)return r12;}
 if(!/^\/(ticket|help|trogiup|huy|done|reset|lai|restart)/i.test(raw)){const c=conversation.reply(chatId,userId,engineInput);if(c&&typeof c==='object'&&c.handover)return offerEscalation(k,c.issue,c.consented===true);if(c)return c;}
 if(!/^\/(ticket|help|trogiup|huy|done|reset|lai|restart)/i.test(raw)){const d=posDiagnostics.reply(chatId,userId,engineInput);if(d&&typeof d==='object'&&d.handover)return offerEscalation(k,d.issue);if(d)return d;}
 const done=closing(q);if(done){sessions.delete(k);markWelcomed(k);return done;}
 if(isIntroduction(raw)){markWelcomed(k);return 'Dạ, em là Quỳnh Hương, trợ lý hỗ trợ POS và thanh toán của Vietpay. Em có thể hướng dẫn xử lý sự cố POS, QR, mã lỗi, Merchant Portal và đối soát. Các vấn đề cần tra soát giao dịch sẽ được CS/OPS xác minh. Anh/chị cần hỗ trợ gì cứ nhắn em nhé!';}
if(isCompliment(raw)){markWelcomed(k);return vary(k,'compliment',['Em cảm ơn anh/chị ạ! Rất vui vì đã giúp được mình 😊','Cảm ơn anh/chị nhiều nhé! Có gì cần hỗ trợ cứ gọi em ạ.','Nghe anh/chị nói vậy em vui lắm! Em luôn sẵn sàng hỗ trợ.']);}
 const errorCode=extractErrorCode(raw);
 if(errorCode){
  const r=searchKnowledge(raw);
  if(r.status==='matched' && r.item && r.exactCode && usableKnowledge(r.item)){
   markWelcomed(k);return safeAnswer(`📌 ${r.item.title}\n\n${r.item.answer}\n\n⚠️ Ý nghĩa mã lỗi cần được CS/OPS xác nhận theo cấu hình ngân hàng/đơn vị xử lý giao dịch. Nếu đã thử mà vẫn không xử lý được, anh/chị báo lại để em hướng dẫn chuyển CS/OPS.`);
  }
  markWelcomed(k);return offerEscalation(k,`Mã lỗi ${errorCode}: ${raw}`);
 }
 if(greetingOnly(q)){if(!wasWelcomed(k))return greeting(k,options.displayName||'')+'Anh/chị cần em hỗ trợ vấn đề gì ạ?';return vary(k,'hello',['Em đây ạ! Anh/chị cần hỗ trợ gì thêm không?','Dạ, em nghe đây ạ.','Em đây, anh/chị cứ nói nhé!']);}
 if(['/help','/trogiup'].includes(raw.toLowerCase()))return 'Anh/chị mô tả vấn đề POS, QR, giao dịch hoặc Portal. Em sẽ hỏi thêm theo từng bước. /huy để kết thúc, /lai để bắt đầu lại.';
 if(unresolved(q)){sessions.delete(k);return offerEscalation(k,raw);}
 const expertReply=expert.reply(raw);
 if(expertReply){sessions.delete(k);markWelcomed(k);return expertReply;}
 let s=sessions.get(k);
 if(s){
  const f=flows.find(x=>x.id===s.flowId);
  if(!f){sessions.delete(k);return offerEscalation(k,raw);}
  const step=f.steps[s.step];if(!step){sessions.delete(k);return offerEscalation(k,raw);}
  const idx=choice(step,q);
  if(idx<0){
   const nf=selectFlow(q);
   if(nf&&nf.id!==f.id&&q.length>=10){sessions.set(k,{flowId:nf.id,step:0,answers:{},time:now()});return `Em chuyển sang vấn đề mới: ${nf.label}.\n\n${prompt(nf,nf.steps[0])}`;}
   // Do not keep the session alive indefinitely on unrelated group chatter.
   if(q.length>70)return null;
   s.time=now();sessions.set(k,s);return `Em chưa xác định được lựa chọn.\n\n${prompt(f,step)}`;
  }
  s.answers[step.id]=idx;s.time=now();sessions.set(k,s);const next=nextStep(f,s.answers,s.step+1);
  if(next>=0){s.step=next;sessions.set(k,s);return prompt(f,f.steps[next]);}
  sessions.delete(k);return safeAnswer(f.finish(s.answers));
 }
 const flow=selectFlow(q);
 if(flow){sessions.set(k,{flowId:flow.id,step:0,answers:{},time:now()});markWelcomed(k);return `Em cùng anh/chị kiểm tra ${flow.label.toLowerCase()} nhé.\n\n${prompt(flow,flow.steps[0])}`;}
 const r=searchKnowledge(raw);
 if(r.status==='matched'&&r.item){
  if(!usableKnowledge(r.item)){quality.log('knowledge_draft_blocked',{category:r.item.category||'unknown'});return offerEscalation(k,raw);}
  markWelcomed(k);return safeAnswer(`📌 ${r.item.title}\n\n${r.item.answer}\n\n⚠️ Nội dung tham khảo, chưa thay thế xác minh của CS/OPS.`);
 }
 if(r.status==='ambiguous')return 'Em thấy nhiều tình huống gần giống nhau. Anh/chị cho biết lỗi xảy ra trên POS, QR hay Portal và thông báo đang hiển thị ạ?';
 quality.log('unanswered',{category:'unknown'});expert.logGap(raw,'unanswered');return offerEscalation(k,raw);
}
function getPendingHandover(chat,user){const k=key(chat,user),pending=pendingHandover.get(k);if(pending&&now()-pending.time>ESC_TTL){pendingHandover.delete(k);escalation.delete(k);return null;}return pending||null;}
function markHandoverDone(chat,user){pendingHandover.delete(key(chat,user));}
module.exports={getPendingHandover,markHandoverDone,processMessage,hasSession,sessionInfo,norm,closing,greetingOnly,createTicket,hasEscalation:(chat,user)=>{const e=escalation.get(key(chat,user));return !!e&&now()-e.time<ESC_TTL;}};
