import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import worker from '../src/worker.mjs';
await mkdir('.local',{recursive:true});
const db=new DatabaseSync('.local/collection.sqlite');
db.exec('CREATE TABLE IF NOT EXISTS packs (key TEXT PRIMARY KEY, value TEXT NOT NULL, metadata TEXT NOT NULL)');
const env={
 PACKS:{
  async put(key,value,options){db.prepare('INSERT OR REPLACE INTO packs VALUES (?,?,?)').run(key,value,JSON.stringify(options.customMetadata));},
  async list({prefix,limit,cursor}) {const rows=db.prepare('SELECT key,metadata FROM packs WHERE key LIKE ? AND key > ? ORDER BY key LIMIT ?').all(prefix+'%',cursor||'',limit+1);const truncated=rows.length>limit;const selected=rows.slice(0,limit);return {objects:selected.map(r=>({key:r.key,customMetadata:JSON.parse(r.metadata)})),truncated,cursor:selected.at(-1)?.key};}
 },
 ASSETS:{async fetch(req){const url=new URL(req.url);const filename=url.pathname==='/'?'/index.html':url.pathname;const full=path.resolve('public','.'+filename);if(!full.startsWith(path.resolve('public')+path.sep))return new Response('Not found',{status:404});try{const data=await readFile(full);return new Response(data,{headers:{'Content-Type':({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(full)]||'application/octet-stream'}});}catch{return new Response('Not found',{status:404});}}}
};
const server=http.createServer(async(req,res)=>{try{const chunks=[];for await(const chunk of req)chunks.push(chunk);const request=new Request(`http://${req.headers.host}${req.url}`,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){console.error(e);res.writeHead(500);res.end('Server error');}});
server.listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
