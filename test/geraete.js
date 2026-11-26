// PC and phone together: the same game, with the same orders, in Chrome (PC, Android) and in
// WebKit (Safari on iPhone and iPad), must give the same checksums, every 250 ticks. Otherwise a
// game between a computer and an iPhone drifts apart. The orders are those of test/det.js.
//   node test/geraete.js [ticks]      (first `python3 tools/build.py`)
const pw = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const TICKS = +(process.argv[2] || 3000);
const page = 'file://' + path.join(__dirname, '..', 'build', 'index.html') + '?worker=0';

// runs inside the page: builds a map and a game from fixed seeds and plays it with scripted orders
function play(o) {
  const G = window.G, UT = G.UT, seed = 4242;
  const map = G.buildMap(480, 300, G.randomClassMap(480, 300, seed), seed, { id: 'zufall', name: 'Test', nations: [] });
  const g = new G.Game(map, { seed: 99, bots: 40, difficulty: 1, me: 0, arsenal: o.ars, kampf: o.kampf, pfeile: !!o.kampf });
  g.setup([{ name: 'A' }, { name: 'B' }]);
  let r = 12345; const rnd = (n) => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r % n; };
  let n = 0;
  for (let t = 0; t < map.N && n < 2; t += 53) if (g.canSpawnAt(t) && !map.shore[t]) { g.exec(++n, { k: 'spawn', t: t }); t += 20000; }
  const sums = [];
  for (let i = 0; i < o.ticks; i++) {
    g.tick();
    g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0;
    if (i % 7 === 0) {
      const id = 1 + rnd(2), h = g.players[id];
      if (!h.alive) continue;
      h.troops += 40000;
      if (i > 600) h.gold += 400000;
      const border = Array.from(h.border), t0 = border[rnd(border.length)], W = map.W;
      const t = [t0 - 1, t0 + 1, t0 - W, t0 + W][rnd(4)];
      const kind = i < 400 ? 0 : rnd(10);
      if (kind < 5) {
        const w = rnd(3), ow = g.owner[t];
        let goal = t;
        if (w) for (let k = 0; k < 40; k++) { const q = t + (rnd(41) - 20) * W + rnd(41) - 20; if (q >= 0 && q < map.N && map.land[q] && g.owner[q] === ow) { goal = q; break; } }
        g.exec(id, { k: 'strike', t: goal, r: 0.6, w: w });
      } else if (kind < 8) g.exec(id, { k: 'build', u: [UT.CITY, UT.SILO, UT.SAM, UT.FACTORY, UT.DEFENSE, UT.PORT, UT.CLOAK][rnd(o.ars ? 7 : 6)], t: t0 });
      else if (kind < 9) g.exec(id, { k: 'up', t: t0 });
      else { const foe = g.players[3 - id]; if (foe.alive && g.immuneUntil <= g.ticks) { const ft = Array.from(foe.border)[0]; g.exec(id, { k: 'build', u: rnd(2) ? UT.CRUISE : UT.ATOM, t: ft }); } }
    }
    if (i % 250 === 249) sums.push(g.ticks + ':' + g.checksum());
  }
  return { sums: sums, tiles: g.players.slice(1, 3).map((p) => p.tiles).join('/') };
}

(async () => {
  const runs = [{ name: 'klassisch' }, { name: 'arsenal', ars: true }, { name: 'grenzland', kampf: 'grenzland' }, { name: 'grenzen', kampf: 'grenzen' }];
  const out = {};
  for (const [name, type, opt] of [['Chrome', pw.chromium, { executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] }], ['WebKit (Safari)', pw.webkit, {}]]) {
    const b = await type.launch(opt);
    const p = await b.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    await p.goto(page);
    await p.waitForFunction(() => window.G && G.Game && G.buildMap);
    out[name] = {};
    for (const r of runs) out[name][r.name] = await p.evaluate(play, { ars: !!r.ars, kampf: r.kampf, ticks: TICKS });
    if (errors.length) console.log(name, 'Fehler:', errors.slice(0, 3).join(' | '));
    await b.close();
  }
  let bad = 0;
  const [A, B] = Object.keys(out);
  for (const r of runs) {
    const a = out[A][r.name], b = out[B][r.name];
    let first = -1;
    for (let i = 0; i < a.sums.length; i++) if (a.sums[i] !== b.sums[i]) { first = i; break; }
    if (first >= 0) bad++;
    console.log((first < 0 ? 'ok   ' : 'FAIL ') + r.name.padEnd(10) + ' ' + a.sums.length + ' Prüfsummen, Felder ' + a.tiles + ' / ' + b.tiles +
      (first < 0 ? ', gleich' : ', verschieden ab Tick ' + a.sums[first].split(':')[0]));
  }
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
