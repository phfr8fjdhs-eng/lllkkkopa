// «Änderungen» (src/03e_neu.js, doku/neuheiten.md). For every scene: the map builds, every realm
// starts with land, two copies stay identical, the scene never ends, and what it is meant to show
// really happens within the first minute (a ship sails, a boat goes out, trade runs ...).
//   node test/neu.js [nummer]
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '03d_level.js', '03e_neu.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
const count = (g, type, p) => g.units.filter((u) => u.active && u.type === type && (!p || u.owner === p)).length;
// what has to be seen in each scene, asked every second; seen once is enough
const SEEN = {
  138: (g, s) => {
    // the missile defence fires (at the bombers, nothing else flies), the small air defence never does
    for (const u of g.lv.foes[0].units) if (u.type === UT.SAM && u.ready && u.ready.some((r) => r > g.ticks)) { if (u.cls === 1) s.abm = true; else s.small = true; }
    return !!s.abm && !s.small && g.ticks > 400;
  },
  137: (g, s) => {
    // the ships at war (left) hit each other, the ones at peace (right) stay whole
    const me = g.human, war = g.lv.foes[0], calm = g.lv.foes[1];
    for (const u of g.units) if (u.active && u.type === UT.WARSHIP && u.hp < g.shipFull(u)) { if (u.owner === war || (u.owner === me && u.x < 150)) s.war = true; else if (u.owner === me) s.calm = true; }
    return !!s.war && !s.calm && g.atWar(me, war) && !g.atWar(me, calm) && g.ticks > 300;
  },
  136: (g) => g.human.units.some((u) => u.type === UT.SILO && u.base) && g.allyRadar(g.human, g.lv.foes[0]) && g.allyAge(g.human, g.lv.foes[0]) < G.LANG.allyRadar + 900,
  135: (g, s) => (s.sub = s.sub || g.units.some((u) => u.active && u.type === UT.WARSHIP && u.cls === 2 && u.shown > g.ticks && g.nukes.some((n) => n.active && n.type === UT.CRUISE && n.owner === g.human))),
  134: (g) => g.human.units.some((u) => u.arm && u.arm.fab),
  133: (g, s) => (s.sub = s.sub || g.units.some((u) => u.active && u.type === UT.WARSHIP && u.cls === 2 && u.shown > g.ticks)) && (s.air = s.air || g.units.some((u) => u.active && u.type === UT.BOMBER)) && g.human.cnt[UT.MINE] < 7 && g.units.some((u) => u.active && u.type === UT.WARSHIP && u.cls === 3),
  132: (g) => g.units.some((u) => u.active && u.type === UT.STEALTH) && g.ticks > 300,
  131: (g) => (g.human.recon || []).length > 0 && g.units.some((u) => u.active && (u.type === UT.FIGHTER || u.type === UT.BOMBER)),
  130: (g) => g.human.units.filter((u) => u.uni && u.res && u.res.pts > 0).length === 2,
  129: (g) => g.human.units.some((u) => u.type === UT.SILO && u.base) && g.spying(g.human, g.lv.foes[1]) && g.allyRadar(g.human, g.lv.foes[0]),
  128: (g) => g.human.units.some((u) => u.type === UT.SAM && u.cls === 2) && g.lv.foes[0].units.some((u) => u.type === UT.SILO && u.firedAt > 0),
  127: (g) => { const f = g.lv.foes[0], c = f.units.find((u) => u.type === UT.CITY); return g.ticks > 400 && (!c || c.level < 12) && (f.cruiseT || g.human.cruiseT || []).length >= 0 && !!g.human.cruiseT; },
  126: (g) => g.lv.foes[0].units.some((u) => u.type === UT.SILO && u.arm) || g.outlawed(g.lv.foes[0]),
  125: (g) => g.human.units.some((u) => u.type === UT.CITY && u.evac !== undefined) && g.human.units.some((u) => u.type === UT.CITY && u.level < 10),
  124: (g) => g.human.units.some((u) => u.type === UT.SAM && u.cls === 1 && u.ready.some((r) => r > g.ticks)) && g.human.units.some((u) => u.type === UT.SAM && !u.cls && u.ready.some((r) => r > g.ticks)),
  123: (g) => (g.human.wearLost || 0) > 0 && g.ticks > 300,
  122: (g) => { const m = g.human.mass; return !!m && Object.keys(m).some((k) => m[k].quiet > 0); },
  121: (g) => g.lang && g.nukes.some((n) => n.active && n.type === UT.CRUISE && n.speed < 3.9) && g.units.some((u) => u.active && u.type === UT.TRADE),
  116: (g) => g.human.tiles > 0,
  120: (g) => { const u = g.human.units.find((x) => x.type === UT.SILO); return !!u && u.ready.length === 3 && u.ready.some((r) => r > g.ticks); },
  119: (g) => [30, 10, 5, 3].every((l) => g.human.units.some((u) => u.type === UT.CITY && u.level === l)),
  118: (g) => { const u = g.human.units.find((x) => x.type === UT.SILO); return !!u && u.ready.length === 2 && u.ready.some((r) => r > g.ticks); },
  117: (g) => count(g, UT.SAM, g.human) === 3 && count(g, UT.FACTORY, g.human) === 1 && count(g, UT.PORT, g.human) === 2,
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
  const make = () => { const g = new G.Game(map, { seed: 2000 + L.n, level: L.n, bots: 0, nations: false, arsenal: !!L.arsenal, lang: !!L.lang, kampf: 'grenzland', pfeile: true }); g.setup({ name: 'Ich', color: [208, 92, 84] }); return g; };
  const g = make(), twin = make();
  if (G.levelDef(L.n) !== L) fail(L.n, 'not found by its number');
  if (!(g.human.tiles > 0)) fail(L.n, 'player starts without land');
  for (const f of g.lv.foes) if (!(f.tiles > 0)) fail(L.n, (f.name || 'bot') + ' starts without land');
  for (const f of L.foes) for (const b of f.build || []) if (!g.lv.foes[L.foes.indexOf(f)].units.some((u) => u.type === (b[0] === 4.5 || b[0] === 4.7 ? UT.SAM : b[0] === 3.5 ? UT.SILO : b[0]))) fail(L.n, 'building ' + G.UNAME[b[0]] + ' of the opponent missing');
  for (const b of L.me.build || []) if (!g.human.units.some((u) => u.type === (b[0] === 4.5 || b[0] === 4.7 ? UT.SAM : b[0] === 3.5 ? UT.SILO : b[0]))) fail(L.n, 'own building ' + G.UNAME[b[0]] + ' missing');
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
