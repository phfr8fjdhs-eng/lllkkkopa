// A test player: a computer that plays the way a person does, in a whole game on the world map
// against nations and bots. It measures what a person feels: how far it gets, how much of what it
// sends against nations is thrown away, how long the round takes.
//
//   node test/spieler.js [grenzland|grenzen] [minutes] [seed]
//
// The player, every two seconds:
//   - hits back at a nation attacking it once it has more troops than that nation's army left,
//   - grows first: free land next to it (40 % of its troops), bots next to it it outnumbers (35 %),
//   - only once nothing of that is left, a nation next door it is stronger than, once it has 60 %
//     of its limit: sends enough to matter (at least 80 % of that nation's army, at most 70 % of
//     its own), every other time as a wedge on the nation's nearest city, else the whole front,
//   - builds cities, a port at the coast, a factory beside its cities, and upgrades them.
// Measured: land and rank every 10 minutes; for attacks on nations, tiles taken per 10K lost and
// how many were wasted (less than 20 tiles per 10K); the leader at the end.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT, PT = G.PT;
const sharp = require('/opt/npm-tools/node_modules/sharp');
const kampf = process.argv[2] || 'grenzland', minutes = +(process.argv[3] || 40), seed = +(process.argv[4] || 3);

async function loadMap(id) {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === id);
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * raw.info.channels] / 85);
  return G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations, lat: m.lat, lon: m.lon });
}

(async () => {
  const map = await loadMap('welt');
  const g = new G.Game(map, { seed: seed, bots: 150, difficulty: 1, spawnTicks: 50, kampf: kampf, pfeile: false });
  g.setup({ name: 'Testspieler', color: [208, 92, 84] });
  const h = g.human, W = g.W, rng = new G.RNG(seed * 7 + 1);
  // a start in the middle of a continent, not on an island: the free land tile with most land around
  let start = -1;
  for (let k = 0; k < 4000 && start < 0; k++) { const t = rng.int(0, g.N); if (g.canSpawnAt(t) && !map.shore[t] && map.coldOf(t) < 1.2) start = t; }
  g.exec(h.id, { k: 'spawn', t: start });
  // every attack the player sends against a nation, measured when it ends
  const fights = [];
  const end = g.endAttack.bind(g);
  g.endAttack = function (at, refund) {
    if (at.active && at.a === h && at.tid && g.players[at.tid].type !== PT.BOT) fights.push({ taken: at.taken || 0, lost: Math.max(0, (at.sum || 0) - (refund ? at.troops : 0)), narrow: at.goal >= 0 });
    return end(at, refund);
  };
  const step = () => { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; };
  const near = (q) => { for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < g.N && map.land[n] && g.owner[n] === q) return n; return -1; };   // land only: water has no owner either
  let turn = 0;
  const think = () => {
    if (!h.alive || g.phase !== 'play') return;
    const max = g.maxTroops(h), nb = g.neighbors(h);
    // struck: hit back at the attacker while its army is spent on the attack (a person would)
    for (const at of h.inc) {
      if (!at.active || at.a.type === PT.BOT || g.friendly(h, at.a) || h.out.some((a) => a.active && a.tid === at.a.id)) continue;
      if (h.troops > at.a.troops * 0.8) { const t = near(at.a.id); if (t >= 0) { g.exec(h.id, { k: 'strike', t: t, r: 0.5 }); break; } }
    }
    // first grow: free land and bots, with more troops the more there is to take
    const bots = [...nb.ids].map((id) => g.players[id]).filter((q) => q.type === PT.BOT);
    const free = near(0);
    if (free >= 0 && h.troops / max > 0.2 && !h.out.some((a) => a.active && !a.tid)) g.exec(h.id, { k: 'strike', t: free, r: 0.4 });
    for (const q of bots) {
      if (!h.out.some((a) => a.active && a.tid === q.id) && h.troops > q.troops * 2 && h.troops / max > 0.25) { g.exec(h.id, { k: 'strike', t: near(q.id), r: 0.35 }); break; }
    }
    // a nation next door only when stronger than it, with enough to matter (at least 80 % of
    // its army, at most 70 % of its own), every other time as a wedge on its nearest city
    if (h.troops / max >= 0.6 && g.ticks >= g.immuneUntil && free < 0 && !bots.length) {
      let foe = null;
      for (const id of nb.ids) { const q = g.players[id]; if (q.type !== PT.BOT && !g.friendly(h, q) && (!foe || q.troops < foe.troops)) foe = q; }
      if (foe && !h.out.some((a) => a.active && a.tid === foe.id) && h.troops > foe.troops * 1.2) {
        const r = Math.min(0.7, Math.max(0.3, foe.troops * 0.8 / Math.max(1, h.troops)));
        turn++;
        const city = foe.units.find((u) => u.type === UT.CITY && u.built);
        if (turn % 2 === 0 && city) g.exec(h.id, { k: 'strike', t: city.tile, r: r, w: 2 });
        else g.exec(h.id, { k: 'strike', t: near(foe.id), r: r, w: 0 });
      }
    }
    // building
    const inner = () => { for (let k = 0; k < 40; k++) { const t = rng.int(h.y0, h.y1 + 1) * W + rng.int(h.x0, h.x1 + 1); if (g.owner[t] === h.id && !h.border.has(t)) return t; } return -1; };
    if (h.gold > g.cost(h, UT.CITY) * 1.2) { const t = inner(); if (t >= 0) g.exec(h.id, { k: 'build', u: UT.CITY, t: t }); }
    if (h.cnt[UT.CITY] >= 2 && h.cnt[UT.FACTORY] < h.cnt[UT.CITY] / 2 && h.gold > g.cost(h, UT.FACTORY) * 1.2) { const t = inner(); if (t >= 0) g.exec(h.id, { k: 'build', u: UT.FACTORY, t: t }); }
    if (h.cnt[UT.PORT] < 1 && h.gold > g.cost(h, UT.PORT)) { for (const b of h.border) if (map.shore[b]) { g.exec(h.id, { k: 'build', u: UT.PORT, t: b }); break; } }
    if (h.gold > 3e6) { const u = h.units.find((v) => v.built && (v.type === UT.CITY || v.type === UT.PORT) && v.level < 20); if (u) g.exec(h.id, { k: 'up', t: u.tile, n: 1 }); }
  };
  const rows = [];
  for (let i = 1; i <= minutes * 600; i++) {
    step();
    if (i % 20 === 0) think();
    if (i % 6000 === 0 || i === minutes * 600) {
      const alive = g.players.filter((p) => p && p.alive && p.type !== PT.BOT).sort((a, b) => b.tiles - a.tiles);
      const rank = alive.indexOf(h) + 1, den = map.landTiles;
      rows.push((i / 600).toFixed(0).padStart(3) + ' min: Testspieler ' + (h.alive ? (h.tiles / den * 100).toFixed(1) + ' % (Platz ' + rank + ' von ' + alive.length + ')' : 'ausgeschieden') + ', Spitze ' + alive[0].name + ' ' + (alive[0].tiles / den * 100).toFixed(1) + ' %');
    }
    if (g.winner) { rows.push('Sieger ' + g.winner.name + ' nach ' + (i / 600).toFixed(1) + ' min'); break; }
  }
  const n = fights.length, lost = fights.reduce((s, f) => s + f.lost, 0), taken = fights.reduce((s, f) => s + f.taken, 0);
  const wasted = fights.filter((f) => f.lost >= 2000 && f.taken / (f.lost / 10000) < 20).length;
  console.log('Kampfsystem ' + kampf + ', Startwert ' + seed);
  rows.forEach((r) => console.log(r));
  console.log('Angriffe auf Nationen: ' + n + ', zusammen ' + taken + ' Felder für ' + (lost / 1000).toFixed(0) + 'K Verluste (' + (lost ? (taken / (lost / 10000)).toFixed(0) : '-') + ' Felder pro 10K), verpufft ' + wasted + ' (unter 20 Felder pro 10K)');
})();
