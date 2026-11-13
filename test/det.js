// Two copies of the same game get the same orders. One of them is also asked the questions the
// interface asks all the time (what can I do here, may I build this). Both must stay identical:
// otherwise devices playing together would drift apart.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
const seed = 4242, map = G.buildMap(480, 300, G.randomClassMap(480, 300, seed), seed, { id: 'zufall', name: 'Test', nations: [] });
const make = () => { const g = new G.Game(map, { seed: 99, bots: 40, difficulty: 1, me: 0 }); g.setup([{ name: 'A' }, { name: 'B' }]); return g; };
const a = make(), b = make();
let r = 12345; const rnd = (n) => { r = (Math.imul(r, 1103515245) + 12345) >>> 0; return r % n; };
const both = (id, c) => { const x = a.exec(id, c), y = b.exec(id, c); if (x !== y) throw new Error('order answered differently: ' + JSON.stringify(c) + ' ' + x + ' / ' + y); };
let n = 0;
for (let t = 0; t < map.N && n < 2; t += 53) if (a.canSpawnAt(t) && !map.shore[t]) { both(++n, { k: 'spawn', t: t }); t += 20000; }
let diff = 0, cruise = 0, orders = 0;
for (let i = 0; i < 4000; i++) {
  a.tick(); b.tick();
  a.dirtyN = b.dirtyN = 0; a.dirtyFlag.fill(0); b.dirtyFlag.fill(0); a.events.length = b.events.length = 0;
  // the interface of device B looks around; this must not change anything
  for (let k = 0; k < 3; k++) { const t = rnd(map.N), h = b.players[1 + rnd(2)]; b.actionsAt(h, t); b.buildCheck(h, rnd(6), t); b.readySilo(h, t); b.samsOnPath(h, 1, 1, t % map.W, (t / map.W) | 0); }
  if (i % 7 === 0) {
    const id = 1 + rnd(2), h = a.players[id];
    if (!h.alive) continue;
    h.troops += 40000; b.players[id].troops += 40000;
    if (i > 600) { h.gold += 400000; b.players[id].gold += 400000; }
    const border = Array.from(h.border), t0 = border[rnd(border.length)], W = map.W;
    const t = [t0 - 1, t0 + 1, t0 - W, t0 + W][rnd(4)];
    const kind = i < 400 ? 0 : rnd(10);
    orders++;
    if (kind < 5) both(id, { k: 'strike', t: t, r: 0.6 });
    else if (kind < 8) both(id, { k: 'build', u: [UT.CITY, UT.SILO, UT.SAM, UT.FACTORY, UT.DEFENSE, UT.PORT][rnd(6)], t: t0 });
    else if (kind < 9) both(id, { k: 'up', t: t0 });
    else { const foe = a.players[3 - id]; if (foe.alive && a.immuneUntil <= a.ticks) { const ft = Array.from(foe.border)[0]; both(id, { k: 'build', u: rnd(2) ? UT.CRUISE : UT.ATOM, t: ft }); cruise++; } }
  }
  if (i % 50 === 0 && a.checksum() !== b.checksum()) { diff++; console.log('different at tick', a.ticks); break; }
}
let same = true;
for (let t = 0; t < map.N; t++) if (a.owner[t] !== b.owner[t] || a.fallout[t] !== b.fallout[t]) { same = false; break; }
console.log('orders', orders, 'missiles ordered', cruise, 'tiles A/B', a.players[1].tiles, a.players[2].tiles, 'fallout', a.falloutCount, 'identical map:', same, 'checksum differences:', diff);
process.exit(same && !diff ? 0 : 1);
