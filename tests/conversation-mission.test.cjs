'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qh-mission-dialogue-'));
process.env.POS_CARE_STATE_FILE=path.join(dir,'state.json');
process.env.POS_CARE_EVENTS_FILE=path.join(dir,'events.jsonl');
process.env.POS_CARE_TICKETS_FILE=path.join(dir,'tickets.jsonl');
process.env.QH_GAP_LOG='0';
const dialogue=require('../dialogue');
let sequence=0;
const merchant=()=>{const id=`synthetic-mission-${++sequence}`;return input=>dialogue.processMessage(id,'synthetic',input);};
const uncertainty=r=>{assert.match(r,/chưa đủ|chưa.*xác (nhận|minh)/i);assert.match(r,/chưa.*thanh toán lại|chưa.*thu tiền lại/i);assert.match(r,/POS|Portal/);assert.doesNotMatch(r,/đã (?:gửi|chuyển) (?:yêu cầu|CS|OPS)|đã hoàn tiền|tiền đã về tài khoản/i);};
for(const message of ['khách bị trừ tiền nhưng máy báo lỗi','khách ck rồi mà chưa thấy giao dịch','máy treo khách bị trừ tiền giờ xử lý sao','không in được bill khách bị trừ tiền']){
 test(`payment uncertainty priority: ${message}`,()=>{uncertainty(merchant()(message));});
}
test('active printer yields to new payment risk',()=>{const reply=merchant();reply('ko in dc bill');uncertainty(reply('máy treo khách bị trừ tiền giờ xử lý sao'));assert.match(reply('không thấy'),/CS\/OPS.*đồng ý|đồng ý.*CS\/OPS/i);assert.match(reply('đồng ý'),/tên cửa hàng/i);});
test('printer follows up instead of repeating and explicit resolution closes',()=>{const reply=merchant();assert.match(reply('ko in dc bill'),/giấy nhiệt/);assert.match(reply('vẫn chưa được'),/giấy.*trắng|không đẩy giấy/i);assert.match(reply('bình thường rồi em'),/đã được xử lý/i);});
test('freeze resolution preempts proposed OPS escalation',()=>{const reply=merchant();reply('máy đơ rồi em');reply('vẫn chưa được');reply('vẫn chưa được');assert.match(reply('bình thường rồi em'),/đã được xử lý/i);assert.doesNotMatch(reply('xin chào'),/đồng ý|tên cửa hàng/i);});
test('payment refusal does not collect merchant details or silently consent on ok',()=>{const reply=merchant();reply('khách ck rồi mà chưa thấy giao dịch');assert.match(reply('không thấy'),/đồng ý/i);assert.match(reply('không'),/chưa chuyển/i);assert.doesNotMatch(reply('ok'),/xin tên|đã chuyển|đã gửi/i);});
test('negative debit report is not reinterpreted as debit confirmation',()=>{const reply=merchant();reply('máy đơ khi đang thanh toán');assert.match(reply('chưa bị trừ tiền'),/chưa.*khẳng định|chưa.*thất bại/i);});
test.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
