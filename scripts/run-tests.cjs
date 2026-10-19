'use strict';
// Explicit file arguments work in Windows PowerShell/cmd and Unix shells alike.
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process');
const root=path.resolve(__dirname,'..'),profile=process.argv[2]||'all';
const profiles={all:name=>/\.test\.cjs$/.test(name),v12:name=>/^v12.*\.test\.cjs$/.test(name)||name==='program-regression.test.cjs',v13:name=>/^v13.*\.test\.cjs$/.test(name)||name==='v122-listener.test.cjs'};
if(!Object.hasOwn(profiles,profile)){console.error('Unknown test profile');process.exitCode=1;}
else{
 const files=fs.readdirSync(path.join(root,'tests')).filter(profiles[profile]).sort().map(name=>path.join(root,'tests',name));
 if(!files.length){console.error('No test files selected');process.exitCode=1;}
 else{
  // Tests opt into each runtime explicitly; a developer's production flag must
  // never silently change the baseline measured by the suite.
  const result=spawnSync(process.execPath,['--test',...files],{cwd:root,stdio:'inherit',env:{...process.env,QH_V11_ENABLED:'false',QH_V12_ENABLED:'false',QH_V13_ENABLED:'false'}});
  if(result.error){console.error('Unable to start test runner');process.exitCode=1;}
  else process.exitCode=result.status===null?1:result.status;
 }
}
