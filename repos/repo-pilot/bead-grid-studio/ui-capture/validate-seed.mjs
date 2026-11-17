// Mirrors the checks in src/app.js loadProjectFile()/updateRecoveryUI() to validate the seeded draft without a browser.
import { readFileSync, statSync } from 'node:fs';
import { PALETTE } from '../src/palettes/mard221.js';
const f = process.argv[2] || '.ui-capture/seed/draft.bead.json';
const p = JSON.parse(readFileSync(f, 'utf8'));
const ok = (c, m) => { if (!c) { console.error('FAIL', m); process.exit(1); } };
ok(statSync(f).size < 2 * 1024 * 1024, 'size');
ok(p.type === 'bead-grid-studio' && [1, 2].includes(p.version), 'version');
const { cols, rows, cells } = p.grid;
ok(Number.isInteger(cols) && cols >= 4 && cols <= 160 && Number.isInteger(rows) && rows >= 4 && rows <= 160, 'dims');
ok(Array.isArray(cells) && cells.length === cols * rows, 'cells');
const codes = new Set(PALETTE.map((c) => c.code));
cells.forEach((v, i) => ok(v === null || (typeof v === 'string' && codes.has(v)), `color:${i}`));
ok(cells.some(Boolean), 'recovery available');
ok(p.making.completedColorCodes.every((c) => codes.has(c)), 'making codes');
const counts = {}; cells.filter(Boolean).forEach((c) => (counts[c] = (counts[c] || 0) + 1));
console.log('OK', p.title, `${cols}x${rows}`, 'beads', cells.filter(Boolean).length, 'colors', Object.keys(counts).length);
console.log(Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(' '));
