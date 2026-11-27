// How the game grows: the same kind of round on maps of different size, with different numbers of
// realms and of units, and for every part of a tick whether it grows with the tiles of the map,
// the length of the fronts, the number of players or the number of units. Also: every array per
// tile with its bytes, and what the worker sends to the page per tick (src/05b_sync.js).
//   node --max-old-space-size=6144 test/skala.js [felder|spieler|erde|speicher|alle] [ticks]
// Every run is a child process of its own (memory and compiled code do not leak from one map to
// the next). Only the simulation is measured here; the picture: test/stress_view.js.
// The timing wrappers cost a little (only whole parts are timed, nothing per tile); compare parts
// with each other, and runs with each other.
const path = require('path'), cp = require('child_process'), v8 = require('v8');
const src = path.join(__dirname, '..', 'src');

// ---------- one run (in the child) ----------
async function one(cfg) {
  for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js', '05b_sync.js']) require(path.join(src, f));
  const G = globalThis.G, loadMap = require('./load.js');
  let t0 = Date.now(), map;
  if (cfg.map === 'zufall') map = G.buildMap(cfg.w, cfg.h, G.randomClassMap(cfg.w, cfg.h, 4242, 'zufall'), 4242, { id: 'zufall', name: 'Zufall', nations: [] });
  else map = await loadMap(G, cfg.map);
  const built = Date.now() - t0;
  // the game runs as in the browser: inside G.simWorker, with a fake scope; what it sends is
  // cloned as postMessage would (v8.serialize) and applied to a mirror (G.SyncIn)
  let game = null;
  const setup = G.Game.prototype.setup;
  G.Game.prototype.setup = function () { game = this; return setup.apply(this, arguments); };
  const sum = {}, peak = {}, cur = {}, cnt = {}, ccur = {};
  const wrap = (obj, name, label) => {
    const orig = obj[name];
    if (!orig) return;
    sum[label] = 0; peak[label] = 0; cur[label] = 0;
    obj[name] = function () {
      const a = process.hrtime.bigint();
      try { return orig.apply(this, arguments); } finally { cur[label] += Number(process.hrtime.bigint() - a) / 1e6; }
    };
  };
  const count = (obj, name, label, f) => {   // counts calls (or a size per call), no clock
    const orig = obj[name];
    cnt[label] = 0; ccur[label] = 0;
    obj[name] = function () { ccur[label] += f ? f.apply(this, arguments) : 1; return orig.apply(this, arguments); };
  };
  const GP = G.Game.prototype;
  wrap(GP, 'tick', 'tick');
  // the parts of a tick: top level ones do not nest; those marked ' in ' are inside another
  wrap(GP, 'tickAttack', 'tickAttack');
  wrap(GP, 'refreshFront', 'refreshFront in tickAttack');
  wrap(GP, 'removeClusters', 'removeClusters');
  wrap(GP, 'capturePocket', 'capturePocket in removeClusters');
  wrap(GP, 'shrinkBox', 'shrinkBox');
  wrap(GP, 'postTick', 'postTick');
  wrap(GP, 'postFlow', 'postFlow in postTick');
  wrap(GP, 'postDijkstra', 'postDijkstra in postFlow');
  wrap(GP, 'postPockets', 'postPockets in postFlow');
  wrap(G.AI.prototype, 'tick', 'AI.tick');
  wrap(GP, 'neighbors', 'neighbors in AI.tick');
  wrap(GP, 'tickUnit', 'tickUnit');
  wrap(GP, 'pathStep', 'pathStep');
  wrap(GP, 'tickRail', 'tickRail');
  wrap(GP, 'tickDiplomacy', 'tickDiplomacy');
  wrap(GP, 'reap', 'reap');
  wrap(GP, 'checkWin', 'checkWin');
  count(GP, 'conquer', 'conquer');
  count(GP, 'refreshFront', 'refreshFront: Grenzfelder', function (at) { return at.a.border.size; });
  count(GP, 'removeClusters', 'removeClusters: Grenzfelder', function (p) { return p.border.size; });
  const TOP = ['tickAttack', 'removeClusters', 'shrinkBox', 'postTick', 'AI.tick', 'tickUnit', 'pathStep', 'tickRail', 'tickDiplomacy', 'reap', 'checkWin'];

  const In = new G.SyncIn(map);
  let msgBytes = 0, serMs = 0, applyMs = 0, maxBytes = 0, nmsg = 0, measuring = false;
  const scope = {
    postMessage: function (msg) {
      if (msg.k === 'ready') { In.apply(structuredClone(msg)); return; }
      const a = process.hrtime.bigint();
      const buf = v8.serialize(msg);
      const b = process.hrtime.bigint();
      const copy = v8.deserialize(buf);
      const c = process.hrtime.bigint();
      In.apply(copy);
      const d = process.hrtime.bigint();
      if (measuring) {
        msgBytes += buf.length; maxBytes = Math.max(maxBytes, buf.length); nmsg++;
        serMs += Number(b - a) / 1e6 + Number(c - b) / 1e6; applyMs += Number(d - c) / 1e6;
      }
    }
  };
  G.simWorker(scope);
  const opts = { seed: 7, bots: cfg.bots, difficulty: 1, spawnTicks: 10, autoSpawn: true, nations: cfg.nations !== false };
  scope.onmessage({ data: { k: 'init', map: G.mapUnpack(G.mapPack(map, true)), opts: opts, people: { name: 'Ich' } } });
  const g = game;
  if (cfg.ships) addShips(G, g, cfg.ships, cfg.warm);
  const ticks = cfg.ticks, warm = cfg.warm, times = [], stepMs = [];
  const acc = { dirty: 0, border: 0, front: 0, attacks: 0, alive: 0, units: 0, cells: 0, posted: 0 };
  for (let i = 0; i < ticks; i++) {
    if (i === warm && cfg.ships) addShips(G, g, cfg.ships, -1);
    measuring = i >= warm;
    for (const k in cur) cur[k] = 0;
    for (const k in ccur) ccur[k] = 0;
    const a = process.hrtime.bigint();
    scope.onmessage({ data: { k: 'step', ticks: [[]] } });
    const all = Number(process.hrtime.bigint() - a) / 1e6;
    if (!measuring) continue;
    // the state after the tick (dirtyN is reset by the sync; count from the message instead)
    let border = 0, alive = 0, front = 0, att = 0, cells = 0, posted = 0, units = 0;
    for (let k = 1; k < g.players.length; k++) { const p = g.players[k]; if (!p.alive) continue; alive++; border += p.border.size; if (p.post) { posted++; cells += p.post.cells.size; } }
    for (const at of g.attacks) if (at.active) { att++; front += at.front.size; }
    for (const u of g.units) if (u.active) units++;
    acc.border += border; acc.alive += alive; acc.front += front; acc.attacks += att; acc.cells += cells; acc.posted += posted; acc.units += units;
    acc.dirty += ccur.conquer;
    times.push(cur.tick); stepMs.push(all - cur.tick);
    for (const k in cur) { sum[k] += cur[k]; if (cur[k] > peak[k]) peak[k] = cur[k]; }
    for (const k in ccur) cnt[k] += ccur[k];
  }
  const n = times.length;
  const avg = (o) => { const r = {}; for (const k in o) r[k] = o[k] / n; return r; };
  const s = times.slice().sort((x, y) => x - y), q = (f) => s[Math.min(n - 1, Math.floor(n * f))];
  const topSum = TOP.reduce((t, k) => t + (sum[k] || 0), 0);
  const res = {
    cfg: cfg, W: map.W, H: map.H, N: map.N, land: map.landTiles, built: built, players: g.players.length - 1,
    tick: { avg: s.reduce((t, v) => t + v, 0) / n, p95: q(0.95), p99: q(0.99), max: s[n - 1] },
    parts: avg(sum), peaks: peak, rest: (sum.tick - topSum) / n, counts: avg(cnt), state: avg(acc),
    sync: { bytes: msgBytes / Math.max(1, nmsg), maxBytes: maxBytes, out: stepMs.reduce((t, v) => t + v, 0) / n - (serMs + applyMs) / n, ser: serMs / n, apply: applyMs / n },
    mem: cfg.mem ? memory(G, g, In, map) : null,
    heap: Math.round(process.memoryUsage().heapUsed / 1e6), arrays: Math.round(process.memoryUsage().arrayBuffers / 1e6)
  };
  process.stdout.write('RESULT ' + JSON.stringify(res) + '\n');
}

// extra ships on the sea (as test/stress.js): half warships, half merchants on real routes
function addShips(G, g, N, warm) {
  if (warm >= 0) return;   // called again once the warm-up has built ports and routes
  const UT = G.UT, map = g.map, alive = g.players.filter((p) => p && p.alive);
  const routes = g.units.filter((u) => u.active && u.type === UT.TRADE && u.path && u.path.length > 20).map((u) => u.path);
  const sea = [];
  for (let t = 0; t < map.N; t += 7) if (!map.land[t]) sea.push(t);
  const rng = new G.RNG(99), ports = g.getPorts();
  for (let k = 0; k < N; k++) {
    const p = alive[rng.int(0, alive.length)];
    if (k % 2 === 0 || !routes.length) {
      const t = sea[rng.int(0, sea.length)], u = g.newUnit(UT.WARSHIP, p, t);
      u.hp = 1000; u.patrol = t; u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false; u.cls = 0;
      g.addUnit(u);
    } else {
      const r = routes[rng.int(0, routes.length)], pi = rng.int(0, r.length - 1), u = g.newUnit(UT.TRADE, p, r[pi]);
      u.path = r; u.pi = pi; u.captured = false; u.kind = 0; u.hits = 1; u.gold = 1000;
      u.dstPort = ports.find((v) => v.owner !== p) || null;
      if (u.dstPort) g.addUnit(u);
    }
  }
}

// ---------- memory: every typed array that hangs off the map, the game and the mirror ----------
function memory(G, g, In, map) {
  const seen = new Set(), list = [];
  const walk = (o, name, d) => {
    if (!o || typeof o !== 'object' || d > 4) return;
    if (ArrayBuffer.isView(o)) {
      if (seen.has(o.buffer)) return;
      seen.add(o.buffer);
      if (o.byteLength >= 1 << 16) list.push({ name: name, type: o.constructor.name, len: o.length, bytes: o.byteLength });
      return;
    }
    if (seen.has(o)) return;
    seen.add(o);
    if (o instanceof Map || o instanceof Set) return;
    if (Array.isArray(o)) { for (let i = 0; i < Math.min(o.length, 2000); i++) walk(o[i], name + '[]', d + 1); return; }
    for (const k of Object.keys(o)) walk(o[k], name + '.' + k, d + 1);
  };
  walk(map, 'map', 0);
  walk(g, 'game', 0);
  walk(In.m, 'mirror', 0);
  // the per-tile Sets and Maps (border, fronts, pockets): entries, bytes estimated by measuring
  const sets = { border: 0, front: 0, pocket: 0, structAt: g.structAt.size };
  for (let k = 1; k < g.players.length; k++) { const p = g.players[k]; sets.border += p.border.size; if (p.pocketSeen) sets.pocket += p.pocketSeen.size + p.pocketFrom.size; }
  for (const at of g.attacks) if (at.active) sets.front += at.front.size;
  const h0 = process.memoryUsage().heapUsed, probe = new Set();
  for (let i = 0; i < 1e6; i++) probe.add(i * 7);
  const perEntry = (process.memoryUsage().heapUsed - h0) / 1e6;
  probe.clear();
  return { arrays: list, sets: sets, setEntry: perEntry };
}

// ---------- the parent: which runs, then the tables ----------
const RUNS = {
  felder: [
    { name: 'Zufall 0.5 Mio.', map: 'zufall', w: 866, h: 577, bots: 150 },
    { name: 'Zufall 2 Mio.', map: 'zufall', w: 1732, h: 1155, bots: 150 },
    { name: 'Zufall 8 Mio.', map: 'zufall', w: 3464, h: 2309, bots: 150 },
    { name: 'Zufall 16 Mio.', map: 'zufall', w: 4900, h: 3266, bots: 150 }
  ],
  spieler: [
    { name: 'Zufall 2 Mio., 50 Bots', map: 'zufall', w: 1732, h: 1155, bots: 50 },
    { name: 'Zufall 2 Mio., 150 Bots', map: 'zufall', w: 1732, h: 1155, bots: 150 },
    { name: 'Zufall 2 Mio., 400 Bots', map: 'zufall', w: 1732, h: 1155, bots: 400 },
    { name: 'Zufall 2 Mio., 1000 Bots', map: 'zufall', w: 1732, h: 1155, bots: 1000 }
  ],
  einheiten: [
    { name: 'Welt, 150 Bots', map: 'welt', bots: 150 },
    { name: 'Welt, 150 Bots, +2000 Schiffe', map: 'welt', bots: 150, ships: 2000 },
    { name: 'Welt, 150 Bots, +8000 Schiffe', map: 'welt', bots: 150, ships: 8000 }
  ],
  erde: [
    { name: 'Erde, 400 Bots', map: 'erde', bots: 400, mem: true },
    { name: 'Erde, 100 Bots', map: 'erde', bots: 100 }
  ]
};

function main() {
  const which = process.argv[2] || 'alle', ticks = +(process.argv[3] || 1200);
  const parts = which === 'alle' ? ['felder', 'spieler', 'einheiten', 'erde'] : which === 'speicher' ? ['erde'] : [which];
  const out = {};
  for (const part of parts) {
    out[part] = [];
    for (const r of RUNS[part]) {
      if (which === 'speicher' && !r.mem) continue;
      const cfg = Object.assign({ ticks: ticks, warm: Math.min(400, ticks >> 2), mem: r.mem || part === 'felder' }, r);
      const a = Date.now();
      const txt = cp.execFileSync(process.execPath, ['--max-old-space-size=6144', __filename, '--one', JSON.stringify(cfg)], { encoding: 'utf8', maxBuffer: 1 << 26 });
      const line = txt.split('\n').find((l) => l.startsWith('RESULT '));
      const res = JSON.parse(line.slice(7));
      out[part].push(res);
      console.error(`  ${r.name}: ${res.tick.avg.toFixed(2)} ms/Tick (${((Date.now() - a) / 1000).toFixed(0)} s)`);
    }
    report(part, out[part]);
  }
  if (process.env.JSON) require('fs').writeFileSync(process.env.JSON, JSON.stringify(out));
}

const f = (v, d) => (v === undefined || v === null ? '' : v.toFixed(d === undefined ? 2 : d));
function report(part, rs) {
  AX = AXES[part] || [];
  if (part === 'einheiten') rs = rs.slice();
  console.log(`\n## ${part}\n`);
  const keys = Object.keys(rs[0].parts).filter((k) => k !== 'tick').sort((a, b) => rs[rs.length - 1].parts[b] - rs[rs.length - 1].parts[a]);
  console.log('| Teil | ' + rs.map((r) => r.cfg.name).join(' | ') + ' | Wachstum |');
  console.log('| --- |' + rs.map(() => ' ---: |').join('') + ' --- |');
  const row = (label, vals, d) => console.log(`| ${label} | ${vals.map((v) => f(v, d)).join(' | ')} | ${grow(rs, vals)} |`);
  row('**Tick, Mittel (ms)**', rs.map((r) => r.tick.avg));
  row('Tick, 99 % unter (ms)', rs.map((r) => r.tick.p99), 1);
  row('Tick, längster (ms)', rs.map((r) => r.tick.max), 1);
  for (const k of keys) row(k, rs.map((r) => r.parts[k]), 3);
  row('Rest des Ticks (Wachstum der Truppen, Gold)', rs.map((r) => r.rest), 3);
  row('Worker: Änderungen packen (ms)', rs.map((r) => r.sync.out), 3);
  row('Kopieren hin und her (ms, wie postMessage)', rs.map((r) => r.sync.ser), 3);
  row('Seite: Spiegel nachführen (ms)', rs.map((r) => r.sync.apply), 3);
  row('Nachricht pro Tick (kB)', rs.map((r) => r.sync.bytes / 1000), 1);
  row('grösste Nachricht (kB)', rs.map((r) => r.sync.maxBytes / 1000), 0);
  console.log('| *Grössen* |' + rs.map(() => ' |').join('') + ' |');
  row('Felder (Mio.)', rs.map((r) => r.N / 1e6), 2);
  row('Landfelder (Mio.)', rs.map((r) => r.land / 1e6), 2);
  row('Spieler am Leben', rs.map((r) => r.state.alive), 0);
  row('Grenzfelder aller Reiche', rs.map((r) => r.state.border), 0);
  row('Front aller Angriffe (Felder)', rs.map((r) => r.state.front), 0);
  row('Angriffe', rs.map((r) => r.state.attacks), 0);
  row('Eroberte Felder pro Tick', rs.map((r) => r.state.dirty), 0);
  row('Einheiten', rs.map((r) => r.state.units), 0);
  row('Reiche mit Aufstellung / ihre Zellen', rs.map((r) => r.state.posted), 0);
  row('refreshFront: Grenzfelder gelesen pro Tick', rs.map((r) => r.counts['refreshFront: Grenzfelder']), 0);
  row('removeClusters: Grenzfelder gelesen pro Tick', rs.map((r) => r.counts['removeClusters: Grenzfelder']), 0);
  row('Speicher JS / Arrays (MB)', rs.map((r) => r.heap), 0);
  row('', rs.map((r) => r.arrays), 0);
  for (const r of rs) if (r.mem) {
    console.log(`\n### Speicher, ${r.cfg.name} (${(r.N / 1e6).toFixed(2)} Mio. Felder)\n`);
    console.log('| Array | Typ | Länge | MB | Byte pro Feld |');
    console.log('| --- | --- | ---: | ---: | ---: |');
    let tot = 0;
    for (const a of r.mem.arrays.sort((x, y) => y.bytes - x.bytes)) { tot += a.bytes; console.log(`| ${a.name} | ${a.type} | ${a.len} | ${(a.bytes / 1e6).toFixed(1)} | ${(a.bytes / r.N).toFixed(2)} |`); }
    console.log(`| **zusammen** | | | ${(tot / 1e6).toFixed(0)} | ${(tot / r.N).toFixed(1)} |`);
    const s = r.mem.sets, e = r.mem.setEntry;
    console.log(`\nSets und Maps pro Feld (etwa ${e.toFixed(0)} Byte pro Eintrag): Grenzen ${s.border} Einträge (${(s.border * e / 1e6).toFixed(0)} MB), Fronten ${s.front} (${(s.front * e / 1e6).toFixed(0)} MB), Kessel-Gedächtnis ${s.pocket} (${(s.pocket * e / 1e6).toFixed(0)} MB), Gebäude ${s.structAt}.`);
  }
}
// growth between the first and the last run: the exponent against tiles, borders and players
// (only along what the series changes on purpose; 1 = grows in step, 2 = with the square)
const AXES = { felder: [['Felder', (r) => r.N], ['Grenze', (r) => r.state.border]], spieler: [['Spieler', (r) => r.state.alive], ['Grenze', (r) => r.state.border]],
  einheiten: [['Einheiten', (r) => r.state.units]], erde: [['Spieler', (r) => r.state.alive], ['Grenze', (r) => r.state.border]] };
let AX = [];
function grow(rs, vals) {
  const a = rs[0], b = rs[rs.length - 1], va = vals[0], vb = vals[vals.length - 1];
  if (!(va > 0.002 && vb > 0.002) || rs.length < 2) return '';
  const bits = [];
  for (const [name, get] of AX) { const x = get(a), y = get(b); if (x > 0 && y > 0 && Math.abs(Math.log(y / x)) > 0.3) bits.push(name + ' hoch ' + (Math.log(vb / va) / Math.log(y / x)).toFixed(1)); }
  return bits.join(', ');
}

if (process.argv[2] === '--one') one(JSON.parse(process.argv[3])).catch((e) => { console.error(e); process.exit(1); });
else main();
