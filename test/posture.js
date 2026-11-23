// The posture (Aufstellung): bookkeeping stays exact, troops march to where the net is pulled,
// a thrust draws on what is at hand and the rest follows, the whole front on everything at once,
// and two runs give the same game.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const sharp = require('/opt/npm-tools/node_modules/sharp');
const ok = (c, msg) => { if (!c) { console.log('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); };
(async () => {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === 'europa');
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * raw.info.channels] / 85);
  const map = G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations, lat: m.lat, lon: m.lon });
  const sum = (g, h) => { let s = 0; for (const c of h.post.cells.values()) s += g.postReal(h, c); return s; };
  const tilesOf = (h) => { let n = 0; for (const c of h.post.cells.values()) n += c.n; return n; };
  const run = (script) => {
    const g = new G.Game(map, { seed: 7, bots: 60, difficulty: 1, spawnTicks: 30 });
    g.setup({ name: 'Tester', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(3);
    let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t]);
    g.spawn(h, t);
    const step = (n) => { for (let i = 0; i < n; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; } };
    script(g, h, step, r);
    return g;
  };
  const grow = (g, h, step) => {
    // take free land for a while
    for (let k = 0; k < 40; k++) {
      let tile = -1;
      for (const b of h.border) { const c = [b - 1, b + 1, b - g.W, b + g.W].find((n) => n >= 0 && n < g.N && map.land[n] && g.owner[n] === 0); if (c !== undefined) { tile = c; break; } }
      if (tile >= 0) g.exec(h.id, { k: 'strike', t: tile, r: 0.3 });
      step(25);
    }
  };
  let log = {};
  const g1 = run((g, h, step) => {
    grow(g, h, step);
    g.immuneUntil = 1e9;      // nobody attacks anybody while the posture is being looked at
    ok(h.alive && h.tiles > 2000, 'realm grew: ' + h.tiles + ' tiles in ' + h.post.cells.size + ' cells');
    ok(tilesOf(h) === h.tiles, 'cells count every tile');
    ok(Math.abs(sum(g, h) - h.troops) < 1e-6 * h.troops + 1e-6, 'troops in cells add up to the pool');
    for (const a of h.out.slice()) g.retreat(a);
    for (const a of h.inc.slice()) g.endAttack(a, false);      // attacks on us still running (outnumbered ones crawl) would call reserves
    step(900);
    let lo = 9, hi = 0;
    for (const c of h.post.cells.values()) { if (c.n < 40) continue; const d = g.postDens(h, c); if (d < lo) lo = d; if (d > hi) hi = d; }
    ok(lo > 0.9 && hi < 1.1, 'left alone the realm stands evenly: density ' + lo.toFixed(3) + ' to ' + hi.toFixed(3));
    // pull the net to the easternmost cells
    const cells = [...h.post.cells.values()].filter((c) => c.n > 60).sort((a, b) => (b.id % g.CW) - (a.id % g.CW));
    const east = cells.slice(0, 4), west = cells.slice(-4);
    const before = east.reduce((s, c) => s + g.postReal(h, c), 0), share0 = before / h.troops;
    ok(g.exec(h.id, { k: 'mesh', c: east.map((c) => c.id), v: east.map(() => 5) }) === '', 'order: weigh four cells up');
    step(30);
    const share1 = east.reduce((s, c) => s + g.postReal(h, c), 0) / h.troops;
    step(900);
    const share2 = east.reduce((s, c) => s + g.postReal(h, c), 0) / h.troops;
    const wshare = west.reduce((s, c) => s + g.postReal(h, c), 0) / h.troops;
    ok(share1 > share0 && share1 < share2 * 0.8, 'troops march, it takes time: share ' + share0.toFixed(3) + ' -> ' + share1.toFixed(3) + ' -> ' + share2.toFixed(3));
    const dE = east.reduce((s, c) => s + g.postDens(h, c), 0) / east.length, dW = west.reduce((s, c) => s + g.postDens(h, c), 0) / west.length;
    ok(dE > dW * 3, 'the weighted cells end up several times denser: ' + dE.toFixed(2) + ' against ' + dW.toFixed(2));
    ok(Math.abs(sum(g, h) - h.troops) < 1e-6 * h.troops, 'still adds up');
    // an order at the dense end has much at hand, at the thin end little
    const tileOfCell = (c) => { const cx = c.id % g.CW, cy = (c.id - cx) / g.CW; return (cy * 16 + 8) * g.W + cx * 16 + 8; };
    const ie = g.commitInfo(h, tileOfCell(east[0]), 1), iw = g.commitInfo(h, tileOfCell(west[0]), 1);
    // (a realm no wider than the reach of an order has everything at hand from either end)
    let cx0 = 1e9, cx1 = -1;
    for (const c of h.post.cells.values()) { const cx = c.id % g.CW; if (cx < cx0) cx0 = cx; if (cx > cx1) cx1 = cx; }
    const narrow = cx1 - cx0 <= 9;
    ok((narrow || (ie.later > 0 && iw.later > 0 && iw.eta > 0)) && Math.abs(ie.now + ie.later - h.troops) < 1, 'at hand (the cells around the spot), the far end has to march: dense end ' + Math.round(ie.now) + ' (rest ' + Math.round(ie.later) + ' in ' + ie.eta.toFixed(0) + ' s), thin end ' + Math.round(iw.now) + ' (rest ' + Math.round(iw.later) + ' in ' + iw.eta.toFixed(0) + ' s)');
    ok(wshare < share2, 'the far end thinned out');
    // an order against a neighbour: part at once, the rest arrives
    g.immuneUntil = 0;
    const nb = g.neighbors(h);
    let target = -1;
    // a tile some way inside a neighbour, reachable over land: from a tile next to our border, 150
    // steps further into its land
    for (const b of h.border) {
      for (const n of [b - 1, b + 1, b - g.W, b + g.W]) {
        const id = g.owner[n];
        if (!id || id === h.id || !g.players[id].alive || g.friendly(h, g.players[id])) continue;
        const q = [n], seen = new Set(q);
        for (let i = 0; i < q.length && q.length < 150; i++) for (const m of [q[i] - 1, q[i] + 1, q[i] - g.W, q[i] + g.W]) if (g.owner[m] === id && !seen.has(m)) { seen.add(m); q.push(m); }
        target = q[q.length - 1]; break;
      }
      if (target >= 0) break;
    }
    if (target >= 0) {
      // the whole front draws on the whole realm alike: everything goes at once
      const p0 = h.troops, tid = g.owner[target];
      ok(g.exec(h.id, { k: 'strike', t: target, r: 0.1 }) === '' && Math.abs(p0 * 0.9 - h.troops) < 1 && h.out.some((a) => a.tid === tid && a.goal < 0 && !(a.want > 0)), 'order: the whole front, a tenth of the army at once from everywhere');
      for (const a of h.out.slice()) g.endAttack(a, true);
      // a thrust draws on what stands where it breaks in; the rest marches there
      const route = g.thrustRoute(h, tid, target, g.thrustWidth(2));
      const pool = h.troops, info = g.commitInfo(h, route ? route.path[0] : target, 1);
      const why = g.exec(h.id, { k: 'strike', t: target, r: 1, w: 2 });
      ok(why === '', 'order: a wedge with the whole army' + (why ? ' (' + why + ')' : ''));
      const at = h.out.find((a) => a.tid === tid && a.goal >= 0);
      // a thrust takes its troops at once and from the whole realm: density only counts for the defender
      ok(!!at && at.want === 0 && pool - h.troops > 0.98 * pool - 5, 'a thrust takes everything at once (' + Math.round(pool - h.troops) + ' of ' + Math.round(pool) + '), nothing on the march');
      step(20);
      if (at.active) {
        const p0 = h.troops, eng = at.troops;
        g.exec(h.id, { k: 'ret', a: at.id });
        ok(!at.active && at.want === 0 && Math.abs(h.troops - p0 - eng * 0.75) < 1, 'retreat: those engaged come back at a cost');
      }
      ok(Math.abs(sum(g, h) - h.troops) < 1e-6 * h.troops, 'still adds up after the fight');
    } else console.log('note: no neighbour to attack in this run');
    ok(g.exec(h.id, { k: 'even' }) === '', 'order: back to even');
    step(1500);
    log.a = g.checksum();
  });
  const g2 = run((g, h, step) => { grow(g, h, step); for (const a of h.out.slice()) g.retreat(a); step(100); log.b0 = g.checksum(); });
  const g3 = run((g, h, step) => { grow(g, h, step); for (const a of h.out.slice()) g.retreat(a); step(100); log.b1 = g.checksum(); });
  ok(log.b0 === log.b1, 'two runs, same game: ' + log.b0);
  // a railway speeds up marching in its own cell and, less, in the two rings of cells around it
  {
    const keep = g1.rails, W = g1.W, y = 8 * 16 + 8, path = [];
    for (let x = 10 * 16; x < 14 * 16; x++) path.push(y * W + x);
    g1.rails = [{ path: path }]; g1.railSeen = -1; g1.postRails();
    const cr = g1.cellRail, CW = g1.CW, at = (cx, cy) => cr[cy * CW + cx];
    ok(Math.abs(at(11, 8) - 0.2) < 1e-6 && Math.abs(at(11, 9) - 0.45) < 1e-6 && Math.abs(at(11, 10) - 0.75) < 1e-6 && at(11, 11) === 1, 'railway: 0.2 on the line, 0.45 one cell away, 0.75 two away, 1 beyond');
    g1.rails = keep; g1.railSeen = -1; g1.postRails();
  }
})();
