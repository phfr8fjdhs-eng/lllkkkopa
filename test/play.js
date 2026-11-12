// Plays through a short scenario in headless Chrome and saves screenshots of each stage.
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
  await page.waitForTimeout(1200);
  const tapAt = async (x, y) => { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  await page.waitForTimeout(700);
  await page.screenshot({ path: out(`shot_${tag}_2spawn.png`) });
  // pick a free spot in central Europe-ish area: search around the middle of the screen for free land
  const spot = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.28; a += 0.4) {
      const x = v.cw / 2 + Math.cos(a) * r, y = v.ch / 2 + Math.sin(a) * r * 0.6;
      const t = v.tileAt(x, y);
      if (t >= 0 && g.canSpawnAt(t) && g.map.shore[t] === 0) return { x, y };
    }
    return null;
  });
  console.log('spawn spot', spot);
  await tapAt(spot.x, spot.y);
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(`shot_${tag}_3spawned.png`) });
  await page.evaluate(() => { G.debug.game.spawnEnd = G.debug.game.ticks + 3; });
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 10000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: out(`shot_${tag}_4play.png`) });
  // tap free land next to our territory
  const target = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human, W = g.W;
    for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (g.map.land[n] && g.owner[n] === 0) { const far = n + (n - b) * 3; const t = (g.map.land[far] && g.owner[far] === 0) ? far : n; return v.screenOf(t); }
    return null;
  });
  console.log('target', target);
  await tapAt(target.x, target.y);   // free land is attacked at once
  await page.waitForTimeout(3500);
  await page.screenshot({ path: out(`shot_${tag}_6attack.png`) });
  // fast-forward the simulation a little so there is something to look at
  await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W;
    for (let i = 0; i < 700; i++) {
      g.tick();
      if (i % 20 !== 0 || !h.alive) continue;
      h.troops = Math.max(h.troops, g.maxTroops(h) * 0.7);
      let free = -1, bot = -1;
      for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) { if (!g.map.land[n]) continue; const o = g.owner[n]; if (o === 0) free = n; else if (o !== h.id && g.players[o].type === G.PT.BOT) bot = n; }
      if (free >= 0) g.strike(h, free, 0.4); else if (bot >= 0) g.strike(h, bot, 0.5);
    }
    h.gold += 3e6;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: out(`shot_${tag}_7later.png`) });
  // open the build menu on our own land
  const own = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; v.flyTo(h.nameX, h.nameY, 3); return null; });
  await page.waitForTimeout(900);
  const ownPt = await page.evaluate(() => { const g = G.debug.game, v = G.debug.view, h = g.human; return v.screenOf(Math.round(h.nameY) * g.W + Math.round(h.nameX)); });
  if (mobile) await tapAt(ownPt.x, ownPt.y); else await page.mouse.click(ownPt.x, ownPt.y, { button: 'right' });
  await page.waitForTimeout(500);
  await page.screenshot({ path: out(`shot_${tag}_8radial_own.png`) });
  await page.click('#rN');
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(`shot_${tag}_9build.png`) });
  await page.click('#sheetBody .item[data-t="0"]');
  await page.waitForTimeout(2500);
  // info card of the leader
  await page.evaluate(() => { const e = document.querySelector('#lbRows .lbrow'); e.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: out(`shot_${tag}_10info.png`) });
  await page.click('#modalCard [data-act="close"]');
  await page.click('#bMenu');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out(`shot_${tag}_11menu.png`) });
  await page.click('#modalCard [data-act="help"]');
  await page.waitForTimeout(300);
  await page.screenshot({ path: out(`shot_${tag}_12help.png`) });
  console.log('errors:', errors.length ? errors.join('\n') : 'none');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
