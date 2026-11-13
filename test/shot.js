// Opens the built page in headless Chrome and takes screenshots.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const mobile = process.argv[2] !== 'desktop';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + path.join(__dirname, '..', 'build', 'index.html') + '?karte=welt');
  await page.waitForTimeout(1500);
  const tag = mobile ? 'm' : 'd';
  await page.screenshot({ path: path.join(__dirname, '..', 'build', `shot_${tag}_1start.png`) });
  console.log('errors so far:', errors);
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
