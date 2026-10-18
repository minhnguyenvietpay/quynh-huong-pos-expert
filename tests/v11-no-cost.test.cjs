'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process');
test('V11 refuses paid automation before report/config/credential access',()=>{
 const result=cp.spawnSync(process.execPath,[require.resolve('../scripts/improve.cjs'),'run','--report','/does-not-exist','--config','/does-not-exist'],{env:{PATH:process.env.PATH,QH_ENABLE_AI_RUNNER:'true',QH_AGENT_API_KEY:'synthetic-not-a-real-credential'},encoding:'utf8'});
 assert.equal(result.status,1);assert.match(result.stderr,/V11_ZERO_COST/);assert.doesNotMatch(result.stderr,/ENOENT|synthetic-not-a-real/);
});
test('V11 only treats specific card problems as support, not Vietnamese homographs',()=>{
 const {analyze}=require('../lib/v11/understanding.cjs');const {createEngine}=require('../lib/v11/engine.cjs');const e=createEngine();
 assert.equal(e.shouldRespond('anh thấy thế nào'),false);assert.equal(e.shouldRespond('có thể đi ăn không'),false);
 assert.equal(analyze('máy không bị treo, chỉ không in bill').primary,'printer');
 assert.equal(analyze('POS chạm thẻ không nhận').primary,'card');
});
