// Visual check of buildings, ships and missiles: unlimited resources, everything built through the game API.
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto('file://' + out('index.html'));
  await page.waitForTimeout(1000);
  await page.click('#fMap [data-id="europa"]');
  await page.check('#fInstant'); await page.check('#fGold'); await page.check('#fTroops');
  await page.waitForTimeout(500);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  const info = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W, UT = G.UT, map = g.map;
    // spawn on a free coastal tile
    let t = -1;
    for (let i = 0; i < 200000 && t < 0; i++) { const c = (Math.random() * g.N) | 0; if (g.canSpawnAt(c) && map.shore[c] === 1 && g.portWater(c) >= 0) t = c; }
    g.spawn(h, t); g.spawnEnd = g.ticks + 2;
    const log = [];
    const own = (inner) => { for (let i = 0; i < 5000; i++) { const c = ((h.y0 + Math.random() * (h.y1 - h.y0 + 1)) | 0) * W + ((h.x0 + Math.random() * (h.x1 - h.x0 + 1)) | 0); if (g.owner[c] === h.id && (!inner || !h.border.has(c))) return c; } return -1; };
    for (let i = 0; i < 900; i++) {
      g.tick();
      if (g.phase !== 'play' || i % 15) continue;
      let free = -1, foe = -1;
      for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) { if (!map.land[n]) continue; const o = g.owner[n]; if (o === 0) free = n; else if (o !== h.id) foe = n; }
      if (free >= 0) g.strike(h, free, 0.3); else if (foe >= 0) g.strike(h, foe, 0.3);
      if (i === 300) { for (const ty of [UT.PORT, UT.CITY, UT.CITY, UT.DEFENSE, UT.SILO, UT.SILO, UT.SAM]) { const u = g.build(h, ty, own(ty !== UT.PORT)); log.push(G.UNAME[ty] + (u ? ' ok' : ' FAILED')); } }
      if (i === 330) { const port = h.units.find((u) => u.type === UT.PORT); if (port) { log.push('warship ' + !!g.build(h, UT.WARSHIP, port.water)); log.push('upgrade ' + g.upgrade(h, h.units.find((u) => u.type === UT.CITY))); } }
    }
    return { log, tiles: h.tiles, units: h.units.map((u) => G.UNAME[u.type]) };
  });
  console.log(JSON.stringify(info));
  await page.evaluate(() => { const g = G.debug.game, h = g.human, v = G.debug.view; v.flyTo(h.nameX, h.nameY, Math.min(v.cw, v.ch) / Math.max(40, Math.max(h.x1 - h.x0, h.y1 - h.y0) * 1.15)); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out(`rich_${tag}_1base.png`) });
  // launch one of each bomb at the biggest foreign player and send a boat
  const shots = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, UT = G.UT, W = g.W, v = G.debug.view;
    const foes = g.players.filter((p) => p && p.alive && p !== h).sort((a, b) => b.tiles - a.tiles);
    const q = foes[0];
    const tileOf = (p) => { for (let i = 0; i < 9000; i++) { const c = ((p.y0 + Math.random() * (p.y1 - p.y0 + 1)) | 0) * W + ((p.x0 + Math.random() * (p.x1 - p.x0 + 1)) | 0); if (g.owner[c] === p.id) return c; } return -1; };
    const res = [];
    res.push('atom ' + !!g.build(h, UT.ATOM, tileOf(q)));
    res.push('hydro ' + !!g.build(h, UT.HYDRO, tileOf(q)));
    for (let i = 0; i < 80; i++) g.tick();
    res.push('mirv ' + !!g.build(h, UT.MIRV, tileOf(foes[1] || q)));
    let boat = false;
    for (let i = 0; i < 400 && !boat; i++) { const c = (Math.random() * g.N) | 0; if (g.map.land[c] && g.owner[c] !== h.id) { const a = g.actionsAt(h, c); if (a.boat) boat = !!g.sendBoat(h, a.boat, h.troops * 0.1); } }
    res.push('boat ' + boat);
    for (let i = 0; i < 12; i++) g.tick();
    v.fit(false);
    return { res, target: q.name, nukes: g.nukes.filter((n) => n.active).map((n) => G.UNAME[n.type] + ' ' + n.prog.toFixed(2)) };
  });
  console.log(JSON.stringify(shots));
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(`rich_${tag}_2flight.png`) });
  await page.evaluate(() => { const g = G.debug.game; for (let i = 0; i < 60; i++) g.tick(); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`rich_${tag}_3later.png`) });
  const state = await page.evaluate(() => { const g = G.debug.game; for (let i = 0; i < 400; i++) g.tick(); return { fallout: g.falloutCount, nukes: g.nukes.filter((n) => n.active).length, human: g.human.alive, boats: g.human.boats, ms: (() => { const t = performance.now(); for (let i = 0; i < 200; i++) g.tick(); return ((performance.now() - t) / 200).toFixed(2); })() }; });
  console.log(JSON.stringify(state));
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`rich_${tag}_4after.png`) });
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
