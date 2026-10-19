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
  settlement: [/\b(?:doi soat|ket toan|quyet toan|settlement|tien ve|tien (?:van )?(?:chua|khong) ve(?: tai khoan)?)\b/],
  portal: [/\b(?:portal|cong quan tri|dang nhap|tai khoan|mat khau)\b/]
};
const payment = new Set(['debit', 'missing', 'duplicate', 'refund', 'void', 'reversal', 'settlement']);
const has = (text, pattern) => pattern.test(text);
function analyzeBounded(input, context = {}) {
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
    hotBattery: has(text, /\b(?:pin (?:(?:pos|may) ){0,2}(?:bi )?(?:nong|phong)|nong (?:pin|bat thuong)|phong pin|boc khoi|mui khet)\b/),
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

// Keep source clauses separate: a denial of one symptom must not erase another.
const scopeSplit = /(?:[.!?;,\n]+|\b(?:nhung|tuy nhien|ma hien tai|gio thi)\b)/;
function analyze(input, context = {}) {
  const raw = String(input ?? '').slice(0, 6000);
  const quotedOrHypothetical = /["“”]/.test(raw) || /\b(?:vi du|gia su|neu|hoi gia dinh)\b/.test(normalize(raw));
  const withoutQuotes = raw.replace(/[“"][^”"\n]*[”"]/g, ' ').replace(/(?:^|\s)(?:à|a) không(?=\s|[,.;!?]|$)/giu, ', đính chính, ');
  const clauses = withoutQuotes.split(/(?:[.!?;,\n]+|\s+(?:nhưng|nhung|tuy nhiên|tuy nhien|và|va)\s+)/iu)
    .map(normalize).filter(Boolean);
  const current = clauses.filter(c => !/^(?:hom qua|truoc day|truoc do|luc truoc|hoi truoc|vi du|gia su|neu)\b/.test(c));
  const text = current.join(' nhung ');
  const result = analyzeBounded(text, context);
  const active = text.split(scopeSplit).map(c => c.trim()).filter(Boolean);
  const any = re => active.some(c => re.test(c));
  const asserted = (positive, negative) => active.some(c => positive.test(c) && !negative.test(c));
  // Remove only the denied hazard span; another positive hazard in the same
  // clause must still trigger the stop condition.
  const negHardware = /\b(?:khong|chua|khong he)(?: (?:co|phai|thay|bi|con|hien tuong|dau hieu|may|pin|pos|man hinh)){0,5} (?:nong|phong|boc khoi|mui khet|vo|nut|vao nuoc|ngam nuoc)\b/g;
  const hazardClauses = active.map(c => c.replace(negHardware, ' '));
  result.facts.hotBattery = hazardClauses.some(c => /\b(?:pin (?:(?:pos|may) ){0,2}(?:bi )?(?:nong|phong)|nong (?:pin|bat thuong)|phong pin|boc khoi|mui khet)\b/.test(c));
  result.facts.unsafeHardware = hazardClauses.some(c => /\b(?:man hinh(?: pos)? (?:bi )?vo|(?:pos|may)(?: bi)? roi (?:vao )?nuoc|vao nuoc|ngam nuoc|nut man hinh)\b/.test(c));
  const flightClauses = active.map(c => c.replace(/\b(?:khong|chua) co giao dich dang (?:xu ly|thanh toan)\b/g, ' ').replace(/\b(?:khong|chua)(?: (?:con|phai|co)){0,2} (?:dang (?:thanh toan|giao dich|xu ly|quet|cham the|cam chip|quay|cho)|van quay|processing|pending)\b/g, ' '));
  result.facts.inFlight = flightClauses.some(c => /\b(?:dang (?:thanh toan|giao dich|xu ly|quet|cham the|cam chip)|dang quay|dang cho|(?:pos|may) van quay|processing|pending)\b/.test(c));
  const correctionAt = active.lastIndexOf('dinh chinh');
  const debitClauses = correctionAt >= 0 ? active.slice(correctionAt + 1) : active;
  const noDebit = debitClauses.some(c => /\b(?:khong|chua)(?: bi)? tru(?: tien)?\b/.test(c));
  const debit = debitClauses.some(c => /\b(?:(?:da|bi|co) tru(?: tien)?|tru tien roi|nhan thong bao tru tien)\b/.test(c) && !/\b(?:khong|chua)(?: bi)? tru(?: tien)?\b/.test(c));
  result.facts.debit = debit && noDebit ? 'unknown' : debit ? 'yes' : noDebit ? 'no' : 'unknown';
  result.facts.previousAttempt = !quotedOrHypothetical && /\b(?:da|vua|em|anh|toi) (?:thu|khoi dong(?: lai)?|kiem tra|doi|lap lai|quen mang|ket noi lai)|\b(?:thu|lam|kiem tra|khoi dong(?: lai)?) (?:roi|het roi)\b/.test(normalize(withoutQuotes));
  const methods = [['wifi', /\bwifi\b/], ['sim', /\b(?:sim|4g|3g)\b/], ['card', /\b(?:quet the|cham the|cam chip|cam the|chip|contactless)\b/], ['qr', /\b(?:qr|chuyen khoan)\b/]];
  const specified = methods.filter(([, re]) => re.test(result.text)).map(([id]) => id);
  result.facts.specifiedMethod = specified.length === 1 ? specified[0] : null;
  result.facts.specifiedMethods = specified;
  result.facts.transactionVerification = /\b(?:kiem tra|xac minh|tra soat|trang thai|thanh cong|that bai|pending|processing)\b/.test(text) && /\b(?:tien|giao dich|thanh toan|doi soat)\b/.test(text) ? 'requested_or_reported' : 'unknown';
  // A historical failure can coexist with current recovery. Only current clauses
  // contribute, and device recovery never verifies a transaction or settlement.
  const failure = /\b(?:van (?:loi|chua|khong)|chua (?:in |ket noi |xu ly )?duoc|khong (?:in |ket noi |xu ly )?duoc|khong thanh cong|that bai|bao loi|bi loi|gap loi)\b/;
  const resolution = /\b(?:binh thuong roi|hoat dong binh thuong|het loi(?: roi)?|da khac phuc|da on|on roi|(?:in|ket noi|xu ly|chay) duoc roi|duoc roi)\b/;
  const negResolution = /\b(?:khong|chua)(?: hoan toan)? (?:het loi|on|hoat dong|khac phuc|in duoc|ket noi duoc|xu ly duoc|duoc|binh thuong)\b/;
  const residualProblem = /\b(?:(?:chu|giay|hoa don)(?: con| van| ra| in| bi)* (?:mo|nhat)|(?:thieu|mat) chu|khong du chu|(?:giay|may in)(?: van| con| bi)* ket|(?:may )?(?:van|con) loi|(?:in ra )?giay trang|(?:van )?trang(?: tinh)? khong (?:co )?chu)\b/;
  const residualDenied = /\b(?:khong|chua)(?: con)? (?:bi )?(?:mo|nhat|ket|thieu|mat)\b|\b(?:chu|giay|hoa don)(?: da)? (?:het|khong|khong con) (?:mo|nhat|ket)\b/;
  const residualClauses = active.filter(c => residualProblem.test(c) && !residualDenied.test(c));
  result.facts.residualDefect = residualClauses.length > 0;
  const unresolvedClauses = active.filter(c => failure.test(c) || residualClauses.includes(c));
  const resolvedClauses = active.filter(c => resolution.test(c) && !negResolution.test(c) && !failure.test(c));
  result.signals.failed = unresolvedClauses.length > 0;
  const paymentOutcomeOnly = c => /\b(?:giao dich|thanh toan|tien|doi soat)\b/.test(c) && !/\b(?:may|in|giay|wifi|mang|man hinh)\b/.test(c);
  result.signals.resolved = resolvedClauses.some(c => !paymentOutcomeOnly(c)) && !result.signals.failed;
  result.facts.scopedResolution = resolvedClauses.length > 0 && result.signals.failed;
  result.signals.quotedOrHypothetical = quotedOrHypothetical;
  const pendingConsent = /(?:consent|escalat|ops|handover|dong y)/i.test(String(context.question || ''));
  const directConsent = /^(?:toi |em |anh |chi )?(?:dong y|cho phep|nho|giup|hay) (?:chuyen|bao|gui|lien he)(?: yeu cau| ho tro)? (?:den |cho |toi )?(?:cs|ops|cs ops|nhan vien ho tro|bo phan ho tro)(?:\b.*)?$/;
  const bareConsent = /^(?:dong y|toi dong y|em dong y|co|vang|da|chuyen giup|chuyen giup em|chuyen di)$/;
  result.signals.consent = active.length === 1 && !quotedOrHypothetical && !/\b(?:khong|chua|dung|neu)\b/.test(text) && (directConsent.test(text) || pendingConsent && bareConsent.test(text));
  // Filter homographs and assertions explicitly denied in the same clause.
  result.intents = result.intents.filter(({ id }) => {
    if (id === 'freeze' && context.topic === 'freeze' && (result.signals.yes || result.signals.no || result.signals.failed || result.signals.resolved || text === 'ok') && !/\b(?:treo|do|lag)\b/.test(text)) return true;
    if (id === 'freeze') return asserted(/\b(?:treo|do|dung hinh|khong phan hoi|khong bam duoc|lag|dung may|dung im)\b/, /\b(?:khong|chua)(?: bi)? (?:treo|do|lag|dung hinh)\b/);
    if (id === 'power' && !result.facts.unsafeHardware && !/\b(?:khong len nguon|mat nguon|tat nguon|sap nguon|khong bat duoc|khong khoi dong)\b/.test(text)) return false;
    if (id === 'card') return any(/\b(?:quet the|cham the|cam the|cam chip|doc the|chip|contactless|the (?:bi loi|loi|tu choi|khong nhan))\b/);
    // Declining an operation is distinct from trying it unsuccessfully. Keep
    // "khong hoan tien duoc" as an issue, but ignore "khong hoan tien nua".
    if (['void', 'refund', 'reversal'].includes(id)) {
      const operation = {
        void: '(?:huy giao dich|huy don|void)',
        refund: '(?:hoan tien|tien hoan|hoan lai|refund)',
        reversal: '(?:dao giao dich|dao nguoc|reversal)'
      }[id];
      const denied = new RegExp('\\b(?:khong|chua|dung)(?: muon| can| yeu cau| dinh)? ' + operation + '(?! (?:duoc|thanh cong|xong)\\b)\\b', 'g');
      const remaining = active.map(c => c.replace(denied, ' '));
      if (active.some(c => { denied.lastIndex=0; return denied.test(c); }) && !remaining.some(c => rules[id].some(re => re.test(c)))) return false;
    }
    if (id === 'debit' && noDebit && !result.signals.failed && !result.facts.inFlight) return false;
    return true;
  }).map(item => item.id === 'battery' && !result.facts.hotBattery ? { ...item, score: Math.min(item.score, 5) } : item);
  if (!result.intents.length && /\b(?:may dung im|may dung may|may bi dung|may li|may dung luon)\b/.test(text)) result.intents.push({ id: 'freeze', score: 5 });
  if (result.facts.residualDefect && !result.intents.some(item => payment.has(item.id)) && /\b(?:giay trang|(?:thieu|mat) chu|khong du chu|chu(?: con| van| bi)* (?:mo|nhat))\b/.test(text)) {
    const printer = result.intents.find(item => item.id === 'printer');
    if (printer) printer.score = Math.max(printer.score, 11);
    else result.intents.push({ id: 'printer', score: 11 });
  }
  result.intents.sort((a,b) => b.score-a.score);
  result.primary = result.intents[0]?.id || null;
  result.ambiguous = !result.intents.length || result.intents.length > 1 && result.intents[0].score === result.intents[1].score;
  return result;
}
module.exports = { analyze, normalize };

