import {readFile,writeFile,mkdir} from 'node:fs/promises';
const catalog=await readFile('data/catalog.json','utf8');
const css=await readFile('public/style.css','utf8');
let js=await readFile('public/app.js','utf8');
// Standalone visual preview only. Production always uses the Worker and R2.
const fixture=`
const previewCatalog=${catalog};
const previewPacks=new Map();
async function previewRequest(path,options){
 if(path.startsWith('/api/collection')){const counts=new Map();for(const pack of previewPacks.values())for(const card of pack)counts.set(card.id,{...card,count:(counts.get(card.id)?.count||0)+1});return Response.json({cards:[...counts.values()],packs:previewPacks.size,catalogSize:previewCatalog.length,cursor:null});}
 if(path==='/api/packs') {const {requestId}=JSON.parse(options.body);if(!previewPacks.has(requestId)){const random=crypto.getRandomValues(new Uint32Array(5));previewPacks.set(requestId,['Founder','Founder','Startup','Fund','City'].map((kind,i)=>{const pool=previewCatalog.filter(c=>c.kind===kind);return pool[random[i]%pool.length];}));}return Response.json({cards:previewPacks.get(requestId),packId:requestId});}
 return Response.json({error:'Preview route not found'},{status:404});
}
`;
js=fixture+js.replace('await fetch(path,options)','await previewRequest(path,options)');
js=js.replaceAll('/card-symbol.png','data:image/png;base64,'+(await readFile('public/card-symbol.png')).toString('base64'));
let html=await readFile('public/index.html','utf8');
html=html.replace('<link rel="stylesheet" href="/style.css">',`<style>${css}</style>`).replace('<link rel="icon" href="/favicon.svg">','');
html=html.replaceAll('src="/pack-silver.png"','src="data:image/png;base64,'+(await readFile('public/pack-silver.png')).toString('base64')+'"');
html=html.replace('Collection saved for this browser.','Preview · collection resets on reload.');
html=html.replace('<script src="/app.js" type="module"></script>',`<script type="module">${js}</script>`);
await mkdir('../outputs',{recursive:true});
await writeFile('../outputs/foundernon-preview.html',html);
console.log('Created standalone interactive preview.');
