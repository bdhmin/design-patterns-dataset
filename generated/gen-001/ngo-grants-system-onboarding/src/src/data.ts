// Mock data for Ledgerline. Everything here is client-side only.

export const NOW_BASE = new Date('2026-11-11T10:42:00+03:00'); // Wed 11 Nov 2026, 10:42 EAT

export const user = {
  name: 'Aisha Kamau',
  initials: 'AK',
  role: 'Grants Officer',
  office: 'Nairobi Regional Office',
  startDate: 'Mon 9 Nov 2026',
  dayNumber: 3,
};

export const people = {
  peter: { name: 'Peter Owino', initials: 'PO', role: 'Grants Manager, East Africa', note: 'Your supervisor', turnaround: '2 business days' },
  lucia: { name: 'Lucía Ferrer', initials: 'LF', role: 'Regional Finance Controller', note: 'Final internal sign-off', turnaround: '3 business days' },
  joseph: { name: 'Joseph Ekai', initials: 'JE', role: 'WASH Programme Manager, Lodwar', note: 'Budget holder for this grant' },
  donorContact: { name: 'Ingrid Solberg', role: 'Programme Officer, Halvorsen Foundation' },
};

export const grant = {
  code: 'NRI-KE-2025-118',
  title: 'Turkana WASH Resilience',
  donor: 'Halvorsen Foundation',
  total: 1840000,
  start: 'Apr 2025',
  end: 'Mar 2027',
  startISO: '2025-04-01',
  endISO: '2027-03-31',
  location: 'Turkana County, Kenya',
  monthsElapsed: 19,
  monthsRemaining: 5,
  actualsAsOf: '31 Oct 2026',
  reallocationCutoff: '1 Jan 2027',
  reallocationCutoffISO: '2027-01-01',
  priorReallocation: { id: 'RR-2025-031', from: 3, to: 5, amount: 6500, pct: 8.8, date: '14 Oct 2025', donorApproval: false },
};

export type BudgetLine = {
  no: number;
  name: string;
  category: string;
  budget: number;
  spent: number;
  committed: number;
  lock?: { by: string; reason: string };
};

export const budgetLines: BudgetLine[] = [
  { no: 1, name: 'Personnel – national staff', category: 'Personnel', budget: 412000, spent: 318700, committed: 21600 },
  { no: 2, name: 'Personnel – international technical support', category: 'Personnel', budget: 118000, spent: 84200, committed: 0 },
  { no: 3, name: 'Water point surveys & hydrogeology', category: 'Technical services', budget: 74000, spent: 71350, committed: 0 },
  { no: 4, name: 'Community Hygiene Training', category: 'Programme activities', budget: 212000, spent: 61400, committed: 8200 },
  { no: 5, name: 'Hygiene kits & consumables', category: 'Supplies', budget: 158000, spent: 112800, committed: 14900 },
  { no: 6, name: 'Borehole Rehabilitation', category: 'Works & construction', budget: 540000, spent: 512900, committed: 14500 },
  { no: 7, name: 'Water Management Committee strengthening', category: 'Programme activities', budget: 108000, spent: 66300, committed: 4800 },
  {
    no: 8, name: 'Monitoring, evaluation & learning', category: 'MEL', budget: 98000, spent: 29400, committed: 36000,
    lock: { by: 'Donor', reason: 'Ring-fenced by Halvorsen: the endline evaluation budget must stay intact (Award letter, Annex B §4).' },
  },
  {
    no: 9, name: 'Indirect costs (7% of direct)', category: 'Indirect', budget: 120000, spent: 87994, committed: 0,
    lock: { by: 'System', reason: 'Calculated automatically as 7% of direct spend. It moves on its own; it can never be a source or target.' },
  },
];

export const DONOR_THRESHOLD = 0.10;

export const existingDocs = [
  { id: 'd1', name: 'Turkana borehole condition assessment – Sep 2026.pdf', size: '4.2 MB', by: 'Joseph Ekai', date: '2 Oct 2026' },
  { id: 'd2', name: 'Borehole rehab BoQ – Lokichoggio & Kakuma sites.xlsx', size: '318 KB', by: 'Joseph Ekai', date: '19 Oct 2026' },
  { id: 'd3', name: 'Hygiene training revised workplan Q4.docx', size: '96 KB', by: 'Mercy Akai', date: '27 Oct 2026' },
  { id: 'd4', name: 'Halvorsen award letter & annexes (signed).pdf', size: '2.9 MB', by: 'Peter Owino', date: '18 Mar 2025' },
];

export const recentActivity = [
  { time: '10:31', text: 'Started a draft budget reallocation request', ref: 'RR-2026-047' },
  { time: '10:24', text: 'Viewed budget lines', ref: 'NRI-KE-2025-118' },
  { time: '10:19', text: 'Opened grant record', ref: 'NRI-KE-2025-118' },
];

export type OnboardingStep = { id: number; title: string; detail: string; status: 'done' | 'current' | 'todo'; when?: string };

export const onboardingSteps: OnboardingStep[] = [
  { id: 1, title: 'System access & role set-up', detail: 'Ledgerline account, Grants Officer role, Nairobi office grants.', status: 'done', when: 'Done Mon 9 Nov' },
  { id: 2, title: 'Policy acknowledgement', detail: 'NRI Grants Policy, Procurement Policy and Code of Conduct.', status: 'done', when: 'Done Tue 10 Nov' },
  { id: 3, title: 'Prepare a budget reallocation request (supervised)', detail: 'A real request on NRI-KE-2025-118, reviewed by Peter Owino.', status: 'current', when: 'In progress' },
  { id: 4, title: 'Review a donor financial report', detail: 'Check an interim report before it goes to the donor.', status: 'todo', when: 'Due Fri 20 Nov' },
  { id: 5, title: 'Donor compliance essentials (e-learning)', detail: '90-minute course with a short quiz at the end.', status: 'todo', when: 'Due Fri 27 Nov' },
  { id: 6, title: 'Shadow an award kick-off meeting', detail: 'Sit in on the start-up meeting for a newly signed grant.', status: 'todo', when: 'Week of 30 Nov' },
  { id: 7, title: 'Onboarding sign-off with your supervisor', detail: '30-minute conversation with Peter Owino.', status: 'todo', when: 'Fri 4 Dec' },
];

// ---------------------------------------------------------------- Glossary (34)

export type Term = { id: string; term: string; def: string; here?: string; related?: string[] };

export const glossary: Term[] = [
  { id: 'reallocation', term: 'Reallocation', def: 'Moving money between budget lines of a grant without changing the grant total, end date or objectives.', here: 'This request moves $85,000 from Line 4 to Line 6. The grant total stays $1,840,000.', related: ['amendment', 'revised-budget'] },
  { id: 'amendment', term: 'Amendment', def: 'A formal change to the signed award itself – e.g. a new total, a new end date or new objectives. It needs a signed amendment letter from the donor and takes longer than a reallocation.', here: 'You do not need an amendment: the total and end date are not changing.', related: ['reallocation', 'no-cost-extension'] },
  { id: 'variance-threshold', term: 'Variance threshold', def: 'The size of change, set by each donor, above which a budget move needs the donor’s permission. Usually expressed as a percentage of a budget line.', here: 'Halvorsen’s threshold is 10% of any line. Your move is 40.1% of Line 4, so it is over.', related: ['donor-prior-approval', 'cumulative-variance'] },
  { id: 'donor-prior-approval', term: 'Donor prior approval', def: 'Written permission from the donor that must be received before money is spent under the changed budget. Spending first and asking later can lead to a disallowance.', here: 'Required for this request. Peter Owino sends it to Halvorsen after Lucía Ferrer signs off.', related: ['variance-threshold', 'disallowance'] },
  { id: 'cost-category-lock', term: 'Cost category lock', def: 'A flag on a budget line that stops it being used as a source or target for reallocation. Locks are set by the donor (ring-fenced money) or by the system (calculated lines).', here: 'On this grant Line 8 (MEL) is donor-locked and Line 9 (Indirect) is system-locked. Lines 4 and 6 are open.', related: ['ring-fenced', 'indirect-costs'] },
  { id: 'ring-fenced', term: 'Ring-fenced', def: 'Money the donor has reserved for a specific purpose. It cannot be moved elsewhere without amending the award.', here: 'Line 8 is ring-fenced for the endline evaluation.', related: ['cost-category-lock'] },
  { id: 'budget-line', term: 'Budget line', def: 'One row of the donor-approved budget, e.g. “Borehole Rehabilitation”. Spending is tracked and reported against each line.', related: ['cost-category'] },
  { id: 'cost-category', term: 'Cost category', def: 'A group of similar budget lines, such as Personnel, Supplies or Works & construction. Some donors set rules per category rather than per line.', related: ['budget-line', 'cost-category-lock'] },
  { id: 'spent', term: 'Spent (actuals)', def: 'Money already paid and posted to the finance system against a line. Ledgerline refreshes actuals from finance at each month-end close.', here: 'Actuals on this grant are as of 31 Oct 2026.', related: ['committed', 'available'] },
  { id: 'committed', term: 'Committed', def: 'Money promised but not yet paid – signed purchase orders, contracts or accrued salaries. It is treated as already used when calculating what is available.', here: 'Line 6 has $14,500 committed to an open drilling contractor PO.', related: ['spent', 'available'] },
  { id: 'available', term: 'Available balance', def: 'Budget minus spent minus committed. You can only move money that is available.', here: 'Line 4 has $142,400 available, so $85,000 can come from it.', related: ['spent', 'committed'] },
  { id: 'burn-rate', term: 'Burn rate', def: 'How quickly a line is being spent, usually shown as average spend per month. Used to forecast whether a line will under- or overspend.', here: 'Line 4 has averaged about $3,200 a month since April 2025.', related: ['underspend', 'overspend'] },
  { id: 'underspend', term: 'Underspend', def: 'When a line is spending noticeably slower than planned. Donors often ask why, and unexplained underspends can lead to funds being cut.', related: ['burn-rate'] },
  { id: 'overspend', term: 'Overspend', def: 'Spending more on a line than its approved budget. Without approval, the excess can be disallowed by the donor.', here: 'Line 6 is 95% spent with 5 months left – that is why the move is needed.', related: ['disallowance'] },
  { id: 'indirect-costs', term: 'Indirect costs', def: 'A share of the grant that covers Northbridge’s central support costs (finance, HR, IT). Calculated as a fixed percentage of direct costs.', here: 'Halvorsen allows 7%. Moving money between direct lines does not change it.', related: ['direct-costs', 'cost-category-lock'] },
  { id: 'direct-costs', term: 'Direct costs', def: 'Costs that can be traced to this specific grant’s activities – staff, training, boreholes, kits.', related: ['indirect-costs'] },
  { id: 'cumulative-variance', term: 'Cumulative variance', def: 'The total of all moves in or out of a line over the grant’s life. Some donors apply their threshold to the running total rather than each request.', here: 'Halvorsen counts each request separately, but Line 3 and Line 5 already had one earlier move (RR-2025-031).', related: ['variance-threshold'] },
  { id: 'approval-route', term: 'Approval route', def: 'The fixed sequence of people who must approve a request before it takes effect. Ledgerline routes it automatically.', here: 'You → Peter Owino → Lucía Ferrer → Halvorsen Foundation → Finance posts the revised budget.', related: ['grants-manager', 'finance-controller'] },
  { id: 'grants-manager', term: 'Grants Manager', def: 'Leads the grants team for a region. Checks that requests are complete, justified and compliant, and is the usual contact with donors.', here: 'Peter Owino – your supervisor and the first approver.', related: ['approval-route'] },
  { id: 'finance-controller', term: 'Regional Finance Controller', def: 'Senior finance lead for the region. Confirms the numbers, balances and accounting impact before anything goes to a donor.', here: 'Lucía Ferrer – the second and final internal approver.', related: ['approval-route'] },
  { id: 'budget-holder', term: 'Budget holder', def: 'The programme manager responsible for spending on a grant. Grants Officers should check reallocations with them before submitting.', here: 'Joseph Ekai, WASH Programme Manager in Lodwar.', related: [] },
  { id: 'justification', term: 'Justification', def: 'The written explanation of why a budget change is needed. For donor-approved changes, it is copied into the letter sent to the donor.', here: 'Write it for Halvorsen’s programme officer, not just for Peter.', related: ['donor-prior-approval'] },
  { id: 'revised-budget', term: 'Revised budget', def: 'The updated version of the full budget showing every line before and after the change. Ledgerline generates it in the donor’s template.', related: ['reallocation'] },
  { id: 'grant-code', term: 'Grant code', def: 'Northbridge’s unique ID for an award: organisation, country, start year and sequence number.', here: 'NRI-KE-2025-118 = Northbridge Relief International, Kenya, 2025, award 118.', related: [] },
  { id: 'disallowance', term: 'Disallowance', def: 'When a donor refuses to pay for costs it considers ineligible – for example, money spent under a budget change it never approved. Northbridge then has to cover those costs from unrestricted funds.', related: ['donor-prior-approval', 'allowable-cost'] },
  { id: 'allowable-cost', term: 'Allowable cost', def: 'A cost the donor agreement permits the grant to pay for. It must be necessary, reasonable, within budget and properly documented.', related: ['disallowance'] },
  { id: 'audit-trail', term: 'Audit trail', def: 'The record Ledgerline keeps of who changed what, and when. Every save, submission and approval on this request is logged.', related: [] },
  { id: 'period-of-performance', term: 'Period of performance', def: 'The dates during which costs can be charged to a grant.', here: '1 Apr 2025 – 31 Mar 2027.', related: ['no-cost-extension'] },
  { id: 'no-cost-extension', term: 'No-cost extension', def: 'An amendment that extends the end date without adding money. Not the same as a reallocation.', related: ['amendment', 'period-of-performance'] },
  { id: 'reallocation-window', term: 'Reallocation window', def: 'The period in which a donor will accept budget change requests. Many donors close it in the final months of a grant.', here: 'Halvorsen stops accepting requests 90 days before the end date – from 1 Jan 2027.', related: ['reallocation'] },
  { id: 'restricted-funds', term: 'Restricted funds', def: 'Money that can only be used for the purpose the donor agreed. All donor grants in Ledgerline are restricted funds.', related: ['ring-fenced'] },
  { id: 'reporting-obligation', term: 'Reporting obligation', def: 'A report the award requires by a set date – financial, narrative or both. Ledgerline lists them on each grant’s Reporting tab.', here: 'Next for this grant: interim financial report due 31 Jan 2027.', related: [] },
  { id: 'donor-rules-summary', term: 'Donor rules summary', def: 'A one-page digest, maintained by the grants team, of each donor’s key rules. The signed award letter always takes precedence.', related: ['variance-threshold'] },
  { id: 'cost-share', term: 'Cost-share', def: 'Part of a project’s costs paid from another source, which some donors require and ask to see reported.', here: 'Halvorsen does not require cost-share on this award.', related: [] },
];

export const termById = Object.fromEntries(glossary.map((t) => [t.id, t])) as Record<string, Term>;

// ---------------------------------------------------------------- Articles (112)

export type Block = { h?: string; p?: string; list?: string[]; note?: string };
export type Article = { id: string; title: string; category: string; mins: number; summary: string; updated: string; body?: Block[] };

const A = (category: string, rows: [string, string][], updated = 'Sep 2026'): Article[] =>
  rows.map(([title, summary], i) => ({
    id: `${category.slice(0, 3).toLowerCase()}-${i + 1}`,
    title,
    category,
    mins: 2 + ((title.length + i) % 6),
    summary,
    updated,
  }));

const rawArticles: Article[] = [
  ...A('Getting started', [
    ['Your first week in Ledgerline: a checklist', 'What new Grants Officers usually set up and learn in their first five days.'],
    ['Navigating a grant record', 'Tabs on a grant – Overview, Budget, Requests, Reporting, Documents – and what each holds.'],
    ['Reading the budget lines table', 'What Budget, Spent, Committed and Available mean, and where the numbers come from.'],
    ['Saving, resuming and discarding drafts', 'Drafts save automatically. Find them under Requests → My drafts.'],
    ['Notifications and what they mean', 'Approval, return-for-changes and deadline alerts, and how to manage them.'],
    ['Setting your office and time zone', 'Deadlines and helpdesk response times are shown in your office’s local time.'],
    ['Searching grants, terms and articles', 'Use the top search bar for grant codes, glossary terms and help articles.'],
    ['Roles and permissions for Grants Officers', 'What you can create, edit and submit, and what needs a Grants Manager.'],
    ['Keyboard shortcuts', 'Move between sections and open the glossary without the mouse.'],
    ['Exporting a grant budget to Excel', 'Download the current or revised budget in Northbridge or donor format.'],
    ['Requesting access to another region’s grants', 'For cross-regional work, your Grants Manager can request temporary access.'],
    ['How to contact the Grants-Systems helpdesk', 'Raise a ticket from any screen; Ledgerline attaches the page you are on.'],
  ]),
  ...A('Budgets & reallocations', [
    ['Reallocation vs. Amendment', 'When moving money is a reallocation, and when it becomes a formal amendment.'],
    ['Variance thresholds explained', 'How thresholds work, how Ledgerline calculates the percentage, and common traps.'],
    ['Understanding cost category locks', 'Why some lines cannot be a source or target, and who can lift a lock.'],
    ['Your first budget reallocation: step by step', 'A walk-through of the draft, checks, approvals and donor stage.'],
    ['Writing a reallocation justification donors accept', 'Structure, tone and evidence that programme officers look for.'],
    ['Spent, committed and available: how balances are calculated', 'Why available balance excludes open purchase orders and accrued salaries.'],
    ['Cumulative reallocations across a grant’s life', 'Which donors add up past moves when applying their threshold.'],
    ['Moving funds between personnel and non-personnel lines', 'Extra checks HR and Finance apply when staff costs change.'],
    ['Why indirect cost lines can’t be edited', 'Indirect costs follow direct spend automatically at the agreed rate.'],
    ['Reallocating in the final months of a grant', 'Reallocation windows and why late requests are often refused.'],
    ['Reading burn rate and underspend flags', 'How Ledgerline flags lines that are spending too slowly or too fast.'],
    ['Splitting one reallocation across several lines', 'Moving from one line to several, or several to one, in a single request.'],
    ['Withdrawing or editing a submitted request', 'You can withdraw until the first approver acts; after that, ask them to return it.'],
    ['What happens to the budget after donor approval', 'Finance posts the revised budget and the new figures appear within one working day.'],
    ['Currency, exchange rates and budget lines in KES', 'Budgets are held in donor currency; KES spend converts at the monthly rate.'],
    ['Reallocations on multi-donor (co-funded) activities', 'Keeping each donor’s share consistent when an activity has two funders.'],
  ]),
  ...A('Donor rules', [
    ['Halvorsen Foundation donor rules summary', 'Thresholds, locks, approval timing and reporting for Halvorsen awards.'],
    ['Halvorsen Foundation: reporting calendar and templates', 'Interim and final report dates and the templates Halvorsen expects.'],
    ['Halvorsen Foundation: communicating with the programme officer', 'Who sends what, and why all formal requests go through the Grants Manager.'],
    ['Meridian Water Trust donor rules summary', '15% threshold per cost category; quarterly financial reporting.'],
    ['Aldgate Humanitarian Fund donor rules summary', 'Prior approval for any move over $25,000 or 10%, whichever is lower.'],
    ['Kestrel Family Foundation donor rules summary', 'Flexible budget; notification (not approval) for moves under 20%.'],
    ['Nordvik Development Agency donor rules summary', 'Cumulative 10% threshold; equipment needs separate prior approval.'],
    ['Sable Ridge Foundation donor rules summary', 'No reallocations in the final six months; annual audited statements.'],
    ['Comparing variance thresholds across our donors', 'A side-by-side table of thresholds and how each is measured.'],
    ['Donors that require prior approval for any equipment purchase', 'Which awards need approval for items above a unit-cost limit.'],
    ['Visibility and branding requirements by donor', 'Logos, signage at water points and publication rules.'],
    ['Donor rules on staff time allocation', 'Timesheet and level-of-effort evidence for staff charged to grants.'],
    ['Which donors allow no-cost extensions', 'Notice periods and how many extensions each donor allows.'],
    ['Donor rules on cash and voucher assistance', 'Eligibility, ceilings and reporting for cash programming.'],
    ['Donor rules on sub-grants to local partners', 'When sub-grants need approval and what flows down to partners.'],
    ['Where to find the signed award letter and annexes', 'Every grant’s Documents tab holds the signed award – the final word on rules.'],
    ['When the award letter and the donor rules summary disagree', 'The signed award always wins; tell the grants team so the summary is fixed.'],
    ['Requesting a rule clarification from a donor', 'How to phrase questions and who sends them.'],
  ]),
  ...A('Approvals & workflow', [
    ['Who approves what: internal approval routes', 'The approvers for each request type and when the donor is added.'],
    ['What the Grants Manager checks', 'Completeness, compliance and whether the justification will satisfy the donor.'],
    ['Regional Finance Controller sign-off: what is reviewed', 'Balances, commitments, accounting impact and the revised budget file.'],
    ['Sending a donor prior approval request', 'How the Grants Manager packages and sends a request, and how replies are logged.'],
    ['Tracking a request through the approval route', 'Reading the route tracker and the request history.'],
    ['When an approver returns a request for changes', 'Comments, edits and resubmitting without starting over.'],
    ['Delegated approvals during leave', 'Who approves when Peter Owino or Lucía Ferrer are away.'],
    ['Approval turnaround times by step', 'Typical times for each approver and for each major donor.'],
    ['Escalating an urgent request', 'When a deadline is at risk, and how to flag it properly.'],
    ['Recording donor approval letters in Ledgerline', 'Uploading the signed letter so Finance can post the change.'],
  ]),
  ...A('Reporting', [
    ['Reporting obligations: how Ledgerline tracks them', 'The Reporting tab, reminders, and who owns each report.'],
    ['Preparing a donor financial report', 'From the Ledgerline extract to the donor template, step by step.'],
    ['Reconciling actuals with the general ledger', 'Checking that report figures match the finance system.'],
    ['Explaining budget variances in financial reports', 'How to write variance notes donors accept.'],
    ['Narrative and financial reports: keeping them consistent', 'Making activity numbers and spending tell the same story.'],
    ['Interim vs. final reports', 'What changes at close-out and the extra evidence final reports need.'],
    ['Report deadlines and the reporting calendar', 'Regional calendar of all due reports and internal review dates.'],
    ['Requesting a report deadline extension', 'Who asks, how early, and what to include.'],
    ['Attaching supporting evidence to reports', 'Which documents donors ask for and how to label them.'],
    ['Indicator tracking and output reporting', 'Linking budget lines to the outputs they pay for.'],
    ['Reporting in donor currency vs. local currency', 'Exchange-rate differences and how to explain them.'],
    ['Common reasons donors return financial reports', 'Arithmetic gaps, unexplained variances and missing approvals.'],
    ['Final report and grant close-out checklist', 'Everything due in the last 90 days of a grant.'],
    ['Beneficiary numbers: counting and avoiding double-counting', 'Consistent rules for people reached across activities.'],
    ['Reporting on reallocated budget lines', 'Showing original and revised budgets side by side.'],
    ['Report review: who signs before submission', 'Internal sign-off for financial and narrative reports.'],
  ]),
  ...A('Procurement & compliance', [
    ['Procurement thresholds and quotation requirements', 'Number of quotes and tender rules by purchase value.'],
    ['Allowable and unallowable costs', 'The tests a cost must pass, with common examples from the field.'],
    ['Anti-fraud and safeguarding clauses in donor agreements', 'Reporting duties and timelines when concerns arise.'],
    ['Counter-terrorism and sanctions screening of suppliers', 'Screening steps before contracts are signed.'],
    ['Asset registers and equipment disposal', 'Tagging assets bought with grant money and disposing of them at close-out.'],
    ['Construction and rehabilitation contracts: compliance points', 'Bills of quantities, site supervision and retention payments.'],
    ['Single-source procurement justifications', 'When one supplier is acceptable and how to document it.'],
    ['Travel and per diem rules on grant budgets', 'Rates, approvals and evidence for staff travel.'],
    ['Conflicts of interest declarations', 'When to declare and how declarations are stored.'],
    ['Document retention periods', 'How long grant records must be kept, by donor.'],
    ['Cost-share and match funding documentation', 'Evidence needed when a donor requires cost-share.'],
    ['Charging shared costs to grants', 'Allocation methods for rent, vehicles and shared staff.'],
    ['Vehicle costs and fleet allocation', 'Logbooks and mileage-based charging.'],
    ['Sub-grant due diligence for local partners', 'Capacity assessments and pre-award checks.'],
  ]),
  ...A('Audits & disallowances', [
    ['Preparing for a donor audit', 'Documents to gather and how to set up the audit room.'],
    ['What is a disallowance and how to avoid one', 'The most common causes – most of them preventable.'],
    ['Responding to audit findings', 'Management responses, deadlines and follow-up.'],
    ['Internal audit: what to expect', 'Scope, sampling and timelines for Northbridge internal audit.'],
    ['Common audit findings in WASH programmes', 'Contractor payments, retention and site evidence.'],
    ['Audit trail: what Ledgerline records automatically', 'Every save, submission and approval is time-stamped.'],
    ['Managing costs incurred before donor approval', 'Why spending under an unapproved budget is a risk.'],
    ['Recovering disallowed costs', 'What happens financially when a donor refuses a cost.'],
    ['Spot checks by donors', 'Short-notice visits and how to prepare.'],
    ['Lessons from past disallowances in the region', 'Anonymised cases from East Africa, 2021–2025.'],
  ]),
  ...A('Grant lifecycle', [
    ['Grant lifecycle at Northbridge: from proposal to close-out', 'The stages of a grant and who leads each one.'],
    ['Award set-up: entering a new grant in Ledgerline', 'Budget lines, locks, reporting dates and documents.'],
    ['Grant kick-off meetings', 'Agenda and outputs of the start-up meeting with programme teams.'],
    ['Requesting a no-cost extension', 'Notice periods and the evidence donors want.'],
    ['Requesting a grant amendment', 'When an amendment is needed and how long it usually takes.'],
    ['Mid-term budget reviews', 'Spotting under- and overspends early enough to act.'],
    ['Grant close-out: final steps', 'Final reports, asset disposal and closing the grant code.'],
    ['Handling a donor-initiated budget cut', 'Re-planning activities when funding is reduced.'],
    ['Grant transfers between offices', 'Moving responsibility for an award to another office.'],
    ['Archiving a closed grant', 'What stays searchable after close-out.'],
  ]),
  ...A('From programmes to grants', [
    ['Moving from programmes to grants: what changes', 'For staff joining the grants team from field programme roles.'],
    ['Translating field realities into donor language', 'Turning what happened on the ground into a clear justification.'],
    ['Working with budget holders in field offices', 'Agreeing changes with programme managers before you submit.'],
    ['Reading a donor award letter for the first time', 'The clauses that matter most day to day.'],
    ['Grants and programme teams: who does what', 'Responsibilities across planning, spending and reporting.'],
    ['Questions to ask your supervisor in your first month', 'A starter list from other new Grants Officers.'],
  ], 'Oct 2026'),
];

const bodies: Record<string, Block[]> = {
  'Reallocation vs. Amendment': [
    { p: 'Both change how a grant’s money is used, but they are different processes with different approvers and timelines.' },
    { h: 'It is a reallocation when…', list: ['The grant total stays the same.', 'The end date stays the same.', 'The objectives and target groups stay the same.', 'You are only moving money between existing budget lines.'] },
    { h: 'It becomes an amendment when…', list: ['The total award changes (up or down).', 'The end date changes – including no-cost extensions.', 'You add a new budget line, activity or location not in the award.', 'You need to move money out of a ring-fenced (locked) line.'] },
    { h: 'Why it matters', p: 'A reallocation is handled in Ledgerline by Grants and Finance, with donor approval only if a threshold is crossed. An amendment needs a signed amendment letter from the donor and usually takes 6–10 weeks.' },
    { note: 'For NRI-KE-2025-118: moving money from Line 4 to Line 6 is a reallocation. Total, dates and objectives are unchanged, and neither line is locked.' },
  ],
  'Halvorsen Foundation donor rules summary': [
    { p: 'Summary of the rules that apply to all current Halvorsen Foundation awards. The signed award letter takes precedence if anything differs.' },
    { h: 'Budget changes', list: ['Moves over 10% of any budget line need prior written approval from Halvorsen – check both the line losing money and the line receiving it.', 'Moves of 10% or less: no approval needed, but list them in the next financial report.', 'Each request is assessed on its own; Halvorsen does not add up past moves.', 'Requests are not accepted in the final 90 days of the grant.'] },
    { h: 'Locked lines', list: ['Monitoring, evaluation & learning lines are ring-fenced. Changing them needs an amendment.', 'Indirect costs are capped at 7% of direct costs.'] },
    { h: 'Approval timing', list: ['Halvorsen aims to reply within 15 business days.', 'Requests must come from the Grants Manager, not from Grants Officers or programme staff.', 'Do not spend under the new budget until the written approval is uploaded to Ledgerline.'] },
    { h: 'What Halvorsen asks to see', list: ['A plain-language justification: what changed, why, and the effect on beneficiaries.', 'The revised budget in Halvorsen’s template (Ledgerline generates this).', 'For works and construction: a technical assessment or bill of quantities.'] },
    { note: 'Programme Officer for NRI-KE-2025-118: Ingrid Solberg. Contact goes through Peter Owino.' },
  ],
  'Variance thresholds explained': [
    { p: 'A variance threshold is the line between changes Northbridge can make on its own and changes the donor must agree to first.' },
    { h: 'How Ledgerline calculates it', p: 'Amount moved ÷ the original approved budget of the line. Ledgerline checks both the line losing money and the line receiving it, and uses the higher percentage.' },
    { h: 'Common traps', list: ['Using the available balance instead of the full line budget as the base.', 'Checking only the line losing money.', 'Splitting one change into several small requests to stay under the threshold. Donors treat this as a compliance breach.'] },
    { note: 'Example: $85,000 from Line 4 ($212,000) is 40.1%. $85,000 into Line 6 ($540,000) is 15.7%. Both are over Halvorsen’s 10%.' },
  ],
  'Understanding cost category locks': [
    { p: 'A lock stops a budget line from being used in a reallocation, either as the source or the target. Locked lines are shown with a padlock in the budget table.' },
    { h: 'Donor locks', p: 'Set when the award ring-fences money – most often evaluations, audits or specific equipment. Only an amendment can change these lines.' },
    { h: 'System locks', p: 'Set on calculated lines, such as indirect costs, which follow direct spending automatically.' },
    { h: 'Who can lift a lock', p: 'Nobody can lift a lock in Ledgerline from inside a request. Donor locks change only after a signed amendment is uploaded by the Grants Manager.' },
  ],
  'Your first budget reallocation: step by step': [
    { h: '1. Choose lines and amount', p: 'Pick the line giving money and the line receiving it. Ledgerline shows what is available and how big the change is against each line.' },
    { h: '2. Read the compliance check', p: 'Ledgerline checks the donor’s threshold, locks, timing and indirect costs. If donor approval is needed, it adds the donor to the route.' },
    { h: '3. Write the justification', p: 'Explain the underspend, the need, and the effect on beneficiaries. If donor approval is needed, this text goes to the donor.' },
    { h: '4. Attach evidence', p: 'The revised budget is generated for you. Add the technical evidence the donor expects.' },
    { h: '5. Send for review', p: 'Your Grants Manager reviews first, then the Regional Finance Controller. Either may return it with comments – that is normal on a first request.' },
    { note: 'Tip: talk to the budget holder (here, Joseph Ekai in Lodwar) before you submit. Approvers will ask whether the programme team agrees.' },
  ],
  'Writing a reallocation justification donors accept': [
    { p: 'Programme officers read many requests. The ones approved quickly answer three questions plainly, with numbers.' },
    { h: 'Why is money left on the source line?', p: 'Say what actually happened – a cheaper approach, delays, a partner taking over part of the work. Give figures.' },
    { h: 'Why does the receiving line need more?', p: 'Describe the need, the evidence (assessments, quotes) and what happens if it is not funded.' },
    { h: 'What is the effect on results?', p: 'Confirm whether targets change. If the source activity still reaches its targets, say so.' },
    { h: 'Avoid', list: ['Internal jargon and acronyms the donor will not know.', '“Due to operational reasons” without saying what they were.', 'Promising results the remaining budget cannot deliver.'] },
  ],
  'Who approves what: internal approval routes': [
    { p: 'Ledgerline routes each request automatically. Approvers act in order; the next person is notified only when the previous step is complete.' },
    { h: 'Budget reallocation – East Africa region', list: ['1. Grants Officer prepares and submits (you).', '2. Grants Manager reviews – Peter Owino.', '3. Regional Finance Controller signs off – Lucía Ferrer.', '4. Donor prior approval, only if a threshold is crossed – sent by the Grants Manager.', '5. Finance posts the revised budget in Ledgerline.'] },
    { h: 'If someone is away', p: 'Delegates are set in Ledgerline. The route tracker shows the delegate’s name automatically.' },
  ],
};

export const articles: Article[] = rawArticles.map((a) => ({ ...a, body: bodies[a.title], updated: bodies[a.title] ? 'Oct 2026' : a.updated }));

export const articleByTitle = (t: string) => articles.find((a) => a.title === t)!;

// ---------------------------------------------------------------- Section guide content

export type SectionId = 'lines' | 'compliance' | 'justification' | 'documents' | 'review';

export const sections: { id: SectionId; label: string }[] = [
  { id: 'lines', label: 'Lines & amount' },
  { id: 'compliance', label: 'Compliance check' },
  { id: 'justification', label: 'Justification' },
  { id: 'documents', label: 'Supporting documents' },
  { id: 'review', label: 'Review & send' },
];

export const guide: Record<SectionId, { what: string; watch: string[]; terms: string[]; articles: string[] }> = {
  lines: {
    what: 'Pick the line giving money (Move from) and the line receiving it (Move to), then the amount. Ledgerline only lets you move money that is still available.',
    watch: [
      'Available = budget − spent − committed. Open purchase orders already count as used.',
      'Padlocked lines can’t be a source or target. On this grant that’s Line 8 and Line 9.',
      'The percentage that matters is the amount moved ÷ the line’s full budget – on both lines.',
    ],
    terms: ['available', 'committed', 'cost-category-lock', 'variance-threshold'],
    articles: ['Reallocation vs. Amendment', 'Spent, committed and available: how balances are calculated', 'Variance thresholds explained'],
  },
  compliance: {
    what: 'Ledgerline checks your numbers against Halvorsen’s rules and the award. Nothing here is a mistake on your part – it tells you which approvals the request needs.',
    watch: [
      'Amber means “extra approval needed”, not “blocked”. Red means the request can’t go ahead as it is.',
      'Over 10% on any line adds Halvorsen to the approval route.',
      'Don’t split one change into several small requests to stay under 10% – donors treat that as a breach.',
    ],
    terms: ['donor-prior-approval', 'variance-threshold', 'reallocation-window', 'indirect-costs'],
    articles: ['Halvorsen Foundation donor rules summary', 'Variance thresholds explained', 'Understanding cost category locks'],
  },
  justification: {
    what: 'Because Halvorsen must approve this request, these three answers are copied into the letter Peter sends to their programme officer. Write for someone who has never been to Turkana.',
    watch: [
      'You know the field story – use it. Concrete reasons and numbers get approved faster.',
      'Say whether the hygiene training targets are still met after the move.',
      'Avoid internal shorthand (e.g. “WMCs”, “CHVs”) or spell it out the first time.',
    ],
    terms: ['justification', 'underspend', 'burn-rate'],
    articles: ['Writing a reallocation justification donors accept', 'Translating field realities into donor language'],
  },
  documents: {
    what: 'Attach the evidence approvers and Halvorsen will ask for. The revised budget is generated for you in Halvorsen’s template.',
    watch: [
      'Halvorsen asks for a technical assessment or bill of quantities for works and construction.',
      'You can attach files that are already on the grant record – no need to download and re-upload.',
    ],
    terms: ['revised-budget', 'audit-trail'],
    articles: ['Construction and rehabilitation contracts: compliance points', 'Halvorsen Foundation donor rules summary'],
  },
  review: {
    what: 'Check the summary and send it to Peter Owino. He reviews first, then Lucía Ferrer. Being returned with comments is normal on a first request.',
    watch: [
      'You can withdraw the request until Peter starts his review.',
      'Don’t let the field team spend under the new budget until Halvorsen’s written approval is uploaded.',
      'Let Joseph Ekai (budget holder) know it has been submitted.',
    ],
    terms: ['approval-route', 'grants-manager', 'finance-controller', 'disallowance'],
    articles: ['Who approves what: internal approval routes', 'What the Grants Manager checks', 'Withdrawing or editing a submitted request'],
  },
};

export const justificationPrompts = [
  {
    key: 'underspend' as const,
    label: 'Why is Line 4 (Community Hygiene Training) underspent?',
    hint: 'What happened in the field? Delays, a cheaper approach, a partner covering part of the work? Give figures if you can.',
    example: 'Hygiene promotion sessions in Marsabit were delivered by 120 trained community health promoters instead of contracted facilitators, as agreed with the County Health Department in month 6. This reduced the cost per session from $46 to $14 while reaching 9,800 of the 10,500 planned participants by month 18.',
  },
  {
    key: 'need' as const,
    label: 'Why does Line 6 (Borehole Rehabilitation) need more?',
    hint: 'What is the need, what evidence shows it, and what happens if it isn’t funded?',
    example: 'The September 2026 condition assessment found that 4 of the 11 boreholes rehabilitated in year one need replacement solar pumping systems after flood damage in May 2026. Without these works, about 6,200 people would return to unprotected water sources during the dry season.',
  },
  {
    key: 'impact' as const,
    label: 'What is the effect on targets and beneficiaries?',
    hint: 'Do the targets for either activity change? Who benefits from the move?',
    example: 'The hygiene training target (10,500 participants) is unchanged and will be met with the remaining budget. The water access target rises from 38,000 to 44,200 people, as the repaired boreholes return to service before the dry season.',
  },
];

export const helpdeskTopics = [
  'Understanding a rule or check',
  'Something in Ledgerline isn’t working',
  'Access or permissions',
  'Numbers look wrong (balances, actuals)',
  'Approval route or approvers',
  'Other',
];
