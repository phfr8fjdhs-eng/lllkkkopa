// The net in the browser: open the mode, pull the net together with one finger (or the mouse),
// check that a pinch leaves no mark, even it out again. Saves screenshots into build/.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
(async () => {
  const mobile = process.argv[2] !== 'desktop', tag = mobile ? 'm' : 'd';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: 1280, height: 760 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errors.push('CONSOLE ' + m.text()); });
  const must = (ok, what) => { if (!ok) { errors.push('FAILED: ' + what); console.log('FAILED', what); } else console.log('ok', what); };
  await page.goto('file://' + out('index.html') + '?karte=' + (process.argv[3] || 'welt'));
  await page.waitForTimeout(1000);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const spot = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.28; a += 0.4) {
      const x = v.cw / 2 + Math.cos(a) * r, y = v.ch / 2 + Math.sin(a) * r * 0.6, t = v.tileAt(x, y);
      if (t >= 0 && g.canSpawnAt(t) && g.map.shore[t] === 0) return { x, y };
    }
    return null;
  });
  if (mobile) await page.touchscreen.tap(spot.x, spot.y); else await page.mouse.click(spot.x, spot.y);
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 3000 });
  // grow for a while (the simulation is stepped by hand so the test does not take minutes)
  await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W;
    for (let k = 0; k < 60; k++) {
      for (const b of h.border) { const n = [b - 1, b + 1, b - W, b + W].find((n) => g.map.land[n] && g.owner[n] === 0); if (n !== undefined) { g.exec(h.id, { k: 'strike', t: n, r: 0.3 }); break; } }
      for (let i = 0; i < 20; i++) g.tick();
    }
    for (const a of h.out.slice()) g.retreat(a);
    g.immuneUntil = 1e9;
    for (let i = 0; i < 400; i++) g.tick();
    G.debug.view.flush && G.debug.view.flush();
  });
  await page.click('#bHome');
  await page.waitForTimeout(900);
  must(await page.evaluate(() => !document.getElementById('bNet').hidden), 'the button for the Aufstellung is there');
  await page.screenshot({ path: out(`net_${tag}_1faint.png`) });
  await page.click('#bNet');
  await page.waitForTimeout(500);
  must(await page.evaluate(() => !document.getElementById('netBar').hidden && document.getElementById('ctrl').hidden), 'the mode opens its own bar');
  await page.screenshot({ path: out(`net_${tag}_2mode.png`) });
  const pts = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human;
    const a = v.screenOf(h.nameY * g.W + h.nameX | 0);
    const cells = [...h.post.cells.values()].filter((c) => c.n > 200);
    const pick = cells.sort((x, y) => (y.id % g.CW) - (x.id % g.CW))[0];
    const cx = pick.id % g.CW, cy = (pick.id - cx) / g.CW;
    return { a: v.screenOf((cy * 16 + 8) * g.W + cx * 16 + 8), b: a, id: pick.id, cam: { ...v.cam } };
  });
  const weights = () => page.evaluate(() => { let n = 0, mx = 1, mn = 1; for (const c of G.debug.game.human.post.cells.values()) { if (c.m !== 1) n++; if (c.m > mx) mx = c.m; if (c.m < mn) mn = c.m; } return { n, mx, mn }; });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, list) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: list.map((p, i) => ({ x: p.x, y: p.y, id: i })) });
  const drag = async (from, to, n) => {
    if (mobile) {
      await touch('touchStart', [from]);
      await page.waitForTimeout(120);
      for (let i = 1; i <= n; i++) { await touch('touchMove', [{ x: from.x + (to.x - from.x) * i / n, y: from.y + (to.y - from.y) * i / n }]); await page.waitForTimeout(16); }
      await touch('touchEnd', []);
    } else {
      await page.mouse.move(from.x, from.y); await page.mouse.down();
      for (let i = 1; i <= n; i++) { await page.mouse.move(from.x + (to.x - from.x) * i / n, from.y + (to.y - from.y) * i / n); await page.waitForTimeout(16); }
      await page.mouse.up();
    }
  };
  // several strokes over the same stretch
  for (let k = 0; k < 4; k++) await drag(pts.a, { x: pts.a.x + (pts.b.x - pts.a.x) * 0.35, y: pts.a.y + (pts.b.y - pts.a.y) * 0.35 }, 12);
  await page.waitForTimeout(400);
  const w1 = await weights();
  must(w1.n > 0 && w1.mx > 1.5, 'drawing pulls the net together: ' + w1.n + ' cells, up to ' + w1.mx.toFixed(2));
  const cam1 = await page.evaluate(() => ({ ...G.debug.view.cam }));
  must(Math.abs(cam1.x - pts.cam.x) < 0.01 && Math.abs(cam1.y - pts.cam.y) < 0.01, 'one finger draws, the map stays put');
  await page.screenshot({ path: out(`net_${tag}_3drawn.png`) });
  // let the troops march and look again
  pts.id = await page.evaluate(() => { let b = null; for (const c of G.debug.game.human.post.cells.values()) if (c.n > 30 && (!b || c.m > b.m)) b = c; return b.id; });
  const share = () => page.evaluate((id) => { const g = G.debug.game, h = g.human, c = h.post.cells.get(id); return c ? g.postDens(h, c) : 0; }, pts.id);
  const d0 = await share();
  await page.evaluate(() => { const g = G.debug.game; for (let i = 0; i < 600; i++) g.tick(); });
  await page.waitForTimeout(700);
  const d1 = await share();
  if (process.env.DBG) console.log(await page.evaluate(() => { const g = G.debug.game, h = g.human; return 'T ' + g.ticks + ' troops ' + Math.round(h.troops) + ' tiles ' + h.tiles + ' out ' + h.out.map((a) => Math.round(a.troops) + '+' + Math.round(a.want)).join(',') + '\n' + [...h.post.cells.values()].map((c) => c.n + ':' + c.m.toFixed(1) + ':' + g.postDens(h, c).toFixed(2) + (c.d > 1e17 ? '!' : '')).join(' '); }));
  const aim = await page.evaluate((id) => { const h = G.debug.game.human; let w = 0; for (const c of h.post.cells.values()) w += c.n * c.m; return h.post.cells.get(id).m * h.tiles / w; }, pts.id);
  must(aim > 1.05 && Math.abs(d1 - aim) < 0.15 * aim, 'the troops follow: density there ' + d0.toFixed(2) + ' -> ' + d1.toFixed(2) + ' (the net asks for ' + aim.toFixed(2) + ')');
  await page.screenshot({ path: out(`net_${tag}_4marched.png`) });
  if (mobile) {
    // two fingers: the map moves and zooms, the net keeps its weights
    const before = await weights();
    const c = { x: 195, y: 330 };
    await touch('touchStart', [{ x: c.x - 40, y: c.y }]);
    await page.waitForTimeout(30);
    await touch('touchStart', [{ x: c.x - 40, y: c.y }, { x: c.x + 40, y: c.y }]);
    for (let i = 1; i <= 10; i++) { await touch('touchMove', [{ x: c.x - 40 - i * 4, y: c.y + i * 3 }, { x: c.x + 40 + i * 4, y: c.y + i * 3 }]); await page.waitForTimeout(16); }
    await touch('touchEnd', []);
    await page.waitForTimeout(300);
    const after = await weights(), cam2 = await page.evaluate(() => ({ ...G.debug.view.cam }));
    must(after.n === before.n && Math.abs(after.mx - before.mx) < 1e-9, 'a pinch leaves no mark on the net');
    must(cam2.z > cam1.z * 1.2, 'two fingers zoom the map (' + cam1.z.toFixed(2) + ' -> ' + cam2.z.toFixed(2) + ')');
  }
  await page.click('#netLess');
  await page.click('#bHome'); await page.waitForTimeout(700);
  const p2 = await page.evaluate((id) => { const g = G.debug.game, v = G.debug.view, cx = id % g.CW, cy = (id - cx) / g.CW; return v.screenOf((cy * 16 + 8) * g.W + cx * 16 + 8); }, pts.id);
  for (let k = 0; k < 30; k++) await drag(p2, { x: p2.x + 3, y: p2.y + 3 }, 2);
  await page.waitForTimeout(400);
  const w2 = await page.evaluate((id) => G.debug.game.human.post.cells.get(id).m, pts.id);
  must(w2 < w1.mx, 'the other brush lets the net go again: weight ' + w2.toFixed(2));
  await page.click('#netEven');
  await page.waitForTimeout(400);
  const w3 = await weights();
  must(w3.n === 0, 'Ausgleichen puts everything back to even');
  await page.click('#netDone');
  await page.waitForTimeout(300);
  must(await page.evaluate(() => document.getElementById('netBar').hidden && !document.getElementById('ctrl').hidden), 'Fertig closes the mode');
  // the line next to the slider says what an order would have at hand
  await page.evaluate(() => { G.debug.game.immuneUntil = 0; });
  const txt = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W;
    for (const b of h.border) { const n = [b - 1, b + 1, b - W, b + W].find((n) => g.map.land[n] && g.owner[n] !== h.id); if (n !== undefined) { const i = g.commitInfo(h, n, 0.5); return Math.round(i.now) + ' / ' + Math.round(i.later) + ' / ' + i.eta.toFixed(1); } }
    return '';
  });
  must(/^\d+ \/ \d+ \/ [\d.]+$/.test(txt), 'an order knows what is at hand: ' + txt + ' (sofort / unterwegs / s)');
  await page.screenshot({ path: out(`net_${tag}_5done.png`) });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
