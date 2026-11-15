import fs from 'node:fs';
const raw = JSON.parse(fs.readFileSync(new URL('../src/data/raw.json', import.meta.url)));
const S = Date.UTC(2026,7,4);
const dayOf = (ts)=> Math.round((Date.UTC(+ts.slice(0,4), +ts.slice(5,7)-1, +ts.slice(8,10)) - S)/864e5);
const hourOf = (ts)=> +ts.slice(11,13) + +ts.slice(14,16)/60;
const dow = d => (d+1)%7;
const F = raw.fridges.map(f=>f.id);
const ck = raw.checks.map(r=>({id:r[0], d:dayOf(r[1]), h:hourOf(r[1]), f:r[2], fill:r[4], temp:r[5], flags:r[8], cleaned:r[7]}));
console.log('checks', ck.length, 'first', raw.checks[0][1], 'last', raw.checks[ck.length-1][1]);
const E = {}; // f -> day -> bool
for (const f of F) { E[f] = {}; }
for (const c of ck) { if (dow(c.d)<5 && c.h<12) { E[c.f][c.d] ??= false; if (c.fill===0) E[c.f][c.d]=true; } }
let tot=0, n=0;
for (const f of F) {
  const days = Object.keys(E[f]).map(Number); const e = days.filter(d=>E[f][d]);
  const pre = e.filter(d=>d<35).length, post = e.filter(d=>d>=35).length;
  const byDow = [0,1,2,3,4].map(w=>{const dd=days.filter(d=>dow(d)===w); return `${Math.round(100*dd.filter(d=>E[f][d]).length/dd.length)}%`});
  const fills = ck.filter(c=>c.f===f); const avg = fills.reduce((a,c)=>a+c.fill,0)/fills.length;
  console.log(f, `n=${days.length}`, `empty=${e.length}`, `${(100*e.length/days.length).toFixed(0)}%`, `pre ${pre}/25 post ${post}/45`, 'Mon-Fri', byDow.join(' '), 'avgfill', avg.toFixed(2), 'checks', fills.length);
  tot+=e.length; n+=days.length;
}
console.log('network', tot, n, (100*tot/n).toFixed(1));
const hot = ck.filter(c=>c.temp>=45); console.log('>=45', hot.map(c=>[c.f,c.d,c.temp]));
console.log('>=42', ck.filter(c=>c.temp>=42).map(c=>c.f+':'+c.temp).join(' '));
console.log('power', ck.filter(c=>c.flags.includes('Power')).map(c=>c.f+'@'+c.d).join(' '));
const dr = raw.drops; const bySrc={}; dr.forEach(r=>{bySrc[r[3]] ??= {n:0,lbs:0}; bySrc[r[3]].n++; bySrc[r[3]].lbs+=r[4];}); console.log(bySrc);
const lbsF={}; dr.forEach(r=>lbsF[r[2]]=(lbsF[r[2]]||0)+r[4]); console.log(lbsF);
// hour distribution of empties for F3, F5
for (const f of ['F3','F5']) { const rows=[0,1,2,3,4,5,6].map(w=>{const cs=ck.filter(c=>c.f===f&&dow(c.d)===w); return (cs.reduce((a,c)=>a+c.fill,0)/cs.length).toFixed(1)}); console.log(f,'avg fill by dow Mon..Sun',rows.join(' ')); }
// drop-day effect
for (const f of F) {
  const rosaDays = new Set(dr.filter(r=>r[2]===f && r[3]==="Rosa's Bakery").map(r=>dayOf(r[1])));
  const days = Object.keys(E[f]).map(Number);
  const a = days.filter(d=>rosaDays.has(d)), b = days.filter(d=>!rosaDays.has(d));
  const r = x => x.length? `${x.filter(d=>E[f][d]).length}/${x.length}`:'-';
  console.log(f,'rosa-day',r(a),'other',r(b));
}

for (const f of ['F3','F5']) for (const [nm,lo,hi] of [['pre',0,35],['post',35,98]]) {
  const days = Object.keys(E[f]).map(Number).filter(d=>d>=lo&&d<hi);
  console.log(f,nm,[0,1,2,3,4].map(w=>{const dd=days.filter(d=>dow(d)===w); return `${dd.filter(d=>E[f][d]).length}/${dd.length}`}).join(' '));
}
