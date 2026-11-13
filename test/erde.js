// The Earth, headless: builds the big map, plays it with bots and nations, checks the books
// every 500 ticks and reports speed and memory.   node --max-old-space-size=4096 test/erde.js [ticks] [bots]
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require('./load.js');
const mb = () => Math.round(process.memoryUsage().arrayBuffers / 1e6) + ' MB in arrays';
function check(g) {
  const cnt = new Int32Array(g.players.length), map = g.map;
  for (let t = 0; t < g.N; t++) { const o = g.owner[t]; if (o) { cnt[o]++; if (!map.land[t]) throw new Error('water owned ' + t); } }
  for (let i = 1; i < g.players.length; i++) {
    const p = g.players[i];
    if (cnt[i] !== p.tiles) throw new Error('tile count mismatch for ' + p.name);
    if (!isFinite(p.troops) || p.troops < 0 || !isFinite(p.gold) || p.gold < 0) throw new Error('books of ' + p.name);
  }
  for (const u of g.units) if (u.active && u.path && (u.type === G.UT.TRADE || u.type === G.UT.WARSHIP || u.type === G.UT.TRANSPORT)) {
    if (map.land[u.tile]) throw new Error('ship on land: ' + G.UNAME[u.type]);
  }
}
(async () => {
  let t0 = Date.now();
  const map = await loadMap(G, 'erde');
  const share = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < map.N; i++) share[map.cover[i]]++;
  console.log('Erde', map.W, 'x', map.H, '=', map.N, 'tiles, land', map.landTiles, 'bodies of water', map.wsize.length - 1, 'nations', map.nations.length, 'built in', Date.now() - t0, 'ms');
  console.log('cover:', G.COVER_NAME.map((n, i) => i ? n + ' ' + (share[i] / map.landTiles * 100).toFixed(1) + '%' : '').filter(Boolean).join(', '));
  const ticks = +(process.argv[2] || 2000), bots = +(process.argv[3] || 400);
  const g = new G.Game(map, { seed: 7, bots: bots, difficulty: 1, spawnTicks: 10 });
  g.setup(null);
  console.log('players', g.players.length - 1, 'sea graph nodes', g.sea.n, mb());
  let worst = 0, total = 0;
  for (let i = 0; i < ticks; i++) {
    const a = process.hrtime.bigint(); g.tick(); const ms = Number(process.hrtime.bigint() - a) / 1e6;
    total += ms; if (ms > worst) worst = ms;
    g.dirtyN = 0; g.dirtyFlag.fill(0); g.fx.length = 0; g.events.length = 0;
    if (i % 500 === 499) {
      check(g);
      const alive = g.players.filter((p) => p && p.alive); alive.sort((a, b) => b.tiles - a.tiles);
      const owned = alive.reduce((s, p) => s + p.tiles, 0), cnt = (t) => g.units.filter((u) => u.active && u.type === t).length;
      console.log(`t=${i + 1} alive=${alive.length} owned=${(owned / map.landTiles * 100).toFixed(0)}% ports=${cnt(2)} trade=${cnt(G.UT.TRADE)} war=${cnt(G.UT.WARSHIP)} boats=${cnt(G.UT.TRANSPORT)} rails=${g.rails.length} queue=${g.pathQ.length}/${g.nearQ.length} top=${alive.slice(0, 3).map((p) => p.name + ' ' + (p.tiles / map.landTiles * 100).toFixed(1) + '%').join(', ')} avg=${(total / (i + 1)).toFixed(1)}ms worst=${worst.toFixed(0)}ms`);
      worst = 0;
    }
  }
  console.log('ok');
})().catch((e) => { console.error(e); process.exit(1); });
