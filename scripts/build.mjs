import {readFile,mkdir,cp,writeFile} from 'node:fs/promises';
await mkdir('dist/server',{recursive:true});
await cp('public','dist/client',{recursive:true});
const source = (await readFile('src/worker.mjs','utf8')).replace("import catalog from '../data/catalog.json' with { type: 'json' };",'const catalog = '+await readFile('data/catalog.json','utf8')+';');
await writeFile('dist/server/index.js',source);
await writeFile('dist/server/wrangler.json',JSON.stringify({name:'foundernon',main:'index.js',compatibility_date:'2026-09-01',assets:{directory:'../client',binding:'ASSETS',run_worker_first:['/api/*']},r2_buckets:[{binding:'PACKS',bucket_name:'foundernon-packs'}]},null,2));
console.log('Built Foundernon: dependency-free Worker and static assets.');
