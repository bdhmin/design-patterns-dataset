import { createContext, useContext } from 'react';
import type { Range, LogFilter } from './lib/analysis';

export type View = 'runouts' | 'compare' | 'donations' | 'temperature' | 'planner' | 'log';
export type Preset = 'all' | 'pre' | 'post' | 'custom';
export type Pinned = { fridge: string; dow: number } | null;

export type App = {
  view: View; go: (v: View) => void;
  range: Range; preset: Preset; setPreset: (p: Preset) => void; setCustom: (from: number, to: number) => void;
  selFridge: string; setSelFridge: (id: string) => void;
  compare: string[]; toggleCompare: (id: string) => void;
  logFilter: LogFilter; setLogFilter: (f: LogFilter) => void; openLog: (f: Partial<LogFilter>, from?: View) => void; logFrom: View | null;
  pinned: Pinned; setPinned: (p: Pinned) => void;
  openBrief: () => void;
};
export const AppCtx = createContext<App>(null as unknown as App);
export const useApp = () => useContext(AppCtx);
