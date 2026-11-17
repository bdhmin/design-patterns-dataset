// Airline logos in the bundled airlines dataset point at images.kiwi.com, which the
// browser can't reach offline. This writes a small SVG tail-badge per airline code into
// run/pb_public/_stub/airlines/ (served by PocketBase's static handler) and repoints the
// `logo` of airlines records and of seeded flight metadata at those local files.
import fs from 'node:fs';
import path from 'node:path';
import { superuserToken, listAll, update } from './lib.mjs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(HERE, '../run/pb_public/_stub/airlines');
fs.mkdirSync(OUT, { recursive: true });

const PALETTE = {
  AS: ['#01426A', '#48A9C5'], DL: ['#C8102E', '#003366'], TP: ['#00A14B', '#E4002B'], FI: ['#00205B', '#F2A900'],
  AF: ['#002157', '#E4002B'], UA: ['#005DAA', '#FFFFFF'], AA: ['#0078D2', '#C30019'], BA: ['#075AAA', '#EB2226'],
  LH: ['#05164D', '#F9BA00'], JL: ['#CC0000', '#FFFFFF'], NH: ['#13448F', '#FFFFFF'], AC: ['#D22630', '#000000'],
};
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const colors = (code) => PALETTE[code] || [`hsl(${hash(code) % 360} 55% 32%)`, `hsl(${(hash(code) * 7) % 360} 70% 60%)`];

const svg = (code) => {
  const [bg, fg] = colors(code);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="${bg}"/><path d="M0 46 L64 30 L64 64 L0 64Z" fill="${fg}" opacity="0.85"/><text x="32" y="30" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="22" fill="#fff" text-anchor="middle">${code}</text></svg>`;
};

const su = await superuserToken('admin@surmai.net', 'ChangeMe123');
const airlines = await listAll('airlines', su, '', '&skipTotal=1').then(async (first) => {
  // listAll caps at 500 per page; page through the rest
  let all = [...first];
  for (let p = 2; first.length === 500; p++) {
    const res = await fetch(`${process.env.SURMAI_URL || 'http://127.0.0.1:5402'}/api/collections/airlines/records?perPage=500&page=${p}`, { headers: { Authorization: su } }).then((r) => r.json());
    all = all.concat(res.items);
    if (res.items.length < 500) break;
  }
  return all;
});
let n = 0;
for (const a of airlines) {
  if (!a.code) continue;
  const file = `${a.code}.svg`;
  fs.writeFileSync(path.join(OUT, file), svg(a.code));
  const logo = `/_stub/airlines/${file}`;
  if (a.logo !== logo) {
    await update('airlines', a.id, { logo }, su);
    n++;
  }
}
// seeded / imported flights carry a copy of the airline in metadata.provider
for (const t of await listAll('transportations', su, 'type="flight"')) {
  const p = t.metadata?.provider;
  if (p?.code && p.logo !== `/_stub/airlines/${p.code}.svg`) {
    if (!fs.existsSync(path.join(OUT, `${p.code}.svg`))) fs.writeFileSync(path.join(OUT, `${p.code}.svg`), svg(p.code));
    await update('transportations', t.id, { metadata: { ...t.metadata, provider: { ...p, logo: `/_stub/airlines/${p.code}.svg` } } }, su);
  }
}
console.log(`airline logos: ${airlines.length} airlines, ${n} updated`);
