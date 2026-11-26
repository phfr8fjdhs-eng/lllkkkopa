// The game in its worker (src/05b_sync.js, src/08b_host.js): plays in real time in headless
// Chrome with the person attacking and building, then checks that the mirror on the page shows
// exactly the worker's game (every field that crosses over, every tile), and that the pictures
// keep coming while the worker works.   node test/worker.js [karte] [seconds]   (first `python3 tools/build.py`;
// HTML=build/rohstoffe.html for the version «Rohstoffe»)
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const MAP = process.argv[2] || 'welt', SECS = +(process.argv[3] || 30);
// fields the drawing writes on the mirror's objects for itself (name labels, smooth motion,
// cached sight): they are not the game's
const VIEW = new Set(['nameX', 'nameY', 'nameSize', 'nameAt', 'boxAt', 'va', 'vf', 'vx', 'vy', 'vAt', 'hidT', 'hidV', 'geo', 'nmLabel', 'nmFont', 'nmW']);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('file://' + (process.env.HTML || path.join(__dirname, '..', 'build', 'index.html')) + '?karte=' + MAP);
  await page.waitForTimeout(800);
  // endless gold and instant building, so the person builds a lot: buildings, rails, ships
  await page.evaluate(() => { for (const id of ['fGold', 'fInstant']) { const el = document.getElementById(id); if (el) el.checked = true; } });
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 120000 });
  ok(await page.evaluate(() => !G.debug.host.local && G.debug.game.mirror === true), 'the game runs in a worker, the page reads its mirror');
  await page.evaluate(() => { const g = G.debug.game; for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t]) { G.debug.act({ k: 'spawn', t: t }); break; } });
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 60000 });
  ok(await page.evaluate(() => G.debug.game.human.tiles > 0 && G.debug.game.human.alive), 'spawning is an order to the worker, and the mirror shows the own land');
  // play: attack whatever is next to the own land, build a city when there is gold; count the gaps between pictures
  await page.evaluate(() => {
    const S = window.__S = { gap: [], acks: 0, why: [] };
    let last = performance.now();
    const loop = (n) => { S.gap.push(n - last); last = n; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    window.__play = setInterval(() => {
      const g = G.debug.game, h = g && g.human;
      if (!h || !h.alive) return;
      const W = g.W;
      let tgt = -1;
      for (const b of h.border) { for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < g.N && g.map.land[n] && g.owner[n] !== h.id) { tgt = n; break; } if (tgt >= 0) break; }
      if (tgt >= 0) G.debug.host.exec(h.id, { k: 'strike', t: tgt, r: 0.3 }, (why) => { S.acks++; if (why) S.why.push(why); });
      // a city, a port or a factory, in turn, wherever the own land allows it
      const UT = G.UT, kinds = [UT.CITY, UT.PORT, UT.FACTORY, UT.CITY, UT.PORT, UT.WARSHIP], u = kinds[(S.k = (S.k || 0) + 1) % kinds.length];
      let n = 0;
      for (const t of h.border) {
        if (++n % 7) continue;
        const c = g.buildCheck(h, u, t);
        if (c && c.ok) { G.debug.host.exec(h.id, { k: 'build', u: u, t: t }, (why) => { S.acks++; if (!why) S.built = (S.built || 0) + 1; }); break; }
      }
    }, 700);
  });
  await page.waitForTimeout(SECS * 1000);
  const play = await page.evaluate(() => {
    clearInterval(window.__play); G.ui.setPaused(true);
    const S = window.__S, s = S.gap.slice().sort((a, b) => a - b), g = G.debug.game;
    return { n: s.length, p95: s[Math.floor(s.length * 0.95)], max: s[s.length - 1], acks: S.acks, built: S.built || 0, ticks: g.ticks, tiles: g.human.tiles, own: g.human.units.filter((u) => u.active).length, units: g.units.length, rails: g.rails.length };
  });
  console.log('      ' + JSON.stringify(play));
  ok(play.ticks > SECS * 7, 'the game keeps pace: ' + play.ticks + ' ticks in ' + SECS + ' s');
  ok(play.acks > 5, 'every order is answered (' + play.acks + ')');
  ok(play.tiles > 40, 'the own realm grew to ' + play.tiles + ' tiles');
  ok(play.built > 3 && play.own > 3, 'buildings ordered from the page stand in the mirror (' + play.built + ' built, ' + play.own + ' own units)');
  // wait until the worker has nothing more to send, then compare
  await page.waitForFunction(() => !G.debug.host.busy, null, { timeout: 20000 });
  await page.waitForTimeout(300);
  const cmp = await page.evaluate((viewFields) => new Promise((resolve) => {
    const VIEW = new Set(viewFields);
    G.debug.host.dump((w) => {
      const m = G.syncDump(G.debug.game), diff = [];
      const same = (a, b, where) => {
        for (const k in a) {
          if (VIEW.has(k)) continue;
          if (!(k in b)) { diff.push(where + '.' + k + ' missing'); continue; }
          if (a[k] !== b[k]) diff.push(where + '.' + k);
        }
      };
      if (w.ticks !== m.ticks) diff.push('ticks ' + w.ticks + ' / ' + m.ticks);
      if (w.owner !== m.owner) diff.push('tiles');
      same(w.game, m.game, 'game');
      if (w.players.length !== m.players.length) diff.push('players ' + w.players.length + ' / ' + m.players.length);
      w.players.forEach((p, i) => same(p, m.players[i] || {}, 'player' + (i + 1)));
      if (w.units.length !== m.units.length) diff.push('units ' + w.units.length + ' / ' + m.units.length);
      w.units.forEach((u, i) => same(u, m.units[i] || {}, 'unit' + i));
      if (w.attacks.length !== m.attacks.length) diff.push('attacks ' + w.attacks.length + ' / ' + m.attacks.length);
      w.attacks.forEach((a, i) => same(a, m.attacks[i] || {}, 'attack' + i));
      if (w.rails.length !== m.rails.length) diff.push('rails ' + w.rails.length + ' / ' + m.rails.length);
      w.rails.forEach((e, i) => same(e, m.rails[i] || {}, 'rail' + i));
      resolve({ diff: diff, players: w.players.length, units: w.units.length, attacks: w.attacks.length, rails: w.rails.length });
    });
  }), Array.from(VIEW));
  ok(cmp.diff.length === 0, 'mirror = worker: ' + cmp.players + ' players, ' + cmp.units + ' units, ' + cmp.attacks + ' attacks, ' + cmp.rails + ' rails, every tile' + (cmp.diff.length ? ' -- differs: ' + cmp.diff.slice(0, 20).join(', ') + (cmp.diff.length > 20 ? ' ...' : '') : ''));
  // the map picture agrees with the mirror's tiles
  const pix = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    v.flush();
    const keep = v.px.slice();
    for (let t = 0; t < g.N; t++) v.paint(t);
    let n = 0;
    for (let t = 0; t < g.N; t++) if (keep[t] !== v.px[t]) n++;
    return n;
  });
  ok(pix === 0, 'the map picture shows the mirror tile for tile' + (pix ? ' (' + pix + ' differ)' : ''));
  ok(errors.length === 0, 'no errors on the page' + (errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(bad ? bad + ' failed' : 'alles ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
