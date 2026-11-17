import { superuserToken, listAll } from './lib.mjs';
const su = await superuserToken('admin@surmai.net', 'ChangeMe123');
for (const f of process.argv.slice(2)) { const r = await listAll('places', su, f); console.log(f, '=>', r.slice(0,5).map(p => `${p.name}|${p.stateName}|${p.countryName}`).join('  ;  ')); }
