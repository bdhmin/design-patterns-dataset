import { NOW_BASE } from './data';

const loadedAt = Date.now();
export const now = () => new Date(NOW_BASE.getTime() + (Date.now() - loadedAt));

const EAT = 3 * 3600 * 1000;
const pad = (n: number) => String(n).padStart(2, '0');

export const fmtTime = (d: Date) => {
  const e = new Date(d.getTime() + EAT);
  return `${pad(e.getUTCHours())}:${pad(e.getUTCMinutes())}`;
};

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDay = (d: Date) => {
  const e = new Date(d.getTime() + EAT);
  return `${DAYS[e.getUTCDay()]} ${e.getUTCDate()} ${MONTHS[e.getUTCMonth()]}`;
};

/** Add business hours (Mon–Fri, 08:00–17:00 EAT). */
export const addBusinessHours = (from: Date, hours: number) => {
  let e = new Date(from.getTime() + EAT); // shifted so UTC getters read EAT
  let remaining = hours * 60;
  const startOfDay = (x: Date) => { const y = new Date(x); y.setUTCHours(8, 0, 0, 0); return y; };
  const endOfDay = (x: Date) => { const y = new Date(x); y.setUTCHours(17, 0, 0, 0); return y; };
  const nextDay = (x: Date) => { const y = new Date(x); y.setUTCDate(y.getUTCDate() + 1); y.setUTCHours(8, 0, 0, 0); return y; };
  const isWeekend = (x: Date) => x.getUTCDay() === 0 || x.getUTCDay() === 6;
  while (remaining > 0) {
    if (isWeekend(e) || e >= endOfDay(e)) { e = nextDay(e); continue; }
    if (e < startOfDay(e)) e = startOfDay(e);
    const left = (endOfDay(e).getTime() - e.getTime()) / 60000;
    const use = Math.min(left, remaining);
    e = new Date(e.getTime() + use * 60000);
    remaining -= use;
  }
  return new Date(e.getTime() - EAT);
};

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
export const money = (n: number) => usd.format(n);
export const signedMoney = (n: number) => (n > 0 ? '+' : n < 0 ? '−' : '') + usd.format(Math.abs(n));
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
export const digits = (s: string) => s.replace(/[^0-9]/g, '');
export const withCommas = (s: string) => (s ? Number(s).toLocaleString('en-US') : '');
