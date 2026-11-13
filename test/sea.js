// Sea routes over the sea graph: random pairs of water tiles, every route checked tile by tile.
// node test/sea.js [map] [routes]
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require('./load.js');
(async () => {
  const id = process.argv[2] || 'erde';
  const map = await loadMap(G, id);
  let t0 = Date.now();
  const g = new G.Game(map, { seed: 7, bots: 0, difficulty: 1, spawnTicks: 10 });
  console.log(id, 'sea graph: nodes', g.sea.n, 'links', g.sea.adj.length / 2, 'cells', g.sea.cw * g.sea.ch, 'built in ms', Date.now() - t0);
  const W = map.W, H = map.H, land = map.land;
  // main ocean = biggest body of water
  let big = 1; for (let i = 2; i < map.wsize.length; i++) if (map.wsize[i] > map.wsize[big]) big = i;
  const rnd = (() => { let s = 12345; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; })();
  // tiles of the smaller bodies of water, so a random pick does not take for ever
  const lists = new Map();
  for (let t = 0; t < map.N; t++) { const c = map.wcomp[t]; if (c && c !== big && map.wsize[c] >= 40) { if (!lists.has(c)) lists.set(c, []); lists.get(c).push(t); } }
  const lakes = [...lists.keys()];
  const pick = (comp) => { if (comp !== big) { const l = lists.get(comp); return l[(rnd() * l.length) | 0]; } for (;;) { const t = (rnd() * map.N) | 0; if (!land[t] && map.wcomp[t] === comp) return t; } };
  let bad = 0, n = 0, ratio = 0, worstRatio = 0, exp = 0, tms = 0, fail = 0;
  const N = +(process.argv[3] || 300);
  for (let k = 0; k < N; k++) {
    const comp = k % 5 === 4 && lakes.length ? lakes[(rnd() * lakes.length) | 0] : big;
    const a = pick(comp), b = pick(comp);
    let res;
    g.requestPath(a, b, (p) => { res = p; }, false, k % 3 === 0);
    const t1 = process.hrtime.bigint();
    let guard = 0;
    while (res === undefined && guard++ < 100000) g.pathLong(1e9);
    tms += Number(process.hrtime.bigint() - t1) / 1e6;
    n++;
    if (!res) { fail++; console.log('NO ROUTE', a % W, (a / W) | 0, '->', b % W, (b / W) | 0, 'comp', comp); continue; }
    if (res[0] !== a || res[res.length - 1] !== b) { bad++; console.log('ENDS WRONG'); continue; }
    for (let i = 0; i < res.length; i++) {
      const t = res[i];
      if (land[t]) { bad++; console.log('ON LAND at', i); break; }
      if (i) {
        const p = res[i - 1], dx = t % W - p % W, dy = ((t / W) | 0) - ((p / W) | 0);
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1 || (!dx && !dy)) { bad++; console.log('GAP at', i, dx, dy); break; }
        if (dx && dy && (land[p + dx] || land[p + dy * W])) { bad++; console.log('CUTS A CORNER at', i); break; }
      }
    }
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0, air = Math.hypot(ax - bx, ay - by);
    let len = 0; for (let i = 1; i < res.length; i++) len += (res[i] % W !== res[i - 1] % W && ((res[i] / W) | 0) !== ((res[i - 1] / W) | 0)) ? 1.4142 : 1;
    if (air > 300 && comp === big) { ratio += len / air; if (len / air > worstRatio) worstRatio = len / air; exp++; }
  }
  console.log('routes', n, 'no route', fail, 'broken', bad, 'avg ms per route', (tms / n).toFixed(1), 'length / straight line: avg', (ratio / exp).toFixed(2), 'worst', worstRatio.toFixed(2), '(' + exp + ' long ocean routes)');
})();
