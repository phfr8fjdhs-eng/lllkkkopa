// Version «Rohstoffe», headless: the Earth with its countries. Checks that every piece of land has a
// country, that every deposit lies on land of its own country, that the count of land per country
// and player matches the map, that the income is exactly deposits plus factories, and that two
// copies of the same game stay equal.
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
  const deps = map.deposits;
  for (const d of deps) {
    if (!map.land[d.t] || map.ctile[d.t] !== d.c) fail('deposit off its country: ' + cs[d.c].name);
    if (!G.RES_ICON[d.raw] || d.gold <= 0) fail('deposit ' + d.raw);
  }
  for (const k of cs) if (k && k.tiles) { if (!k.deps.length || k.deps.length > 2) fail('deposits of ' + k.name + ': ' + k.deps.length); if (new Set(k.deps.map((i) => deps[i].t)).size !== k.deps.length) fail('two deposits on one spot in ' + k.name); }
  console.log('countries', cs.length - 1, 'with land', cs.filter((k) => k && k.tiles).length, 'deposits', deps.length, 'worth per tick in all', deps.reduce((s, d) => s + d.gold, 0));
  for (const iso of ['CH', 'SA', 'DE', 'RU', 'US', 'QA', 'CD', 'LU'])
    { const k = by(iso); console.log(' ', k.name.padEnd(14), 'tiles', String(k.tiles).padStart(7), 'factor', k.f / 100, '| dig', k.deps.map((i) => G.RAW[deps[i].raw][0] + ' ' + deps[i].gold + ' at ' + deps[i].x + ',' + deps[i].y).join(', '), '| make', G.WARE[k.ware][0], k.wareGold); }
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
    // right after the income was counted it is exactly: deposits held plus factory levels (five per country at most)
    g.resTick();
    const raw = new Int32Array(g.players.length), ware = new Int32Array(g.players.length), lv = new Map();
    for (const d of deps) raw[g.owner[d.t]] += d.gold;
    for (const u of g.structAt.values()) if (u.type === G.UT.FACTORY && u.built && u.active) { const key = u.owner.id + ':' + map.ctile[u.tile]; lv.set(key, (lv.get(key) || 0) + u.level); }
    for (const [key, n] of lv) { const [id, c] = key.split(':').map(Number); ware[id] += Math.min(n, 5) * cs[c].wareGold; }
    for (let i = 1; i < g.players.length; i++) {
      const p = g.players[i], bot = p.type === G.PT.BOT;
      if (p.alive && p.resRate !== (bot ? raw[i] >> 1 : raw[i]) + (bot ? ware[i] >> 1 : ware[i])) fail('income of ' + p.name + ': ' + p.resRate + ' expected ' + raw[i] + ' + ' + ware[i]);
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
        console.log('t=' + (i + 1), top.map((p) => p.name + ' +' + (p.resRaw | 0) + ' dug +' + (p.resWare | 0) + ' made (' + G.fmt(p.gold) + ' gold)').join(', '));
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
  console.log('OK');
})();
