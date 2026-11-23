// Messbank for ground combat: fixed scenarios on the world map, measured in time and losses.
// Every scenario is run twice: with the posture (troops stand in cells, as a person plays it) and
// as one pool of troops (as nations and bots have it). Checked is what matters in play:
//   - who clearly outnumbers the defender takes the realm, in one click or in several small ones
//   - who does not, gets stuck
//   - standing evenly, the posture changes neither the outcome nor, by much, time and losses
// For comparison, OpenFront's formula (before 15.11.2026) on the same scenarios: five clicks of
// 20 % (100K against 40K) got stuck at 66 % of the land with all 100K lost, while one click of
// 50 % (75K) took everything for 46K.
//
//   node test/kampf.js            all scenarios
//   node test/kampf.js gross      only scenarios whose name contains "gross"
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const sharp = require('/opt/npm-tools/node_modules/sharp');
const K = (n) => (n / 1000).toFixed(1) + 'K';

// The sizes are what the troop limit allows: 3000 tiles hold up to 344K, 500 tiles up to 183K.
// name, tiles and troops of attacker and defender, the clicks (share of the army, tick), and
// whether the realm should fall (want 1) or hold (want 0)
const SCENARIOS = [
  { name: 'klein: 40K gegen 10K, ein Klick 50 %', at: 500, dt: 250, aT: 40000, dT: 10000, clicks: [[0.5, 0]], want: 1 },
  { name: 'klein: 40K gegen 10K, drei Klicks 20 %', at: 500, dt: 250, aT: 40000, dT: 10000, clicks: [[0.2, 0], [0.2, 20], [0.2, 40]], want: 1 },
  { name: 'gross: 150K gegen 40K, ein Klick 20 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, clicks: [[0.2, 0]], want: 0 },
  { name: 'gross: 150K gegen 40K, ein Klick 50 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, clicks: [[0.5, 0]], want: 1 },
  { name: 'gross: 150K gegen 40K, ein Klick 100 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, clicks: [[1, 0]], want: 1 },
  { name: 'gross: 150K gegen 40K, fünf Klicks 20 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, clicks: [[0.2, 0], [0.2, 20], [0.2, 40], [0.2, 60], [0.2, 80]], want: 1 },
  // a small attack against a much stronger defender must not get far (17.11.2026: 5K took a third of 30K's land)
  { name: 'schwach: 5K gegen 30K, 1000 Felder', at: 500, dt: 1000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.06 },
  { name: 'schwach: 5K gegen 30K, 300 Felder', at: 500, dt: 300, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.12 },
  { name: 'schwach: 5K gegen 30K, 3000 Felder', at: 1000, dt: 3000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.06 },
  { name: 'schwach: 10 % von 50K gegen 30K, 3000 Felder', at: 3000, dt: 3000, aT: 50000, dT: 30000, clicks: [[0.1, 0]], want: 0, maxTook: 0.06 },
  { name: 'schwach: Nation 5K gegen Mensch 30K, 3000 Felder', at: 1000, dt: 3000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.06, flip: true },
  { name: 'schwach: Nation 5K gegen Mensch 30K, 1000 Felder', at: 1000, dt: 1000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.06, flip: true },
  // a border held thin falls faster: since 23.11.2026 a tile costs what really stands on it (at
  // least what empty land costs), so up to 8 % here instead of 6 %
  { name: 'schwach: Nation 5K gegen Mensch 30K, dünne Grenze, 1000 Felder', at: 1000, dt: 1000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.08, flip: true, thin: true },
  { name: 'schwach: Nation 5K gegen Mensch 30K, dünne Grenze, 3000 Felder', at: 1000, dt: 3000, aT: 5000, dT: 30000, clicks: [[1, 0]], want: 0, maxTook: 0.08, flip: true, thin: true },
  { name: 'gleich: 80K gegen 80K, ein Klick 50 %', at: 3000, dt: 3000, aT: 80000, dT: 80000, clicks: [[0.5, 0]], want: 0 },
  // since nations stand dense along a threatening border (15.11.2026), two to one against them is a
  // close call either way (want -1: only shown, not checked)
  { name: 'riesig: 400K gegen 100K, ein Klick 50 %', at: 12000, dt: 4000, aT: 400000, dT: 100000, clicks: [[0.5, 0]], want: -1 },
  { name: 'riesig: 400K gegen 100K, ein Klick 65 %', at: 12000, dt: 4000, aT: 400000, dT: 100000, clicks: [[0.65, 0]], want: 1 }
];
const LIMIT = 3000;       // ticks (five minutes): whoever is not through by then is stuck

async function loadMap(id) {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === id);
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const ch = raw.info.channels, cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * ch] / 85);
  return G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations, lat: m.lat, lon: m.lon });
}

// Two realms side by side on the largest stretch of land: the attacker grows out of a tile in
// the middle of it, the defender out of the attacker's rim. Everybody else stands still.
function arena(map, sc, classic, extra) {
  const g = new G.Game(map, Object.assign({ seed: 11, bots: 0, difficulty: 1, spawnTicks: 10 }, extra || {}));
  g.setup({ name: 'Angreifer', color: [220, 60, 50] });
  const h = g.human, W = g.W, N = g.N, land = map.land;
  // the land tile furthest from any sea, roughly: the one with the most land around it in Asia
  let seed = -1;
  for (let r = 0; r < 400 && seed < 0; r++) { const t = Math.round(g.H * 0.3) * W + Math.round(W * 0.72) + r; if (land[t] && g.canSpawnAt(t)) seed = t; }
  g.spawn(h, seed);
  while (g.phase !== 'play') g.tick();
  for (const p of g.players) if (p) p.ai = null;
  g.troopGrowth = function () { return 0; };
  g.immuneUntil = 0;
  if (classic) h.post = null;
  let foe = null;
  for (const p of g.players) if (p && p !== h && p.alive && p.type === G.PT.NATION) { foe = p; break; }
  // a blob of land around the seed, cut in two from north to south: the west is the attacker's,
  // the east the defender's (a realm lying inside another would simply be swallowed)
  const seen = new Uint8Array(N), q = [seed];
  seen[seed] = 1;
  for (let i = 0; i < q.length && q.length < sc.at + sc.dt; i++) {
    const t = q[i];
    for (const n of [t - 1, t + 1, t - W, t + W]) if (n >= 0 && n < N && land[n] && !seen[n] && q.length < sc.at + sc.dt) { seen[n] = 1; q.push(n); }
  }
  q.sort((x, y) => (x % W) - (y % W) || x - y);
  const mine = new Uint8Array(N);
  for (let i = 0; i < q.length; i++) mine[q[i]] = i < sc.at ? 1 : 2;
  for (let t = 0; t < N; t++) if (g.owner[t] && !mine[t] && (g.owner[t] === h.id || g.owner[t] === foe.id)) g.relinquish(t);
  for (let i = 0; i < q.length; i++) g.conquer(i < sc.at ? h : foe, q[i]);
  h.troops = sc.aT; foe.troops = sc.dT;
  if (h.post) { for (const c of h.post.cells.values()) c.u = c.n; h.post.H = h.tiles; }      // standing evenly
  for (let i = 0; i < 20; i++) g.tick();
  h.troops = sc.aT; foe.troops = sc.dT;
  return { g: g, h: h, foe: foe };
}

function run(map, sc, classic) {
  // flip: the nation attacks and the person (with the posture) defends
  const A = arena(map, sc.flip ? { at: sc.dt, dt: sc.at, aT: sc.dT, dT: sc.aT } : sc, classic), g = A.g;
  const h = sc.flip ? A.foe : A.h, foe = sc.flip ? A.h : A.foe;
  // thin: the defender's cells nearest the attacker stand almost empty (land just taken, or the
  // net drawn elsewhere); their troops stand further back
  if (sc.thin && foe.post) {
    const cs = [...foe.post.cells.entries()], cx = (e) => e[0] % g.CW, east = h.x0 > foe.x0;
    cs.sort((x, y) => east ? cx(y) - cx(x) : cx(x) - cx(y));
    let H = 0;
    cs.forEach((e, i) => { const c = e[1]; c.u = i < cs.length * 0.3 ? c.n * 0.05 : c.n * 1.4; H += c.u; });
    foe.post.H = H;
  }
  const tiles0 = foe.tiles, t0 = g.ticks;
  let sent = 0, half = -1, end = -1, next = 0;
  for (let k = 0; k < LIMIT; k++) {
    while (next < sc.clicks.length && sc.clicks[next][1] <= k) {
      // the click lands on the defender's tile nearest to the attacker's first tile
      let tile = -1;
      for (const b of h.border) { for (const n of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[n] === foe.id) { tile = n; break; } if (tile >= 0) break; }
      const before = h.troops;
      if (tile >= 0 && sc.flip) g.attack(h, foe.id, h.troops * sc.clicks[next][0], -1, tile);
      else if (tile >= 0) g.exec(h.id, { k: 'strike', t: tile, r: sc.clicks[next][0], w: sc.clicks[next][2] || 0 });
      sent += classic ? before - h.troops : before * sc.clicks[next][0];
      next++;
    }
    g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0;
    if (half < 0 && foe.tiles <= tiles0 / 2) half = g.ticks - t0;
    if (!foe.alive) { end = g.ticks - t0; break; }
    if (next >= sc.clicks.length && !h.out.some((a) => a.active)) break;      // the attack has run out
  }
  let inAttack = 0;
  for (const a of h.out) if (a.active) inAttack += a.troops;
  return { won: !foe.alive, half: half, end: end, took: 1 - (foe.alive ? foe.tiles : 0) / tiles0, lost: sc.aT - h.troops - inAttack, sent: sent, cells: h.post ? h.post.cells.size : 0, foeLeft: foe.alive ? foe.troops : 0 };
}

// ---------- thrusts ----------
// The goal of a thrust: the defender's tile furthest east on the row through the middle of the arena.
function deepGoal(g, foe, row) {
  let best = -1;
  for (let x = 0; x < g.W; x++) { const t = row * g.W + x; if (g.owner[t] === foe.id) best = t; }
  return best;
}
// One thrust (or the whole front) with the same troops; measured: does it reach the goal, how far
// does it get along the way a wedge would take (share of that way), what does it cost.
function runThrust(map, sc, mode, classic, extra, prep) {
  const A = arena(map, sc, classic, extra), g = A.g, h = A.h, foe = A.foe, W = g.W;
  if (prep) prep(g, h, foe);
  const row = Math.round((h.y0 + h.y1) / 2), goal = deepGoal(g, foe, row);
  let x0 = W, x1 = 0;
  for (let x = 0; x < W; x++) if (g.owner[row * W + x] === foe.id) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const way = g.thrustRoute(h, foe.id, goal, g.thrustWidth(2));     // the same way for every mode, to measure progress on
  // what the preview promises for this thrust, to set against what it really does
  const own = mode ? g.thrustRoute(h, foe.id, goal, g.thrustWidth(mode)) : null, est = own ? g.thrustEstimate(h, own, h.troops * sc.share) : null;
  const before = h.troops, why = g.exec(h.id, { k: 'strike', t: goal, r: sc.share, w: mode });
  const at = h.out.find((a) => a.active);
  const lane = at && at.lane ? at.lane.size : 0, len = at && at.path ? at.path.length : 0;
  let hit = -1, t0 = g.ticks;
  const atHit = { left: -1, took: -1 };
  for (let k = 0; k < LIMIT; k++) {
    if (at && at.active && hit < 0) { atHit.fs = (atHit.fs || 0) + at.front.size; atHit.fn = (atHit.fn || 0) + 1; atHit.tk = (at.taken || 0); }
    g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0;
    if (hit < 0 && g.owner[goal] === h.id) { hit = g.ticks - t0; if (at) { atHit.left = at.troops; atHit.took = at.taken || 0; } }
    if (!h.out.some((a) => a.active)) break;
  }
  let deep = 0;
  if (way) for (let i = 0; i < way.path.length; i++) if (g.owner[way.path[i]] === h.id) deep = i + 1;
  // how far it really got along its own way, measured like the preview
  let real = 0;
  if (own) { const st = own.dist.get(own.entry) || 1; for (const n of own.lane) if (g.owner[n] === h.id) real = Math.max(real, 1 - (own.dist.get(n) || 0) / st); }
  return { why: why, hit: hit, depth: way ? deep / way.path.length : 0, took: sc.dt - foe.tiles, lost: before - h.troops, lane: lane, len: len, est: est ? est.reach : -1, estLeft: est ? est.left : -1, estTiles: est ? est.counted : -1, atHit: atHit, real: g.owner[goal] === h.id ? 1 : real };
}
const THRUSTS = [
  { name: 'Stoss: 150K gegen 40K mit 20 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, share: 0.2 },
  { name: 'Stoss: 150K gegen 40K mit 10 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, share: 0.1 },
  { name: 'Stoss: 400K gegen 100K mit 15 %', at: 12000, dt: 4000, aT: 400000, dT: 100000, share: 0.15 },
  // for the reserves: a large defender, a small wedge (not run on its own)
  { name: 'Reserve: 400K gegen 200K mit 6 %', at: 12000, dt: 12000, aT: 400000, dT: 200000, share: 0.06, quiet: true }
];
const MODES = ['ganze Front', 'Abschnitt', 'Keil'];

// A mountain range across the defender's land with one valley through it: a thrust must take the valley.
function valley(map) {
  const sc = THRUSTS[0], A = arena(map, sc, false), g = A.g, h = A.h, foe = A.foe, W = g.W;
  const row = Math.round((h.y0 + h.y1) / 2), goal = deepGoal(g, foe, row);
  let x0 = W, x1 = 0;
  for (let x = 0; x < W; x++) if (g.owner[row * W + x] === foe.id) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const wall = Math.round((x0 + x1) / 2), gapY = row - 14, saved = [];
  for (let y = 0; y < g.H; y++) for (let x = wall - 1; x <= wall + 1; x++) {
    const t = y * W + x;
    if (g.owner[t] !== foe.id || Math.abs(y - gapY) <= 2) continue;
    saved.push([t, map.mag[t]]); map.mag[t] = 28;
  }
  const r = g.thrustRoute(h, foe.id, goal, g.thrustWidth(2));
  for (const [t, m] of saved) map.mag[t] = m;
  let cross = -1;
  if (r) for (const t of r.path) if (Math.abs(t % W - wall) <= 1) { cross = (t / W) | 0; break; }
  return { ok: !!r && Math.abs(cross - gapY) <= 3, cross: cross, gapY: gapY, len: r ? r.path.length : 0 };
}

// ---------- defence ----------
// A pocket: a block of the defender's land inside the attacker's, far from the sea. Its troops
// should be all but gone after half a minute, while those of the main land stay.
function pocket(map) {
  const sc = { at: 12000, dt: 4000, aT: 400000, dT: 100000 }, A = arena(map, sc, false), g = A.g, h = A.h, foe = A.foe, W = g.W;
  // the block: the attacker's tiles in two by two cells in the western quarter of its realm
  const cs = G.POST.cell, mx = Math.round((h.x0 + (h.x1 - h.x0) * 0.25) / cs) * cs, my = Math.round((h.y0 + h.y1) / 2 / cs) * cs;
  for (let y = my; y < my + 2 * cs; y++) for (let x = mx; x < mx + 2 * cs; x++) { const t = y * W + x; if (g.owner[t] === h.id) g.conquer(foe, t); }
  for (let i = 0; i < 10; i++) g.tick();
  // troops that stood there when the pocket closed (fresh ground starts empty, and nothing gets in)
  for (const c of foe.post.cells.values()) if (c.cut) g.postGive(foe, c, 2000);
  const inPocket = () => { let s = 0; for (const c of foe.post.cells.values()) if (c.cut) s += g.postReal(foe, c); return s; };
  const cut = [...foe.post.cells.values()].filter((c) => c.cut).length;
  const p0 = inPocket(), m0 = foe.troops - p0;
  for (let i = 0; i < 300; i++) g.tick();
  const p1 = inPocket();
  return { cut: cut, p0: p0, p1: p1, main0: m0, main1: foe.troops - p1 };
}

// A pocket of the defender inside the attacker's land: how many of its tiles are still the
// defender's after 10, 25 and 35 seconds, with the switch `kessel` on and off.
function kessel(map, on) {
  const sc = { at: 12000, dt: 4000, aT: 400000, dT: 100000 }, A = arena(map, sc, false, { kessel: on }), g = A.g, h = A.h, foe = A.foe, W = g.W;
  const cs = G.POST.cell, mx = Math.round((h.x0 + (h.x1 - h.x0) * 0.25) / cs) * cs, my = Math.round((h.y0 + h.y1) / 2 / cs) * cs, block = [];
  for (let y = my; y < my + 2 * cs; y++) for (let x = mx; x < mx + 2 * cs; x++) { const t = y * W + x; if (g.owner[t] === h.id) { g.conquer(foe, t); block.push(t); } }
  const left = () => block.filter((t) => g.owner[t] === foe.id).length, out = [block.length];
  for (let i = 1; i <= 350; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; if (i === 100 || i === 250 || i === 350) out.push(left()); }
  return out;
}

// ---------- momentum ----------
// The same attack with the switch `schwung` on and off; a second attack from the same stretch
// right after the first; an attack after the troops were massed at its start (the net).
function momentum(map) {
  // against 250K: since 23.11.2026 the attacker's whole realm stands behind a wedge, and against
  // 100K it reached the goal with momentum or without
  const sc = { at: 12000, dt: 4000, aT: 400000, dT: 250000, share: 0.15 }, res = {};
  for (const on of [false, true]) {
    res[on ? 'on' : 'off'] = { front: runThrust(map, sc, 0, false, { schwung: on }), wedge: runThrust(map, sc, 2, false, { schwung: on }) };
  }
  // again at once from the same place: the stretch is tired
  res.again = runThrust(map, sc, 2, false, { schwung: true }, (g, h, foe) => {
    const r = runThrustIn(g, h, foe, 2, sc.share);
    res.first = r;
  });
  // the same minute of waiting without massing, as the yardstick for massing (the defender digs in meanwhile)
  res.waited = runThrust(map, sc, 2, false, { schwung: true }, (g, h) => { for (let i = 0; i < 600; i++) g.tick(); h.troops = sc.aT; });
  // massed: the cells around the start weighed up five times, then given time to march there
  res.massed = runThrust(map, sc, 2, false, { schwung: true }, (g, h, foe) => {
    const W = g.W, row = Math.round((h.y0 + h.y1) / 2), goal = deepGoal(g, foe, row), r = g.thrustRoute(h, foe.id, goal, g.thrustWidth(2));
    if (!r) return;
    const e = r.path[0], ex = e % W, ey = (e / W) | 0, ids = [], vals = [];
    for (const c of h.post.cells.values()) { const cx = c.id % g.CW, cy = (c.id - cx) / g.CW; if (Math.abs(cx * 16 + 8 - ex) <= 40 && Math.abs(cy * 16 + 8 - ey) <= 40) { ids.push(c.id); vals.push(5); } }
    g.exec(h.id, { k: 'mesh', c: ids, v: vals });
    for (let i = 0; i < 600; i++) g.tick();
    h.troops = sc.aT; res.massStart = g.momentumStart(h, [e]);
  });
  return res;
}
// a wedge launched inside a running arena, run to its end (for `again`)
function runThrustIn(g, h, foe, mode, share) {
  const row = Math.round((h.y0 + h.y1) / 2), goal = deepGoal(g, foe, row), t0 = foe.tiles;
  g.exec(h.id, { k: 'strike', t: goal, r: share, w: mode });
  for (let k = 0; k < LIMIT && h.out.some((a) => a.active); k++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; }
  return { took: t0 - foe.tiles };
}

(async () => {
  const map = await loadMap('welt'), only = process.argv[2];
  const sec = (t) => t < 0 ? '   – ' : (t / 10).toFixed(0).padStart(4) + 's';
  const line = (tag, r) => '  ' + tag.padEnd(12) + (r.won ? 'erobert ' : 'steckt  ') + 'Land ' + (r.took * 100).toFixed(0).padStart(3) + ' %  Hälfte ' + sec(r.half) + '  Ende ' + sec(r.end) + '  Verluste ' + K(r.lost).padStart(7) + '  Gegner übrig ' + K(r.foeLeft).padStart(6);
  let bad = 0;
  for (const sc of SCENARIOS) {
    if (only && sc.name.indexOf(only) < 0) continue;
    const c = run(map, sc, true), p = run(map, sc, false);
    console.log(sc.name + '  (' + p.cells + ' Zellen)');
    console.log(line('ein Topf', c));
    console.log(line('Aufstellung', p));
    const fits = sc.want < 0 || ((c.won ? 1 : 0) === sc.want && (p.won ? 1 : 0) === sc.want);
    if (!fits) { bad++; console.log('  FAIL: erwartet war ' + (sc.want ? 'erobert' : 'steckt')); }
    if (sc.maxTook && Math.max(c.took, p.took) > sc.maxTook) { bad++; console.log('  FAIL: nimmt mehr als ' + Math.round(sc.maxTook * 100) + ' % des Landes'); }
    if (sc.want < 0) console.log('  (knapp, nur zur Anzeige)');
    // the posture must not make a fight much slower or dearer than the pool does
    const near = (c.end < 0 || p.end <= c.end * 1.3 + 20) && p.lost <= c.lost * 1.3 + 500;
    if (!near) { bad++; console.log('  FAIL: mit Aufstellung deutlich schlechter als mit einem Topf'); }
  }
  // thrusts: a wedge gets deeper than the whole front with the same troops, a section in between
  for (const sc of THRUSTS) {
    if (sc.quiet || (only && sc.name.indexOf(only) < 0 && only !== 'stoss')) continue;
    console.log(sc.name);
    const rs = [0, 1, 2].map((m) => runThrust(map, sc, m, false));
    rs.forEach((r, m) => console.log('  ' + MODES[m].padEnd(12) + (r.why ? 'abgelehnt: ' + r.why : (r.hit >= 0 ? 'Ziel nach ' + (r.hit / 10).toFixed(0).padStart(3) + 's' : 'Ziel nicht erreicht') +
      '  Weg geschafft ' + (r.depth * 100).toFixed(0).padStart(3) + ' %  Felder ' + String(r.took).padStart(5) + '  Verluste ' + K(r.lost).padStart(7) + (m ? '  Korridor ' + r.lane + ' Felder, Weg ' + r.len + '  Vorschau ' + Math.round(r.est * 100) + ' % / echt ' + Math.round(r.real * 100) + ' %' + (process.env.DBG ? ' | am Ziel übrig ' + K(r.atHit.left) + ' (Vorschau ' + K(r.estLeft) + '), Front Ø ' + Math.round(r.atHit.fs / r.atHit.fn) + ', Ticks ' + r.atHit.fn + ', Felder bis Ziel ' + r.atHit.took + ' (Vorschau ' + r.estTiles + ')' : '') : ''))));
    if (!(rs[2].depth > rs[0].depth + 0.1)) { bad++; console.log('  FAIL: der Keil kommt nicht tiefer als die ganze Front'); }
    // shown only: in this arena the border is hardly wider than a section, and a section's head
    // may move no faster than `G.THRUST.speed` while the whole front has no such limit
    if (!(rs[1].depth >= rs[0].depth)) console.log('  (der Abschnitt kommt hier weniger tief als die ganze Front, nur zur Anzeige)');
  }
  if (!only || only === 'stoss' || only === 'tal') {
    const v = valley(map);
    console.log('Tal: Gebirgszug mit einer Lücke auf Zeile ' + v.gapY + ', der Keil quert auf Zeile ' + v.cross + ' (Weg ' + v.len + ' Felder)');
    if (!v.ok) { bad++; console.log('  FAIL: der Keil nimmt nicht das Tal'); }
  }
  if (!only || only === 'dicht') {
    // The net only moves strength about (23.11.2026): twice the troops get on with the whole front
    // even against a defender who put everything on the border facing them. Dense ground is
    // slower to take, and more of the defender fall there.
    const sc = { at: 3000, dt: 2000, aT: 60000, dT: 30000 };
    const fight = (dense) => {
      const A = arena(map, sc, false, { kampf: 'grenzland' }), g = A.g, h = A.h, foe = A.foe;
      g.postAuto = function () {};
      const front = new Set();
      for (const b of foe.border) for (const q of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[q] === h.id) front.add(g.cellOf(b));
      let H = 0;
      for (const [id, c] of foe.post.cells) { c.m = dense ? (front.has(id) ? 6 : 0.2) : 1; c.u = c.n * c.m; H += c.u; }
      foe.post.H = H;
      h.troops = sc.aT; foe.troops = sc.dT;
      const t0 = foe.tiles;
      let tile = -1;
      for (const b of h.border) { for (const q of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[q] === foe.id) { tile = q; break; } if (tile >= 0) break; }
      const dmax = Math.max(...[...front].map((id) => g.postDens(foe, foe.post.cells.get(id))));
      g.exec(h.id, { k: 'strike', t: tile, r: 1, w: 0 });
      let k = 0;
      for (; k < LIMIT && h.out.some((x) => x.active); k++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; }
      return { took: (t0 - foe.tiles) / t0, left: foe.troops, secs: k / 10, dmax: dmax };
    };
    const ev = fight(false), dn = fight(true);
    console.log('Dichte: 60K gegen 30K, ganze Front mit allem');
    console.log('  gleichmässig     Land ' + (ev.took * 100).toFixed(0).padStart(3) + ' %  in ' + ev.secs.toFixed(0) + ' s  Verteidiger übrig ' + K(ev.left));
    console.log('  alles an Grenze  Land ' + (dn.took * 100).toFixed(0).padStart(3) + ' %  in ' + dn.secs.toFixed(0) + ' s  Verteidiger übrig ' + K(dn.left) + '  (Grenze ' + dn.dmax.toFixed(1) + '× so dicht)');
    // (one click at two to one does not wipe a realm out in OpenFront either)
    if (!(dn.took >= ev.took * 0.75)) { bad++; console.log('  FAIL: mit doppelt so vielen kommt die ganze Front gegen einen dichten Verteidiger kaum voran'); }
    if (!(dn.left <= ev.left * 1.1)) { bad++; console.log('  FAIL: der dichte Verteidiger verliert nicht mehr'); }
    if (!(dn.secs > ev.secs)) { bad++; console.log('  FAIL: dichter Boden bremst nicht'); }
  }
  if (!only || only === 'echt') {
    // As in play (23.11.2026): the defender is a nation that has stood two minutes at its border
    // (its posture set, dug in). Whole front with 50K against 30K, set against OpenFront's formula
    // (no posture). Too dear a fight against an established nation made the game unplayable once.
    const sc = { at: 3000, dt: 2000, aT: 50000, dT: 30000 };
    const fight = (extra, r) => {
      const A = arena(map, sc, false, extra), g = A.g, h = A.h, foe = A.foe;
      for (let i = 0; i < 1200; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; }
      h.troops = sc.aT; foe.troops = sc.dT;
      const t0 = foe.tiles;
      let tile = -1;
      for (const b of h.border) { for (const q of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[q] === foe.id) { tile = q; break; } if (tile >= 0) break; }
      g.exec(h.id, { k: 'strike', t: tile, r: r, w: 0 });
      for (let k = 0; k < LIMIT && h.out.some((x) => x.active); k++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; }
      return { took: t0 - foe.tiles, killed: sc.dT - foe.troops };
    };
    console.log('Echt: 50K gegen eine Nation mit 30K, die seit 2 Minuten steht, ganze Front (von 2000 Feldern)');
    for (const r of [0.5, 1]) {
      const of = fight({ aufstellung: false }, r);
      for (const k of ['grenzland', 'grenzen']) {
        const x = fight({ kampf: k }, r);
        console.log('  ' + (k + ' ' + r * 100 + ' %').padEnd(18) + 'Felder ' + String(x.took).padStart(5) + ' (OpenFront ' + of.took + ')  Verteidiger gefallen ' + K(x.killed) + ' (OpenFront ' + K(of.killed) + ')');
        if (!(x.took >= of.took * 0.45 && x.killed >= of.killed * 0.6)) { bad++; console.log('  FAIL: gegen eine eingesessene Nation viel schwächer als OpenFront'); }
      }
    }
  }
  if (!only || only === 'systeme') {
    // the two combat systems side by side: the same troops as the whole front, a section, a wedge
    const sc = { at: 12000, dt: 4000, aT: 400000, dT: 100000, share: 0.15 };
    const row = (tag, r) => '  ' + tag.padEnd(26) + 'Felder ' + String(r.took).padStart(5) + '  Weg geschafft ' + (r.depth * 100).toFixed(0).padStart(3) + ' %  Verluste ' + K(r.lost).padStart(7);
    console.log('Kampfsysteme: 400K gegen 100K mit 15 %');
    for (const k of ['grenzland', 'grenzen']) {
      const rs = [0, 1, 2].map((m) => runThrust(map, sc, m, false, { kampf: k }));
      rs.forEach((r, m) => console.log(row((k === 'grenzland' ? 'Grenzland' : 'Feste Grenzen') + ', ' + MODES[m], r)));
      // «Grenzland»: momentum stops a wedge, the whole front takes more land. «Feste Grenzen» has no
      // momentum: once through the dense border a wedge widens in the thin land behind (shown only)
      if (!(rs[0].took >= rs[2].took)) { if (k === 'grenzland') bad++; console.log('  ' + (k === 'grenzland' ? 'FAIL' : '(nur zur Anzeige)') + ': ' + k + ': die ganze Front nimmt weniger Land als der Keil'); }
      if (!(rs[2].depth > rs[0].depth)) { bad++; console.log('  FAIL: ' + k + ': der Keil kommt nicht tiefer als die ganze Front'); }
    }
  }
  if (!only || only === 'schwung') {
    const m = momentum(map);
    const row = (tag, r) => '  ' + tag.padEnd(26) + 'Felder ' + String(r.took).padStart(5) + '  Weg geschafft ' + (r.depth * 100).toFixed(0).padStart(3) + ' %  Verluste ' + K(r.lost).padStart(7);
    console.log('Schwung: 400K gegen 250K mit 15 %');
    console.log(row('Front ohne Schwung', m.off.front)); console.log(row('Front mit Schwung', m.on.front));
    console.log(row('Keil ohne Schwung', m.off.wedge)); console.log(row('Keil mit Schwung', m.on.wedge));
    const second = Object.assign({}, m.again, { took: m.again.took - m.first.took });
    console.log(row('Keil gleich nochmals', second) + '  (der erste nahm ' + m.first.took + ')');
    console.log(row('Keil nach 60 s Warten', m.waited));
    console.log(row('Keil nach 60 s Aufmarsch', m.massed) + '  (Start-Schwung ' + (m.massStart * 100).toFixed(0) + ' %)');
    if (!(m.on.wedge.depth < m.off.wedge.depth)) { bad++; console.log('  FAIL: mit Schwung kommt der Keil nicht weniger weit'); }
    if (!(m.on.front.took >= m.on.wedge.took * 1.2)) { bad++; console.log('  FAIL: mit Schwung nimmt die Front nicht mindestens 20 % mehr Land als der Keil'); }
    if (!(second.took < m.first.took * 0.5)) { bad++; console.log('  FAIL: ein zweiter Keil von derselben Stelle ist nicht schwächer'); }
    if (!(m.massStart > 1.2 && m.massed.depth > m.waited.depth)) { bad++; console.log('  FAIL: Aufmarsch gibt nicht mehr Schwung'); }
  }
  if (!only || only === 'abwehr') {
    const k1 = kessel(map, true), k0 = kessel(map, false);
    console.log('Kessel (Schalter): eingeschlossene Felder ' + k1[0] + ', nach 10/25/35 s noch ' + k1.slice(1).join(' / ') + ' mit Kessel, ' + k0.slice(1).join(' / ') + ' ohne');
    if (!(k1[2] > k1[0] * 0.5 && k1[3] === 0 && k0[1] === 0)) { bad++; console.log('  FAIL: der Kessel hält nicht etwa 30 s, oder ohne Schalter fällt er nicht sofort'); }
    const pk = pocket(map);
    console.log('Kessel: ' + pk.cut + ' Zellen abgeschnitten, Truppen darin ' + K(pk.p0) + ' -> ' + K(pk.p1) + ' in 30 s, im Hauptland ' + K(pk.main0) + ' -> ' + K(pk.main1));
    if (!(pk.cut > 0 && pk.p1 < pk.p0 * 0.15 && pk.main1 > pk.main0 * 0.95)) { bad++; console.log('  FAIL: der Kessel fällt nicht oder das Hauptland leidet mit'); }
  }
  console.log(bad ? bad + ' Abweichungen' : 'alle Szenarien wie erwartet');
  if (bad) process.exitCode = 1;
})();
