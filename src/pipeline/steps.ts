// Replayable browser steps: how a UI state that has no URL of its own (a screen
// behind a sign-in, an opened editor, a dialog) is reached again from a fresh
// browser. Repo views (src/repos/explore.ts) record them; capture and the
// raters' live page replay them, so every rater codes the state the explorer
// chose and can interact with that same state.
//
// A site's `steps` run after `page.goto(site.url)`. `goto` steps are paths on
// the site's origin. Targets prefer what replays reliably (role + accessible
// name, label, placeholder, text) over coordinates.

import type { Locator, Page } from 'playwright';

export type Target =
  | { role: string; name?: string; exact?: boolean; nth?: number }
  | { text: string; exact?: boolean; nth?: number }
  | { label: string; exact?: boolean; nth?: number }
  | { placeholder: string; exact?: boolean; nth?: number }
  | { css: string; nth?: number }
  | { x: number; y: number };

export type StepAction = 'goto' | 'click' | 'dblclick' | 'hover' | 'fill' | 'select' | 'press' | 'wait';

export interface Step {
  action: StepAction;
  target?: Target;
  /** goto: a path on the site's origin (`/settings?tab=team`). */
  path?: string;
  /** fill / select: the text or option. */
  value?: string;
  /** press: a key or chord (`Enter`, `Control+K`). */
  key?: string;
  /** wait: milliseconds (max 10000). */
  ms?: number;
}

const ACTIONS: StepAction[] = ['goto', 'click', 'dblclick', 'hover', 'fill', 'select', 'press', 'wait'];
const STEP_TIMEOUT = 10_000;

/**
 * `p` resolved against the app at `origin`, refusing anything that leaves it.
 * A leading "/" is not enough: browsers read "//host/x" and "/\\host/x" as other hosts.
 */
export function appUrl(origin: string, p: string): string {
  const base = new URL(origin);
  const u = new URL(p, base);
  if (!p.startsWith('/') || u.origin !== base.origin) throw new Error(`"${p}" is not a path on the app (${base.origin})`);
  return u.href;
}

/** A path on the app's own origin (see appUrl). */
export function isAppPath(p: unknown): p is string {
  if (typeof p !== 'string') return false;
  try { appUrl('http://app.invalid', p); return true; } catch { return false; }
}

/** JSON Schema for a target (tool inputs). */
export const targetSchema = {
  type: 'object',
  description: 'The element to act on. Give exactly one of: role (+ name), label, placeholder, text, css — or x/y viewport coordinates as a last resort. nth picks among several matches (0-based).',
  properties: {
    role: { type: 'string', description: 'ARIA role, e.g. button, link, tab, menuitem, textbox, row, treeitem.' },
    name: { type: 'string', description: 'Accessible name, with role.' },
    label: { type: 'string', description: 'Form field label text.' },
    placeholder: { type: 'string' },
    text: { type: 'string', description: 'Visible text of the element.' },
    css: { type: 'string', description: 'CSS selector (only when nothing semantic identifies the element).' },
    exact: { type: 'boolean', description: 'Exact (case-sensitive, whole-string) match for name/label/placeholder/text. Default false.' },
    nth: { type: 'integer', minimum: 0 },
    x: { type: 'number' },
    y: { type: 'number' },
  },
  additionalProperties: false,
} as const;

/** Problems with a step, or [] (used on recorded steps and on site lists). */
export function checkStep(s: Step): string[] {
  const p: string[] = [];
  if (!ACTIONS.includes(s.action)) return [`unknown action "${s.action}"`];
  const needsTarget = ['click', 'dblclick', 'hover', 'fill', 'select'].includes(s.action);
  if (needsTarget && !s.target) p.push(`${s.action} needs a target`);
  if (s.target) {
    const t = s.target as Record<string, unknown>;
    const kinds = ['role', 'text', 'label', 'placeholder', 'css'].filter((k) => typeof t[k] === 'string' && (t[k] as string).length);
    const xy = typeof t.x === 'number' && typeof t.y === 'number';
    if (kinds.length + (xy ? 1 : 0) !== 1) p.push('target needs exactly one of role, text, label, placeholder, css, or x+y');
  }
  if (s.action === 'goto' && !isAppPath(s.path)) p.push('goto needs a path on the app, starting with a single /');
  if ((s.action === 'fill' || s.action === 'select') && typeof s.value !== 'string') p.push(`${s.action} needs a value`);
  if (s.action === 'press' && !s.key) p.push('press needs a key');
  if (s.action === 'wait' && !(typeof s.ms === 'number' && s.ms >= 0 && s.ms <= 10_000)) p.push('wait needs ms between 0 and 10000');
  return p;
}

export function describeTarget(t: Target): string {
  if ('x' in t) return `(${Math.round(t.x)}, ${Math.round(t.y)})`;
  const nth = 'nth' in t && t.nth ? ` #${t.nth}` : '';
  if ('role' in t) return `${t.role}${t.name !== undefined ? ` "${t.name}"` : ''}${nth}`;
  if ('label' in t) return `field labelled "${t.label}"${nth}`;
  if ('placeholder' in t) return `field "${t.placeholder}"${nth}`;
  if ('text' in t) return `text "${t.text}"${nth}`;
  return `css ${t.css}${nth}`;
}

export function describeStep(s: Step): string {
  switch (s.action) {
    case 'goto': return `goto ${s.path}`;
    case 'fill': return `fill ${describeTarget(s.target!)} with "${s.value}"`;
    case 'select': return `select "${s.value}" in ${describeTarget(s.target!)}`;
    case 'press': return `press ${s.key}${s.target ? ` in ${describeTarget(s.target)}` : ''}`;
    case 'wait': return `wait ${s.ms}ms`;
    default: return `${s.action} ${describeTarget(s.target!)}`;
  }
}

/** All visible matches of a semantic target (undefined for coordinates). */
export function matches(page: Page, t: Target): Locator | undefined {
  if ('x' in t) return undefined;
  const exact = 'exact' in t ? t.exact ?? false : false;
  let loc: Locator;
  if ('role' in t) loc = page.getByRole(t.role as Parameters<Page['getByRole']>[0], t.name !== undefined ? { name: t.name, exact } : {});
  else if ('label' in t) loc = page.getByLabel(t.label, { exact });
  else if ('placeholder' in t) loc = page.getByPlaceholder(t.placeholder, { exact });
  else if ('text' in t) loc = page.getByText(t.text, { exact });
  else loc = page.locator(t.css);
  return loc.locator('visible=true');
}

/** Wait for the UI to settle after navigation or an interaction. */
export async function settle(page: Page, ms = 600): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: STEP_TIMEOUT }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {});
  await page.waitForTimeout(ms);
}

/** Run one step. Returns how many elements matched a semantic target. */
export async function runStep(page: Page, origin: string, s: Step): Promise<{ matched?: number }> {
  const problems = checkStep(s);
  if (problems.length) throw new Error(problems.join('; '));
  if (s.action === 'goto') {
    await page.goto(appUrl(origin, s.path!), { waitUntil: 'domcontentloaded', timeout: 45_000 });
    await settle(page, 800);
    return {};
  }
  if (s.action === 'wait') {
    await page.waitForTimeout(s.ms!);
    return {};
  }
  if (s.action === 'press' && !s.target) {
    await page.keyboard.press(s.key!);
    await settle(page, 400);
    return {};
  }
  const t = s.target!;
  if ('x' in t) {
    if (s.action === 'click') await page.mouse.click(t.x, t.y);
    else if (s.action === 'dblclick') await page.mouse.dblclick(t.x, t.y);
    else if (s.action === 'hover') await page.mouse.move(t.x, t.y);
    else {
      await page.mouse.click(t.x, t.y);
      if (s.action === 'fill') { await page.keyboard.press('ControlOrMeta+A'); await page.keyboard.type(s.value!); }
      else if (s.action === 'press') await page.keyboard.press(s.key!);
      else throw new Error('select needs a semantic target, not coordinates');
    }
    await settle(page);
    return {};
  }
  const all = matches(page, t)!;
  const n = 'nth' in t ? t.nth ?? 0 : 0;
  await all.nth(n).waitFor({ state: 'visible', timeout: STEP_TIMEOUT });
  const matched = await all.count();
  const el = all.nth(n);
  switch (s.action) {
    case 'click': await el.click({ timeout: STEP_TIMEOUT }); break;
    case 'dblclick': await el.dblclick({ timeout: STEP_TIMEOUT }); break;
    case 'hover': await el.hover({ timeout: STEP_TIMEOUT }); break;
    case 'fill': await el.fill(s.value!, { timeout: STEP_TIMEOUT }); break;
    case 'select': await el.selectOption({ label: s.value! }, { timeout: STEP_TIMEOUT }).catch(() => el.selectOption(s.value!, { timeout: STEP_TIMEOUT })); break;
    case 'press': await el.press(s.key!, { timeout: STEP_TIMEOUT }); break;
  }
  await settle(page);
  return { matched };
}

/** Replay `steps` on a page already at the site's URL. Errors name the failing step. */
export async function replaySteps(page: Page, origin: string, steps: Step[]): Promise<void> {
  for (const [i, s] of steps.entries()) {
    try {
      await runStep(page, origin, s);
    } catch (e) {
      throw new Error(`step ${i + 1}/${steps.length} (${describeStep(s)}) failed: ${(e as Error).message.split('\n')[0]}`);
    }
  }
}
