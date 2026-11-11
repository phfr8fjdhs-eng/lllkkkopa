// Headless run of the simulation to check rules, invariants and speed.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const sharp = require('/opt/npm-tools/node_modules/sharp');

async function loadMap(id) {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === id);
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const ch = raw.info.channels, cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * ch] / 85);
  return G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations });
}

function check(g) {
  const cnt = new Int32Array(g.players.length);
  for (let t = 0; t < g.N; t++) { const o = g.owner[t]; if (o) { cnt[o]++; if (!g.map.land[t]) throw new Error('water owned ' + t); } }
  let fo = 0; for (let t = 0; t < g.N; t++) if (g.fallout[t]) { fo++; if (g.owner[t]) throw new Error('owned fallout'); }
  if (fo !== g.falloutCount) throw new Error('fallout count ' + fo + ' vs ' + g.falloutCount);
  for (let i = 1; i < g.players.length; i++) {
    const p = g.players[i];
    if (cnt[i] !== p.tiles) throw new Error('tile count mismatch for ' + p.name + ': ' + cnt[i] + ' vs ' + p.tiles);
    if (!isFinite(p.troops) || p.troops < 0) throw new Error('troops ' + p.troops + ' ' + p.name);
    if (!isFinite(p.gold) || p.gold < 0) throw new Error('gold ' + p.gold + ' ' + p.name);
    if (p.alive && p.tiles === 0) throw new Error('alive without land ' + p.name);
    // border set must match the real border
    let b = 0;
    const W = g.W, H = g.H, own = g.owner;
    for (let y = Math.max(0, p.y0); y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
      const t = y * W + x; if (own[t] !== i) continue;
      const e = (x > 0 && own[t - 1] !== i) || (x < W - 1 && own[t + 1] !== i) || (y > 0 && own[t - W] !== i) || (y < H - 1 && own[t + W] !== i);
      if (e) { b++; if (!p.border.has(t)) throw new Error('border missing ' + p.name); }
    }
    if (p.alive && b !== p.border.size) throw new Error('border size ' + b + ' vs ' + p.border.size + ' ' + p.name);
    for (const u of p.units) { if (!u.active) throw new Error('inactive unit listed'); if (u.owner !== p) throw new Error('unit owner'); }
    const c = new Int32Array(16); for (const u of p.units) c[u.type] += u.level;
    for (let k = 0; k < 16; k++) if (c[k] !== p.cnt[k]) throw new Error('unit count ' + k + ' ' + p.name + ' ' + c[k] + ' vs ' + p.cnt[k]);
  }
  for (const [t, u] of g.structAt) { if (!u.active) throw new Error('dead struct'); if (g.owner[t] !== u.owner.id) throw new Error('struct on foreign tile ' + G.UNAME[u.type] + ' ' + u.owner.name + ' built=' + u.built); }
}

(async () => {
  const id = process.argv[2] || 'welt', ticks = +(process.argv[3] || 6000), bots = +(process.argv[4] || 150), diff = +(process.argv[5] || 1);
  let t0 = Date.now();
  const map = await loadMap(id);
  console.log('map', id, map.W, map.H, 'land', map.landTiles, 'S', map.S.toFixed(2), 'water bodies', map.wsize.length - 1, 'build ms', Date.now() - t0);
  const hist = [0, 0, 0]; for (let i = 0; i < map.N; i++) if (map.land[i]) hist[map.mag[i] < 10 ? 0 : map.mag[i] < 20 ? 1 : 2]++;
  console.log('terrain share plains/highland/mountain', hist.map((v) => (v / map.landTiles).toFixed(2)).join(' '));
  const g = new G.Game(map, { seed: 7, bots: bots, difficulty: diff, spawnTicks: 10 });
  t0 = Date.now(); g.setup(null); console.log('setup ms', Date.now() - t0, 'players', g.players.length - 1);
  let worst = 0, total = 0;
  for (let i = 0; i < ticks; i++) {
    const a = process.hrtime.bigint(); g.tick(); const ms = Number(process.hrtime.bigint() - a) / 1e6;
    total += ms; if (ms > worst) worst = ms;
    g.dirtyN = 0; g.dirtyFlag.fill(0);
    if (i % 500 === 499) {
      check(g);
      const alive = g.players.filter((p) => p && p.alive);
      alive.sort((a, b) => b.tiles - a.tiles);
      const owned = alive.reduce((s, p) => s + p.tiles, 0);
      const cnt = (t) => g.units.filter((u) => u.active && u.type === t).length;
      console.log(`t=${i + 1} alive=${alive.length} owned=${(owned / map.landTiles * 100).toFixed(0)}% attacks=${g.attacks.filter((a) => a.active).length} ` +
        `units city/port/silo/sam/def=${cnt(0)}/${cnt(2)}/${cnt(3)}/${cnt(4)}/${cnt(1)} fab=${cnt(G.UT.FACTORY)} rails=${g.rails.length} trains=${cnt(G.UT.TRAIN)} war=${cnt(G.UT.WARSHIP)} boats=${cnt(G.UT.TRANSPORT)} trade=${cnt(G.UT.TRADE)} nukes=${g.nukes.filter((u) => u.active).length} fallout=${g.falloutCount} ` +
        `allies=${alive.reduce((s, p) => s + p.allies.size, 0) / 2} pathQ=${g.pathQ.length} top=${alive.slice(0, 3).map((p) => p.name + ':' + (p.tiles / map.landTiles * 100).toFixed(1) + '%/' + G.fmtTroops(p.troops) + '/' + G.fmt(p.gold)).join(', ')} avg=${(total / (i + 1)).toFixed(2)}ms worst=${worst.toFixed(1)}ms`);
      worst = 0;
      if (g.winner) { console.log('WINNER', g.winner.name, 'at tick', g.ticks); break; }
    }
  }
})().catch((e) => { console.error(e); process.exit(1); });
