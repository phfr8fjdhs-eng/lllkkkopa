// Version «Rohstoffe», headless: the Earth with its countries. Checks that every piece of land has a
// country, that the count of land per country and player matches the map, that the income is what
// the rules say, and that two copies of the same game stay equal.
//   node --max-old-space-size=4096 test/res.js [ticks] [bots]
const fs = require('fs'), path = require('path');
const sharp = require('/opt/npm-tools/node_modules/sharp');
const root = path.join(__dirname, '..'), src = path.join(root, 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03c_res.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require('./load.js');
const fail = (m) => { console.error('FAIL', m); process.exit(1); };
(async () => {
  const map = await loadMap(G, 'erde');
  const def = JSON.parse(fs.readFileSync(path.join(root, 'build', 'laender.json'), 'utf8'));
  const r = await sharp(Buffer.from(def.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const cells = new Uint8Array(def.w * def.h);
  for (let i = 0; i < cells.length; i++) cells[i] = r.data[i * r.info.channels];
  G.attachCountries(map, def, cells);
  let bare = 0;
  for (let i = 0; i < map.N; i++) if (map.land[i] && !map.ctile[i]) bare++;
  if (bare) fail(bare + ' land tiles without a country');
  const cs = map.countries, by = (iso) => cs.find((k) => k && k.iso === iso);
  for (const k of cs) if (k) { for (const x of k.raw) if (!G.RAW[x]) fail('raw ' + x); if (!G.WARE[k.ware]) fail('ware ' + k.ware); }
  console.log('countries', cs.length - 1, 'with land', cs.filter((k) => k && k.tiles).length, 'worth per tick in all', cs.reduce((s, k) => s + (k ? k.value : 0), 0));
  for (const iso of ['CH', 'SA', 'DE', 'RU', 'US', 'QA', 'CD', 'LU'])
    { const k = by(iso); console.log(' ', k.name.padEnd(14), 'tiles', String(k.tiles).padStart(7), 'factor', k.f / 100, 'raw', k.raw.join('+'), k.value + '/tick', '| ware', G.WARE[k.ware][0], k.wareGold + '/tick'); }
  const ticks = +(process.argv[2] || 1500), bots = +(process.argv[3] || 200);
  const check = (g) => {
    const n = cs.length, cnt = g.players.map(() => new Int32Array(n));
    for (let t = 0; t < g.N; t++) { const o = g.owner[t]; if (o) cnt[o][map.ctile[t]]++; }
    for (let i = 1; i < g.players.length; i++) {
      const p = g.players[i];
      let sum = 0;
      for (let c = 1; c < n; c++) { const have = p.own ? p.own[c] : 0; if (have !== cnt[i][c]) fail('land of ' + p.name + ' in ' + cs[c].name + ': ' + have + ' counted ' + cnt[i][c]); sum += have; }
      if (sum !== p.tiles) fail('sum of ' + p.name);
      if (p.alive && g.goldRate(p) !== (p.type === G.PT.BOT ? 50 : 100) + (p.resRate | 0)) fail('rate');
    }
  };
  const make = () => { const g = new G.Game(map, { seed: 7, bots: bots, difficulty: 1, spawnTicks: 10, res: !process.env.NORES }); g.setup(null); return g; };
  // The two copies run one after the other, each with a sea graph of its own, as on two devices.
  const run = (g) => {
    const log = [];
    for (let i = 0; i < ticks; i++) {
      g.tick();
      g.dirtyN = 0; g.dirtyFlag.fill(0); g.fx.length = 0; g.events.length = 0;
      if (i % 500 === 499) {
        if (g.res) check(g);
        log.push(g.players.slice(1).map((p) => p.gold + ':' + p.tiles + ':' + Math.round(p.troops)).join(','));
        const top = g.players.filter((p) => p && p.alive).sort((x, y) => (y.resRate | 0) - (x.resRate | 0)).slice(0, 4);
        console.log('t=' + (i + 1), top.map((p) => p.name + ' +' + (p.resRate | 0) + '/tick (' + (p.monos | 0) + ' monopolies, ' + G.fmt(p.gold) + ' gold)').join(', '));
      }
    }
    return log;
  };
  const a = make();
  if (!a.res && !process.env.NORES) fail('rules not switched on');
  const la = run(a);
  map.sea = null;
  const lb = run(make());
  for (let i = 0; i < la.length; i++) if (la[i] !== lb[i]) fail('the two copies differ at tick ' + (i + 1) * 500);
  // a whole country in one hand pays one and a half times its worth
  if (!a.res) return console.log('OK (classic)');
  const p = a.players.find((q) => q && q.alive), sa = by('SA');
  const old = p.own[sa.id]; p.own[sa.id] = sa.tiles;
  const full = a.resOf(p, sa.id, 7); p.own[sa.id] = Math.floor(sa.tiles / 2);
  const half = a.resOf(p, sa.id, 2); p.own[sa.id] = old;
  if (full[0] !== Math.floor(sa.value * 3 / 2) || full[1] !== 5 * sa.wareGold || full[2] !== 1) fail('monopoly ' + full);
  if (half[0] !== Math.floor(sa.value * Math.floor(sa.tiles / 2) / sa.tiles) || half[1] !== 2 * sa.wareGold || half[2] !== 0) fail('half ' + half);
  console.log('OK');
})();
