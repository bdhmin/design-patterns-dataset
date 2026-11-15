import { useMemo, useState } from 'react';
import { CONDITIONS, LOCATIONS, MEDIUMS, WORKS } from '../data/collection';
import { CONDITION_RANK } from '../lib/constants';
import { downloadText, fmtDate, fmtInt, fmtKg, localDateStamp, toCsv } from '../lib/format';
import type { Condition, LoanStatus, Medium, Mounting, Work } from '../types';
import { type AppCtx, Chip, ConditionLabel, LoanChip, commitmentText, isStale, sizeText } from '../components/common';

type ColKey = 'accession' | 'title' | 'artist' | 'year' | 'condition' | 'status';
const PAGE_SIZE = 50;
const LOAN_STATUSES: LoanStatus[] = ['Available', 'On loan', 'Promised', 'On hold'];

function toggled<T>(set: Set<T>, value: T): Set<T> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

function sortValue(w: Work, key: ColKey): string | number {
  switch (key) {
    case 'accession':
      return w.accession;
    case 'title':
      return w.title;
    case 'artist':
      return w.artist;
    case 'year':
      return w.year;
    case 'condition':
      return CONDITION_RANK[w.condition];
    case 'status':
      return w.loan.status;
  }
}

export function CollectionView({ ctx }: { ctx: AppCtx }) {
  const { assessments, actions } = ctx;
  const [query, setQuery] = useState('');
  const [mediums, setMediums] = useState<Set<Medium>>(new Set());
  const [conditions, setConditions] = useState<Set<Condition>>(new Set());
  const [statuses, setStatuses] = useState<Set<LoanStatus>>(new Set());
  const [lights, setLights] = useState<Set<1 | 2 | 3>>(new Set());
  const [mounting, setMounting] = useState<'any' | Mounting>('any');
  const [location, setLocation] = useState('any');
  const [eastvaleOnly, setEastvaleOnly] = useState(false);
  const [sort, setSort] = useState<{ key: ColKey; dir: 1 | -1 }>({ key: 'accession', dir: 1 });
  const [page, setPage] = useState(0);

  const counts = useMemo(() => {
    const medium = new Map<string, number>();
    const cond = new Map<string, number>();
    for (const w of WORKS) {
      medium.set(w.medium, (medium.get(w.medium) ?? 0) + 1);
      cond.set(w.condition, (cond.get(w.condition) ?? 0) + 1);
    }
    return { medium, cond };
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = WORKS.filter((w) => {
      if (needle && !`${w.title} ${w.artist} ${w.accession} ${w.materials}`.toLowerCase().includes(needle)) return false;
      if (mediums.size && !mediums.has(w.medium)) return false;
      if (conditions.size && !conditions.has(w.condition)) return false;
      if (statuses.size && !statuses.has(w.loan.status)) return false;
      if (lights.size && !lights.has(w.lightClass)) return false;
      if (mounting !== 'any' && w.mounting !== mounting) return false;
      if (location !== 'any' && w.location !== location) return false;
      if (eastvaleOnly && !w.eastvaleArtist) return false;
      return true;
    });
    filtered.sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);
      const cmp = typeof av === 'number' && typeof bv === 'number' ? av - bv : String(av).localeCompare(String(bv));
      return cmp * sort.dir || a.accession.localeCompare(b.accession);
    });
    return filtered;
  }, [query, mediums, conditions, statuses, lights, mounting, location, eastvaleOnly, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const visible = rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const clearFilters = () => {
    setQuery('');
    setMediums(new Set());
    setConditions(new Set());
    setStatuses(new Set());
    setLights(new Set());
    setMounting('any');
    setLocation('any');
    setEastvaleOnly(false);
    setPage(0);
  };

  const setSortKey = (key: ColKey) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: 1 }));
    setPage(0);
  };

  const exportCsv = () => {
    const data = rows.map((w) => ({
      accession: w.accession,
      title: w.title,
      artist: w.artist,
      artist_neighborhood: w.artistNeighborhood,
      eastvale_artist: w.eastvaleArtist ? 'yes' : 'no',
      medium: w.medium,
      materials: w.materials,
      year_made: w.year,
      acquired: w.acquired,
      height_cm: w.dimsCm.h,
      width_cm: w.dimsCm.w,
      depth_cm: w.dimsCm.d ?? '',
      weight_kg: w.weightKg,
      light_class: w.lightClass,
      mounting: w.mounting,
      fragile: w.fragile ? 'yes' : 'no',
      condition: w.condition,
      condition_last_assessed: w.conditionDate,
      location: w.location,
      loan_status: w.loan.status,
      commitment: commitmentText(w) ?? '',
      image_rights: w.imageRights,
    }));
    downloadText(`civic-holdings-register-${localDateStamp()}.csv`, toCsv(data), 'text/csv');
    actions.notify(`Exported ${fmtInt(data.length)} works to CSV.`);
  };

  const sortMark = (key: ColKey) => (sort.key === key ? (sort.dir === 1 ? ' ▲' : ' ▼') : '');

  return (
    <div className="layout layout-collection">
      <aside className="rail rail-filters" aria-label="Register filters">
        <div className="filters-head">
          <h2>Filter register</h2>
          <button type="button" className="btn btn-quiet btn-small" onClick={clearFilters}>
            Clear
          </button>
        </div>

        <label className="field">
          <span>Search</span>
          <input
            type="search"
            placeholder="Title, artist, accession"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
        </label>

        <fieldset>
          <legend>Medium</legend>
          {MEDIUMS.map((m) => (
            <label className="check" key={m}>
              <input
                type="checkbox"
                checked={mediums.has(m)}
                onChange={() => {
                  setMediums((s) => toggled(s, m));
                  setPage(0);
                }}
              />
              {m}
              <span className="count">{fmtInt(counts.medium.get(m) ?? 0)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Condition</legend>
          {CONDITIONS.map((c) => (
            <label className="check" key={c}>
              <input
                type="checkbox"
                checked={conditions.has(c)}
                onChange={() => {
                  setConditions((s) => toggled(s, c));
                  setPage(0);
                }}
              />
              {c}
              <span className="count">{fmtInt(counts.cond.get(c) ?? 0)}</span>
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Loan status</legend>
          {LOAN_STATUSES.map((s) => (
            <label className="check" key={s}>
              <input
                type="checkbox"
                checked={statuses.has(s)}
                onChange={() => {
                  setStatuses((set) => toggled(set, s));
                  setPage(0);
                }}
              />
              {s}
            </label>
          ))}
        </fieldset>

        <fieldset>
          <legend>Light-sensitivity class</legend>
          {([1, 2, 3] as const).map((n) => (
            <label className="check" key={n}>
              <input
                type="checkbox"
                checked={lights.has(n)}
                onChange={() => {
                  setLights((s) => toggled(s, n));
                  setPage(0);
                }}
              />
              Class {n}
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span>Mounting</span>
          <select
            value={mounting}
            onChange={(e) => {
              setMounting(e.target.value as 'any' | Mounting);
              setPage(0);
            }}
          >
            <option value="any">Any</option>
            <option value="Wall-hung">Wall-hung</option>
            <option value="Free-standing">Free-standing</option>
          </select>
        </label>

        <label className="field">
          <span>Current location</span>
          <select
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setPage(0);
            }}
          >
            <option value="any">All locations</option>
            {LOCATIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>

        <label className="check">
          <input
            type="checkbox"
            checked={eastvaleOnly}
            onChange={(e) => {
              setEastvaleOnly(e.target.checked);
              setPage(0);
            }}
          />
          Eastvale artists only
        </label>
      </aside>

      <main className="candidates" aria-label="Collection register">
        <header className="panel-head">
          <div>
            <h2>Collection register</h2>
            <p className="muted small">
              {fmtInt(rows.length)} of {fmtInt(WORKS.length)} works match. Click a row for the full record.
            </p>
          </div>
          <button type="button" className="btn" onClick={exportCsv} disabled={rows.length === 0}>
            Export CSV
          </button>
        </header>

        <div className="table-wrap">
          <table className="grid grid-register">
            <thead>
              <tr>
                <SortTh label="Accession" k="accession" onSort={setSortKey} mark={sortMark('accession')} />
                <SortTh label="Title" k="title" onSort={setSortKey} mark={sortMark('title')} />
                <SortTh label="Artist" k="artist" onSort={setSortKey} mark={sortMark('artist')} />
                <SortTh label="Year" k="year" onSort={setSortKey} mark={sortMark('year')} className="num" />
                <th>Medium</th>
                <th className="num">Size (cm)</th>
                <th className="num">kg</th>
                <SortTh label="Condition" k="condition" onSort={setSortKey} mark={sortMark('condition')} />
                <th className="num">Light</th>
                <th>Location</th>
                <SortTh label="Status" k="status" onSort={setSortKey} mark={sortMark('status')} />
              </tr>
            </thead>
            <tbody>
              {visible.map((w) => {
                const stale = isStale(w);
                const a = assessments.get(w.accession);
                return (
                  <tr key={w.accession} onClick={() => actions.open(w.accession)}>
                    <td className="mono tiny">{w.accession}</td>
                    <td>
                      <div className="work-title">{w.title}</div>
                      {w.eastvaleArtist && <Chip tone="accent">Eastvale artist</Chip>}
                    </td>
                    <td>{w.artist}</td>
                    <td className="num">{w.year}</td>
                    <td>{w.medium}</td>
                    <td className="num">{sizeText(w)}</td>
                    <td className="num">{fmtKg(w.weightKg)}</td>
                    <td>
                      <ConditionLabel condition={w.condition} />
                      <div className={`tiny ${stale ? 'text-warn' : 'muted'}`}>{fmtDate(w.conditionDate)}</div>
                    </td>
                    <td className="num">{w.lightClass}</td>
                    <td className="tiny">{w.location}</td>
                    <td>
                      <LoanChip status={w.loan.status} />
                      {a && a.blocked && w.loan.status !== 'Available' && (
                        <div className="tiny muted">{w.loan.commitment?.venue}</div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={11} className="empty">
                    No works match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="pager">
          <button
            type="button"
            className="btn btn-quiet"
            disabled={currentPage === 0}
            onClick={() => setPage(currentPage - 1)}
          >
            ← Previous
          </button>
          <span className="muted small">
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-quiet"
            disabled={currentPage >= pageCount - 1}
            onClick={() => setPage(currentPage + 1)}
          >
            Next →
          </button>
        </footer>
      </main>
    </div>
  );
}

function SortTh({
  label,
  k,
  onSort,
  mark,
  className,
}: {
  label: string;
  k: ColKey;
  onSort: (k: ColKey) => void;
  mark: string;
  className?: string;
}) {
  return (
    <th className={className}>
      <button type="button" className="th-sort" onClick={() => onSort(k)}>
        {label}
        {mark}
      </button>
    </th>
  );
}
