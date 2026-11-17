// Generates an original 52x52 fuse-bead pixel-art pattern ("ginger cat in a red scarf on a cushion")
// in the app's own project/draft format (type: 'bead-grid-studio', version: 2), using MARD palette codes.
// Usage: node .ui-capture/gen-pattern.mjs <out-dir>
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PALETTE } from '../src/palettes/mard221.js';

const N = 52;
const grid = Array.from({ length: N }, () => Array(N).fill(null));
const layer = Array.from({ length: N }, () => Array(N).fill(''));
const codes = new Set(PALETTE.map((c) => c.code));
const set = (x, y, code, tag = '') => {
  if (x < 0 || y < 0 || x >= N || y >= N) return;
  if (!codes.has(code)) throw new Error(`bad code ${code}`);
  grid[y][x] = code; if (tag) layer[y][x] = tag;
};
const inEllipse = (x, y, cx, cy, rx, ry) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
const sign = (p1, p2, p3) => (p1[0] - p3[0]) * (p2[1] - p3[1]) - (p2[0] - p3[0]) * (p1[1] - p3[1]);
const inTri = (x, y, a, b, c) => {
  const p = [x + 0.5, y + 0.5];
  const d1 = sign(p, a, b), d2 = sign(p, b, c), d3 = sign(p, c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const each = (fn) => { for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) fn(x, y); };

const C = {
  outline: 'G8', fur: 'A6', furMid: 'A7', furShade: 'G19', stripe: 'G20', cream: 'G16', creamHi: 'H18',
  eye: 'H16', white: 'H2', nose: 'F14', innerEar: 'E15', blush: 'F22', scarf: 'F4', scarfShade: 'F8', fringe: 'F2',
  cushion: 'C22', cushionShade: 'C19', cushionHi: 'C25', tassel: 'A5', star: 'A4', starHi: 'A15', bowl: 'H9', bowlRim: 'C7', fish: 'H3',
};

// Cushion
each((x, y) => { if (inEllipse(x, y, 26, 47.5, 22, 3.8)) set(x, y, y >= 48 ? C.cushionShade : C.cushion, 'cushion'); });
each((x, y) => { if (inEllipse(x, y, 20, 46.0, 9, 1.0)) set(x, y, C.cushionHi, 'cushion'); });
[[4, 48], [47, 48]].forEach(([x, y]) => { set(x, y, C.tassel); set(x, y + 1, C.tassel); set(x + (x < 26 ? -1 : 1), y + 2, C.tassel); });

// Tail (arc on the right)
each((x, y) => {
  const dx = x + 0.5 - 38, dy = y + 0.5 - 40; const r = Math.hypot(dx, dy);
  if (r >= 7.2 && r <= 10.2 && dx > 0 && dy < 6 && dy > -6.5) set(x, y, Math.floor(Math.atan2(dy, dx) * 4) % 2 ? C.fur : C.stripe, 'tail');
});

// Body
each((x, y) => { if (inEllipse(x, y, 26, 37.5, 14.5, 10.5)) set(x, y, x > 31 && y > 36 ? C.furShade : (x > 28 ? C.furMid : C.fur), 'body'); });
each((x, y) => { if (inEllipse(x, y, 26, 39.5, 7.5, 7.5)) set(x, y, C.cream, 'body'); });
// body stripes
[[13, 35], [13, 38], [39, 35], [39, 38]].forEach(([x, y]) => { for (let i = 0; i < 3; i++) set(x + (x < 26 ? i : -i), y, C.stripe, 'body'); });
// Front paws
each((x, y) => { if (inEllipse(x, y, 20.5, 46, 3.6, 2.4) || inEllipse(x, y, 31.5, 46, 3.6, 2.4)) set(x, y, C.creamHi, 'paw'); });

// Ears
const earL = [[11.5, 4], [11, 14], [21, 11]], earR = [[40.5, 4], [41, 14], [31, 11]];
const earLi = [[12.6, 7.5], [12, 15.5], [18.5, 11.8]], earRi = [[39.4, 7.5], [40, 15.5], [33.5, 11.8]];
each((x, y) => {
  if (inTri(x, y, ...earL) || inTri(x, y, ...earR)) set(x, y, C.fur, 'head');
  if (inTri(x, y, ...earLi) || inTri(x, y, ...earRi)) set(x, y, C.innerEar, 'head');
});
// Head
each((x, y) => { if (inEllipse(x, y, 26, 20, 15, 10.5)) set(x, y, x > 34 && y > 21 ? C.furMid : C.fur, 'head'); });
each((x, y) => { if (inEllipse(x, y, 26, 25, 7, 4)) set(x, y, C.cream, 'head'); });
// forehead stripes
[[22, 10, 3], [26, 10, 4], [30, 10, 3]].forEach(([x, y, len]) => { for (let i = 0; i < len; i++) set(x, y + i, C.stripe, 'head'); });
[[11, 19], [11, 22], [40, 19], [40, 22]].forEach(([x, y]) => { for (let i = 0; i < 3; i++) set(x + (x < 26 ? i : -i), y, C.stripe, 'head'); });
// Eyes
each((x, y) => { if (inEllipse(x, y, 19.5, 20, 2.3, 2.8) || inEllipse(x, y, 32.5, 20, 2.3, 2.8)) set(x, y, C.eye, 'head'); });
set(18, 19, C.white); set(31, 19, C.white); set(20, 21, C.white); set(33, 21, C.white);
// Blush
each((x, y) => { if (inEllipse(x, y, 15, 24.5, 2.6, 1.3) || inEllipse(x, y, 37, 24.5, 2.6, 1.3)) set(x, y, C.blush, 'head'); });
// Nose & mouth
set(25, 23, C.nose); set(26, 23, C.nose); set(25, 24, C.nose); set(26, 24, C.nose);
set(24, 25, C.outline); set(27, 25, C.outline); set(23, 25, C.outline); set(28, 25, C.outline);
set(25, 25, C.outline); set(26, 25, C.outline);
// whiskers
[[8, 22], [9, 22], [8, 25], [9, 24], [42, 22], [43, 22], [42, 24], [43, 25]].forEach(([x, y]) => set(x, y, C.outline, 'whisker'));

// Scarf
each((x, y) => {
  if (y >= 29 && y <= 31 && layer[y][x] && layer[y][x] !== 'tail' && layer[y][x] !== 'cushion') set(x, y, y === 31 ? C.scarfShade : C.scarf, 'scarf');
});
for (let y = 32; y <= 39; y++) for (let x = 15; x <= 18; x++) set(x - Math.floor((y - 32) / 3), y, y > 36 && x === 15 ? C.scarfShade : C.scarf, 'scarf');
[12, 14, 16].forEach((x) => set(x, 40, C.fringe, 'scarf'));

// Outline: any filled cell 4-adjacent to an empty cell, or boundary between head and body.
const out = grid.map((row) => row.slice());
each((x, y) => {
  if (!grid[y][x] || layer[y][x] === 'whisker') return;
  const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const edge = nb.some(([dx, dy]) => { const v = grid[y + dy]?.[x + dx]; return v === undefined || v === null || layer[y + dy]?.[x + dx] === 'whisker'; });
  const seam = layer[y][x] === 'head' && nb.some(([dx, dy]) => ['body', 'scarf'].includes(layer[y + dy]?.[x + dx]) && dy > 0);
  const pawSeam = layer[y][x] === 'paw' && nb.some(([dx, dy]) => layer[y + dy]?.[x + dx] === 'cushion');
  if (edge || seam || pawSeam) out[y][x] = C.outline;
});

// Sparkles (after outline, no outline)
const sparkle = (cx, cy) => { set(cx, cy, C.starHi); [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dx, dy]) => { out[cy + dy][cx + dx] = C.star; }); out[cy][cx] = C.starHi; };
sparkle(5, 6); sparkle(46, 28); sparkle(47, 7); out[13][3] = C.star; out[33][5] = C.star; out[15][48] = C.star;

const cells = out.flat();
const used = [...new Set(cells.filter(Boolean))];
const project = {
  type: 'bead-grid-studio', version: 2, appVersion: '1.4.0', savedAt: '2026-11-14T21:37:12.408Z',
  title: '年糕橘猫·红围巾（52板）',
  grid: { cols: N, rows: N, cells },
  settings: {
    selectedColor: PALETTE.find((c) => c.code === C.fur).index, selectedColorCode: C.fur, previewMode: 'square', showGrid: true, showRulers: true, showCodes: true,
    zoom: 0.75, paletteMode: 'mard221', maxColors: 24, mergeStrength: 12, protectDark: true, sizeMode: 'board', aspectLock: true, boardProfile: 'mini52',
    boardTilesX: 1, boardTilesY: 1, majorGridStep: 10, processMode: 'cartoon', fitMode: 'cover', whiteMode: 'auto',
  },
  palette: 'mard-compatible-base-221-v1', paletteProvider: 'mard-compatible-base-221', paletteSource: 'maxcleme/beadcolors@94b99999652866f1a1879d6369fe735f811949e5',
  making: { completedColorCodes: [C.outline, C.eye, C.white, C.cushionShade, C.cushion, C.cushionHi], focusColorCode: C.fur },
  reference: { embedded: false },
};

const dir = process.argv[2] || '.ui-capture/seed';
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, 'draft.bead.json'), JSON.stringify(project, null, 2));
console.log(`cells=${cells.filter(Boolean).length} colors=${used.length}`);
console.log(out.map((r) => r.map((c) => (c ? ({ G8: '#', A6: 'o', A7: 'o', G19: 'O', G20: '=', G16: '.', H18: ',', H16: '@', F4: 'r', F8: 'R', C22: '~', C19: '~' }[c] || '*') : ' ')).join('')).join('\n'));
