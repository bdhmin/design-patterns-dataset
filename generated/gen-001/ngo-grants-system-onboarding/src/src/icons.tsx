import type { ReactNode } from 'react';

const I = ({ children, size = 16, className }: { children: ReactNode; size?: number; className?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {children}
  </svg>
);
type P = { size?: number; className?: string };

export const Lock = (p: P) => <I {...p}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></I>;
export const Check = (p: P) => <I {...p}><path d="M5 12.5l4.5 4.5L19 7.5" /></I>;
export const Info = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5v.01" /></I>;
export const Alert = (p: P) => <I {...p}><path d="M12 3l9.5 17h-19z" /><path d="M12 10v4.5M12 17.5v.01" /></I>;
export const Search = (p: P) => <I {...p}><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></I>;
export const Help = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14M12 17.5v.01" /></I>;
export const Book = (p: P) => <I {...p}><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M19 19v2H6" /></I>;
export const Chat = (p: P) => <I {...p}><path d="M4 5h16v11H9l-5 4z" /></I>;
export const Compass = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></I>;
export const ChevronRight = (p: P) => <I {...p}><path d="M9 6l6 6-6 6" /></I>;
export const ChevronLeft = (p: P) => <I {...p}><path d="M15 6l-6 6 6 6" /></I>;
export const ChevronDown = (p: P) => <I {...p}><path d="M6 9l6 6 6-6" /></I>;
export const X = (p: P) => <I {...p}><path d="M6 6l12 12M18 6L6 18" /></I>;
export const File = (p: P) => <I {...p}><path d="M14 3H6v18h12V7z" /><path d="M14 3v4h4" /></I>;
export const Upload = (p: P) => <I {...p}><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></I>;
export const Clock = (p: P) => <I {...p}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></I>;
export const ArrowRight = (p: P) => <I {...p}><path d="M4 12h16M14 6l6 6-6 6" /></I>;
export const Flag = (p: P) => <I {...p}><path d="M5 21V4M5 4h11l-2 4 2 4H5" /></I>;
export const Send = (p: P) => <I {...p}><path d="M21 3L10 14M21 3l-7 18-4-7-7-4z" /></I>;
export const Sparkle = (p: P) => <I {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" /></I>;
export const Paperclip = (p: P) => <I {...p}><path d="M20 11.5l-8.5 8.5a5 5 0 0 1-7-7L13 4.5a3.5 3.5 0 0 1 5 5L9.5 18a2 2 0 0 1-3-3L14 7.5" /></I>;
export const Dot = (p: P) => <I {...p}><circle cx="12" cy="12" r="4" fill="currentColor" /></I>;
