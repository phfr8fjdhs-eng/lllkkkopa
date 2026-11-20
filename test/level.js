// The campaign «Feldzug» (src/03d_level.js, doku/feldzug.md). For every level: the map builds, every
// realm starts with land, the quest can be asked at any time, two copies of the level stay identical
// (same orders, same numbers on every device), and a simple scripted player wins it.
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '03d_level.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
// how the scripted player plays each level: what a person is meant to learn there
function nearestBorderTo(g, p, goal) { let best = -1, bd = 1e18; const W = g.W; for (const b of p.border) { const d = (b % W - goal % W) ** 2 + (((b / W) | 0) - ((goal / W) | 0)) ** 2; if (d < bd) { bd = d; best = b; } } return best; }
function freeNext(g, p) { const W = g.W; for (const b of p.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < g.N && g.map.land[n] && g.owner[n] === 0) return n; return -1; }
function enemyNext(g, p, id) { const W = g.W; for (const b of p.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < g.N && g.owner[n] === id) return n; return -1; }
const S = {
  1: (g, Q, me, s) => { if (s % 30 === 0) { const t = freeNext(g, me); if (t >= 0) g.exec(1, { k: 'strike', t, r: 0.3 }); } },
  2: (g, Q, me, s) => { if (s % 30 === 0) { const bots = g.players.filter(p => p && p.type === 2 && p.alive).sort((a,b)=>a.tiles-b.tiles); let done=false; for (const b of bots) { const t = enemyNext(g, me, b.id); if (t >= 0) { g.exec(1, { k: 'strike', t, r: 0.35 }); done=true; break; } } if (!done) { const t = freeNext(g, me); if (t >= 0) g.exec(1, { k: 'strike', t, r: 0.3 }); } } },
  3: (g, Q, me, s) => {
    if (s % 20 === 0) { const c = Q.built(me, UT.CITY);
      const tile = g.levelTile(60 + 20 * (me.units.length % 3), 90 + 15 * me.units.length, me);
      if (me.units.filter(u=>u.type===UT.CITY).length < 2) g.exec(1, { k: 'build', u: UT.CITY, t: tile });
      else if (!me.units.some(u=>u.type===UT.FACTORY)) g.exec(1, { k: 'build', u: UT.FACTORY, t: g.levelTile(80, 120, me) });
      else { const u = me.units.find(u=>u.type===UT.CITY && u.built); if (u) g.exec(1, { k: 'up', t: u.tile, n: 1 }); } }
    if (s % 30 === 0) S[2](g, Q, me, 0); },
  4: (g, Q, me, s) => { if (s % 40 === 0) { if (false) g.exec(1, { k: 'strike', t: enemyNext(g, me, 2), r: 0.5 }); else g.exec(1, { k: 'strike', t: Q.tile(312, 90), r: 0.5, w: 2 }); } },
  5: (g, Q, me, s) => { if (true && s % 30 === 0 && g.ticks > 150) { const t = enemyNext(g, me, 2); const W=g.W; let best=-1,bx=1e9; for (const b of me.border) for (const n of [b-1,b+1,b-W,b+W]) if (g.owner[n]===2 && n%W < bx) { bx=n%W; best=n; } if (best>=0 && bx < 150) g.exec(1, { k: 'strike', t: best, r: 0.25 }); } if (true && s === 20) { for (const y of [100, 84, 116]) g.exec(1, { k: 'build', u: UT.DEFENSE, t: g.levelTile(150, y, me) }); } if (true && s % 20 === 0 && me.gold > 50000) { for (const y of [100, 84, 116]) g.exec(1, { k: 'build', u: UT.DEFENSE, t: g.levelTile(150, y, me) }); } },
  6: (g, Q, me, s) => { if (s % 40 === 0) { const t = g.levelTile(225 + (s % 7) * 4, 100 - (s % 5) * 6); if (g.owner[t] !== me.id) g.exec(1, { k: 'strike', t, r: 0.35 }); } },
  7: (g, Q, me, s) => { if (s % 20 === 0) { if (Q.ships(me) < 2) g.exec(1, { k: 'build', u: UT.WARSHIP, t: Q.tile(80, 110) }); const f = Q.foe[0].units.find(u=>u.type===UT.WARSHIP&&u.active); if (f && Q.ships(me) >= 2) g.exec(1, { k: 'ship', t: f.tile }); } },
  8: (g, Q, me, s) => { if (s % 20 === 0) { if (!me.units.some(u=>u.type===UT.SILO)) g.exec(1, { k: 'build', u: UT.SILO, t: g.levelTile(40, 100, me) }); else if (Q.built(me, UT.SILO)) g.exec(1, { k: 'build', u: UT.ATOM, t: Q.tile(255, 100) }); } },
  9: (g, Q, me, s) => { if (true && s % 20 === 0) { if (!me.units.some(u=>u.type===UT.SAM)) g.exec(1, { k: 'build', u: UT.SAM, t: g.levelTile(70, 100, me) }); else if (me.gold > 3e6) g.exec(1, {k:'build',u:UT.SAM,t:g.levelTile(70,85,me)}); } },
  10: (g, Q, me, s) => { if (true) { if (s % 10 === 0) { const silo = me.units.find(u=>u.type===UT.SILO); const free = silo.ready.filter(r=>r<=g.ticks).length; const fs = Q.foe[0].units.filter(u => u.active && (u.type === UT.SAM || u.type === UT.SILO)).sort((a, b) => a.x - b.x); if (fs.length && free >= 2) { g.exec(1, { k: 'build', u: UT.CRUISE, t: fs[0].tile }); g.exec(1, { k: 'build', u: UT.CRUISE, t: fs[0].tile }); } } return; } if (s % 10 === 0) { const fs = Q.foe[0].units.filter(u => u.active && (u.type === UT.SAM || u.type === UT.SILO)).sort((a, b) => a.x - b.x); if (fs.length) { const r = g.exec(1, { k: 'build', u: false?UT.ATOM:UT.CRUISE, t: fs[0].tile }); } } }
};
let bad = 0;
const fail = (n, what) => { bad++; console.log('FAILED level', n, what); };
for (const L of G.LEVELS) {
  const map = G.levelMap(L);
  const make = () => { const g = new G.Game(map, { seed: 1000 + L.n, level: L.n, difficulty: L.diff === undefined ? 1 : L.diff }); g.setup({ name: 'Ich', color: [208, 92, 84] }); return g; };
  const g = make(), twin = make();
  if (L.me.x !== undefined && !(g.human.tiles > 0)) fail(L.n, 'player starts without land');
  for (const f of g.lv.foes) if (!(f.tiles > 0)) fail(L.n, f.name + ' starts without land');
  for (const f of L.foes) for (const b of f.build || []) if (!g.lv.foes[L.foes.indexOf(f)].units.some((u) => u.type === b[0])) fail(L.n, 'building ' + G.UNAME[b[0]] + ' missing');
  if (L.me.x === undefined) { const t = g.levelTile(map.W / 2, map.H / 2); g.exec(1, { k: 'spawn', t }); twin.exec(1, { k: 'spawn', t }); }
  const me = g.human;
  // the twin gets exactly the orders the scripted player gives
  const exec = g.exec.bind(g); g.exec = (id, c) => { const a = exec(id, c), b = twin.exec(id, c); if (a !== b) fail(L.n, 'order answered differently ' + JSON.stringify(c)); return a; };
  let res = null, drift = false;
  for (let i = 0; i < 3000 && !res; i++) {
    g.tick(); twin.tick();
    for (const x of [g, twin]) { x.dirtyN = 0; x.dirtyFlag.fill(0); }
    if (g.phase === 'play') S[L.n](g, g.lv.Q, me, i);
    for (const e of g.events) if (e.k === 'quest') res = e;
    g.events.length = twin.events.length = 0;
    if (i % 50 === 0 && g.checksum() !== twin.checksum()) drift = true;
  }
  if (drift || g.checksum() !== twin.checksum()) fail(L.n, 'the two copies drifted apart');
  if (!res || !res.win) fail(L.n, 'not won: ' + (res ? res.why : 'no end after 300 s') + ' (' + (g.lv.check && g.lv.check.line) + ')');
  console.log('level', L.n, L.name.padEnd(13), res ? (res.win ? 'won in ' + res.secs.toFixed(0) + ' s, ' + res.stars + ' stars' : 'lost: ' + res.why) : 'unfinished', '| tiles', map.landTiles);
}
console.log(bad ? bad + ' problems' : 'all levels fine');
process.exit(bad ? 1 : 0);
