'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const candidates=[process.env.QH_ROOT, __dirname, process.cwd(), 'C:\\Users\\LENOVO\\zalo-pos-care-v5'].filter(Boolean);
const root=path.resolve(candidates.find(p=>fs.existsSync(path.join(p,'qa-v3.js'))&&fs.existsSync(path.join(p,'qa-v42-runner.js'))) || __dirname);
const dir=path.join(root,'qa-reports','v42');
console.log('[QA ROOT]',root,'qa-v3.js:',fs.existsSync(path.join(root,'qa-v3.js')));
const token=crypto.randomBytes(24).toString('hex');const port=Number(process.env.QH_QA_PORT||4172);let busy=false,job=null;
const read=p=>{try{return JSON.parse(fs.readFileSync(p,'utf8'))}catch{return null}};
const send=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))};
const ui=fs.readFileSync(path.join(__dirname,'dashboard.html'),'utf8');
const server=http.createServer((req,res)=>{
 const host=req.headers.host||'';if(!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host))return send(res,403,{error:'Localhost only'});
 const url=new URL(req.url,'http://localhost');if(req.method==='GET'&&url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});return res.end(ui)}
 if(req.method==='GET'&&url.pathname==='/app.js'){res.writeHead(200,{'Content-Type':'text/javascript; charset=utf-8','Cache-Control':'no-store'});return res.end(fs.readFileSync(path.join(__dirname,'dashboard.js')))}
 if(req.method==='GET'&&url.pathname==='/api/status'){return send(res,200,{busy,job,report:read(path.join(dir,'latest.json')),history:(()=>{try{return fs.readFileSync(path.join(dir,'history.jsonl'),'utf8').trim().split('\n').slice(-20).reverse().map(x=>JSON.parse(x))}catch{return []}})(),snapshots:(()=>{try{return fs.readdirSync(path.join(dir,'snapshots')).filter(x=>x.endsWith('.json')).sort().reverse().slice(0,20).map(x=>x.slice(0,-5))}catch{return []}})()})}
 if(req.method==='POST'&&['/api/run','/api/restore'].includes(url.pathname)){
  const origin=req.headers.origin;if(origin&&!['http://127.0.0.1:'+port,'http://localhost:'+port].includes(origin))return send(res,403,{error:'Origin denied'});
  if(req.headers['x-qa-token']!==token)return send(res,403,{error:'Token denied'});
  if(busy)return send(res,409,{error:'QA job already running'});
  let body='';req.on('data',c=>{body+=c;if(body.length>4096)req.destroy()});req.on('end',()=>{
   let data={};try{data=body?JSON.parse(body):{}}catch{return send(res,400,{error:'Invalid JSON'})}
   if(url.pathname==='/api/restore'&&(!/^[\w-]{10,100}$/.test(data.id||'')||data.confirm!=='RESTORE'))return send(res,400,{error:'Confirmation required'});
   busy=true;job={type:url.pathname==='/api/run'?'QA':'RESTORE',started:new Date().toISOString()};
   const runner=path.join(root,'qa-v42-runner.js');
    const args=url.pathname==='/api/run'?[runner,'run']:[runner,'restore',data.id];
   const child=cp.spawn(process.execPath,args,{cwd:root,windowsHide:true,env:{...process.env,QH_ROOT:root},stdio:['ignore','pipe','pipe']});let err='';child.stderr.on('data',d=>{err=(err+d).slice(-3000)});child.on('error',e=>{err=e.message;busy=false;job={...job,finished:new Date().toISOString(),error:err}});child.on('close',code=>{busy=false;job={...job,finished:new Date().toISOString(),exitCode:code,error:err||null}});return send(res,202,{started:true});
  });return;
 }
 send(res,404,{error:'Not found'});
});
server.listen(port,'127.0.0.1',()=>{console.log('Quynh Huong QA V4.2: http://127.0.0.1:'+port+'/?token='+token);console.log('Local-only dashboard. Keep this terminal open.');});
