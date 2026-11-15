// Two-finger zoom on a phone: the map point that was between the fingers when the pinch began
// must still be between them afterwards, also while the fingers move sideways, at the zoom limits
// and after a finger whose lift was never reported.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const must = (ok, what) => { if (!ok) { errors.push('FAILED: ' + what); console.log('FAILED', what); } else console.log('ok', what); };
  await page.goto('file://' + path.join(__dirname, '..', 'build', 'index.html') + '?karte=welt');
  await page.waitForTimeout(800);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(400);
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const world = (x, y) => page.evaluate(([x, y]) => { const v = G.debug.view, c = v.cam; return { x: (x - v.cw / 2) / c.z + c.x, y: (y - v.ch / 2) / c.z + c.y, z: c.z }; }, [x, y]);
  // fingers go from a0,b0 to a1,b1 in small steps, one finger at a time like a real screen reports it
  const pinch = async (a0, b0, a1, b1, steps) => {
    await touch('touchStart', [a0]);
    await touch('touchStart', [a0, b0]);
    for (let i = 1; i <= steps; i++) {
      const k = i / steps, kp = (i - 1) / steps;
      const a = [a0[0] + (a1[0] - a0[0]) * k, a0[1] + (a1[1] - a0[1]) * k];
      const bp = [b0[0] + (b1[0] - b0[0]) * kp, b0[1] + (b1[1] - b0[1]) * kp];
      const b = [b0[0] + (b1[0] - b0[0]) * k, b0[1] + (b1[1] - b0[1]) * k];
      await touch('touchMove', [a, bp]);
      await touch('touchMove', [a, b]);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(60);
  };
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const check = async (name, a0, b0, a1, b1) => {
    const m0 = mid(a0, b0), m1 = mid(a1, b1), w0 = await world(m0[0], m0[1]);
    await pinch(a0, b0, a1, b1, 14);
    const w1 = await world(m1[0], m1[1]);
    const off = Math.hypot(w1.x - w0.x, w1.y - w0.y) * w1.z;      // in screen pixels
    must(off < 1.5, name + ': point between the fingers stays there (' + off.toFixed(2) + ' px off, zoom ' + w0.z.toFixed(2) + ' -> ' + w1.z.toFixed(2) + ')');
    return [w0.z, w1.z];
  };
  await page.evaluate(() => { const v = G.debug.view; v.cam.z = 3; v.cam.x = v.map.W * 0.5; v.cam.y = v.map.H * 0.4; v.clampCam(); });
  let z = await check('zoom in off-centre', [90, 560], [130, 600], [40, 480], [200, 660]);
  must(z[1] > z[0] * 2, 'spreading the fingers zooms in');
  z = await check('zoom out off-centre', [220, 180], [360, 320], [270, 230], [310, 270]);
  must(z[1] < z[0] * 0.6, 'closing the fingers zooms out');
  await check('zoom in while the fingers wander', [60, 200], [120, 240], [200, 420], [340, 620]);
  // a finger that never reported its lift must not turn the next single finger into a pinch
  await page.evaluate(() => { const v = G.debug.view; v.cam.z = 3; v.clampCam(); });
  await page.evaluate(() => {
    const cv = document.getElementById('cv');
    cv.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 991, pointerType: 'touch', isPrimary: true, clientX: 20, clientY: 700, bubbles: true }));
  });
  const before = await world(195, 390);
  await touch('touchStart', [[150, 300]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[150 + i * 8, 300]]);
  await touch('touchEnd', []);
  await page.waitForTimeout(80);
  const after = await world(195, 390);
  must(Math.abs(after.z - before.z) < 1e-9, 'one finger after a lost finger only moves the map, it does not zoom');
  // at the nearest zoom: go on spreading, then close again; it must zoom out at once
  await page.evaluate(() => { const v = G.debug.view; v.cam.z = 26; v.clampCam(); });
  await touch('touchStart', [[150, 390]]);
  await touch('touchStart', [[150, 390], [240, 390]]);
  for (let i = 1; i <= 10; i++) await touch('touchMove', [[150 - i * 8, 390], [240 + i * 8, 390]]);
  await page.waitForTimeout(80);
  const top = (await world(195, 390)).z;
  await touch('touchMove', [[90, 390], [300, 390]]);
  await page.waitForTimeout(80);
  const back = (await world(195, 390)).z;
  await touch('touchEnd', []);
  must(top === 28 && back < 27, 'turning back at the nearest zoom zooms out at once (' + top + ' -> ' + back.toFixed(2) + ')');
  await browser.close();
  if (errors.length) { console.log(errors.join('\n')); process.exit(1); }
  console.log('pinch ok');
})();
