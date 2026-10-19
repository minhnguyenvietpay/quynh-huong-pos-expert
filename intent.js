// POS Care V6.1 - Vietnamese intent recognition (offline, no AI API).
const normalize = s => String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
const groups = {
 frozen: [
  ['pos','may','thiet bi','man hinh','terminal'],
  ['do','treo','lag','dung','khong bam','khong thao tac','khong phan hoi','khong an','bi ket','bi cham','khong len nguon','den man hinh','man hinh den','sap nguon','tat nguon','restart','khoi dong lai','khong bat duoc']
 ],
 payment: [
  ['khach','the','tai khoan','tien','thanh toan','giao dich','quet','quẹt','pos','may'],
  ['tru tien','mat tien','tru roi','da tru','tru 2 lan','tru hai lan','double charge','fail','that bai','khong thanh cong','pending','processing','xoay vong','quay vong','quay mai','treo giao dich','khong nhan duoc tien','khach bao tru','chua nhan tien']
 ],
 qr: [
  ['qr','ma qr','quet ma','ma thanh toan','vietqr','upi'],
  ['loi','khong hien','khong ra','khong len','khong tao','khong quet','khong duoc','treo','xoay','quay','thieu','mat','sai','khong nhan','khong thay','khong co','khong vao','bao loi']
 ],
 refund: [
  ['refund','hoan tien','hoan tra','hoan mot phan','partial refund','void','huy giao dich','reversal','dao giao dich','tra lai tien','khach doi hoan'],
  []
 ],
 portal: [
  ['portal','merchant portal','doi soat','settlement','payout','bao cao','cuoi ca','chi nhanh','tid','mid','sao ke','quyet toan','chuyen tien'],
  ['khong thay','khong hien','khong co','sai','lech','thieu','khong khop','chua ve','chua nhan','chua duoc','bao nhieu','kiem tra','tre','loi','khac nhau','khong dong bo']
 ]
};
const wordMatch=(s,p)=>(' '+s+' ').includes(' '+p+' ');
function classify(input){
 const n=normalize(input);if(!n)return {intent:null,score:0,reason:'empty'};
 const scores=[];
 for(const [intent,[entities,issues]] of Object.entries(groups)){
  const e=entities.filter(p=>wordMatch(n,p));const i=issues.filter(p=>wordMatch(n,p));
  let score=0;
  if(intent==='refund')score=e.length?0.96:0;
  else if(e.length&&i.length)score=Math.min(0.97,0.76+Math.min(e.length-1,2)*0.04+Math.min(i.length-1,2)*0.05);
  else if(e.length&&['qr','portal'].includes(intent)&&n.split(' ').length<=5)score=0.65;
  else if(e.length&&i.length===0&&intent==='payment'&&wordMatch(n,'giao dich'))score=0.25;
  scores.push({intent,score});
 }
 // If QR is explicitly mentioned, QR diagnostics take precedence over generic payment issues.
 if(wordMatch(n,'qr')||wordMatch(n,'vietqr')||wordMatch(n,'upi')){
  const qr=scores.find(x=>x.intent==='qr');if(qr.score>=0.65)qr.score=Math.min(0.99,qr.score+0.12);
 }
 scores.sort((a,b)=>b.score-a.score);
 const best=scores[0],second=scores[1];
 return {intent:best.score>=0.65?best.intent:null,score:best.score,ambiguous:best.score>=0.65&&second.score>=0.65&&best.score-second.score<0.04,reason:best.score>=0.65?'matched':'insufficient_signal'};
}
const SUPPORT_TERMS=['pos','may pos','may quet the','giao dich','thanh toan','qr','portal','refund','hoan tien','doi soat','settlement','payout','bill','tid','mid','the','quet the','may','bao cao','cuoi ca'];
function extractErrorCode(input){
 const n=normalize(input);
 const m=n.match(/(?:\b(?:ma\s+)?loi|\bma|\bcode|\berror)\s*(?:so\s*)?(?:e\s*)?(\d{2,3})\b/);
 if(m) return m[1];
 const p=n.match(/\b(?:pos|may pos|terminal)\b.{0,45}\b(?:bao|bi|hien|hien thi)?\s*loi\s*(\d{2,3})\b/);
 return p?.[1]||null;
}
function stripAddress(input){
 let s=String(input||'');
 // Remove direct name/mention in any position; preserve rest of request.
 s=s.replace(/@\s*(?:quỳnh\s*hương|quynh\s*huong|bot\s*pos\s*care|pos\s*care)(?=$|[\s,!.?])/gi,' ');
 s=s.replace(/\b(?:quỳnh\s*hương|quynh\s*huong|bot\s*pos\s*care)\b/gi,' ');
 return s.replace(/\s+/g,' ').trim();
}
function isAddressed(input){return /@\s*(?:quỳnh\s*hương|quynh\s*huong|bot\s*pos\s*care|pos\s*care)(?=$|[\s,!.?])/i.test(String(input||''))||/\b(?:quỳnh\s*hương|quynh\s*huong|bot\s*pos\s*care)\b/i.test(String(input||''));}
function isIntroduction(input){
 const n=normalize(stripAddress(input));
 return /\b(gioi thieu|tu gioi thieu|em la ai|ban la ai|la ai vay|noi ve ban than|cho anh biet ve em|cho chi biet ve em)\b/.test(n)
  && !/\b(gioi thieu san pham|gioi thieu khach hang|gioi thieu dich vu|gioi thieu merchant)\b/.test(n);
}
function isCompliment(input){
 const n=normalize(stripAddress(input));
 if(isIntroduction(input)||/\b(gioi thieu|tu gioi thieu)\b/.test(n))return false;
 if(!n||n.length>115)return false;
 if(/\b(khong|chua|chang|ko|k)\s+(gioi|tot|hay|on|duoc|xuat sac|dinh)\b/.test(n))return false;
 return /\b(gioi qua|gioi ghe|gioi the|hay qua|hay ghe|tuyet voi|xuat sac|dinh qua|dinh ghe|qua dinh|sieu qua|sieu ghe|cam on em nhieu|em gioi|em hay|em dinh|bot gioi|bot hay|lam tot lam|ho tro tot|rat huu ich|huu ich qua|de thuong qua|dang yeu qua|good job|well done|nice work|great job|amazing|excellent)\b/.test(n);
}
// Anchored social grammar: a substantive symptom in the same message must reach diagnostics.
function socialIntent(input){
 const n=normalize(stripAddress(input));
 if(/^(?:xin chao|chao|hello|hi|hiem|hey|alo)(?: (?:em|bot|chi|anh))?(?: (?:a|nhe|nha|oi))?(?: (?:chi|anh) quay lai roi)?$/.test(n))return 'greeting';
 if(/^(?:khoan )?(?:(?:em|ban|bot) )?(?:tu )?gioi thieu(?: (?:ve em|ban than))?(?: (?:di|nhe|a))?$/.test(n)||/^(?:em|ban|bot) la ai(?: vay)?$/.test(n))return 'introduction';
 if(/^(?:(?:em|ban|bot) )?(?:co the )?ho tro(?: duoc)? (?:nhung (?:viec )?gi|nhung viec gi|loi nao|gi)(?: a| vay)?$/.test(n))return 'capability';
 if(/^(?:ok |oke |da )?(?:cam on|thanks|thank you)(?: (?:em|bot))?(?: (?:nhieu|nhe|nha|a))?$/.test(n))return 'thanks';
 if(/^(?:(?:chi|anh|toi) )?chua co su co(?: hoi de biet thoi)?$/.test(n))return 'no-incident';
 if(/^(?:khong|khong can|chua can|thoi|no)$/.test(n))return 'decline';
 if(isCompliment(input)&&!/(?:nhung|van|chua|loi|tru tien|giao dich)/.test(n))return 'compliment';
 return null;
}
function detect(input,{ongoing=false,explicit=false}={}){
 const raw=stripAddress(input),n=normalize(raw),direct=explicit||isAddressed(input),c=classify(n);
 if(socialIntent(input))return {respond:ongoing||direct||socialIntent(input)==='introduction',intent:socialIntent(input),score:0.99,reason:'social'};
 if(isIntroduction(input))return {respond:true,intent:'introduction',score:0.99,reason:'introduction'};
 if(isCompliment(input))return {respond:ongoing||direct,intent:'compliment',score:0.98,reason:'compliment'};
 if(extractErrorCode(raw))return {respond:true,intent:'error_code',score:0.99,reason:'error_code'};
 if(ongoing||direct)return {...c,respond:true,reason:ongoing?'ongoing':'explicit'};
 if(n.split(' ').length<=2&&!c.intent)return {respond:false,...c,reason:'too_short'};
 const hasDomain=SUPPORT_TERMS.some(t=>wordMatch(n,t))||(c.intent==='payment'&&(wordMatch(n,'tru tien')||wordMatch(n,'khach')))||(c.intent==='frozen'&&wordMatch(n,'may'));
 return {respond:Boolean(c.intent&&hasDomain&&!c.ambiguous),...c,reason:c.ambiguous?'ambiguous':(c.intent&&hasDomain?'domain_intent':'no_clear_request')};
}
module.exports={normalize,classify,detect,extractErrorCode,isIntroduction,isCompliment,isAddressed,stripAddress,socialIntent};
