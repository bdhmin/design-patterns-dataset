// Dev helper: screenshots a few Elk pages from a running instance. node shot.mjs <baseUrl> <outDir> [paths...]
import { createRequire } from 'node:module'
import os from 'node:os'
import fs from 'node:fs'
const require = createRequire(import.meta.url)
const { chromium } = require('../node_modules/.pnpm/playwright-core@1.57.0/node_modules/playwright-core')
const [base, out, ...paths] = process.argv.slice(2)
fs.mkdirSync(out, { recursive: true })
const dir = `${os.homedir()}/Library/Caches/ms-playwright`
const shell = fs.readdirSync(dir).filter(d => d.startsWith('chromium_headless_shell')).sort().pop()
const exe = `${dir}/${shell}/chrome-headless-shell-mac-arm64/chrome-headless-shell`
const browser = await chromium.launch({ executablePath: exe })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('[console]', m.type(), m.text().slice(0, 300)) })
page.on('pageerror', e => console.log('[pageerror]', e.message.slice(0, 300)))
page.on('requestfailed', r => console.log('[reqfail]', r.url().slice(0, 150), r.failure()?.errorText))
for (const p of (paths.length ? paths : ['/'])) {
  await page.goto(base + p, { waitUntil: 'networkidle' }).catch(e => console.log('goto', e.message))
  await page.waitForTimeout(2500)
  const name = p.replace(/[^\w]+/g, '_') || 'root'
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('shot', p, '->', page.url())
}
await browser.close()
