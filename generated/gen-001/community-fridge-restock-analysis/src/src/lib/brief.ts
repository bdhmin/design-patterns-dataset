import { CHECKS, DROPS, DOW_LONG, FRIDGE_BY_ID, dayLabel, fmtHour } from './data';
import { FULL, POST, PRE, byGain, dropDayCompare, emptyAgg, eventStudy, incidents, pct, plannerModel, runoutRows, INCIDENT_F } from './analysis';

export type Brief = { title: string; sub: string; sections: { h: string; lines: string[] }[] };

export function topCandidate(r = POST, allowed = [0, 1, 2, 3, 4]) {
  const m = plannerModel(r);
  return m.cands.filter((c) => allowed.includes(c.dow) && c.here.n >= 3).sort(byGain)[0];
}

export function buildBrief(pinned: { fridge: string; dow: number } | null): Brief {
  const rows = runoutRows(FULL).sort((a, b) => b.all.rate - a.all.rate);
  const [a, b] = rows;
  const net = emptyAgg(null, FULL);
  const comb = (a.all.k + b.all.k) / (a.all.n + b.all.n);
  const f3 = rows.find((r) => r.fridge === a.fridge)!;
  const lines1 = [
    `${a.fridge} and ${b.fridge} were empty before noon on ${pct(comb)} of weekdays (${a.all.k + b.all.k} of ${a.all.n + b.all.n} fridge-days). Network: ${pct(net.rate)}.`,
    `${a.fridge} ${FRIDGE_BY_ID[a.fridge].name}: ${pct(a.pre.rate)} before Labor Day (${a.pre.k}/${a.pre.n}), ${pct(a.post.rate)} since Sep 8 (${a.post.k}/${a.post.n}). ${b.fridge} ${FRIDGE_BY_ID[b.fridge].name}: ${pct(b.pre.rate)} then ${pct(b.post.rate)}.`,
  ];
  void f3;
  const rosa = eventStudy(null, FULL, "Rosa's Bakery");
  const any = eventStudy(null, FULL, 'any');
  const dd = dropDayCompare(FULL, ["Rosa's Bakery", 'Greenway Grocery']);
  const kd = dd.reduce((s, x) => s + x.drop.k, 0), nd = dd.reduce((s, x) => s + x.drop.n, 0);
  const ko = dd.reduce((s, x) => s + x.other.k, 0), no = dd.reduce((s, x) => s + x.other.n, 0);
  const lines2 = [
    `Checks within 3 hours of a Rosa's drop average fill ${rosa.pts[1].avg.toFixed(1)}; 24 to 48 hours later ${rosa.pts[5].avg.toFixed(1)}. With no drop in 48 hours: ${any.base.avg.toFixed(1)}.`,
    `Weekday mornings with a Rosa's or Greenway drop by 10 AM were empty ${pct(kd / nd)} of the time (${kd}/${nd}); mornings without one ${pct(ko / no)} (${ko}/${no}).`,
  ];
  const incs = incidents(FULL);
  const lines3 = incs.length ? [
    `${incs.map((i) => `${i.check.temp}°F at ${i.check.fridge} on ${dayLabel(i.check.day)} (${fmtHour(i.check.hour)})`).join('; ')}. These are the only readings of ${INCIDENT_F}°F or more.`,
    `${incs.filter((i) => i.powerBefore.length).length} of ${incs.length} followed a Power flag logged at the same fridge within the prior 24 hours.`,
  ] : ['No readings reached 45°F.'];
  const top = topCandidate(POST);
  const topAll = topCandidate(FULL);
  const rec: string[] = [];
  if (pinned) {
    const m = plannerModel(POST);
    const c = m.cands.find((x) => x.fridge === pinned.fridge && x.dow === pinned.dow)!;
    rec.push(`Recommendation: give ${pinned.fridge} ${FRIDGE_BY_ID[pinned.fridge].name} the bakery's second weekly drop on ${DOW_LONG[pinned.dow]}s.`);
    rec.push(`Since Labor Day, ${pinned.fridge} was empty before noon on ${c.here.k} of ${c.here.n} ${DOW_LONG[pinned.dow]}s. Estimated effect: about ${c.avoided.toFixed(1)} fewer empty mornings per month (a rough estimate from ${c.here.n} mornings).`);
  } else {
    rec.push('No recommendation pinned yet. Use the Extra drop tab to pick one.');
    if (top) rec.push(`Leading candidate since Labor Day: ${top.fridge} on ${DOW_LONG[top.dow]}s (${top.here.k}/${top.here.n} empty, about ${top.avoided.toFixed(1)} fewer empty mornings a month).`);
  }
  if (top && topAll && (top.fridge !== topAll.fridge || top.dow !== topAll.dow)) rec.push(`Over all 14 weeks the leader would be ${topAll.fridge} on ${DOW_LONG[topAll.dow]}s, so the answer depends on the period.`);
  void PRE; void CHECKS; void DROPS;
  return {
    title: 'Southside Free Fridge Network: Sunday meeting brief',
    sub: `Meeting Sun, Nov 15, 2026 · check logs Aug 4 – Nov 9 (${CHECKS.length.toLocaleString()} checks, ${DROPS.length} drops, 9 fridges)`,
    sections: [
      { h: 'Which fridges run out', lines: lines1 }, { h: 'Do drops change how full fridges are', lines: lines2 },
      { h: 'Warm-temperature incidents', lines: lines3 }, { h: 'Where the extra bakery drop should go', lines: rec },
    ],
  };
}
export const briefText = (b: Brief) => [b.title, b.sub, '', ...b.sections.flatMap((s) => [s.h.toUpperCase(), ...s.lines.map((l) => `- ${l}`), ''])].join('\n');
