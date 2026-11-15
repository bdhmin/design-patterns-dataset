import { useState, type ReactNode } from 'react';
import { useWidth, tipOn, hideTip } from './ui';
import { dayLabel, dayLong, fmtHour, LABOR_DAY, SOURCES, SOURCE_COLOR, type Source } from '../lib/data';

const AXIS = '#8a948e';
const GRID = '#e6e0d2';
const INK = '#1f2a26';

export const linear = (d0: number, d1: number, r0: number, r1: number) => (v: number) => r0 + ((v - d0) / (d1 - d0 || 1)) * (r1 - r0);

// ---------- generic line chart over evenly spaced x slots ----------
export type Series = { id: string; label: string; color: string; dash?: boolean; width?: number; values: number[]; dots?: boolean };
export function LineChart({
  series, xLabels, yMin = 0, yMax, yTicks, yFormat, height = 240, markers = [], band, tip, xEvery = 1, ariaLabel, refLines = [],
}: {
  series: Series[]; xLabels: string[]; yMin?: number; yMax: number; yTicks: number[]; yFormat: (v: number) => string; height?: number;
  markers?: { x: number; label: string }[]; band?: { from: number; to: number }; tip: (i: number) => ReactNode; xEvery?: number; ariaLabel: string;
  refLines?: { y: number; label: string; color: string }[];
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const m = { l: 40, r: 14, t: 14, b: 28 };
  const n = xLabels.length;
  const X = linear(0, n - 1, m.l + 10, w - m.r - 10);
  const Y = linear(yMin, yMax, height - m.b, m.t);
  const step = n > 1 ? X(1) - X(0) : 20;
  return (
    <div ref={ref} className="chart" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => { setHover(null); hideTip(); }}>
          {band && <rect x={X(band.from) - step / 2} width={X(band.to) - X(band.from) + step} y={m.t} height={height - m.t - m.b} fill="#1f6f5c" opacity={0.06} />}
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke={GRID} />
              <text x={m.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS}>{yFormat(t)}</text>
            </g>
          ))}
          {refLines.map((r) => (
            <g key={r.label}>
              <line x1={m.l} x2={w - m.r} y1={Y(r.y)} y2={Y(r.y)} stroke={r.color} strokeDasharray="4 3" />
              <text x={w - m.r - 2} y={Y(r.y) - 4} textAnchor="end" fontSize={10.5} fill={r.color}>{r.label}</text>
            </g>
          ))}
          {xLabels.map((l, i) => (i % xEvery === 0 ? <text key={i} x={X(i)} y={height - 8} textAnchor="middle" fontSize={11} fill={AXIS}>{l}</text> : null))}
          {markers.map((mk) => (
            <g key={mk.label}>
              <line x1={X(mk.x)} x2={X(mk.x)} y1={m.t} y2={height - m.b} stroke="#7a5c1e" strokeDasharray="3 3" />
              <text x={X(mk.x) + 5} y={m.t + 10} fontSize={10.5} fill="#7a5c1e">{mk.label}</text>
            </g>
          ))}
          {series.map((s) => {
            const pts = s.values.map((v, i) => (Number.isFinite(v) ? [X(i), Y(v)] : null));
            let d = ''; let pen = false;
            pts.forEach((p) => { if (!p) { pen = false; return; } d += `${pen ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`; pen = true; });
            return (
              <g key={s.id}>
                <path d={d} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.2} strokeDasharray={s.dash ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />
                {s.dots !== false && !s.dash && pts.map((p, i) => (p ? <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 4.5 : 2.8} fill="#fffdf8" stroke={s.color} strokeWidth={1.8} /> : null))}
              </g>
            );
          })}
          {hover !== null && <line x1={X(hover)} x2={X(hover)} y1={m.t} y2={height - m.b} stroke={INK} opacity={0.25} />}
          {xLabels.map((_, i) => (
            <rect key={i} x={X(i) - step / 2} width={step} y={m.t} height={height - m.t - m.b} fill="transparent"
              onMouseEnter={() => setHover(i)} {...tipOn(tip(i))} />
          ))}
        </svg>
      )}
    </div>
  );
}

// ---------- weekly bars (empty-before-noon rate) with a network line ----------
export function WeekBars({
  values, ns, network, range, color = '#bf4f2e', height = 200, ariaLabel, tip, weekLabels,
}: {
  values: number[]; ns: number[]; network: number[]; range: { from: number; to: number }; color?: string; height?: number; ariaLabel: string;
  tip: (i: number) => ReactNode; weekLabels: string[];
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const m = { l: 40, r: 14, t: 16, b: 28 };
  const n = values.length;
  const slot = (w - m.l - m.r) / n;
  const Y = linear(0, 1, height - m.b, m.t);
  const inRange = (i: number) => i * 7 + 6 >= range.from && i * 7 <= range.to;
  const sepX = m.l + slot * 5; // Labor Day Mon Sep 7 closes week index 4
  return (
    <div ref={ref} className="chart" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label={ariaLabel} onMouseLeave={hideTip}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}><line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={m.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS}>{Math.round(t * 100)}%</text></g>
          ))}
          <line x1={sepX} x2={sepX} y1={m.t - 4} y2={height - m.b} stroke="#7a5c1e" strokeDasharray="3 3" />
          <text x={sepX + 5} y={m.t + 6} fontSize={10.5} fill="#7a5c1e">Labor Day · school reopens</text>
          {values.map((v, i) => {
            const x = m.l + slot * i + slot * 0.18;
            const bw = slot * 0.64;
            return (
              <g key={i} opacity={inRange(i) ? 1 : 0.28} {...tipOn(tip(i))}>
                <rect x={m.l + slot * i} width={slot} y={m.t} height={height - m.t - m.b} fill="transparent" />
                <rect x={x} width={bw} y={Y(v)} height={Math.max(0, Y(0) - Y(v))} rx={2} fill={color} />
                {v === 0 && <rect x={x} width={bw} y={Y(0) - 2} height={2} fill={color} opacity={0.5} />}
                <text x={x + bw / 2} y={height - 10} textAnchor="middle" fontSize={10.5} fill={AXIS}>{weekLabels[i]}</text>
              </g>
            );
          })}
          <path d={network.map((v, i) => `${i ? 'L' : 'M'}${m.l + slot * i + slot / 2},${Y(v)}`).join('')} fill="none" stroke={INK} strokeWidth={1.8} strokeDasharray="5 4" />
          {ns.length === 0 && null}
        </svg>
      )}
    </div>
  );
}

// ---------- dot strip (outlier check) ----------
export function OutlierStrips({
  rows, colorOf, onPick,
}: {
  rows: { key: string; label: string; values: { id: string; v: number; z: number; tip: ReactNode }[]; fmt: (v: number) => string; median: number; higherIsWorse: boolean }[];
  colorOf: (id: string) => string | null;
  onPick: (id: string) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const rowH = 58, labelW = 190, m = { r: 24 };
  return (
    <div ref={ref} className="chart">
      {w > 0 && (
        <svg width={w} height={rows.length * rowH + 8} role="img" aria-label="Each fridge plotted on a strip per metric; outliers are flagged">
          {rows.map((r, ri) => {
            const vs = r.values.map((x) => x.v);
            const lo = Math.min(...vs), hi = Math.max(...vs);
            const pad = (hi - lo) * 0.08 || 1;
            const X = linear(lo - pad, hi + pad, labelW, w - m.r);
            const cy = ri * rowH + 30;
            // jitter overlapping dots into two lanes
            const sorted = [...r.values].sort((a, b) => a.v - b.v);
            const lane: Record<string, number> = {}; let lastX = -99; let l = 0;
            sorted.forEach((d) => { const x = X(d.v); l = x - lastX < 22 ? (l + 1) % 3 : 0; lane[d.id] = l; lastX = x; });
            return (
              <g key={r.key}>
                <line x1={0} x2={w} y1={ri * rowH + 2} y2={ri * rowH + 2} stroke={GRID} />
                <text x={0} y={cy - 4} fontSize={12.5} fontWeight={600} fill={INK}>{r.label}</text>
                <text x={0} y={cy + 12} fontSize={11} fill={AXIS}>median {r.fmt(r.median)}</text>
                <line x1={labelW} x2={w - m.r} y1={cy} y2={cy} stroke="#d7d0bf" strokeWidth={2} strokeLinecap="round" />
                <line x1={X(r.median)} x2={X(r.median)} y1={cy - 11} y2={cy + 11} stroke={INK} strokeWidth={1.5} />
                {r.values.map((d) => {
                  const out = Math.abs(d.z) > 3.5;
                  const bad = out && (r.higherIsWorse ? d.z > 0 : d.z < 0);
                  const col = colorOf(d.id);
                  const y = cy + (lane[d.id] - 1) * 12;
                  return (
                    <g key={d.id} style={{ cursor: 'pointer' }} onClick={() => onPick(d.id)} {...tipOn(d.tip)}>
                      <circle cx={X(d.v)} cy={y} r={out ? 7 : 5.5} fill={col ?? (out ? (bad ? '#bf4f2e' : '#2f7d68') : '#9fb2a8')} stroke={out ? INK : '#fffdf8'} strokeWidth={out ? 1.5 : 1} />
                      {(out || col) && <text x={X(d.v)} y={y - 11} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>{d.id}</text>}
                    </g>
                  );
                })}
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ---------- dumbbell: drop days vs other days ----------
export function Dumbbell({
  rows, height,
}: {
  rows: { id: string; label: string; a: { rate: number; k: number; n: number }; b: { rate: number; k: number; n: number } }[]; height?: number;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const rowH = 36, labelW = 150, m = { r: 70, t: 22 };
  const H = height ?? rows.length * rowH + m.t + 24;
  const X = linear(0, 1, labelW, w - m.r);
  return (
    <div ref={ref} className="chart">
      {w > 0 && (
        <svg width={w} height={H} role="img" aria-label="Share of weekday mornings empty, on days with and without a morning drop, per fridge" onMouseLeave={hideTip}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <g key={t}><line x1={X(t)} x2={X(t)} y1={m.t - 4} y2={H - 20} stroke={GRID} /><text x={X(t)} y={H - 6} textAnchor="middle" fontSize={11} fill={AXIS}>{Math.round(t * 100)}%</text></g>
          ))}
          {rows.map((r, i) => {
            const y = m.t + i * rowH + 12;
            const tipc = (
              <div>
                <b>{r.id} · {r.label}</b>
                <div>Mornings with a drop by 10 AM: {r.a.n ? `${r.a.k} of ${r.a.n} empty (${Math.round(r.a.rate * 100)}%)` : 'none'}</div>
                <div>Other weekday mornings: {r.b.k} of {r.b.n} empty ({Math.round(r.b.rate * 100)}%)</div>
              </div>
            );
            return (
              <g key={r.id} {...tipOn(tipc)}>
                <rect x={0} y={y - 14} width={w} height={rowH} fill="transparent" />
                <text x={0} y={y + 4} fontSize={12} fill={INK}><tspan fontWeight={700}>{r.id}</tspan> <tspan fill="#55625c">{r.label.length > 17 ? r.label.slice(0, 16) + '…' : r.label}</tspan></text>
                {r.a.n > 0 && <line x1={X(r.a.rate)} x2={X(r.b.rate)} y1={y} y2={y} stroke="#cdbf9f" strokeWidth={3} />}
                <circle cx={X(r.b.rate)} cy={y} r={6} fill="#bf4f2e" />
                {r.a.n > 0 && <circle cx={X(r.a.rate)} cy={y} r={6} fill="#fffdf8" stroke="#1f6f5c" strokeWidth={2.5} />}
                <text x={w - m.r + 8} y={y + 4} fontSize={11} fill="#55625c">{r.a.n ? `n=${r.a.n}` : 'no drops'}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ---------- stacked weekly pounds ----------
export function StackedWeeks({
  data, weekLabels, height = 220, range,
}: {
  data: Record<Source, number>[]; weekLabels: string[]; height?: number; range: { from: number; to: number };
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const m = { l: 44, r: 12, t: 12, b: 28 };
  const totals = data.map((d) => SOURCES.reduce((a, s) => a + d[s], 0));
  const max = Math.ceil(Math.max(...totals) / 100) * 100;
  const slot = (w - m.l - m.r) / data.length;
  const Y = linear(0, max, height - m.b, m.t);
  const sepX = m.l + slot * 5;
  const inRange = (i: number) => i * 7 + 6 >= range.from && i * 7 <= range.to;
  return (
    <div ref={ref} className="chart" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Pounds donated per week by source" onMouseLeave={hideTip}>
          {Array.from({ length: max / 100 + 1 }, (_, i) => i * 100).map((t) => (
            <g key={t}><line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={m.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS}>{t}</text></g>
          ))}
          <line x1={sepX} x2={sepX} y1={m.t} y2={height - m.b} stroke="#7a5c1e" strokeDasharray="3 3" />
          {data.map((d, i) => {
            let acc = 0;
            const x = m.l + slot * i + slot * 0.16, bw = slot * 0.68;
            const tipc = (<div><b>Week of {weekLabels[i]}</b>{SOURCES.map((s) => <div key={s}><span className="sw" style={{ background: SOURCE_COLOR[s] }} /> {s}: {d[s]} lbs</div>)}<div>Total {totals[i]} lbs</div></div>);
            return (
              <g key={i} opacity={inRange(i) ? 1 : 0.3} {...tipOn(tipc)}>
                <rect x={m.l + slot * i} width={slot} y={m.t} height={height - m.t - m.b} fill="transparent" />
                {SOURCES.map((s) => { const y0 = Y(acc), y1 = Y(acc + d[s]); acc += d[s]; return <rect key={s} x={x} width={bw} y={y1} height={Math.max(0, y0 - y1)} fill={SOURCE_COLOR[s]} />; })}
                <text x={x + bw / 2} y={height - 10} textAnchor="middle" fontSize={10.5} fill={AXIS}>{weekLabels[i]}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

// ---------- temperature scatter ----------
export type TPoint = { day: number; hour: number; temp: number; fridge: string; flags: string[]; vol: string };
export function TempChart({
  points, others, domain, highlight, power, safe, incident, height = 340, onPickIncident,
}: {
  points: TPoint[]; others: TPoint[]; domain: { from: number; to: number }; highlight: TPoint[]; power: TPoint[]; safe: number; incident: number; height?: number;
  onPickIncident?: (p: TPoint) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const m = { l: 44, r: 16, t: 16, b: 46 };
  const yMin = 32, yMax = 54;
  const X = linear(domain.from, domain.to + 1, m.l, w - m.r);
  const Y = linear(yMin, yMax, height - m.b, m.t);
  const span = domain.to - domain.from + 1;
  const tickEvery = span <= 10 ? 1 : span <= 24 ? 2 : span <= 50 ? 7 : 14;
  const ticks: number[] = [];
  for (let d = domain.from; d <= domain.to; d++) if ((d - domain.from) % tickEvery === 0) ticks.push(d);
  const tipFor = (p: TPoint) => (
    <div><b>{p.temp}°F · {p.fridge}</b><div>{dayLong(p.day)} · {fmtHour(p.hour)}</div><div>Volunteer {p.vol}</div>{p.flags.length > 0 && <div>Flags: {p.flags.join(', ')}</div>}</div>
  );
  return (
    <div ref={ref} className="chart" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Interior temperature readings over time" onMouseLeave={hideTip}>
          <rect x={m.l} width={w - m.l - m.r} y={Y(safe)} height={Y(yMin) - Y(safe)} fill="#2f7d68" opacity={0.05} />
          {[34, 38, 42, 46, 50, 54].map((t) => (
            <g key={t}><line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke={GRID} /><text x={m.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill={AXIS}>{t}°</text></g>
          ))}
          <line x1={m.l} x2={w - m.r} y1={Y(safe)} y2={Y(safe)} stroke="#b7791f" strokeWidth={1.4} strokeDasharray="5 3" />
          <text x={m.l + 4} y={Y(safe) - 5} fontSize={10.5} fill="#8a5a12">{safe}°F cold-holding limit</text>
          <line x1={m.l} x2={w - m.r} y1={Y(incident)} y2={Y(incident)} stroke="#bf4f2e" strokeWidth={1.2} strokeDasharray="2 3" />
          <text x={m.l + 4} y={Y(incident) - 5} fontSize={10.5} fill="#a23c1f">{incident}°F+ counted as an incident</text>
          {ticks.map((d) => (
            <g key={d}><line x1={X(d)} x2={X(d)} y1={height - m.b} y2={height - m.b + 4} stroke={AXIS} /><text x={X(d)} y={height - m.b + 17} textAnchor={tickEvery === 1 ? 'middle' : 'start'} fontSize={11} fill={AXIS}>{dayLabel(d)}</text></g>
          ))}
          {LABOR_DAY + 1 >= domain.from && LABOR_DAY + 1 <= domain.to && (
            <g><line x1={X(LABOR_DAY + 1)} x2={X(LABOR_DAY + 1)} y1={m.t} y2={height - m.b} stroke="#7a5c1e" strokeDasharray="3 3" /><text x={X(LABOR_DAY + 1) + 5} y={m.t + 10} fontSize={10.5} fill="#7a5c1e">Labor Day</text></g>
          )}
          {(() => {
            const mx = new Map<number, number>();
            points.forEach((p) => mx.set(p.day, Math.max(mx.get(p.day) ?? 0, p.temp)));
            const ds = [...mx.keys()].sort((a, b) => a - b);
            const d = ds.map((k, i) => `${i ? 'L' : 'M'}${X(k + 0.5).toFixed(1)},${Y(mx.get(k)!).toFixed(1)}`).join('');
            return <path d={d} fill="none" stroke="#2f7d68" strokeWidth={1.2} opacity={0.5} />;
          })()}
          {others.map((p, i) => <circle key={'o' + i} cx={X(p.day + p.hour / 24)} cy={Y(p.temp)} r={2.2} fill="#9aa59f" opacity={0.45} {...tipOn(tipFor(p))} />)}
          {points.map((p, i) => <circle key={'p' + i} cx={X(p.day + p.hour / 24)} cy={Y(p.temp)} r={span <= 10 ? 4.5 : 3} fill={p.temp > safe ? '#e08a2e' : '#2f7d68'} opacity={0.85} {...tipOn(tipFor(p))} />)}
          {highlight.map((p, i) => (
            <g key={'h' + i} style={{ cursor: 'pointer' }} onClick={() => onPickIncident?.(p)} {...tipOn(tipFor(p))}>
              <circle cx={X(p.day + p.hour / 24)} cy={Y(p.temp)} r={9} fill="none" stroke="#bf4f2e" strokeWidth={2} />
              <circle cx={X(p.day + p.hour / 24)} cy={Y(p.temp)} r={4.5} fill="#bf4f2e" />
              <text x={X(p.day + p.hour / 24) + 13} y={Y(p.temp) + 4} fontSize={12} fontWeight={700} fill="#a23c1f">{p.temp}°F · {dayLabel(p.day)}</text>
            </g>
          ))}
          {power.map((p, i) => {
            const x = X(p.day + p.hour / 24), y = height - m.b - 8;
            return <path key={'w' + i} d={`M${x},${y - 9} L${x + 6},${y + 3} L${x - 6},${y + 3} Z`} fill="#3b4cca" opacity={0.9} {...tipOn(<div><b>Power flag · {p.fridge}</b><div>{dayLong(p.day)} · {fmtHour(p.hour)}</div><div>Volunteer {p.vol}</div></div>)} />;
          })}
        </svg>
      )}
    </div>
  );
}
