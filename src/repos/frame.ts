// Repo-sourced UIs: config (config/repos.yaml), the sampling frame
// (repos/<batch>.yaml), and per-repo records (repos/<batch>/<slug>/).
//
// The frame is the repo counterpart of sites/<batch>.yaml and
// briefs/<batch>.yaml: which open-source apps to build, pinned to a commit,
// with the domain each was sampled for. scripts/discover-repos.ts writes it;
// review and edit it before scripts/prepare-repos.ts.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { P } from '../paths.ts';
import type { ModelChoice } from '../generate/claude.ts';
import type { RaterConfig } from '../pipeline/provider.ts';

export interface ReposConfig {
  discovery: {
    minStars: number;
    pushedWithinDays: number;
    languages: string[];
    licenses: string[];
    perQuery: number;
    /** Frame domain → GitHub search terms (topic:x, keywords). Each is run with the qualifiers above. */
    queries: Record<string, string[]>;
  };
  screener: ModelChoice & { chunk: number };
  setup: {
    model: string;
    effort?: string;
    command?: string;
    tools: string[];
    timeoutMinutes: number;
    repairRounds: number;
    /** Where checkouts live (outside the repo: node_modules for a batch run to many GB). ~ is expanded. */
    checkoutRoot: string;
    /** Server-mode apps listen on basePort + their index in the frame. */
    basePort: number;
    /** How long a server-mode app may take to start answering. */
    startupSeconds: number;
    /** Hosts the setup sandbox may reach. */
    network: string[];
    /** Run setup in Claude Code's sandbox and servers under sandbox-exec. Turn off only on a throwaway machine. */
    sandbox: boolean;
  };
  explorer: RaterConfig & { maxViews: number; maxActions: number };
}

export interface ScreenResult {
  kind: 'application' | 'library' | 'framework' | 'template' | 'website' | 'cli' | 'extension' | 'mobile' | 'collection' | 'other';
  runnable: 'static' | 'server' | 'needs-services' | 'needs-external' | 'unclear';
  domain: string;
  reason: string;
}

export interface RepoEntry {
  slug: string;
  /** owner/name */
  repo: string;
  url: string;
  commit: string;
  branch: string;
  /** Frame domain (label schema enum) the screener assigned and the sample counts it under. */
  domain: string;
  stars: number;
  license: string;
  language: string;
  topics: string[];
  description: string;
  homepage?: string;
  screen: ScreenResult;
  /** Server-mode apps listen here (setup tells the agent; label.ts starts it here). */
  port: number;
}

export interface RepoFrame {
  batch: string;
  description?: string;
  createdAt: string;
  seed: number;
  screener: ModelChoice;
  repos: RepoEntry[];
}

export function readReposConfig(file = path.join(P.root, 'config', 'repos.yaml')): ReposConfig {
  const c = YAML.parse(fs.readFileSync(file, 'utf8')) as ReposConfig;
  if (!c.discovery?.queries || !c.screener?.model || !c.setup?.model || !c.explorer?.model) throw new Error(`${file}: discovery.queries, screener, setup and explorer are required`);
  c.screener.chunk ??= 8;
  c.setup.tools ??= ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep'];
  c.setup.timeoutMinutes ??= 45;
  c.setup.repairRounds ??= 2;
  c.setup.basePort ??= 4400;
  c.setup.startupSeconds ??= 180;
  c.setup.sandbox ??= true;
  c.setup.checkoutRoot ??= '~/.cache/design-patterns-dataset/repos';
  c.explorer.id ??= 'explorer';
  c.explorer.maxViews ??= 5;
  c.explorer.maxActions ??= 80;
  return c;
}

export const expandHome = (p: string) => (p === '~' || p.startsWith('~/') ? path.join(os.homedir(), p.slice(1)) : p);

export const frameFile = (batch: string) => path.join(P.repos, `${batch}.yaml`);
export const recordDir = (batch: string, slug: string) => path.join(P.repos, batch, slug);
/** `root` is setup.checkoutRoot as written in the config (~ allowed). */
export const checkoutIn = (root: string, batch: string, slug: string) => path.join(path.resolve(expandHome(root)), batch, slug);
export const checkoutDir = (cfg: ReposConfig, batch: string, slug: string) => checkoutIn(cfg.setup.checkoutRoot, batch, slug);

export function readFrame(file: string): RepoFrame {
  const f = YAML.parse(fs.readFileSync(file, 'utf8')) as RepoFrame;
  const seen = new Set<string>();
  const ports = new Set<number>();
  for (const r of f.repos ?? []) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(r.slug) || r.slug.length > 40) throw new Error(`${file}: bad slug "${r.slug}" (kebab-case, ≤ 40 chars)`);
    if (seen.has(r.slug)) throw new Error(`${file}: duplicate slug "${r.slug}"`);
    if (ports.has(r.port)) throw new Error(`${file}: duplicate port ${r.port} (${r.slug})`);
    if (!/^[0-9a-f]{40}$/.test(r.commit)) throw new Error(`${file}: ${r.slug}: commit must be a full SHA`);
    seen.add(r.slug);
    ports.add(r.port);
  }
  return f;
}

export function writeFrame(file: string, f: RepoFrame): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const header = `# Open-source apps for repo batch ${f.batch} (scripts/discover-repos.ts). Review before
# scripts/prepare-repos.ts: drop repos that are not end-user apps or that obviously need
# hosted services, fix a wrong domain, or pin a different commit. Edits are fine until setup.
`;
  fs.writeFileSync(file, header + YAML.stringify(f, { lineWidth: 0 }));
}

/** Repos already in any frame (so a new batch does not resample them). */
export function framedRepos(except?: string): Set<string> {
  const out = new Set<string>();
  if (!fs.existsSync(P.repos)) return out;
  for (const f of fs.readdirSync(P.repos)) {
    if (!f.endsWith('.yaml') || f === `${except}.yaml`) continue;
    try { for (const r of readFrame(path.join(P.repos, f)).repos) out.add(r.repo.toLowerCase()); } catch { /* unreadable frame */ }
  }
  return out;
}
