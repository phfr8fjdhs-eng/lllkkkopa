// The 3D close-up (src/06b_close.js) in headless Chrome: it switches on when zoomed in, shows
// models and tanks, does not change the game, can be switched off with J and in the menu, and the
// growth tempo under the ranking works. Also times a frame on the Earth. Pictures go to build/nah_*.png.
// node test/nah.js
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
let fails = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
  const errors = [];
  const open = async (url, opts) => {
    const page = await (await browser.newContext(opts || { viewport: { width: 1280, height: 760 } })).newPage();
    page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
    page.on('console', (m) => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
    await page.goto('file://' + out('index.html') + (url || ''));
    await page.waitForTimeout(900);
    return page;
  };
  const start = async (page, map) => {
    if (map) await page.evaluate((m) => { const b = document.querySelector('.mapc[data-id=' + m + ']'); b.scrollIntoView(); b.click(); }, map);
    await page.waitForTimeout(300);
    await page.evaluate(() => document.getElementById('fStart').click());
    await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 60000 });
    return page.evaluate(() => {
      const g = G.debug.game; let spot = -1;
      for (let t = (g.N * 0.5 | 0); t < g.N && spot < 0; t += 13) if (g.canSpawnAt(t) && g.map.shore[t] === 0) spot = t;
      G.debug.act({ k: 'spawn', t: spot });
      return spot;
    });
  };
  const look = (page, t, z) => page.evaluate(([t, z]) => { const v = G.debug.view, g = G.debug.game; v.fly = null; v.cam.x = t % g.W + 0.5; v.cam.y = ((t / g.W) | 0) + 0.5; v.cam.z = z; }, [t, z]);

  // ---- a game on Pangäa: build, grow, fight ----
  let page = await open();
  await start(page, 'pangaea');
  const setup = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W, UT = G.UT;
    g.opts.instantBuild = true;
    for (let i = 0; i < 1200; i++) {
      g.tick();
      if (i % 30 === 0) for (const t of h.border) { const n = [t - 1, t + 1, t - W, t + W].find((x) => g.map.land[x] && !g.owner[x]); if (n !== undefined) { G.debug.act({ k: 'strike', t: n, r: 0.3 }); break; } }
    }
    h.gold = 1e10;
    const pick = (u) => { for (let k = 0; k < 4000; k++) { const t = (h.y0 + Math.random() * (h.y1 - h.y0 + 1) | 0) * W + (h.x0 + Math.random() * (h.x1 - h.x0 + 1) | 0); if (g.owner[t] === h.id && g.buildCheck(h, u, t).ok) return t; } return -1; };
    for (const [u, n] of [[UT.CITY, 3], [UT.FACTORY, 1], [UT.DEFENSE, 1], [UT.SAM, 1], [UT.SILO, 1]]) for (let k = 0; k < n; k++) { const t = pick(u); if (t >= 0) g.build(h, u, t); }
    const city = h.units.find((u) => u.type === UT.CITY);
    if (city) g.upgradeBy(h, city, 29);
    // a war with the strongest neighbouring nation (a long fight), else with any neighbour
    const cnt = new Map();
    for (const t of h.border) for (const n of [t - 1, t + 1, t - W, t + W]) { const o = g.owner[n]; if (o && o !== h.id && !cnt.has(o)) cnt.set(o, n); }
    const foes = Array.from(cnt.keys()).sort((a, b) => (g.players[b].type !== G.PT.BOT) - (g.players[a].type !== G.PT.BOT) || g.players[b].troops - g.players[a].troops);
    let edge = -1, why = 'no neighbour';
    for (const o of foes) {
      h.troops = Math.max(h.troops, g.players[o].troops * 1.5 + 20000);
      why = g.exec(h.id, { k: 'strike', t: cnt.get(o), r: 0.3 });
      if (!why) { edge = cnt.get(o); break; }
    }
    for (let i = 0; i < 12; i++) g.tick();
    return { edge, why, city: city ? city.tile : -1, out: h.out.filter((a) => a.active && a.tid).length };
  });
  ok(setup.edge >= 0 && setup.out > 0, 'a war is on (' + setup.out + ' attacks' + (setup.why ? ', ' + setup.why : '') + ')');

  // far: signs as before; close: the models
  await look(page, setup.edge, 4);
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !(G.debug.view.nah && G.debug.view.nah.live)), 'zoomed out: no close-up');
  await look(page, setup.edge, 12);
  await page.waitForTimeout(1200);
  const st = await page.evaluate(() => { const S = G.debug.view.nah; let mine = 0, fight = 0; for (const t of S.tanks.values()) { if (t.p === G.debug.game.human) mine++; if (t.fight) fight++; } return { live: S.live, tanks: S.tanks.size, mine, fight }; });
  ok(st.live, 'zoomed in: the close-up is on');
  ok(st.tanks > 0 && st.fight > 0, 'tanks stand on the map (' + st.tanks + '), some of them at the front (' + st.fight + ')');
  await page.screenshot({ path: out('nah_front.png') });
  if (setup.city >= 0) { await look(page, setup.city, 16); await page.waitForTimeout(600); await page.screenshot({ path: out('nah_city.png') }); }

  // drawing changes nothing in the game
  const same = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    const sig = () => { let s = 0; for (let i = 0; i < g.N; i += 7) s = (s * 31 + g.owner[i]) | 0; for (const p of g.players) if (p) { s = (s * 31 + Math.round(p.troops * 100) + Math.round(p.gold)) | 0; if (p.post) for (const c of p.post.cells.values()) s = (s * 31 + Math.round(c.u * 1000) + c.n) | 0; } return s + ':' + g.rng.s + ':' + g.units.length + ':' + g.ticks; };
    const a = sig();
    for (let i = 0; i < 60; i++) v.draw(1, performance.now() + i * 16);
    return a === sig();
  });
  ok(same, 'drawing the close-up changes nothing in the game');

  // J switches it off and on, and the menu has the switch
  await page.keyboard.press('j');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => G.debug.view.close3d === false && !G.debug.view.nah.live && G.debug.cfg.nah === false), 'J: close-up off, signs instead');
  await page.screenshot({ path: out('nah_off.png') });
  await page.keyboard.press('j');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => G.debug.view.close3d === true && G.debug.view.nah.live), 'J again: close-up on');
  await page.click('#bMenu');
  await page.waitForTimeout(300);
  ok(await page.evaluate(() => !!document.getElementById('mNah') && document.getElementById('mNah').checked), 'the menu has the switch');
  await page.keyboard.press('Escape');

  // the tempo under the ranking
  await page.waitForFunction(() => !document.getElementById('lbTempo').hidden, null, { timeout: 30000 }).catch(() => {});
  const tempo = await page.evaluate(() => document.getElementById('lbTempo').textContent);
  ok(/Dein Tempo/.test(tempo) && /%/.test(tempo), 'tempo under the ranking: ' + tempo.replace(/\s+/g, ' '));
  await page.close();

  // ---- the Earth: how long a close frame takes ----
  page = await open('?karte=welt');
  const spot = await start(page);
  await page.evaluate(() => { const g = G.debug.game, h = g.human, W = g.W; for (let i = 0; i < 900; i++) { g.tick(); if (i % 30 === 0) for (const t of h.border) { const n = [t - 1, t + 1, t - W, t + W].find((x) => g.map.land[x] && !g.owner[x]); if (n !== undefined) { g.exec(h.id, { k: 'strike', t: n, r: 0.3 }); break; } } } });
  await page.waitForTimeout(1500);                       // let the flight to the spawn end first
  await look(page, spot, 9);
  await page.waitForTimeout(800);
  const ms = await page.evaluate(() => { const v = G.debug.view; v.fly = null; const t0 = performance.now(); for (let i = 0; i < 30; i++) v.draw(1, performance.now()); return { ms: (performance.now() - t0) / 30, live: !!(v.nah && v.nah.live), z: v.cam.z }; });
  ok(ms.live && ms.ms < 40, 'a close frame on the Earth (zoom ' + ms.z + ') takes ' + ms.ms.toFixed(1) + ' ms');
  await page.screenshot({ path: out('nah_erde.png') });
  await page.close();

  ok(errors.length === 0, 'no errors in the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(fails ? fails + ' failed' : 'all ok');
  process.exit(fails ? 1 : 0);
})();
