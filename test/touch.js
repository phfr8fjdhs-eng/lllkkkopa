// Fingergesten: Verschieben, Zwei-Finger-Zoom, Tippen
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message));
  await page.goto(file);
  await page.click('#btnStart');
  await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
  const cdp = await ctx.newCDPSession(page);
  const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
  const cam = () => page.evaluate(() => { const c = G.app.ren.cam; return { x: +c.x.toFixed(1), y: +c.y.toFixed(1), z: +c.z.toFixed(3), spawned: G.app.game.human.spawned, rad: !!G.app.ui.rad }; });
  const c0 = await cam();
  // Zwei-Finger-Zoom: Finger auseinander
  await touch('touchStart', [[150, 500], [240, 500]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[150 - i * 10, 500], [240 + i * 10, 500]]); await sleep(16); }
  await touch('touchEnd', []);
  await sleep(100);
  const c1 = await cam();
  // Verschieben mit einem Finger
  await touch('touchStart', [[200, 500]]);
  for (let i = 1; i <= 10; i++) { await touch('touchMove', [[200 + i * 8, 500 + i * 5]]); await sleep(16); }
  await touch('touchEnd', []);
  await sleep(100);
  const c2 = await cam();
  // Tippen auf Land: Startpunkt setzen
  const pt = await page.evaluate(() => { const a = G.app, g = a.game, W = g.W; for (let k = 0; k < 100000; k++) { const x = Math.floor(a.ren.cam.x + (Math.random() - 0.5) * 150), y = Math.floor(a.ren.cam.y + (Math.random() - 0.5) * 150), t = y * W + x; if (x > 0 && y > 0 && x < W && y < g.H && g.land[t] && !g.owner[t]) { const s = a.ren.screenOf(x, y); if (s[0] > 20 && s[0] < 370 && s[1] > 380 && s[1] < 660) return s; } } return null; });
  await touch('touchStart', [pt]); await sleep(40); await touch('touchEnd', []);
  await sleep(200);
  const c3 = await cam();
  console.log('Anfang', JSON.stringify(c0));
  console.log('nach Zoom', JSON.stringify(c1), c1.z > c0.z * 2 ? 'OK' : 'ZOOM FEHLT');
  console.log('nach Schieben', JSON.stringify(c2), (Math.abs(c2.x - c1.x) > 5 && c2.z === c1.z && !c2.spawned) ? 'OK' : 'SCHIEBEN FEHLT');
  console.log('nach Tippen', JSON.stringify(c3), c3.spawned ? 'OK' : 'TIPPEN FEHLT');
  // Spiel starten, tippen öffnet Kreismenü, zweiter Tipp in die Mitte greift an
  await page.evaluate(() => G.app.beginPlay());
  await sleep(300);
  const nb = await page.evaluate(() => { const a = G.app, g = a.game, h = g.human, W = g.W; for (const t of h.border) for (const n of [t - 1, t + 1, t - W, t + W]) if (g.land[n] && !g.owner[n]) { const s = a.ren.screenOf(n % W, (n / W) | 0); if (s[0] > 130 && s[0] < 260 && s[1] > 380 && s[1] < 640) return s; } return null; });
  if (!nb) { console.log('kein Nachbarfeld im Bild'); }
  else {
    await touch('touchStart', [nb]); await sleep(40); await touch('touchEnd', []);
    await sleep(120);
    const r1 = await page.evaluate(() => ({ rad: !!G.app.ui.rad, attacks: G.app.game.human.out.length, left: document.getElementById('radial').style.left, top: document.getElementById('radial').style.top }));
    await sleep(350);
    const cx = parseFloat(r1.left), cy = parseFloat(r1.top);
    await touch('touchStart', [[cx, cy]]); await sleep(40); await touch('touchEnd', []);
    await sleep(200);
    const r2 = await page.evaluate(() => ({ rad: !!G.app.ui.rad, attacks: G.app.game.human.out.length }));
    console.log('Kreismenü', JSON.stringify(r1), r1.rad && r1.attacks === 0 ? 'OK' : 'FEHLER');
    console.log('Angriff', JSON.stringify(r2), !r2.rad && r2.attacks === 1 ? 'OK' : 'FEHLER');
  }
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
