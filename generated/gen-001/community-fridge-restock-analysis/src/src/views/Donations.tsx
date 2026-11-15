import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { Legend, Panel, Segmented, tipOn } from '../components/ui';
import { Dumbbell, LineChart, StackedWeeks } from '../components/charts';
import { DOW, FRIDGES, FRIDGE_BY_ID, SOURCES, SOURCE_COLOR, SOURCE_SHORT, dayLabel, fmtHour, WEEKS, type Source } from '../lib/data';
import { dropDayCompare, dropsIn, eventStudy, median, pct, supplyTable, weeklyLbs, EVENT_BINS } from '../lib/analysis';

type Filter = 'all' | Source;

export default function Donations() {
  const { range, openLog } = useApp();
  const [source, setSource] = useState<Filter>('all');
  const [fridge, setFridge] = useState<string>('all');
  const sel = fridge === 'all' ? null : fridge;
  const active: Source[] = source === 'all' ? SOURCES : [source];

  const studies = useMemo(() => Object.fromEntries(SOURCES.map((s) => [s, eventStudy(sel, range, s)])) as Record<Source, ReturnType<typeof eventStudy>>, [sel, range]);
  const anyStudy = useMemo(() => eventStudy(sel, range, 'any'), [sel, range]);
  const baseline = source === 'all' ? anyStudy.base : studies[source as Source].base;
  const dumb = useMemo(() => dropDayCompare(range, active), [range, source]);
  const lbs = useMemo(() => weeklyLbs(sel), [sel]);
  const supply = useMemo(() => supplyTable(range), [range]);
  const maxLbs = Math.max(...supply.map((s) => s.lbs));

  const rosa = studies["Rosa's Bakery"];
  const big = useMemo(() => dropDayCompare(range, ["Rosa's Bakery", 'Greenway Grocery']), [range]);
  const kd = big.reduce((s, x) => s + x.drop.k, 0), nd = big.reduce((s, x) => s + x.drop.n, 0);
  const ko = big.reduce((s, x) => s + x.other.k, 0), no = big.reduce((s, x) => s + x.other.n, 0);
  const headline = nd > 0 && Number.isFinite(rosa.pts[1].avg)
    ? <>Drops change a lot: weekday mornings with a Rosa’s or Greenway drop by 10 AM were empty <b>{pct(kd / nd)}</b> of the time, against <b>{pct(ko / no)}</b> without one. Fill peaks near <b>{rosa.pts[1].avg.toFixed(1)}</b> right after a Rosa’s drop and is back to <b>{rosa.pts[5].avg.toFixed(1)}</b> a day or two later.</>
    : <>Not enough drops in this period to read an effect.</>;

  const srcStats = SOURCES.map((s) => {
    const ds = dropsIn(sel, range, [s]);
    const byDow = [0, 1, 2, 3, 4, 5, 6].map((d) => ds.filter((x) => x.dow === d).length);
    const top = byDow.map((n, d) => ({ n, d })).filter((x) => x.n > ds.length * 0.15).sort((a, b) => b.n - a.n);
    return { s, n: ds.length, lbs: ds.reduce((a, d) => a + d.lbs, 0), med: median(ds.map((d) => d.lbs)), days: top.map((t) => DOW[t.d]).sort((a, b) => DOW.indexOf(a) - DOW.indexOf(b)).join(' / '), hour: median(ds.map((d) => d.hour)) };
  });

  const xLabels = EVENT_BINS;
  const series = active.map((s) => ({ id: s, label: SOURCE_SHORT[s], color: SOURCE_COLOR[s], values: studies[s].pts.map((p) => (p.n >= 5 ? p.avg : NaN)) }));

  return (
    <div className="view">
      <div className="lede">
        <h1>{headline}</h1>
        <p>Drops follow a fixed weekly schedule rather than being randomized, so read this as strong evidence, not proof. The first chart groups every check by how long it had been since the most recent drop at that fridge.</p>
      </div>

      <div className="filters-row">
        <div><span className="lbl">Source</span>
          <Segmented label="Donation source" value={source} onChange={setSource} options={[{ value: 'all', label: 'All sources' }, ...SOURCES.map((s) => ({ value: s as Filter, label: SOURCE_SHORT[s] }))]} />
        </div>
        <div><span className="lbl">Fridge</span>
          <select aria-label="Fridge filter" value={fridge} onChange={(e) => setFridge(e.target.value)}>
            <option value="all">All fridges</option>
            {FRIDGES.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
          </select>
        </div>
      </div>

      <div className="src-strip">
        {srcStats.map((s) => (
          <div key={s.s} className={`src ${active.includes(s.s) ? '' : 'dim'}`} style={{ borderTopColor: SOURCE_COLOR[s.s] }}>
            <h4>{s.s}</h4>
            <div className="big">{s.n} <small>drops</small> · {s.lbs.toLocaleString()} <small>lbs</small></div>
            <p>{s.n ? <>Median {s.med} lbs per drop. {s.s === 'Individual donor' ? 'Mostly evenings and weekends.' : <>{s.days}, around {fmtHour(s.hour)}.</>}</> : 'No drops in this selection.'}</p>
          </div>
        ))}
      </div>

      <div className="grid-2 wide-left">
        <Panel title="Fill level by time since the last drop" sub={`Average fill of every check, binned by hours since the last drop at the same fridge${sel ? ` (${sel} only)` : ''}. Points with fewer than 5 checks are left out.`}>
          <Legend items={[...active.map((s) => ({ label: SOURCE_SHORT[s], color: SOURCE_COLOR[s] })), { label: 'No drop in 48h', color: '#55625c', dash: true }]} />
          <LineChart
            ariaLabel="Average fill by hours since last drop" height={290} xLabels={xLabels} yMin={0} yMax={4} yTicks={[0, 1, 2, 3, 4]} yFormat={(v) => String(v)}
            series={series} refLines={Number.isFinite(baseline.avg) ? [{ y: baseline.avg, label: `no drop in 48h: ${baseline.avg.toFixed(1)}`, color: '#55625c' }] : []}
            tip={(i) => (
              <div><b>{xLabels[i]}{i > 0 && ' after a drop'}{i === 0 && ' before the next drop'}</b>
                {active.map((s) => { const p = studies[s].pts[i]; return <div key={s}><span className="sw" style={{ background: SOURCE_COLOR[s] }} /> {SOURCE_SHORT[s]}: {Number.isFinite(p.avg) ? `${p.avg.toFixed(2)} avg fill · ${pct(p.empty)} empty` : '—'} <span className="muted">(n={p.n})</span></div>; })}
              </div>)}
          />
          <p className="insight">The “12h before” point shows how empty fridges are when the next drop arrives. It is the case for moving a drop earlier, or adding one.</p>
        </Panel>

        <Panel title="Weekday mornings: drop day vs other days" sub="Share of weekday mornings with a fill-0 reading, on days a drop arrived by 10 AM (hollow) versus days it didn’t (solid).">
          <Legend items={[{ label: 'No drop by 10 AM', color: '#bf4f2e' }, { label: 'Drop by 10 AM', color: '#1f6f5c', hollow: true }]} />
          <Dumbbell rows={[...dumb].sort((a, b) => (b.other.rate - (b.drop.rate || 0)) - (a.other.rate - (a.drop.rate || 0))).map((d) => ({ id: d.fridge, label: FRIDGE_BY_ID[d.fridge].name, a: d.drop, b: d.other }))} />
        </Panel>
      </div>

      <div className="grid-2 wide-left">
        <Panel title="Pounds donated per week" sub={sel ? `${sel} only, all 14 weeks. Faded weeks fall outside the date filter.` : 'Whole network, all 14 weeks. Faded weeks fall outside the date filter.'}>
          <Legend items={SOURCES.map((s) => ({ label: s, color: SOURCE_COLOR[s] }))} />
          <StackedWeeks data={lbs} range={range} weekLabels={Array.from({ length: WEEKS }, (_, w) => dayLabel(w * 7))} height={230} />
        </Panel>

        <Panel title="Who gets the food" sub="Logged pounds per fridge over the date filter, with average fill alongside.">
          <table className="supply">
            <thead><tr><th className="left">Fridge</th><th className="left">Pounds by source</th><th className="r">Lbs/wk</th><th className="r">Avg fill</th></tr></thead>
            <tbody>
              {[...supply].sort((a, b) => a.lbs - b.lbs).map((s) => (
                <tr key={s.fridge} onClick={() => setFridge(s.fridge)} className={fridge === s.fridge ? 'sel' : ''}>
                  <th scope="row" className="left"><b>{s.fridge}</b> <span className="muted">{FRIDGE_BY_ID[s.fridge].name}</span></th>
                  <td className="stackbar" {...tipOn(<div><b>{s.fridge}</b>{SOURCES.map((x) => <div key={x}><span className="sw" style={{ background: SOURCE_COLOR[x] }} /> {x}: {s.by[x]} lbs</div>)}<div>{s.drops} drops</div></div>)}>
                    <div>{SOURCES.map((x) => <i key={x} style={{ width: `${(s.by[x] / maxLbs) * 100}%`, background: SOURCE_COLOR[x] }} />)}</div>
                  </td>
                  <td className="r num">{s.lbsPerWeek.toFixed(0)}</td>
                  <td className="r num">{s.avgFill.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" className="linkbtn" onClick={() => openLog({ fill: 'empty', before: 'noon' }, 'donations')}>Browse every empty-morning reading →</button>
        </Panel>
      </div>
    </div>
  );
}
