// Dev check: serves out/ on a test port, opens it in headless Chromium at 1440x900 and saves screenshots.
//   node .ui-capture/shot.js [name] [js-to-run-before-shot]
const http = require('node:http'), fs = require('node:fs'), path = require('node:path'), os = require('node:os');
const { chromium } = require('playwright-core');
const OUT = path.join(__dirname, 'out'), PORT = 5403;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json' };
const srv = http.createServer((q, r) => { let p = path.join(OUT, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(OUT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) p = fs.existsSync(path.join(p, 'index.html')) ? path.join(p, 'index.html') : path.join(OUT, 'index.html');
  r.writeHead(200, { 'content-type': types[path.extname(p)] || 'application/octet-stream' }); fs.createReadStream(p).pipe(r); });
srv.listen(PORT, async () => {
  const exe = path.join(os.homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1255/chrome-headless-shell-mac-arm64/chrome-headless-shell');
  const b = await chromium.launch({ executablePath: fs.existsSync(exe) ? exe : undefined, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = []; pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  pg.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  pg.on('requestfailed', (r) => logs.push('reqfail: ' + r.url()));
  pg.on('request', (r) => { if (!r.url().startsWith('http://localhost') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) logs.push('EXTERNAL: ' + r.url()); });
  await pg.goto(`http://localhost:${PORT}/`); await pg.waitForTimeout(5000);
  if (process.argv[3]) { await pg.evaluate(process.argv[3]); await pg.waitForTimeout(1500); }
  await pg.screenshot({ path: path.join(os.tmpdir(), (process.argv[2] || 'shot') + '.png') });
  console.log(logs.slice(0, 20).join('\n'));
  await b.close(); srv.close();
});
