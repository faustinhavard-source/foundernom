const $=id=>document.getElementById(id);
const state={collection:new Map(),packs:0,total:2864,kind:'All',query:'',limit:40,opened:[],revealed:new Set(),busy:false,ready:false,pending:null};
const symbols={Common:'○',Rare:'◈',Epic:'✦',Legendary:'✳'};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const mediaCache=new Map();
function toast(text){$('notice').textContent=text;$('notice').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('notice').hidden=true,6500);}
async function api(path,options){const r=await fetch(path,options);const data=await r.json();if(!r.ok)throw new Error(data.error||'Something went wrong. Please try again.');return data;}
function nav(view){const collection=view==='collection';$('packs-screen').hidden=collection;$('collection-screen').hidden=!collection;$('packs-tab').classList.toggle('active',!collection);$('collection-tab').classList.toggle('active',collection);$('packs-tab').setAttribute('aria-current',collection?'false':'page');$('collection-tab').setAttribute('aria-current',collection?'page':'false');if(collection)renderCollection();history.replaceState(null,'',collection?'#collection':'#packs');window.scrollTo({top:0,behavior:'instant'});}
function initials(name){return name.split(/[\s(]+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('');}
function cardMarkup(c,extra=''){const monogram=initials(c.name);const query=c.kind==='Founder'?c.name:c.kind==='City'?`${c.name} city`:`${c.name} ${c.kind}`;return `<div class="card-top"><span>${esc(c.kind)}</span><span>${esc(c.id)}</span></div><div class="card-art card-art--${c.kind.toLowerCase()}" data-symbol="${symbols[c.rarity]}" data-media-query="${esc(query)}" data-media-key="${esc(c.id)}"><div class="card-fallback"><span class="card-monogram">${esc(monogram)}</span></div><span class="card-shade" aria-hidden="true"></span></div><div class="card-details"><div class="card-rank">${symbols[c.rarity]} ${esc(c.rarity)}</div><h2 class="card-name">${esc(c.name)}</h2><p class="card-subtitle">${esc(c.subtitle)}</p><div class="card-footer"><span>${esc(c.country)}</span><span>${extra||'EDITION 001'}</span></div></div>`;}
async function wikiThumbnail(query){const endpoint=`https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrnamespace=0&prop=pageimages&piprop=thumbnail&pithumbsize=700&format=json&origin=*`;const r=await fetch(endpoint);if(!r.ok)throw new Error('Image unavailable');const pages=Object.values((await r.json()).query?.pages||{});return pages.find(p=>p.thumbnail?.source)?.thumbnail.source||null;}
function applyCardMedia(art,url){if(!url)return;const image=new Image();image.loading='lazy';image.referrerPolicy='no-referrer';image.onload=()=>{art.style.setProperty('--card-image',`url("${url.replaceAll('"','%22')}")`);art.classList.add('has-media');};image.src=url;}
function hydrateCardMedia(root=document){root.querySelectorAll('.card-art[data-media-key]').forEach(art=>{const key=art.dataset.mediaKey;if(mediaCache.has(key)){applyCardMedia(art,mediaCache.get(key));return;}wikiThumbnail(art.dataset.mediaQuery).then(url=>{mediaCache.set(key,url);applyCardMedia(art,url);}).catch(()=>mediaCache.set(key,null));});}
function updateCounts(){const n=[...state.collection.values()].reduce((s,c)=>s+c.count,0);$('collection-count').textContent=n.toLocaleString();$('total-cards').textContent=n.toLocaleString();$('pack-count').textContent=state.packs.toLocaleString();$('collection-progress').textContent=`${state.collection.size.toLocaleString()} / ${state.total.toLocaleString()}`;}
function renderCollection(){updateCounts();const cards=[...state.collection.values()].filter(c=>(state.kind==='All'||state.kind===c.kind)&&(`${c.name} ${c.subtitle} ${c.country} ${c.rarity}`.toLowerCase().includes(state.query)));$('collection-grid').innerHTML=cards.slice(0,state.limit).map(c=>`<article class="card card--${c.kind.toLowerCase()}" data-rarity="${esc(c.rarity)}">${cardMarkup(c,`×${c.count}`)}</article>`).join('');hydrateCardMedia($('collection-grid'));$('collection-empty').hidden=state.collection.size>0;$('no-results').hidden=!state.collection.size||cards.length>0;$('show-more').hidden=cards.length<=state.limit;}
function renderReveal(){const grid=$('reveal-cards');grid.innerHTML=state.opened.map((c,i)=>state.revealed.has(i)?`<article class="card card--${c.kind.toLowerCase()} revealed" data-rarity="${esc(c.rarity)}">${cardMarkup(c)}${c.isNew?'<span class="new-tag">NEW</span>':''}</article>`:`<button class="card card-back" data-index="${i}" aria-label="Reveal card ${i+1} of 5"><span class="back-number">0${i+1} / 05</span><img class="back-logo" src="/pack-mark-reference.png" alt="" aria-hidden="true"><small>REVEAL</small></button>`).join('');hydrateCardMedia(grid);const all=state.revealed.size===5;$('reveal-counter').textContent=`${state.revealed.size} / 5 revealed`;$('reveal-all').hidden=all;$('another-pack').hidden=!all;$('reveal-hint').textContent=all?'Five more stories for your collection.':'Tap a card to reveal it. All five are already in your collection.';}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function animateOpening(){
 const stage=$('pack-stage');
 $('flying-cards').innerHTML=state.opened.map((_,i)=>`<div class="emerging-card" style="--i:${i};--offset:${i-2}"><img class="card-symbol pack-opening-logo" src="/pack-mark-reference.png" alt=""></div>`).join('');
 stage.classList.remove('unsealing');
 void stage.offsetWidth;
 stage.classList.add('unsealing');
 await wait(matchMedia('(prefers-reduced-motion: reduce)').matches?120:2800);
 stage.classList.remove('unsealing');
 $('flying-cards').innerHTML='';
}
async function openPack(){
 if(state.busy||!state.ready)return;
 state.busy=true;
 const pack=$('pack-object');
 pack.style.transform='';
 $('sealed-view').hidden=false;$('reveal-view').hidden=true;
 nav('packs');
 for(const id of ['open-pack','pack-object','another-pack','packs-tab','collection-tab'])$(id).disabled=true;
 $('open-pack').textContent='Opening…';
 const requestId=state.pending||crypto.randomUUID();state.pending=requestId;
 try{
  const data=await api('/api/packs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId})});
  state.opened=data.cards.map(c=>({...c,isNew:!state.collection.has(c.id)}));state.revealed.clear();
  for(const c of data.cards){const old=state.collection.get(c.id);state.collection.set(c.id,{...c,count:(old?.count||0)+1});}
  state.packs++;state.pending=null;updateCounts();
  await animateOpening();
  $('sealed-view').hidden=true;$('reveal-view').hidden=false;renderReveal();
  $('reveal-cards').querySelector('button')?.focus({preventScroll:true});
 }catch(e){toast(e.message);$('open-pack').textContent='Try again';}
 finally{
  state.busy=false;
  for(const id of ['open-pack','pack-object','another-pack','packs-tab','collection-tab'])$(id).disabled=false;
  if(!state.pending)$('open-pack').textContent='Open pack';
 }
}
async function load(){try{let cursor;const counts=new Map();let packs=0;do{const d=await api('/api/collection'+(cursor?'?cursor='+encodeURIComponent(cursor):''));for(const c of d.cards)counts.set(c.id,{...c,count:(counts.get(c.id)?.count||0)+c.count});packs+=d.packs;cursor=d.cursor;state.total=d.catalogSize;}while(cursor);state.collection=counts;state.packs=packs;state.ready=true;updateCounts();$('open-pack').disabled=false;$('pack-object').disabled=false;$('open-pack').textContent='Open pack';if(location.hash==='#collection')nav('collection');}catch(e){toast(e.message);$('open-pack').textContent='Retry loading';$('open-pack').disabled=false;}}
$('open-pack').onclick=()=>state.ready?openPack():load();$('pack-object').onclick=openPack;$('another-pack').onclick=openPack;$('packs-tab').onclick=()=>nav('packs');$('collection-tab').onclick=()=>nav('collection');$('view-collection').onclick=()=>nav('collection');$('empty-open').onclick=()=>{nav('packs');if(state.ready)openPack();};
$('reveal-cards').onclick=e=>{const card=e.target.closest('[data-index]');if(!card)return;const i=Number(card.dataset.index);state.revealed.add(i);renderReveal();const next=$('reveal-cards').querySelector('button');(next||$('another-pack')).focus({preventScroll:true});};
$('reveal-all').onclick=()=>{state.opened.forEach((_,i)=>state.revealed.add(i));renderReveal();$('another-pack').focus({preventScroll:true});};
$('category-filters').onclick=e=>{const btn=e.target.closest('[data-kind]');if(!btn)return;state.kind=btn.dataset.kind;state.limit=40;document.querySelectorAll('.chip').forEach(b=>{const chosen=b===btn;b.classList.toggle('selected',chosen);b.setAttribute('aria-pressed',String(chosen));});renderCollection();};
$('search').oninput=e=>{state.query=e.target.value.toLowerCase().trim();state.limit=40;renderCollection();};$('show-more').onclick=()=>{state.limit+=40;renderCollection();};
$('brand-home').onclick=e=>{e.preventDefault();if(!state.busy)nav('packs');};
const pack=$('pack-object');const reduceMotion=matchMedia('(prefers-reduced-motion: reduce)');let frame;
pack.addEventListener('pointermove',e=>{if(state.busy||reduceMotion.matches||e.pointerType==='touch')return;const box=pack.parentElement.getBoundingClientRect();const x=Math.max(-1,Math.min(1,((e.clientX-box.left)/box.width-.5)*2));const y=Math.max(-1,Math.min(1,((e.clientY-box.top)/box.height-.5)*2));cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{pack.style.transform=`rotateX(${-y*13}deg) rotateY(${x*19}deg) rotateZ(${x*3}deg) translateY(-7px) scale(1.025)`;pack.style.setProperty('--shine-x',`${50+x*35}%`);pack.style.setProperty('--shine-y',`${50+y*35}%`);});});
pack.addEventListener('pointerleave',()=>{cancelAnimationFrame(frame);pack.style.transform='';pack.style.setProperty('--shine-x','30%');pack.style.setProperty('--shine-y','30%');});
load();
