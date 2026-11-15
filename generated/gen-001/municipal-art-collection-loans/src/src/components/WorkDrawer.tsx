import { useEffect, useState } from 'react';
import { WORKS_BY_ACCESSION } from '../data/collection';
import { FREE_BY, HEIGHT_MARGIN, PROPOSAL_SIZE, SPACES, SPACE_BY_ID, WALL_END_MARGIN } from '../lib/constants';
import { fmtDate, fmtDims, fmtKg, fmtLongDate } from '../lib/format';
import type { SpaceId } from '../types';
import {
  type AppCtx,
  Chip,
  ConditionLabel,
  LoanChip,
  ReasonList,
  SpaceStatusLine,
  isStale,
  slotLabel,
} from './common';

export function WorkDrawer({ ctx, accession, onClose }: { ctx: AppCtx; accession: string; onClose: () => void }) {
  const work = WORKS_BY_ACCESSION.get(accession);
  const a = ctx.assessments.get(accession);
  const { state, summary, actions } = ctx;
  const slot = slotLabel(state, accession);
  const shortlisted = state.shortlist.includes(accession);
  const suggested = a && a.eligibleSpaces.length > 0 ? a.eligibleSpaces.slice().sort((x, y) => rank(a, x) - rank(a, y))[0] : null;
  const [pick, setPick] = useState<SpaceId | null>(suggested);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!work || !a) return null;
  const c = work.loan.commitment;
  const blockedBy = a.globalReasons.find((r) => r.level === 'block');
  const full = summary.filled >= PROPOSAL_SIZE;
  const canPropose = !a.blocked && a.eligibleSpaces.length > 0 && slot === null;
  const chosen = pick && a.eligibleSpaces.includes(pick) ? pick : suggested;

  return (
    <div className="drawer-scrim" onMouseDown={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={`Details for ${work.title}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="drawer-head">
          <div>
            <p className="eyebrow mono">{work.accession}</p>
            <h2>{work.title}</h2>
            <p className="muted">
              {work.artist}, {work.year}
              {work.eastvaleArtist && (
                <>
                  {' '}
                  <Chip tone="accent">Eastvale artist</Chip>
                </>
              )}
            </p>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close details">
            ×
          </button>
        </header>

        <div className="drawer-body">
          <section className="drawer-section">
            <div className="chip-row">
              <LoanChip status={work.loan.status} />
              <ConditionLabel condition={work.condition} />
              {slot !== null && <Chip tone="accent">Proposal slot {slot}</Chip>}
              {shortlisted && <Chip tone="muted">Shortlisted</Chip>}
            </div>

            <div className="action-row">
              <button
                type="button"
                className={`btn ${shortlisted ? '' : 'btn-primary'}`}
                onClick={() => actions.toggleShortlist(accession)}
              >
                {shortlisted ? '★ Shortlisted: remove' : '☆ Add to shortlist'}
              </button>
              {slot !== null ? (
                <button type="button" className="btn btn-quiet" onClick={() => actions.unpropose(accession)}>
                  Remove from proposal
                </button>
              ) : canPropose ? (
                <div className="propose-box">
                  <select
                    aria-label="Space to propose into"
                    value={chosen ?? ''}
                    onChange={(e) => setPick(e.target.value as SpaceId)}
                  >
                    {a.eligibleSpaces.map((id) => (
                      <option key={id} value={id}>
                        {SPACE_BY_ID[id].name}
                        {a.spaces[id].status === 'warning' ? ' (with warnings)' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={full || !chosen}
                    title={full ? 'Proposal is full' : undefined}
                    onClick={() => chosen && actions.propose(accession, chosen)}
                  >
                    Propose
                  </button>
                </div>
              ) : (
                <span className="tiny text-block">
                  {blockedBy ? `Cannot be proposed: ${blockedBy.text}` : 'Cannot be proposed: no space fits it'}
                </span>
              )}
            </div>
          </section>

          <section className="drawer-section">
            <h3>Fit for each space</h3>
            {SPACES.map((space) => {
              const sa = a.spaces[space.id];
              const wall = sa.wallId ? space.walls.find((w) => w.id === sa.wallId) : null;
              const fitLines: string[] = [];
              if (wall) {
                fitLines.push(
                  `${wall.label}: ${work.dimsCm.w} cm + ${2 * WALL_END_MARGIN} cm end clearance = ${work.dimsCm.w + 2 * WALL_END_MARGIN} of ${wall.lengthCm} cm wide`,
                );
                fitLines.push(
                  wall.heightCm === null
                    ? `Height ${work.dimsCm.h} cm: wall height not supplied, cannot verify`
                    : `Height: ${work.dimsCm.h} cm + ${HEIGHT_MARGIN} cm clearance = ${work.dimsCm.h + HEIGHT_MARGIN} of ${wall.heightCm} cm`,
                );
              } else {
                const longest = Math.max(...space.walls.map((w) => w.lengthCm));
                fitLines.push(`Does not fit: needs ${work.dimsCm.w + 2 * WALL_END_MARGIN} cm of wall; longest is ${longest} cm`);
              }
              return (
                <div className="fit-card" key={space.id}>
                  <div className="fit-head">
                    <strong>{space.name}</strong>
                    <SpaceStatusLine sa={sa} blocked={a.blocked} />
                  </div>
                  <ReasonList reasons={sa.reasons} />
                  <ul className="fit-lines">
                    {fitLines.map((l) => (
                      <li key={l}>{l}</li>
                    ))}
                  </ul>
                </div>
              );
            })}
            {a.globalReasons.length > 0 && (
              <div className="fit-card">
                <div className="fit-head">
                  <strong>Availability</strong>
                </div>
                <ReasonList reasons={a.globalReasons} />
              </div>
            )}
          </section>

          <section className="drawer-section">
            <h3>Loans and commitments</h3>
            {c ? (
              <div className="commit">
                <div>
                  <strong>{c.venue}</strong>
                  <span className="muted"> · {work.loan.status}</span>
                </div>
                <div className="small">
                  {fmtLongDate(c.from)} to {fmtLongDate(c.until)}
                </div>
                <p className="muted small">{c.note}</p>
                {c.until >= FREE_BY ? (
                  <p className="text-block small">
                    Conflicts with the January install: must be free by {fmtDate(FREE_BY)}.
                  </p>
                ) : (
                  <p className="text-ok small">Free before install ({fmtDate(FREE_BY)}); confirm return and condition.</p>
                )}
              </div>
            ) : (
              <p className="muted small">No loans or commitments on record.</p>
            )}
          </section>

          <section className="drawer-section">
            <h3>Record</h3>
            <dl className="facts">
              <dt>Medium</dt>
              <dd>{work.medium}</dd>
              <dt>Materials</dt>
              <dd>{work.materials}</dd>
              <dt>Year made</dt>
              <dd>{work.year}</dd>
              <dt>Acquired</dt>
              <dd>{work.acquired}</dd>
              <dt>Dimensions</dt>
              <dd>
                {fmtDims(work.dimsCm)} <span className="muted">(H × W{work.dimsCm.d !== null ? ' × D' : ''})</span>
              </dd>
              <dt>Weight</dt>
              <dd>{fmtKg(work.weightKg)}</dd>
              <dt>Light class</dt>
              <dd>{work.lightClass}</dd>
              <dt>Mounting</dt>
              <dd>{work.mounting}</dd>
              <dt>Fragile</dt>
              <dd>{work.fragile ? 'Yes' : 'No'}</dd>
              <dt>Condition</dt>
              <dd>
                {work.condition}
                <span className={isStale(work) ? 'text-warn' : 'muted'}>
                  {' '}
                  · last assessed {fmtDate(work.conditionDate)}
                </span>
              </dd>
              <dt>Location</dt>
              <dd>{work.location}</dd>
              <dt>Artist’s neighborhood</dt>
              <dd>{work.artistNeighborhood}</dd>
              <dt>Image rights</dt>
              <dd>{work.imageRights}</dd>
            </dl>
          </section>
        </div>
      </aside>
    </div>
  );
}

function rank(a: { spaces: Record<SpaceId, { status: string }> }, id: SpaceId): number {
  return a.spaces[id].status === 'eligible' ? 0 : 1;
}
