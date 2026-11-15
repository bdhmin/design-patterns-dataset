import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { Panel, Segmented, emptyColor, fillColor, textOn, tipOn } from '../components/ui';
import { WeekBars } from '../components/charts';
import { DOW, DOW_LONG, FRIDGE_BY_ID, FRIDGES, dayLabel, fmtHour } from '../lib/data';
import { emptyAgg, heatGrid, pct, rangeDays, runoutRows, TIME_BIN_LABELS, weekly, WEEKDAYS, type RunoutRow } from '../lib/analysis';

type SortKey = 'rate' | 'id' | 'first' | 'shift' | `d${number}`;

export default function Runouts() {
  const { range, selFridge, setSelFridge, openLog, preset } = useApp();
  const rows = useMemo(() => runoutRows(range), [range]);
  const net = useMemo(() => emptyAgg(null, range), [range]);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'rate', dir: -1 });
  const [metric, setMetric] = useState<'avg' | 'empty'>('avg');

  const val = (r: RunoutRow, k: SortKey): number => {
    if (k === 'rate') return r.all.rate;
    if (k === 'id') return -Number(r.fridge.slice(1));
    if (k === 'first') return r.medFirst ?? 99;
    if (k === 'shift') return (r.post.rate || 0) - (r.pre.rate || 0);
    return r.byDow[Number(k.slice(1))].rate;
  };
  const sorted = [...rows].sort((a, b) => (val(a, sort.key) - val(b, sort.key)) * sort.dir || a.fridge.localeCompare(b.fridge));
  const byRate = [...rows].sort((a, b) => b.all.rate - a.all.rate);
  const [t1, t2] = byRate;
  const comb = (t1.all.k + t2.all.k) / (t1.all.n + t2.all.n);
  const rest = byRate.slice(2);
  const restRate = rest.reduce((a, r) => a + r.all.k, 0) / rest.reduce((a, r) => a + r.all.n, 0);
  const th = (key: SortKey, label: string, cls = '') => (
    <th className={`${cls} sortable`} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: -1 }))}>
        {label}{sort.key === key && <span aria-hidden>{sort.dir === -1 ? ' ↓' : ' ↑'}</span>}
      </button>
    </th>
  );
  const maxRate = Math.max(...rows.map((r) => r.all.rate), 0.5);

  const sel = selFridge === 'all' ? null : selFridge;
  const grid = useMemo(() => heatGrid(sel, range), [sel, range]);
  const wk = useMemo(() => weekly(sel), [sel]);
  const wkNet = useMemo(() => weekly(null), []);
  const selRow = sel ? rows.find((r) => r.fridge === sel)! : null;
  const selName = sel ? `${sel} · ${FRIDGE_BY_ID[sel].name}` : 'All nine fridges';

  // emptiest window with enough checks
  let worst: { d: number; b: number; avg: number; n: number } | null = null;
  grid.forEach((row, d) => row.forEach((c, b) => { if (c.n >= 6 && (!worst || c.avg < worst.avg)) worst = { d, b, avg: c.avg, n: c.n }; }));
  const w = worst as { d: number; b: number; avg: number; n: number } | null;

  const periodNote = preset === 'all' ? 'all 14 weeks' : preset === 'post' ? 'after Labor Day' : preset === 'pre' ? 'before Labor Day' : 'the selected dates';
  const weekdays = Math.round(rangeDays(range) * 5 / 7);

  return (
    <div className="view">
      <div className="lede">
        <h1>
          {t1.all.rate > 1.8 * (restRate || 0.01)
            ? <><b>{t1.fridge}</b> and <b>{t2.fridge}</b> ran out before noon on <b>{pct(comb)}</b> of weekdays, against <b>{pct(net.rate)}</b> across the network.</>
            : <>The network ran out before noon on <b>{pct(net.rate)}</b> of weekdays in {periodNote}.</>}
        </h1>
        <p>
          The other {rest.length} fridges average {pct(restRate)}. “Empty before noon” means at least one check before 12:00 PM logged fill level 0.
          Counted per fridge per weekday, over {periodNote} (about {weekdays} weekdays each).
        </p>
      </div>

      <div className="grid-main">
        <Panel title="Which fridges run out fastest" sub="Click a row to inspect it. Click a weekday cell to open the matching check entries." className="table-panel">
          <table className="rank">
            <thead>
              <tr>
                {th('id', 'Fridge', 'left')}
                {th('rate', 'Empty before noon', 'left')}
                {WEEKDAYS.map((d) => th(`d${d}`, DOW[d], 'c day'))}
                {th('first', 'Typical first empty', 'r')}
                {th('shift', 'Before → after Labor Day', 'r')}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const f = FRIDGE_BY_ID[r.fridge];
                const on = selFridge === r.fridge;
                const flag = r.all.rate >= 2 * net.rate && r.all.n > 0;
                const shift = r.post.rate - r.pre.rate;
                return (
                  <tr key={r.fridge} className={on ? 'sel' : ''} onClick={() => setSelFridge(r.fridge)}>
                    <th scope="row" className="left who">
                      <button type="button" aria-pressed={on} onClick={(e) => { e.stopPropagation(); setSelFridge(r.fridge); }}>
                        <span className="code">{r.fridge}</span>
                        <span className="nm"><b>{f.name}</b><small>{f.neighborhood}</small></span>
                      </button>
                    </th>
                    <td className="left barcell" {...tipOn(<div><b>{r.fridge} · {f.name}</b><div>{r.all.k} of {r.all.n} weekday mornings had a fill-0 reading</div></div>)}>
                      <div className="bar"><i style={{ width: `${(r.all.rate / maxRate) * 100}%`, background: flag ? '#bf4f2e' : '#9fb2a8' }} />
                        <span className="netline" style={{ left: `${(net.rate / maxRate) * 100}%` }} title="Network average" />
                      </div>
                      <span className="num"><b>{pct(r.all.rate)}</b> <small>{r.all.k}/{r.all.n}</small></span>
                    </td>
                    {WEEKDAYS.map((d) => {
                      const c = r.byDow[d];
                      const bg = emptyColor(c.rate);
                      return (
                        <td key={d} className="c day">
                          <button type="button" className="cellbtn" style={{ background: bg, color: textOn(bg) }}
                            onClick={(e) => { e.stopPropagation(); setSelFridge(r.fridge); openLog({ fridge: r.fridge, dow: d, fill: 'empty', before: 'noon' }, 'runouts'); }}
                            aria-label={`${r.fridge} ${DOW_LONG[d]}: empty before noon on ${c.k} of ${c.n} days`}
                            {...tipOn(<div><b>{r.fridge} · {DOW_LONG[d]}s</b><div>Empty before noon on {c.k} of {c.n} days ({pct(c.rate)})</div><div className="muted">Click to see those entries</div></div>)}>
                            {Number.isFinite(c.rate) ? Math.round(c.rate * 100) : '–'}
                          </button>
                        </td>
                      );
                    })}
                    <td className="r num">{r.medFirst === null ? <span className="muted" title={`Only ${r.nFirst} empty mornings`}>—</span> : fmtHour(r.medFirst)}</td>
                    <td className="r num" {...tipOn(<div><b>{r.fridge}</b><div>Aug 4 – Sep 7: {r.pre.k} of {r.pre.n} weekdays ({pct(r.pre.rate)})</div><div>Sep 8 – Nov 9: {r.post.k} of {r.post.n} weekdays ({pct(r.post.rate)})</div><div className="muted">Fixed periods, not affected by the date filter</div></div>)}>
                      <span className="shift">{Math.round(r.pre.rate * 100)}% → <b>{Math.round(r.post.rate * 100)}%</b></span>
                      <span className={`pp ${shift > 0.1 ? 'bad' : shift < -0.1 ? 'good' : ''}`}>{shift > 0.005 ? '+' : shift < -0.005 ? '−' : ''}{Math.abs(Math.round(shift * 100))} pt</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" className="left who"><div className="whoflat"><span className="code net">All</span><span className="nm"><b>Network</b><small>9 fridges</small></span></div></th>
                <td className="left barcell"><div className="bar"><i style={{ width: `${(net.rate / maxRate) * 100}%`, background: '#55625c' }} /></div><span className="num"><b>{pct(net.rate)}</b> <small>{net.k}/{net.n}</small></span></td>
                {WEEKDAYS.map((d) => { const c = emptyAgg(null, range, [d]); const bg = emptyColor(c.rate); return <td key={d} className="c day"><span className="cellbtn static" style={{ background: bg, color: textOn(bg) }}>{Math.round(c.rate * 100)}</span></td>; })}
                <td /><td className="r num"><span className="shift">{pct(emptyAgg(null, { from: 0, to: 34 }).rate)} → <b>{pct(emptyAgg(null, { from: 35, to: 97 }).rate)}</b></span></td>
              </tr>
            </tfoot>
          </table>
          <p className="foot">Weekday cells show % of that weekday’s mornings with an empty reading. Bar tick = network average. Flagged in rust: at least twice the network rate.</p>
        </Panel>

        <Panel
          title={<>When {sel ?? 'the network'} is empty</>}
          sub={selName}
          className="heat-panel"
          actions={
            <select aria-label="Fridge to inspect" value={selFridge} onChange={(e) => setSelFridge(e.target.value)}>
              <option value="all">All fridges</option>
              {FRIDGES.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
            </select>
          }
        >
          <div className="heat-ctl">
            <Segmented label="Heat map measure" value={metric} onChange={setMetric} options={[{ value: 'avg', label: 'Average fill' }, { value: 'empty', label: 'Share empty' }]} />
          </div>
          <table className="heat">
            <thead><tr><th />{TIME_BIN_LABELS.map((l) => <th key={l}>{l}</th>)}</tr></thead>
            <tbody>
              {grid.map((row, d) => (
                <tr key={d}>
                  <th scope="row">{DOW[d]}</th>
                  {row.map((c, b) => {
                    const v = metric === 'avg' ? c.avg : c.empty;
                    const bg = metric === 'avg' ? fillColor(v) : emptyColor(v);
                    const thin = c.n < 5;
                    return (
                      <td key={b} className={thin ? 'thin' : ''} style={{ background: thin ? undefined : bg, color: textOn(bg) }}
                        {...tipOn(<div><b>{DOW_LONG[d]} · {TIME_BIN_LABELS[b]}</b><div>Average fill {Number.isFinite(c.avg) ? c.avg.toFixed(1) : '—'} of 4</div><div>{Number.isFinite(c.empty) ? `${Math.round(c.empty * c.n)} of ${c.n} checks empty (${pct(c.empty)})` : 'No checks'}</div>{thin && <div className="muted">Fewer than 5 checks: treat with caution</div>}</div>)}>
                        {Number.isFinite(v) ? (metric === 'avg' ? v.toFixed(1) : Math.round(v * 100)) : ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="heat-legend">
            {metric === 'avg'
              ? <><span>Empty</span><i className="grad fill" /><span>Full (4)</span></>
              : <><span>0%</span><i className="grad empty" /><span>100% of checks</span></>}
            <span className="thin-key"><i /> under 5 checks</span>
          </div>
          {w && (
            <p className="insight">
              Emptiest window with enough checks: <b>{DOW_LONG[w.d]} {TIME_BIN_LABELS[w.b]}</b>, average fill {w.avg.toFixed(1)} across {w.n} checks.
            </p>
          )}
          {selRow && (
            <button type="button" className="linkbtn" onClick={() => openLog({ fridge: selRow.fridge, fill: 'empty', before: 'noon' }, 'runouts')}>
              See all {selRow.fridge} readings of 0 before noon →
            </button>
          )}
        </Panel>
      </div>

      <Panel
        title={<>Weekly empty-before-noon rate · {sel ? <b>{sel}</b> : 'network'} vs network</>}
        sub="Each bar is one Tuesday-to-Monday week (5 weekday mornings). Dashed line is the network. Faded weeks fall outside the date filter."
      >
        <WeekBars
          ariaLabel={`Weekly empty-before-noon rate for ${selName}`}
          values={wk.map((p) => p.rate)} ns={wk.map((p) => p.n)} network={wkNet.map((p) => p.rate)} range={range}
          weekLabels={wk.map((p) => dayLabel(p.week * 7))}
          tip={(i) => (
            <div><b>Week of {dayLabel(i * 7)}</b><div>{sel ?? 'Network'}: {wk[i].k} of {wk[i].n} weekday mornings empty ({pct(wk[i].rate)})</div>{sel && <div>Network: {pct(wkNet[i].rate)}</div>}</div>
          )}
        />
        {selRow && (
          <p className="insight">
            {selRow.fridge}: {pct(selRow.pre.rate)} of weekdays before Labor Day, {pct(selRow.post.rate)} after.
            {selRow.fridge === 'F3' && ' The school next to F3 reopened Sep 8.'}
          </p>
        )}
      </Panel>
    </div>
  );
}
