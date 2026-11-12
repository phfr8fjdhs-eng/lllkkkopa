// Walks through the main screens in headless Chrome: start, spawn, circle menu, build menu,
// upgrade, aiming a bomb, gold for a conquered bot. Saves screenshots into build/.
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
  await page.goto('file://' + out('index.html'));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: out(`ui_${tag}_1start.png`) });
  const tapAt = async (x, y) => { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`ui_${tag}_2spawn.png`) });
  const spot = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.28; a += 0.4) {
      const x = v.cw / 2 + Math.cos(a) * r, y = v.ch / 2 + Math.sin(a) * r * 0.6, t = v.tileAt(x, y);
      if (t >= 0 && g.canSpawnAt(t) && g.map.shore[t] === 0) return { x, y };
    }
    return null;
  });
  await tapAt(spot.x, spot.y);
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 3000 });
  must(true, 'game starts right after the start point is picked');
  await page.waitForTimeout(1500);
  // tap free land next to our territory -> attacks at once, no menu
  const freeSpot = () => page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human, W = g.W;
    for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (g.map.land[n] && g.owner[n] === 0) return v.screenOf(n);
    return null;
  });
  const target = await freeSpot();
  await tapAt(target.x, target.y);
  await page.waitForTimeout(450);
  must(await page.evaluate(() => document.getElementById('radial').hidden && G.debug.game.human.out.length === 1), 'a tap on free land attacks at once');
  // a nation is never attacked by a tap alone: the menu opens and waits for Angreifen
  const nat = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, q = g.players.find((p) => p && p.alive && p.type === G.PT.NATION && p.nameSize);
    if (!q) return null;
    const cam = { x: v.cam.x, y: v.cam.y, z: v.cam.z };
    v.fly = null; v.cam.x = q.nameX; v.cam.y = q.nameY;
    let t = -1;
    for (let i = 0; i < g.N && t < 0; i++) if (g.owner[i] === q.id) t = i;
    const pt = v.screenOf(t);
    G.debug.tap(pt.x, pt.y);
    const r = { open: !document.getElementById('radial').hidden, out: g.human.out.length };
    document.getElementById('radial').hidden = true;
    v.cam.x = cam.x; v.cam.y = cam.y; v.cam.z = cam.z;
    return r;
  });
  if (nat) must(nat.open && nat.out === 1, 'a tap on a nation opens the menu and does not attack');
  // a long press opens the menu on free land too
  const t2 = await freeSpot();
  await page.evaluate((p) => G.debug.tap(p.x, p.y, true), t2);
  await page.waitForTimeout(450);
  must(await page.evaluate(() => !document.getElementById('radial').hidden), 'a long press opens the menu');
  await page.screenshot({ path: out(`ui_${tag}_3radial.png`) });
  await page.click('#rC');
  await page.waitForTimeout(600);
  must(await page.evaluate(() => G.debug.game.human.out.length >= 1), 'Angreifen starts the attack');
  await page.waitForTimeout(6000);
  // build menu on own land
  await page.evaluate(() => { G.debug.game.human.gold = 9e6; });
  const own = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human;
    return v.screenOf(h.spawnTile);
  });
  await tapAt(own.x, own.y);
  await page.waitForTimeout(450);
  await page.click('#rN');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(`ui_${tag}_4build.png`) });
  await page.click('.item[data-t="0"]');
  await page.waitForFunction(() => G.debug.game.human.cityLv === 1, null, { timeout: 8000 });
  await page.waitForTimeout(300);
  await tapAt(own.x, own.y);
  await page.waitForTimeout(450);
  must(await page.evaluate(() => !document.getElementById('sheet').hidden && document.getElementById('radial').hidden && !!document.querySelector('.upbtn')), 'a tap on an own building opens its upgrade card at once');
  await page.screenshot({ path: out(`ui_${tag}_6upgrade.png`) });
  await page.click('.upbtn');
  await page.waitForTimeout(300);
  must(await page.evaluate(() => G.debug.game.human.cityLv === 2), 'city upgraded to level 2');
  // a silo, an enemy air defence, then aim a bomb
  const aimAt = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human, W = g.W;
    g.opts.instantBuild = true;
    g.opts.infiniteTroops = true; h.troops = 1e6;   // a strong army, so that no bot nibbles the silo away during the test
    let far = -1;
    for (const b of h.border) { if (far < 0 || Math.abs(b % W - h.spawnTile % W) > Math.abs(far % W - h.spawnTile % W)) far = b; }
    let silo = -1;
    g.forTiles(h, (t) => { if (silo < 0 && !g.structNear(t, g.R.structDist)) silo = t; });
    g.exec(h.id, { k: 'build', u: G.UT.SILO, t: silo });
    g.immuneUntil = 0;
    // nearest foreign player gets an air defence
    let foe = null, bd = 1e9;
    for (let i = 1; i < g.players.length; i++) { const p = g.players[i]; if (p === h || !p.alive || p.tiles < 30) continue; const d = Math.hypot((p.x0 + p.x1) / 2 - h.spawnTile % W, (p.y0 + p.y1) / 2 - ((h.spawnTile / W) | 0)); if (d < bd) { bd = d; foe = p; } }
    let ft = -1; g.forTiles(foe, (t) => { if (ft < 0 && !g.structNear(t, g.R.structDist)) ft = t; });
    foe.gold = 9e6; g.build(foe, G.UT.SAM, ft);
    v.cam.x = (ft % W + h.spawnTile % W) / 2; v.cam.y = (((ft / W) | 0) + ((h.spawnTile / W) | 0)) / 2; v.cam.z = Math.min(v.cw, v.ch) / (g.R.sam * 3.2);
    return { own: v.screenOf(h.spawnTile), foe: v.screenOf(ft), silos: h.cnt[G.UT.SILO], sams: foe.cnt[G.UT.SAM] };
  });
  console.log('aim setup', JSON.stringify(aimAt));
  await page.waitForTimeout(300);
  await page.evaluate((p) => G.debug.tap(p.x, p.y + 14, true), aimAt.foe);   // long press: the menu, not an attack
  await page.waitForTimeout(450);
  await page.click('#rN');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out(`ui_${tag}_7buildFoe.png`) });
  await page.click('.item[data-t="' + 12 + '"]');
  await page.waitForTimeout(500);
  must(await page.evaluate(() => !document.getElementById('aimBar').hidden && G.debug.game.nukes.length === 0), 'choosing a bomb opens aiming and does not fire yet');
  await page.screenshot({ path: out(`ui_${tag}_8aim.png`) });
  console.log('aim text:', await page.textContent('#aimInfo'));
  const goldBefore = await page.evaluate(() => G.debug.game.human.gold);
  await page.click('#aimGo');
  await page.waitForTimeout(700);
  must(await page.evaluate((b) => G.debug.game.human.gold < b - 600000 && document.getElementById('aimBar').hidden, goldBefore), 'Abfeuern launches the bomb');
  await page.screenshot({ path: out(`ui_${tag}_9flight.png`) });
  // the cruise missile: aim it at the air defence, then check what a hit does
  await page.evaluate(() => { G.debug.game.human.gold = 9e6; });
  await page.waitForTimeout(8000);
  // do not depend on reload timing: the own silo is ready again, the hostile air defence has just fired
  await page.evaluate(() => {
    const g = G.debug.game, h = g.human;
    // the atom bomb just fired may have landed close enough to take the own silo with it: put up a new one
    if (!h.units.some((u) => u.type === G.UT.SILO)) {
      let t = -1;
      g.forTiles(h, (x) => { if (t < 0 && !h.border.has(x) && !g.structNear(x, g.R.structDist)) t = x; });
      h.gold = 9e6; g.build(h, G.UT.SILO, t);
    }
    for (const u of g.structAt.values()) {
      if (u.type === G.UT.SILO && u.owner === h) u.ready = u.ready.map(() => 0);
      if (u.type === G.UT.SAM && u.owner !== h) u.ready = u.ready.map(() => g.ticks + 400);
    }
  });
  await page.evaluate((p) => G.debug.tap(p.x, p.y + 14, true), aimAt.foe);   // long press: the menu, not an attack
  await page.waitForTimeout(450);
  await page.click('#rN');
  await page.waitForTimeout(350);
  await page.screenshot({ path: out(`ui_${tag}_11weapons.png`) });
  console.log('cruise button:', await page.evaluate(() => { const b = document.querySelector('.item[data-t="16"]'), g = G.debug.game, h = g.human; return (b ? b.textContent : 'none') + ' | disabled ' + (b && b.disabled) + ' | silos ' + JSON.stringify(h.units.filter((u) => u.type === G.UT.SILO).map((u) => [u.built, u.ready, g.ticks])) + ' | gold ' + Math.round(h.gold) + ' | immune ' + (g.immuneUntil - g.ticks); }));
  await page.click('.item[data-t="16"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(`ui_${tag}_12cruise.png`) });
  console.log('cruise text:', await page.textContent('#aimInfo'));
  const g2 = await page.evaluate(() => G.debug.game.human.gold);
  await page.click('#aimGo');
  await page.waitForTimeout(400);
  must(await page.evaluate((b) => Math.round(b - G.debug.game.human.gold) >= 340000, g2), 'cruise missile launched for 350K');
  const hit = await page.evaluate(() => {
    const g = G.debug.game, h = g.human;
    const foe = g.players.filter((p) => p && p.alive && p !== h && p.tiles > 400).sort((x, y) => y.tiles - x.tiles)[0];
    let ft = -1; g.forTiles(foe, (t) => { if (ft < 0 && !foe.border.has(t) && !g.structNear(t, g.R.structDist + g.R.cruiseOut)) ft = t; });
    foe.gold = 9e6;
    const sam = g.build(foe, G.UT.SAM, ft);
    if (!sam) return null;
    const fo = g.falloutCount, tiles = sam.owner.tiles;
    g.detonate({ type: G.UT.CRUISE, dx: sam.x, dy: sam.y, owner: h });
    return { gone: !sam.active, fallout: g.falloutCount - fo, lost: tiles - sam.owner.tiles };
  });
  console.log('cruise hit', JSON.stringify(hit));
  must(hit && hit.gone && hit.fallout === 0 && hit.lost > 20, 'a hit destroys the air defence and leaves no fallout');
  // conquer a bot: gold must be paid and shown
  const loot = await page.evaluate(() => {
    const g = G.debug.game, h = g.human;
    const bot = g.players.find((p) => p && p.alive && p.type === G.PT.BOT);
    const before = h.gold; g.finishOff(h, bot);
    return { gain: h.gold - before, name: bot.name };
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`ui_${tag}_10loot.png`) });
  must(loot.gain >= 50000, 'conquering the bot "' + loot.name + '" paid ' + loot.gain + ' gold');
  must(await page.evaluate(() => document.getElementById('goldPop').classList.contains('go')), 'gold pop-up is shown');
  console.log('bot names:', await page.evaluate(() => G.debug.game.players.filter((p) => p && p.type === G.PT.BOT).slice(0, 6).map((p) => p.name).join(' | ')));
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
