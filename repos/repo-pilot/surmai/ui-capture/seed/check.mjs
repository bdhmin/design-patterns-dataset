import { superuserToken, place, airport, airline } from './lib.mjs';
import { TRIPS } from './trips.mjs';
const su = await superuserToken('admin@surmai.net', 'ChangeMe123');
const bad = [];
const tryit = async (f, ...a) => { try { await f(su, ...a); } catch (e) { bad.push(e.message); } };
for (const t of TRIPS) {
  for (const d of t.destinations || []) await tryit(place, ...d);
  for (const f of t.flights || []) { await tryit(airport, f[2]); await tryit(airport, f[3]); await tryit(airline, f[0]); }
  for (const g of t.ground || []) { if (g.from[1]) await tryit(place, ...g.from); if (g.to[1]) await tryit(place, ...g.to); }
  for (const x of [...(t.rentals || []), ...(t.lodgings || []), ...(t.activities || [])]) await tryit(place, ...x.place);
}
console.log([...new Set(bad)].join('\n') || 'all good');
