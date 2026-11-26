// Load test: how the simulation holds up when there are many ships at once.
// Plays a normal game for a while, then puts N extra ships on the sea (half warships, half
// merchants on real trade routes) and measures the time per tick.
//   node test/stress.js [karte] [N,N,...] [ticks]      e.g. node test/stress.js welt 100,1000,5000,10000 200
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
const loadMap = require('./load.js');

(async () => {
  const id = process.argv[2] || 'welt';
  const sizes = (process.argv[3] || '100,1000,5000,10000').split(',').map(Number);
  const ticks = +(process.argv[4] || 200);
  const map = await loadMap(G, id);
  console.log('Karte', id, map.W + 'x' + map.H, 'Land', map.landTiles);
  for (const N of sizes) {
    const g = new G.Game(map, { seed: 7, bots: 150, difficulty: 1, spawnTicks: 10 });
    g.setup(null);
    // warm up: a real game with ports and trade routes
    for (let i = 0; i < 1500; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); }
    const alive = g.players.filter((p) => p && p.alive);
    const routes = g.units.filter((u) => u.active && u.type === UT.TRADE && u.path && u.path.length > 20).map((u) => u.path);
    const sea = [];
    for (let t = 0; t < map.N; t += 7) if (!map.land[t]) sea.push(t);
    const rng = new G.RNG(99);
    let added = 0;
    for (let k = 0; k < N; k++) {
      const p = alive[rng.int(0, alive.length)];
      if (k % 2 === 0 || !routes.length) {
        const t = sea[rng.int(0, sea.length)];
        const u = g.newUnit(UT.WARSHIP, p, t);
        u.hp = 1000; u.patrol = t; u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false; u.cls = 0;
        g.addUnit(u);
      } else {
        const r = routes[rng.int(0, routes.length)], pi = rng.int(0, r.length - 1);
        const u = g.newUnit(UT.TRADE, p, r[pi]);
        u.path = r; u.pi = pi; u.captured = false; u.kind = 0; u.hits = 1; u.gold = 1000;
        const ports = g.getPorts().filter((v) => v.owner !== p);
        u.dstPort = ports.length ? ports[0] : null;
        if (!u.dstPort) continue;
        g.addUnit(u);
      }
      added++;
    }
    const prof = {};
    const wrap = (obj, name) => {
      const orig = obj[name]; prof[name] = 0;
      obj[name] = function () { const a = process.hrtime.bigint(); const r = orig.apply(this, arguments); prof[name] += Number(process.hrtime.bigint() - a) / 1e6; return r; };
      return () => { obj[name] = orig; };
    };
    const undo = ['tickWarship', 'tickTrade', 'tickShell', 'tickAttack', 'pathStep', 'removeUnit'].map((n) => wrap(G.Game.prototype, n));
    let total = 0, worst = 0;
    for (let i = 0; i < ticks; i++) {
      const a = process.hrtime.bigint(); g.tick(); const ms = Number(process.hrtime.bigint() - a) / 1e6;
      g.dirtyN = 0; g.dirtyFlag.fill(0);
      total += ms; if (ms > worst) worst = ms;
    }
    undo.forEach((f) => f());
    const live = g.units.filter((u) => u.active).length;
    if (process.env.SUM) {
      let h = g.checksum();
      for (const u of g.units) if (u.active) h = (Math.imul(h, 31) + u.id * 7 + u.tile * 3 + (u.hp | 0) + (u.owner.id << 20) + (u.target ? u.target.id : 0)) | 0;
      console.log('Pruefsumme', h);
    }
    console.log(`+${String(added).padStart(5)} Schiffe  Einheiten jetzt ${String(live).padStart(5)}  Tick Schnitt ${(total / ticks).toFixed(2)} ms  schlimmster ${worst.toFixed(1)} ms  ` +
      Object.keys(prof).map((k) => k + ' ' + (prof[k] / ticks).toFixed(2)).join('  '));
  }
})().catch((e) => { console.error(e); process.exit(1); });
