'use strict';
// V13.2 deliberately reuses the frozen V13 response/state evaluator.
const fs=require('node:fs'),path=require('node:path');
const {evaluate,validate}=require('./v13-evaluate.cjs');
if(require.main===module){try{const args=process.argv.slice(2),arg=k=>{const i=args.indexOf(k);return i<0?undefined:args[i+1];};const report=evaluate({root:arg('--root'),datasetPath:arg('--dataset')||path.resolve(__dirname,'../tests/fixtures/v132-cycle1.json'),engine:arg('--engine')||'v13'});const json=JSON.stringify(report,null,2)+'\n';if(arg('--output'))fs.writeFileSync(arg('--output'),json);else process.stdout.write(json);process.exitCode=report.failed?1:0;}catch(e){console.error(e.message);process.exitCode=1;}}
module.exports={evaluate,validate};
