import type { Condition, Medium, SpaceId } from '../types';

// Director's review. The brief says "Friday"; 13 Nov 2026 is a Friday, so the
// review is taken to be the following Friday. Change here if that is wrong.
export const REVIEW_DATE = '2026-11-20';

// Works still on loan or promised elsewhere after this date cannot be hung in
// January. Chosen as 14 days before the install window so there is time to
// crate, transport and condition-check them.
export const FREE_BY = '2026-12-21';

export const PROPOSAL_SIZE = 12;
export const EASTVALE_MIN = 6; // "at least half" of 12

// Hanging rules, in cm.
export const WALL_END_MARGIN = 20; // clear space at each end of a wall
export const WORK_GAP = 40; // clear space between works on the same wall
export const HEIGHT_MARGIN = 30; // clear space above and below a work
export const FRAGILE_MIN_HEIGHT = 120; // children's area: fragile works must be at least this tall

export const STALE_ASSESSMENT_YEARS = 3;

export const READING_ROOM_BLOCKED_MEDIA: Medium[] = ['Work on paper', 'Photograph', 'Textile'];

export const CONDITION_RANK: Record<Condition, number> = {
  Excellent: 0,
  Good: 1,
  Fair: 2,
  'Needs Treatment': 3,
};

export interface WallDef {
  id: string;
  label: string;
  lengthCm: number;
  heightCm: number | null; // null = not supplied by Facilities
}

export interface SpaceDef {
  id: SpaceId;
  name: string;
  code: string; // short code shown on work rows
  walls: WallDef[];
  dimensionsLabel: string;
  rules: string[];
}

export const SPACES: SpaceDef[] = [
  {
    id: 'reading',
    name: 'Reading Room',
    code: 'RR',
    walls: [{ id: 'south', label: 'South wall', lengthCm: 640, heightCm: 280 }],
    dimensionsLabel: 'South wall, 6.4 m × 2.8 m',
    rules: [
      'South-facing, direct sun: no works on paper, textiles or photographs',
    ],
  },
  {
    id: 'children',
    name: "Children's Area",
    code: 'CA',
    walls: [
      { id: 'wall-a', label: 'Wall A', lengthCm: 310, heightCm: null },
      { id: 'wall-b', label: 'Wall B', lengthCm: 310, heightCm: null },
      { id: 'wall-c', label: 'Wall C', lengthCm: 310, heightCm: null },
    ],
    dimensionsLabel: 'Three walls, 3.1 m each',
    rules: [
      'Hung works only; nothing free-standing',
      'Fragile works must be at least 1.2 m tall',
      'Wall height not yet supplied by Facilities',
    ],
  },
  {
    id: 'atrium',
    name: 'Entry Atrium',
    code: 'EA',
    walls: [{ id: 'atrium', label: 'Atrium wall', lengthCm: 420, heightCm: 500 }],
    dimensionsLabel: 'Double-height wall, 4.2 m × 5.0 m',
    rules: ['No medium restriction; size and hanging clearance only'],
  },
];

export const SPACE_BY_ID: Record<SpaceId, SpaceDef> = {
  reading: SPACES[0],
  children: SPACES[1],
  atrium: SPACES[2],
};
