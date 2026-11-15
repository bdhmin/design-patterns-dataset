import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

// ---------- tooltip ----------
type Tip = { x: number; y: number; content: ReactNode } | null;
let setTipGlobal: ((t: Tip) => void) | null = null;
export function TipLayer() {
  const [tip, setTip] = useState<Tip>(null);
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });
  useEffect(() => { setTipGlobal = setTip; return () => { setTipGlobal = null; }; }, []);
  useLayoutEffect(() => {
    if (!tip || !ref.current) return;
    const w = ref.current.offsetWidth, h = ref.current.offsetHeight;
    let left = tip.x + 14, top = tip.y + 16;
    if (left + w > window.innerWidth - 8) left = tip.x - w - 14;
    if (top + h > window.innerHeight - 8) top = tip.y - h - 14;
    setPos({ left: Math.max(8, left), top: Math.max(8, top) });
  }, [tip]);
  if (!tip) return null;
  return <div ref={ref} className="tip" style={{ left: pos.left, top: pos.top }} role="tooltip">{tip.content}</div>;
}
export const tipOn = (content: ReactNode) => ({
  onMouseMove: (e: React.MouseEvent) => setTipGlobal?.({ x: e.clientX, y: e.clientY, content }),
  onMouseLeave: () => setTipGlobal?.(null),
});
export const hideTip = () => setTipGlobal?.(null);

// ---------- hooks ----------
export function useWidth<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(ref.current.clientWidth);
    const ro = new ResizeObserver((es) => setW(Math.floor(es[0].contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref as React.RefObject<T>, w];
}

// ---------- color scales ----------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function ramp(stops: [number, string][], v: number) {
  if (!Number.isFinite(v)) return 'rgb(235,230,218)';
  const rgb = (h: string) => `rgb(${hex(h).join(',')})`;
  if (v <= stops[0][0]) return rgb(stops[0][1]);
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [v0, c0] = stops[i - 1], [v1, c1] = stops[i];
      const t = (v - v0) / (v1 - v0), a = hex(c0), b = hex(c1);
      return `rgb(${[0, 1, 2].map((k) => Math.round(lerp(a[k], b[k], t))).join(',')})`;
    }
  }
  return rgb(stops[stops.length - 1][1]);
}
// average fill: rust (empty) -> sand -> green (full)
export const fillColor = (v: number) => ramp([[0, '#b5432a'], [1, '#e6a07e'], [2, '#f3ead3'], [3, '#a9cdb6'], [4, '#2f7d68']], v);
// share empty: paper -> rust
export const emptyColor = (v: number) => ramp([[0, '#f6f1e4'], [0.15, '#f1d9bf'], [0.4, '#df9a72'], [0.7, '#bf4f2e'], [1, '#8f2f17']], v);
export const textOn = (bg: string) => {
  const m = bg.match(/\d+/g); if (!m) return '#1f2a26';
  const [r, g, b] = m.map(Number);
  return 0.299 * r + 0.587 * g + 0.114 * b < 150 ? '#fff' : '#1f2a26';
};

// ---------- small controls ----------
export function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode; title?: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? 'on' : ''} aria-pressed={value === o.value} title={o.title} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Panel({ title, sub, actions, children, className = '' }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {(title || actions) && (
        <header className="panel-h">
          <div>
            {title && <h3>{title}</h3>}
            {sub && <p className="sub">{sub}</p>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Legend({ items }: { items: { label: string; color: string; dash?: boolean; hollow?: boolean }[] }) {
  return (
    <ul className="legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className={`sw ${i.dash ? 'dash' : ''} ${i.hollow ? 'hollow' : ''}`} style={{ background: i.dash || i.hollow ? 'transparent' : i.color, borderColor: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export const FillPips = ({ v }: { v: number }) => (
  <span className="pips" aria-label={`fill ${v} of 4`} title={`Fill level ${v} of 4`}>
    {[1, 2, 3, 4].map((i) => <i key={i} className={i <= v ? 'on' : ''} data-lvl={v} />)}
  </span>
);

export function Delta({ v, fmt, worseWhenHigher = true, eps = 0.0001 }: { v: number; fmt: (x: number) => string; worseWhenHigher?: boolean; eps?: number }) {
  if (!Number.isFinite(v) || Math.abs(v) < eps) return <span className="delta flat">±0</span>;
  const worse = worseWhenHigher ? v > 0 : v < 0;
  return <span className={`delta ${worse ? 'bad' : 'good'}`}>{v > 0 ? '▲' : '▼'} {fmt(Math.abs(v))}</span>;
}
