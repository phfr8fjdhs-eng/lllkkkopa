// The posture (Aufstellung): bookkeeping stays exact, troops march to where the net is pulled,
// an order draws on what is at hand and the rest follows, and two runs give the same game.
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
    ok(share2 > share0 * 3, 'the weighted cells end up several times denser');
    ok(Math.abs(sum(g, h) - h.troops) < 1e-6 * h.troops, 'still adds up');
    // an order at the dense end has much at hand, at the thin end little
    const tileOfCell = (c) => { const cx = c.id % g.CW, cy = (c.id - cx) / g.CW; return (cy * 16 + 8) * g.W + cx * 16 + 8; };
    const ie = g.commitInfo(h, tileOfCell(east[0]), 1), iw = g.commitInfo(h, tileOfCell(west[0]), 1);
    ok(ie.later > 0 && iw.later > 0 && iw.eta > 0 && Math.abs(ie.now + ie.later - h.troops) < 1, 'at hand (the cells around the spot), the far end has to march: dense end ' + Math.round(ie.now) + ' (rest ' + Math.round(ie.later) + ' in ' + ie.eta.toFixed(0) + ' s), thin end ' + Math.round(iw.now) + ' (rest ' + Math.round(iw.later) + ' in ' + iw.eta.toFixed(0) + ' s)');
    ok(wshare < share2, 'the far end thinned out');
    // an order against a neighbour: part at once, the rest arrives
    g.immuneUntil = 0;
    const nb = g.neighbors(h);
    let target = -1;
    for (const id of nb.ids) { const q = g.players[id]; for (let k = 0; k < 4000 && target < 0; k++) { const tt = (q.y0 + ((k * 7919) % (q.y1 - q.y0 + 1))) * g.W + q.x0 + ((k * 104729) % (q.x1 - q.x0 + 1)); if (g.owner[tt] === id) target = tt; } if (target >= 0) break; }
    if (target >= 0) {
      const pool = h.troops, info = g.commitInfo(h, target, 1);
      ok(g.exec(h.id, { k: 'strike', t: target, r: 1 }) === '', 'order: attack with the whole army');
      const at = h.out.find((a) => a.tid === g.owner[target]);
      ok(!!at && at.want > 0 && Math.abs((pool - h.troops) - info.now) < 0.02 * pool + 5, 'only what stood there went at once (' + Math.round(pool - h.troops) + ' of ' + Math.round(pool) + '), ' + Math.round(at ? at.want : 0) + ' on the march');
      const w0 = at.want;
      step(20);
      ok(!at.active || at.want < w0, 'the rest keeps arriving: ' + Math.round(w0) + ' -> ' + Math.round(at.want));
      if (at.active) {
        const p0 = h.troops, eng = at.troops;
        g.exec(h.id, { k: 'ret', a: at.id });
        ok(!at.active && at.want === 0 && Math.abs(h.troops - p0 - eng * 0.75) < 1, 'retreat: those marching stay free of charge, those engaged come back at a cost');
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
  // dense ground brakes and keeps more of its troops
  const fx = { brake: 0, bleed: 0, keep: 0 }, row = [];
  for (const d of [0, 0.5, 1, 2, 4, 8]) { g1.postEffect(d, false, fx); row.push(d + ': brake ' + fx.brake.toFixed(2) + ' bleed ' + fx.bleed.toFixed(2) + ' loss/troop ' + (d ? (fx.keep / d).toFixed(2) : '-')); }
  console.log('open ground  ', row.join(' | '));
  g1.postEffect(1, false, fx);
  ok(Math.abs(fx.brake - 1) < 1e-9 && Math.abs(fx.bleed - 1) < 1e-9 && Math.abs(fx.keep - 1) < 1e-9, 'average density is the game as it was');
})();
