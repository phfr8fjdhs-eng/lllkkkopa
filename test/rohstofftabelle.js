// Version «Rohstoffe» in the browser: the table opens from the button and from the gold, lists the
// deposits and factories one holds, and levels a plant and a factory up right from there.
// node test/rohstofftabelle.js [desktop]   (pictures in build/rt_*.png)
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
  await page.goto('file://' + out('rohstoffe.html') + '?karte=erde');
  await page.waitForTimeout(1000);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5 && G.debug.game.res, null, { timeout: 90000 });
  await page.waitForTimeout(500);
  const spot = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.28; a += 0.4) {
      const x = v.cw / 2 + Math.cos(a) * r, y = v.ch / 2 + Math.sin(a) * r * 0.6, t = v.tileAt(x, y);
      if (t >= 0 && g.canSpawnAt(t) && g.map.shore[t] === 0) return { x, y };
    }
  });
  if (mobile) await page.touchscreen.tap(spot.x, spot.y); else await page.mouse.click(spot.x, spot.y);
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 5000 });
  // hand the player three deposits (one with a plant already) and a factory, and gold to spend
  const setup = await page.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W, deps = g.map.deposits;
    g.opts.instantBuild = true; g.immuneUntil = 1e9;
    const picks = [];
    for (let i = 0; i < deps.length && picks.length < 3; i++) if (!g.owner[deps[i].t]) picks.push(i);
    for (const i of picks) {
      const d = deps[i];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) { const t = d.t + dy * W + dx; if (g.map.land[t] && g.owner[t] !== h.id) g.conquer(h, t); }
    }
    h.gold = 5e7;
    g.dig(h, picks[0]);
    let ft = -1;
    g.forTiles(h, (t) => { if (ft < 0 && g.map.ctile[t] && !g.structNear(t, g.R.structDist)) ft = t; });
    const fu = g.build(h, G.UT.FACTORY, ft);
    for (let i = 0; i < 25; i++) g.tick();
    const f = h.units.find((u) => u.type === G.UT.FACTORY);
    return { picks, lv0: g.dg.lv[picks[0]], fac: f ? { t: f.tile, lv: f.level, built: f.built } : null };
  });
  console.log('setup', JSON.stringify(setup));
  must(await page.evaluate(() => !document.getElementById('bRes').hidden), 'the table button is in the bar');
  await page.click('#bRes');
  await page.waitForTimeout(400);
  must(await page.evaluate(() => !document.getElementById('modal').hidden && document.querySelector('#modalCard h2').textContent === 'Rohstoffe'), 'the button opens the table');
  const rows = await page.evaluate(() => ({ groups: document.querySelectorAll('#modalCard .rtHead').length, digs: document.querySelectorAll('#modalCard [data-dig]').length, fups: document.querySelectorAll('#modalCard [data-fup]').length }));
  console.log('rows', JSON.stringify(rows));
  must(rows.groups >= 1 && rows.digs >= 2, 'it lists the deposits with buttons to build or level up');
  must(rows.fups === 1, 'it lists the factory with a button to level it up');
  await page.screenshot({ path: out(`rt_${tag}_1open.png`) });
  // level the plant that is already there
  await page.click('#modalCard [data-dig="' + setup.picks[0] + '"]');
  await page.waitForTimeout(300);
  must(await page.evaluate((i) => G.debug.game.dg.lv[i], setup.picks[0]) === setup.lv0 + 1, 'a click levels the plant up by one');
  // build a plant on another one
  const other = setup.picks[1];
  await page.click('#modalCard [data-dig="' + other + '"]');
  await page.waitForTimeout(300);
  must(await page.evaluate((i) => G.debug.game.dg.lv[i], other) === 1, 'a click builds the plant on a bare deposit');
  // level the factory
  const f0 = await page.evaluate(() => G.debug.game.human.units.find((u) => u.type === G.UT.FACTORY).level);
  await page.click('#modalCard [data-fup]');
  await page.waitForTimeout(300);
  must(await page.evaluate(() => G.debug.game.human.units.find((u) => u.type === G.UT.FACTORY).level) === f0 + 1, 'a click levels the factory up by one');
  await page.evaluate(() => { for (let i = 0; i < 12; i++) G.debug.game.tick(); });
  await page.waitForTimeout(600);
  await page.screenshot({ path: out(`rt_${tag}_2levelled.png`) });
  must(await page.evaluate(() => /Stufe 2 von/.test(document.getElementById('modalCard').textContent)), 'the table shows the new level');
  // closing and opening again from the gold
  await page.click('#modalCard [data-act="resume"]');
  await page.waitForTimeout(300);
  must(await page.evaluate(() => document.getElementById('modal').hidden), 'Weiterspielen closes it');
  await page.click('#statGold');
  await page.waitForTimeout(300);
  must(await page.evaluate(() => !document.getElementById('modal').hidden && document.querySelector('#modalCard h2').textContent === 'Rohstoffe'), 'the gold opens it too');
  // a deposit name flies there
  await page.click('#modalCard [data-go="' + other + '"]');
  await page.waitForTimeout(700);
  must(await page.evaluate(() => document.getElementById('modal').hidden), 'a deposit in the table flies there');
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
