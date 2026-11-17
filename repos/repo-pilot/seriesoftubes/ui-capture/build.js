#!/usr/bin/env node
// Builds the UI capture: the repo's own production build (scripts/build.js) into .ui-capture/out, then
//  1. Google Fonts -> the same fonts (Baloo 2, Nunito) served from out/fonts (fontsource packages from npm),
//     with the page's CSP font-src widened to 'self' so they may load. Nothing else in the page changes.
//  2. out/seed-save.js: writes the generated save (seed/save.json) into localStorage the way the game's own
//     save slots do (sot-save-v1:<id> + the sot-slots index), only when this browser has no networks yet.
//     It loads as the first script of index.html, so the game boots straight into that network.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build.js')], { stdio: 'inherit', env: { ...process.env, OUT } });

// ---- fonts ----
const V = path.join(__dirname, 'vendor');
fs.mkdirSync(path.join(OUT, 'fonts'), { recursive: true });
let css = '';
for (const [fam, dir, file, ws] of [['Baloo 2', 'fontsource-baloo-2', 'baloo-2', [500, 700, 800]], ['Nunito', 'fontsource-nunito', 'nunito', [500, 700, 800, 900]]]) {
  for (const w of ws) for (const sub of ['latin-ext', 'latin']) {
    const f = `${file}-${sub}-${w}-normal.woff2`;
    fs.copyFileSync(path.join(V, dir, 'files', f), path.join(OUT, 'fonts', f));
    // unicode-range from fontsource's own css for this subset
    const src = fs.readFileSync(path.join(V, dir, `${w}.css`), 'utf8');
    const block = src.split('@font-face').find((b) => b.includes(`${file}-${sub}-${w}-normal.woff2`));
    const ur = /unicode-range:\s*([^;]+);/.exec(block || '');
    css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};font-display:swap;src:url(/fonts/${f}) format('woff2');${ur ? `unicode-range:${ur[1]};` : ''}}\n`;
  }
}
fs.writeFileSync(path.join(OUT, 'fonts', 'fonts.css'), css);

let html = fs.readFileSync(path.join(OUT, 'index.html'), 'utf8');
const gf = /<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com\/css2[^"]*">/;
if (!gf.test(html)) throw new Error('google fonts link not found');
html = html.replace(gf, '<link rel="stylesheet" href="/fonts/fonts.css">')
  .replace(/<link rel="preconnect" href="https:\/\/fonts\.(googleapis|gstatic)\.com"[^>]*>\n?/g, '')
  .replace('font-src https://fonts.gstatic.com', "font-src 'self' https://fonts.gstatic.com");

// ---- seed ----
const save = fs.readFileSync(path.join(__dirname, 'seed', 'save.json'), 'utf8').trim();
const meta = JSON.parse(save);
const seed = `/* UI capture seed: an established player's network, written into this browser's game storage once. */
(function(){try{
  if(localStorage.getItem('sot-slots'))return;
  var id='lagoon01',now=Date.now(),txt=${JSON.stringify(save)};
  var data=txt.slice(0,-1)+',"sv":{"seq":1,"at":'+now+'}}';
  localStorage.setItem('sot-save-v1:'+id,data);
  localStorage.setItem('sot-slots',JSON.stringify({v:1,slots:[{id:id,name:${JSON.stringify(meta.name)},asn:${meta.asn},mode:'normal',preset:${JSON.stringify((meta.rules && meta.rules.preset) || 'oncall')},scn:null,day:${meta.day},tier:${JSON.stringify(process.env.SEED_TIER || 'Tier 2')},cash:${Math.round(meta.cash)},at:now,size:data.length,seq:1,gz:false}]}));
  localStorage.setItem('sot-seen-version',${JSON.stringify(require(path.join(ROOT, 'package.json')).version)});
  localStorage.setItem('sot-tut','1');
  localStorage.setItem('sot-lang','en');
}catch(e){console.error('seed failed',e);}})();
`;
fs.writeFileSync(path.join(OUT, 'seed-save.js'), seed);
// First thing in <head> after the CSP meta: before the game's scripts read storage.
const csp = /<meta http-equiv="Content-Security-Policy"[^>]*>/;
if (!csp.test(html)) throw new Error('csp meta not found');
html = html.replace(csp, (m) => m + '\n<script src="/seed-save.js"></script>');
fs.writeFileSync(path.join(OUT, 'index.html'), html);
console.log('ui-capture: fonts localised, seed injected (save', Math.round(save.length / 1024), 'KB)');
