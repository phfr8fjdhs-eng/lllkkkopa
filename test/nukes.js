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
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(file);
  await page.click('[data-m="europa"]');
  await page.check('#optGold'); await page.check('#optInstant'); await page.check('#optTroops');
  await page.click('#btnStart');
  await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
  await page.evaluate(() => { const a = G.app, g = a.game; for (let k = 0; k < 200000; k++) { const t = (Math.random() * g.N) | 0; if (g.land[t] && !g.owner[t] && g.shore[t] && g.map.lsize[g.map.lcomp[t]] > 5000) { g.spawnHuman(t); a.beginPlay(); return; } } });
  await page.click('#btnSpeed'); await page.click('#btnSpeed');
  for (let i = 0; i < 8; i++) { await page.evaluate(() => { const g = G.app.game, h = g.human; g.attack(h, 0, h.troops * 0.3); }); await sleep(900); }
  // Silo bauen, dann Atombombe auf einen entfernten Stamm
  const r1 = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U;
    let ok = false; for (let k = 0; k < 40 && !ok; k++) ok = g.build(h, U.SILO, g._aiTile(h, true)).ok;
    const bots = g.players.filter(p => p && p.alive && p.type === G.BOT && p.tiles > 250).sort((x, y) => y.tiles - x.tiles);
    const f = bots[0], t = f.spawnTile;
    const res = g.build(h, U.ATOM, t);
    a.ren.center(t % g.W, (t / g.W) | 0, 3.2);
    a.target = t; a.speed = 1; a.ui.setSpeed(1);
    return { silo: ok, atom: res.ok || res.why, foe: f.name, tiles: f.tiles };
  });
  console.log(JSON.stringify(r1));
  await sleep(1200);
  await page.screenshot({ path: path.join(out, mode + '-n01-flight.png') });
  await page.waitForFunction(() => !G.app.game.units.some(u => u.type === G.U.ATOM), null, { timeout: 120000 });
  await sleep(120);
  await page.screenshot({ path: path.join(out, mode + '-n02-boom.png') });
  await sleep(2500);
  await page.screenshot({ path: path.join(out, mode + '-n03-fallout.png') });
  const r2 = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U;
    h.units.filter(u => u.type === U.SILO).forEach(u => u.ready = [0, 0]);
    const nat = g.players.filter(p => p && p.alive && p.type === G.NATION && p.tiles > 1500).sort((x, y) => y.tiles - x.tiles)[0];
    const t = Math.round(nat.ny) * g.W + Math.round(nat.nx);
    const hy = g.build(h, U.HYDRO, t);
    a.ren.center(t % g.W, (t / g.W) | 0, 2);
    a.nat = nat.id;
    return { hydro: hy.ok || hy.why, nat: nat.name, tiles: nat.tiles, troops: Math.round(nat.troops), fall: g.falloutCount };
  });
  console.log(JSON.stringify(r2));
  await page.waitForFunction(() => !G.app.game.units.some(u => u.type === G.U.HYDRO), null, { timeout: 120000 });
  await sleep(200);
  await page.screenshot({ path: path.join(out, mode + '-n04-hydro.png') });
  await sleep(2000);
  const r3 = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U, nat = g.players[a.nat];
    const res = { after: { tiles: nat.tiles, troops: Math.round(nat.troops), fall: g.falloutCount, alive: nat.alive } };
    h.units.filter(u => u.type === U.SILO).forEach(u => u.ready = [0, 0]);
    const n2 = g.players.filter(p => p && p.alive && p.type === G.NATION && p !== nat && p.tiles > 1500).sort((x, y) => y.tiles - x.tiles)[0];
    const t = Math.round(n2.ny) * g.W + Math.round(n2.nx);
    res.mirv = g.build(h, U.MIRV, t).ok; res.n2 = n2.name; res.t2 = n2.tiles; res.tr2 = Math.round(n2.troops); a.nat = n2.id;
    a.ui.focusPlayer(n2.id, true);
    return res;
  });
  console.log(JSON.stringify(r3));
  await page.waitForFunction(() => G.app.game.units.some(u => u.type === G.U.WARHEAD), null, { timeout: 120000 });
  await sleep(900);
  await page.screenshot({ path: path.join(out, mode + '-n05-mirv.png') });
  await page.waitForFunction(() => !G.app.game.units.some(u => u.type >= G.U.ATOM), null, { timeout: 120000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(out, mode + '-n06-mirv-after.png') });
  const r4 = await page.evaluate(() => { const g = G.app.game, n = g.players[G.app.nat]; return { tiles: n.tiles, troops: Math.round(n.troops), alive: n.alive, fall: g.falloutCount }; });
  console.log(JSON.stringify(r4));
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
