import { useMemo } from 'react';
import { useApp } from '../state';
import { Delta, Legend, Panel, tipOn } from '../components/ui';
import { LineChart, OutlierStrips, linear } from '../components/charts';
import { useWidth, hideTip } from '../components/ui';
import { DOW, DOW_LONG, FRIDGES, FRIDGE_BY_ID, dayLabel, fmtHour, fmtHourShort, WEEKS } from '../lib/data';
import { emptyAgg, hourly, mean, median, pct, profile, robustZ, weekly, WEEKDAYS, ALL_IDS, type Profile } from '../lib/analysis';

export const CMP_COLORS = ['#bf4f2e', '#1f6f5c', '#4c5fd5', '#b7791f'];

type Metric = { key: string; label: string; get: (p: Profile) => number; fmt: (v: number) => string; worseHigher: boolean; text?: (p: Profile) => string; eps: number; dfmt?: (v: number) => string };
const METRICS: Metric[] = [
  { key: 'empty', label: 'Empty before noon (weekdays)', get: (p) => p.empty.rate, fmt: (v) => pct(v), worseHigher: true, eps: 0.005, dfmt: (v) => `${Math.round(v * 100)} pt`, text: (p) => `${pct(p.empty.rate)}` },
  { key: 'worst', label: 'Worst weekday', get: (p) => p.worstDow.rate, fmt: (v) => pct(v), worseHigher: true, eps: 0.01, dfmt: (v) => `${Math.round(v * 100)} pt`, text: (p) => `${DOW[p.worstDow.dow]} · ${pct(p.worstDow.rate)}` },
  { key: 'first', label: 'Typical first empty reading', get: (p) => p.medFirst ?? NaN, fmt: (v) => fmtHour(v), worseHigher: false, eps: 0.1, dfmt: (v) => `${Math.round(v * 60)} min`, text: (p) => (p.medFirst === null ? '—' : fmtHour(p.medFirst)) },
  { key: 'fill', label: 'Average fill, all checks', get: (p) => p.avgFill, fmt: (v) => v.toFixed(1), worseHigher: false, eps: 0.05 },
  { key: 'mfill', label: 'Average fill before noon', get: (p) => p.morningFill, fmt: (v) => v.toFixed(1), worseHigher: false, eps: 0.05 },
  { key: 'temp', label: 'Average interior temp', get: (p) => p.avgTemp, fmt: (v) => `${v.toFixed(1)}°F`, worseHigher: true, eps: 0.2 },
  { key: 'max', label: 'Highest reading', get: (p) => p.maxTemp, fmt: (v) => `${Math.round(v)}°F`, worseHigher: true, eps: 0.5 },
  { key: 'cpw', label: 'Checks logged per week', get: (p) => p.checksPerWeek, fmt: (v) => v.toFixed(1), worseHigher: false, eps: 0.5 },
  { key: 'clean', label: 'Checks with a cleaning', get: (p) => p.cleanedPct, fmt: (v) => pct(v), worseHigher: false, eps: 0.01, dfmt: (v) => `${Math.round(v * 100)} pt` },
  { key: 'flags', label: 'Issue flags per 100 checks', get: (p) => p.flagsPer100, fmt: (v) => v.toFixed(1), worseHigher: true, eps: 0.1 },
  { key: 'lbs', label: 'Donated lbs per week (logged)', get: (p) => p.lbsPerWeek, fmt: (v) => v.toFixed(0), worseHigher: false, eps: 1 },
  { key: 'drops', label: 'Drops per week', get: (p) => p.dropsPerWeek, fmt: (v) => v.toFixed(1), worseHigher: false, eps: 0.1 },
];

function GroupedBars({ ids, colors, range, height = 230 }: { ids: string[]; colors: string[]; range: { from: number; to: number }; height?: number }) {
  const [ref, w] = useWidth<HTMLDivElement>();
  const m = { l: 40, r: 12, t: 14, b: 26 };
  const data = ids.map((id) => WEEKDAYS.map((d) => emptyAgg(id, range, [d])));
  const net = WEEKDAYS.map((d) => emptyAgg(null, range, [d]));
  const slot = (w - m.l - m.r) / 5;
  const Y = linear(0, 1, height - m.b, m.t);
  const bw = Math.min(26, (slot * 0.8) / Math.max(ids.length, 1));
  return (
    <div ref={ref} className="chart" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} role="img" aria-label="Empty-before-noon rate by weekday for the selected fridges" onMouseLeave={hideTip}>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => <g key={t}><line x1={m.l} x2={w - m.r} y1={Y(t)} y2={Y(t)} stroke="#e6e0d2" /><text x={m.l - 8} y={Y(t) + 4} textAnchor="end" fontSize={11} fill="#8a948e">{Math.round(t * 100)}%</text></g>)}
          {WEEKDAYS.map((d) => {
            const cx = m.l + slot * d + slot / 2;
            const tipc = (<div><b>{DOW_LONG[d]}</b>{ids.map((id, i) => <div key={id}><span className="sw" style={{ background: colors[i] }} /> {id}: {data[i][d].k} of {data[i][d].n} ({pct(data[i][d].rate)})</div>)}<div>Network: {pct(net[d].rate)}</div></div>);
            return (
              <g key={d} {...tipOn(tipc)}>
                <rect x={m.l + slot * d} width={slot} y={m.t} height={height - m.t - m.b} fill="transparent" />
                {ids.map((id, i) => {
                  const v = data[i][d].rate || 0; const x = cx - (ids.length * bw) / 2 + i * bw;
                  return <rect key={id} x={x + 1} width={bw - 2} y={Y(v)} height={Math.max(1.5, Y(0) - Y(v))} rx={2} fill={colors[i]} />;
                })}
                <line x1={cx - slot * 0.4} x2={cx + slot * 0.4} y1={Y(net[d].rate)} y2={Y(net[d].rate)} stroke="#1f2a26" strokeWidth={2} strokeDasharray="4 3" />
                <text x={cx} y={height - 8} textAnchor="middle" fontSize={11.5} fill="#55625c">{DOW[d]}</text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}

export default function Compare() {
  const { range, compare, toggleCompare } = useApp();
  const profiles = useMemo(() => Object.fromEntries(ALL_IDS.map((id) => [id, profile(id, range)])) as Record<string, Profile>, [range]);
  const netMean = (m: Metric) => mean(ALL_IDS.map((id) => m.get(profiles[id])).filter(Number.isFinite));
  const colorOf = (id: string) => { const i = compare.indexOf(id); return i >= 0 ? CMP_COLORS[i] : null; };

  const wkNet = useMemo(() => weekly(null), []);
  const wks = useMemo(() => compare.map((id) => weekly(id)), [compare]);
  const hrNet = useMemo(() => hourly(null, range), [range]);
  const hrs = useMemo(() => compare.map((id) => hourly(id, range)), [compare, range]);

  const outlierRows = useMemo(() => {
    const defs: { key: string; label: string; get: (p: Profile) => number; fmt: (v: number) => string; hw: boolean; min: number }[] = [
      { key: 'empty', label: 'Empty before noon', get: (p) => p.empty.rate, fmt: (v) => pct(v), hw: true, min: 0.12 },
      { key: 'fill', label: 'Average fill (0–4)', get: (p) => p.avgFill, fmt: (v) => v.toFixed(2), hw: false, min: 0.6 },
      { key: 'avgT', label: 'Average temp', get: (p) => p.avgTemp, fmt: (v) => `${v.toFixed(1)}°F`, hw: true, min: 1.2 },
      { key: 'maxT', label: 'Highest temp reading', get: (p) => p.maxTemp, fmt: (v) => `${v}°F`, hw: true, min: 3 },
      { key: 'cpw', label: 'Checks per week', get: (p) => p.checksPerWeek, fmt: (v) => v.toFixed(1), hw: false, min: 5 },
      { key: 'clean', label: 'Checks with a cleaning', get: (p) => p.cleanedPct, fmt: (v) => pct(v), hw: false, min: 0.1 },
      { key: 'flags', label: 'Issue flags per 100 checks', get: (p) => p.flagsPer100, fmt: (v) => v.toFixed(1), hw: true, min: 1.5 },
      { key: 'lbs', label: 'Donated lbs per week', get: (p) => p.lbsPerWeek, fmt: (v) => v.toFixed(0), hw: false, min: 25 },
    ];
    return defs.map((d) => {
      const vals = ALL_IDS.map((id) => d.get(profiles[id]));
      const med = median(vals);
      const z = robustZ(vals).map((zz, i) => (Math.abs(vals[i] - med) >= d.min ? zz : Math.min(3.4, Math.max(-3.4, zz))));
      return {
        key: d.key, label: d.label, fmt: d.fmt, median: median(vals), higherIsWorse: d.hw,
        values: ALL_IDS.map((id, i) => ({ id, v: vals[i], z: z[i], tip: <div><b>{id} · {FRIDGE_BY_ID[id].name}</b><div>{d.label}: {d.fmt(vals[i])}</div><div className="muted">{Math.abs(z[i]) > 3.5 ? 'Outlier vs the other fridges' : 'Within the usual spread'} · click to add to the comparison</div></div> })),
      };
    });
  }, [profiles]);
  const flagged = outlierRows.flatMap((r) => r.values.filter((v) => Math.abs(v.z) > 3.5).map((v) => ({ metric: r.label, id: v.id })));
  const flaggedBy: Record<string, string[]> = {};
  flagged.forEach((f) => (flaggedBy[f.id] ||= []).push(f.metric));

  const xLabels = Array.from({ length: WEEKS }, (_, w) => dayLabel(w * 7));
  const cmpSeries = (key: 'avgFill') => [
    ...compare.map((id, i) => ({ id, label: id, color: CMP_COLORS[i], values: wks[i].map((p) => p[key]) })),
    { id: 'net', label: 'Network', color: '#1f2a26', dash: true, values: wkNet.map((p) => p[key]) },
  ];

  return (
    <div className="view">
      <div className="lede">
        <h1>Compare fridges side by side</h1>
        <p>Pick up to four. Every number follows the date filter above, so you can set “After Labor Day” and see how the same fridges look since the school reopened.</p>
      </div>

      <div className="chips" role="group" aria-label="Fridges to compare">
        {FRIDGES.map((f) => {
          const c = colorOf(f.id);
          const full = !c && compare.length >= 4;
          return (
            <button key={f.id} type="button" className={`chip ${c ? 'on' : ''}`} disabled={full} aria-pressed={!!c} onClick={() => toggleCompare(f.id)}
              style={c ? { borderColor: c, boxShadow: `inset 0 0 0 1px ${c}` } : undefined} title={full ? 'Remove one first (max 4)' : f.name}>
              <i style={{ background: c ?? '#d7d0bf' }} />
              <b>{f.id}</b> {f.name}
              {flaggedBy[f.id] && <em title={`Outlier on: ${flaggedBy[f.id].join(', ')}`}>outlier</em>}
            </button>
          );
        })}
      </div>

      <div className="grid-2">
        <Panel title="Side by side" sub="Arrows compare each fridge with the nine-fridge average. Rust means worse, green means better.">
          {compare.length === 0 ? <p className="empty">Choose at least one fridge above.</p> : (
            <table className="cmp">
              <thead>
                <tr>
                  <th />
                  {compare.map((id, i) => (
                    <th key={id} className="c" style={{ borderTop: `3px solid ${CMP_COLORS[i]}` }}>
                      <b>{id}</b><small>{FRIDGE_BY_ID[id].name}</small><small className="nb">{FRIDGE_BY_ID[id].neighborhood}</small>
                    </th>
                  ))}
                  <th className="c netc"><b>Average</b><small>9 fridges</small></th>
                </tr>
              </thead>
              <tbody>
                {METRICS.map((m) => {
                  const nm = netMean(m);
                  return (
                    <tr key={m.key}>
                      <th scope="row">{m.label}</th>
                      {compare.map((id) => {
                        const p = profiles[id]; const v = m.get(p);
                        return (
                          <td key={id} className="c">
                            <span className="v">{m.text ? m.text(p) : Number.isFinite(v) ? m.fmt(v) : '—'}</span>
                            {Number.isFinite(v) && m.key !== 'worst' && <Delta v={v - nm} eps={m.eps} worseWhenHigher={m.worseHigher} fmt={(x) => (m.dfmt ? m.dfmt(x) : m.fmt(x))} />}
                          </td>
                        );
                      })}
                      <td className="c netc">{m.key === 'worst' ? '' : Number.isFinite(nm) ? m.fmt(nm) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <div className="stack">
          <Panel title="Average fill by week" sub="0 = empty, 4 = full. Shaded weeks are the date filter.">
            <Legend items={[...compare.map((id, i) => ({ label: id, color: CMP_COLORS[i] })), { label: 'Network', color: '#1f2a26', dash: true }]} />
            <LineChart
              ariaLabel="Weekly average fill for the selected fridges and network" series={cmpSeries('avgFill')} xLabels={xLabels} xEvery={2}
              yMin={0} yMax={4} yTicks={[0, 1, 2, 3, 4]} yFormat={(v) => String(v)} height={190} band={{ from: Math.floor(range.from / 7), to: Math.floor(range.to / 7) }}
              markers={[{ x: 4.5, label: 'Labor Day' }]}
              tip={(i) => (<div><b>Week of {xLabels[i]}</b>{compare.map((id, k) => <div key={id}><span className="sw" style={{ background: CMP_COLORS[k] }} /> {id}: {wks[k][i].avgFill.toFixed(2)}</div>)}<div>Network: {wkNet[i].avgFill.toFixed(2)}</div></div>)}
            />
          </Panel>
          <Panel title="Fill through the day" sub="Average fill at each hour of the day, over the date filter.">
            <LineChart
              ariaLabel="Average fill by hour of day" height={190}
              series={[...compare.map((id, i) => ({ id, label: id, color: CMP_COLORS[i], values: hrs[i].map((h) => h.avg) })), { id: 'net', label: 'Network', color: '#1f2a26', dash: true, values: hrNet.map((h) => h.avg) }]}
              xLabels={hrNet.map((h) => fmtHourShort(h.hour))} xEvery={1} yMin={0} yMax={4} yTicks={[0, 1, 2, 3, 4]} yFormat={(v) => String(v)}
              tip={(i) => (<div><b>{fmtHour(hrNet[i].hour)} – {fmtHour(hrNet[i].hour + 1)}</b>{compare.map((id, k) => <div key={id}><span className="sw" style={{ background: CMP_COLORS[k] }} /> {id}: {Number.isFinite(hrs[k][i].avg) ? hrs[k][i].avg.toFixed(2) : '—'} <span className="muted">(n={hrs[k][i].n})</span></div>)}<div>Network: {hrNet[i].avg.toFixed(2)}</div></div>)}
            />
          </Panel>
          <Panel title="Empty before noon, by weekday" sub="Dashed tick = network on that weekday.">
            <Legend items={compare.map((id, i) => ({ label: id, color: CMP_COLORS[i] }))} />
            <GroupedBars ids={compare} colors={CMP_COLORS} range={range} height={170} />
          </Panel>
        </div>
      </div>

      <Panel
        title="Outlier check"
        sub={<>Each dot is a fridge. The black tick is the median. A fridge is flagged (ringed, labeled) when it sits far outside the others’ spread (robust z-score above 3.5). Click a dot to add it to the comparison.</>}
      >
        <OutlierStrips rows={outlierRows} colorOf={colorOf} onPick={(id) => toggleCompare(id)} />
        {flagged.length > 0 && (
          <p className="insight">
            Flagged: {Object.entries(flaggedBy).map(([id, ms], i) => <span key={id}>{i > 0 && ' · '}<b>{id}</b> ({ms.join(', ')})</span>)}.
          </p>
        )}
      </Panel>
    </div>
  );
}

