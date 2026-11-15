import {
  CHECKS, DROPS, FRIDGES, DAYS, LAST_DAY, POST_START, WEEKS, dowOf, SOURCES,
  type Check, type Drop, type Source,
} from './data';

export type Range = { from: number; to: number };
export const FULL: Range = { from: 0, to: LAST_DAY };
export const PRE: Range = { from: 0, to: POST_START - 1 };
export const POST: Range = { from: POST_START, to: LAST_DAY };
export const inR = (d: number, r: Range) => d >= r.from && d <= r.to;
export const rangeDays = (r: Range) => r.to - r.from + 1;
export const WEEKDAYS = [0, 1, 2, 3, 4];
export const ALL_IDS = FRIDGES.map((f) => f.id);

export const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
export const median = (a: number[]) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
export const pct = (x: number, d = 0) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : '—');

// ---------- indexes ----------
export const checksByFridge: Record<string, Check[]> = {};
export const dropsByFridge: Record<string, Drop[]> = {};
for (const f of FRIDGES) { checksByFridge[f.id] = []; dropsByFridge[f.id] = []; }
for (const c of CHECKS) checksByFridge[c.fridge].push(c);
for (const d of DROPS) dropsByFridge[d.fridge].push(d);

export type FD = { fridge: string; day: number; dow: number; morning: number; empty: boolean; firstEmpty: number | null };
export const fridgeDays: Record<string, FD[]> = {};
for (const f of FRIDGES) {
  fridgeDays[f.id] = Array.from({ length: DAYS }, (_, day) => ({ fridge: f.id, day, dow: dowOf(day), morning: 0, empty: false, firstEmpty: null }));
  for (const c of checksByFridge[f.id]) {
    if (c.hour >= 12) continue;
    const fd = fridgeDays[f.id][c.day];
    fd.morning++;
    if (c.fill === 0) { fd.empty = true; if (fd.firstEmpty === null || c.hour < fd.firstEmpty) fd.firstEmpty = c.hour; }
  }
}

export const idsOf = (fridge: string | null) => (fridge ? [fridge] : ALL_IDS);

export function checksIn(fridge: string | null, r: Range) {
  const out: Check[] = [];
  for (const id of idsOf(fridge)) for (const c of checksByFridge[id]) if (inR(c.day, r)) out.push(c);
  return out;
}
export function dropsIn(fridge: string | null, r: Range, sources: Source[] = SOURCES) {
  const out: Drop[] = [];
  for (const id of idsOf(fridge)) for (const d of dropsByFridge[id]) if (inR(d.day, r) && sources.includes(d.source)) out.push(d);
  return out;
}

// ---------- empty-before-noon ----------
export type KN = { k: number; n: number; rate: number };
const kn = (k: number, n: number): KN => ({ k, n, rate: n ? k / n : NaN });
export function emptyAgg(fridge: string | null, r: Range, dows: number[] = WEEKDAYS): KN {
  let k = 0, n = 0;
  for (const id of idsOf(fridge)) for (let d = r.from; d <= r.to; d++) {
    const fd = fridgeDays[id][d];
    if (!dows.includes(fd.dow) || !fd.morning) continue;
    n++; if (fd.empty) k++;
  }
  return kn(k, n);
}

export type RunoutRow = {
  fridge: string; all: KN; byDow: KN[]; medFirst: number | null; nFirst: number; pre: KN; post: KN;
};
export function runoutRows(r: Range): RunoutRow[] {
  return ALL_IDS.map((id) => {
    const byDow = [0, 1, 2, 3, 4, 5, 6].map((w) => emptyAgg(id, r, [w]));
    const firsts: number[] = [];
    for (let d = r.from; d <= r.to; d++) { const fd = fridgeDays[id][d]; if (fd.dow < 5 && fd.empty && fd.firstEmpty !== null) firsts.push(fd.firstEmpty); }
    return {
      fridge: id, all: emptyAgg(id, r), byDow,
      medFirst: firsts.length >= 3 ? median(firsts) : null, nFirst: firsts.length,
      pre: emptyAgg(id, PRE), post: emptyAgg(id, POST),
    };
  });
}

// ---------- heat grid (weekday × time of day) ----------
export const TIME_BINS: [number, number][] = [[7, 9], [9, 11], [11, 13], [13, 15], [15, 17], [17, 19], [19, 22]];
export const TIME_BIN_LABELS = ['7–9a', '9–11a', '11a–1p', '1–3p', '3–5p', '5–7p', '7–9p'];
export type Cell = { n: number; avg: number; empty: number };
export function heatGrid(fridge: string | null, r: Range): Cell[][] {
  const acc = Array.from({ length: 7 }, () => TIME_BINS.map(() => ({ s: 0, n: 0, e: 0 })));
  for (const c of checksIn(fridge, r)) {
    const bi = TIME_BINS.findIndex(([a, b]) => c.hour >= a && c.hour < b);
    if (bi < 0) continue;
    const a = acc[c.dow][bi]; a.n++; a.s += c.fill; if (c.fill === 0) a.e++;
  }
  return acc.map((row) => row.map((a) => ({ n: a.n, avg: a.n ? a.s / a.n : NaN, empty: a.n ? a.e / a.n : NaN })));
}

// ---------- weekly + hourly series ----------
export type WeekPoint = { week: number; k: number; n: number; rate: number; avgFill: number; nChecks: number };
export function weekly(fridge: string | null): WeekPoint[] {
  return Array.from({ length: WEEKS }, (_, w) => {
    const rr = { from: w * 7, to: w * 7 + 6 };
    const e = emptyAgg(fridge, rr);
    const cs = checksIn(fridge, rr);
    return { week: w, k: e.k, n: e.n, rate: e.rate, avgFill: mean(cs.map((c) => c.fill)), nChecks: cs.length };
  });
}
export function hourly(fridge: string | null, r: Range) {
  const out = Array.from({ length: 14 }, (_, i) => ({ hour: 7 + i, n: 0, s: 0 }));
  for (const c of checksIn(fridge, r)) { const i = Math.floor(c.hour) - 7; if (i >= 0 && i < 14) { out[i].n++; out[i].s += c.fill; } }
  return out.map((o) => ({ hour: o.hour, n: o.n, avg: o.n ? o.s / o.n : NaN }));
}

// ---------- fridge profile (compare view) ----------
export type Profile = {
  fridge: string; empty: KN; avgFill: number; morningFill: number; worstDow: { dow: number; rate: number; k: number; n: number };
  medFirst: number | null; avgTemp: number; maxTemp: number; checksPerWeek: number; cleanedPct: number; flagsPer100: number;
  lbsPerWeek: number; dropsPerWeek: number; powerFlags: number; nChecks: number;
};
export function profile(id: string, r: Range): Profile {
  const cs = checksIn(id, r);
  const weeks = rangeDays(r) / 7;
  const e = emptyAgg(id, r);
  const byDow = WEEKDAYS.map((w) => ({ dow: w, ...emptyAgg(id, r, [w]) }));
  const worst = byDow.reduce((a, b) => ((b.rate || 0) > (a.rate || 0) ? b : a), byDow[0]);
  const row = runoutRows(r).find((x) => x.fridge === id)!;
  const ds = dropsIn(id, r);
  return {
    fridge: id, empty: e, avgFill: mean(cs.map((c) => c.fill)), morningFill: mean(cs.filter((c) => c.hour < 12).map((c) => c.fill)),
    worstDow: { dow: worst.dow, rate: worst.rate, k: worst.k, n: worst.n }, medFirst: row.medFirst,
    avgTemp: mean(cs.map((c) => c.temp)), maxTemp: Math.max(...cs.map((c) => c.temp)),
    checksPerWeek: cs.length / weeks, cleanedPct: cs.filter((c) => c.cleaned).length / cs.length,
    flagsPer100: (cs.filter((c) => c.flags.length).length / cs.length) * 100,
    lbsPerWeek: ds.reduce((a, d) => a + d.lbs, 0) / weeks, dropsPerWeek: ds.length / weeks,
    powerFlags: cs.filter((c) => c.flags.includes('Power')).length, nChecks: cs.length,
  };
}

// ---------- outliers ----------
export function robustZ(values: number[]): number[] {
  const med = median(values);
  const mad = median(values.map((v) => Math.abs(v - med)));
  if (mad > 0) return values.map((v) => (0.6745 * (v - med)) / mad);
  const meanAd = mean(values.map((v) => Math.abs(v - med)));
  return values.map((v) => (meanAd > 0 ? (v - med) / (1.253314 * meanAd) : 0));
}

// ---------- donations ----------
export const EVENT_BINS = ['12h before', '0–3h after', '3–6h', '6–12h', '12–24h', '24–48h'];
export type EventPoint = { bin: string; n: number; avg: number; empty: number };
export function eventStudy(fridge: string | null, r: Range, source: Source | 'any') {
  const bins = EVENT_BINS.map(() => ({ n: 0, s: 0, e: 0 }));
  const base = { n: 0, s: 0, e: 0 };
  for (const id of idsOf(fridge)) {
    const all = dropsByFridge[id];
    const mine = source === 'any' ? all : all.filter((d) => d.source === source);
    for (const c of checksByFridge[id]) {
      if (!inR(c.day, r)) continue;
      const t = c.day * 24 + c.hour;
      let prev = Infinity, next = Infinity;
      for (const d of mine) { const dt = d.day * 24 + d.hour; if (dt <= t) prev = Math.min(prev, t - dt); else { next = dt - t; break; } }
      let bi = -1;
      if (prev <= 48) bi = prev < 3 ? 1 : prev < 6 ? 2 : prev < 12 ? 3 : prev < 24 ? 4 : 5;
      else if (next <= 12) bi = 0;
      if (bi >= 0) { bins[bi].n++; bins[bi].s += c.fill; if (c.fill === 0) bins[bi].e++; }
      else { base.n++; base.s += c.fill; if (c.fill === 0) base.e++; }
    }
  }
  const pts: EventPoint[] = bins.map((b, i) => ({ bin: EVENT_BINS[i], n: b.n, avg: b.n ? b.s / b.n : NaN, empty: b.n ? b.e / b.n : NaN }));
  return { pts, base: { n: base.n, avg: base.n ? base.s / base.n : NaN, empty: base.n ? base.e / base.n : NaN } };
}

// Weekday fridge-days with a drop (from `sources`) before 10:00 vs without
export function dropDayCompare(r: Range, sources: Source[]) {
  return ALL_IDS.map((id) => {
    const dropDays = new Set(dropsByFridge[id].filter((d) => sources.includes(d.source) && d.hour < 10).map((d) => d.day));
    let kd = 0, nd = 0, ko = 0, no = 0;
    for (let d = r.from; d <= r.to; d++) {
      const fd = fridgeDays[id][d];
      if (fd.dow > 4 || !fd.morning) continue;
      if (dropDays.has(d)) { nd++; if (fd.empty) kd++; } else { no++; if (fd.empty) ko++; }
    }
    return { fridge: id, drop: kn(kd, nd), other: kn(ko, no) };
  });
}

export function weeklyLbs(fridge: string | null) {
  const out = Array.from({ length: WEEKS }, () => ({ "Rosa's Bakery": 0, 'Greenway Grocery': 0, 'Individual donor': 0 } as Record<Source, number>));
  for (const d of dropsIn(fridge, FULL)) out[Math.floor(d.day / 7)][d.source] += d.lbs;
  return out;
}
export function supplyTable(r: Range) {
  const weeks = rangeDays(r) / 7;
  return ALL_IDS.map((id) => {
    const ds = dropsIn(id, r);
    const by: Record<Source, number> = { "Rosa's Bakery": 0, 'Greenway Grocery': 0, 'Individual donor': 0 };
    ds.forEach((d) => (by[d.source] += d.lbs));
    const lbs = ds.length ? Object.values(by).reduce((a, b) => a + b, 0) : 0;
    return { fridge: id, by, lbs, drops: ds.length, lbsPerWeek: lbs / weeks, avgFill: mean(checksIn(id, r).map((c) => c.fill)) };
  });
}

// ---------- temperature ----------
export const SAFE_F = 41;
export const INCIDENT_F = 45;
export type Incident = { check: Check; powerBefore: Check[] };
export function incidents(r: Range): Incident[] {
  return CHECKS.filter((c) => c.temp >= INCIDENT_F && inR(c.day, r)).map((c) => {
    const t = c.day * 24 + c.hour;
    const powerBefore = checksByFridge[c.fridge].filter((p) => p.flags.includes('Power') && p.day * 24 + p.hour <= t && t - (p.day * 24 + p.hour) <= 24);
    return { check: c, powerBefore };
  });
}
export function powerByFridge(r: Range) {
  return ALL_IDS.map((id) => {
    const fl = checksByFridge[id].filter((c) => inR(c.day, r) && c.flags.includes('Power'));
    // episodes: flags within 36h of each other count as one
    let episodes = 0; let last = -1e9;
    for (const c of fl) { const t = c.day * 24 + c.hour; if (t - last > 36) episodes++; last = t; }
    const warm = checksByFridge[id].filter((c) => inR(c.day, r) && c.temp > SAFE_F).length;
    return { fridge: id, flags: fl.length, episodes, warm, max: Math.max(...checksByFridge[id].filter((c) => inR(c.day, r)).map((c) => c.temp), 0) };
  });
}

// ---------- planner ----------
export type Candidate = {
  fridge: string; dow: number; here: KN; est: number; avoided: number; rosaHere: boolean; greenHere: boolean; postRate: number;
};
export const byGain = (a: Candidate, b: Candidate) => (Math.abs(a.avoided - b.avoided) < 0.15 ? b.postRate - a.postRate || b.here.rate - a.here.rate : b.avoided - a.avoided);
export function plannerModel(r: Range) {
  // pooled bakery-day performance
  let kp = 0, np = 0;
  const own: Record<string, KN> = {};
  for (const id of ALL_IDS) {
    const days = new Set(dropsByFridge[id].filter((d) => d.source === "Rosa's Bakery" && d.hour < 10).map((d) => d.day));
    let k = 0, n = 0;
    for (let d = r.from; d <= r.to; d++) { const fd = fridgeDays[id][d]; if (fd.dow > 4 || !fd.morning || !days.has(d)) continue; n++; if (fd.empty) k++; }
    own[id] = kn(k, n); kp += k; np += n;
  }
  const pooled = kn(kp, np);
  const M = 8; // shrink toward the pooled rate so a lucky 0-for-12 isn't read as a guarantee
  const est: Record<string, number> = {};
  for (const id of ALL_IDS) est[id] = (own[id].k + M * (pooled.rate || 0)) / (own[id].n + M);
  const weeksPerMonth = 4.33;
  const cands: Candidate[] = [];
  for (const id of ALL_IDS) for (let w = 0; w < 7; w++) {
    const here = emptyAgg(id, r, [w]);
    const rd = dropsByFridge[id].filter((d) => inR(d.day, r) && d.dow === w && d.hour < 10);
    cands.push({
      fridge: id, dow: w, here, est: est[id],
      avoided: Math.max(0, (here.rate || 0) - est[id]) * weeksPerMonth,
      rosaHere: rd.some((d) => d.source === "Rosa's Bakery"), greenHere: rd.some((d) => d.source === 'Greenway Grocery'),
      postRate: emptyAgg(id, POST, [w]).rate || 0,
    });
  }
  return { cands, own, pooled, est };
}

// Rosa's route by weekday (stops)
export function rosaRoute(r: Range) {
  const out: Record<number, string[]> = {};
  for (const d of dropsIn(null, r, ["Rosa's Bakery"])) { (out[d.dow] ||= []); if (!out[d.dow].includes(d.fridge)) out[d.dow].push(d.fridge); }
  for (const k in out) out[k].sort();
  return out;
}

// ---------- log filter ----------
export type LogFilter = {
  fridge: string; dow: number | -1; fill: 'any' | 'empty' | 'low'; before: 'any' | 'noon'; flag: string; warm: boolean; q: string;
};
export const DEFAULT_LOG: LogFilter = { fridge: 'all', dow: -1, fill: 'any', before: 'any', flag: 'any', warm: false, q: '' };
export function applyLog(rows: Check[], f: LogFilter) {
  return rows.filter((c) =>
    (f.fridge === 'all' || c.fridge === f.fridge) &&
    (f.dow < 0 || c.dow === f.dow) &&
    (f.fill === 'any' || (f.fill === 'empty' ? c.fill === 0 : c.fill <= 1)) &&
    (f.before === 'any' || c.hour < 12) &&
    (f.flag === 'any' || (f.flag === 'Any flag' ? c.flags.length > 0 : c.flags.includes(f.flag))) &&
    (!f.warm || c.temp > SAFE_F) &&
    (!f.q || c.vol.toLowerCase().includes(f.q.trim().toLowerCase())));
}
export const FLAG_TYPES = Array.from(new Set(CHECKS.flatMap((c) => c.flags))).sort();
