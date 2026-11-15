import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { articles, glossary, grant, onboardingSteps, people, recentActivity, sections, termById, user, NOW_BASE, type SectionId } from './data';
import { HelpCtx, T, useHelp as useHelpSafe, type HelpApi } from './help';
import { computeCalc, LinesSection, ComplianceSection, JustificationSection, DocumentsSection, ReviewSection, type Doc, type Just } from './Request';
import { Rail, type RailTab, type Ticket } from './Rail';
import { fmtDay, fmtTime, money, now, pct } from './util';
import * as Ic from './icons';

type Pop = { id: string; x: number; y: number; above: boolean; extra?: { title: string; text: string } };

export default function App() {
  // ---------------------------------------------------------------- request state
  const [fromNo, setFromNo] = useState(4);
  const [toNo, setToNo] = useState(6);
  const [amountStr, setAmountStr] = useState('85000');
  const [ack, setAck] = useState(false);
  const [just, setJust] = useState<Just>({ underspend: '', need: '', impact: '' });
  const [docs, setDocs] = useState<Doc[]>([]);
  const [note, setNote] = useState('');
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [saved, setSaved] = useState<{ at: Date; saving: boolean }>({ at: NOW_BASE, saving: false });
  const [confirm, setConfirm] = useState(false);
  const [welcome, setWelcome] = useState(true);

  const calc = useMemo(() => computeCalc(fromNo, toNo, amountStr, ack, just, docs), [fromNo, toNo, amountStr, ack, just, docs]);
  const locked = !!submittedAt;

  // autosave indicator
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    setSaved((s) => ({ ...s, saving: true }));
    const t = setTimeout(() => setSaved({ at: now(), saving: false }), 700);
    return () => clearTimeout(t);
  }, [fromNo, toNo, amountStr, ack, just, docs, note]);

  // ---------------------------------------------------------------- help state
  const [tab, setTab] = useState<RailTab>('guide');
  const [termId, setTermId] = useState<string | null>(null);
  const [articleTitle, setArticleTitle] = useState<string | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [helpSubject, setHelpSubject] = useState('');
  const [helpNonce, setHelpNonce] = useState(0);
  const [active, setActive] = useState<SectionId>('lines');
  const pinActive = useRef(0);

  const help: HelpApi = useMemo(() => ({
    openTerm: (id, el, extra) => {
      const r = el.getBoundingClientRect();
      const above = r.bottom + 260 > window.innerHeight;
      setPop({ id, extra, x: Math.min(Math.max(12, r.left - 8), window.innerWidth - 372), y: above ? r.top - 8 : r.bottom + 8, above });
    },
    openGlossary: (id) => { setTab('glossary'); setTermId(id ?? null); setPop(null); },
    openArticle: (title) => { setTab('articles'); setArticleTitle(title); setPop(null); },
    openHelpdesk: (subject) => { setTab('helpdesk'); setHelpSubject(subject ?? ''); setHelpNonce((n) => n + 1); setPop(null); },
  }), []);

  useEffect(() => {
    if (!pop) return;
    const opened = Date.now();
    const close = () => setPop(null);
    const onScroll = () => { if (Date.now() - opened > 250) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    const onDown = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.popover')) close(); };
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => { window.removeEventListener('scroll', onScroll, true); window.removeEventListener('keydown', onKey); window.removeEventListener('mousedown', onDown); };
  }, [pop]);

  // ---------------------------------------------------------------- active section tracking
  useEffect(() => {
    const onScroll = () => {
      if (Date.now() - pinActive.current < 900) return;
      let cur: SectionId = 'lines';
      for (const s of sections) {
        const el = document.getElementById(`sec-${s.id}`);
        if (el && el.getBoundingClientRect().top < window.innerHeight * 0.42) cur = s.id;
      }
      if (window.innerHeight + window.scrollY >= document.body.scrollHeight - 4) cur = 'review';
      setActive(cur);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goTo = useCallback((id: SectionId) => {
    pinActive.current = Date.now();
    setActive(id);
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const explain = useCallback((id: SectionId) => { setActive(id); pinActive.current = Date.now(); setTab('guide'); }, []);

  const sectionDone: Record<SectionId, boolean> = {
    lines: calc.linesDone,
    compliance: ack && !calc.error,
    justification: calc.justDone,
    documents: calc.docsDone && !calc.error,
    review: !!submittedAt,
  };
  const doneCount = Object.values(sectionDone).filter(Boolean).length;

  const submit = () => { setSubmittedAt(now()); setConfirm(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return (
    <HelpCtx.Provider value={help}>
      <Header submitted={!!submittedAt} openTab={setTab} />

      <div className="layout">
        {/* -------------------------------------------------------- left: request nav */}
        <aside className="leftnav" aria-label="Request steps">
          <div className="ln-block">
            <span className="eyebrow">This request · {doneCount} of 5 done</span>
            <div className="progress"><i style={{ width: `${(doneCount / 5) * 100}%` }} /></div>
            <ol className="steps">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <button type="button" className={`${active === s.id ? 'on' : ''} ${sectionDone[s.id] ? 'done' : ''}`} onClick={() => goTo(s.id)} aria-current={active === s.id ? 'step' : undefined}>
                    <span className="st-ic">{sectionDone[s.id] ? <Ic.Check size={12} /> : i + 1}</span>
                    <span>{s.label}</span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
          <div className="ln-block facts">
            <span className="eyebrow">This grant</span>
            <dl>
              <div><dt>Donor</dt><dd>{grant.donor}</dd></div>
              <div><dt>Award</dt><dd>{money(grant.total)}</dd></div>
              <div><dt>Period</dt><dd>{grant.start} – {grant.end}</dd></div>
              <div><dt><T id="budget-holder">Budget holder</T></dt><dd>{people.joseph.name}, Lodwar</dd></div>
              <div><dt>Donor threshold</dt><dd>10% of any line</dd></div>
            </dl>
          </div>
          <div className="ln-block">
            <span className="eyebrow">Your recent activity</span>
            <ul className="activity">
              {submittedAt && <li><time>{fmtTime(submittedAt)}</time><span>Sent RR-2026-047 to Peter Owino</span></li>}
              {recentActivity.map((a) => <li key={a.time}><time>{a.time}</time><span>{a.text}</span></li>)}
            </ul>
          </div>
        </aside>

        {/* -------------------------------------------------------- main */}
        <main className="main">
          <nav className="crumbs" aria-label="Breadcrumb">
            <a href="#top" onClick={(e) => e.preventDefault()}>Grants</a><Ic.ChevronRight size={12} />
            <a href="#top" onClick={(e) => e.preventDefault()}>{grant.code} · {grant.title}</a><Ic.ChevronRight size={12} />
            <a href="#top" onClick={(e) => e.preventDefault()}>Requests</a><Ic.ChevronRight size={12} />
            <span>RR-2026-047</span>
          </nav>
          <header className="req-head">
            <div>
              <h1>Budget reallocation request <span className="req-id">RR-2026-047</span></h1>
              <p className="req-meta">
                <T id="grant-code">{grant.code}</T> · {grant.title} · {grant.donor} · {grant.start} – {grant.end}
              </p>
            </div>
            <div className="req-status">
              {submittedAt ? <span className="chip info lg">With Grants Manager</span> : <span className="chip lg">Draft</span>}
              <span className="saved">{saved.saving ? 'Saving…' : <><Ic.Check size={12} /> {submittedAt ? `Sent ${fmtTime(submittedAt)}` : `Saved ${fmtTime(saved.at)}`}</>}</span>
            </div>
          </header>

          {welcome && !submittedAt && (
            <div className="welcome">
              <div className="welcome-ic"><Ic.Sparkle size={18} /></div>
              <div>
                <strong>You’re on onboarding step 3 of 7: your first reallocation request.</strong>
                <p>
                  You started this draft at 10:31 with the lines and amount Peter asked for. Anything with a <T id="reallocation">dotted underline</T> explains itself when clicked,
                  and the Guide on the right follows the step you’re on. Nothing is sent until you press <em>Send to Peter Owino</em> in step 5.
                </p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setWelcome(false)} aria-label="Dismiss"><Ic.X size={14} /></button>
            </div>
          )}

          {submittedAt && (
            <div className="sent-banner">
              <Ic.Send size={18} />
              <div>
                <strong>Sent to Peter Owino at {fmtTime(submittedAt)} – nothing more for you to do right now.</strong> He usually reviews within {people.peter.turnaround}; you’ll be notified if he approves it or returns it with comments.
                {calc.over && <> After Lucía Ferrer signs off, Peter sends it to Halvorsen.</>}
              </div>
              <button type="button" className="btn ghost sm" onClick={() => setSubmittedAt(null)}>Withdraw to edit</button>
            </div>
          )}

          <RouteCard calc={calc} submittedAt={submittedAt} />

          <LinesSection calc={calc} fromNo={fromNo} toNo={toNo} amountStr={amountStr} locked={locked}
            setFrom={(n) => { setFromNo(n); }} setTo={setToNo} setAmount={setAmountStr} onExplain={explain} goTo={goTo} />
          <ComplianceSection calc={calc} ack={ack} setAck={setAck} locked={locked} onExplain={explain} />
          <JustificationSection calc={calc} just={just} setJust={setJust} locked={locked} onExplain={explain} onFocus={() => { setActive('justification'); }} />
          <DocumentsSection calc={calc} docs={docs} setDocs={setDocs} locked={locked} onExplain={explain} budgetFile="Revised_budget_NRI-KE-2025-118_RR-2026-047.xlsx" />
          <ReviewSection calc={calc} note={note} setNote={setNote} submittedAt={submittedAt}
            onSubmit={() => setConfirm(true)} onWithdraw={() => setSubmittedAt(null)} onExplain={explain} goTo={goTo} />
          <footer className="foot muted small">Ledgerline 4.12 · Northbridge Relief International · Every change to this request is recorded in the <T id="audit-trail">audit trail</T>.</footer>
        </main>

        {/* -------------------------------------------------------- right rail */}
        <Rail tab={tab} setTab={(t) => { setTab(t); if (t !== 'glossary') setTermId(null); }}
          active={active} calc={calc} submitted={!!submittedAt}
          termId={termId} articleTitle={articleTitle} setArticle={setArticleTitle}
          tickets={tickets} addTicket={(t) => setTickets([t, ...tickets])}
          helpSubject={helpSubject} helpNonce={helpNonce} />
      </div>

      {pop && <TermPopover pop={pop} />}
      {confirm && <ConfirmModal calc={calc} onCancel={() => setConfirm(false)} onConfirm={submit} />}
    </HelpCtx.Provider>
  );

}

/* ======================================================================== Header */

function Header({ submitted, openTab }: { submitted: boolean; openTab: (t: RailTab) => void }) {
  const help = useHelpSafe();
  const [onb, setOnb] = useState(false);
  const [q, setQ] = useState('');
  const [focus, setFocus] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDown = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setOnb(false); setFocus(false); } };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOnb(false); setFocus(false); }
      if (e.key === '/' && !(e.target as HTMLElement).matches('input, textarea, select')) { e.preventDefault(); document.getElementById('global-search')?.focus(); }
    };
    window.addEventListener('mousedown', onDown); window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('mousedown', onDown); window.removeEventListener('keydown', onKey); };
  }, []);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const terms = glossary.filter((t) => t.term.toLowerCase().includes(s)).slice(0, 4).map((t) => ({ kind: 'Term', label: t.term, go: () => help.openGlossary(t.id) }));
    const arts = articles.filter((a) => a.title.toLowerCase().includes(s)).slice(0, 5).map((a) => ({ kind: 'Article', label: a.title, go: () => help.openArticle(a.title) }));
    const grants = `${grant.code} ${grant.title}`.toLowerCase().includes(s) ? [{ kind: 'Grant', label: `${grant.code} · ${grant.title}`, go: () => window.scrollTo({ top: 0, behavior: 'smooth' }) }] : [];
    return [...grants, ...terms, ...arts];
  }, [q, help]);

  const steps = onboardingSteps.map((s) => (s.id === 3 && submitted ? { ...s, when: 'Submitted – awaiting Peter’s review' } : s));
  const done = steps.filter((s) => s.status === 'done').length;

  return (
    <header className="topbar" ref={wrap}>
      <div className="brand">
        <span className="logo" aria-hidden="true"><svg viewBox="0 0 32 32" width="26" height="26"><rect width="32" height="32" rx="7" fill="#0e5a4f" /><path d="M9 8v16h14" stroke="#fff" strokeWidth="3" fill="none" /><path d="M14 18h9" stroke="#f2c46d" strokeWidth="3" /></svg></span>
        <span className="brand-name">Ledgerline</span>
      </div>
      <nav className="topnav" aria-label="Main">
        {['Home', 'Grants', 'Requests', 'Reporting calendar', 'Documents'].map((n) => (
          <a key={n} href="#top" className={n === 'Grants' ? 'on' : ''} onClick={(e) => e.preventDefault()}>{n}</a>
        ))}
      </nav>

      <div className="search">
        <Ic.Search size={14} />
        <input id="global-search" value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setFocus(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && results[0]) { results[0].go(); setQ(''); setFocus(false); } }}
          placeholder="Search grants, terms, help articles" aria-label="Search" />
        <kbd>/</kbd>
        {focus && q.trim().length >= 2 && (
          <ul className="search-results" role="listbox">
            {results.length ? results.map((r) => (
              <li key={r.kind + r.label}><button type="button" onClick={() => { r.go(); setQ(''); setFocus(false); }}><em>{r.kind}</em>{r.label}</button></li>
            )) : <li className="empty">Nothing found for “{q}”. <button type="button" className="link small" onClick={() => { help.openHelpdesk(q); setQ(''); setFocus(false); }}>Ask the helpdesk</button></li>}
          </ul>
        )}
      </div>

      <div className="top-right">
        <button type="button" className={`onb-pill ${onb ? 'on' : ''}`} onClick={() => setOnb(!onb)} aria-expanded={onb}>
          <span className="ring" style={{ ['--p' as string]: `${(done / 7) * 360}deg` }} />
          Onboarding <strong>{done} of 7</strong>
          <Ic.ChevronDown size={13} />
        </button>
        <button type="button" className="top-btn" onClick={() => openTab('guide')}><Ic.Help size={16} /> Help</button>
        <div className="me">
          <span className="avatar">{user.initials}</span>
          <div><strong>{user.name}</strong><span>{user.role} · Nairobi</span></div>
        </div>

        {onb && (
          <div className="onb-pop" role="dialog" aria-label="Your onboarding plan">
            <div className="onb-head">
              <div>
                <span className="eyebrow">Your onboarding plan · day {user.dayNumber}</span>
                <h3>{done} of 7 required steps done</h3>
              </div>
              <span className="muted small">Started {user.startDate}<br />Supervisor: {people.peter.name}</span>
            </div>
            <div className="progress"><i style={{ width: `${(done / 7) * 100}%` }} /></div>
            <ol className="onb-steps">
              {steps.map((s) => (
                <li key={s.id} className={s.status}>
                  <span className="st-ic">{s.status === 'done' ? <Ic.Check size={12} /> : s.id}</span>
                  <div>
                    <div className="onb-title">{s.title}{s.status === 'current' && <span className="chip info">You’re here</span>}</div>
                    <div className="muted small">{s.detail}</div>
                  </div>
                  <span className="onb-when">{s.when}</span>
                </li>
              ))}
            </ol>
            <p className="muted small">Step 3 is complete once Peter Owino approves your request. Required steps must be done by {people.peter.name}’s sign-off on Fri 4 Dec.</p>
          </div>
        )}
      </div>
    </header>
  );
}


/* ======================================================================== Route */

function RouteCard({ calc, submittedAt }: { calc: ReturnType<typeof computeCalc>; submittedAt: Date | null }) {
  const donorNeeded = !calc.error && calc.over;
  const stage = submittedAt ? 1 : 0;
  const steps = [
    { who: user.name, initials: user.initials, role: 'Grants Officer (you)', what: 'Prepare & submit', time: submittedAt ? `Sent ${fmtTime(submittedAt)}` : 'Drafting now', skip: false },
    { who: people.peter.name, initials: people.peter.initials, role: <T id="grants-manager">Grants Manager</T>, what: 'Reviews & approves', time: `~${people.peter.turnaround}`, skip: false },
    { who: people.lucia.name, initials: people.lucia.initials, role: <T id="finance-controller">Regional Finance Controller</T>, what: 'Final internal sign-off', time: `~${people.lucia.turnaround}`, skip: false },
    { who: grant.donor, initials: 'HF', role: <T id="donor-prior-approval">Donor prior approval</T>, what: donorNeeded ? 'Peter sends the request' : 'Not needed (≤10%)', time: donorNeeded ? '~15 business days' : '–', skip: !donorNeeded, donor: true },
    { who: 'Regional Finance', initials: 'RF', role: 'Budget updated', what: 'Revised budget posted', time: '~1 business day', skip: false },
  ];
  return (
    <section className="card route" aria-label="Approval route">
      <div className="route-head">
        <div>
          <h2>Where this request goes</h2>
          <p className="muted small">Each person is notified only when the step before them is finished. {donorNeeded
            ? <>Typical total: about 21 business days, mostly waiting for Halvorsen.</>
            : <>Typical total: about 6 business days.</>}</p>
        </div>
        {donorNeeded && (
          <div className="route-deadline"><Ic.Clock size={14} /> Halvorsen must receive it before <strong>{grant.reallocationCutoff}</strong></div>
        )}
      </div>
      <ol className="route-steps">
        {steps.map((s, i) => {
          const state = i < stage ? 'done' : i === stage ? 'current' : s.skip ? 'skip' : 'todo';
          return (
            <li key={i} className={`r-step ${state} ${s.donor && !s.skip ? 'donor' : ''}`}>
              {state === 'current' && <span className="here-tag">{i === 0 ? 'You are here' : 'Waiting here'}</span>}
              <div className="r-top">
                <span className={`avatar sm ${s.donor ? 'donor' : ''}`}>{state === 'done' ? <Ic.Check size={12} /> : s.initials}</span>
                {i < steps.length - 1 && <span className="r-line" />}
              </div>
              <div className="r-role">{s.role}</div>
              <div className="r-who">{s.who}</div>
              <div className="r-what">{s.what}</div>
              <div className="r-time">{s.time}</div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/* ======================================================================== Popover */

function TermPopover({ pop }: { pop: Pop }) {
  const help = useHelpSafe();
  const t = termById[pop.id];
  return (
    <div className={`popover ${pop.above ? 'above' : ''}`} role="dialog" aria-label={t.term} style={{ left: pop.x, top: pop.y }}>
      {pop.extra && (
        <div className="pop-extra"><Ic.Lock size={13} /><div><strong>{pop.extra.title}</strong><p>{pop.extra.text}</p></div></div>
      )}
      <span className="eyebrow">Glossary</span>
      <h4>{t.term}</h4>
      <p>{t.def}</p>
      {t.here && <p className="here"><span className="eyebrow">In this request</span>{t.here}</p>}
      <div className="pop-actions">
        <button type="button" className="link small" onClick={() => help.openGlossary(t.id)}>Open in glossary</button>
        <button type="button" className="link small" onClick={() => help.openHelpdesk(`Question about “${t.term}”`)}>Still unclear? Ask the helpdesk</button>
      </div>
    </div>
  );
}

/* ======================================================================== Confirm */

function ConfirmModal({ calc, onCancel, onConfirm }: { calc: ReturnType<typeof computeCalc>; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onCancel]);
  return (
    <div className="scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h3 id="confirm-title">Send RR-2026-047 to Peter Owino?</h3>
        <p>Move <strong>{money(calc.amount)}</strong> from Line {calc.from.no} ({calc.from.name}) to Line {calc.to.no} ({calc.to.name}) – {pct(calc.pctFrom)} of Line {calc.from.no}.</p>
        <span className="eyebrow">What happens next</span>
        <ol className="next">
          <li><strong>{people.peter.name}</strong> reviews it (usually within {people.peter.turnaround}). He may return it with comments.</li>
          <li><strong>{people.lucia.name}</strong> gives final internal sign-off.</li>
          {calc.over && <li><strong>Peter sends it to the Halvorsen Foundation</strong> for prior written approval. No spending under the new budget until their letter is uploaded.</li>}
          <li>Regional Finance posts the revised budget in Ledgerline.</li>
        </ol>
        <p className="muted small">Sent on {fmtDay(now())} at {fmtTime(now())} EAT. You can withdraw it until Peter starts his review.</p>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Keep editing</button>
          <button type="button" className="btn primary" onClick={onConfirm} autoFocus><Ic.Send size={14} /> Send for review</button>
        </div>
      </div>
    </div>
  );
}
