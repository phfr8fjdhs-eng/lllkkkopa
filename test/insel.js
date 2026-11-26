// A realm with land next to ours and an island of its own: a tap on the mainland attacks by land,
// a tap on the island sends a boat, also while the land attack is running.   node test/insel.js
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require('./load.js');
let bad = 0;
const must = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) bad++; };
(async () => {
  const map = await loadMap(G, 'welt');
  const g = new G.Game(map, { seed: 5, bots: 0, difficulty: 1, spawnTicks: 10 });
  g.setup({ name: 'Ich', color: [220, 60, 50] });
  const h = g.human, W = g.W, body = g.landBody();
  // the largest piece of land, and an island of a few hundred tiles
  const size = new Map();
  for (let t = 0; t < g.N; t++) if (body[t]) size.set(body[t], (size.get(body[t]) || 0) + 1);
  const bySize = [...size.entries()].sort((a, b) => b[1] - a[1]);
  const main = bySize[0][0], isle = (bySize.find((e) => e[1] >= 60 && e[1] <= 3000) || [])[0];
  must(isle !== undefined, 'map has an island');
  let spot = -1;
  for (let t = 0; t < g.N && spot < 0; t++) if (body[t] === main && g.canSpawnAt(t) && map.shore[t] === 0) spot = t;
  g.spawn(h, spot);
  while (g.phase !== 'play') g.tick();
  for (const p of g.players) if (p) p.ai = null;
  g.immuneUntil = 0;
  const foe = g.players.find((p) => p && p !== h && p.alive && p.type === G.PT.NATION);
  // the foe gets a strip of the mainland right next to us, and the whole island
  for (const b of [...h.border]) for (const n of [b - 1, b + 1, b - W, b + W]) if (body[n] === main && g.owner[n] === 0) g.conquer(foe, n);
  for (let t = 0; t < g.N; t++) if (body[t] === isle && g.owner[t] === 0) g.conquer(foe, t);
  let onMain = -1, onIsle = -1;
  for (let t = 0; t < g.N; t++) if (g.owner[t] === foe.id) { if (body[t] === main && onMain < 0) onMain = t; if (body[t] === isle && onIsle < 0) onIsle = t; }
  h.troops = 50000;
  const a1 = g.actionsAt(h, onMain), a2 = g.actionsAt(h, onIsle);
  must(a1.canAttack, 'mainland of the foe: attack by land');
  must(!a2.canAttack && !!a2.boat, 'island of the foe: boat (' + (a2.why || 'ok') + ')');
  must(g.exec(h.id, { k: 'strike', t: onMain, r: 0.3 }) === '' && h.out.some((a) => a.active && a.tid === foe.id), 'land attack runs');
  const boats = h.boats;
  must(g.exec(h.id, { k: 'strike', t: onIsle, r: 0.3 }) === '' && h.boats === boats + 1, 'a tap on the island during the land attack sends a boat');
  console.log(bad ? bad + ' Fehler' : 'alles gut');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
