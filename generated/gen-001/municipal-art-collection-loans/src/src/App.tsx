import { useCallback, useEffect, useMemo, useState } from 'react';
import { WORKS, WORKS_BY_ACCESSION } from './data/collection';
import { SEED_STATE } from './data/seed';
import { PROPOSAL_SIZE, SPACE_BY_ID } from './lib/constants';
import { assessWork, evaluateProposal, suggestWall, wallPacks, type WorkAssessment } from './lib/rules';
import { loadLibraryState, saveLibraryState } from './state/libraryState';
import { type Actions, type AppCtx } from './components/common';
import { WorkDrawer } from './components/WorkDrawer';
import { LibraryView } from './views/LibraryView';
import { CollectionView } from './views/CollectionView';
import type { LibraryState, ProposalItem, SpaceId, View } from './types';
import { fmtInt } from './lib/format';

function defaultSpace(a: WorkAssessment): SpaceId | null {
  if (a.eligibleSpaces.length === 0) return null;
  const clear = a.eligibleSpaces.find((id) => a.spaces[id].status === 'eligible');
  return clear ?? a.eligibleSpaces[0];
}

export default function App() {
  const [state, setState] = useState<LibraryState>(loadLibraryState);
  const [view, setView] = useState<View>('library');
  const [openAccession, setOpenAccession] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Assessed once per session, against today's date (for condition-check age).
  const assessments = useMemo(() => {
    const now = new Date();
    const map = new Map<string, WorkAssessment>();
    for (const w of WORKS) map.set(w.accession, assessWork(w, now));
    return map;
  }, []);

  const summary = useMemo(
    () => evaluateProposal(state.proposal, WORKS_BY_ACCESSION, assessments),
    [state.proposal, assessments],
  );

  useEffect(() => {
    saveLibraryState(state);
  }, [state]);

  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const notify = useCallback((message: string) => setNotice(message), []);

  const actions: Actions = useMemo(
    () => ({
      toggleShortlist: (accession) =>
        setState((s) => ({
          ...s,
          shortlist: s.shortlist.includes(accession)
            ? s.shortlist.filter((x) => x !== accession)
            : [...s.shortlist, accession],
        })),

      propose: (accession, space, wallId) => {
        const work = WORKS_BY_ACCESSION.get(accession);
        const a = assessments.get(accession);
        if (!work || !a) return;
        if (state.proposal.some((p) => p.accession === accession)) return;
        if (state.proposal.length >= PROPOSAL_SIZE) {
          notify(`The proposal is full: ${PROPOSAL_SIZE} of ${PROPOSAL_SIZE} works. Remove one to add another.`);
          return;
        }
        if (a.blocked) {
          const reason = a.globalReasons.find((r) => r.level === 'block')?.text ?? 'not available';
          notify(`${work.title} can’t be proposed: ${reason}.`);
          return;
        }
        const target = space ?? defaultSpace(a);
        if (!target || !a.eligibleSpaces.includes(target)) {
          notify(`${work.title} isn’t eligible for ${target ? SPACE_BY_ID[target].name : 'any space'}.`);
          return;
        }
        const wall = wallId ?? suggestWall(work, target, state.proposal, WORKS_BY_ACCESSION);
        const slotNo = state.proposal.length + 1;
        const nextProposal: ProposalItem[] = [...state.proposal, { accession, space: target, wallId: wall }];
        const wallDef = SPACE_BY_ID[target].walls.find((w) => w.id === wall);
        const members = nextProposal
          .filter((p) => p.space === target && p.wallId === wall)
          .map((p) => WORKS_BY_ACCESSION.get(p.accession))
          .filter((w): w is NonNullable<typeof w> => Boolean(w));
        const overCapacity = wallDef !== undefined && !wallPacks(members, wallDef);
        setState((s) => ({
          shortlist: s.shortlist.includes(accession) ? s.shortlist : [...s.shortlist, accession],
          proposal: [...s.proposal, { accession, space: target, wallId: wall }],
        }));
        notify(
          overCapacity
            ? `Added ${work.title} to slot ${slotNo}, but ${wallDef?.label} is now over capacity. Move a work to another wall or space.`
            : `Added ${work.title} to slot ${slotNo}, ${SPACE_BY_ID[target].name}.`,
        );
      },

      unpropose: (accession) =>
        setState((s) => ({ ...s, proposal: s.proposal.filter((p) => p.accession !== accession) })),

      changeSlot: (accession, patch) =>
        setState((s) => {
          const item = s.proposal.find((p) => p.accession === accession);
          if (!item) return s;
          const next: ProposalItem = { ...item, ...patch };
          if (patch.space && patch.space !== item.space && patch.wallId === undefined) {
            const work = WORKS_BY_ACCESSION.get(accession);
            if (work) {
              const others = s.proposal.filter((p) => p.accession !== accession);
              next.wallId = suggestWall(work, patch.space, others, WORKS_BY_ACCESSION);
            }
          }
          return { ...s, proposal: s.proposal.map((p) => (p.accession === accession ? next : p)) };
        }),

      open: (accession) => setOpenAccession(accession),
      notify,
      reset: () => {
        setState(SEED_STATE);
        notify('Proposal and shortlist reset to the starting state.');
      },
    }),
    [state, assessments, notify],
  );

  const ctx: AppCtx = { state, assessments, summary, actions };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            CHR
          </span>
          <div>
            <strong>Civic Holdings Register</strong>
            <span>City of Harrow Bay · Office of Arts &amp; Culture</span>
          </div>
        </div>

        <nav className="tabs" aria-label="Main">
          <button
            type="button"
            className={`tab ${view === 'library' ? 'tab-on' : ''}`}
            aria-current={view === 'library' ? 'page' : undefined}
            onClick={() => setView('library')}
          >
            Eastvale Branch Library
            <span className="tab-count">
              {summary.filled}/{PROPOSAL_SIZE}
            </span>
          </button>
          <button
            type="button"
            className={`tab ${view === 'collection' ? 'tab-on' : ''}`}
            aria-current={view === 'collection' ? 'page' : undefined}
            onClick={() => setView('collection')}
          >
            Collection register
            <span className="tab-count">{fmtInt(WORKS.length)}</span>
          </button>
        </nav>

        <div className="user">
          <strong>Rosalind Achebe</strong>
          <span>Collections Coordinator</span>
        </div>
      </header>

      {view === 'library' ? <LibraryView ctx={ctx} /> : <CollectionView ctx={ctx} />}

      {openAccession && (
        <WorkDrawer ctx={ctx} accession={openAccession} onClose={() => setOpenAccession(null)} />
      )}

      {notice && (
        <div className="toast" role="status" aria-live="polite">
          {notice}
        </div>
      )}
    </div>
  );
}
