import catalog from '../data/catalog.json' with { type: 'json' };

const kinds = ['Founder', 'Founder', 'Startup', 'Fund', 'City'];
const pools = Object.fromEntries([...new Set(kinds)].map(k => [k, catalog.filter(c => c.kind === k)]));
const samAltman = catalog.find(c => c.id === 'F0010');
const ids = new Map(catalog.map(c => [c.id,c]));
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const json = (v,status=200,headers={}) => Response.json(v,{status,headers:{'Cache-Control':'no-store',...headers}});

export async function drawPack(owner, requestId) {
  const hash = new Uint32Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(owner+':'+requestId)));
  return kinds.map((kind,i) => i === 0 ? samAltman : pools[kind][hash[i] % pools[kind].length]);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const raw = request.headers.get('Cookie')?.match(/(?:^|;\s*)fn_collector=([^;]+)/)?.[1];
    if (raw && !uuid.test(raw)) return json({error:'Invalid collection session. Clear this site’s cookies to start again.'},400);
    const owner = raw || crypto.randomUUID();
    const cookie = `fn_collector=${owner}; HttpOnly; SameSite=Strict; Path=/; Max-Age=31536000${url.protocol==='https:'?'; Secure':''}`;
    const headers = {'Set-Cookie':cookie};
    try {
      if (url.pathname === '/api/collection' && request.method === 'GET') {
        const page = await env.PACKS.list({prefix:owner+'/',limit:500,include:['customMetadata'],...(url.searchParams.get('cursor')?{cursor:url.searchParams.get('cursor')}:{})});
        const counts = {};
        for (const p of page.objects) for (const id of JSON.parse(p.customMetadata.cards)) counts[id]=(counts[id]||0)+1;
        return json({cards:Object.entries(counts).map(([id,count])=>({...ids.get(id),count})),packs:page.objects.length,cursor:page.truncated?page.cursor:null,catalogSize:catalog.length},200,headers);
      }
      if (url.pathname === '/api/packs' && request.method === 'POST') {
        if (request.headers.get('Origin') !== url.origin) return json({error:'Invalid request origin.'},403);
        if (!raw) return json({error:'Please reload to initialize your collection.'},409,headers);
        if (Number(request.headers.get('content-length'))>200) return json({error:'Request too large.'},413);
        const text = await request.text();
        if (text.length>200) return json({error:'Request too large.'},413);
        let input; try { input=JSON.parse(text); } catch { return json({error:'Invalid request.'},400); }
        if (!uuid.test(input.requestId||'')) return json({error:'Invalid pack ID.'},400);
        const cards = await drawPack(owner,input.requestId);
        const key = owner+'/'+input.requestId;
        await env.PACKS.put(key,JSON.stringify({cards:cards.map(c=>c.id)}),{customMetadata:{cards:JSON.stringify(cards.map(c=>c.id))}});
        return json({cards,packId:input.requestId},200,headers);
      }
      return json({error:'Not found.'},404);
    } catch (e) { console.error('Collection request failed',e); return json({error:'Your collection is temporarily unavailable. Please try again.'},503,headers); }
  }
};
