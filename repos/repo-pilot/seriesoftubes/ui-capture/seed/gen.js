#!/usr/bin/env node
// Plays a network for a couple of in-game years through the game's own actions (ACT.*, dayTick) in the repo's
// jsdom test harness, so the save looks like an established player's: POPs grown out from Amsterdam across Europe,
// over the Atlantic and into Asia, transit + IX + PNIs, a few hundred customers accepted from real offers, incidents,
// loans, a log and traffic history. Writes .ui-capture/seed/save.json (the same object the autosave stores).
const fs = require('node:fs');
const path = require('node:path');
const { load } = require('../../tests/harness');

const { ev, errors } = load({ seed: 20240611 });
const DAYS = +(process.env.DAYS || 840);

ev(`(()=>{UI.pitched=true;UI.asnTxt='204917';
  const i=document.getElementById('nmIn');if(i)i.value='Lambda Lagoon Networks';
  UI.startCity='ams';ACT.start({});S.name='Lambda Lagoon Networks';S.asn=204917;
  window.__fails={};window.__try=(k,f)=>{try{f();}catch(e){__fails[k]=(__fails[k]||0)+1;}try{closeModal();}catch(e){}};
  window.__link=(a,b,t,mode)=>__try('link '+a+'-'+b,()=>{t=Math.min(t,1);if(!S.pops[a]||!S.pops[b]||pairLinks(a,b).length)return;UI.pending=null;UI.via=null;UI.lmode=mode||'wave';UI.route='diverse';for(let k=t;k>=0&&!pairLinks(a,b).length;k--){openLinkModal(a,b);ACT.buildLink({tier:k});try{closeModal();}catch(e){}}if(!pairLinks(a,b).length)throw 0;});
  window.__pop=(c)=>__try('pop '+c,()=>{if(!S.pops[c])ACT.buildPop({city:c});});
  window.__bb=(c)=>__try('bb '+c,()=>{if(S.pops[c]&&!S.pops[c].bb)ACT.launchBB({city:c});});
  window.__transit=(c,n,t)=>__try('transit '+c,()=>{const ts=NETS.filter(x=>x.price&&sellsAt(x,c)&&(x.type==='t1'||x.type==='t2')).slice(0,n||1);for(const x of ts)for(let k=t||2;k>=0&&!S.transit.some(y=>y.city===c&&y.net===x.id);k--)ACT.buyTransit({city:c,net:x.id,tier:k});});
  window.__ix=(c,t)=>__try('ix '+c,()=>{for(const x of ixIdsIn(c)){for(let k=t||2;k>=0&&S.ixp[x]===undefined;k--)ACT.buyIx({city:x,tier:k});if(S.dk&&S.dk.q)S.dk.q=null;try{closeModal();}catch(e){}if(S.ixp[x]!==undefined&&!S.rs[x])ACT.rs({city:x});
    for(const n of ixMembers(x).slice(0,14))if(!S.peers[n+'@'+x]&&peerOk(n,'ix',x).ok)S.peers[n+'@'+x]=true;}});
  window.__router=(c)=>__try('router '+c,()=>{const p=S.pops[c];if(!p)return;ACT.upRouter({city:c});});
  window.__addr=(c)=>__try('addr '+c,()=>{ACT.addRouter({city:c});});
  window.__pni=(c,k)=>__try('pni '+c,()=>{const ns=NETS.filter(n=>n.pops.includes(c)&&!n.tail&&!S.pni.some(p=>p.net===n.id&&p.city===c)).sort((a,b)=>(R.demTo[b.id]||0)-(R.demTo[a.id]||0)).slice(0,k||2);
    for(const n of ns){S.cash+=0;for(let k=2;k>=0&&!S.pni.some(p=>p.net===n.id&&p.city===c);k--)ACT.pni({city:c,net:n.id,tier:k});}});
  window.__cache=(c)=>__try('cache '+c,()=>{for(const n of NETS.filter(n=>n.cache).slice(0,6))if(!S.caches.some(x=>x.city===c&&x.net===n.id)&&(R.demTo[n.id]||0)>=n.cache.min)ACT.cache({city:c,net:n.id});});
})()`);

// Expansion plan: [day, js]. Things a player does as the network grows.
const plan = [
  [1, `__transit('ams',1,1);__ix('ams',1);__bb('ams')`],
  [25, `__pop('lon');__link('ams','lon',2);__transit('lon',1,1);__ix('lon',1)`],
  [55, `__pop('fra');__link('ams','fra',2);__ix('fra',1)`],
  [90, `__pop('bru');__link('ams','bru',1);__link('bru','lon',1);__bb('lon')`],
  [120, `__pop('par');__link('bru','par',2);__link('par','fra',2);__ix('par',1);__router('ams')`],
  [150, `__pop('ham');__link('ams','ham',2);__bb('fra');__transit('fra',1,2)`],
  [185, `__pop('ber');__link('ham','ber',2);__link('ber','fra',1);__ix('ber',1)`],
  [210, `__pop('nyc');__link('lon','nyc',3);__transit('nyc',1,2);__ix('nyc',2);__router('lon')`],
  [240, `__pop('ash');__link('nyc','ash',3);__ix('ash',1);__pni('ams',2);__pni('fra',1)`],
  [270, `__pop('zrh');__link('fra','zrh',2);__pop('mil');__link('zrh','mil',2);__bb('par')`],
  [300, `__pop('mad');__link('par','mad',2);__pop('mrs');__link('par','mrs',2);__link('mrs','mil',1);__router('fra')`],
  [330, `__pop('cph');__link('ham','cph',2);__pop('sto');__link('cph','sto',2);__ix('sto',1);__cache('ams')`],
  [360, `__pop('chi');__link('nyc','chi',3);__ix('chi',1);__pop('waw');__link('ber','waw',2);__addr('ams')`],
  [395, `__pop('vie');__link('muc','vie',2);__pop('muc');__link('fra','muc',2);__link('muc','vie',2);__link('vie','zrh',1);__pni('lon',3)`],
  [420, `__pop('dal');__link('chi','dal',3);__link('ash','dal',3);__pop('sjc');__link('dal','sjc',3);__ix('sjc',1)`],
  [450, `__pop('dub');__link('lon','dub',2);__bb('dub');__router('nyc');__ix('mad',1);__ix('mil',1)`],
  [480, `__pop('lis');__link('mad','lis',2);__pop('mrs');__ix('mrs',1);__cache('fra');__cache('lon')`],
  [510, `__pop('ist');__link('vie','ist',2);__pop('ath');__link('mil','ath',1);__link('ath','ist',1)`],
  [540, `__pop('dxb');__link('mrs','dxb',3);__ix('dxb',1);__transit('dxb',1,2)`],
  [570, `__pop('bom');__link('dxb','bom',3);__pop('sin');__link('bom','sin',3);__ix('sin',2)`],
  [600, `__pop('hkg');__link('sin','hkg',3);__pop('tok');__link('hkg','tok',3);__ix('tok',1);__ix('hkg',1)`],
  [630, `__pop('sea');__link('sjc','sea',2);__link('tok','sea',3);__pop('lax');__link('sjc','lax',2);__ix('lax',1)`],
  [660, `__pop('mia');__link('ash','mia',3);__pop('sao');__link('mia','sao',3);__ix('sao',1);__pop('atn');__link('ash','atn',2);__link('atn','mia',2)`],
  [690, `__pop('tor');__link('chi','tor',2);__link('tor','nyc',2);__pop('bos');__link('nyc','bos',2);__pni('nyc',3);__pni('sjc',2)`],
  [720, `__pop('osl');__link('sto','osl',2);__pop('hel');__link('sto','hel',2);__pop('prg');__link('ber','prg',2);__link('prg','vie',2)`],
  [750, `__pop('jnb');__link('lis','jnb',3);__pop('cpt');__link('jnb','cpt',2);__pop('syd');__link('sin','syd',3);__ix('syd',1)`],
  [780, `__pop('bcn');__link('mad','bcn',2);__link('bcn','mrs',2);__pop('man');__link('lon','man',2);__link('man','dub',1);__cache('nyc');__cache('par')`],
  [810, `__pop('den');__link('chi','den',2);__link('den','sjc',2);__pop('icn');__link('tok','icn',2);__pni('sin',2);__pni('tok',2)`],
];
const pending = plan.slice();

for (let d = 0; d < DAYS; d++) {
  const day = ev('S.day');
  while (pending.length && pending[0][0] <= day) {
    const [, js] = pending.shift();
    // A planned expansion is financed: the bank/investors cover what revenue has not yet (keeps the story moving).
    ev(`if(S.cash<2.5e6*(1+S.day/200))S.cash+=Math.round((1.5e6+S.day*9000)/1000)*1000;${js};compute();checkGoals();`);
  }
  ev(`(()=>{
    // Offers: take most of what the network can serve, pass on some.
    for(const o of S.offers.slice()){if(Math.random()<0.15)continue;
      if(bHas(o)&&Math.random()<0.85)__try('accept',()=>ACT.accept({id:o.id}));else if(Math.random()<0.25)__try('decline',()=>ACT.decline({id:o.id}));}
    // Incidents: fixed when the player notices, which is usually.
    for(const i of (S.inc||[]).slice())if(Math.random()<0.55)__try('fix',()=>ACT.fixInc({id:i.id}));
    // Busy links get upgraded now and then.
    if(S.day%15===0){compute();
      for(const l of S.links){const u=(R.load[l.id]||0)/Math.max(1e-9,capOf(l));if(u>0.9&&(l.mo||0)<60000&&Math.random()<0.5)__try('upLink',()=>{for(const p of [l.a,l.b])if(!portOk(p,l.tier+1))ACT.upRouter({city:p});ACT.upLink({id:l.id,tier:l.tier+1});});}
      for(const c of Object.keys(S.pops)){const p=S.pops[c];
        if(!p.bb&&CITY[c].P>=60&&Math.random()<0.6)__try('bb',()=>ACT.launchBB({city:c}));
        if(Math.random()<0.3)__try('upRouter',()=>ACT.upRouter({city:c}));
        if(Math.random()<0.05)__try('addRouter',()=>ACT.addRouter({city:c}));}
      for(const t of S.transit.slice())if(Math.random()<0.4)__try('upT',()=>ACT.buyTransit({city:t.city,net:t.net,tier:t.tier+1}));
      for(const x of Object.keys(S.ixp))if(Math.random()<0.25)__try('upIx',()=>{ACT.buyIx({city:x,tier:S.ixp[x]+1});if(S.dk&&S.dk.q)S.dk.q=null;});
      if(S.cash<3e6)S.cash+=2e6;}
    if(S.cash<1.5e6)S.cash+=2e6;
    // Sales brings in more leads than the market alone.
    __try('spawn',()=>spawnOffer());if(S.day>400)__try('spawn',()=>spawnOffer());
    if(S.day>=300&&!S.loans.length&&S.loanOffers&&S.loanOffers.length)__try('loan',()=>ACT.takeLoan({id:S.loanOffers[0].id}));
    dayTick();checkGoals();
  })()`);
  if (d % 120 === 0) console.log(ev(`JSON.stringify({day:S.day,date:dateStr(S.day),cash:Math.round(S.cash),lvl:S.lvl,pops:Object.keys(S.pops).length,links:S.links.length,biz:S.biz.length,inc:S.inc.length,lost:S.lost})`));
}
// The game falls back to "Startup #N" once its name pools run dry; give those customers names in the game's pun style.
ev(`(()=>{const P={
  dia:['Byte Me Bakery','Hammer & Packets Law','Pixel Pushers Studio','Brie Connected Deli','Two Phase Commit Lawyers','Ctrl-Alt-Deli','Mortgage Ping Brokers','Pasta La Vista Group','Lettuce Encrypt Farms','Payroll Over IP'],
  stream:['Binge Theory TV','Buffering Bros Media','Keyframe Kitchen','Lagless Live','StreamWeaver','Chill & Netflux','Couch Potato Cast','Pixel Sofa','Autoplay Anonymous'],
  l2vpn:['Grocer Grid Supermarkets','Tram & Tunnel Transit','Bank of Bits','Clinic Cluster Health','Freight Forward Logistics','Pallet Town Warehousing','Spokes & Hubs Bikes','Port Authority of Packets','Fjord Fisheries Co-op','Euro Pharma Labs','Bricks & Clicks Retail','Polder Water Board','Cargo Cult Shipping','Hotel Ethernetia','Rail Ink Printing','Mayo Clinicode','Meridian Insurers','Tulip Telematics','Canal Street Couriers','Saint Packet Hospital','Bavarian Brew Works','Nordic Knit Mills','Chalet Chain Hotels','Gouda Logistics','Herring & Sons Trading','Windmill Energy Grid','Velo Vault Storage','Stroopwafel Holdings'],
  edu:['University of Applied Packets','Campus Backbone Consortium','Polytechnic of Ports','Open Course Cloud','Night School Networks','Academy of Fine Bits'],
  host:['Rack & Roll Hosting','Server Sorcery','Uptime Kitchen','Container Ship Cloud','Bare Metal Gear','Kubernetties','Heap of Hosts'],
  isp:['Village Fiber Co-op','Polder Broadband','Mountain Mesh ISP','Hamlet Hotspot','Valley Velocity Net','Countryside Copper'],
  game:['Respawn Point Studios','Ping of the Hill','Loot Box Logistics','Frag Rate Games','Critical Hit Arcade','Noob Tube Gaming'],
  scrub:['Scrubbing Bubbles Security','Shield Wall Defense','Bouncer Box Sec']};
  const used=new Set(S.biz.map(b=>b.name)),k={},M={};
  for(const b of S.biz)if(/^Startup #/.test(b.name)){const l=P[b.type]||P.dia;let i=k[b.type]||0,n;
    do{n=l[i%l.length]+(i>=l.length?' '+['North','South','East','West','II'][Math.floor(i/l.length)-1]:'');i++;}while(used.has(n));
    k[b.type]=i;used.add(n);M[b.name]=n;b.name=n;}
  const fix=t=>typeof t==='string'?t.replace(/Startup #[0-9]+/g,m=>M[m]||'Packet Pantry'):t;for(const e of S.log){e.t=fix(e.t);e.h=fix(e.h);}for(const o of S.offers)if(/^Startup #/.test(o.name))o.name=fix(o.name);
})()`);
ev(`S.tut=null;S.offers=S.offers.slice(0,6);compute();checkGoals();`);
console.log('fails', ev('JSON.stringify(__fails)'));
console.log(ev(`JSON.stringify({day:S.day,date:dateStr(S.day),cash:Math.round(S.cash),lvl:S.lvl,tier:tierLabel(),pops:Object.keys(S.pops).length,links:S.links.length,pni:S.pni.length,caches:S.caches.length,biz:S.biz.length,transit:S.transit.length,ix:Object.keys(S.ixp).length,peers:Object.keys(S.peers).length,log:S.log.length,loans:S.loans.length,served:Math.round(R.served)})`));
if (errors.length) console.error('page errors:', errors.slice(0, 5));
const save = ev('JSON.stringify(packSave(S))');
fs.writeFileSync(path.join(__dirname, 'save.json'), save);
console.log('wrote save.json', Math.round(save.length / 1024), 'KB');
