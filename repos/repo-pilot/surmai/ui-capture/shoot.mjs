// Screenshot helper used to verify the seeded UI (not needed at runtime).
import { chromium } from '@playwright/test';
const base = process.env.BASE || 'http://localhost:5402';
const out = process.env.OUT || '.';
const paths = process.argv.slice(2);
const browser = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--no-sandbox', '--single-process', '--no-zygote', '--disable-gpu', '--no-proxy-server', '--disable-features=MachPortRendezvous'] } : {});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('requestfailed', (r) => errors.push('FAILED ' + r.url()));
await page.goto(base + '/login');
await page.waitForTimeout(1500);
await page.getByLabel(/email/i).first().fill('maya@chenokafor.family');
await page.getByLabel(/password/i).first().fill('Wanderlust#2026');
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
for (const [i, p] of paths.entries()) {
  if (p.startsWith('click:')) { await page.getByText(p.slice(6), { exact: false }).first().click(); await page.waitForTimeout(2000); }
  else { await page.goto(base + p); await page.waitForTimeout(3000); }
  await page.screenshot({ path: `${out}/shot${i}.png` });
}
console.log(errors.slice(0, 15).join('\n'));
await browser.close();
