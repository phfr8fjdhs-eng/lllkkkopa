// Full screen: the button in the bar toggles it and the map takes the new size; on a phone the
// tap on «Start» goes to full screen at once; where the browser has no Fullscreen API for a page
// (Safari on the iPhone) the button explains the home screen instead. Screenshots go into build/.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  const must = (ok, what) => { if (!ok) { errors.push('FAILED: ' + what); console.log('FAILED', what); } else console.log('ok', what); };
  const open = async (opts, noApi) => {
    const ctx = await browser.newContext(opts);
    if (noApi) await ctx.addInitScript(() => {
      // like Safari on the iPhone: no Fullscreen API for a page
      delete Element.prototype.requestFullscreen; delete Element.prototype.webkitRequestFullscreen;
      Object.defineProperty(Element.prototype, 'requestFullscreen', { value: undefined });
      Object.defineProperty(Element.prototype, 'webkitRequestFullscreen', { value: undefined });
    });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
    await page.goto('file://' + out('index.html') + '?karte=welt');
    await page.waitForTimeout(800);
    return page;
  };
  const inFs = (page) => page.evaluate(() => !!document.fullscreenElement);
  const phone = { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true };

  // phone with the Fullscreen API (Android)
  let page = await open(phone);
  await page.tap('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  must(await inFs(page), 'phone: «Start» goes to full screen');
  must(await page.evaluate(() => document.getElementById('bFull').getAttribute('aria-label')) === 'Vollbild verlassen', 'phone: the button then reads «Vollbild verlassen»');
  await page.screenshot({ path: out('vollbild_m_an.png') });
  await page.tap('#bFull');
  await page.waitForTimeout(300);
  must(!(await inFs(page)), 'phone: the button leaves full screen');
  await page.tap('#bFull');
  await page.waitForTimeout(300);
  must(await inFs(page), 'phone: the button goes back to full screen');
  await page.context().close();

  // iPhone: no Fullscreen API, the button explains the home screen
  page = await open(phone, true);
  await page.tap('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  must(await page.isVisible('#bFull'), 'iPhone: the button is there');
  await page.tap('#bFull');
  await page.waitForTimeout(200);
  const t = await page.evaluate(() => { const e = document.getElementById('toast'); return e.hidden ? '' : e.textContent; });
  must(/Home-Bildschirm/.test(t), 'iPhone: the button explains «Zum Home-Bildschirm»');
  await page.screenshot({ path: out('vollbild_iphone.png') });
  await page.context().close();

  // desktop: «Start» stays windowed, the button goes to full screen and the canvas follows
  page = await open({ viewport: { width: 1280, height: 760 } });
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  must(!(await inFs(page)), 'desktop: «Start» does not go to full screen by itself');
  await page.click('#bFull');
  await page.waitForTimeout(400);
  must(await inFs(page), 'desktop: the button goes to full screen');
  const size = await page.evaluate(() => { const v = G.debug.view, r = v.cv.getBoundingClientRect(); return [v.cw, v.ch, r.width, r.height]; });
  must(size[0] === size[2] && size[1] === size[3], 'desktop: the map has the size of the screen (' + size.join(' ') + ')');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('vollbild_d.png') });
  await browser.close();
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
  console.log('vollbild ok');
})();
