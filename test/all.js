// Runs every map briefly with invariant checks, plus the invented map.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const sharp = require('/opt/npm-tools/node_modules/sharp');
(async () => {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const list = maps.map((m) => m.id).concat(['zufall']);
  for (const id of list) {
    let map;
    if (id === 'zufall') {
      map = G.buildMap(900, 600, G.randomClassMap(900, 600, 99), 99, { id: 'zufall', name: 'Zufall', nations: [] });
    } else {
      const m = maps.find((x) => x.id === id);
      const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
      const cls = new Uint8Array(m.w * m.h);
      for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * raw.info.channels] / 85);
      map = G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations });
    }
    const hist = [0, 0, 0]; for (let i = 0; i < map.N; i++) if (map.land[i]) hist[map.mag[i] < 10 ? 0 : map.mag[i] < 20 ? 1 : 2]++;
    const bots = Math.min(400, Math.round(map.landTiles / 1500));
    const g = new G.Game(map, { seed: 3, bots: bots, difficulty: 3, spawnTicks: 5 });
    g.setup(null);
    let worst = 0, total = 0; const T = 5000;
    for (let i = 0; i < T; i++) {
      const a = process.hrtime.bigint(); g.tick(); const ms = Number(process.hrtime.bigint() - a) / 1e6;
      total += ms; if (ms > worst) worst = ms; g.dirtyN = 0; g.dirtyFlag.fill(0);
      if (g.winner) break;
    }
    // invariants
    const cnt = new Int32Array(g.players.length);
    for (let t = 0; t < g.N; t++) { const o = g.owner[t]; if (o) { cnt[o]++; if (!map.land[t]) throw new Error('water owned'); } }
    for (let i = 1; i < g.players.length; i++) { const p = g.players[i]; if (cnt[i] !== p.tiles) throw new Error('tiles ' + p.name); if (!(p.troops >= 0) || !(p.gold >= 0)) throw new Error('numbers ' + p.name + ' ' + p.troops + ' ' + p.gold); }
    const alive = g.players.filter((p) => p && p.alive).sort((a, b) => b.tiles - a.tiles);
    console.log(id.padEnd(12), `${map.W}x${map.H} land=${map.landTiles} S=${map.S.toFixed(2)} terrain=${hist.map((v) => (v / map.landTiles).toFixed(2)).join('/')} water=${map.wsize.length - 1} players=${g.players.length - 1} ` +
      `ticks=${g.ticks} alive=${alive.length} winner=${g.winner ? g.winner.name : '-'} top=${alive.slice(0, 2).map((p) => p.name + ' ' + (p.tiles / map.landTiles * 100).toFixed(0) + '%').join(', ')} fallout=${g.falloutCount} avg=${(total / g.ticks).toFixed(2)}ms worst=${worst.toFixed(1)}ms`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
