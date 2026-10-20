#!/usr/bin/env node
'use strict';
// Aggregate-only audit: no raw questions, answers, source labels or customer data in output.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {usableKnowledge}=require('../knowledge-policy');
const {analyze,adaptLegacy}=require('../lib/knowledge/index.cjs');
const root=path.resolve(__dirname,'..');
function codeOf(row){const m=String(row.id||'').match(/(?:^|[-_ ])code[-_ ]?([a-z0-9]{2,3})$/i);return m?.[1]?.toUpperCase()||null;}
function verified(row){return require('../lib/v12/retrieval.cjs').reviewed(row);}
function audit(records){
 const codes=records.filter(r=>r.category==='code'||codeOf(r));
 const groups=new Map();for(const r of codes){const key=[codeOf(r)||'unspecified',r.device||r.deviceModel||'',r.acquirer||''].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(r);}
 const conflicts=[...groups.values()].filter(g=>g.length>1&&new Set(g.map(r=>String(r.answer||'').normalize('NFKC').trim().toLowerCase())).size>1);
 const summary=analyze(adaptLegacy(records));
 return {schemaVersion:1,corpusSha256:crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex'),total:records.length,codeBearingRecords:codes.length,publicationUsable:records.filter(usableKnowledge).length,evidenceVerifiedUsable:records.filter(verified).length,verifiedUsableCodeRecords:codes.filter(verified).length,draftOrUnverifiedRecords:records.filter(r=>!verified(r)).length,reviewStatuses:Object.fromEntries([...new Set(records.map(r=>r.review_status||'missing'))].sort().map(s=>[s,records.filter(r=>(r.review_status||'missing')===s).length])),requestedCodes:Object.fromEntries(['02','03','06'].map(c=>[c,{records:codes.filter(r=>codeOf(r)===c).length,verifiedUsable:codes.filter(r=>codeOf(r)===c&&verified(r)).length,missingVerified:!codes.some(r=>codeOf(r)===c&&verified(r))}])),sameCodeScopePossibleConflictGroups:conflicts.length,allKnowledgePossibleContradictionGroups:summary.possibleContradictionGroups,verifiedCodeRecordsNotReachableByLegacyIdFormat:codes.filter(r=>verified(r)&&!codeOf(r)).length,legacyRouteRisk:{genericExpertBeforeCodeRouter:true,verifiedCodeRecordsAffected:codes.filter(verified).length,note:'Baseline V13 dialogue.js expert return precedes explicit-code/search branch; zero verified records means actual verified blockage cannot be demonstrated from corpus.'},realVerifiedCodeCoverage:{denominator:codes.filter(verified).length,vacuous:codes.filter(verified).length===0,independentDomainAccuracy:'blocked_no_external_OPS_ground_truth'}};
}
if(require.main===module){const report=audit(JSON.parse(fs.readFileSync(path.join(root,'knowledge.json'),'utf8')));if(process.argv.includes('--write')){fs.mkdirSync(path.join(root,'docs/v132'),{recursive:true});fs.writeFileSync(path.join(root,'docs/v132/knowledge-audit.json'),JSON.stringify(report,null,2)+'\n');}console.log(JSON.stringify(report,null,2));}
module.exports={audit,codeOf,verified};
