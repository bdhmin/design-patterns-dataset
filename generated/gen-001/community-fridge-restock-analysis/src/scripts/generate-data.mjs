// Deterministic mock-data generator for Stocktake Commons.
// Produces src/data/raw.json: 9 fridges, 3,126 check entries, 412 donation drops
// (Aug 4 – Nov 9, 2026). A latent stock-level simulation drives fill levels so that
// drops, weekdays and time of day interact the way they would in real logs.
import fs from 'node:fs';

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(+(process.env.SEED||202));
const randn = () => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
function wpick(items, weights) {
  const tot = weights.reduce((a, b) => a + b, 0);
  let r = rnd() * tot;
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const DAYS = 98;                 // Aug 4 (Tue) .. Nov 9 (Mon)
const START = Date.UTC(2026, 7, 4);
const dateStr = (d) => new Date(START + d * 864e5).toISOString().slice(0, 10);
const dowOf = (d) => (d + 1) % 7; // Mon=0 .. Sun=6 ; day 0 is a Tuesday
const LABOR_DAY = 34;            // Sep 7
const POST = 35;                 // Sep 8
const pad = (n) => String(n).padStart(2, '0');
const tsOf = (d, h) => {
  const m = Math.round(h * 60);
  return `${dateStr(d)}T${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
};

const FRIDGES = [
  { id: 'F1', name: 'Elm St Laundromat', hostType: 'Laundromat', neighborhood: 'Southside', K: 6, tbase: 37, pClean: 0.3, demand: 0.1 },
  { id: 'F2', name: 'Delancey Library Annex', hostType: 'Library', neighborhood: 'Eastgate', K: 4, tbase: 37, pClean: 0.28, demand: 0.1 },
  { id: 'F3', name: 'Kessler Ave Church', hostType: 'Church', neighborhood: 'Riverbend', K: 27, tbase: 37, pClean: 0.22, demand: 0.1 },
  { id: 'F4', name: 'Millbrook Community Garden', hostType: 'Community garden', neighborhood: 'Millbrook', K: 5, tbase: 37, pClean: 0.25, demand: 0.1 },
  { id: 'F5', name: 'Eastgate Rec Center', hostType: 'Rec center', neighborhood: 'Eastgate', K: 26, tbase: 37, pClean: 0.2, demand: 0.1 },
  { id: 'F6', name: 'Harmon & 4th Barbershop', hostType: 'Barbershop', neighborhood: 'Southside', K: 7, tbase: 37, pClean: 0.11, demand: 0.1 },
  { id: 'F7', name: 'Ortiz Corner Store', hostType: 'Corner store', neighborhood: 'Southside', K: 5, tbase: 38, pClean: 0.26, demand: 0.1 },
  { id: 'F8', name: 'Riverbend Senior Housing', hostType: 'Senior housing', neighborhood: 'Riverbend', K: 3, tbase: 36, pClean: 0.44, demand: 0.1 },
  { id: 'F9', name: 'Station 6 Firehouse', hostType: 'Fire station', neighborhood: 'Millbrook', K: 5, tbase: 36, pClean: 0.3, demand: 0.1 },
];
const FIDX = Object.fromEntries(FRIDGES.map((f, i) => [f.id, i]));

// ---------- volunteers (60) ----------
const L1 = 'AAAABBCCCDDDEEFGGHHJJJKKLLLMMMMNNOOPPRRRSSSTTVWYZ';
const L2 = 'ABCDEFGHJKLMNOPRSTVWYZ';
const initialsSet = new Set();
while (initialsSet.size < 60) initialsSet.add(pick(L1.split('')) + pick(L2.split('')));
const VOLS = [...initialsSet];
const volWeight = VOLS.map(() => 0.35 + Math.exp(randn() * 0.7));
const pools = FRIDGES.map((_, i) => {
  const base = VOLS.slice(Math.round(i * 6.67), Math.round((i + 1) * 6.67));
  const extra = [];
  while (extra.length < 4) { const v = pick(VOLS); if (!base.includes(v) && !extra.includes(v)) extra.push(v); }
  return [...base, ...extra];
});

// ---------- donation drops ----------
const drops = [];
const ROSA = { 1: ['F1', 'F3', 'F4', 'F6'], 4: ['F2', 'F5', 'F7', 'F8'] }; // Tue=1, Fri=4
const ROSA_T = { F1: 6.7, F3: 7.1, F4: 7.5, F6: 7.9, F2: 6.6, F5: 7.0, F7: 7.4, F8: 7.8 };
const GREEN = ['F1', 'F2', 'F7', 'F9'];
const GREEN_T = { F1: 7.6, F2: 8.1, F7: 8.5, F9: 8.9 };
for (let d = 0; d < DAYS; d++) {
  const dw = dowOf(d);
  if (ROSA[dw]) {
    for (const f of ROSA[dw]) {
      if (rnd() < 0.05) continue; // occasional missed stop
      const h = ROSA_T[f] + randn() * 0.22;
      drops.push({ d, h, fridge: f, source: "Rosa's Bakery", lbs: ri(20, 46), type: rnd() < 0.88 ? 'bread' : 'prepared meals' });
    }
  }
  if (dw === 0 && d !== LABOR_DAY) {
    for (const f of GREEN) {
      if (rnd() < 0.04) continue;
      const h = GREEN_T[f] + randn() * 0.15;
      drops.push({ d, h, fridge: f, source: 'Greenway Grocery', lbs: ri(34, 72), type: rnd() < 0.8 ? 'produce' : 'dairy' });
    }
  }
}
const nIndiv = 412 - drops.length;
const FW = [1.3, 1.0, 0.7, 1.1, 0.6, 0.9, 1.3, 1.0, 0.8];
for (let i = 0; i < nIndiv; i++) {
  const d = wpick([...Array(DAYS).keys()], [...Array(DAYS).keys()].map((x) => (dowOf(x) >= 5 ? 1.7 : 1) * (x >= 66 && x <= 70 ? 1.5 : 1)));
  const f = wpick(FRIDGES.map((x) => x.id), FW);
  const wk = dowOf(d) >= 5;
  const h = wk ? 9.5 + rnd() * 5.5 : wpick([() => 17 + rnd() * 3, () => 12 + rnd() * 2, () => 8 + rnd() * 3], [0.55, 0.2, 0.25])();
  const lbs = clamp(Math.round(Math.exp(Math.log(8) + randn() * 0.65)), 2, 42);
  drops.push({ d, h, fridge: f, source: 'Individual donor', lbs, type: wpick(['produce', 'bread', 'prepared meals', 'dairy'], [0.34, 0.26, 0.26, 0.14]) });
}
drops.sort((a, b) => a.d - b.d || a.h - b.h);
if (drops.length !== 412) throw new Error('drops ' + drops.length);

// ---------- check schedule (times only) ----------
// forced F7 power episodes: [day, [[hour, temp, flags]]]
const FORCED = {
  F7: {
    48: [[8.3, 38, []], [13.2, 38, []], [19.8, 39, ['Power']]],
    49: [[7.6, 42, ['Power']], [12.25, 47, ['Power', 'Temperature']], [17.8, 43, ['Temperature']]],
    50: [[8.0, 39, []]],
    71: [[9.1, 40, ['Power']], [15.5, 38, []]],
    86: [[9.0, 38, []], [18.3, 40, ['Power']]],
    87: [[7.85, 44, ['Temperature']], [11.5, 51, ['Power', 'Temperature']], [17.2, 43, ['Temperature']]],
    88: [[8.5, 39, []]],
  },
  F2: { 15: [[10.4, 37, ['Power']]] },
};
const sched = FRIDGES.map(() => Array.from({ length: DAYS }, () => []));
const morningTime = () => wpick([() => 6.5 + rnd() * 2.5, () => 9 + rnd() * 2, () => 11 + rnd() * 0.9], [0.3, 0.5, 0.2])();
for (let fi = 0; fi < 9; fi++) {
  for (let d = 0; d < DAYS; d++) {
    const forced = FORCED[FRIDGES[fi].id]?.[d];
    if (forced) { sched[fi][d] = forced.map((x) => x[0]); continue; }
    const wk = dowOf(d) < 5;
    const times = [];
    if (wk || rnd() < 0.8) times.push(morningTime());
    if (rnd() < 0.18 && wk) times.push(morningTime());
    const na = wpick([0, 1, 2], [0.25, 0.45, 0.3]);
    for (let i = 0; i < na; i++) times.push(12 + rnd() * 5);
    const ne = wpick([0, 1, 2], [0.3, 0.45, 0.25]);
    for (let i = 0; i < ne; i++) times.push(17 + rnd() * 3.9);
    sched[fi][d] = times.sort((a, b) => a - b);
  }
}
let total = sched.flat(2).length;
const forcedDay = (fi, d) => !!FORCED[FRIDGES[fi].id]?.[d];
let guard = 0;
while (total !== 3126 && guard++ < 100000) {
  const fi = ri(0, 8), d = ri(0, DAYS - 1);
  if (forcedDay(fi, d)) continue;
  const arr = sched[fi][d];
  if (total < 3126) {
    if (arr.length >= 6) continue;
    arr.push(rnd() < 0.5 ? 12 + rnd() * 5 : 17 + rnd() * 3.9); arr.sort((a, b) => a - b); total++;
  } else {
    const idx = arr.findIndex((h) => h >= 12);
    if (idx < 0 || arr.length < 3) continue;
    arr.splice(idx + ri(0, arr.length - idx - 1), 1); total--;
  }
}
if (total !== 3126) throw new Error('checks ' + total);

// ---------- latent stock simulation ----------
const STEPS = 96, DT = 0.25, LVL = 12; // lbs per fill level
const prof = (h) => {
  if (h < 6.5 || h >= 22) return 0.04;
  const g = (m, s) => Math.exp(-((h - m) ** 2) / (2 * s * s));
  return 0.25 + 0.9 * g(8.2, 1.1) + 1.0 * g(12.6, 1.5) + 1.1 * g(17.8, 1.6);
};
const PROF = Array.from({ length: STEPS }, (_, s) => prof(s * DT));
const DOWF = [1.05, 1.0, 1.0, 1.0, 1.0, 1.25, 1.15];
const dropsBy = FRIDGES.map(() => Array.from({ length: DAYS }, () => []));
for (const dr of drops) dropsBy[FIDX[dr.fridge]][dr.d].push(dr);
const noiseDay = FRIDGES.map(() => Array.from({ length: DAYS }, () => Math.exp(0.28 * randn())));
const topup = FRIDGES.map(() => Array.from({ length: DAYS }, () => (rnd() < 0.22 ? { h: 7 + rnd() * 12, a: 0.5 + rnd() * 0.9 } : null)));
const eps = FRIDGES.map((_, fi) => sched[fi].map((a) => a.map(() => 0.22 * randn())));

function simulate(fi, scale, school) {
  const xs = new Float32Array(DAYS * STEPS);
  let x = 2.2, B = 0;
  for (let d = 0; d < DAYS; d++) {
    const dw = dowOf(d);
    const dayDrops = dropsBy[fi][d];
    const tu = topup[fi][d];
    const dayF = DOWF[dw] * noiseDay[fi][d] * scale;
    const sch = FRIDGES[fi].id === 'F3' && d >= POST && dw < 5;
    for (let s = 0; s < STEPS; s++) {
      const h = s * DT;
      for (const dr of dayDrops) if (dr.h >= h && dr.h < h + DT) { x += dr.lbs / LVL; }
      if (tu && tu.h >= h && tu.h < h + DT) x += tu.a;
      if (x > 4.4) { B = Math.min(3.5, B + (x - 4.4)); x = 4.4; }
      if (B > 0 && x < 2.6 && h > 6.5 && h < 21) { const m = Math.min(B, 0.3 * DT); B -= m; x += m; }
      let p = PROF[s];
      if (sch) p += school * (Math.exp(-((h - 8) ** 2) / 1.6) + 0.5 * Math.exp(-((h - 15.8) ** 2) / 2));
      const sat = Math.min(1, x / 0.6);
      x -= dayF * p * DT * sat;
      if (x < 0) x = 0;
      if (h > 7 && h < 20) x += 0.008 * DT; // small unlogged trickle
      xs[d * STEPS + s] = x;
    }
  }
  return xs;
}
const readFill = (xs, fi, d, i, h) => {
  const x = xs[d * STEPS + Math.min(STEPS - 1, Math.floor(h / DT))];
  return clamp(Math.round(x + eps[fi][d][i]), 0, 4);
};
function emptyDays(fi, xs) {
  const set = [];
  for (let d = 0; d < DAYS; d++) {
    if (dowOf(d) >= 5) continue;
    const t = sched[fi][d];
    let e = false;
    for (let i = 0; i < t.length; i++) if (t[i] < 12 && readFill(xs, fi, d, i, t[i]) === 0) e = true;
    if (e) set.push(d);
  }
  return set;
}
function calibrate(fi, school, target) {
  let lo = 0.01, hi = 0.5, best = null;
  for (let it = 0; it < 34; it++) {
    const mid = (lo + hi) / 2;
    const xs = simulate(fi, mid, school);
    const n = emptyDays(fi, xs).length;
    if (!best || Math.abs(n - target) < Math.abs(best.n - target)) best = { scale: mid, n, xs };
    if (n < target) lo = mid; else hi = mid;
  }
  return best;
}
const sims = [];
for (let fi = 0; fi < 9; fi++) {
  const f = FRIDGES[fi];
  if (f.id === 'F3') {
    // choose school surge so that ~5 of 25 pre-Labor-Day weekdays are empty mornings
    let lo = 0, hi = 14, res = null;
    for (let it = 0; it < 14; it++) {
      const mid = (lo + hi) / 2;
      const c = calibrate(fi, mid, f.K);
      const pre = emptyDays(fi, c.xs).filter((d) => d < POST).length;
      res = { ...c, school: mid, pre };
      if (pre > 5) lo = mid; else hi = mid;
    }
    sims.push(res);
  } else {
    sims.push(calibrate(fi, 0, f.K));
  }
}

// ---------- compile checks ----------
const ITEMS = ['produce', 'dairy', 'prepared meals', 'bread'];
const checks = [];
const lastClean = FRIDGES.map(() => -99);
for (let fi = 0; fi < 9; fi++) {
  const f = FRIDGES[fi];
  const xs = sims[fi].xs;
  for (let d = 0; d < DAYS; d++) {
    const forced = FORCED[f.id]?.[d];
    sched[fi][d].forEach((h, i) => {
      const fill = readFill(xs, fi, d, i, h);
      checks.push({ fi, d, h, fill, forced: forced ? forced[i] : null });
    });
  }
}
// patch exact empty-morning counts per fridge
for (let fi = 0; fi < 9; fi++) {
  const f = FRIDGES[fi];
  const byDay = {};
  checks.forEach((c) => { if (c.fi === fi && dowOf(c.d) < 5 && c.h < 12) (byDay[c.d] ||= []).push(c); });
  let eDays = Object.keys(byDay).filter((d) => byDay[d].some((c) => c.fill === 0)).map(Number);
  while (eDays.length > f.K) {
    const d = eDays.splice(ri(0, eDays.length - 1), 1)[0];
    byDay[d].forEach((c) => { if (c.fill === 0) c.fill = 1; });
  }
  const cand = Object.keys(byDay).map(Number).filter((d) => !eDays.includes(d));
  cand.sort((a, b) => Math.min(...byDay[a].map((c) => c.fill)) - Math.min(...byDay[b].map((c) => c.fill)) || rnd() - 0.5);
  while (eDays.length < f.K) {
    const d = cand.shift();
    byDay[d].sort((a, b) => a.h - b.h)[0].fill = 0;
    eDays.push(d);
  }
}

// attach attributes
checks.sort((a, b) => a.d - b.d || a.h - b.h || a.fi - b.fi);
const lastDrop = {}; // fridge -> {source: hour_abs}
const dropTimeline = drops.map((x) => ({ ...x, abs: x.d * 24 + x.h }));
const out = [];
checks.forEach((c) => {
  const f = FRIDGES[c.fi];
  const abs = c.d * 24 + c.h;
  const recent = (src, hrs) => dropTimeline.some((x) => x.fridge === f.id && (!src || x.source === src) && x.abs <= abs && abs - x.abs <= hrs);
  const mdl = c.d < 30 ? 0.8 : 0;
  let temp;
  const flags = [];
  if (c.forced) { temp = c.forced[1]; flags.push(...c.forced[2]); }
  else {
    temp = Math.round(f.tbase + (c.h > 12 && c.h < 18 ? 0.5 : 0) + (f.id === 'F4' ? mdl : 0) + randn() * 1.0);
    if (rnd() < (f.id === 'F4' ? 0.012 : 0.005)) temp += ri(3, 5);
    if (f.id === 'F4' && c.d < 30 && rnd() < 0.02) temp += 3;
    temp = clamp(temp, 33, 44);
    if (temp >= 41 && rnd() < 0.7) flags.push('Temperature');
  }
  // items
  let items = [];
  if (c.fill > 0) {
    const pB = recent("Rosa's Bakery", 30) ? 0.85 : 0.22;
    const pP = recent('Greenway Grocery', 72) ? 0.85 : 0.3;
    const pM = recent('Individual donor', 24) ? 0.5 : 0.2;
    if (rnd() < pB) items.push('bread');
    if (rnd() < pP) items.push('produce');
    if (rnd() < 0.3) items.push('dairy');
    if (rnd() < pM) items.push('prepared meals');
    if (c.fill >= 3 && items.length < 2) items.push(pick(ITEMS.filter((x) => !items.includes(x))));
    if (!items.length) items.push(pick(ITEMS));
    if (c.fill === 1 && items.length > 2) items = items.slice(0, 2);
    items = ITEMS.filter((x) => items.includes(x));
  }
  // cleaning + other flags
  const cleaned = rnd() < f.pClean * (c.h < 12 ? 1.3 : 0.8);
  if (cleaned) lastClean[c.fi] = c.d;
  if (!c.forced) {
    if (c.d - lastClean[c.fi] > 10 && rnd() < 0.07) flags.push('Needs deep clean');
    if (rnd() < (f.id === 'F4' ? 0.012 : 0.002)) flags.push('Door seal');
    if (rnd() < 0.003) flags.push('Leak');
    if (rnd() < (f.id === 'F6' || f.id === 'F9' ? 0.006 : 0.0005)) flags.push('Pests');
    if (rnd() < (f.id === 'F6' ? 0.011 : 0.0008)) flags.push('Vandalism');
  }
  const pool = pools[c.fi];
  const vol = wpick(pool, pool.map((v) => volWeight[VOLS.indexOf(v)]));
  out.push({ fridge: f.id, ts: tsOf(c.d, c.h), vol, fill: c.fill, temp, items, cleaned, flags: [...new Set(flags)] });
});
out.forEach((c, i) => (c.id = i + 1));

const dropsOut = drops.map((x, i) => ({ id: i + 1, ts: tsOf(x.d, x.h), fridge: x.fridge, source: x.source, lbs: x.lbs, type: x.type }));

const raw = {
  fridges: FRIDGES.map(({ id, name, hostType, neighborhood }) => ({ id, name, hostType, neighborhood })),
  checks: out.map((c) => [c.id, c.ts, c.fridge, c.vol, c.fill, c.temp, c.items, c.cleaned ? 1 : 0, c.flags]),
  drops: dropsOut.map((x) => [x.id, x.ts, x.fridge, x.source, x.lbs, x.type]),
};
fs.writeFileSync(new URL('../src/data/raw.json', import.meta.url), JSON.stringify(raw));
console.log('checks', out.length, 'drops', dropsOut.length, 'volunteers', new Set(out.map((c) => c.vol)).size);
console.log('F3 school', sims[2].school, 'pre-labor-day empties', sims[2].pre);
