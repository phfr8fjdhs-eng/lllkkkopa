// Oberflächentest im echten Browser (Chrome ohne Fenster)
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'shots');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const mode = process.argv[2] || 'phone';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext(mode === 'phone'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push('CONSOLE ' + m.type() + ' ' + m.text()); });
  await page.goto(file);
  await sleep(500);
  await page.screenshot({ path: path.join(out, mode + '-01-start.png'), fullPage: false });
  const steps = (process.argv[3] || 'all');
  // Karte wählen (optional) und starten
  if (process.argv[4]) await page.click('[data-m="' + process.argv[4] + '"]');
  await page.click('#btnStart');
  await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
  await sleep(600);
  await page.screenshot({ path: path.join(out, mode + '-02-spawn.png') });
  // Startpunkt: freies Land in Europa suchen und dort tippen
  const pt = await page.evaluate(() => {
    const a = G.app, g = a.game, W = g.W;
    let best = -1;
    for (let k = 0; k < 20000 && best < 0; k++) {
      const x = Math.floor(W * (0.3 + Math.random() * 0.4)), y = Math.floor(g.H * (0.2 + Math.random() * 0.5)), t = y * W + x;
      if (g.land[t] && !g.owner[t] && g.map.lsize[g.map.lcomp[t]] > 2000) best = t;
    }
    const s = a.ren.screenOf(best % W, (best / W) | 0);
    return { x: s[0], y: s[1], t: best };
  });
  if (mode === 'phone') await page.touchscreen.tap(pt.x, pt.y); else await page.mouse.click(pt.x, pt.y);
  await sleep(400);
  await page.screenshot({ path: path.join(out, mode + '-03-spawned.png') });
  await page.click('#spawnGo');
  await sleep(1500);
  await page.screenshot({ path: path.join(out, mode + '-04-play.png') });
  // Angriff auf freies Land neben dem eigenen Gebiet über das Kreismenü
  const tapNeighbor = async () => {
    const p = await page.evaluate(() => {
      const a = G.app, g = a.game, h = g.human, W = g.W;
      for (const t of h.border) {
        for (const n of [t - 1, t + 1, t - W, t + W]) {
          if (g.land[n] && g.owner[n] !== h.id) { const s = a.ren.screenOf(n % W, (n / W) | 0); if (s[0] > 30 && s[1] > 150 && s[0] < innerWidth - 30 && s[1] < innerHeight - 260) return { x: s[0], y: s[1] }; }
        }
      }
      return null;
    });
    if (!p) return false;
    if (mode === 'phone') await page.touchscreen.tap(p.x, p.y); else await page.mouse.click(p.x, p.y, { button: 'right' });
    await sleep(450);
    return true;
  };
  await tapNeighbor();
  await page.screenshot({ path: path.join(out, mode + '-05-radial.png') });
  await page.click('#rbC');
  await sleep(2500);
  await page.screenshot({ path: path.join(out, mode + '-06-attack.png') });
  // Schneller laufen lassen und immer wieder angreifen
  await page.click('#btnSpeed'); await page.click('#btnSpeed');
  for (let i = 0; i < 12; i++) {
    await page.evaluate(() => { const g = G.app.game, h = g.human; if (!h.alive) return; const nb = g.neighbors(h); if (nb.has(0)) g.attack(h, 0, h.troops * 0.35); else { let b = null; for (const id of nb.keys()) { const q = g.players[id]; if (q.alive && (!b || q.troops < b.troops)) b = q; } if (b) g.attack(h, b.id, h.troops * 0.4); } });
    await sleep(1500);
  }
  await page.screenshot({ path: path.join(out, mode + '-07-grown.png') });
  // Baumenü auf eigenem Gebiet
  const own = await page.evaluate(() => { const a = G.app, g = a.game, h = g.human; h.gold += 3e6; a.ui.focusPlayer(h.id, true); const s = a.ren.screenOf(Math.round(h.nx), Math.round(h.ny)); return { x: s[0], y: s[1] }; });
  await sleep(300);
  if (mode === 'phone') await page.touchscreen.tap(own.x, own.y); else await page.mouse.click(own.x, own.y, { button: 'right' });
  await sleep(450);
  await page.screenshot({ path: path.join(out, mode + '-08-radial-own.png') });
  await page.click('#rbC');
  await sleep(300);
  await page.screenshot({ path: path.join(out, mode + '-09-build.png') });
  await page.click('[data-build="1"]');
  await sleep(3500);
  await page.screenshot({ path: path.join(out, mode + '-10-city.png') });
  // Spielerinfo eines Nachbarn
  const info = await page.evaluate(() => { const a = G.app, g = a.game, h = g.human; const nb = [...g.neighbors(h).keys()].filter(id => id && g.players[id].alive); if (!nb.length) return null; a.ui.openPlayer(nb[0]); return nb[0]; });
  await sleep(300);
  await page.screenshot({ path: path.join(out, mode + '-11-player.png') });
  await page.evaluate(() => G.app.ui.closeSheet());
  await page.click('#btnMenu'); await sleep(250);
  await page.screenshot({ path: path.join(out, mode + '-12-menu.png') });
  await page.click('[data-m="help"]'); await sleep(250);
  await page.screenshot({ path: path.join(out, mode + '-13-help.png') });
  await page.click('[data-m="menu"]'); await page.click('[data-m="resume"]');
  // Herauszoomen: Gesamtbild
  await page.evaluate(() => { G.app.ren.fit(); });
  await sleep(1200);
  await page.screenshot({ path: path.join(out, mode + '-14-overview.png') });
  const st = await page.evaluate(() => { const g = G.app.game; return { ticks: g.ticks, alive: g.players.filter(p => p && p.alive).length, human: g.human.tiles, units: g.units.length, phase: g.phase }; });
  console.log('Zustand', JSON.stringify(st));
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
