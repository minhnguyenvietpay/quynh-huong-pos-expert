'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function isolated(source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'qh-v122-handover-'));
  try {
    const script = `const deny=()=>{throw Error('NETWORK_FORBIDDEN')};for(const name of ['http','https']){const m=require('node:'+name);m.request=deny;m.get=deny;}require('node:net').connect=deny;require('node:net').createConnection=deny;require('node:tls').connect=deny;global.fetch=deny;let clock=1800000000000;Date.now=()=>clock;const d=require('./dialogue');function collect(user,complete=false){const r=[];for(const text of ['khách đã bị trừ tiền nhưng POS không có giao dịch','chưa rõ','đồng ý chuyển OPS',...(complete?['Cửa hàng Giả Lập','12 đường Giả Lập']:[])])r.push(d.processMessage('synthetic-group',user,text));return r;}\n${source}`;
    const result = spawnSync(process.execPath, ['-e', script], { cwd: path.join(__dirname, '..'), encoding: 'utf8', timeout: 60000, maxBuffer: 1024 * 1024, env: { PATH: process.env.PATH, QH_V12_ENABLED: 'true', QH_V11_ENABLED: 'true', QH_GAP_LOG: '0', POS_CARE_STATE_FILE: path.join(dir, 'state.json'), POS_CARE_EVENTS_FILE: path.join(dir, 'events.jsonl'), POS_CARE_TICKETS_FILE: path.join(dir, 'tickets.jsonl') } });
    assert.equal(result.status, 0, 'isolated synthetic dialogue must complete offline: ' + result.stderr);
    return JSON.parse(result.stdout);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
}
test('V12.2 actual dialogue bounds consented collection and prepared handovers at 2000 conversations', () => {
  const result = isolated(`const first=collect('u0',true);for(let i=1;i<=2000;i++)collect('u'+i,true);const last=collect('collector');console.log(JSON.stringify({precondition:first[2],firstPending:!!d.getPendingHandover('synthetic-group','u0'),firstEscalation:d.hasEscalation('synthetic-group','u0'),recentPending:!!d.getPendingHandover('synthetic-group','u2000'),latestCollecting:d.hasEscalation('synthetic-group','collector'),latestReply:last[2]}));`);
  assert.match(result.precondition, /tên cửa hàng/iu, 'financial escalation must actually collect only after consent');
  assert.equal(result.firstPending, false, 'oldest prepared handover must be evicted');
  assert.equal(result.firstEscalation, false, 'oldest collection context must be evicted');
  assert.equal(result.recentPending, true, 'recent handover must remain usable');
  assert.equal(result.latestCollecting, true, 'latest collection remains active');
  assert.match(result.latestReply, /tên cửa hàng/iu);
});
test('V12.2 another user triggers global expiry of abandoned consent and prepared handover data', () => {
  const result = isolated(`collect('prepared',true);collect('collecting');const before={pending:!!d.getPendingHandover('synthetic-group','prepared'),collecting:d.hasEscalation('synthetic-group','collecting')};clock+=31*60*1000;d.processMessage('synthetic-other-group','other-user','xin chào');clock-=31*60*1000;console.log(JSON.stringify({before,after:{pending:!!d.getPendingHandover('synthetic-group','prepared'),preparedEscalation:d.hasEscalation('synthetic-group','prepared'),collecting:d.hasEscalation('synthetic-group','collecting')}}));`);
  assert.deepEqual(result.before, { pending: true, collecting: true });
  // Restore the clock only after a different user triggers pruning. This proves
  // retained data was removed, rather than merely hidden by getter age checks.
  assert.deepEqual(result.after, { pending: false, preparedEscalation: false, collecting: false });
});
