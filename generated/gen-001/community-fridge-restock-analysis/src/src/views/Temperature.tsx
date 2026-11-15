import { useMemo, useState } from 'react';
import { useApp } from '../state';
import { Panel, Legend, tipOn } from '../components/ui';
import { TempChart, type TPoint } from '../components/charts';
import { CHECKS, FRIDGES, FRIDGE_BY_ID, dayLabel, dayLong, fmtHour } from '../lib/data';
import { INCIDENT_F, SAFE_F, checksIn, incidents, inR, powerByFridge, mean } from '../lib/analysis';

const toPt = (c: (typeof CHECKS)[number]): TPoint => ({ day: c.day, hour: c.hour, temp: c.temp, fridge: c.fridge, flags: c.flags, vol: c.vol });

export default function Temperature() {
  const { range, openLog } = useApp();
  const [fridge, setFridge] = useState('F7');
  const [others, setOthers] = useState(true);
  const [zoom, setZoom] = useState<{ from: number; to: number } | null>(null);
  const domain = zoom ?? range;

  const incs = useMemo(() => incidents(range), [range]);
  const power = useMemo(() => powerByFridge(range), [range]);
  const mine = useMemo(() => checksIn(fridge, domain).map(toPt), [fridge, domain]);
  const rest = useMemo(() => (others ? CHECKS.filter((c) => c.fridge !== fridge && inR(c.day, domain)).map(toPt) : []), [fridge, domain, others]);
  const pw = useMemo(() => CHECKS.filter((c) => c.fridge === fridge && c.flags.includes('Power') && inR(c.day, domain)).map(toPt), [fridge, domain]);
  const hi = useMemo(() => CHECKS.filter((c) => c.temp >= INCIDENT_F && c.fridge === fridge && inR(c.day, domain)).map(toPt), [fridge, domain]);

  const incFridges = Array.from(new Set(incs.map((i) => i.check.fridge)));
  const withPower = incs.filter((i) => i.powerBefore.length > 0);
  const totalPower = power.reduce((a, p) => a + p.flags, 0);
  const topPower = [...power].sort((a, b) => b.flags - a.flags)[0];
  const f7 = power.find((p) => p.fridge === 'F7')!;

  // mean reading in the 12 h after a power flag vs otherwise, F7
  const after = useMemo(() => {
    const flagged = CHECKS.filter((c) => c.fridge === 'F7' && c.flags.includes('Power') && inR(c.day, range)).map((c) => c.day * 24 + c.hour);
    const f7c = checksIn('F7', range);
    const near = f7c.filter((c) => flagged.some((t) => c.day * 24 + c.hour >= t - 0.01 && c.day * 24 + c.hour - t <= 12));
    const far = f7c.filter((c) => !near.includes(c));
    return { near: mean(near.map((c) => c.temp)), nNear: near.length, far: mean(far.map((c) => c.temp)), nFar: far.length };
  }, [range]);

  const f7Inc = incs.filter((i) => i.check.fridge === 'F7').length;
  const warm = checksIn(null, range).filter((c) => c.temp > SAFE_F);
  const warmOther = warm.filter((c) => c.temp < INCIDENT_F);

  const lede = incs.length === 0
    ? <>No readings reached {INCIDENT_F}°F in this period.</>
    : <>{incs.length === 2 ? 'Both' : incs.length} warm readings ({incs.map((i) => `${i.check.temp}°F`).join(' and ')}) came from <b>{incFridges.join(', ')}</b>{withPower.length > 0 ? <>, and <b>{withPower.length === incs.length ? 'each' : `${withPower.length} of ${incs.length}`}</b> followed a Power flag logged at the same fridge within the previous 24 hours.</> : <>, with no Power flag at that fridge in the previous 24 hours.</>}</>;

  return (
    <div className="view">
      <div className="lede">
        <h1>{lede}</h1>
        <p>
          {topPower && topPower.flags > 0 && <>{topPower.fridge} logged {topPower.flags} of the network’s {totalPower} Power flags ({topPower.episodes} separate episodes). </>}
          Readings above {SAFE_F}°F are over the cold-holding limit; only readings of {INCIDENT_F}°F or more are counted as incidents here.
        </p>
      </div>

      <div className="grid-2 wide-left">
        <div className="stack">
        <Panel
          title={<>Interior temperature · {fridge} {FRIDGE_BY_ID[fridge].name}</>}
          sub={zoom ? `Zoomed to ${dayLabel(zoom.from)} – ${dayLabel(zoom.to)}` : 'Every logged reading. Blue triangles mark checks where a volunteer flagged Power.'}
          actions={
            <>
              <select aria-label="Fridge" value={fridge} onChange={(e) => setFridge(e.target.value)}>
                {FRIDGES.map((f) => <option key={f.id} value={f.id}>{f.id} · {f.name}</option>)}
              </select>
              <label className="check"><input type="checkbox" checked={others} onChange={(e) => setOthers(e.target.checked)} /> Show other fridges</label>
              {zoom && <button type="button" className="btn" onClick={() => setZoom(null)}>Reset zoom</button>}
            </>
          }
        >
          <Legend items={[{ label: `${fridge} within limit`, color: '#2f7d68' }, { label: `${fridge} above ${SAFE_F}°F`, color: '#e08a2e' }, { label: 'Incident (45°F+)', color: '#bf4f2e' }, { label: 'Power flag', color: '#3b4cca' }, ...(others ? [{ label: 'Other fridges', color: '#9aa59f' }] : [])]} />
          <TempChart points={mine} others={rest} highlight={hi} power={pw} domain={domain} safe={SAFE_F} incident={INCIDENT_F} height={350}
            onPickIncident={(p) => setZoom({ from: Math.max(range.from, p.day - 3), to: Math.min(range.to, p.day + 3) })} />
          <p className="insight">Click a ringed incident to zoom to the days around it.</p>
        </Panel>
        <Panel title="Other readings over the limit" sub={`${warmOther.length} readings between ${SAFE_F + 1}°F and ${INCIDENT_F - 1}°F across the network in this period. None reached incident level.`}>
          <table className="warmlist">
            <thead><tr><th className="left">When</th><th className="left">Fridge</th><th>Temp</th><th className="left">Flags</th></tr></thead>
            <tbody>
              {[...warmOther].sort((a, b) => b.temp - a.temp || b.day - a.day).slice(0, 8).map((c) => (
                <tr key={c.id}><td className="left nowrap">{dayLong(c.day)} <span className="muted">{fmtHour(c.hour)}</span></td><td className="left"><b>{c.fridge}</b> <span className="muted">{FRIDGE_BY_ID[c.fridge].name}</span></td><td className="c num"><b>{c.temp}°</b></td><td className="left">{c.flags.length ? c.flags.join(', ') : <span className="muted">none logged</span>}</td></tr>
              ))}
            </tbody>
          </table>
          {warmOther.length > 8 && <button type="button" className="linkbtn" onClick={() => openLog({ warm: true }, 'temperature')}>See all {warmOther.length} in the check log →</button>}
        </Panel>
        </div>

        <div className="stack">
          <Panel title="Incidents" sub={`Readings of ${INCIDENT_F}°F or more in this period`}>
            {incs.length === 0 ? <p className="empty">None in the selected dates.</p> : (
              <ul className="incidents">
                {incs.map((i) => (
                  <li key={i.check.id}>
                    <div className="inc-h">
                      <span className="deg">{i.check.temp}°F</span>
                      <div><b>{i.check.fridge} · {FRIDGE_BY_ID[i.check.fridge].name}</b><small>{dayLong(i.check.day)} · {fmtHour(i.check.hour)} · logged by {i.check.vol}</small></div>
                    </div>
                    <p className={i.powerBefore.length ? 'pw yes' : 'pw'}>
                      {i.powerBefore.length
                        ? <>Power flag at {i.check.fridge} in the prior 24 h: {i.powerBefore.map((p) => (p.id === i.check.id ? 'this same reading' : `${dayLabel(p.day)} ${fmtHour(p.hour)} (${p.vol})`)).join('; ')}</>
                        : 'No Power flag at this fridge in the prior 24 h'}
                    </p>
                    <div className="inc-actions">
                      <button type="button" className="linkbtn" onClick={() => { setFridge(i.check.fridge); setZoom({ from: Math.max(range.from, i.check.day - 3), to: Math.min(range.to, i.check.day + 3) }); }}>Zoom chart</button>
                      <button type="button" className="linkbtn" onClick={() => openLog({ fridge: i.check.fridge, flag: 'any', warm: true }, 'temperature')}>See warm readings in log</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Power flags by fridge" sub="Checks where a volunteer flagged Power, with the number of separate episodes.">
            <table className="supply pw-table">
              <thead><tr><th className="left">Fridge</th><th className="left">Flags</th><th className="r">Episodes</th><th className="r">Readings &gt; {SAFE_F}°F</th></tr></thead>
              <tbody>
                {[...power].sort((a, b) => b.flags - a.flags || b.warm - a.warm).map((p) => (
                  <tr key={p.fridge} className={p.fridge === fridge ? 'sel' : ''} onClick={() => setFridge(p.fridge)}>
                    <th scope="row" className="left"><b>{p.fridge}</b> <span className="muted">{FRIDGE_BY_ID[p.fridge].name}</span></th>
                    <td className="stackbar" {...tipOn(<div>{p.fridge}: {p.flags} flagged checks</div>)}><div><i style={{ width: `${(p.flags / Math.max(...power.map((x) => x.flags), 1)) * 100}%`, background: '#3b4cca' }} /></div><span className="num">{p.flags}</span></td>
                    <td className="r num">{p.episodes}</td>
                    <td className="r num">{p.warm}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {f7.flags > 0 && Number.isFinite(after.near) && (
              <p className="insight">
                F7 readings in the 12 hours after a Power flag average <b>{after.near.toFixed(1)}°F</b> (n={after.nNear}), against <b>{after.far.toFixed(1)}°F</b> otherwise (n={after.nFar}).
                {f7.episodes > f7Inc && ` ${f7.episodes - f7Inc} of F7’s ${f7.episodes} Power episodes did not produce a reading of ${INCIDENT_F}°F or more.`}
              </p>
            )}
          </Panel>
        </div>
      </div>

    </div>
  );
}
