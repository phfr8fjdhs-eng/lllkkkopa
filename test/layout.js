const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'shots');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const errors = [];
  const run = async (name, vp, touch, duel) => {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, hasTouch: touch, isMobile: touch });
    const page = await ctx.newPage();
    page.on('pageerror', e => errors.push(name + ' PAGEERROR ' + e.message + '\n' + e.stack));
    page.on('console', m => { if (m.type() === 'error') errors.push(name + ' CONSOLE ' + m.text()); });
    await page.goto(file);
    if (duel) await page.click('[data-v="duel"]');
    await sleep(200);
    await page.screenshot({ path: path.join(out, name + '-a-start.png'), fullPage: true });
    const t0 = Date.now();
    await page.click('#btnStart');
    await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
    const ms = Date.now() - t0;
    await page.evaluate(() => { G.app.game.randomSpawn(); G.app.beginPlay(); G.app.speed = 4; });
    for (let i = 0; i < 8; i++) { await page.evaluate(() => { const g = G.app.game, h = g.human; g.attack(h, 0, h.troops * 0.4); }); await sleep(900); }
    await page.evaluate(() => { const g = G.app.game, h = g.human; G.app.ui.focusPlayer(h.id, true); });
    await sleep(500);
    await page.screenshot({ path: path.join(out, name + '-b-play.png') });
    const info = await page.evaluate(() => { const g = G.app.game; return { players: g.players.length - 1, rival: g.rival ? g.rival.name : null, humanTiles: g.human.tiles }; });
    console.log(name, 'Aufbau', ms, 'ms', JSON.stringify(info));
    await ctx.close();
  };
  await run('small', { width: 360, height: 640 }, true, false);
  await run('land', { width: 844, height: 390 }, true, false);
  await run('duel', { width: 390, height: 844 }, true, true);
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
