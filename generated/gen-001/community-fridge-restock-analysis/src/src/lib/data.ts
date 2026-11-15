import raw from '../data/raw.json';

export type Fridge = { id: string; name: string; hostType: string; neighborhood: string };
export type Check = {
  id: number; ts: string; day: number; dow: number; hour: number; fridge: string; vol: string;
  fill: number; temp: number; items: string[]; cleaned: boolean; flags: string[];
};
export type Source = "Rosa's Bakery" | 'Greenway Grocery' | 'Individual donor';
export type Drop = { id: number; ts: string; day: number; dow: number; hour: number; fridge: string; source: Source; lbs: number; type: string };

export const DAYS = 98;                 // Aug 4 – Nov 9, 2026
export const START_MS = Date.UTC(2026, 7, 4);
export const LABOR_DAY = 34;            // Mon Sep 7
export const POST_START = 35;           // Tue Sep 8 – first school day
export const LAST_DAY = DAYS - 1;
export const WEEKS = 14;
export const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const DOW_LONG = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const dayToDate = (d: number) => new Date(START_MS + d * 864e5);
export const dayLabel = (d: number) => { const t = dayToDate(d); return `${MON[t.getUTCMonth()]} ${t.getUTCDate()}`; };
export const dayLong = (d: number) => `${DOW[(d + 1) % 7]}, ${dayLabel(d)}`;
export const dayIso = (d: number) => dayToDate(d).toISOString().slice(0, 10);
export const isoToDay = (s: string) => Math.round((Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) - START_MS) / 864e5);
export const dowOf = (d: number) => (d + 1) % 7;
export const weekOf = (d: number) => Math.floor(d / 7);
export function fmtHour(h: number) {
  const m = Math.round(h * 60); let hh = Math.floor(m / 60); const mm = m % 60;
  const ap = hh >= 12 ? 'PM' : 'AM'; hh = hh % 12 || 12;
  return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
}
export const fmtHourShort = (h: number) => { const hh = Math.floor(h); return `${hh % 12 || 12}${hh >= 12 ? 'p' : 'a'}`; };

const parse = (ts: string) => ({ day: isoToDay(ts), hour: +ts.slice(11, 13) + +ts.slice(14, 16) / 60 });

export const FRIDGES: Fridge[] = raw.fridges as Fridge[];
export const FRIDGE_BY_ID: Record<string, Fridge> = Object.fromEntries(FRIDGES.map((f) => [f.id, f]));

export const CHECKS: Check[] = (raw.checks as any[]).map((r) => {
  const p = parse(r[1]);
  return { id: r[0], ts: r[1], day: p.day, dow: dowOf(p.day), hour: p.hour, fridge: r[2], vol: r[3], fill: r[4], temp: r[5], items: r[6], cleaned: !!r[7], flags: r[8] };
});
export const DROPS: Drop[] = (raw.drops as any[]).map((r) => {
  const p = parse(r[1]);
  return { id: r[0], ts: r[1], day: p.day, dow: dowOf(p.day), hour: p.hour, fridge: r[2], source: r[3], lbs: r[4], type: r[5] };
});

export const SOURCES: Source[] = ["Rosa's Bakery", 'Greenway Grocery', 'Individual donor'];
export const SOURCE_COLOR: Record<Source, string> = { "Rosa's Bakery": '#c2410c', 'Greenway Grocery': '#1f6f5c', 'Individual donor': '#5b6bd0' };
export const SOURCE_SHORT: Record<Source, string> = { "Rosa's Bakery": "Rosa's", 'Greenway Grocery': 'Greenway', 'Individual donor': 'Individuals' };
export const DATA_THROUGH = LAST_DAY; // Mon Nov 9
