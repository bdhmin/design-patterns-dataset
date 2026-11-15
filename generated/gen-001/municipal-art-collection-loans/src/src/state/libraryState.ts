import { SEED_STATE } from '../data/seed';
import { WORKS_BY_ACCESSION } from '../data/collection';
import type { LibraryState, ProposalItem } from '../types';

const STORAGE_KEY = 'civic-holdings-register.eastvale-library.v1';
const SPACE_IDS = ['reading', 'children', 'atrium'];

// Restores the saved proposal, dropping anything that no longer matches the register.
export function loadLibraryState(): LibraryState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_STATE;
    const parsed = JSON.parse(raw) as Partial<LibraryState>;
    const shortlist = (parsed.shortlist ?? []).filter((a) => WORKS_BY_ACCESSION.has(a));
    const seen = new Set<string>();
    const proposal: ProposalItem[] = [];
    for (const item of parsed.proposal ?? []) {
      if (!WORKS_BY_ACCESSION.has(item.accession) || seen.has(item.accession)) continue;
      if (!SPACE_IDS.includes(item.space)) continue;
      seen.add(item.accession);
      proposal.push(item);
    }
    return { shortlist, proposal: proposal.slice(0, 12) };
  } catch {
    return SEED_STATE;
  }
}

export function saveLibraryState(state: LibraryState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage can be unavailable (private browsing, quota). The app still works for this session.
  }
}
