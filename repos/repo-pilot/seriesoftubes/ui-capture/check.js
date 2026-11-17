// Dev check (Chromium cannot launch in this sandbox): loads the built out/index.html in the repo's jsdom harness,
// with localStorage filled by out/seed-save.js exactly as the browser would, and reports what booted.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { load, settle } = require('../tests/harness');
// Run seed-save.js against a plain storage object to get the keys it writes.
const store = new Map();
const ls = { getItem: (k) => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'out', 'seed-save.js'), 'utf8'), { localStorage: ls, Date, JSON, console });
const { ev, errors } = load({ file: path.join(__dirname, 'out', 'index.html'), storage: Object.fromEntries(store), seed: 99, dir: path.join(__dirname, 'out', 'i18n') });
setTimeout(() => {
  console.log(ev(`JSON.stringify({started:UI.started,name:S&&S.name,day:S&&dateStr(S.day),cash:S&&fmt$(S.cash),tier:S&&tierLabel(),lvl:S&&S.lvl,pops:S&&Object.keys(S.pops).length,biz:S&&S.biz.length,modal:!document.getElementById('modal').hidden,modalTxt:document.getElementById('modal').textContent.slice(0,200)})`));
  console.log(ev(`JSON.stringify({slot:UI.slot,busy:UI.bootBusy,bad:UI.loadBad,idx:slotIdx(true),keys:Object.keys(localStorage)})`));console.log('hud:', ev(`(document.getElementById('hud')||document.body).textContent.replace(/\\s+/g,' ').slice(0,400)`));
  console.log('errors:', errors.slice(0, 8));
  process.exit(0);
}, 3000);
