import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppCtx, type Pinned, type Preset, type View } from './state';
import { TipLayer, hideTip } from './components/ui';
import { CHECKS, DROPS, LAST_DAY, dayIso, dayLabel, isoToDay } from './lib/data';
import { DEFAULT_LOG, FULL, POST, PRE, inR, type LogFilter, type Range } from './lib/analysis';
import { briefText, buildBrief } from './lib/brief';
import Runouts from './views/Runouts';
import Compare from './views/Compare';
import Donations from './views/Donations';
import Temperature from './views/Temperature';
import Planner from './views/Planner';
import Log from './views/Log';

const TABS: { id: View; label: string; hint: string }[] = [
  { id: 'runouts', label: 'Run-outs', hint: 'Which fridges empty, and when' },
  { id: 'compare', label: 'Compare', hint: 'Fridges side by side, outliers' },
  { id: 'donations', label: 'Donations', hint: 'Do drops change fill levels' },
  { id: 'temperature', label: 'Temperature', hint: 'Warm readings and power' },
  { id: 'planner', label: 'Extra drop', hint: 'Where should the bakery’s second drop go' },
  { id: 'log', label: 'Check log', hint: 'Raw volunteer entries' },
];
const isView = (s: string): s is View => TABS.some((t) => t.id === s);
const fromHash = (): View => { const h = window.location.hash.replace('#/', ''); return isView(h) ? h : 'runouts'; };

export default function App() {
  const [view, setView] = useState<View>(fromHash);
  const [preset, setPresetS] = useState<Preset>('all');
  const [custom, setCustomS] = useState<Range>(FULL);
  const [selFridge, setSelFridge] = useState('F3');
  const [compare, setCompare] = useState<string[]>(['F3', 'F5', 'F1']);
  const [logFilter, setLogFilter] = useState<LogFilter>(DEFAULT_LOG);
  const [logFrom, setLogFrom] = useState<View | null>(null);
  const [pinned, setPinned] = useState<Pinned>(null);
  const [brief, setBrief] = useState(false);

  const range: Range = preset === 'all' ? FULL : preset === 'pre' ? PRE : preset === 'post' ? POST : custom;
  const go = useCallback((v: View) => { hideTip(); setView(v); if (window.location.hash !== `#/${v}`) window.location.hash = `#/${v}`; window.scrollTo(0, 0); }, []);
  useEffect(() => { const on = () => setView(fromHash()); window.addEventListener('hashchange', on); return () => window.removeEventListener('hashchange', on); }, []);
  useEffect(() => { document.title = `${TABS.find((t) => t.id === view)!.label} · Stocktake Commons`; }, [view]);

  const ctx = useMemo(() => ({
    view, go, range, preset,
    setPreset: (p: Preset) => setPresetS(p),
    setCustom: (from: number, to: number) => { setCustomS({ from, to }); setPresetS('custom'); },
    selFridge, setSelFridge,
    compare, toggleCompare: (id: string) => setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : c.length >= 4 ? c : [...c, id])),
    logFilter, setLogFilter, logFrom,
    openLog: (f: Partial<LogFilter>, from?: View) => { setLogFilter({ ...DEFAULT_LOG, ...f }); setLogFrom(from ?? null); go('log'); },
    pinned, setPinned, openBrief: () => setBrief(true),
  }), [view, go, range, preset, selFridge, compare, logFilter, logFrom, pinned]);

  // keep "back" link only while on the log
  useEffect(() => { if (view !== 'log') setLogFrom(null); }, [view]);

  const nChecks = useMemo(() => CHECKS.filter((c) => inR(c.day, range)).length, [range]);
  const nDrops = useMemo(() => DROPS.filter((c) => inR(c.day, range)).length, [range]);
  const days = range.to - range.from + 1;

  return (
    <AppCtx.Provider value={ctx}>
      <a className="skip" href="#main">Skip to content</a>
      <header className="top">
        <div className="brand">
          <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden><rect x="6" y="2" width="20" height="28" rx="4" fill="#1f6f5c" /><path d="M6 13.5h20" stroke="#fffdf8" strokeWidth="1.6" /><rect x="10" y="6.5" width="2.2" height="5" rx="1.1" fill="#fffdf8" /><rect x="10" y="17" width="2.2" height="8" rx="1.1" fill="#fffdf8" /></svg>
          <div><b>Stocktake Commons</b><small>Southside Free Fridge Network</small></div>
        </div>
        <nav aria-label="Views">
          {TABS.map((t) => (
            <button key={t.id} type="button" className={view === t.id ? 'on' : ''} aria-current={view === t.id ? 'page' : undefined} title={t.hint} onClick={() => go(t.id)}>{t.label}</button>
          ))}
        </nav>
        <div className="top-right">
          <span className="fresh" title="Most recent volunteer check in the system">Logs through Mon, Nov 9 · meeting Sun, Nov 15</span>
          <button type="button" className={`btn brief ${pinned ? 'pinned' : ''}`} onClick={() => setBrief(true)}>Sunday brief{pinned && <i aria-label="recommendation pinned" />}</button>
        </div>
      </header>

      <div className="periodbar">
        <span className="lbl">Period</span>
        <div className="seg" role="group" aria-label="Period">
          {([['all', 'All 14 weeks'], ['pre', 'Before Labor Day'], ['post', 'After Labor Day']] as [Preset, string][]).map(([p, l]) => (
            <button key={p} type="button" className={preset === p ? 'on' : ''} aria-pressed={preset === p} onClick={() => setPresetS(p)}>{l}</button>
          ))}
        </div>
        <div className="dates">
          <label>From <input type="date" min={dayIso(0)} max={dayIso(LAST_DAY)} value={dayIso(range.from)} onChange={(e) => { if (!e.target.value) return; const d = Math.min(LAST_DAY, Math.max(0, isoToDay(e.target.value))); ctx.setCustom(d, Math.max(d, range.to)); }} /></label>
          <label>to <input type="date" min={dayIso(0)} max={dayIso(LAST_DAY)} value={dayIso(range.to)} onChange={(e) => { if (!e.target.value) return; const d = Math.min(LAST_DAY, Math.max(0, isoToDay(e.target.value))); ctx.setCustom(Math.min(range.from, d), d); }} /></label>
        </div>
        <span className="pnote">
          {preset === 'post' && <>Sep 8 is the first school day after Labor Day, when the school next to F3 reopened. </>}
          <b>{dayLabel(range.from)} – {dayLabel(range.to)}</b> · {days} days · {nChecks.toLocaleString()} checks · {nDrops} drops
        </span>
      </div>

      <main id="main">
        {view === 'runouts' && <Runouts />}
        {view === 'compare' && <Compare />}
        {view === 'donations' && <Donations />}
        {view === 'temperature' && <Temperature />}
        {view === 'planner' && <Planner />}
        {view === 'log' && <Log />}
      </main>
      <footer className="foot-note">Stocktake Commons is free and volunteer-maintained. Figures come from volunteer check logs, so a fridge can be empty between checks without it being recorded.</footer>
      {brief && <BriefModal onClose={() => setBrief(false)} pinned={pinned} go={go} />}
      <TipLayer />
    </AppCtx.Provider>
  );
}

function BriefModal({ onClose, pinned, go }: { onClose: () => void; pinned: Pinned; go: (v: View) => void }) {
  const b = useMemo(() => buildBrief(pinned), [pinned]);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeRef.current?.focus(); const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, [onClose]);
  const copy = async () => {
    const text = briefText(b);
    try { await navigator.clipboard.writeText(text); } catch {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
    }
    setCopied(true); setTimeout(() => setCopied(false), 2200);
  };
  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="brief-t">
        <header>
          <div><h2 id="brief-t">{b.title}</h2><p>{b.sub}</p></div>
          <button ref={closeRef} type="button" className="x" onClick={onClose} aria-label="Close brief">×</button>
        </header>
        <div className="body">
          {b.sections.map((s) => (
            <section key={s.h}><h3>{s.h}</h3><ul>{s.lines.map((l, i) => <li key={i}>{l}</li>)}</ul></section>
          ))}
        </div>
        <footer>
          <span className="muted">Numbers update with the data. Use the Extra drop tab to pin a recommendation.</span>
          <div>
            <button type="button" className="btn" onClick={() => { onClose(); go('planner'); }}>Go to Extra drop</button>
            <button type="button" className="btn primary" onClick={copy}>{copied ? 'Copied ✓' : 'Copy as text'}</button>
          </div>
        </footer>
      </div>
    </div>
  );
}
