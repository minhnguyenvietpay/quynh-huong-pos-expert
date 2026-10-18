const assert=require('node:assert/strict');
const {processMessage,hasSession}=require('./dialogue');
let n=0;function check(test){test();n++;}
check(()=>assert.match(processMessage('g1','u1','máy pos bị đơ'),/chào anh\/chị/i));
check(()=>assert.equal(hasSession('g1','u1'),true));
check(()=>assert.match(processMessage('g1','u1','2'),/khách|giao dịch|trừ tiền/i));
check(()=>assert.match(processMessage('g1','u1','ok rồi'),/kết thúc phiên/i));
check(()=>assert.equal(hasSession('g1','u1'),false));
check(()=>assert.match(processMessage('g1','u2','xin chào'),/chào anh\/chị/i));
check(()=>assert.match(processMessage('g1','u3','cảm ơn'),/cảm ơn/i));
check(()=>assert.match(processMessage('g1','u4','máy pos bị đơ'),/chào anh\/chị/i));
check(()=>assert.doesNotMatch(processMessage('g1','u4','2'),/chào anh\/chị/i));
console.log('PASS '+n+'/'+n+' social assertions');
