import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { FillPips, Panel } from '../components/ui';
import { CHECKS, DOW, DOW_LONG, FRIDGES, FRIDGE_BY_ID, dayLabel, dayLong, fmtHour } from '../lib/data';
import { DEFAULT_LOG, FLAG_TYPES, applyLog, inR } from '../lib/analysis';

const PAGE = 40;
const VIEW_NAMES: Record<string, string> = { runouts: 'Run-outs', compare: 'Compare', donations: 'Donations', temperature: 'Temperature', planner: 'Extra drop', log: 'Check log' };

export default function Log() {
  const { range, logFilter: f, setLogFilter, logFrom, go } = useApp();
  const [page, setPage] = useState(0);
  const [sort, setSort] = useState<{ key: 'when' | 'fill' | 'temp'; dir: 1 | -1 }>({ key: 'when', dir: -1 });
  const set = (p: Partial<typeof f>) => { setLogFilter({ ...f, ...p }); setPage(0); };

  const inRange = useMemo(() => CHECKS.filter((c) => inR(c.day, range)), [range]);
  const rows = useMemo(() => {
    const r = applyLog(inRange, f);
    const val = (c: (typeof r)[number]) => (sort.key === 'when' ? c.id * 0 + c.day * 24 + c.hour : sort.key === 'fill' ? c.fill : c.temp);
    return [...r].sort((a, b) => (val(a) - val(b)) * sort.dir || (a.day * 24 + a.hour - (b.day * 24 + b.hour)) * -1);
  }, [inRange, f, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PAGE, p * PAGE + PAGE);
  const dirty = JSON.stringify(f) !== JSON.stringify(DEFAULT_LOG);

  const exportCsv = () => {
    const head = ['timestamp', 'fridge', 'volunteer', 'fill_level', 'temp_f', 'items', 'cleaned', 'flags'];
    const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const body = rows.map((c) => [c.ts, c.fridge, c.vol, c.fill, c.temp, q(c.items.join('; ')), c.cleaned ? 'yes' : 'no', q(c.flags.join('; '))].join(','));
    const blob = new Blob([[head.join(','), ...body].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'stocktake-check-entries.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const sortTh = (key: 'when' | 'fill' | 'temp', label: string, cls = '') => (
    <th className={`${cls} sortable`} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" onClick={() => setSort((s) => (s.key === key ? { key, dir: (-s.dir) as 1 | -1 } : { key, dir: key === 'when' ? -1 : 1 }))}>{label}{sort.key === key && (sort.dir === -1 ? ' ↓' : ' ↑')}</button>
    </th>
  );

  const desc: string[] = [];
  if (f.fridge !== 'all') desc.push(f.fridge);
  if (f.dow >= 0) desc.push(`${DOW_LONG[f.dow]}s`);
  if (f.fill !== 'any') desc.push(f.fill === 'empty' ? 'fill 0' : 'fill 0–1');
  if (f.before === 'noon') desc.push('before noon');

  return (
    <div className="view">
      <div className="lede">
        {logFrom && <button type="button" className="linkbtn back" onClick={() => go(logFrom)}>← Back to {VIEW_NAMES[logFrom]}</button>}
        <h1>Check log: <b>{rows.length.toLocaleString()}</b> of {inRange.length.toLocaleString()} entries{desc.length ? ` (${desc.join(', ')})` : ''}</h1>
        <p>The raw volunteer entries behind every chart. Filters stack with the date range above.</p>
      </div>
      <Panel className="log-panel"
        actions={<><button type="button" className="btn" onClick={exportCsv}>Export {rows.length.toLocaleString()} rows (CSV)</button></>}>
        <div className="log-filters">
          <label>Fridge<select value={f.fridge} onChange={(e) => set({ fridge: e.target.value })}><option value="all">All fridges</option>{FRIDGES.map((x) => <option key={x.id} value={x.id}>{x.id} · {x.name}</option>)}</select></label>
          <label>Weekday<select value={f.dow} onChange={(e) => set({ dow: Number(e.target.value) })}><option value={-1}>Any</option>{DOW.map((d, i) => <option key={d} value={i}>{DOW_LONG[i]}</option>)}</select></label>
          <label>Fill level<select value={f.fill} onChange={(e) => set({ fill: e.target.value as typeof f.fill })}><option value="any">Any</option><option value="empty">Empty (0)</option><option value="low">0 or 1</option></select></label>
          <label>Time<select value={f.before} onChange={(e) => set({ before: e.target.value as typeof f.before })}><option value="any">Any time</option><option value="noon">Before noon</option></select></label>
          <label>Issue flag<select value={f.flag} onChange={(e) => set({ flag: e.target.value })}><option value="any">Any</option><option value="Any flag">Has any flag</option>{FLAG_TYPES.map((x) => <option key={x} value={x}>{x}</option>)}</select></label>
          <label>Volunteer<input value={f.q} placeholder="Initials" maxLength={3} onChange={(e) => set({ q: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={f.warm} onChange={(e) => set({ warm: e.target.checked })} /> Over 41°F only</label>
          {dirty && <button type="button" className="linkbtn" onClick={() => { setLogFilter(DEFAULT_LOG); setPage(0); }}>Clear filters</button>}
        </div>
        <div className="tablewrap">
          <table className="log">
            <thead><tr>{sortTh('when', 'When', 'left')}<th className="left">Fridge</th><th>Vol.</th>{sortTh('fill', 'Fill')}{sortTh('temp', 'Temp')}<th className="left">Items noted</th><th>Cleaned</th><th className="left">Issue flags</th></tr></thead>
            <tbody>
              {shown.map((c) => (
                <tr key={c.id} className={c.fill === 0 ? 'zero' : ''}>
                  <td className="left nowrap">{dayLong(c.day)} <span className="muted">{fmtHour(c.hour)}</span></td>
                  <td className="left nowrap"><b>{c.fridge}</b> <span className="muted">{FRIDGE_BY_ID[c.fridge].name}</span></td>
                  <td className="c mono">{c.vol}</td>
                  <td className="c"><FillPips v={c.fill} /></td>
                  <td className={`c num ${c.temp >= 45 ? 'hot' : c.temp > 41 ? 'warm' : ''}`}>{c.temp}°</td>
                  <td className="left">{c.items.length ? c.items.join(', ') : <span className="muted">none</span>}</td>
                  <td className="c">{c.cleaned ? '✓' : ''}</td>
                  <td className="left">{c.flags.map((x) => <span key={x} className={`flag ${x === 'Power' ? 'pw' : x === 'Temperature' ? 'tp' : ''}`}>{x}</span>)}</td>
                </tr>
              ))}
              {shown.length === 0 && <tr><td colSpan={8} className="empty">No entries match these filters in the selected dates.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="pager">
          <span>{rows.length ? `${p * PAGE + 1}–${Math.min(rows.length, p * PAGE + PAGE)} of ${rows.length.toLocaleString()}` : '0 entries'}</span>
          <div>
            <button type="button" className="btn" disabled={p === 0} onClick={() => setPage(p - 1)}>Previous</button>
            <span className="pg">Page {p + 1} of {pages}</span>
            <button type="button" className="btn" disabled={p >= pages - 1} onClick={() => setPage(p + 1)}>Next</button>
          </div>
        </div>
      </Panel>
      <span hidden>{dayLabel(0)}</span>
    </div>
  );
}
