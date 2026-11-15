import { useRef, useState, type ReactNode } from 'react';
import { budgetLines, existingDocs, grant, justificationPrompts, people, DONOR_THRESHOLD, type SectionId, type BudgetLine } from './data';
import { T, ArticleLink, useHelp } from './help';
import { money, pct, signedMoney, digits, withCommas, fmtTime } from './util';
import * as Ic from './icons';

export type Doc = { slot: 'technical' | 'plan'; name: string; size: string; source: string };
export type Just = { underspend: string; need: string; impact: string };

export type Calc = {
  from: BudgetLine;
  to: BudgetLine;
  amount: number;
  pctFrom: number;
  pctTo: number;
  over: boolean;
  maxUnder: number;
  error: string | null;
  linesDone: boolean;
  justDone: boolean;
  docsDone: boolean;
  ready: boolean;
  missing: { label: string; section: SectionId }[];
};

export const MIN_CHARS = 100;
export const avail = (l: BudgetLine) => l.budget - l.spent - l.committed;

export function computeCalc(fromNo: number, toNo: number, amountStr: string, ack: boolean, just: Just, docs: Doc[]): Calc {
  const from = budgetLines[fromNo - 1];
  const to = budgetLines[toNo - 1];
  const amount = Number(amountStr || 0);
  const pctFrom = amount / from.budget;
  const pctTo = amount / to.budget;
  const over = amount > from.budget * DONOR_THRESHOLD || amount > to.budget * DONOR_THRESHOLD;
  const maxUnder = Math.floor(Math.min(from.budget, to.budget) * DONOR_THRESHOLD);
  let error: string | null = null;
  if (fromNo === toNo) error = 'The “Move from” and “Move to” lines must be different.';
  else if (amount <= 0) error = 'Enter the amount you want to move.';
  else if (amount > avail(from)) error = `Line ${from.no} only has ${money(avail(from))} available. You can’t move more than that.`;
  const linesDone = !error;
  const justDone = justificationPrompts.every((p) => just[p.key].trim().length >= MIN_CHARS);
  const docsDone = !over || docs.some((d) => d.slot === 'technical');
  const missing: Calc['missing'] = [];
  if (!linesDone) missing.push({ label: 'Fix the lines or amount', section: 'lines' });
  if (!ack) missing.push({ label: 'Confirm you’ve read the compliance check', section: 'compliance' });
  justificationPrompts.forEach((p, i) => {
    if (just[p.key].trim().length < MIN_CHARS) missing.push({ label: `Justification answer ${i + 1} (at least ${MIN_CHARS} characters)`, section: 'justification' });
  });
  if (!docsDone) missing.push({ label: `Technical evidence for Line ${to.no}`, section: 'documents' });
  return { from, to, amount, pctFrom, pctTo, over, maxUnder, error, linesDone, justDone, docsDone, ready: missing.length === 0, missing };
}

/* ------------------------------------------------------------------ shared bits */

function SectionHead({ n, id, title, done, sub, onExplain }: { n: number; id: SectionId; title: string; done: boolean; sub: ReactNode; onExplain: (id: SectionId) => void }) {
  return (
    <header className="sec-head">
      <span className={`sec-num ${done ? 'done' : ''}`}>{done ? <Ic.Check size={14} /> : n}</span>
      <div className="sec-titles">
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      <button type="button" className="btn ghost sm" onClick={() => onExplain(id)}>
        <Ic.Compass size={14} /> Explain this step
      </button>
    </header>
  );
}

function Meter({ value, label }: { value: number; label: string }) {
  const scale = 0.5; // bar represents 0–50%
  const w = Math.min(value / scale, 1) * 100;
  const over = value > DONOR_THRESHOLD;
  return (
    <div className="meter" aria-label={label}>
      <div className="meter-track">
        <div className={`meter-fill ${over ? 'over' : ''}`} style={{ width: `${w}%` }} />
        <div className="meter-mark" style={{ left: `${(DONOR_THRESHOLD / scale) * 100}%` }}>
          <span>10%</span>
        </div>
      </div>
      <div className="meter-legend">
        <span>0%</span>
        <span className={over ? 'amber-t' : 'green-t'}><strong>{pct(value)}</strong> of the line’s budget</span>
        <span>50%+</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ Section 1 */

export function LinesSection(props: {
  calc: Calc; fromNo: number; toNo: number; amountStr: string; locked: boolean;
  setFrom: (n: number) => void; setTo: (n: number) => void; setAmount: (s: string) => void;
  onExplain: (id: SectionId) => void; goTo: (id: SectionId) => void;
}) {
  const { calc, fromNo, toNo, amountStr, locked } = props;
  const help = useHelp();
  const { from, to, amount } = calc;
  const valid = !calc.error;

  return (
    <section className="card section" id="sec-lines">
      <SectionHead n={1} id="lines" title="Lines & amount" done={calc.linesDone} onExplain={props.onExplain}
        sub={<>Choose where the money comes from and where it goes. Actuals as of {grant.actualsAsOf}.</>} />

      <div className="type-row">
        <div>
          <span className="eyebrow">Request type</span>
          <div className="type-val"><T id="reallocation">Budget reallocation</T> <span className="muted">– within the approved total</span></div>
        </div>
        <p className="type-note">
          <Ic.Info size={14} /> Not an <T id="amendment">amendment</T>: the total, end date and objectives don’t change.{' '}
          <ArticleLink title="Reallocation vs. Amendment">Read: Reallocation vs. Amendment</ArticleLink>
        </p>
      </div>

      <table className="lines">
        <thead>
          <tr>
            <th className="c-no">#</th>
            <th>Budget line</th>
            <th className="num">Budget</th>
            <th className="num"><T id="spent">Spent</T></th>
            <th className="num"><T id="committed">Committed</T></th>
            <th className="num"><T id="available">Available</T></th>
            <th className="c-pick">Move from</th>
            <th className="c-pick">Move to</th>
          </tr>
        </thead>
        <tbody>
          {budgetLines.map((l) => {
            const isFrom = l.no === fromNo;
            const isTo = l.no === toNo;
            const spentPct = (l.spent + l.committed) / l.budget;
            return (
              <tr key={l.no} className={`${isFrom ? 'is-from' : ''} ${isTo ? 'is-to' : ''} ${l.lock ? 'is-locked' : ''}`}>
                <td className="c-no">{l.no}</td>
                <td>
                  <div className="ln-name">{l.name}</div>
                  <div className="ln-sub">
                    <span className="cat">{l.category}</span>
                    <span className="mini-bar" title={`${pct(spentPct, 0)} spent or committed`}>
                      <i style={{ width: `${Math.min(spentPct, 1) * 100}%` }} className={spentPct > 0.9 ? 'hot' : spentPct < 0.4 ? 'cool' : ''} />
                    </span>
                    <span>{pct(spentPct, 0)} used</span>
                  </div>
                </td>
                <td className="num">{money(l.budget)}</td>
                <td className="num">{money(l.spent)}</td>
                <td className="num">{l.committed ? money(l.committed) : '–'}</td>
                <td className="num strong">{money(avail(l))}</td>
                {l.lock ? (
                  <td className="c-pick" colSpan={2}>
                    <button type="button" className="lock-chip" onClick={(e) => help.openTerm('cost-category-lock', e.currentTarget, { title: `Line ${l.no} is locked (${l.lock!.by.toLowerCase()} lock)`, text: l.lock!.reason })}>
                      <Ic.Lock size={12} /> {l.lock.by} lock
                    </button>
                  </td>
                ) : (
                  <>
                    <td className="c-pick">
                      <label className="radio from">
                        <input type="radio" name="from" checked={isFrom} disabled={locked} onChange={() => props.setFrom(l.no)} aria-label={`Move from line ${l.no}`} />
                        <span />
                      </label>
                    </td>
                    <td className="c-pick">
                      <label className="radio to">
                        <input type="radio" name="to" checked={isTo} disabled={locked} onChange={() => props.setTo(l.no)} aria-label={`Move to line ${l.no}`} />
                        <span />
                      </label>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td />
            <td>Grant total</td>
            <td className="num">{money(grant.total)}</td>
            <td className="num">{money(budgetLines.reduce((s, l) => s + l.spent, 0))}</td>
            <td className="num">{money(budgetLines.reduce((s, l) => s + l.committed, 0))}</td>
            <td className="num">{money(budgetLines.reduce((s, l) => s + avail(l), 0))}</td>
            <td colSpan={2} className="c-pick muted small">Total stays the same</td>
          </tr>
        </tfoot>
      </table>

      <div className="amount-row">
        <label className="amount-field">
          <span className="eyebrow">Amount to move</span>
          <span className="money-input">
            <span>$</span>
            <input inputMode="numeric" value={withCommas(amountStr)} disabled={locked}
              onChange={(e) => props.setAmount(digits(e.target.value).slice(0, 9))} aria-describedby="amount-help" />
            <span className="cur">USD</span>
          </span>
        </label>
        <div className="amount-help" id="amount-help">
          {valid ? (
            <>
              <div>
                <strong>{pct(calc.pctFrom)}</strong> of Line {from.no}’s budget · <strong>{pct(calc.pctTo)}</strong> of Line {to.no}’s budget
              </div>
              <div className="muted small">
                Halvorsen’s <T id="variance-threshold">variance threshold</T> is 10% of any line. Up to {money(calc.maxUnder)} on these two lines would not need donor approval.
              </div>
            </>
          ) : (
            <div className="error-text"><Ic.Alert size={14} /> {calc.error}</div>
          )}
        </div>
      </div>

      {valid && (
        <>
          <div className="impact">
            {[
              { l: from, delta: -amount, p: calc.pctFrom, role: 'Moving from' },
              { l: to, delta: amount, p: calc.pctTo, role: 'Moving to' },
            ].map(({ l, delta, p, role }) => (
              <div className={`impact-card ${delta < 0 ? 'out' : 'in'}`} key={role}>
                <div className="impact-top">
                  <span className="eyebrow">{role}</span>
                  <span className={`delta ${delta < 0 ? 'neg' : 'pos'}`}>{signedMoney(delta)}</span>
                </div>
                <div className="impact-name">Line {l.no} · {l.name}</div>
                <dl className="impact-dl">
                  <div><dt>Budget</dt><dd>{money(l.budget)} <Ic.ArrowRight size={12} /> <strong>{money(l.budget + delta)}</strong></dd></div>
                  <div><dt>Available</dt><dd>{money(avail(l))} <Ic.ArrowRight size={12} /> <strong>{money(avail(l) + delta)}</strong></dd></div>
                </dl>
                <Meter value={p} label={`Change is ${pct(p)} of line ${l.no}`} />
              </div>
            ))}
          </div>

          {calc.over ? (
            <div className="callout amber">
              <Ic.Flag size={16} />
              <div>
                <strong>This move needs <T id="donor-prior-approval">donor prior approval</T>.</strong> It is over 10% of {calc.pctFrom > DONOR_THRESHOLD && calc.pctTo > DONOR_THRESHOLD ? 'both lines' : `Line ${calc.pctFrom > DONOR_THRESHOLD ? from.no : to.no}`}, so Halvorsen must agree in writing before the money is used.
                That doesn’t block you – it adds a step after the internal approvals. Peter Owino sends the request to Halvorsen; you don’t contact them yourself.{' '}
                <button type="button" className="link" onClick={() => props.goTo('compliance')}>See the compliance check</button>
              </div>
            </div>
          ) : (
            <div className="callout green">
              <Ic.Check size={16} />
              <div>
                <strong>Within Halvorsen’s 10% threshold.</strong> No donor approval needed – Peter Owino and Lucía Ferrer approve it internally, and it’s listed in the next financial report.
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Section 2 */

type Check = { key: string; status: 'pass' | 'amber' | 'fail' | 'info'; title: ReactNode; text: ReactNode; more?: ReactNode };

export function ComplianceSection({ calc, ack, setAck, locked, onExplain }: { calc: Calc; ack: boolean; setAck: (b: boolean) => void; locked: boolean; onExplain: (id: SectionId) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const { from, to, amount } = calc;
  const burn = from.spent / grant.monthsElapsed;
  const forecast = Math.round(burn * grant.monthsRemaining);
  const afterAvail = avail(from) - amount;

  const checks: Check[] = calc.error
    ? []
    : [
        {
          key: 'threshold',
          status: calc.over ? 'amber' : 'pass',
          title: <><T id="variance-threshold">Variance threshold</T> (Halvorsen: 10% of any line)</>,
          text: calc.over
            ? <>{money(amount)} is <strong>{pct(calc.pctFrom)}</strong> of Line {from.no} and <strong>{pct(calc.pctTo)}</strong> of Line {to.no}. Over 10% → <strong>donor prior written approval required</strong>. Halvorsen has been added to the approval route.</>
            : <>{money(amount)} is {pct(calc.pctFrom)} of Line {from.no} and {pct(calc.pctTo)} of Line {to.no}. Both are within 10%, so no donor approval is needed.</>,
          more: <>Ledgerline divides the amount by each line’s <em>full approved budget</em> (not what’s left) and checks both lines. Halvorsen assesses each request on its own; an earlier move on this grant ({grant.priorReallocation.id}, Line 3 → Line 5, {money(grant.priorReallocation.amount)}, {grant.priorReallocation.pct}%) stayed under the threshold and needed no approval. Don’t split a change into smaller requests to avoid the threshold – donors treat that as a breach.</>,
        },
        {
          key: 'lock',
          status: 'pass',
          title: <><T id="cost-category-lock">Cost category lock</T></>,
          text: <>Neither Line {from.no} nor Line {to.no} is locked. Locked on this grant: Line 8 (MEL – ring-fenced by Halvorsen) and Line 9 (Indirect – calculated by the system).</>,
          more: <>A lock means a line can’t give or receive money through a reallocation. Changing a donor-locked line needs an <T id="amendment">amendment</T>. <ArticleLink title="Understanding cost category locks" /></>,
        },
        {
          key: 'window',
          status: 'pass',
          title: <><T id="reallocation-window">Reallocation window</T></>,
          text: <>Halvorsen accepts requests until <strong>{grant.reallocationCutoff}</strong> (90 days before the grant ends). That’s 51 days from today – enough for the internal approvals first.</>,
          more: <>Internal review typically takes about 5 business days (Peter ~2, Lucía ~3). Halvorsen then aims to reply within 15 business days.</>,
        },
        {
          key: 'burn',
          status: afterAvail >= forecast ? 'pass' : 'amber',
          title: <>Enough left on Line {from.no} for the remaining {grant.monthsRemaining} months</>,
          text: afterAvail >= forecast
            ? <>After the move Line {from.no} keeps {money(afterAvail)} available. At its <T id="burn-rate">burn rate</T> so far (~{money(Math.round(burn))}/month), the remaining months need about {money(forecast)}.</>
            : <>After the move Line {from.no} keeps only {money(afterAvail)}, but at its current pace (~{money(Math.round(burn))}/month) it needs about {money(forecast)}. Check with Joseph Ekai that remaining activities are covered.</>,
          more: <>This is a Northbridge internal check, not a donor rule. Peter will ask whether the budget holder, {people.joseph.name}, agrees the remaining training can be delivered.</>,
        },
        {
          key: 'total',
          status: 'pass',
          title: <>Grant total and <T id="indirect-costs">indirect costs</T> unchanged</>,
          text: <>The grant stays at {money(grant.total)}. Moving between two direct lines doesn’t change the 7% indirect line.</>,
        },
      ];

  const icon = (s: Check['status']) => s === 'pass' ? <Ic.Check size={14} /> : s === 'amber' ? <Ic.Flag size={14} /> : s === 'fail' ? <Ic.X size={14} /> : <Ic.Info size={14} />;
  const label = { pass: 'OK', amber: 'Needs donor approval', fail: 'Blocked', info: 'Note' };

  return (
    <section className="card section" id="sec-compliance">
      <SectionHead n={2} id="compliance" title="Compliance check" done={ack && !calc.error} onExplain={onExplain}
        sub={<>Ledgerline checks your numbers against Halvorsen’s rules. <ArticleLink title="Halvorsen Foundation donor rules summary">Halvorsen donor rules summary</ArticleLink></>} />
      {calc.error ? (
        <p className="muted">Fix the lines and amount in step 1 to run the checks.</p>
      ) : (
        <>
          <ul className="checks">
            {checks.map((c) => (
              <li key={c.key} className={`check ${c.status === 'amber' && c.key === 'burn' ? 'amber-soft' : c.status}`}>
                <span className="check-ic">{icon(c.status)}</span>
                <div className="check-body">
                  <div className="check-title">
                    <span>{c.title}</span>
                    <span className={`chip ${c.status}`}>{c.key === 'burn' && c.status === 'amber' ? 'Check with budget holder' : label[c.status]}</span>
                  </div>
                  <p>{c.text}</p>
                  {c.more && (
                    <>
                      <button type="button" className="link small" onClick={() => setOpen(open === c.key ? null : c.key)} aria-expanded={open === c.key}>
                        {open === c.key ? 'Hide detail' : 'What does this mean?'}
                      </button>
                      {open === c.key && <p className="check-more">{c.more}</p>}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <label className={`ack ${ack ? 'on' : ''}`}>
            <input type="checkbox" checked={ack} disabled={locked} onChange={(e) => setAck(e.target.checked)} />
            <span>
              {calc.over
                ? <>I understand this request needs Halvorsen’s prior written approval, and that no money should be spent under the new budget until it is received. Peter Owino will send the donor request after internal approval.</>
                : <>I’ve read the checks. This request will be approved internally and reported to Halvorsen in the next financial report.</>}
            </span>
          </label>
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ Section 3 */

export function JustificationSection({ calc, just, setJust, locked, onExplain, onFocus }: { calc: Calc; just: Just; setJust: (j: Just) => void; locked: boolean; onExplain: (id: SectionId) => void; onFocus: () => void }) {
  const [shown, setShown] = useState<string | null>(null);
  const done = calc.justDone;
  return (
    <section className="card section" id="sec-justification">
      <SectionHead n={3} id="justification" title="Justification" done={done} onExplain={onExplain}
        sub={calc.over
          ? <>Goes to Halvorsen’s programme officer, {people.donorContact.name}, in Peter’s request letter. Write it for someone who has never been to Turkana.</>
          : <>Read by Peter Owino and Lucía Ferrer, and summarised in the next financial report.</>} />
      <div className="just-list">
        {justificationPrompts.map((p, i) => {
          const len = just[p.key].trim().length;
          const ok = len >= MIN_CHARS;
          const label = p.label.replace('Line 4 (Community Hygiene Training)', `Line ${calc.from.no} (${calc.from.name})`).replace('Line 6 (Borehole Rehabilitation)', `Line ${calc.to.no} (${calc.to.name})`);
          return (
            <div className="just" key={p.key}>
              <label htmlFor={`j-${p.key}`} className="just-label"><span className="q-num">{i + 1}</span>{label}</label>
              <p className="just-hint">{p.hint}</p>
              <textarea id={`j-${p.key}`} rows={4} value={just[p.key]} disabled={locked} onFocus={onFocus}
                onChange={(e) => setJust({ ...just, [p.key]: e.target.value })}
                placeholder="Write in plain language – what happened, with numbers where you have them." />
              <div className="just-foot">
                <span className={ok ? 'green-t' : 'muted'}>{ok ? <><Ic.Check size={12} /> Enough detail</> : `${len} / ${MIN_CHARS} characters minimum`}</span>
                <button type="button" className="link small" onClick={() => setShown(shown === p.key ? null : p.key)} aria-expanded={shown === p.key}>
                  {shown === p.key ? 'Hide example' : 'See an example from an approved request'}
                </button>
              </div>
              {shown === p.key && (
                <blockquote className="example">
                  <span className="eyebrow">Example · RR-2025-188, Meridian Water Trust, Marsabit (approved)</span>
                  <p>{p.example}</p>
                  <span className="muted small">Use it as a model for structure and detail – the facts for Turkana come from you and Joseph Ekai.</span>
                </blockquote>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Section 4 */

export function DocumentsSection({ calc, docs, setDocs, locked, onExplain, budgetFile }: { calc: Calc; docs: Doc[]; setDocs: (d: Doc[]) => void; locked: boolean; onExplain: (id: SectionId) => void; budgetFile: string }) {
  const [preview, setPreview] = useState(false);
  const [picker, setPicker] = useState<Doc['slot'] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadSlot = useRef<Doc['slot']>('technical');

  const attach = (d: Doc) => { setDocs([...docs.filter((x) => !(x.slot === d.slot && x.name === d.name)), d]); setPicker(null); };
  const remove = (d: Doc) => setDocs(docs.filter((x) => x !== d));

  const slots: { slot: Doc['slot']; title: string; why: ReactNode; required: boolean }[] = [
    {
      slot: 'technical',
      title: `Technical evidence for Line ${calc.to.no} (${calc.to.name})`,
      why: calc.over ? <>Required – Halvorsen asks for an assessment or bill of quantities for works and construction.</> : <>Recommended – helps Peter and Lucía see the need.</>,
      required: calc.over,
    },
    {
      slot: 'plan',
      title: `Revised activity plan for Line ${calc.from.no} (${calc.from.name})`,
      why: <>Recommended – shows the remaining activities on the line are still covered.</>,
      required: false,
    },
  ];

  return (
    <section className="card section" id="sec-documents">
      <SectionHead n={4} id="documents" title="Supporting documents" done={calc.docsDone && !calc.error} onExplain={onExplain}
        sub={<>Attach what approvers and Halvorsen will ask for. Files already on the grant record can be attached directly.</>} />

      <div className="doc-row auto">
        <span className="doc-ic ok"><Ic.Check size={14} /></span>
        <div className="doc-main">
          <div className="doc-title"><T id="revised-budget">Revised budget</T> – Halvorsen template</div>
          <div className="doc-file"><Ic.File size={13} /> {budgetFile} · generated by Ledgerline from your numbers</div>
        </div>
        <button type="button" className="btn ghost sm" onClick={() => setPreview(!preview)} aria-expanded={preview}>{preview ? 'Hide preview' : 'Preview'}</button>
      </div>
      {preview && (
        <table className="mini-table">
          <thead><tr><th>#</th><th>Line</th><th className="num">Approved</th><th className="num">Change</th><th className="num">Revised</th></tr></thead>
          <tbody>
            {budgetLines.map((l) => {
              const d = calc.error ? 0 : l.no === calc.from.no ? -calc.amount : l.no === calc.to.no ? calc.amount : 0;
              return (
                <tr key={l.no} className={d ? 'changed' : ''}>
                  <td>{l.no}</td><td>{l.name}</td><td className="num">{money(l.budget)}</td>
                  <td className={`num ${d < 0 ? 'neg' : d > 0 ? 'pos' : 'muted'}`}>{d ? signedMoney(d) : '–'}</td>
                  <td className="num strong">{money(l.budget + d)}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot><tr><td /><td>Total</td><td className="num">{money(grant.total)}</td><td className="num muted">$0</td><td className="num strong">{money(grant.total)}</td></tr></tfoot>
        </table>
      )}

      {slots.map((s) => {
        const attached = docs.filter((d) => d.slot === s.slot);
        return (
          <div className="doc-slot" key={s.slot}>
            <div className="doc-row">
              <span className={`doc-ic ${attached.length ? 'ok' : s.required ? 'req' : ''}`}>{attached.length ? <Ic.Check size={14} /> : <Ic.Paperclip size={14} />}</span>
              <div className="doc-main">
                <div className="doc-title">{s.title} {s.required ? <span className="chip amber">Required</span> : <span className="chip">Recommended</span>}</div>
                <div className="doc-why">{s.why}</div>
                {attached.map((d) => (
                  <div className="doc-file attached" key={d.name}>
                    <Ic.File size={13} /> {d.name} <span className="muted">· {d.size} · {d.source}</span>
                    {!locked && <button type="button" className="icon-btn" aria-label={`Remove ${d.name}`} onClick={() => remove(d)}><Ic.X size={12} /></button>}
                  </div>
                ))}
              </div>
              {!locked && (
                <div className="doc-actions">
                  <button type="button" className="btn ghost sm" onClick={() => setPicker(picker === s.slot ? null : s.slot)} aria-expanded={picker === s.slot}>From grant record</button>
                  <button type="button" className="btn ghost sm" onClick={() => { uploadSlot.current = s.slot; fileRef.current?.click(); }}><Ic.Upload size={13} /> Upload</button>
                </div>
              )}
            </div>
            {picker === s.slot && (
              <ul className="picker">
                <li className="picker-head">Documents on {grant.code}</li>
                {existingDocs.map((d) => {
                  const already = docs.some((x) => x.slot === s.slot && x.name === d.name);
                  return (
                    <li key={d.id}>
                      <Ic.File size={13} />
                      <div><div>{d.name}</div><div className="muted small">{d.size} · added by {d.by}, {d.date}</div></div>
                      <button type="button" className="btn sm" disabled={already} onClick={() => attach({ slot: s.slot, name: d.name, size: d.size, source: 'from grant record' })}>{already ? 'Attached' : 'Attach'}</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
      <input ref={fileRef} type="file" hidden onChange={(e) => {
        const f = e.target.files?.[0];
        if (f) attach({ slot: uploadSlot.current, name: f.name, size: f.size > 1e6 ? `${(f.size / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(f.size / 1e3))} KB`, source: 'uploaded' });
        e.target.value = '';
      }} />
    </section>
  );
}

/* ------------------------------------------------------------------ Section 5 */

export function ReviewSection({ calc, note, setNote, submittedAt, onSubmit, onWithdraw, onExplain, goTo }: {
  calc: Calc; note: string; setNote: (s: string) => void; submittedAt: Date | null;
  onSubmit: () => void; onWithdraw: () => void; onExplain: (id: SectionId) => void; goTo: (id: SectionId) => void;
}) {
  return (
    <section className="card section" id="sec-review">
      <SectionHead n={5} id="review" title="Review & send" done={!!submittedAt} onExplain={onExplain}
        sub={<>Sends the request to {people.peter.name} (Grants Manager, your supervisor) – the first step of the <T id="approval-route">approval route</T>.</>} />

      {!calc.error && (
        <div className="summary">
          <div><span className="eyebrow">Move</span><strong>{money(calc.amount)}</strong></div>
          <div><span className="eyebrow">From</span>Line {calc.from.no} · {calc.from.name}<span className="muted small"> ({pct(calc.pctFrom)})</span></div>
          <div><span className="eyebrow">To</span>Line {calc.to.no} · {calc.to.name}<span className="muted small"> ({pct(calc.pctTo)})</span></div>
          <div><span className="eyebrow">Donor approval</span>{calc.over ? <span className="chip amber">Required</span> : <span className="chip pass">Not needed</span>}</div>
        </div>
      )}

      {submittedAt ? (
        <div className="callout green big">
          <Ic.Send size={18} />
          <div>
            <strong>Sent to {people.peter.name} at {fmtTime(submittedAt)}.</strong> He usually reviews within {people.peter.turnaround}. If he returns it with comments, you’ll get a notification and can edit and resend – that’s normal on a first request.
            <div className="row gap-s mt-s">
              <button type="button" className="btn ghost sm" onClick={onWithdraw}>Withdraw to edit</button>
              <span className="muted small">You can withdraw until Peter starts his review.</span>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="ready">
            <span className="eyebrow">Before you send</span>
            {calc.missing.length === 0 ? (
              <p className="green-t"><Ic.Check size={14} /> Everything required is in place.</p>
            ) : (
              <ul>
                {calc.missing.map((m) => (
                  <li key={m.label}>
                    <span className="todo-dot" /> {m.label}{' '}
                    <button type="button" className="link small" onClick={() => goTo(m.section)}>Go there</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <label className="note">
            <span className="eyebrow">Note to Peter (optional – not sent to the donor)</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="E.g. “First reallocation – I checked the figures with Joseph Ekai on Tuesday. Happy to walk through it.”" />
          </label>
          <div className="send-row">
            <button type="button" className="btn primary" disabled={!calc.ready} onClick={onSubmit}>
              <Ic.Send size={14} /> Send to {people.peter.name} for review
            </button>
            {!calc.ready && <span className="muted small">{calc.missing.length} item{calc.missing.length === 1 ? '' : 's'} left before you can send.</span>}
          </div>
        </>
      )}
    </section>
  );
}
