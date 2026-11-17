// Version «Pfeile»: rally points gather the troops, three arrows launched together share the
// troops evenly, the net cannot be painted, and two runs give the same game.
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
  const log = {};
  const run = (pfeile) => {
    const g = new G.Game(map, { seed: 7, bots: 60, difficulty: 1, spawnTicks: 30, pfeile: pfeile, sammeln: pfeile });
    g.setup({ name: 'Tester', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(3);
    let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t]);
    g.spawn(h, t);
    const step = (n) => { for (let i = 0; i < n; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; } };
    for (let k = 0; k < 40; k++) {
      let tile = -1;
      for (const b of h.border) { const c = [b - 1, b + 1, b - g.W, b + g.W].find((n) => n >= 0 && n < g.N && map.land[n] && g.owner[n] === 0); if (c !== undefined) { tile = c; break; } }
      if (tile >= 0) g.exec(h.id, { k: 'strike', t: tile, r: 0.3 });
      step(25);
    }
    if (!pfeile) return g;
    log.mesh = g.exec(h.id, { k: 'mesh', c: [g.cellOf(h.spawnTile)], v: [5] });
    // a rally point at the first tile of the realm that is not on the border
    let inner = -1;
    for (let i = 0; i < g.N && inner < 0; i++) if (g.owner[i] === h.id && !h.border.has(i)) inner = i;
    log.rally = g.exec(h.id, { k: 'rally', t: inner });
    log.rallyN = h.post.rally.length;
    step(400);
    const at = h.post.cells.get(g.cellOf(inner));
    log.dens = g.postDens(h, at);
    log.foe = g.exec(h.id, { k: 'rally', t: map.land.findIndex((v, i) => v && g.owner[i] && g.owner[i] !== h.id) });
    log.off = g.exec(h.id, { k: 'rally', t: inner }); log.offN = h.post.rally.length;
    // three arrows at once, split the way the interface does it
    const foes = [];
    for (const b of h.border) for (const n of [b - 1, b + 1, b - g.W, b + g.W]) {
      const o = g.owner[n];
      if (o && o !== h.id && map.land[n] && !foes.some((f) => g.owner[f] === o)) foes.push(n);
    }
    const n = Math.min(3, foes.length), ratio = 0.6, before = h.troops, sent = [];
    for (let i = 0; i < n; i++) {
      const tr0 = h.troops;
      g.exec(h.id, { k: 'strike', t: foes[i], r: ratio / n / (1 - ratio * i / n), w: 2, s: -1 });
      sent.push(tr0 - h.troops);
    }
    log.arrows = n; log.sent = sent.map((x) => Math.round(x / before * 1000) / 1000);
    step(300);
    return g;
  };
  const a = run(true), sumA = a.players.reduce((s, p) => s + (p ? p.tiles * 7 + Math.round(p.troops) : 0), 0);
  const L = Object.assign({}, log);
  const b = run(true), sumB = b.players.reduce((s, p) => s + (p ? p.tiles * 7 + Math.round(p.troops) : 0), 0);
  ok(L.mesh === 'Nicht möglich', 'the net cannot be painted in «Pfeile»');
  ok(L.rally === '' && L.rallyN === 1, 'a rally point is set on the own land');
  ok(L.dens > 2, 'troops gather at the rally point: density ' + (L.dens || 0).toFixed(2));
  ok(L.foe !== '', 'no rally point on foreign land: ' + L.foe);
  ok(L.off === '' && L.offN === 0, 'a second double click takes it away');
  ok(L.arrows >= 1 && L.sent.every((x) => Math.abs(x - 0.6 / L.arrows) < 0.02), L.arrows + ' arrows, each takes its even share: ' + L.sent.join(' / '));
  ok(sumA === sumB, 'two runs, same game: ' + sumA);
  const c = run(false);
  ok(!c.pfeile && c.exec(c.human.id, { k: 'rally', t: c.human.spawnTile }) === 'Nicht möglich', 'version «Bisher»: no rally points, the net as before');
  const d = new G.Game(map, { seed: 7, bots: 10, spawnTicks: 30, pfeile: true, sammeln: false });
  d.setup({ name: 'T', color: [220, 60, 50] });
  let s0; do { s0 = Math.floor(Math.random() * d.N); } while (!d.canSpawnAt(s0) || map.shore[s0]);
  d.spawn(d.human, s0); for (let i = 0; i < 60; i++) d.tick();
  ok(d.exec(d.human.id, { k: 'rally', t: d.human.spawnTile }) === 'Nicht möglich', 'Pfeile an, Sammeln aus: no rally points');
  ok(d.exec(d.human.id, { k: 'mesh', c: [d.cellOf(d.human.spawnTile)], v: [3] }) === '', 'Pfeile an, Sammeln aus: the net works as before');
})();
