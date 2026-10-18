'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),cp=require('node:child_process'),net=require('node:net');
test('dashboard HTTP executes read-only QA and exposes a fresh PASS report',{timeout:30000},async()=>{
 const reservation=net.createServer();await new Promise(r=>reservation.listen(0,'127.0.0.1',r));const port=reservation.address().port;await new Promise(r=>reservation.close(r));
 const child=cp.spawn(process.execPath,['qa-v42-server.js'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,QH_QA_PORT:String(port)},stdio:['ignore','pipe','pipe']});
 try{
  const token=await new Promise((resolve,reject)=>{let output='';const timer=setTimeout(()=>reject(Error('Dashboard startup timeout')),5000);child.once('error',reject);child.once('exit',()=>{clearTimeout(timer);reject(Error('Dashboard exited before readiness'));});child.stdout.on('data',chunk=>{output+=chunk;const m=output.match(/token=([a-f0-9]{48})/);if(m){clearTimeout(timer);resolve(m[1]);}});});
  const base='http://127.0.0.1:'+port;
  const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/QA Control Center/);
  const denied=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(denied.status,403);
  const start=Date.now();const run=await fetch(base+'/api/run',{method:'POST',headers:{'Content-Type':'application/json','X-QA-Token':token},body:'{}'});assert.equal(run.status,202);
  let status;for(let i=0;i<100;i++){status=await(await fetch(base+'/api/status')).json();if(!status.busy&&status.job?.finished)break;await new Promise(r=>setTimeout(r,100));}
  assert.equal(status.busy,false);assert.equal(status.job.exitCode,0);assert.equal(status.report.status,'PASS');assert.ok(Date.parse(status.report.started)>=start-1000);assert.equal(status.report.steps.length,3);assert.ok(status.report.steps.every(s=>s.ok));assert.equal(status.report.snapshotId,null);
 }finally{child.kill();await new Promise(r=>child.exitCode!==null?r():child.once('exit',r));}
});
