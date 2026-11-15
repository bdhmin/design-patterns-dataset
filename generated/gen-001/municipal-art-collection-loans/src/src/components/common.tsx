import type { ReactNode } from 'react';
import type { Condition, LibraryState, LoanStatus, ProposalItem, SpaceId, Work } from '../types';
import type { ProposalSummary, Reason, SpaceAssessment, WorkAssessment } from '../lib/rules';
import { SPACE_BY_ID, STALE_ASSESSMENT_YEARS } from '../lib/constants';
import { fmtDate } from '../lib/format';

export interface Actions {
  toggleShortlist: (accession: string) => void;
  propose: (accession: string, space?: SpaceId, wallId?: string) => void;
  unpropose: (accession: string) => void;
  changeSlot: (accession: string, patch: Partial<ProposalItem>) => void;
  open: (accession: string) => void;
  notify: (message: string) => void;
  reset: () => void;
}

export interface AppCtx {
  state: LibraryState;
  assessments: Map<string, WorkAssessment>;
  summary: ProposalSummary;
  actions: Actions;
}

export function Chip({
  tone = 'muted',
  children,
  title,
}: {
  tone?: 'ok' | 'warn' | 'block' | 'muted' | 'accent';
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={`chip chip-${tone}`} title={title}>
      {children}
    </span>
  );
}

export function LoanChip({ status }: { status: LoanStatus }) {
  const tone = status === 'Available' ? 'ok' : status === 'On loan' ? 'accent' : status === 'Promised' ? 'warn' : 'block';
  return <Chip tone={tone}>{status}</Chip>;
}

export function ConditionLabel({ condition }: { condition: Condition }) {
  const tone = condition === 'Excellent' || condition === 'Good' ? 'ok' : condition === 'Fair' ? 'warn' : 'block';
  return <Chip tone={tone}>{condition}</Chip>;
}

export function isStale(work: Work, now: Date = new Date()): boolean {
  const cutoff = now.getTime() - STALE_ASSESSMENT_YEARS * 365.25 * 86400000;
  return Date.parse(work.conditionDate + 'T00:00:00Z') < cutoff;
}

export function SpaceCodes({ a }: { a: WorkAssessment }) {
  return (
    <span className="space-codes">
      {(['reading', 'atrium', 'children'] as SpaceId[]).map((id) => {
        const sa = a.spaces[id];
        const tone = a.blocked ? 'muted' : sa.status === 'eligible' ? 'ok' : sa.status === 'warning' ? 'warn' : 'muted';
        const label = `${SPACE_BY_ID[id].name}: ${a.blocked ? 'unavailable' : sa.status === 'eligible' ? 'eligible' : sa.status === 'warning' ? 'eligible with warnings' : 'not eligible'}`;
        return (
          <span key={id} className={`code code-${tone}`} title={label}>
            {SPACE_BY_ID[id].code}
          </span>
        );
      })}
    </span>
  );
}

export function ReasonList({ reasons }: { reasons: Reason[] }) {
  if (reasons.length === 0) return null;
  return (
    <ul className="reasons">
      {reasons.map((r, i) => (
        <li key={i} className={r.level === 'block' ? 'reason-block' : 'reason-warn'}>
          <span className="reason-mark" aria-hidden="true">
            {r.level === 'block' ? '✕' : '!'}
          </span>
          {r.text}
        </li>
      ))}
    </ul>
  );
}

export function SpaceStatusLine({ sa, blocked }: { sa: SpaceAssessment; blocked: boolean }) {
  const label = blocked ? 'Unavailable' : sa.status === 'eligible' ? 'Eligible' : sa.status === 'warning' ? 'Eligible, with warnings' : 'Not eligible';
  const tone = blocked ? 'muted' : sa.status === 'eligible' ? 'ok' : sa.status === 'warning' ? 'warn' : 'block';
  return <Chip tone={tone}>{label}</Chip>;
}

export function sizeText(w: Work): string {
  return `${w.dimsCm.h} × ${w.dimsCm.w}${w.dimsCm.d !== null ? ` × ${w.dimsCm.d}` : ''}`;
}

export function commitmentText(w: Work): string | null {
  const c = w.loan.commitment;
  if (!c) return null;
  return `${c.venue}, ${fmtDate(c.from)} – ${fmtDate(c.until)}`;
}

export function slotLabel(state: LibraryState, accession: string): number | null {
  const idx = state.proposal.findIndex((p) => p.accession === accession);
  return idx === -1 ? null : idx + 1;
}

export function spaceName(id: SpaceId): string {
  return SPACE_BY_ID[id].name;
}
