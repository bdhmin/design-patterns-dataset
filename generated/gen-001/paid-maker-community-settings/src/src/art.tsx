import { useId } from 'react';

/** Oduya Knits brand mark (stands in for oduya-mark.png on file). */
export function OduyaMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" role="img" aria-label="Oduya Knits logo">
      <circle cx="24" cy="24" r="23" fill="#4a3a63" />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="#f3e7d3" strokeWidth="2.4" />
      <g fill="none" stroke="#e7b97a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 19l3.5 4 3.5-4 3.5 4 3.5-4" />
        <path d="M17 25l3.5 4 3.5-4 3.5 4 3.5-4" />
      </g>
    </svg>
  );
}

export function HearthroomMark({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#2b2622" />
      <path d="M8 24V14.5L16 8l8 6.5V24z" fill="none" stroke="#f1e6d6" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M16 23c-2.4 0-3.6-1.6-3.6-3.3 0-2 1.8-2.9 2.2-5 1.8 1.1 2.4 2.4 2.3 3.6.6-.4 1-1 1.1-1.7 1 1 1.6 2 1.6 3.2 0 1.8-1.3 3.2-3.6 3.2z" fill="#e0773f" />
    </svg>
  );
}

/** A generic community mark used when invites come from the community name. */
export function CircleMark({ size = 40 }: { size?: number }) {
  return (
    <span className="circleMark" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden="true">
      OK
    </span>
  );
}

/** Close-up "photo" of knitted fabric: rows of V stitches. */
export function Swatch({ yarn, ground, label }: { yarn: string; ground: string; label: string }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 160 120" preserveAspectRatio="xMidYMid slice" role="img" aria-label={label} className="swatchSvg">
      <defs>
        <pattern id={`st${id}`} width="16" height="14" patternUnits="userSpaceOnUse">
          <rect width="16" height="14" fill={yarn} />
          <path d="M1 0c2 5 4 9 7 13.5M15 0c-2 5-4 9-7 13.5" stroke={ground} strokeOpacity="0.35" strokeWidth="1.2" fill="none" />
          <path d="M3 1c1.6 4 3 7.5 5 11M13 1c-1.6 4-3 7.5-5 11" stroke="#000" strokeOpacity="0.18" strokeWidth="2.4" fill="none" />
        </pattern>
        <radialGradient id={`lt${id}`} cx="30%" cy="25%" r="90%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="1" stopColor="#000" stopOpacity="0.25" />
        </radialGradient>
      </defs>
      <rect width="160" height="120" fill={ground} />
      <rect width="160" height="120" fill={`url(#st${id})`} />
      <path d="M54 0v120M106 0v120" stroke={ground} strokeOpacity="0.5" strokeWidth="5" strokeDasharray="7 7" />
      <rect width="160" height="120" fill={`url(#lt${id})`} />
    </svg>
  );
}
