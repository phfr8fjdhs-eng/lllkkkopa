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
  { name: 'gleich: 80K gegen 80K, ein Klick 50 %', at: 3000, dt: 3000, aT: 80000, dT: 80000, clicks: [[0.5, 0]], want: 0 },
  { name: 'riesig: 400K gegen 100K, ein Klick 50 %', at: 12000, dt: 4000, aT: 400000, dT: 100000, clicks: [[0.5, 0]], want: 1 }
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
function arena(map, sc, classic) {
  const g = new G.Game(map, { seed: 11, bots: 0, difficulty: 1, spawnTicks: 10 });
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
  const A = arena(map, sc, classic), g = A.g, h = A.h, foe = A.foe;
  const tiles0 = foe.tiles, t0 = g.ticks;
  let sent = 0, half = -1, end = -1, next = 0;
  for (let k = 0; k < LIMIT; k++) {
    while (next < sc.clicks.length && sc.clicks[next][1] <= k) {
      // the click lands on the defender's tile nearest to the attacker's first tile
      let tile = -1;
      for (const b of h.border) { for (const n of [b - 1, b + 1, b - g.W, b + g.W]) if (g.owner[n] === foe.id) { tile = n; break; } if (tile >= 0) break; }
      const before = h.troops;
      if (tile >= 0) g.exec(h.id, { k: 'strike', t: tile, r: sc.clicks[next][0], w: sc.clicks[next][2] || 0 });
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
function runThrust(map, sc, mode, classic) {
  const A = arena(map, sc, classic), g = A.g, h = A.h, foe = A.foe, W = g.W;
  const row = Math.round((h.y0 + h.y1) / 2), goal = deepGoal(g, foe, row);
  let x0 = W, x1 = 0;
  for (let x = 0; x < W; x++) if (g.owner[row * W + x] === foe.id) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
  const way = g.thrustRoute(h, foe.id, goal, g.thrustWidth(2));     // the same way for every mode, to measure progress on
  const before = h.troops, why = g.exec(h.id, { k: 'strike', t: goal, r: sc.share, w: mode });
  const at = h.out.find((a) => a.active);
  const lane = at && at.lane ? at.lane.size : 0, len = at && at.path ? at.path.length : 0;
  let hit = -1, t0 = g.ticks;
  for (let k = 0; k < LIMIT; k++) {
    g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0;
    if (hit < 0 && g.owner[goal] === h.id) hit = g.ticks - t0;
    if (!h.out.some((a) => a.active)) break;
  }
  let deep = 0;
  if (way) for (let i = 0; i < way.path.length; i++) if (g.owner[way.path[i]] === h.id) deep = i + 1;
  return { why: why, hit: hit, depth: way ? deep / way.path.length : 0, took: sc.dt - foe.tiles, lost: before - h.troops, lane: lane, len: len };
}
const THRUSTS = [
  { name: 'Stoss: 150K gegen 40K mit 20 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, share: 0.2 },
  { name: 'Stoss: 150K gegen 40K mit 10 %', at: 3000, dt: 1200, aT: 150000, dT: 40000, share: 0.1 },
  { name: 'Stoss: 400K gegen 100K mit 15 %', at: 12000, dt: 4000, aT: 400000, dT: 100000, share: 0.15 }
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
    const fits = (c.won ? 1 : 0) === sc.want && (p.won ? 1 : 0) === sc.want;
    if (!fits) { bad++; console.log('  FAIL: erwartet war ' + (sc.want ? 'erobert' : 'steckt')); }
    // the posture must not make a fight much slower or dearer than the pool does
    const near = (c.end < 0 || p.end <= c.end * 1.3 + 20) && p.lost <= c.lost * 1.3 + 500;
    if (!near) { bad++; console.log('  FAIL: mit Aufstellung deutlich schlechter als mit einem Topf'); }
  }
  // thrusts: a wedge gets deeper than the whole front with the same troops, a section in between
  for (const sc of THRUSTS) {
    if (only && sc.name.indexOf(only) < 0 && only !== 'stoss') continue;
    console.log(sc.name);
    const rs = [0, 1, 2].map((m) => runThrust(map, sc, m, false));
    rs.forEach((r, m) => console.log('  ' + MODES[m].padEnd(12) + (r.why ? 'abgelehnt: ' + r.why : (r.hit >= 0 ? 'Ziel nach ' + (r.hit / 10).toFixed(0).padStart(3) + 's' : 'Ziel nicht erreicht') +
      '  Weg geschafft ' + (r.depth * 100).toFixed(0).padStart(3) + ' %  Felder ' + String(r.took).padStart(5) + '  Verluste ' + K(r.lost).padStart(7) + (m ? '  Korridor ' + r.lane + ' Felder, Weg ' + r.len : ''))));
    if (!(rs[2].depth > rs[0].depth + 0.1)) { bad++; console.log('  FAIL: der Keil kommt nicht tiefer als die ganze Front'); }
    if (!(rs[1].depth >= rs[0].depth)) { bad++; console.log('  FAIL: der Abschnitt kommt weniger tief als die ganze Front'); }
  }
  if (!only || only === 'stoss' || only === 'tal') {
    const v = valley(map);
    console.log('Tal: Gebirgszug mit einer Lücke auf Zeile ' + v.gapY + ', der Keil quert auf Zeile ' + v.cross + ' (Weg ' + v.len + ' Felder)');
    if (!v.ok) { bad++; console.log('  FAIL: der Keil nimmt nicht das Tal'); }
  }
  console.log(bad ? bad + ' Abweichungen' : 'alle Szenarien wie erwartet');
  if (bad) process.exitCode = 1;
})();
