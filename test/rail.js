// Builds a small rail network for the human player in headless Chrome and saves screenshots.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + out('index.html') + '?karte=welt');
  await page.waitForTimeout(1000);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  const res = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, W = g.W, UT = G.UT;
    let spot = -1;
    for (let t = (g.N / 2 | 0) + 300; t < g.N && spot < 0; t += 7) if (g.canSpawnAt(t) && g.map.shore[t] === 0) spot = t;
    g.opts.infiniteTroops = true; g.spawn(g.human, spot); g.spawnEnd = g.ticks + 2;
    const h = g.human, log = [];
    for (let i = 0; i < 1500; i++) {
      g.tick();
      if (g.phase !== 'play' || i % 5 || !h.alive) continue;
      h.troops = Math.max(h.troops, g.maxTroops(h) * 0.8);
      let free = -1, foe = -1;
      for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) { if (!g.map.land[n]) continue; const o = g.owner[n]; if (o === 0) free = n; else if (o !== h.id) foe = n; }
      if (free >= 0) g.strike(h, free, 0.4); else if (foe >= 0) g.strike(h, foe, 0.5);
      if (i === 900) {
        h.gold += 5e6;
        const pick = () => { for (let k = 0; k < 4000; k++) { const t = (h.y0 + Math.random() * (h.y1 - h.y0 + 1) | 0) * W + (h.x0 + Math.random() * (h.x1 - h.x0 + 1) | 0); if (g.owner[t] === h.id && !h.border.has(t) && !g.structNear(t, g.R.structDist)) return t; } return -1; };
        for (const ty of [UT.CITY, UT.CITY, UT.CITY, UT.FACTORY, UT.FACTORY, UT.PORT]) log.push(G.UNAME[ty] + (g.build(h, ty, pick()) ? ' ok' : ' -'));
      }
    }
    return { log, tiles: h.tiles, rails: g.rails.length, mine: g.rails.filter((e) => e.a.owner === h || e.b.owner === h).length, trains: h.cnt[UT.TRAIN], trainGold: h.trainGold || 0 };
  });
  console.log(JSON.stringify(res));
  await page.waitForTimeout(1200);
  await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, f = g.human.units.find((u) => u.type === G.UT.FACTORY); if (f) v.flyTo(f.x, f.y, 5); });
  await page.waitForTimeout(1500);
  console.log(JSON.stringify(await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; const f = h.units.find((u) => u.type === G.UT.FACTORY); return { cam: v.cam, f: f && { x: f.x, y: f.y, built: f.built, scr: v.screenOf(f.tile) }, fly: !!v.fly }; })));
  await page.screenshot({ path: out('rail_m_1.png') });
  await page.evaluate(() => { const v = G.debug.view, h = G.debug.game.human; v.flyTo(h.nameX, h.nameY, 1.6); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('rail_m_2.png') });
  const ownPt = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; v.flyTo(h.nameX, h.nameY, 3); return null; });
  await page.waitForTimeout(900);
  const pt = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; return v.screenOf(Math.round(h.nameY) * g.W + Math.round(h.nameX)); });
  await page.touchscreen.tap(pt.x, pt.y);
  await page.waitForTimeout(400);
  await page.click('#rN').catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: out('rail_m_3build.png') });
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
