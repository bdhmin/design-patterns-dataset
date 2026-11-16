// Explore one running repo app and choose the views to capture.
//
// A browser agent (config/repos.yaml `explorer`, run through the same
// providers as the raters) drives a live page with look / read_page / act /
// goto tools. Every action is recorded as a replayable step
// (src/pipeline/steps.ts). save_view replays the steps since the last goto
// (after the sign-in prelude, if one was marked) in a fresh browser and
// compares the result with the agent's screen; a view that does not replay
// is refused, so every saved view is a state capture and the raters can
// reach again.
//
// repos/<batch>/<slug>/
//   explore.json              views (path + steps), summary, agent outcome
//   explore.transcript.jsonl  the agent's tool calls
//   views/<view>.png          each view as replayed

import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page } from 'playwright';
import { openPage } from '../pipeline/capture.ts';
import { providerFor, type AgentOutcome, type ImagePart, type RaterConfig, type ToolResult, type ToolSpec } from '../pipeline/provider.ts';
import { writeJson } from '../pipeline/sites.ts';
import { appUrl, describeStep, replaySteps, runStep, settle, targetSchema, type Step, type Target } from '../pipeline/steps.ts';
import { usageGate, UsageLimitError } from '../pipeline/usage-limit.ts';
import type { AppJson } from './apps.ts';
import type { RepoEntry } from './frame.ts';

export interface SavedView {
  slug: string;
  name: string;
  description: string;
  /** The first goto: the site URL is the app's base URL + this path. */
  path: string;
  /** Replayed after loading `path` (may include the sign-in prelude and further gotos). */
  steps: Step[];
  title: string;
  /** Word-set Jaccard between the replayed page and the explorer's page. */
  similarity: number;
  preview: string;
}

export interface ExploreRecord {
  batch: string;
  slug: string;
  ok: boolean;
  error?: string;
  entry: string;
  views: SavedView[];
  summary?: string;
  explorer: { provider: string; model: string; effort?: string };
  outcome?: AgentOutcome;
  actions: number;
  startedAt: string;
  finishedAt: string;
}

const SIMILAR_ENOUGH = 0.75;
const DUPLICATE = 0.92;

// ------------------------------------------------------------------- tools

export function explorerToolSpecs(maxViews: number): ToolSpec[] {
  return [
    {
      name: 'look',
      description: 'Screenshot of the current viewport (1440x900) with the URL, title and recording state. Pass y to scroll the window there first (not recorded; views are captured full-page anyway).',
      input_schema: { type: 'object', properties: { y: { type: 'number', minimum: 0 } }, additionalProperties: false },
    },
    {
      name: 'read_page',
      description: 'The accessibility tree of the current page: roles and accessible names to use as act targets, plus text and structure the screenshot may hide (menus, hidden panels).',
      input_schema: { type: 'object', properties: { offset: { type: 'integer', minimum: 0 }, limit: { type: 'integer', minimum: 20, maximum: 600 } }, additionalProperties: false },
    },
    {
      name: 'act',
      description: 'Interact with the page; the action is recorded as a step of the current view. Returns a screenshot afterwards. Semantic targets scroll into view by themselves.',
      input_schema: {
        type: 'object',
        properties: {
          action: { enum: ['click', 'dblclick', 'hover', 'fill', 'select', 'press', 'wait'] },
          target: targetSchema as unknown as Record<string, unknown>,
          value: { type: 'string', description: 'fill: text to enter; select: option label or value.' },
          key: { type: 'string', description: 'press: key or chord, e.g. Enter, Escape, Control+K. With a target, pressed in that element.' },
          ms: { type: 'integer', minimum: 0, maximum: 10000, description: 'wait: milliseconds.' },
        },
        required: ['action'],
        additionalProperties: false,
      },
    },
    {
      name: 'goto',
      description: 'Open a path on the app (e.g. /projects/3). Starts recording a new view from that path; earlier steps are dropped (the sign-in prelude is kept).',
      input_schema: { type: 'object', properties: { path: { type: 'string', pattern: '^/' } }, required: ['path'], additionalProperties: false },
    },
    {
      name: 'mark_signed_in',
      description: 'Call once after signing in: everything recorded so far becomes the prelude replayed before every view.',
      input_schema: { type: 'object', properties: {}, additionalProperties: false },
    },
    {
      name: 'save_view',
      description: `Save the current screen as a view (at most ${maxViews}). The harness replays your recorded steps in a fresh browser and checks that it reaches this same screen; if not, it returns the replayed screenshot so you can fix the steps.`,
      input_schema: {
        type: 'object',
        properties: {
          slug: { type: 'string', pattern: '^[a-z0-9]+(-[a-z0-9]+)*$', maxLength: 30, description: 'kebab-case, e.g. inbox, invoice-detail, editor.' },
          name: { type: 'string', description: 'Short human name, e.g. "Invoice detail".' },
          description: { type: 'string', description: 'One sentence: what the screen is for and what is on it.' },
        },
        required: ['slug', 'name', 'description'],
        additionalProperties: false,
      },
    },
    {
      name: 'finish',
      description: 'End exploration. summary: what the app is, which views you saved and why, and anything you could not reach.',
      input_schema: { type: 'object', properties: { summary: { type: 'string' } }, required: ['summary'], additionalProperties: false },
    },
  ];
}

export interface ExplorerContext {
  browser: Browser;
  /** The app's base URL (http://<slug>.localhost:<port>/ or http://localhost:<port>/). */
  base: string;
  entry: string;
  maxViews: number;
  maxActions: number;
  viewsDir: string;
}

export class ExplorerTools {
  views: SavedView[] = [];
  summary?: string;
  actions = 0;
  private page?: Page;
  private prelude: Step[] = [];
  private basePath: string;
  private steps: Step[] = [];
  private signatures = new Map<string, Signature>();
  private ctx: ExplorerContext;

  constructor(ctx: ExplorerContext) {
    this.ctx = ctx;
    this.basePath = ctx.entry;
  }

  get origin(): string { return new URL(this.ctx.base).origin; }

  /** The full replay for the current state: [goto, ...]. */
  recording(): Step[] { return [...this.prelude, { action: 'goto', path: this.basePath }, ...this.steps]; }

  async open(): Promise<ImagePart> {
    this.page = await openPage(this.ctx.browser);
    await runStep(this.page, this.origin, { action: 'goto', path: this.ctx.entry });
    return this.shot();
  }

  async close(): Promise<void> { await this.page?.context().close().catch(() => {}); }

  async execute(name: string, input: any): Promise<ToolResult> {
    if (!this.page) await this.open();
    try {
      switch (name) {
        case 'look': return await this.look(input);
        case 'read_page': return await this.readPage(input);
        case 'act': return await this.act(input);
        case 'goto': return await this.goto(input);
        case 'mark_signed_in': return this.markSignedIn();
        case 'save_view': return await this.saveView(input);
        case 'finish': return this.finish(input);
        default: return { text: `Unknown tool "${name}"`, isError: true };
      }
    } catch (e) {
      return { text: `${name} failed: ${(e as Error).message.split('\n')[0]}`, isError: true };
    }
  }

  private async shot(page = this.page!): Promise<ImagePart> {
    return { mediaType: 'image/jpeg', data: (await page.screenshot({ type: 'jpeg', quality: 70 })).toString('base64') };
  }

  private state(): string {
    const p = this.page!;
    const u = new URL(p.url());
    return `URL ${u.pathname}${u.search}${u.hash}. Recording: ${this.prelude.length ? `sign-in prelude (${this.prelude.length} steps), then ` : ''}goto ${this.basePath}${this.steps.length ? ` + ${this.steps.length} step(s): ${this.steps.map(describeStep).join(' → ')}` : ''}. Views saved: ${this.views.map((v) => v.slug).join(', ') || 'none'} (${this.views.length}/${this.ctx.maxViews}). Actions left: ${this.ctx.maxActions - this.actions}.`;
  }

  private async look(input: { y?: number }): Promise<ToolResult> {
    const p = this.page!;
    if (input.y !== undefined) {
      await p.evaluate((y) => window.scrollTo(0, y), input.y);
      await p.waitForTimeout(300);
    }
    const { sy, h } = await p.evaluate(() => ({ sy: window.scrollY, h: document.documentElement.scrollHeight }));
    return { text: `"${await p.title()}" — viewport shows y ${Math.round(sy)}–${Math.round(sy) + 900} of ${h}px. ${this.state()}`, images: [await this.shot()] };
  }

  private async readPage(input: { offset?: number; limit?: number }): Promise<ToolResult> {
    const lines = (await this.page!.locator('body').ariaSnapshot({ timeout: 15_000 })).split('\n');
    const offset = input.offset ?? 0;
    const limit = input.limit ?? 250;
    return { text: `Lines ${offset}–${Math.min(lines.length, offset + limit) - 1} of ${lines.length}:\n${lines.slice(offset, offset + limit).join('\n')}` };
  }

  private budget(): ToolResult | undefined {
    if (this.actions >= this.ctx.maxActions) return { text: `The action budget (${this.ctx.maxActions}) is used up. Save what you have and finish.`, isError: true };
    this.actions++;
    return undefined;
  }

  private async act(input: { action: Step['action']; target?: Target; value?: string; key?: string; ms?: number }): Promise<ToolResult> {
    const over = this.budget();
    if (over) return over;
    const step: Step = { action: input.action, ...(input.target ? { target: input.target } : {}), ...(input.value !== undefined ? { value: input.value } : {}), ...(input.key ? { key: input.key } : {}), ...(input.ms !== undefined ? { ms: input.ms } : {}) };
    if (step.target && 'x' in step.target) {
      const sy = await this.page!.evaluate(() => window.scrollY);
      if (sy > 0) return { text: 'Coordinate targets replay only with the window at the top. Call look with y: 0 first, or use a semantic target (it scrolls into view by itself).', isError: true };
    }
    const r = await runStep(this.page!, this.origin, step);
    this.steps.push(step);
    const many = r.matched && r.matched > 1 ? ` ${r.matched} elements matched this target; used #${step.target && 'nth' in step.target ? step.target.nth ?? 0 : 0}. If that was not the one you meant, make the target more specific.` : '';
    return { text: `Done: ${describeStep(step)}.${many} ${this.state()}`, images: [await this.shot()] };
  }

  private async goto(input: { path: string }): Promise<ToolResult> {
    const over = this.budget();
    if (over) return over;
    const step: Step = { action: 'goto', path: input.path };
    await runStep(this.page!, this.origin, step);
    this.basePath = input.path;
    this.steps = [];
    return { text: `Opened ${input.path}. ${this.state()}`, images: [await this.shot()] };
  }

  private markSignedIn(): ToolResult {
    const u = new URL(this.page!.url());
    this.prelude = this.recording();
    this.basePath = `${u.pathname}${u.search}${u.hash}`;
    this.steps = [];
    return { text: `Prelude recorded (${this.prelude.length} steps); it runs before every view. ${this.state()}` };
  }

  private async saveView(input: { slug: string; name: string; description: string }): Promise<ToolResult> {
    if (this.views.length >= this.ctx.maxViews) return { text: `Already ${this.ctx.maxViews} views; finish now.`, isError: true };
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.slug) || input.slug.length > 30) return { text: 'slug must be kebab-case, at most 30 characters', isError: true };
    if (this.views.some((v) => v.slug === input.slug)) return { text: `A view "${input.slug}" already exists; choose another slug.`, isError: true };
    const recording = this.recording();
    const mine = await signature(this.page!);

    // Replay in a fresh browser context, exactly as capture will.
    const fresh = await openPage(this.ctx.browser);
    let theirs: Signature;
    const preview = path.join(this.ctx.viewsDir, `${input.slug}.png`);
    try {
      await fresh.goto(appUrl(this.origin, recording[0].path!), { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await settle(fresh, 800);
      await replaySteps(fresh, this.origin, recording.slice(1));
      theirs = await signature(fresh);
      fs.mkdirSync(this.ctx.viewsDir, { recursive: true });
      await fresh.screenshot({ path: preview });
    } catch (e) {
      const img = await this.shot(fresh).catch(() => undefined);
      await fresh.context().close().catch(() => {});
      return { text: `Replay failed: ${(e as Error).message.split('\n')[0]}. Fix the steps (goto the screen again and use stabler targets) and save again.`, images: img ? [img] : undefined, isError: true };
    }
    const img = await this.shot(fresh);
    await fresh.context().close().catch(() => {});

    const sim = jaccard(mine.words, theirs.words);
    if (mine.path !== theirs.path || sim < SIMILAR_ENOUGH) {
      fs.rmSync(preview, { force: true });
      return {
        text: `The replay did not reach this screen (yours: ${mine.path}; replay: ${theirs.path}; text similarity ${sim.toFixed(2)}, need ${SIMILAR_ENOUGH}). The replayed screen is attached. Adjust the steps — a wait for slow content, a more specific target, or goto a URL closer to the view — and save again.`,
        images: [img], isError: true,
      };
    }
    for (const v of this.views) {
      const other = this.signatures.get(v.slug)!;
      const d = jaccard(other.words, theirs.words);
      if (other.path === theirs.path && d > DUPLICATE) {
        fs.rmSync(preview, { force: true });
        return { text: `This looks the same as view "${v.slug}" (same URL, text similarity ${d.toFixed(2)}). Save screens that differ in what the interface shows.`, isError: true };
      }
    }
    const view: SavedView = {
      slug: input.slug, name: input.name, description: input.description,
      path: recording[0].path!, steps: recording.slice(1), title: theirs.title, similarity: Math.round(sim * 1000) / 1000,
      preview: `views/${input.slug}.png`,
    };
    this.views.push(view);
    this.signatures.set(view.slug, theirs);
    return { text: `Saved view "${view.slug}" (${view.steps.length} replay steps, similarity ${sim.toFixed(2)}). ${this.state()}`, images: [img] };
  }

  private finish(input: { summary: string }): ToolResult {
    this.summary = input.summary;
    return { text: 'Exploration finished.', stop: true };
  }
}

interface Signature { path: string; title: string; words: Set<string> }

async function signature(page: Page): Promise<Signature> {
  const u = new URL(page.url());
  const text = await page.evaluate(() => document.body?.innerText ?? '');
  // The hash too: hash-routed apps (#/inbox, #/settings) change screens there.
  return { path: `${u.pathname}${u.search}${u.hash}`, title: await page.title(), words: new Set(text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1).slice(0, 8000)) };
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

// ------------------------------------------------------------------ prompt

export function explorerSystem(maxViews: number, maxActions: number): string {
  return `You explore a locally running open-source web application and choose which of its screens get captured for a research dataset of UI design patterns. Each screen you save is screenshotted in full at 1440x900 and coded by independent raters, so choose screens that show the app's interface the way people actually use it.

# What to save (up to ${maxViews} views)
- A view is one screen or state of the app: the main workspace with its content, a list and a detail page, an editor with a document open, a composer, a significant dialog or panel, a substantial settings area.
- Together the views should cover the app's distinct interfaces. Skip near-duplicates (the same layout showing different records), sign-in and sign-up pages, error and 404 pages, and marketing, documentation or about pages. Skip empty states unless the app has nothing else to show.
- Prefer states with real content. A small app may need only one or two views.
- Leave the app's appearance as it is: no theme switching, zooming or window changes.

# How views are replayed
The harness replays each view in a fresh browser: it opens the path of your last goto (after the sign-in prelude, if you marked one) and repeats the actions you took since. So:
- Reach each view with as few actions as possible after a goto. If a screen has its own URL, goto it directly.
- Use targets that find the element regardless of layout: role + name from read_page, a field label, a placeholder, or visible text. Use x/y coordinates only when nothing else works, and only with the window scrolled to the top.
- If the app needs a sign-in, sign in once, then call mark_signed_in; those steps run before every view.
- Actions that create or change data run again on every replay, so prefer opening existing items over creating new ones.
- save_view replays your steps and compares the result with your screen. If they differ, fix the steps and save again.

You have ${maxActions} actions (act and goto). When you have saved the views, call finish with a summary. Finish without views only if the app does not work.`;
}

export function explorerFirst(r: RepoEntry, app: AppJson, base: string): string {
  const login = app.login && (app.login.username || app.login.email) ? `\nSign-in: ${JSON.stringify(app.login)}` : '';
  const stubs = app.stubs?.length ? `\nExternal services are stubbed locally with realistic responses, so these work like the real thing: ${app.stubs.map((x) => x.service).join('; ')}.` : '';
  return `App: ${r.repo} — ${r.description || '(no description)'}
Running at ${base} (entry ${app.entry}). The image is the entry page.

Notes from the person who set it up:
${app.notes || '(none)'}${login}${stubs}

Look around (read_page shows roles and names for targets), then save the views.`;
}

// --------------------------------------------------------------------- run

export interface ExploreJob {
  batch: string;
  repo: RepoEntry;
  app: AppJson;
  base: string;
  outDir: string; // repos/<batch>/<slug>
  explorer: RaterConfig & { maxViews: number; maxActions: number };
  browser: Browser;
}

export async function exploreRepo(job: ExploreJob): Promise<ExploreRecord> {
  for (;;) {
    await usageGate.wait();
    try {
      return await exploreOnce(job);
    } catch (e) {
      if (!(e instanceof UsageLimitError)) throw e;
    }
  }
}

async function exploreOnce(job: ExploreJob): Promise<ExploreRecord> {
  const { explorer } = job;
  const viewsDir = path.join(job.outDir, 'views');
  fs.rmSync(viewsDir, { recursive: true, force: true });
  const transcript = path.join(job.outDir, 'explore.transcript.jsonl');
  fs.writeFileSync(transcript, '');
  const log = (e: object) => fs.appendFileSync(transcript, JSON.stringify({ t: new Date().toISOString(), ...e }) + '\n');
  const startedAt = new Date().toISOString();
  const tools = new ExplorerTools({ browser: job.browser, base: job.base, entry: job.app.entry, maxViews: explorer.maxViews, maxActions: explorer.maxActions, viewsDir });
  let outcome: AgentOutcome | undefined;
  let error: string | undefined;
  try {
    const first = await tools.open();
    const provider = await providerFor(explorer);
    outcome = await provider.run(explorer, {
      system: explorerSystem(explorer.maxViews, explorer.maxActions),
      tools: explorerToolSpecs(explorer.maxViews),
      first: { text: explorerFirst(job.repo, job.app, job.base), images: [first] },
      execute: (name, input) => tools.execute(name, input),
      maxTurns: explorer.maxTurns ?? 120,
      nudge: 'You have not called finish yet. Save the views you want (save_view), then call finish with a summary.',
      log,
    });
    log({ type: 'outcome', ...outcome });
    if (!tools.views.length) error = `no views saved (${outcome.reason}${tools.summary ? `: ${tools.summary.slice(0, 300)}` : ''})`;
  } catch (e) {
    if (e instanceof UsageLimitError) throw e;
    error = (e as Error).message;
  } finally {
    await tools.close();
  }
  const record: ExploreRecord = {
    batch: job.batch, slug: job.repo.slug, ok: !error, ...(error ? { error } : {}), entry: job.app.entry,
    views: tools.views, ...(tools.summary ? { summary: tools.summary } : {}),
    explorer: { provider: explorer.provider, model: explorer.model, ...(explorer.effort ? { effort: explorer.effort } : {}) },
    ...(outcome ? { outcome } : {}), actions: tools.actions, startedAt, finishedAt: new Date().toISOString(),
  };
  writeJson(path.join(job.outDir, 'explore.json'), record);
  return record;
}
