import { useMemo, useState } from 'react';
import { WORKS } from '../data/collection';
import {
  CONDITION_RANK,
  EASTVALE_MIN,
  FREE_BY,
  PROPOSAL_SIZE,
  REVIEW_DATE,
  SPACES,
  SPACE_BY_ID,
} from '../lib/constants';
import { SPACE_IDS } from '../lib/rules';
import type { WorkAssessment } from '../lib/rules';
import {
  calendarDaysUntil,
  downloadText,
  fmtDate,
  fmtInt,
  fmtLongDate,
  localDateStamp,
  toCsv,
} from '../lib/format';
import type { Medium, ProposalItem, SpaceId, Work } from '../types';
import {
  type AppCtx,
  Chip,
  ConditionLabel,
  ReasonList,
  SpaceCodes,
  commitmentText,
  isStale,
  sizeText,
  slotLabel,
} from '../components/common';

type SortKey = 'eastvale' | 'condition' | 'artist' | 'title' | 'size' | 'light' | 'accession';
const SORT_LABELS: Record<SortKey, string> = {
  eastvale: 'Eastvale artists first',
  condition: 'Condition, best first',
  artist: 'Artist',
  title: 'Title',
  size: 'Size, largest first',
  light: 'Light class',
  accession: 'Accession number',
};
const PAGE_SIZE = 150;
const MEDIUM_OPTIONS: Medium[] = ['Painting', 'Work on paper', 'Photograph', 'Sculpture', 'Textile', 'Ceramic', 'Mixed media'];

const area = (w: Work) => w.dimsCm.h * w.dimsCm.w;

const SORTERS: Record<SortKey, (a: Work, b: Work) => number> = {
  eastvale: (a, b) =>
    Number(b.eastvaleArtist) - Number(a.eastvaleArtist) ||
    CONDITION_RANK[a.condition] - CONDITION_RANK[b.condition] ||
    a.title.localeCompare(b.title),
  condition: (a, b) => CONDITION_RANK[a.condition] - CONDITION_RANK[b.condition] || a.title.localeCompare(b.title),
  artist: (a, b) => a.artist.localeCompare(b.artist) || a.title.localeCompare(b.title),
  title: (a, b) => a.title.localeCompare(b.title),
  size: (a, b) => area(b) - area(a),
  light: (a, b) => a.lightClass - b.lightClass || a.title.localeCompare(b.title),
  accession: (a, b) => a.accession.localeCompare(b.accession),
};

interface PoolStats {
  register: number;
  available: number;
  eastvale: number;
  perSpace: Record<SpaceId, { available: number; warnings: number }>;
}

function buildPoolStats(assessments: Map<string, WorkAssessment>): PoolStats {
  const perSpace = {} as PoolStats['perSpace'];
  for (const id of SPACE_IDS) perSpace[id] = { available: 0, warnings: 0 };
  let available = 0;
  let eastvale = 0;
  for (const a of assessments.values()) {
    if (a.blocked) continue;
    available++;
    if (a.work.eastvaleArtist) eastvale++;
    for (const id of a.eligibleSpaces) {
      perSpace[id].available++;
      if (a.spaces[id].status === 'warning') perSpace[id].warnings++;
    }
  }
  return { register: assessments.size, available, eastvale, perSpace };
}

function proposalCsvRows(ctx: AppCtx) {
  return ctx.summary.rows.map((row, i) => {
    const w = row.work;
    const wallLabel = w ? SPACE_BY_ID[row.item.space].walls.find((x) => x.id === row.item.wallId)?.label ?? '' : '';
    return {
      slot: i + 1,
      accession: row.item.accession,
      title: w?.title ?? '',
      artist: w?.artist ?? '',
      eastvale_artist: w?.eastvaleArtist ? 'yes' : 'no',
      medium: w?.medium ?? '',
      materials: w?.materials ?? '',
      height_cm: w?.dimsCm.h ?? '',
      width_cm: w?.dimsCm.w ?? '',
      depth_cm: w?.dimsCm.d ?? '',
      weight_kg: w?.weightKg ?? '',
      light_class: w?.lightClass ?? '',
      mounting: w?.mounting ?? '',
      fragile: w?.fragile ? 'yes' : 'no',
      condition: w?.condition ?? '',
      condition_last_assessed: w?.conditionDate ?? '',
      space: SPACE_BY_ID[row.item.space].name,
      wall: wallLabel,
      location: w?.location ?? '',
      loan_status: w?.loan.status ?? '',
      commitment: w ? commitmentText(w) ?? '' : '',
      issues: row.reasons.map((r) => r.text).join('; '),
    };
  });
}

export function LibraryView({ ctx }: { ctx: AppCtx }) {
  const { state, assessments, summary } = ctx;
  const pool = useMemo(() => buildPoolStats(assessments), [assessments]);
  const days = calendarDaysUntil(REVIEW_DATE);

  return (
    <div className="layout">
      <aside className="rail rail-left" aria-label="Project brief">
        <section className="card">
          <p className="eyebrow">Project</p>
          <h2 className="project-title">Eastvale Branch Library</h2>
          <p className="muted small">
            Opens January 2027. Twelve works from city holdings for the reading room, the children’s area and the
            entry atrium.
          </p>
          <div className="review-box">
            <div>
              <span className="muted small">Director’s review</span>
              <strong>{fmtLongDate(REVIEW_DATE)}</strong>
            </div>
            <span className={`countdown ${days <= 7 ? 'countdown-near' : ''}`}>
              {days} day{days === 1 ? '' : 's'}
            </span>
          </div>
        </section>

        <section className="card">
          <h3>Director’s requirements</h3>
          <Requirement
            label="Works proposed"
            value={`${summary.filled} of ${PROPOSAL_SIZE}`}
            fraction={summary.filled / PROPOSAL_SIZE}
            done={summary.complete}
            note={summary.complete ? 'Full' : `${summary.open} slot${summary.open === 1 ? '' : 's'} open`}
          />
          <Requirement
            label="By Eastvale-area artists"
            value={`${summary.eastvaleCount} of ${EASTVALE_MIN} minimum`}
            fraction={Math.min(1, summary.eastvaleCount / EASTVALE_MIN)}
            done={summary.eastvaleShort === 0}
            note={summary.eastvaleShort === 0 ? 'Met' : `${summary.eastvaleShort} more needed`}
          />
        </section>

        <section className="card">
          <h3>Spaces</h3>
          {SPACES.map((space) => {
            const proposed = state.proposal.filter((p) => p.space === space.id).length;
            const stat = pool.perSpace[space.id];
            return (
              <div className="space-card" key={space.id}>
                <div className="space-head">
                  <strong>{space.name}</strong>
                  <span className="code code-ok">{space.code}</span>
                </div>
                <div className="muted small">{space.dimensionsLabel}</div>
                <ul className="rules">
                  {space.rules.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
                <div className="space-foot">
                  <span>
                    <strong>{fmtInt(stat.available)}</strong> available here
                    {stat.warnings > 0 && <span className="muted"> ({fmtInt(stat.warnings)} with warnings)</span>}
                  </span>
                  <span>
                    <strong>{proposed}</strong> proposed
                  </span>
                </div>
              </div>
            );
          })}
        </section>

        <section className="card">
          <h3>Register</h3>
          <dl className="funnel">
            <div>
              <dt>In the register</dt>
              <dd>{fmtInt(pool.register)}</dd>
            </div>
            <div>
              <dt>Available for display</dt>
              <dd>{fmtInt(pool.available)}</dd>
              <p className="muted tiny">
                Excludes works on hold for the Civic Center renovation, works committed elsewhere past{' '}
                {fmtDate(FREE_BY)}, and works needing treatment.
              </p>
            </div>
            <div>
              <dt>Eastvale-area artists among them</dt>
              <dd>{fmtInt(pool.eastvale)}</dd>
            </div>
          </dl>
        </section>
      </aside>

      <Candidates ctx={ctx} />

      <aside className="rail rail-right" aria-label="Proposal">
        <ProposalRail ctx={ctx} />
      </aside>
    </div>
  );
}

function Requirement({
  label,
  value,
  fraction,
  done,
  note,
}: {
  label: string;
  value: string;
  fraction: number;
  done: boolean;
  note: string;
}) {
  return (
    <div className="requirement">
      <div className="requirement-row">
        <span>{label}</span>
        <strong className={done ? 'text-ok' : ''}>{value}</strong>
      </div>
      <div className="bar" role="presentation">
        <span className={done ? 'bar-ok' : 'bar-fill'} style={{ width: `${Math.round(fraction * 100)}%` }} />
      </div>
      <div className={`tiny ${done ? 'text-ok' : 'text-warn'}`}>{note}</div>
    </div>
  );
}

// ---------- candidates ----------

function Candidates({ ctx }: { ctx: AppCtx }) {
  const { state, assessments, actions, summary } = ctx;
  const [query, setQuery] = useState('');
  const [space, setSpace] = useState<'any' | SpaceId>('any');
  const [medium, setMedium] = useState<'any' | Medium>('any');
  const [condition, setCondition] = useState<'good' | 'any'>('good');
  const [eastvaleOnly, setEastvaleOnly] = useState(false);
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>('eastvale');
  const [limit, setLimit] = useState(PAGE_SIZE);

  const shortlistSet = useMemo(() => new Set(state.shortlist), [state.shortlist]);
  const full = summary.filled >= PROPOSAL_SIZE;

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const list = WORKS.filter((w) => {
      const a = assessments.get(w.accession);
      if (!a) return false;
      if (shortlistOnly) {
        if (!shortlistSet.has(w.accession)) return false;
      } else if (!a.inPool) {
        return false;
      }
      if (space !== 'any' && !a.eligibleSpaces.includes(space)) return false;
      if (medium !== 'any' && w.medium !== medium) return false;
      if (condition === 'good' && CONDITION_RANK[w.condition] > 1) return false;
      if (eastvaleOnly && !w.eastvaleArtist) return false;
      if (needle && !`${w.title} ${w.artist} ${w.accession}`.toLowerCase().includes(needle)) return false;
      return true;
    });
    list.sort(SORTERS[sort]);
    return list;
  }, [query, space, medium, condition, eastvaleOnly, shortlistOnly, sort, assessments, shortlistSet]);

  const visible = rows.slice(0, limit);

  return (
    <main className="candidates" aria-label="Candidate works">
      <header className="panel-head">
        <div>
          <h2>Candidates</h2>
          <p className="muted small">
            {fmtInt(rows.length)} works match
            {shortlistOnly ? ' in your shortlist' : ' and are available for at least one space'}.
            {' '}
            {fmtInt(state.shortlist.length)} shortlisted.
          </p>
          <div className="legend">
            <span className="code code-ok">RR</span> Reading Room
            <span className="code code-ok">CA</span> Children’s Area
            <span className="code code-ok">EA</span> Entry Atrium
            <span className="legend-note">
              <span className="dot dot-ok" /> eligible <span className="dot dot-warn" /> with warnings
              <span className="dot dot-muted" /> not eligible
            </span>
          </div>
        </div>
      </header>

      <div className="filters">
        <input
          type="search"
          placeholder="Search title, artist or accession"
          aria-label="Search candidates"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE_SIZE);
          }}
        />
        <select aria-label="Space" value={space} onChange={(e) => setSpace(e.target.value as 'any' | SpaceId)}>
          <option value="any">Any space</option>
          {SPACES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select aria-label="Medium" value={medium} onChange={(e) => setMedium(e.target.value as 'any' | Medium)}>
          <option value="any">All media</option>
          {MEDIUM_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label="Condition"
          value={condition}
          onChange={(e) => setCondition(e.target.value as 'good' | 'any')}
        >
          <option value="good">Good or better</option>
          <option value="any">Any condition</option>
        </select>
        <select aria-label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              Sort: {SORT_LABELS[k]}
            </option>
          ))}
        </select>
        <label className="check">
          <input type="checkbox" checked={eastvaleOnly} onChange={(e) => setEastvaleOnly(e.target.checked)} />
          Eastvale artists
        </label>
        <label className="check">
          <input type="checkbox" checked={shortlistOnly} onChange={(e) => setShortlistOnly(e.target.checked)} />
          Shortlisted
        </label>
      </div>

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th className="col-star" aria-label="Shortlist" />
              <th>Work</th>
              <th>Artist</th>
              <th className="num">Size (cm)</th>
              <th>Condition</th>
              <th className="num">Light</th>
              <th>Spaces</th>
              <th aria-label="Action" />
            </tr>
          </thead>
          <tbody>
            {visible.map((w) => {
              const a = assessments.get(w.accession)!;
              const slot = slotLabel(state, w.accession);
              const shortlisted = shortlistSet.has(w.accession);
              const stale = isStale(w);
              return (
                <tr key={w.accession} onClick={() => actions.open(w.accession)} className={a.blocked ? 'row-blocked' : ''}>
                  <td className="col-star">
                    <button
                      type="button"
                      className={`star ${shortlisted ? 'star-on' : ''}`}
                      aria-pressed={shortlisted}
                      aria-label={shortlisted ? `Remove ${w.title} from shortlist` : `Add ${w.title} to shortlist`}
                      title={shortlisted ? 'Shortlisted' : 'Add to shortlist'}
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.toggleShortlist(w.accession);
                      }}
                    >
                      {shortlisted ? '★' : '☆'}
                    </button>
                  </td>
                  <td>
                    <div className="work-title">{w.title}</div>
                    <div className="muted tiny">
                      {w.accession} · {w.year} · {w.medium}
                    </div>
                    {a.blocked && (
                      <div className="tiny text-block">{a.globalReasons.find((r) => r.level === 'block')?.text}</div>
                    )}
                  </td>
                  <td>
                    <div>{w.artist}</div>
                    <div className="tiny muted">
                      {w.eastvaleArtist ? <Chip tone="accent">Eastvale</Chip> : w.artistNeighborhood}
                    </div>
                  </td>
                  <td className="num">{sizeText(w)}</td>
                  <td>
                    <ConditionLabel condition={w.condition} />
                    <div className={`tiny ${stale ? 'text-warn' : 'muted'}`}>
                      checked {fmtDate(w.conditionDate)}
                    </div>
                  </td>
                  <td className="num">{w.lightClass}</td>
                  <td>
                    <SpaceCodes a={a} />
                  </td>
                  <td className="action-cell">
                    {slot !== null ? (
                      <Chip tone="accent">Slot {slot}</Chip>
                    ) : a.blocked ? (
                      <span className="tiny muted">Unavailable</span>
                    ) : a.eligibleSpaces.length === 0 ? (
                      <span className="tiny muted">No space</span>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-small"
                        disabled={full}
                        title={full ? 'Proposal is full' : 'Propose for the best available space'}
                        onClick={(e) => {
                          e.stopPropagation();
                          actions.propose(w.accession);
                        }}
                      >
                        Propose
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={8} className="empty">
                  No works match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {rows.length > visible.length && (
          <div className="more">
            <span className="muted small">
              Showing {fmtInt(visible.length)} of {fmtInt(rows.length)}
            </span>
            <button type="button" className="btn btn-quiet" onClick={() => setLimit((l) => l + PAGE_SIZE)}>
              Show {fmtInt(Math.min(PAGE_SIZE, rows.length - visible.length))} more
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- proposal ----------

function ProposalRail({ ctx }: { ctx: AppCtx }) {
  const { state, summary, actions } = ctx;
  const blocking = summary.blockingRows;
  const warnings = summary.warningRows;

  const exportCsv = () => {
    const rows = proposalCsvRows(ctx);
    downloadText(`eastvale-branch-library-proposal-${localDateStamp()}.csv`, toCsv(rows), 'text/csv');
    actions.notify(`Exported ${rows.length} proposed work${rows.length === 1 ? '' : 's'} to CSV.`);
  };

  const reset = () => {
    if (window.confirm('Reset the Eastvale proposal and shortlist to the saved starting state? Your current changes will be lost.')) {
      actions.reset();
    }
  };

  return (
    <>
      <header className="panel-head">
        <div>
          <h2>Proposal</h2>
          <p className="muted small">
            {summary.filled} of {PROPOSAL_SIZE} works placed
            {summary.ready && <span className="text-ok"> · ready for review</span>}
          </p>
        </div>
        <Chip tone={blocking > 0 ? 'block' : warnings > 0 ? 'warn' : 'ok'}>
          {blocking > 0 ? `${blocking} blocking` : warnings > 0 ? `${warnings} with warnings` : 'No issues'}
        </Chip>
      </header>

      <div className="proposal-checks">
        <div className="check-line">
          <span className={summary.eastvaleShort === 0 ? 'mark-ok' : 'mark-block'}>
            {summary.eastvaleShort === 0 ? '✓' : '✕'}
          </span>
          <span>
            Eastvale-area artists: <strong>{summary.eastvaleCount}</strong> of {EASTVALE_MIN} required
            {summary.eastvaleShort > 0 && <span className="text-warn"> ({summary.eastvaleShort} more)</span>}
          </span>
        </div>
        <div className="check-line">
          <span className={summary.open === 0 ? 'mark-ok' : 'mark-muted'}>{summary.open === 0 ? '✓' : '·'}</span>
          <span>
            Open slots: <strong>{summary.open}</strong>
          </span>
        </div>
      </div>

      <div className="walls">
        <div className="walls-title">Wall lengths used (cm)</div>
        {SPACES.flatMap((space) =>
          space.walls.map((wall) => {
            const usage = summary.walls.find((u) => u.spaceId === space.id && u.wallId === wall.id);
            const used = usage?.usedCm ?? 0;
            const over = used > wall.lengthCm;
            const pct = Math.min(100, Math.round((used / wall.lengthCm) * 100));
            return (
              <div className="wall-row" key={`${space.id}-${wall.id}`}>
                <span className="wall-label">
                  <span className="code code-ok">{space.code}</span> {wall.label}
                </span>
                <span className="bar bar-small" role="presentation">
                  <span className={over ? 'bar-block' : 'bar-fill'} style={{ width: `${pct}%` }} />
                </span>
                <span className={`tiny wall-num ${over ? 'text-block' : 'muted'}`}>
                  {used}/{wall.lengthCm}
                </span>
              </div>
            );
          }),
        )}
      </div>

      <ol className="slots">
        {Array.from({ length: PROPOSAL_SIZE }, (_, i) => {
          const item: ProposalItem | undefined = state.proposal[i];
          const row = item ? summary.rows.find((r) => r.item.accession === item.accession) : undefined;
          return <SlotRow key={i} n={i + 1} item={item} row={row ?? null} actions={actions} />;
        })}
      </ol>

      <footer className="proposal-foot">
        <button type="button" className="btn" onClick={exportCsv} disabled={summary.filled === 0}>
          Export CSV
        </button>
        <button type="button" className="btn" onClick={() => window.print()} disabled={summary.filled === 0}>
          Print
        </button>
        <button type="button" className="btn btn-quiet" onClick={reset}>
          Reset
        </button>
      </footer>
    </>
  );
}

function SlotRow({
  n,
  item,
  row,
  actions,
}: {
  n: number;
  item: ProposalItem | undefined;
  row: { work: Work | null; reasons: { level: 'block' | 'warn'; text: string }[] } | null;
  actions: AppCtx['actions'];
}) {
  if (!item || !row) {
    return (
      <li className="slot slot-empty">
        <span className="slot-no">{n}</span>
        <span className="muted small">Open. Add a work from the candidate list.</span>
      </li>
    );
  }
  const w = row.work;
  const hasBlock = row.reasons.some((r) => r.level === 'block');
  const hasWarn = row.reasons.some((r) => r.level === 'warn');
  const spaceDef = SPACE_BY_ID[item.space];
  return (
    <li className={`slot ${hasBlock ? 'slot-block' : hasWarn ? 'slot-warn' : 'slot-ok'}`}>
      <div className="slot-top">
        <span className="slot-no">{n}</span>
        <button type="button" className="slot-title" onClick={() => actions.open(item.accession)}>
          {w?.title ?? item.accession}
        </button>
        {w?.eastvaleArtist && <Chip tone="accent">Eastvale</Chip>}
        <button
          type="button"
          className="icon-btn"
          aria-label={`Remove slot ${n} from proposal`}
          onClick={() => actions.unpropose(item.accession)}
        >
          ×
        </button>
      </div>
      {w && (
        <div className="muted tiny slot-meta">
          {w.artist} · {w.accession} · {w.medium} · {sizeText(w)} cm
        </div>
      )}
      <div className="slot-controls">
        <select
          aria-label={`Space for slot ${n}`}
          value={item.space}
          onChange={(e) => actions.changeSlot(item.accession, { space: e.target.value as SpaceId })}
        >
          {SPACES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select
          aria-label={`Wall for slot ${n}`}
          value={item.wallId}
          onChange={(e) => actions.changeSlot(item.accession, { wallId: e.target.value })}
        >
          {spaceDef.walls.map((wall) => (
            <option key={wall.id} value={wall.id}>
              {wall.label}
            </option>
          ))}
        </select>
      </div>
      <ReasonList reasons={row.reasons} />
    </li>
  );
}
