// Switches «Netz» and «Pfeile»: without the net nothing can be painted, three arrows launched
// together share the troops evenly, and two runs give the same game.
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
    const g = new G.Game(map, { seed: 7, bots: 60, difficulty: 1, spawnTicks: 30, pfeile: pfeile, netz: !pfeile });
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
  ok(L.mesh === 'Nicht möglich', 'Netz aus: the net cannot be painted');
  ok(L.arrows >= 1 && L.sent.every((x) => Math.abs(x - 0.6 / L.arrows) < 0.02), L.arrows + ' arrows, each takes its even share: ' + L.sent.join(' / '));
  ok(sumA === sumB, 'two runs, same game: ' + sumA);
  // a direction attack: takes land only in its band, the part of the front facing that way
  {
    const g = new G.Game(map, { seed: 7, bots: 60, difficulty: 1, spawnTicks: 30, punkt: true });
    g.setup({ name: 'Tester', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(3);
    let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t]);
    g.spawn(h, t);
    const step = (n) => { for (let i = 0; i < n; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; } };
    for (let k = 0; k < 30; k++) { for (const b of h.border) { const n = [b - 1, b + 1, b - g.W, b + g.W].find((m) => map.land[m] && g.owner[m] === 0); if (n !== undefined) { g.exec(h.id, { k: 'strike', t: n, r: 0.3 }); break; } } step(30); }
    step(Math.max(0, g.immuneUntil - g.ticks + 1));
    h.troops = 200000;
    let foe = -1;
    for (const b of h.border) { for (const n of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[n] && g.owner[n] !== h.id && map.land[n]) { foe = n; break; } if (foe >= 0) break; }
    const tid = g.owner[foe], before = new Set();
    for (let i = 0; i < g.N; i++) if (g.owner[i] === h.id) before.add(i);
    const why = g.exec(h.id, { k: 'strike', t: foe, r: 0.3, w: 3 });
    const at = h.out.find((o) => o.active && o.spot >= 0);
    const rad = at ? at.rad : 0, o = at ? at.spot : 0, ddx = at ? at.dx : 0, ddy = at ? at.dy : 0;
    step(300);
    let far = 0, got = 0;
    for (let i = 0; i < g.N; i++) if (g.owner[i] === h.id && !before.has(i)) {
      got++;
      const vx = i % g.W - o % g.W, vy = ((i / g.W) | 0) - ((o / g.W) | 0);
      if (Math.abs(vx * ddy - vy * ddx) > rad + 1.5 || vx * ddx + vy * ddy < -3) far++;
    }
    ok(why === '' && !!at, 'a direction attack starts: ' + (why || 'ok'));
    ok(got > 0 && far === 0, 'it takes land only in its band: ' + got + ' tiles, ' + far + ' outside (half width ' + rad.toFixed(1) + ')');
    const off = new G.Game(map, { seed: 7, bots: 10, spawnTicks: 30 });
    off.setup({ name: 'T', color: [1, 2, 3] });
    ok(!off.punkt, 'Punktangriff aus: mode 3 falls back to the whole front');
  }
  // Truppenkonzentration aus: one pool of troops as in OpenFront, for people and nations alike
  {
    const g = new G.Game(map, { seed: 7, bots: 30, spawnTicks: 30, aufstellung: false });
    g.setup({ name: 'T', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(3);
    let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t]);
    g.spawn(h, t);
    for (let i = 0; i < 300; i++) g.tick();
    const nat = g.players.filter((p) => p && p.type === G.PT.NATION);
    ok(!h.post && nat.every((p) => !p.post), 'Truppenkonzentration aus: no posture for the person or the ' + nat.length + ' nations');
    ok(g.exec(h.id, { k: 'mesh', c: [0], v: [3] }) !== '', 'Truppenkonzentration aus: no net to paint');
    let n = 0; for (const b of h.border) { const m = [b - 1, b + 1, b - g.W, b + g.W].find((x) => map.land[x] && g.owner[x] === 0); if (m !== undefined) { g.exec(h.id, { k: 'strike', t: m, r: 0.3 }); n = h.tiles; break; } }
    for (let i = 0; i < 200; i++) g.tick();
    ok(h.tiles > n, 'Truppenkonzentration aus: attacking works: ' + n + ' -> ' + h.tiles + ' tiles');
  }
  const c = run(false);
  ok(!c.pfeile && c.exec(c.human.id, { k: 'mesh', c: [c.cellOf(c.human.spawnTile)], v: [3] }) === '', 'Netz an: the net works as before');
})();
