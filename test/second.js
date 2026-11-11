// Zweites Spiel nach "Spiel beenden", Kreismenü auf eigenem Gebiet, Spielende
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'shots');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + e.stack));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(file);
  const spawnAndGo = async () => {
    await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
    await page.evaluate(() => { G.app.game.randomSpawn(); G.app.beginPlay(); });
    await sleep(500);
  };
  await page.click('[data-m="suedamerika"]');
  await page.click('#btnStart'); await spawnAndGo();
  await page.screenshot({ path: path.join(out, 'phone-s01-tip.png') });
  // Menü öffnen, Spiel beenden (zweistufig)
  await page.click('#btnMenu'); await sleep(200);
  await page.click('[data-m="quit1"]'); await sleep(150);
  await page.screenshot({ path: path.join(out, 'phone-s02-quit.png') });
  await page.click('[data-m="quit"]'); await sleep(300);
  const st1 = await page.evaluate(() => ({ game: !!G.app.game, start: !document.getElementById('start').hidden, hud: !document.getElementById('hud').hidden }));
  console.log('nach Beenden', JSON.stringify(st1));
  // Zweites Spiel: Zufallskarte
  await page.click('[data-m="zufall"]');
  await page.click('#btnStart'); await spawnAndGo();
  await page.click('#btnSpeed'); await page.click('#btnSpeed');
  for (let i = 0; i < 6; i++) { await page.evaluate(() => { const g = G.app.game, h = g.human; g.attack(h, 0, h.troops * 0.4); }); await sleep(1000); }
  await page.evaluate(() => G.app.ui.focusPlayer(G.app.game.human.id, true));
  await sleep(400);
  await page.screenshot({ path: path.join(out, 'phone-s03-random.png') });
  // Sieg erzwingen: alle Felder an den Menschen
  await page.evaluate(() => { const g = G.app.game, h = g.human; for (let t = 0; t < g.N; t++) if (g.land[t] && g.owner[t] !== h.id && Math.random() < 0.9) g.conquer(h, t); });
  await page.waitForFunction(() => !document.getElementById('modal').hidden, null, { timeout: 20000 });
  await sleep(300);
  await page.screenshot({ path: path.join(out, 'phone-s04-win.png') });
  await page.click('[data-m="watch"]'); await sleep(300);
  const st2 = await page.evaluate(() => ({ paused: G.app.paused, winner: G.app.game.winner && G.app.game.winner.name }));
  console.log('nach Sieg', JSON.stringify(st2));
  // Niederlage erzwingen in neuem Spiel
  await page.click('#btnMenu'); await sleep(150); await page.click('[data-m="quit1"]'); await page.click('[data-m="quit"]'); await sleep(200);
  await page.click('[data-m="ozeanien"]');
  await page.click('#btnStart'); await spawnAndGo();
  await page.evaluate(() => { const g = G.app.game, h = g.human, foe = g.players.find(p => p && p.alive && p !== h); for (let t = 0; t < g.N; t++) if (g.owner[t] === h.id) g.conquer(foe, t); });
  await page.waitForFunction(() => !document.getElementById('modal').hidden, null, { timeout: 20000 });
  await sleep(300);
  await page.screenshot({ path: path.join(out, 'phone-s05-defeat.png') });
  await page.click('[data-m="watch"]'); await sleep(500);
  // Zuschauen: Tipp auf Gebiet öffnet Spielerinfo
  const pt = await page.evaluate(() => { const a = G.app, g = a.game; const p = g.players.find(q => q && q.alive && q.tiles > 40); a.ui.focusPlayer(p.id, true); const s = a.ren.screenOf(Math.round(p.nx), Math.round(p.ny)); return s; });
  await sleep(300);
  await page.touchscreen.tap(pt[0], pt[1]); await sleep(400);
  await page.screenshot({ path: path.join(out, 'phone-s06-spectate.png') });
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
