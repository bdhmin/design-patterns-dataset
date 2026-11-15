import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { Panel, emptyColor, textOn, tipOn } from '../components/ui';
import { DOW, DOW_LONG, FRIDGE_BY_ID, FRIDGES } from '../lib/data';
import { FULL, POST, PRE, byGain, plannerModel, pct, rosaRoute, runoutRows, type Candidate } from '../lib/analysis';

export default function Planner() {
  const { range, preset, setPreset, pinned, setPinned, openBrief } = useApp();
  const [allowed, setAllowed] = useState<number[]>([0, 1, 2, 3, 4]);
  const [pick, setPick] = useState<{ fridge: string; dow: number } | null>(null);
  const model = useMemo(() => plannerModel(range), [range]);
  const route = useMemo(() => rosaRoute(range), [range]);
  const order = useMemo(() => runoutRows(range).sort((a, b) => b.all.rate - a.all.rate).map((r) => r.fridge), [range]);

  const ranked = useMemo(() => model.cands.filter((c) => allowed.includes(c.dow) && c.here.n >= 3).sort(byGain), [model, allowed]);
  const top = ranked[0];
  const cur = pick ?? (top ? { fridge: top.fridge, dow: top.dow } : null);
  const cand = cur ? model.cands.find((c) => c.fridge === cur.fridge && c.dow === cur.dow)! : null;
  const isPinned = !!cand && pinned?.fridge === cand.fridge && pinned?.dow === cand.dow;
  const cellOf = (f: string, d: number) => model.cands.find((c) => c.fridge === f && c.dow === d)!;

  // does the answer depend on the period?
  const robust = useMemo(() => [['All 14 weeks', FULL], ['Before Labor Day', PRE], ['After Labor Day', POST]].map(([label, r]) => {
    const m = plannerModel(r as typeof FULL);
    const rk = m.cands.filter((c) => allowed.includes(c.dow) && c.here.n >= 3).sort(byGain);
    return { label: label as string, top: rk.slice(0, 3) };
  }), [allowed]);

  const toggleDay = (d: number) => setAllowed((a) => (a.includes(d) ? a.filter((x) => x !== d) : [...a, d].sort()));
  const nWeeks = Math.round((range.to - range.from + 1) / 7);

  return (
    <div className="view">
      <div className="lede">
        <h1>
          {top
            ? <>The biggest gap is <b>{top.fridge} on {DOW_LONG[top.dow]}s</b>: empty before noon on {top.here.k} of {top.here.n}, and about {top.avoided.toFixed(1)} fewer empty mornings a month if the bakery’s extra drop landed there.</>
            : <>Choose at least one delivery day.</>}
        </h1>
        <p>Each cell is how often that fridge was empty before noon on that weekday. The estimate compares it with how the same fridge does on mornings when a Rosa’s Bakery drop has already arrived.</p>
      </div>

      {preset === 'all' && (
        <div className="callout">
          <b>This view is averaging all 14 weeks.</b> School reopened next to F3 on Sep 8, and F3’s pattern changed. <button type="button" className="linkbtn" onClick={() => setPreset('post')}>Look at after Labor Day only →</button>
        </div>
      )}

      <div className="grid-2 planner">
        <Panel title="Where the fridges are empty, and where the food already goes"
          sub="Click a cell to test it. Letters mark a Rosa’s (R) or Greenway (G) drop by 10 AM on that weekday in this period."
          >
          <div className="days" role="group" aria-label="Days the bakery could deliver"><span className="lbl">Bakery can deliver on</span>{DOW.map((d, i) => <button key={d} type="button" className={allowed.includes(i) ? 'on' : ''} aria-pressed={allowed.includes(i)} onClick={() => toggleDay(i)}>{d}</button>)}</div>
          <table className="plan">
            <thead>
              <tr>
                <th className="left">Fridge</th>
                {DOW.map((d, i) => (
                  <th key={d} className={allowed.includes(i) ? '' : 'off'}>
                    {d}
                    <small>{route[i] ? `Rosa’s ×${route[i].length}` : 'no Rosa’s'}</small>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {order.map((id) => (
                <tr key={id}>
                  <th scope="row" className="left"><b>{id}</b> <span className="muted">{FRIDGE_BY_ID[id].name}</span></th>
                  {DOW.map((_, d) => {
                    const c = cellOf(id, d);
                    const bg = emptyColor(c.here.rate);
                    const sel = cand?.fridge === id && cand.dow === d;
                    return (
                      <td key={d} className={allowed.includes(d) ? '' : 'off'}>
                        <button type="button" className={`pcell ${sel ? 'sel' : ''}`} style={{ background: bg, color: textOn(bg) }} onClick={() => setPick({ fridge: id, dow: d })}
                          aria-label={`${id} ${DOW_LONG[d]}: empty before noon ${c.here.k} of ${c.here.n}`} aria-pressed={sel}
                          {...tipOn(<div><b>{id} · {DOW_LONG[d]}s</b><div>Empty before noon on {c.here.k} of {c.here.n} ({pct(c.here.rate)})</div>{c.rosaHere && <div>Rosa’s already delivers here</div>}{c.greenHere && <div>Greenway already delivers here</div>}</div>)}>
                          {Number.isFinite(c.here.rate) ? Math.round(c.here.rate * 100) : '–'}
                          {(c.rosaHere || c.greenHere) && <sup>{c.rosaHere ? 'R' : ''}{c.greenHere ? 'G' : ''}</sup>}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="foot">Rosa’s currently delivers {Object.entries(route).sort().map(([d, ids]) => `${DOW[+d]} (${ids.join(', ')})`).join(' and ')}.</p>
        </Panel>

        <div className="stack">
          {cand && <WhatIf cand={cand} model={model} isPinned={isPinned} nWeeks={nWeeks} onPin={() => setPinned(isPinned ? null : { fridge: cand.fridge, dow: cand.dow })} onBrief={openBrief} />}
        </div>
      </div>

      <div className="grid-2 even">
        <Panel title="Ranked candidates" sub="Estimated empty mornings avoided per month, among the days you allowed.">
          <ol className="ranked">
            {ranked.slice(0, 7).map((c, i) => {
              const on = cand?.fridge === c.fridge && cand.dow === c.dow;
              const max = ranked[0].avoided || 1;
              return (
                <li key={c.fridge + c.dow}>
                  <button type="button" className={on ? 'on' : ''} onClick={() => setPick({ fridge: c.fridge, dow: c.dow })}>
                    <span className="rk">{i + 1}</span>
                    <span className="who"><b>{c.fridge}</b> {DOW[c.dow]}<small>{FRIDGE_BY_ID[c.fridge].name}</small></span>
                    <span className="now">{c.here.k}/{c.here.n} empty{c.rosaHere ? ' · has Rosa’s' : ''}</span>
                    <span className="bar"><i style={{ width: `${(c.avoided / max) * 100}%` }} /></span>
                    <span className="gain">{c.avoided.toFixed(1)}<small>/mo</small></span>
                  </button>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel title="Does the answer depend on the period?" sub="Top three cells if you limited the analysis to each stretch.">
          <div className="robust">
            {robust.map((r) => (
              <div key={r.label} className={r.label.startsWith('After') ? 'cur' : ''}>
                <h4>{r.label}</h4>
                <ol>{r.top.map((c) => <li key={c.fridge + c.dow}><b>{c.fridge} {DOW[c.dow]}</b><span>{c.here.k}/{c.here.n} · {c.avoided.toFixed(1)}/mo</span></li>)}</ol>
              </div>
            ))}
          </div>
          <p className="insight">Weekday cells are small samples (5 to 14 mornings). Before-Labor-Day cells are five mornings each, so a gap there can be luck.</p>
        </Panel>
      </div>
      <span hidden>{FRIDGES.length}</span>
    </div>
  );
}

function WhatIf({ cand, model, isPinned, onPin, onBrief, nWeeks }: { cand: Candidate; model: ReturnType<typeof plannerModel>; isPinned: boolean; onPin: () => void; onBrief: () => void; nWeeks: number }) {
  const own = model.own[cand.fridge];
  const f = FRIDGE_BY_ID[cand.fridge];
  const dupe = cand.rosaHere;
  return (
    <Panel title={<>If the extra drop went to {cand.fridge} on {DOW_LONG[cand.dow]}s</>} sub={`${f.name} · ${f.neighborhood}`} className="whatif">
      {dupe ? (
        <div className="big warn">Rosa’s already delivers here on {DOW_LONG[cand.dow]}s, so a second drop that day would add little.</div>
      ) : (
        <div className="big">≈ <b>{cand.avoided.toFixed(1)}</b> fewer empty mornings per month</div>
      )}
      <dl className="facts">
        <div><dt>Today</dt><dd>Empty before noon on <b>{cand.here.k} of {cand.here.n}</b> {DOW_LONG[cand.dow]}s ({pct(cand.here.rate)}) across {nWeeks} weeks</dd></div>
        <div><dt>With a bakery drop by 10 AM</dt><dd>About <b>{pct(cand.est)}</b>. {f.id} was empty on {own.k} of {own.n} weekday mornings after a Rosa’s drop; across all fridges it’s {model.pooled.k} of {model.pooled.n}. The estimate blends the two.</dd></div>
        <div><dt>Delivery</dt><dd>{dupe ? `Rosa’s already visits ${f.id} on ${DOW_LONG[cand.dow]}s.` : cand.greenHere ? `Greenway already delivers produce here on ${DOW_LONG[cand.dow]}s.` : `No scheduled delivery to ${f.id} on ${DOW_LONG[cand.dow]}s today.`}</dd></div>
      </dl>
      <p className="caveat">Assumes the new drop looks like Rosa’s existing ones (typically 20–46 lbs, arriving between 6:30 and 8:30 AM). {cand.here.n < 8 ? `Only ${cand.here.n} mornings behind this cell, so treat it as a rough guide.` : ''}</p>
      <div className="btns">
        <button type="button" className={`btn ${isPinned ? 'ghost' : 'primary'}`} onClick={onPin}>{isPinned ? '✓ Pinned to Sunday brief (click to unpin)' : 'Pin as my recommendation'}</button>
        <button type="button" className="btn" onClick={onBrief}>Open Sunday brief</button>
      </div>
    </Panel>
  );
}
