'use strict';
// Publication approval is separate from retrieval confidence; missing metadata fails closed.
const statuses=new Set(['approved','verified','ops_approved','validated']);
function usableKnowledge(item){
 return !!item && statuses.has(item.review_status) && item.requires_human_review===false &&
 !['fallback_draft_only','draft_only','reference_with_guardrails'].includes(item.bot_usage) &&
 !/(?:gửi|cung cấp|nhập|cho.{0,15}xin).{0,40}\b(?:MID|TID)\b/iu.test(item.answer||'');
}
module.exports={usableKnowledge};
