// Load test for drawing: how long one picture of the map takes with N ships on the sea, seen
// from far (whole map) and from close. Runs the real build in headless Chrome.
//   node test/stress_view.js [N,N,...]        (first `python3 tools/build.py`)
// GL=1: the map and the ship hulls on the graphics card (here WebGL in software); with SHIPS2D=1
// as well, the hulls in Canvas 2D on top of the WebGL map (to compare the two ways of drawing ships).
// Headless Chrome draws without the graphics card, so the numbers are for comparing, not the
// speed on a phone.
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const sizes = (process.argv[2] || '0,100,1000,5000,10000').split(',').map(Number);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  page.on('pageerror', (e) => console.log('PAGEERROR', e.message));
  await page.goto('file://' + (process.env.HTML || path.join(__dirname, '..', 'build', 'index.html')) + '?karte=welt&worker=0' + (process.env.GL ? '&gl=1' : ''));
  await page.waitForTimeout(800);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.evaluate(() => {
    const g = G.debug.game;
    for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t]) { g.spawn(g.human, t); break; }
  });
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 10000 });
  // let the game run a while (fast) so there are realms, ports and trade
  await page.evaluate(() => { const g = G.debug.game; for (let i = 0; i < 1500; i++) g.tick(); G.debug.view.flush(); G.debug.view.placeNames(); G.debug.ui && 0; });
  await page.evaluate((off) => { G.ui.setPaused(true); G.debug.view.sglOff = off; }, !!process.env.SHIPS2D);
  for (const N of sizes) {
    const r = await page.evaluate((N) => {
      const g = G.debug.game, v = G.debug.view, UT = G.UT, map = g.map;
      // take away what an earlier round added
      for (const u of g.units) if (u.stress) g.removeUnit(u);
      g.units = g.units.filter((u) => u.active);
      const alive = g.players.filter((p) => p && p.alive);
      const routes = g.units.filter((u) => u.active && u.type === UT.TRADE && u.path && u.path.length > 20).map((u) => u.path);
      const sea = [];
      for (let t = 0; t < map.N; t += 7) if (!map.land[t]) sea.push(t);
      const rng = new G.RNG(99), ports = g.getPorts();
      for (let k = 0; k < N; k++) {
        const p = alive[rng.int(0, alive.length)];
        let u;
        if (k % 3 === 0 || !routes.length) {
          const t = sea[rng.int(0, sea.length)];
          u = g.newUnit(UT.WARSHIP, p, t);
          u.hp = 1000; u.patrol = t; u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false; u.cls = k % 2;
        } else {
          const rt = routes[rng.int(0, routes.length)], pi = rng.int(0, rt.length - 1);
          u = g.newUnit(k % 3 === 1 ? UT.TRADE : UT.TRANSPORT, p, rt[pi]);
          u.path = rt; u.pi = pi; u.captured = false; u.kind = k % 3; u.hits = 1; u.gold = 1000; u.dstPort = ports[0]; u.tid = 0; u.troops = 100;
        }
        u.stress = true; g.addUnit(u);
      }
      let r0 = 0;
      const time = (z, n) => {
        v.fly = null; v.cam.z = z; v.cam.x = map.W / 2; v.cam.y = map.H / 2; v.clampCam();
        for (let i = 0; i < 3; i++) v.draw(0.5, performance.now());
        const t0 = performance.now();
        for (let i = 0; i < n; i++) v.draw(0.5, performance.now());
        return (performance.now() - t0) / n;
      };
      const far = time(0.1, 20), mid = time(3, 20), near = time(12, 20);
      // with WebGL the card works on after draw returns: wait for it once, as the next frame would
      if (v.glm) { const t0 = performance.now(); v.draw(0.5, performance.now()); v.ctx.getImageData(0, 0, 1, 1); r0 = performance.now() - t0; }
      // painting the whole map again (what a flush costs when the changed tiles lie far apart)
      for (let t = 0; t < g.N; t += 1) g.markDirty(t);
      const t1 = performance.now(); v.flush(); const flush = performance.now() - t1;
      return { N: N, units: g.units.filter((u) => u.active).length, far: far, mid: mid, near: near, flush: flush, sync: r0, how: v.glm ? (v.sgl && !v.sglOff ? 'Karte und Schiffe WebGL' : 'Karte WebGL, Schiffe 2D') : '2D' };
    }, N);
    console.log(`+${String(r.N).padStart(5)} Schiffe  Einheiten ${String(r.units).padStart(5)}  Bild: ganze Karte ${r.far.toFixed(1)} ms  mittel ${r.mid.toFixed(1)} ms  nah ${r.near.toFixed(1)} ms  ganze Karte neu malen ${r.flush.toFixed(0)} ms` + (r.sync ? `  ein Bild mit Warten auf die Grafikkarte (nah) ${r.sync.toFixed(1)} ms` : '') + `  (${r.how})`);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
