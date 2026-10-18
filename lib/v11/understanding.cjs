'use strict';

// Deliberately bounded, local Vietnamese understanding. Scores are heuristics,
// never evidence of a transaction outcome or a merchant's consent.
function normalize(value) {
  return String(value ?? '').slice(0, 6000).toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd')
    .replace(/\b(?:ko|k|kh|khongg|hong|hok)\b/g, 'khong')
    .replace(/\be\b/g, 'em').replace(/\ba\b/g, 'anh')
    .replace(/\binbill\b/g,'in bill').replace(/\bhoadon\b/g,'hoa don').replace(/\bbilll\b/g,'bill')
    .replace(/\btreoo\b/g,'treo').replace(/\bnguonn\b/g,'nguon')
    .replace(/\b(?:dc|duoccc)\b/g, 'duoc').replace(/\b(?:vs)\b/g, 'voi')
    .replace(/\b(?:r|roi)\b/g, 'roi').replace(/\b(?:wifi|wi-fi|wi fi)\b/g, 'wifi')
    .replace(/\b(?:posss|poss)\b/g, 'pos').replace(/\b(?:chuyen khoang|chuyen khon)\b/g, 'chuyen khoan')
    .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}
const rules = {
  freeze: [/\b(?:treo|do|dung hinh|khong phan hoi|khong bam duoc|lag)\b/],
  power: [/\b(?:khong len nguon|mat nguon|tat nguon|sap nguon|khong bat duoc|khong khoi dong)\b/],
  battery: [/\b(?:pin|sac|battery)\b/],
  printer: [/\b(?:in|may in|hoa don|bien lai|giay|receipt|bill)\b/],
  network: [/\b(?:wifi|mang|sim|4g|3g|ket noi|internet|offline|hotspot)\b/],
  qr: [/\b(?:qr|quet ma|chuyen khoan)\b/],
  card: [/\b(?:the|quet the|cham the|chip|contactless)\b/],
  debit: [/\b(?:tru tien|bi tru|da tru|ghi no|debit)\b/],
  missing: [/\b(?:chua nhan|khong nhan|chua vao|khong vao|chua thay|khong thay|thieu tien)\b/],
  duplicate: [/\b(?:hai lan|2 lan|trung|lap giao dich|nhieu lan)\b/],
  refund: [/\b(?:hoan tien|tien hoan|hoan lai|refund)\b/],
  void: [/\b(?:huy giao dich|huy don|void)\b/],
  reversal: [/\b(?:dao giao dich|dao nguoc|reversal)\b/],
  settlement: [/\b(?:doi soat|ket toan|quyet toan|settlement|tien ve)\b/],
  portal: [/\b(?:portal|cong quan tri|dang nhap|tai khoan|mat khau)\b/]
};
const payment = new Set(['debit', 'missing', 'duplicate', 'refund', 'void', 'reversal', 'settlement']);
const has = (text, pattern) => pattern.test(text);
function analyze(input, context = {}) {
  let text = normalize(input);
  if(/\b(?:khach|tien|thanh toan|tai khoan)\b/.test(text))text=text.replace(/\bck\b/g,'chuyen khoan').replace(/\bgd\b/g,'giao dich');
  if(context.topic&&/^(?:bt|bth)(?: roi)?(?: em| anh)?$/.test(text))text=text.replace(/^(?:bt|bth)\b/,'binh thuong');
  const noDebit = has(text, /\b(?:chua|khong|chua bi|khong bi) tru(?: tien)?\b/);
  const debit = noDebit ? 'no' : has(text, /\b(?:da|bi|co) tru(?: tien)?\b|\btru tien roi\b/) ? 'yes' : 'unknown';
  const failed = has(text, /\b(?:chua duoc|khong duoc|van loi|van chua|van khong|chua in duoc|khong in duoc|that bai|khong thanh cong|bao loi|bi loi|gap loi)\b/);
  const resolved = !failed && !has(text, /\b(?:khong|chua) (?:het loi|on|hoat dong|khac phuc|thanh cong|duoc)\b/) && has(text, /\b(?:da (?:in|ket noi|thanh toan|xu ly) duoc|in duoc roi|het loi|da on|on roi|duoc roi|hoat dong binh thuong|da khac phuc|thanh cong roi)\b/);
  const yes = /^(?:co|vang|da|dong y|toi dong y|em dong y|dung roi|chinh xac)$/.test(text);
  const no = /^(?:khong|chua|khong dong y|toi khong dong y|chua dong y|thoi|khong can)$/.test(text);
  const consentQuestion = /(?:consent|escalat|ops|handover|chuyen|dong y)/i.test(String(context.question || ''));
  const consent = !no && !has(text, /\b(?:khong|chua|dung)\b/) && (
    has(text, /\b(?:dong y|cho phep|nho|giup|hay) (?:chuyen|bao|gui|lien he)\b/) ||
    (consentQuestion && /^(?:dong y|toi dong y|em dong y|co|vang|da|chuyen giup|chuyen giup em|chuyen di)$/.test(text))
  );
  const facts = {
    debit,
    inFlight: has(text, /\b(?:dang (?:thanh toan|giao dich|xu ly|quet|cham the|cam chip)|dang quay|dang cho|processing|pending)\b/),
    hotBattery: has(text, /\b(?:pin (?:pos |may )?(?:bi )?(?:nong|phong)|nong (?:pin|bat thuong)|phong pin|boc khoi|mui khet)\b/),
    unsafeHardware: has(text, /\b(?:man hinh(?: pos)? (?:bi )?vo|(?:pos|may)(?: bi)? roi (?:vao )?nuoc|vao nuoc|ngam nuoc|nut man hinh)\b/),
    receiptBlank: has(text, /\b(?:giay trang|in trang|khong (?:co )?chu|mo chu|trang tinh)\b/),
    paperMoves: !has(text, /\b(?:khong|chua) (?:ra|chay|keo) giay\b/) && has(text, /\b(?:van |co |da )?(?:ra|chay|keo) giay\b/),
    wifi: has(text, /\bwifi\b/),
    sim: has(text, /\b(?:sim|4g|3g)\b/)
  };
  const intents = Object.entries(rules).flatMap(([id, patterns]) => {
    let score = patterns.reduce((sum, pattern) => sum + (has(text, pattern) ? 5 : 0), 0);
    if (id === 'debit' && noDebit) score = failed || facts.inFlight ? 5 : 0;
    if (id === 'card' && !has(text, /\b(?:chip|contactless|quet the|cham the|the cham|cam the|doc the|loi (?:doc )?the|the (?:khong|bi loi|loi|tu choi))\b/)) score = 0;
    if (id === 'freeze' && has(text, /\bkhong (?:bi )?(?:treo|do)\b/) && !has(text, /\b(?:van treo|van do|khong bam duoc)\b/)) score = 0;
    if (id === 'missing' && !has(text, /\b(?:tien|giao dich|tai khoan|thanh toan|chuyen khoan|khach|portal)\b/)) score = 0;
    if (id === 'duplicate' && !has(text, /\b(?:tru|tien|giao dich|thanh toan|quet|the)\b/)) score = 0;
    if (id === 'printer' && facts.receiptBlank) score += 5;
    if (id === 'battery' && facts.hotBattery) score += 8;
    if (id === 'power' && facts.unsafeHardware) score = Math.max(score, 13);
    if (score && payment.has(id)) score += 4;
    if (score && context.topic === id) score += 1;
    return score ? [{ id, score }] : [];
  }).sort((a, b) => b.score - a.score);
  // A bare answer belongs to the question's existing topic, not a guessed topic.
  if (!intents.length && rules[context.topic] && (yes || no || failed || resolved || text === 'ok')) intents.push({ id: context.topic, score: 2 });
  return {
    text, primary: intents[0]?.id || null, intents,
    ambiguous: !intents.length || (intents.length > 1 && intents[0].score === intents[1].score),
    facts,
    signals: { failed, resolved, yes, no, thanks: /\b(?:cam on|thanks|thank you)\b/.test(text),
      cancel: /^(?:huy|thoi|dung lai|khong can nua|huy ho tro)$/.test(text),
      restart: /^(?:bat dau lai|lam lai|reset|hoi lai tu dau)$/.test(text),
      help: /\b(?:giup|ho tro|cuu|help|can hoi)\b/.test(text), consent }
  };
}
module.exports = { analyze, normalize };
