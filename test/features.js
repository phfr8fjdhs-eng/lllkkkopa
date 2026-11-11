// Prüft Boote, Kriegsschiffe, Handel, Bomben, Flugabwehr, Allianzen im Browser
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path');
const out = path.join(__dirname, '..', 'shots');
const file = 'file://' + path.join(__dirname, '..', 'dist', 'index.html');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
(async () => {
  const mode = process.argv[2] || 'desk';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--disable-gpu'] });
  const ctx = await browser.newContext(mode === 'phone'
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }
    : { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '')));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE ' + m.text()); });
  await page.goto(file);
  await page.click('[data-m="' + (process.argv[3] || 'europa') + '"]');
  await page.check('#optGold'); await page.check('#optInstant');
  await page.click('#btnStart');
  await page.waitForFunction(() => window.G.app.game && document.getElementById('loading').hidden, null, { timeout: 30000 });
  await sleep(300);
  await page.screenshot({ path: path.join(out, mode + '-f01-spawn.png') });
  // Start an einer Küste
  const ok = await page.evaluate(() => {
    const a = G.app, g = a.game, W = g.W;
    for (let k = 0; k < 200000; k++) {
      const t = (Math.random() * g.N) | 0;
      if (g.land[t] && !g.owner[t] && g.shore[t] && g.map.lsize[g.map.lcomp[t]] > 5000 && g.map.wsize[g.wcomp[g._waterNext(t)]] > 5000) { g.spawnHuman(t); a.beginPlay(); return true; }
    }
    return false;
  });
  if (!ok) throw new Error('kein Küstenstart');
  await page.click('#btnSpeed'); await page.click('#btnSpeed');
  const drive = async (n, ms) => { for (let i = 0; i < n; i++) { await page.evaluate(() => { const g = G.app.game, h = g.human; if (!h.alive) return; const nb = g.neighbors(h); if (nb.has(0)) g.attack(h, 0, h.troops * 0.4); else { let b = null; for (const id of nb.keys()) { const q = g.players[id]; if (q.alive && !h.allies.has(id) && (!b || q.troops < b.troops)) b = q; } if (b && h.troops > g.maxTroops(h) * 0.4) g.attack(h, b.id, h.troops * 0.5); } }); await sleep(ms); } };
  await drive(10, 1200);
  // Bauen: Stadt, Hafen, Silo, Flugabwehr, Posten, Kriegsschiffe
  const built = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U, r = {};
    const shoreT = [...h.border].filter(t => g.shore[t]);
    r.port = g.build(h, U.PORT, shoreT[0]).ok;
    r.port2 = g.build(h, U.PORT, shoreT[shoreT.length - 1]).ok;
    for (const type of [U.CITY, U.CITY, U.SILO, U.SAM, U.DEFENSE, U.CITY]) { for (let k = 0; k < 30; k++) { const t = g._aiTile(h, true); if (t >= 0 && g.build(h, type, t).ok) { r['b' + type] = (r['b' + type] || 0) + 1; break; } } }
    const port = h.units.find(u => u.type === U.PORT);
    if (port) { r.ship = g.build(h, U.WARSHIP, port.water).ok; r.ship2 = g.build(h, U.WARSHIP, port.water).ok; }
    a.ui.focusPlayer(h.id, true);
    return r;
  });
  console.log('gebaut', JSON.stringify(built));
  await sleep(1500);
  await page.screenshot({ path: path.join(out, mode + '-f02-built.png') });
  // Boot zu fremdem Ufer
  const boat = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human;
    for (let k = 0; k < 5000; k++) { const t = (Math.random() * g.N) | 0; if (g.land[t] && g.owner[t] !== h.id && !g.canAttackTile(h, t)) { const r = g.sendBoat(h, t, h.troops * 0.2); if (r.ok) { a.ren.center(r.unit.x, r.unit.y, 5); return { len: r.unit.path.length }; } } }
    return null;
  });
  console.log('Boot', JSON.stringify(boat));
  await sleep(1200);
  await page.screenshot({ path: path.join(out, mode + '-f03-boat.png') });
  await drive(8, 1200);
  // Bomben: Atom auf Nachbarn, Wasserstoff, MIRV
  const nuke = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U, r = {};
    const foes = g.players.filter(p => p && p.alive && p !== h && p.tiles > 300).sort((x, y) => y.tiles - x.tiles);
    if (!foes.length) return null;
    const f = foes[0];
    const t = g._aiTile(f, true);
    const p1 = g.build(h, U.ATOM, t); r.atom = p1.ok || p1.why;
    a.ren.center(t % g.W, (t / g.W) | 0, 2.2);
    r.foe = f.name; r.tiles = f.tiles; r.troops = Math.round(f.troops);
    return r;
  });
  console.log('Atom', JSON.stringify(nuke));
  await sleep(700);
  await page.screenshot({ path: path.join(out, mode + '-f04-atom-flight.png') });
  await page.waitForFunction(() => !G.app.game.units.some(u => u.type === G.U.ATOM), null, { timeout: 60000 });
  await sleep(150);
  await page.screenshot({ path: path.join(out, mode + '-f05-atom-boom.png') });
  await sleep(1500);
  const more = await page.evaluate(() => {
    const a = G.app, g = a.game, h = g.human, U = G.U, r = {};
    const foes = g.players.filter(p => p && p.alive && p !== h && p.tiles > 300).sort((x, y) => y.tiles - x.tiles);
    const f = foes[0];
    r.before = { tiles: f.tiles, troops: Math.round(f.troops), fall: g.falloutCount };
    h.units.filter(u => u.type === U.SILO).forEach(u => u.ready = [0, 0, 0]);
    const t = g._aiTile(f, true);
    r.hydro = g.build(h, U.HYDRO, t).ok;
    r.mirv = g.build(h, U.MIRV, g._aiTile(f, true)).ok;
    a.ren.center(t % g.W, (t / g.W) | 0, 1.6);
    r.foe = f.id;
    return r;
  });
  console.log('Mehr', JSON.stringify(more));
  await sleep(2500);
  await page.screenshot({ path: path.join(out, mode + '-f06-hydro-flight.png') });
  await page.waitForFunction(() => !G.app.game.units.some(u => u.type >= G.U.ATOM), null, { timeout: 90000 });
  await sleep(200);
  await page.screenshot({ path: path.join(out, mode + '-f07-after.png') });
  const after = await page.evaluate((id) => { const g = G.app.game, f = g.players[id]; return { tiles: f.tiles, troops: Math.round(f.troops), alive: f.alive, fall: g.falloutCount, units: g.units.length }; }, more.foe);
  console.log('Danach', JSON.stringify(after));
  // Allianz: Anfrage einer Nation an den Menschen simulieren
  await page.evaluate(() => { const g = G.app.game, h = g.human; const n = g.players.find(p => p && p.alive && p.type === G.NATION && !h.allies.has(p.id)); if (n) { n.traitorUntil = -1; g.requests = []; n.reqCool.clear(); g.requestAlliance(n, h); } G.app.ui.focusPlayer(h.id, true); });
  await sleep(600);
  await page.screenshot({ path: path.join(out, mode + '-f08-allyreq.png') });
  const hasBtn = await page.$('[data-act="ally-yes"]');
  if (hasBtn) await page.click('[data-act="ally-yes"]');
  await sleep(600);
  const ally = await page.evaluate(() => { const g = G.app.game; return { allies: g.human.allies.size }; });
  console.log('Allianz', JSON.stringify(ally), 'Knopf', !!hasBtn);
  await drive(6, 1200);
  await page.evaluate(() => G.app.ren.fit());
  await sleep(800);
  await page.screenshot({ path: path.join(out, mode + '-f09-overview.png') });
  const st = await page.evaluate(() => { const g = G.app.game, k = {}; for (const u of g.units) k[u.type] = (k[u.type] || 0) + 1; return { ticks: g.ticks, units: k, human: g.human.tiles, gold: g.human.gold, alive: g.players.filter(p => p && p.alive).length }; });
  console.log('Zustand', JSON.stringify(st));
  console.log(errors.length ? 'FEHLER:\n' + errors.join('\n') : 'keine Fehler in der Konsole');
  await browser.close();
})().catch(e => { console.error('TEST ABGEBROCHEN', e); process.exit(1); });
