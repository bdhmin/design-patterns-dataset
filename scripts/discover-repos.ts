#!/usr/bin/env node
// Find open-source apps on GitHub and write the frame for a repo batch:
// repos/<batch>.yaml.
//
//   node scripts/discover-repos.ts --batch repo-001 [--n 20] [--seed N]
//        [--domains a,b] [--config config/repos.yaml] [--search-only] [--force]
//
// --search-only runs the GitHub searches and prints candidate counts per
// domain without calling a model. Needs `gh` logged in. Review the frame
// before running scripts/prepare-repos.ts.

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { P } from '../src/paths.ts';
import { frameDomains } from '../src/generate/briefs.ts';
import { domainQuotas, sample, screen, searchCandidates, toEntries } from '../src/repos/discover.ts';
import { frameFile, framedRepos, readReposConfig, writeFrame } from '../src/repos/frame.ts';
import { diversity } from '../src/variety.ts';

const { values: args } = parseArgs({
  options: {
    batch: { type: 'string' },
    n: { type: 'string', default: '20' },
    seed: { type: 'string' },
    domains: { type: 'string' },
    config: { type: 'string', default: path.join(P.root, 'config', 'repos.yaml') },
    'search-only': { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});
if (!args.batch) {
  console.error('usage: node scripts/discover-repos.ts --batch <name> [--n 20] [--seed N] [--domains a,b] [--search-only]');
  process.exit(2);
}
const file = frameFile(args.batch);
if (fs.existsSync(file) && !args.force && !args['search-only']) {
  console.error(`${path.relative(P.root, file)} exists. Edit it, or pass --force to rewrite it.`);
  process.exit(1);
}
const cfg = readReposConfig(args.config);
const all = frameDomains();
let domains = all;
if (args.domains) {
  domains = args.domains.split(',').map((s) => s.trim());
  const bad = domains.filter((d) => !all.includes(d));
  if (bad.length) { console.error(`unknown domains: ${bad.join(', ')} (have: ${all.join(', ')})`); process.exit(2); }
}
const n = Number(args.n);
const seed = args.seed ? Number(args.seed) : Math.floor(Math.random() * 2 ** 31);

console.log(`Searching GitHub for ${domains.length} domains…`);
const pool = await searchCandidates(cfg, domains, console.log);
console.log(`${pool.size} candidates with an allowed license.`);
if (args['search-only']) process.exit(0);

const quotas = domainQuotas(n, domains, seed);
const exclude = framedRepos(args.batch);
console.log(`Sampling ${n} (seed ${seed}); ${exclude.size} repos already in other frames are skipped.`);
const res = await sample(pool, quotas, seed, cfg.screener.chunk, (c) => screen(c, domains, cfg), { exclude, log: console.log });
const repos = await toEntries(res.picked, cfg.setup.basePort, domains);

writeFrame(file, {
  batch: args.batch,
  description: `Open-source apps across ${new Set(repos.map((r) => r.domain)).size} domains`,
  createdAt: new Date().toISOString(),
  seed,
  screener: { model: cfg.screener.model, ...(cfg.screener.effort ? { effort: cfg.screener.effort } : {}) },
  repos,
});
const d = diversity(repos.map((r) => r.domain), domains.length);
console.log(`\nWrote ${path.relative(P.root, file)}: ${repos.length} repos (screened ${res.screened}) · domains ${d.categories}/${domains.length} · evenness ${d.evenness.toFixed(2)}`);
for (const r of repos) console.log(`  ${r.domain.padEnd(20)} ${r.repo} (${r.stars}★, ${r.screen.runnable})`);
if (res.shortfall.size) console.log(`Short of quota: ${[...res.shortfall].map(([k, v]) => `${k} −${v}`).join(', ')}. Add search terms for those domains in config/repos.yaml.`);
console.log(`Next: review the frame, then node scripts/prepare-repos.ts --batch ${args.batch}`);
