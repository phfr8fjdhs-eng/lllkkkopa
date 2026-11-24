// «Änderungen» (src/03e_neu.js, doku/neuheiten.md). For every scene: the map builds, every realm
// starts with land, two copies stay identical, the scene never ends, and what it is meant to show
// really happens within the first minute (a ship sails, a boat goes out, trade runs ...).
//   node test/neu.js [nummer]
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '03d_level.js', '03e_neu.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
const count = (g, type, p) => g.units.filter((u) => u.active && u.type === type && (!p || u.owner === p)).length;
// what has to be seen in each scene, asked every second; seen once is enough
const SEEN = {
  115: (g) => g.human.tiles > 0,
  114: (g) => { let d = 0; for (const c of g.human.post.cells.values()) if (c.m > 1) d++; return d > 3; },
  101: (g) => { let d = 0; for (const c of g.human.post.cells.values()) if (c.m > 1) d++; return d > 3; },
  102: (g, s) => s.moved > 20,
  103: (g) => count(g, UT.SAM, g.human) === 1,
  104: (g) => count(g, UT.TRANSPORT) > 0,
  105: (g) => count(g, UT.WARSHIP, g.human) === 2 && count(g, UT.WARSHIP, g.lv.foes[0]) > 0,
  106: (g) => count(g, UT.TRADE, g.human) > 0,
  107: (g) => count(g, UT.TRAIN) > 0 || (g.rails && g.rails.length > 0) || (g.railSegs && g.railSegs.size > 0),
  108: (g, s) => g.human.tiles > s.tiles0 * 1.2,
  109: (g) => g.attacks.some((a) => a.active && a.a === g.human),
  110: (g, s) => g.lv.foes.every((b) => b.tiles > 30),
  111: (g) => count(g, UT.MIRV) + count(g, UT.WARHEAD) > 0 || g.falloutCount > 0,
  112: (g) => count(g, UT.CLOAK, g.human) === 1,
  113: (g) => g.lv.foes.every((b) => b.tiles > 0)
};
const only = +process.argv[2] || 0;
let bad = 0;
const fail = (n, what) => { bad++; console.log('FAILED', n, what); };
for (const L of G.NEUES) {
  if (only && L.n !== only) continue;
  const map = G.levelMap(L);
  const make = () => { const g = new G.Game(map, { seed: 2000 + L.n, level: L.n, bots: 0, nations: false, arsenal: !!L.arsenal, kampf: 'grenzland', pfeile: true }); g.setup({ name: 'Ich', color: [208, 92, 84] }); return g; };
  const g = make(), twin = make();
  if (G.levelDef(L.n) !== L) fail(L.n, 'not found by its number');
  if (!(g.human.tiles > 0)) fail(L.n, 'player starts without land');
  for (const f of g.lv.foes) if (!(f.tiles > 0)) fail(L.n, (f.name || 'bot') + ' starts without land');
  for (const f of L.foes) for (const b of f.build || []) if (!g.lv.foes[L.foes.indexOf(f)].units.some((u) => u.type === b[0])) fail(L.n, 'building ' + G.UNAME[b[0]] + ' of the opponent missing');
  for (const b of L.me.build || []) if (!g.human.units.some((u) => u.type === b[0])) fail(L.n, 'own building ' + G.UNAME[b[0]] + ' missing');
  const st = { tiles0: g.human.tiles, moved: 0, last: new Map() };
  let seen = false, ended = false, drift = false;
  for (let i = 0; i < 900; i++) {
    g.tick(); twin.tick();
    for (const x of [g, twin]) { x.dirtyN = 0; x.dirtyFlag.fill(0); }
    for (const e of g.events) if (e.k === 'quest') ended = true;
    g.events.length = twin.events.length = 0;
    if (i % 10 === 0) {
      for (const u of g.units) if (u.active && u.type === UT.WARSHIP) { const t = st.last.get(u.id); if (t !== undefined && t !== u.tile) st.moved++; st.last.set(u.id, u.tile); }
      if (!seen && g.phase === 'play') { try { seen = !!SEEN[L.n](g, st); } catch (e) { fail(L.n, 'check broke: ' + e.message); seen = true; } }
    }
    if (i % 100 === 0 && g.checksum() !== twin.checksum()) drift = true;
  }
  if (drift || g.checksum() !== twin.checksum()) fail(L.n, 'the two copies drifted apart');
  if (ended) fail(L.n, 'the scene ended');
  if (!seen) fail(L.n, 'what it shows did not happen in 90 s');
  console.log(String(L.n).padEnd(4), L.title.padEnd(38), seen ? 'zeigt es' : '-', '| Land', g.human.tiles, '| Einheiten', g.units.filter((u) => u.active).length);
}
console.log(bad ? bad + ' problems' : 'all scenes fine');
process.exit(bad ? 1 : 0);
