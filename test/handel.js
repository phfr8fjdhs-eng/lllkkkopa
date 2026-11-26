// Merchant ships over a long game on the world map: the count stays right, no ship sails over land
// or waits without a route, and a captured ship always heads for a port of its new owner.
// node test/handel.js [ticks]
const path = require('path');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require(path.join(root, 'test/load.js')), UT = G.UT;
(async () => {
  const ticks = +(process.argv[2] || 8000);
  const map = await loadMap(G, 'welt');
  const g = new G.Game(map, { seed: 7, bots: 150, difficulty: 1, spawnTicks: 10 });
  g.setup(null);
  const seen = new Map();
  let drift = 0, land = 0, noRoute = 0, wrongPort = 0, captured = 0, n = 0, maxActive = 0;
  const cap = g.captureTrade;
  g.captureTrade = function (w, ts) { captured++; return cap.call(this, w, ts); };
  for (let t = 0; t < ticks; t++) {
    g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0;
    n = 0;
    for (const u of g.units) {
      if (!u.active || u.type !== UT.TRADE) continue;
      n++;
      if (map.land[u.tile]) land++;
      const s = seen.get(u) || { none: 0 };
      s.none = u.path ? 0 : s.none + 1;
      if (s.none > 20) noRoute++;
      seen.set(u, s);
      // a port can fall during a tick after the ship has moved: it must turn by the next tick
      const off = u.captured && !u.wait && (!u.dstPort.active || u.dstPort.owner !== u.owner);
      s.off = off ? (s.off || 0) + 1 : 0;
      if (s.off > 1) wrongPort++;
    }
    if (n !== g.tradeCount) drift++;
    if (n > maxActive) maxActive = n;
  }
  let bad = 0;
  const ok = (c, what) => { console.log((c ? 'ok   ' : 'FAIL ') + what); if (!c) bad++; };
  ok(maxActive > 20 && captured > 10, 'there is trade and there is capturing: up to ' + maxActive + ' ships at sea, ' + captured + ' captured');
  ok(drift === 0, 'tradeCount matches the ships at sea (' + drift + ' ticks off)');
  ok(land === 0, 'no merchant on land (' + land + ')');
  ok(noRoute === 0, 'no merchant waits more than 2 s without a route (' + noRoute + ')');
  ok(wrongPort === 0, 'a captured merchant always heads for a port of its new owner (' + wrongPort + ' ship-ticks)');
  process.exit(bad ? 1 : 0);
})();
