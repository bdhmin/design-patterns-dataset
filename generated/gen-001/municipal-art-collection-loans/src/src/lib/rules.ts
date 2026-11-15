import type { ProposalItem, SpaceId, Work } from '../types';
import {
  EASTVALE_MIN,
  FRAGILE_MIN_HEIGHT,
  FREE_BY,
  HEIGHT_MARGIN,
  PROPOSAL_SIZE,
  READING_ROOM_BLOCKED_MEDIA,
  SPACES,
  SPACE_BY_ID,
  STALE_ASSESSMENT_YEARS,
  WALL_END_MARGIN,
  WORK_GAP,
  type SpaceDef,
  type WallDef,
} from './constants';
import { fmtDate } from './format';

export const SPACE_IDS: SpaceId[] = SPACES.map((s) => s.id);

export interface Reason {
  level: 'block' | 'warn';
  text: string;
}

export interface SpaceAssessment {
  space: SpaceId;
  status: 'eligible' | 'warning' | 'blocked';
  reasons: Reason[];
  wallId: string | null;
  wallLabel: string | null;
  heightUnverified: boolean;
}

export interface WorkAssessment {
  work: Work;
  globalReasons: Reason[];
  blocked: boolean; // unavailable for any space
  spaces: Record<SpaceId, SpaceAssessment>;
  eligibleSpaces: SpaceId[]; // not blocked for the space
  inPool: boolean; // available and eligible for at least one space
}

const STALE_MS = STALE_ASSESSMENT_YEARS * 365.25 * 86400000;

function assessGlobal(work: Work, now: Date): Reason[] {
  const reasons: Reason[] = [];
  const { loan, condition, conditionDate } = work;
  const c = loan.commitment;

  if (loan.status === 'On hold') {
    reasons.push({
      level: 'block',
      text: `On hold for the Civic Center renovation until ${fmtDate(c?.until ?? '2027-06-30')}`,
    });
  } else if (c && (loan.status === 'On loan' || loan.status === 'Promised')) {
    const verb = loan.status === 'On loan' ? 'On loan to' : 'Promised to';
    if (c.until >= FREE_BY) {
      reasons.push({ level: 'block', text: `${verb} ${c.venue} until ${fmtDate(c.until)}` });
    } else {
      reasons.push({
        level: 'warn',
        text: `${verb} ${c.venue} until ${fmtDate(c.until)}; confirm it is back and checked`,
      });
    }
  }

  if (condition === 'Needs Treatment') {
    reasons.push({ level: 'block', text: 'Needs treatment before it can be displayed' });
  } else if (condition === 'Fair') {
    reasons.push({ level: 'warn', text: 'Fair condition: conservator check before install' });
  }

  if (Date.parse(conditionDate + 'T00:00:00Z') < now.getTime() - STALE_MS) {
    reasons.push({
      level: 'warn',
      text: `Last condition check ${fmtDate(conditionDate)}, over ${STALE_ASSESSMENT_YEARS} years ago`,
    });
  }
  return reasons;
}

export function wallFitsWork(work: Work, wall: WallDef): boolean {
  const widthOk = work.dimsCm.w + 2 * WALL_END_MARGIN <= wall.lengthCm;
  const heightOk = wall.heightCm === null || work.dimsCm.h + HEIGHT_MARGIN <= wall.heightCm;
  return widthOk && heightOk;
}

function assessSpace(work: Work, space: SpaceDef): SpaceAssessment {
  const reasons: Reason[] = [];
  const { medium, mounting, fragile, dimsCm } = work;

  if (space.id === 'reading') {
    if (READING_ROOM_BLOCKED_MEDIA.includes(medium)) {
      reasons.push({ level: 'block', text: `${medium} ruled out: reading room gets direct sun` });
    }
  }

  if (space.id === 'children') {
    if (mounting !== 'Wall-hung') {
      reasons.push({ level: 'block', text: 'Free-standing: children’s area takes hung works only' });
    }
    if (fragile && dimsCm.h < FRAGILE_MIN_HEIGHT) {
      reasons.push({
        level: 'block',
        text: `Fragile and ${dimsCm.h} cm tall; fragile works must be at least ${FRAGILE_MIN_HEIGHT} cm`,
      });
    }
  }

  const wall = space.walls.find((w) => wallFitsWork(work, w)) ?? null;
  let heightUnverified = false;
  if (!wall) {
    const widestWall = Math.max(...space.walls.map((w) => w.lengthCm));
    if (dimsCm.w + 2 * WALL_END_MARGIN > widestWall) {
      reasons.push({
        level: 'block',
        text: `${dimsCm.w} cm wide; no wall here is longer than ${widestWall} cm (incl. clearance)`,
      });
    } else {
      reasons.push({
        level: 'block',
        text: `${dimsCm.h} cm tall; too tall for the wall (clearance needed above and below)`,
      });
    }
  } else if (wall.heightCm === null) {
    heightUnverified = true;
    reasons.push({ level: 'warn', text: 'Wall height not supplied; confirm clearance with Facilities' });
  }

  const status = reasons.some((r) => r.level === 'block')
    ? 'blocked'
    : reasons.some((r) => r.level === 'warn')
      ? 'warning'
      : 'eligible';

  return {
    space: space.id,
    status,
    reasons,
    wallId: wall?.id ?? null,
    wallLabel: wall?.label ?? null,
    heightUnverified,
  };
}

export function assessWork(work: Work, now: Date = new Date()): WorkAssessment {
  const globalReasons = assessGlobal(work, now);
  const blocked = globalReasons.some((r) => r.level === 'block');
  const spaces = {} as Record<SpaceId, SpaceAssessment>;
  for (const space of SPACES) spaces[space.id] = assessSpace(work, space);
  const eligibleSpaces = blocked ? [] : SPACE_IDS.filter((id) => spaces[id].status !== 'blocked');
  return {
    work,
    globalReasons,
    blocked,
    spaces,
    eligibleSpaces,
    inPool: eligibleSpaces.length > 0,
  };
}

// ---------- proposal evaluation ----------

export interface ProposalRow {
  item: ProposalItem;
  work: Work | null;
  reasons: Reason[];
}

export interface WallUsage {
  key: string;
  spaceId: SpaceId;
  wallId: string;
  label: string;
  lengthCm: number;
  usedCm: number;
  accessions: string[];
  ok: boolean;
}

export interface ProposalSummary {
  rows: ProposalRow[];
  filled: number;
  open: number;
  eastvaleCount: number;
  eastvaleShort: number;
  walls: WallUsage[];
  blockingRows: number;
  warningRows: number;
  complete: boolean;
  ready: boolean;
}

export function wallPacks(members: Work[], wall: WallDef): boolean {
  if (members.length === 0) return true;
  const used =
    members.reduce((sum, w) => sum + w.dimsCm.w, 0) +
    WORK_GAP * (members.length - 1) +
    2 * WALL_END_MARGIN;
  return used <= wall.lengthCm;
}

export function wallUsedCm(members: Work[]): number {
  if (members.length === 0) return 0;
  return (
    members.reduce((sum, w) => sum + w.dimsCm.w, 0) +
    WORK_GAP * (members.length - 1) +
    2 * WALL_END_MARGIN
  );
}

// Choose a wall for a work being added to a space: the first wall where it still fits
// alongside the works already planned there.
export function suggestWall(
  work: Work,
  spaceId: SpaceId,
  items: ProposalItem[],
  worksByAccession: Map<string, Work>,
): string {
  const walls = SPACE_BY_ID[spaceId].walls;
  for (const wall of walls) {
    const members = items
      .filter((i) => i.space === spaceId && i.wallId === wall.id)
      .map((i) => worksByAccession.get(i.accession))
      .filter((w): w is Work => Boolean(w));
    const heightOk = wall.heightCm === null || work.dimsCm.h + HEIGHT_MARGIN <= wall.heightCm;
    if (heightOk && wallPacks([...members, work], wall)) return wall.id;
  }
  return walls[0].id;
}

export function evaluateProposal(
  proposal: ProposalItem[],
  worksByAccession: Map<string, Work>,
  assessments: Map<string, WorkAssessment>,
): ProposalSummary {
  const rows: ProposalRow[] = proposal.map((item) => {
    const work = worksByAccession.get(item.accession) ?? null;
    const reasons: Reason[] = [];
    if (!work) {
      reasons.push({ level: 'block', text: 'Not found in the register' });
      return { item, work, reasons };
    }
    const a = assessments.get(item.accession);
    if (a) {
      reasons.push(...a.globalReasons);
      const sa = a.spaces[item.space];
      if (sa.status === 'blocked') {
        reasons.push(...sa.reasons.filter((r) => r.level === 'block'));
      }
      reasons.push(...sa.reasons.filter((r) => r.level === 'warn'));
    }
    return { item, work, reasons };
  });

  // Wall packing and height, per wall, across everything planned there.
  const groups = new Map<string, ProposalRow[]>();
  for (const row of rows) {
    if (!row.work) continue;
    const key = `${row.item.space}|${row.item.wallId}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  const walls: WallUsage[] = [];
  for (const [key, members] of groups) {
    const [spaceId, wallId] = key.split('|') as [SpaceId, string];
    const wall = SPACE_BY_ID[spaceId].walls.find((w) => w.id === wallId);
    if (!wall) continue;
    const works = members.map((m) => m.work as Work);
    const usedCm = wallUsedCm(works);
    const ok = wallPacks(works, wall);
    walls.push({
      key,
      spaceId,
      wallId,
      label: wall.label,
      lengthCm: wall.lengthCm,
      usedCm,
      accessions: members.map((m) => m.item.accession),
      ok,
    });
    for (const m of members) {
      if (!ok) {
        m.reasons.push({
          level: 'block',
          text: `${wall.label} is full: ${usedCm} cm needed, ${wall.lengthCm} cm available`,
        });
      }
      if (wall.heightCm !== null && (m.work as Work).dimsCm.h + HEIGHT_MARGIN > wall.heightCm) {
        m.reasons.push({ level: 'block', text: `Too tall for ${wall.label}` });
      }
    }
  }

  const eastvaleCount = rows.filter((r) => r.work?.eastvaleArtist).length;
  const filled = proposal.length;
  const blockingRows = rows.filter((r) => r.reasons.some((x) => x.level === 'block')).length;
  const warningRows = rows.filter(
    (r) => !r.reasons.some((x) => x.level === 'block') && r.reasons.some((x) => x.level === 'warn'),
  ).length;
  const complete = filled === PROPOSAL_SIZE;
  const eastvaleShort = Math.max(0, EASTVALE_MIN - eastvaleCount);

  return {
    rows,
    filled,
    open: PROPOSAL_SIZE - filled,
    eastvaleCount,
    eastvaleShort,
    walls,
    blockingRows,
    warningRows,
    complete,
    ready: complete && eastvaleShort === 0 && blockingRows === 0,
  };
}
