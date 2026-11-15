import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { articles, glossary, guide, helpdeskTopics, people, sections, termById, grant, type SectionId, type Article } from './data';
import { useHelp, T, ArticleLink } from './help';
import type { Calc } from './Request';
import { addBusinessHours, fmtDay, fmtTime, now } from './util';
import * as Ic from './icons';

export type RailTab = 'guide' | 'glossary' | 'articles' | 'helpdesk';
export type Ticket = { id: string; subject: string; topic: string; created: Date; due: Date; context: string[] };

type Props = {
  tab: RailTab; setTab: (t: RailTab) => void;
  active: SectionId; calc: Calc; submitted: boolean;
  termId: string | null; articleTitle: string | null; setArticle: (t: string | null) => void;
  tickets: Ticket[]; addTicket: (t: Ticket) => void;
  helpSubject: string; helpNonce: number;
};

export function Rail(p: Props) {
  const tabs: { id: RailTab; label: string; icon: ReactElement; count?: number }[] = [
    { id: 'guide', label: 'Guide', icon: <Ic.Compass size={15} /> },
    { id: 'glossary', label: 'Glossary', icon: <Ic.Book size={15} />, count: glossary.length },
    { id: 'articles', label: 'Articles', icon: <Ic.File size={15} />, count: articles.length },
    { id: 'helpdesk', label: 'Helpdesk', icon: <Ic.Chat size={15} />, count: p.tickets.length || undefined },
  ];
  return (
    <aside className="rail" aria-label="Help and guidance">
      <nav className="rail-tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={p.tab === t.id} className={p.tab === t.id ? 'on' : ''} onClick={() => p.setTab(t.id)}>
            {t.icon}<span>{t.label}</span>{t.count != null && <em>{t.count}</em>}
          </button>
        ))}
      </nav>
      <div className="rail-body">
        {p.tab === 'guide' && <GuideTab {...p} />}
        {p.tab === 'glossary' && <GlossaryTab termId={p.termId} />}
        {p.tab === 'articles' && <ArticlesTab title={p.articleTitle} setTitle={p.setArticle} />}
        {p.tab === 'helpdesk' && <HelpdeskTab {...p} />}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ Guide */

function GuideTab({ active, calc, submitted, setTab }: Props) {
  const g = guide[active];
  const help = useHelp();
  const idx = sections.findIndex((s) => s.id === active);
  return (
    <div className="guide">
      <div className="g-key">
        <div className="g-key-head"><Ic.Sparkle size={14} /> Three things to know about this request</div>
        <ol>
          <li>
            {calc.error ? <>Fix step 1 and Ledgerline will tell you whether Halvorsen must approve.</> : calc.over
              ? <><strong>Halvorsen must approve it in writing first.</strong> The move is {(Math.max(calc.pctFrom, calc.pctTo) * 100).toFixed(1)}% of a line; their limit is 10%.</>
              : <><strong>No donor approval needed</strong> – the move is within Halvorsen’s 10% limit.</>}
          </li>
          <li><strong>Two internal approvers, in order:</strong> {people.peter.name} (Grants Manager), then {people.lucia.name} (Regional Finance Controller).</li>
          <li><strong>Deadline:</strong> Halvorsen stops accepting reallocation requests on {grant.reallocationCutoff}.</li>
        </ol>
      </div>

      <div className="g-step">
        <div className="g-step-head">
          <span className="eyebrow">{submitted ? 'Submitted' : `You’re on step ${idx + 1} of 5`}</span>
          <h3>{sections[idx].label}</h3>
        </div>
        <p>{g.what}</p>
        <h4>Watch for</h4>
        <ul className="g-watch">{g.watch.map((w) => <li key={w}>{w}</li>)}</ul>
        <h4>Words on this step</h4>
        <div className="g-terms">
          {g.terms.map((id) => (
            <button key={id} type="button" className="term-chip" onClick={(e) => help.openTerm(id, e.currentTarget)}>{termById[id].term}</button>
          ))}
        </div>
        <h4>Read more</h4>
        <ul className="g-articles">
          {g.articles.map((t) => (
            <li key={t}><button type="button" onClick={() => help.openArticle(t)}><Ic.File size={13} /> <span>{t}</span> <Ic.ChevronRight size={13} /></button></li>
          ))}
        </ul>
      </div>

      <div className="g-stuck">
        <div>
          <strong>Stuck or unsure?</strong>
          <p>The Grants-Systems helpdesk usually replies within 4 business hours. Ledgerline attaches this request so you don’t have to explain where you are.</p>
        </div>
        <button type="button" className="btn sm" onClick={() => setTab('helpdesk')}><Ic.Chat size={13} /> Ask the helpdesk</button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Glossary */

function GlossaryTab({ termId }: { termId: string | null }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(termId);
  const refs = useRef<Record<string, HTMLLIElement | null>>({});
  useEffect(() => {
    if (termId) { setOpen(termId); setQ(''); requestAnimationFrame(() => refs.current[termId]?.scrollIntoView({ block: 'center', behavior: 'smooth' })); }
  }, [termId]);
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...glossary].sort((a, b) => a.term.localeCompare(b.term)).filter((t) => !s || t.term.toLowerCase().includes(s) || t.def.toLowerCase().includes(s));
  }, [q]);
  return (
    <div className="glossary">
      <div className="rail-search">
        <Ic.Search size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${glossary.length} terms`} aria-label="Search glossary" />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear search"><Ic.X size={12} /></button>}
      </div>
      <p className="muted small rail-count">{list.length} of {glossary.length} terms · <span className="here-key">In this request</span> notes explain how a term applies to RR-2026-047</p>
      <ul className="g-list">
        {list.map((t) => (
          <li key={t.id} ref={(el) => { refs.current[t.id] = el; }} className={open === t.id ? 'open' : ''}>
            <button type="button" onClick={() => setOpen(open === t.id ? null : t.id)} aria-expanded={open === t.id}>
              <span>{t.term}</span>{t.here && <i className="here-dot" title="Applies to this request" />}<Ic.ChevronDown size={14} />
            </button>
            {open === t.id && (
              <div className="g-def">
                <p>{t.def}</p>
                {t.here && <p className="here"><span className="eyebrow">In this request</span>{t.here}</p>}
                {t.related && t.related.length > 0 && (
                  <div className="g-related">See also: {t.related.map((r) => <button type="button" key={r} className="link small" onClick={() => setOpen(r)}>{termById[r].term}</button>)}</div>
                )}
              </div>
            )}
          </li>
        ))}
        {list.length === 0 && <li className="empty">No terms match “{q}”. Try the Articles tab, or ask the helpdesk.</li>}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ Articles */

function ArticlesTab({ title, setTitle }: { title: string | null; setTitle: (t: string | null) => void }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const cats = useMemo(() => ['All', ...Array.from(new Set(articles.map((a) => a.category)))], []);
  const article = title ? articles.find((a) => a.title === title) : null;
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return articles.filter((a) => (cat === 'All' || a.category === cat) && (!s || a.title.toLowerCase().includes(s) || a.summary.toLowerCase().includes(s)));
  }, [q, cat]);

  if (article) return <ArticleView a={article} back={() => setTitle(null)} />;

  const grouped = list.reduce<Record<string, Article[]>>((m, a) => { (m[a.category] ||= []).push(a); return m; }, {});
  return (
    <div className="articles">
      <div className="rail-search">
        <Ic.Search size={14} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${articles.length} help articles`} aria-label="Search articles" />
        {q && <button className="icon-btn" onClick={() => setQ('')} aria-label="Clear search"><Ic.X size={12} /></button>}
      </div>
      <select className="cat-select" value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Filter by category">
        {cats.map((c) => <option key={c} value={c}>{c === 'All' ? `All categories (${articles.length})` : `${c} (${articles.filter((a) => a.category === c).length})`}</option>)}
      </select>
      {!q && cat === 'All' && (
        <div className="pinned">
          <span className="eyebrow">Picked for this request</span>
          {['Your first budget reallocation: step by step', 'Reallocation vs. Amendment', 'Halvorsen Foundation donor rules summary'].map((t) => (
            <button type="button" key={t} onClick={() => setTitle(t)}><Ic.File size={13} /><span>{t}</span><Ic.ChevronRight size={13} /></button>
          ))}
        </div>
      )}
      {Object.entries(grouped).map(([c, as]) => (
        <div key={c} className="a-group">
          <h4>{c}</h4>
          <ul>
            {as.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => setTitle(a.title)}>
                  <span className="a-title">{a.title}</span>
                  <span className="a-sum">{a.summary}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ))}
      {list.length === 0 && <p className="empty">No articles match “{q}”. The helpdesk can point you to the right guidance.</p>}
    </div>
  );
}

function ArticleView({ a, back }: { a: Article; back: () => void }) {
  const related = articles.filter((x) => x.category === a.category && x.id !== a.id).slice(0, 4);
  const help = useHelp();
  return (
    <article className="reader">
      <button type="button" className="link small back" onClick={back}><Ic.ChevronLeft size={13} /> All articles</button>
      <span className="eyebrow">{a.category} · {a.mins} min read · updated {a.updated}</span>
      <h3>{a.title}</h3>
      <p className="lead">{a.summary}</p>
      {a.body ? a.body.map((b, i) => (
        <div key={i} className="blk">
          {b.h && <h4>{b.h}</h4>}
          {b.p && <p>{b.p}</p>}
          {b.list && <ul>{b.list.map((x) => <li key={x}>{x}</li>)}</ul>}
          {b.note && <p className="here"><span className="eyebrow">For your request</span>{b.note}</p>}
        </div>
      )) : (
        <p className="muted small">This article isn’t specific to your current request. Its full text is kept in the Knowledge Base under “{a.category}”.</p>
      )}
      <div className="reader-foot">
        <span className="eyebrow">Related in {a.category}</span>
        {related.map((r) => <ArticleLink key={r.id} title={r.title} />)}
        <p className="muted small mt-s">Didn’t answer your question? <button type="button" className="link small" onClick={() => help.openHelpdesk(`Question about “${a.title}”`)}>Ask the helpdesk</button></p>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ Helpdesk */

function HelpdeskTab({ tickets, addTicket, active, calc, helpSubject, helpNonce }: Props) {
  const [topic, setTopic] = useState(helpdeskTopics[0]);
  const [subject, setSubject] = useState(helpSubject);
  const [msg, setMsg] = useState('');
  const [includeCtx, setIncludeCtx] = useState(true);
  const [justSent, setJustSent] = useState<Ticket | null>(null);
  const help = useHelp();
  useEffect(() => { if (helpSubject) { setSubject(helpSubject); setJustSent(null); } }, [helpSubject, helpNonce]);

  const sectionLabel = sections.find((s) => s.id === active)!.label;
  const context = [`Grant ${grant.code}`, 'Draft RR-2026-047', `Step: ${sectionLabel}`, calc.error ? 'Amount not valid yet' : `$${calc.amount.toLocaleString('en-US')} · Line ${calc.from.no} → Line ${calc.to.no}`];

  const suggestions = useMemo(() => {
    const words = `${subject} ${msg}`.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 3);
    if (!words.length) return [];
    return articles
      .map((a) => ({ a, s: words.reduce((n, w) => n + (a.title.toLowerCase().includes(w) ? 2 : 0) + (a.summary.toLowerCase().includes(w) ? 1 : 0), 0) }))
      .filter((x) => x.s > 1).sort((x, y) => y.s - x.s).slice(0, 3).map((x) => x.a);
  }, [subject, msg]);

  const canSend = subject.trim().length > 3 && msg.trim().length > 10;
  const send = () => {
    const created = now();
    const t: Ticket = { id: `GSH-${30418 + tickets.length}`, subject: subject.trim(), topic, created, due: addBusinessHours(created, 4), context: includeCtx ? context : [] };
    addTicket(t); setJustSent(t); setSubject(''); setMsg('');
  };

  return (
    <div className="helpdesk">
      <div className="hd-queue">
        <div className="hd-q-top"><span className="avatar sq">GS</span><div><strong>Grants-Systems helpdesk</strong><div className="muted small">Internal · Mon–Fri, 08:00–17:00 EAT</div></div></div>
        <div className="hd-sla"><Ic.Clock size={14} /> Typical first reply: <strong>4 business hours</strong></div>
        <p className="muted small">For questions about rules, checks, numbers or the system. For decisions about this grant, ask {people.peter.name}.</p>
      </div>

      {justSent && (
        <div className="callout green">
          <Ic.Check size={16} />
          <div><strong>Ticket {justSent.id} sent.</strong> Expect a reply by about <strong>{fmtTime(justSent.due)} {fmtDay(justSent.due) === fmtDay(justSent.created) ? 'today' : fmtDay(justSent.due)}</strong>. Your draft keeps saving – carry on with other steps while you wait.</div>
        </div>
      )}

      <form className="hd-form" onSubmit={(e) => { e.preventDefault(); if (canSend) send(); }}>
        <label><span className="eyebrow">What’s it about?</span>
          <select value={topic} onChange={(e) => setTopic(e.target.value)}>{helpdeskTopics.map((t) => <option key={t}>{t}</option>)}</select>
        </label>
        <label><span className="eyebrow">Subject</span>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="E.g. Does Line 6 count as works for Halvorsen?" />
        </label>
        <label><span className="eyebrow">Your question</span>
          <textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Say what you’re trying to do and what’s unclear. It’s fine to say you’re new – the team expects it." />
        </label>
        {suggestions.length > 0 && (
          <div className="hd-sugg">
            <span className="eyebrow">These articles might answer it</span>
            {suggestions.map((a) => <button type="button" key={a.id} className="link small" onClick={() => help.openArticle(a.title)}>{a.title}</button>)}
          </div>
        )}
        <label className="hd-ctx">
          <input type="checkbox" checked={includeCtx} onChange={(e) => setIncludeCtx(e.target.checked)} />
          <span>Attach where I am in Ledgerline
            <span className="ctx-chips">{context.map((c) => <em key={c}>{c}</em>)}</span>
          </span>
        </label>
        <button type="submit" className="btn primary full" disabled={!canSend}><Ic.Send size={14} /> Send to Grants-Systems</button>
      </form>

      {tickets.length > 0 && (
        <div className="hd-tickets">
          <span className="eyebrow">Your tickets</span>
          {tickets.map((t) => (
            <div className="ticket" key={t.id}>
              <div className="ticket-top"><strong>{t.id}</strong><span className="chip info">Open · in queue</span></div>
              <div>{t.subject}</div>
              <div className="muted small">{t.topic} · sent {fmtTime(t.created)} · reply expected by {fmtTime(t.due)}{fmtDay(t.due) !== fmtDay(t.created) ? `, ${fmtDay(t.due)}` : ''}</div>
            </div>
          ))}
        </div>
      )}
      <p className="muted small hd-alt">Prefer a quick answer? Most first-time questions are covered in <T id="variance-threshold">variance thresholds</T>, <T id="donor-prior-approval">donor prior approval</T> and <T id="cost-category-lock">cost category locks</T>.</p>
    </div>
  );
}
