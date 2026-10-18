import { Zalo, ThreadType } from 'zca-js';
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { processMessage, hasSession, hasEscalation, closing, greetingOnly, getPendingHandover, markHandoverDone } = require('./dialogue.js');
const { normalize, detect, isIntroduction, isCompliment, isAddressed, stripAddress } = require('./intent.js');
const state=require('./state.js');
const tickets=require('./incident.js');
const quality=require('./quality.js');
const qhLanguage=require('./qh-v43-language.js');
const STAFF_IDS = (process.env.STAFF_ZALO_IDS||'').split(',').map(x=>x.trim()).filter(Boolean);
const STAFF_UIDS={ 'Hoàng Anh':STAFF_IDS[0]||'', 'Thu Hoài':STAFF_IDS[1]||'' };
const STAFF_NAMES=['Hoàng Anh','Thu Hoài'];
const STAFF_ID_SET=new Set(STAFF_IDS);
const ADMIN_IDS=new Set((process.env.ADMIN_USER_IDS||'').split(',').map(x=>x.trim()).filter(Boolean));

// V6.8: defaults enable all existing functions and all group access.
const envBool = (name, fallback) => process.env[name] == null ? fallback : process.env[name].toLowerCase() === 'true';
const envNum = (name, fallback, min = 0) => {
  const n = Number(process.env[name]);
  return process.env[name] != null && Number.isFinite(n) ? Math.max(min, n) : fallback;
};
const GROUP_MODE = (process.env.GROUP_MODE || 'all').trim().toLowerCase();
const allowed = new Set((process.env.ALLOWED_GROUP_IDS || '').split(',').map(x => x.trim()).filter(Boolean));
const AUTO_REPLY = envBool('AUTO_REPLY', true);
const TYPING_ENABLED = envBool('TYPING_ENABLED', true);
const LOG_UNKNOWN = envBool('LOG_UNKNOWN', true);
const REPLY_DELAY_MIN_MS = envNum('REPLY_DELAY_MIN_MS', 1000);
const REPLY_DELAY_MAX_MS = Math.max(REPLY_DELAY_MIN_MS, envNum('REPLY_DELAY_MAX_MS', 2000));
const COOLDOWN = envNum('COOLDOWN_MS', 1500);
const MAX_MESSAGE_LENGTH = envNum('MAX_MESSAGE_LENGTH', 1200, 1);
const MAX_REPLIES_PER_GROUP_PER_MINUTE = envNum('MAX_REPLIES_PER_GROUP_PER_MINUTE', 12, 1);
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// V12.1 listener hotfix: conservative, offline POS fallback when intent misses a clear request.
const posNormalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function clearPosRequest(value) {
  const q = posNormalize(value);
  return /\b(khong in( duoc)? (bill|hoa don|bien lai)|may (pos )?khong in|may in (khong in|bi loi)|loi may in|khong ra (bill|giay)|in khong ra)\b/.test(q)
    || /\b(may (pos )?(bi loi|bi do|treo|khong len nguon|khong hoat dong)|pos (bi do|treo|khong len nguon))\b/.test(q)
    || /\b(giao dich (that bai|bi treo|bi loi)|khach (bi tru tien|da tru tien)|qr (khong quet duoc|bi loi))\b/.test(q);
}
function directlyAddressed(value) {
  return /^quynh huong\b/.test(posNormalize(value))
    || /\b(quynh huong oi|quynh huong em oi)\b/.test(posNormalize(value));
}

if (!['all', 'allowlist'].includes(GROUP_MODE)) throw new Error('GROUP_MODE must be all or allowlist');
if (GROUP_MODE === 'allowlist' && !allowed.size) throw new Error('ALLOWED_GROUP_IDS required for allowlist');
console.log('[QUYNH HUONG V8.5 DEPLOYMENT]', { GROUP_MODE, AUTO_REPLY, TYPING_ENABLED, LOG_UNKNOWN, COOLDOWN });

const api = await new Zalo().loginQR();
const seen = new Map();
const inflight = new Set();
const lastSent = new Map();
const groupReplyTimes = new Map();
const MAX_SEEN = 10000;
function dedupe(id) {
  if (!id) return false;
  const now = Date.now();
  for (const [key, time] of seen) if (now - time > 600000) seen.delete(key);
  if (seen.has(id)) return true;
  seen.set(id, now);
  if (seen.size > MAX_SEEN) seen.delete(seen.keys().next().value);
  return false;
}
function appendMetric(event) {
  if (!LOG_UNKNOWN) return;
  try { fs.appendFileSync('pos-care-metrics.jsonl', JSON.stringify({ ...event, at: new Date().toISOString() }) + '\n'); }
  catch (e) { console.warn('[METRIC ERROR]', e?.message || String(e)); }
}
function rateLimited(groupId) {
  const now = Date.now();
  const times = (groupReplyTimes.get(groupId) || []).filter(t => now - t < 60000);
  groupReplyTimes.set(groupId, times);
  return times.length >= MAX_REPLIES_PER_GROUP_PER_MINUTE;
}
function recordReply(groupId) {
  const times = groupReplyTimes.get(groupId) || [];
  times.push(Date.now());
  groupReplyTimes.set(groupId, times);
}
// Only send real Zalo mentions when both staff IDs are explicitly verified.
// Names alone cannot safely identify Zalo accounts (duplicates, aliases).
function makeHandoverMessage(reply, groupId, userId) {
  const pending=getPendingHandover(groupId,userId);
  if(!pending) return {payload:{msg:reply},handover:false};
  if(STAFF_IDS.length!==2 || STAFF_IDS.some(id=>!/^\d+$/.test(id)) || STAFF_IDS[0]===STAFF_IDS[1]) {
    return {payload:{msg:reply+'\n\n⚠️ Chưa cấu hình đủ 2 Zalo User ID đã xác minh. Bot chưa thể tag nhân viên; cửa hàng cần liên hệ CS/OPS qua kênh chính thức.'},handover:true,tagged:false};
  }
  const suffix='\n\nNhờ @Hoàng Anh và @Thu Hoài tiếp nhận hỗ trợ cửa hàng.';
  const msg=reply+suffix;
  const mentions=STAFF_NAMES.map((name,i)=>({pos:msg.lastIndexOf('@'+name),len:('@'+name).length,uid:STAFF_IDS[i]}));
  return {payload:{msg,mentions},handover:true,tagged:true};
}
async function sendTyping(groupId) {
  if (!TYPING_ENABLED || typeof api.sendTypingEvent !== 'function') return;
  try {
    await Promise.race([
      api.sendTypingEvent(groupId, ThreadType.Group),
      sleep(1200).then(() => { throw new Error('typing timeout'); })
    ]);
  } catch (e) { console.warn('[TYPING SKIPPED]', e?.message || String(e)); }
}
api.listener.on('message', async m => {
  try {
    if (m.isSelf || m.type !== ThreadType.Group) return;
    const d = m.data || {};
    const groupId = String(m.threadId || '');
    if (!groupId || (GROUP_MODE === 'allowlist' && !allowed.has(groupId))) return;
    const userId = String(d.uidFrom || d.senderId || d.fromId || d.uid || '');
    const raw = typeof d.content === 'string' ? d.content.trim() : '';
    if (!userId || !raw || raw.length > MAX_MESSAGE_LENGTH) return;
    const cmd=raw.trim().toLowerCase();
    if(cmd==='/myid'){await api.sendMessage({msg:'Zalo User ID của tài khoản vừa gửi lệnh: '+userId+'\nChỉ chia sẻ ID này với người quản trị bot.'},groupId,ThreadType.Group);return;}
    if (['/bot off','/bot on','/bot status'].includes(cmd)) {
      if (!ADMIN_IDS.has(userId)) {console.log('[ADMIN DENIED]',{groupId});return;}
      if(cmd==='/bot off')state.setDisabled(groupId,true);
      if(cmd==='/bot on')state.setDisabled(groupId,false);
      const msg=cmd==='/bot status'?(state.isDisabled(groupId)?'Quỳnh Hương đang tạm dừng trong nhóm này.':'Quỳnh Hương đang hoạt động trong nhóm này.'):(cmd==='/bot off'?'Đã tạm dừng Quỳnh Hương trong nhóm này.':'Đã bật lại Quỳnh Hương trong nhóm này.');
      await api.sendMessage({msg},groupId,ThreadType.Group);
      return;
    }
    if(/^\/(nhan|dangxuly|chonganhang|xongticket|dongticket)\s+(VP-[A-Z0-9-]+)$/i.test(raw)){
      if(!STAFF_ID_SET.has(userId)&&!ADMIN_IDS.has(userId))return;
      const m=raw.match(/^\/(nhan|dangxuly|chonganhang|xongticket|dongticket)\s+(VP-[A-Z0-9-]+)$/i);
      const statuses={nhan:'ACKNOWLEDGED',dangxuly:'IN_PROGRESS',chonganhang:'WAITING_BANK',xongticket:'RESOLVED',dongticket:'CLOSED'};
      const updated=tickets.status(m[2],statuses[m[1].toLowerCase()],userId);
      await api.sendMessage({msg:updated?`Đã cập nhật ${updated.id}: ${updated.status}`:'Không tìm thấy mã yêu cầu.'},groupId,ThreadType.Group);return;
    }
    if(state.isDisabled(groupId))return;
    const messageId = d.msgId || d.cliMsgId || m.messageId;
    if (dedupe(messageId ? `${groupId}:${messageId}` : '')) return;
    const key = JSON.stringify([groupId, userId]);
    if (inflight.has(key)) { console.log('[BUSY]', groupId); return; }
    const ongoing = hasSession(groupId, userId) || hasEscalation(groupId, userId);
    const explicit = isAddressed(raw);
    const originalQuestion = stripAddress(raw).replace(/@\s*quỳnh\s*hương\b/gi, '').replace(/@\s*quynh\s*huong\b/gi, '').trim();
    const parsed = qhLanguage.normalize(originalQuestion, {issue:ongoing?'active':null,stage:ongoing?'question':null});
    const question = parsed.changed ? parsed.text : originalQuestion;
    const detection = detect(question, { ongoing, explicit });
    const norm = normalize(question);
    const direct = explicit || directlyAddressed(raw);
    const posFallback = clearPosRequest(question);
    if (parsed.changed) console.log('[QH LANGUAGE]', {intent:parsed.intent, changed:true});
    const social = (ongoing || direct) && Boolean(
      greetingOnly(norm) || closing(norm) || isIntroduction(raw) || isCompliment(raw)
    );
    if (!detection.respond && !social && !posFallback && !direct && !/^\/ticket\b/i.test(question)) {
      console.log('[IGNORED]', detection.reason);
      appendMetric({ event: 'ignored', groupId, reason: detection.reason });
      return;
    }
    if (!detection.respond && (posFallback || direct)) {
      console.log('[POS FALLBACK]', { groupId, addressed: direct, pos: posFallback });
    }
    if (!question) return;
    console.log('[REQUEST]', { groupId, ongoing, intent: detection.intent, score: Math.round((detection.score || 0) * 100) });
    if (!AUTO_REPLY) { console.log('[DRY RUN] No reply sent'); return; }
    if (Date.now() - (lastSent.get(key) || 0) < COOLDOWN) return;
    if (rateLimited(groupId)) { console.log('[RATE LIMITED]', groupId); return; }
    inflight.add(key);
    try {
      const reply = processMessage(groupId, userId, question);
      if (typeof reply !== 'string' || !reply.trim()) return;
      await sendTyping(groupId);
      const delay = REPLY_DELAY_MIN_MS + Math.floor(Math.random() * (REPLY_DELAY_MAX_MS - REPLY_DELAY_MIN_MS + 1));
      await sleep(delay);
      const outgoing=makeHandoverMessage(reply,groupId,userId);
      let ticket=null;
      if(outgoing.handover && outgoing.tagged){
        const pending=getPendingHandover(groupId,userId);
        ticket=tickets.create({...pending,groupId,senderId:userId});
        outgoing.payload.msg=`[${ticket.id}]\n`+outgoing.payload.msg;
        // Mentions are positional offsets: update after prefix insertion.
        for(const mention of outgoing.payload.mentions||[])mention.pos+=ticket.id.length+3;
      }
      let handoverSent=false;
      try {
        await api.sendMessage(outgoing.payload, groupId, ThreadType.Group);
        handoverSent=Boolean(outgoing.handover && outgoing.tagged);
      } catch (err) {
        if(!outgoing.handover || !outgoing.tagged) throw err;
        console.warn('[MENTION FAILED]',err?.message||String(err));
        quality.log('mention_failed',{ticketId:ticket?.id,groupId});
        await api.sendMessage({msg:reply+'\n\n⚠️ Không tag được nhân viên. Anh/chị liên hệ CS/OPS qua kênh chính thức để được tiếp nhận.'},groupId,ThreadType.Group);
      }
      if(handoverSent){markHandoverDone(groupId,userId);quality.log('handover_sent',{ticketId:ticket?.id,groupId});}
      else if(outgoing.handover && !outgoing.tagged)quality.log('handover_unconfigured',{groupId});
      lastSent.set(key, Date.now());
      recordReply(groupId);
      console.log('[SENT]', { groupId, chars: reply.length });
      quality.log('answered',{groupId,intent:detection.intent||'knowledge'});
      appendMetric({ event: 'answered', groupId, intent: detection.intent || 'knowledge', chars: question.length });
    } finally { inflight.delete(key); }
  } catch (e) { console.error('[MESSAGE ERROR]', e?.message || String(e)); }
});
api.listener.on('error', e => console.error('[LISTENER ERROR]', e?.message || String(e)));
api.listener.start();
console.log('Quynh Huong: listening to ' + (GROUP_MODE === 'all' ? 'ALL groups' : 'allowed groups') + '.');
