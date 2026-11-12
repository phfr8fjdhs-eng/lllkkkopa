// Checks the newer features in headless Chrome: map picker, special maps, sound, hotkeys,
// railways, ships being taken, boat trails and the hydrogen bomb. Saves screenshots to build/.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const open = async (opts) => {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + out('index.html'));
    await page.waitForTimeout(1200);
    return page;
  };

  // ---- phone: picker and a special map ----
  let page = await open({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await page.screenshot({ path: out('feat_m_1start.png') });
  await page.evaluate(() => document.querySelector('.mapc[data-id=ring]').scrollIntoView({ inline: 'center', block: 'center' }));
  await page.tap('.mapc[data-id=ring]');
  await page.waitForTimeout(900);
  await page.screenshot({ path: out('feat_m_2ring.png') });
  await page.tap('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  console.log('ring map', JSON.stringify(await page.evaluate(() => { const g = G.debug.game; return { id: g.map.id, players: g.players.length - 1, audio: G.Audio.ctx && G.Audio.ctx.state }; })));
  // spawn, let the game run a little and look at the phone layout with the sound button
  await page.evaluate(() => { const g = G.debug.game; let t = -1; for (let i = (g.N / 2 | 0); i < g.N && t < 0; i += 7) if (g.canSpawnAt(i) && g.map.shore[i] === 0) t = i; G.debug.act({ k: 'spawn', t: t }); });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out('feat_m_3game.png') });
  await page.tap('#bMenu');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('feat_m_4menu.png') });
  await page.close();

  // ---- desktop: play on the island map with plenty of gold ----
  page = await open({ viewport: { width: 1280, height: 760 } });
  await page.click('.mapc[data-id=inseln]');
  await page.waitForTimeout(600);
  await page.screenshot({ path: out('feat_d_1start.png') });
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  const res = await page.evaluate(() => {
    const g = G.debug.game, W = g.W, UT = G.UT, h = g.human, log = {};
    let spot = -1;
    for (let t = (g.N / 2 | 0); t < g.N && spot < 0; t += 7) if (g.canSpawnAt(t) && g.map.shore[t] === 0) spot = t;
    g.opts.infiniteTroops = true; g.opts.infiniteGold = true; g.spawn(h, spot); g.spawnEnd = g.ticks + 2;
    const pick = () => { for (let k = 0; k < 6000; k++) { const t = (h.y0 + Math.random() * (h.y1 - h.y0 + 1) | 0) * W + (h.x0 + Math.random() * (h.x1 - h.x0 + 1) | 0); if (g.owner[t] === h.id && !h.border.has(t) && !g.structNear(t, g.R.structDist)) return t; } return -1; };
    for (let i = 0; i < 2600; i++) {
      g.tick();
      if (g.phase !== 'play' || !h.alive) continue;
      if (i % 5 === 0) {
        h.troops = Math.max(h.troops, g.maxTroops(h) * 0.8);
        let free = -1, foe = -1;
        for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) { if (!g.map.land[n]) continue; const o = g.owner[n]; if (o === 0) free = n; else if (o !== h.id) foe = n; }
        if (free >= 0) g.strike(h, free, 0.4); else if (foe >= 0) g.strike(h, foe, 0.5);
      }
      if (i === 700) for (const ty of [UT.CITY, UT.CITY, UT.FACTORY, UT.CITY, UT.FACTORY, UT.PORT, UT.PORT, UT.SILO]) g.build(h, ty, pick());
      if (i === 760 || i === 900 || i === 1100) { const p = h.units.find((u) => u.type === UT.PORT && u.built); if (p) g.build(h, UT.WARSHIP, p.water); }
    }
    log.tiles = h.tiles; log.cnt = Array.from(h.cnt); log.rails = g.rails.length;
    log.pts = g.rails.map((e) => e.path.pts.length + '/' + e.path.length).slice(0, 8);
    // every rail tile must be land and consecutive tiles must touch
    for (const e of g.rails) for (let i = 0; i < e.path.length; i++) {
      if (!g.map.land[e.path[i]]) throw new Error('rail over water');
      if (i) { const a = e.path[i - 1], b = e.path[i]; if (Math.abs(a % W - b % W) > 1 || Math.abs((a / W | 0) - (b / W | 0)) > 1) throw new Error('rail jump'); }
    }
    log.trainGold = h.trainGold || 0;
    // ship taking: put a foreign boat and a foreign warship next to one of ours
    const ws = h.units.find((u) => u.type === UT.WARSHIP);
    log.warship = !!ws;
    if (ws) {
      const foe = g.players.find((p) => p && p.alive && p !== h && !g.friendly(p, h));
      const b = g.newUnit(UT.TRANSPORT, foe, ws.tile); b.troops = 5000; b.path = null; b.pi = 0; b.dst = ws.tile; b.tid = 0; b.retreat = false; g.addUnit(b);
      const w2 = g.newUnit(UT.WARSHIP, foe, ws.tile); w2.hp = 250; w2.patrol = ws.tile; w2.shotAt = 1e9; w2.target = null; w2.path = null; w2.pi = 0; w2.wait = false; g.addUnit(w2);
      const before = h.cnt[UT.WARSHIP];
      for (let i = 0; i < 200; i++) g.tick();
      log.boatTaken = !b.active; log.warTaken = w2.owner === h; log.warCount = [before, h.cnt[UT.WARSHIP]]; log.w2 = { hp: w2.hp, active: w2.active, owner: w2.owner.name, foe: foe.name, foeAlive: foe.alive, d: Math.hypot(w2.x - ws.x, w2.y - ws.y), wsActive: ws.active, tg: ws.target && ws.target.type };
    }
    return log;
  });
  console.log(JSON.stringify(res));
  // rails close up
  await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, f = g.human.units.find((u) => u.type === G.UT.FACTORY); if (f) v.flyTo(f.x, f.y, 7); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('feat_d_2rails.png') });
  await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, f = g.human.units.find((u) => u.type === G.UT.FACTORY); if (f) v.flyTo(f.x, f.y, 3); });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out('feat_d_3rails_far.png') });
  // a boat with its trail, plus ships
  const boat = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W;
    for (let k = 0; k < 40000; k++) {
      const t = (Math.random() * g.N) | 0;
      if (!g.map.land[t] || g.owner[t] === h.id) continue;
      const plan = g.boatPlan(h, t);
      if (plan && g.sendBoat(h, plan, 20000)) { h.boats = 0; if (h.units.filter((u) => u.type === G.UT.TRANSPORT).length >= 3) break; }
    }
    return h.units.filter((u) => u.type === G.UT.TRANSPORT).length;
  });
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, b = g.human.units.find((u) => u.type === G.UT.TRANSPORT && u.path && u.pi > 20) || g.human.units.find((u) => u.type === G.UT.WARSHIP); if (b) v.flyTo(b.x, b.y, 5); });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out('feat_d_4boats.png') });
  console.log('boats', boat);
  // hotkeys: point at own land and press keys
  const pt = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; v.fly = null; v.cam.x = h.nameX; v.cam.y = h.nameY; v.cam.z = 4; return v.screenOf(Math.round(h.nameY) * g.W + Math.round(h.nameX)); });
  await page.mouse.move(pt.x, pt.y);
  const c0 = await page.evaluate(() => Array.from(G.debug.game.human.cnt));
  await page.keyboard.press('4');
  await page.keyboard.press('e'); await page.keyboard.press('e');
  await page.keyboard.press('b');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out('feat_d_5build.png') });
  await page.keyboard.press('Escape');
  // hydrogen bomb on a neighbour: key 0 aims, Enter fires
  const tgt = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; const foe = g.players.filter((p) => p && p.alive && p !== h).sort((a, b) => b.tiles - a.tiles)[0]; v.cam.x = foe.nameX; v.cam.y = foe.nameY; v.cam.z = 2.5; return v.screenOf(Math.round(foe.nameY) * g.W + Math.round(foe.nameX)); });
  await page.mouse.move(tgt.x, tgt.y);
  await page.keyboard.press('0');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out('feat_d_5aim.png') });
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => G.debug.game.falloutCount > 500, null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(350);
  await page.screenshot({ path: out('feat_d_6hydro.png') });
  console.log(JSON.stringify(await page.evaluate((c0) => { const g = G.debug.game, h = g.human; return { defBefore: c0[1], defAfter: h.cnt[1], ratio: document.getElementById('ratioPct').textContent, fallout: g.falloutCount, audio: G.Audio.ctx && G.Audio.ctx.state, music: G.Audio.on.music }; }, c0)));
  await page.keyboard.press('m');
  console.log('after M', JSON.stringify(await page.evaluate(() => ({ on: G.Audio.on, cfg: G.debug.cfg.music }))));
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
