import type { LibraryState } from '../types';

// The state Rosalind left the Eastvale Branch Library project in, one week before
// the director's review. Seven of twelve works are placed; four are by Eastvale-area
// artists, so two more are needed. Harbor Light No. 3 is shortlisted but is promised
// to Ferris Park Gallery until 28 Feb 2027, so it cannot be proposed.
export const SEED_STATE: LibraryState = {
  proposal: [
    { accession: 'HB.1994.017', space: 'reading', wallId: 'south' },
    { accession: 'HB.1991.115', space: 'reading', wallId: 'south' },
    { accession: 'HB.2011.088', space: 'atrium', wallId: 'atrium' },
    { accession: 'HB.1959.158', space: 'atrium', wallId: 'atrium' },
    { accession: 'HB.2004.062', space: 'children', wallId: 'wall-a' },
    { accession: 'HB.1961.096', space: 'children', wallId: 'wall-b' },
    { accession: 'HB.1962.132', space: 'children', wallId: 'wall-b' },
  ],
  shortlist: [
    'HB.1994.017',
    'HB.1991.115',
    'HB.2011.088',
    'HB.1959.158',
    'HB.2004.062',
    'HB.1961.096',
    'HB.1962.132',
    'HB.1997.068',
    'HB.1965.112',
    'HB.2016.048',
    'HB.2007.029',
    'HB.1966.150',
    'HB.1987.042',
    'HB.1970.151',
    'HB.2019.042',
  ],
};
