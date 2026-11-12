import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';

// Produce Vercel's deployment artifact directly, without framework detection
// or dependence on the project's dashboard Output Directory setting.
const output=resolve('.vercel/output');
const fn=join(output,'functions/quiz-proxy.func');
await mkdir(fn,{recursive:true});
await mkdir(join(output,'static'),{recursive:true});
await writeFile(join(fn,'index.mjs'),await readFile(new URL('./api/quiz-proxy.mjs',import.meta.url)));
await writeFile(join(fn,'.vc-config.json'),JSON.stringify({runtime:'nodejs22.x',handler:'index.mjs',launcherType:'Nodejs',maxDuration:30},null,2));
// /api must be routed before filesystem handling: Vercel may reserve the
// source API prefix even when that prefix has no matching emitted function.
await writeFile(join(output,'config.json'),JSON.stringify({version:3,routes:[{src:'/api/(.*)',dest:'/quiz-proxy?quiz_path=/api/$1'},{handle:'filesystem'},{src:'/(.*)',dest:'/quiz-proxy?quiz_path=/$1'}]},null,2));
await writeFile(join(output,'static/deployment-check.json'),JSON.stringify({app:'Bonte avond',deploymentFormat:'vercel-build-output-v3',proxy:'nodejs22'}));
console.log('Bonte avond: generated Vercel v3 output with quiz-proxy.func and catch-all route.');
