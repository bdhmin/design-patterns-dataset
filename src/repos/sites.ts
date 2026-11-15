// Repo views as labeling sites, and back from a site to the app that serves it.
//
// Each saved view becomes one site: slug <repo>--<view>, url = the app's base
// URL + the view's path, steps = the view's replay steps. Static apps are
// served by label.ts's static server at http://<repo>.localhost:<port>/;
// server apps at http://localhost:<their port>/, started by label.ts while
// their views are captured and labeled.

import path from 'node:path';
import { P } from '../paths.ts';
import { readJson, type SiteSpec } from '../pipeline/sites.ts';
import { localUrl } from '../pipeline/serve.ts';
import { appUrl } from '../pipeline/steps.ts';
import type { AppSpec } from './apps.ts';
import type { ExploreRecord } from './explore.ts';
import { checkoutDir, checkoutIn, recordDir, type RepoFrame, type ReposConfig } from './frame.ts';
import type { SetupRecord } from './setup.ts';

export function appBase(setup: Pick<SetupRecord, 'slug' | 'mode' | 'port'>, staticPort: number): string {
  return setup.mode === 'static' ? localUrl(setup.slug, staticPort) : `http://localhost:${setup.port}/`;
}

export function viewSlug(repo: string, view: string): string {
  return `${repo}--${view}`.slice(0, 80);
}

/** One site per saved view of every repo that set up and explored successfully. */
export function repoSites(frame: RepoFrame, staticPort: number): { sites: SiteSpec[]; missing: string[] } {
  const sites: SiteSpec[] = [];
  const missing: string[] = [];
  for (const r of frame.repos) {
    const dir = recordDir(frame.batch, r.slug);
    const setup = readJson<SetupRecord>(path.join(dir, 'setup.json'));
    const explore = readJson<ExploreRecord>(path.join(dir, 'explore.json'));
    if (!setup?.ok || !explore?.ok || !explore.views.length) { missing.push(r.slug); continue; }
    const base = appBase(setup, staticPort);
    for (const v of explore.views) {
      sites.push({
        url: appUrl(base, v.path),
        slug: viewSlug(r.slug, v.slug),
        domain: r.domain,
        source: 'repo',
        app: path.relative(P.root, path.join(dir, 'setup.json')),
        view: v.slug,
        ...(v.steps.length ? { steps: v.steps } : {}),
      });
    }
  }
  return { sites, missing };
}

/** The app a repo site needs running, from its setup record. */
export function appSpecFor(site: SiteSpec, cfg: ReposConfig): AppSpec {
  const setup = readJson<SetupRecord>(path.resolve(P.root, site.app!));
  if (!setup) throw new Error(`${site.slug}: ${site.app} is missing`);
  if (!setup.ok || !setup.mode) throw new Error(`${site.slug}: setup for ${setup.slug} did not succeed`);
  // The root the setup actually used; older records predate it and fall back to the config.
  const checkout = setup.checkoutRoot ? checkoutIn(setup.checkoutRoot, setup.batch, setup.slug) : checkoutDir(cfg, setup.batch, setup.slug);
  return { slug: setup.slug, mode: setup.mode, port: setup.port, checkout };
}
