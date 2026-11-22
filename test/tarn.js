// Cloaking tower (Arsenal mode): what it hides, from whom, and when it shows again.
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
let fails = 0;
const ok = (c, msg) => { console.log((c ? 'ok   ' : 'FAIL ') + msg); if (!c) fails++; };
const seed = 4242, map = G.buildMap(480, 300, G.randomClassMap(480, 300, seed), seed, { id: 'zufall', name: 'Test', nations: [] });

// two people far apart, everything built at once
function make(arsenal) {
  const g = new G.Game(map, { seed: 5, bots: 0, nations: 0, difficulty: 1, me: 0, arsenal: arsenal, instantBuild: true });
  g.setup([{ name: 'A' }, { name: 'B' }]);
  const W = map.W, spots = [];
  for (let t = 0; t < map.N && spots.length < 2; t += 37) {
    if (!g.canSpawnAt(t) || map.shore[t]) continue;
    if (spots.length && Math.hypot(t % W - spots[0] % W, ((t / W) | 0) - ((spots[0] / W) | 0)) < 200) continue;
    spots.push(t);
  }
  g.spawn(g.players[1], spots[0]); g.spawn(g.players[2], spots[1]);
  g.spawnEnd = g.ticks + 1; g.immuneUntil = 0;
  for (let i = 0; i < 5; i++) g.tick();
  // grow A's land so there is room to build
  const A = g.players[1];
  for (let i = 0; i < 400; i++) { for (const b of Array.from(A.border)) for (const n of [b - 1, b + 1, b - W, b + W]) if (map.land[n] && !g.owner[n] && Math.hypot(n % W - A.x0 / 2 - A.x1 / 2, ((n / W) | 0) - A.y0 / 2 - A.y1 / 2) < 60) g.conquer(A, n); if (A.tiles > 6000) break; }
  for (const p of g.players) if (p) p.gold = 1e9;
  return g;
}
// an own inland tile at distance d (±2) from (x, y), free for a building
function spot(g, p, x, y, d) {
  const W = g.W;
  for (let a = 0; a < 6.28; a += 0.05) {
    for (let k = d - 2; k <= d + 2; k++) {
      const t = Math.round(y + Math.sin(a) * k) * W + Math.round(x + Math.cos(a) * k);
      if (g.owner[t] === p.id && !p.border.has(t) && !g.structNear(t, g.R.structDist)) return t;
    }
  }
  return -1;
}

{
  const g = make(false), A = g.players[1];
  const t = spot(g, A, (A.x0 + A.x1) >> 1, (A.y0 + A.y1) >> 1, 0) >= 0 ? spot(g, A, (A.x0 + A.x1) >> 1, (A.y0 + A.y1) >> 1, 0) : Array.from(A.border)[0];
  ok(!g.build(A, UT.CLOAK, t) && g.buildCheck(A, UT.CLOAK, t).why === 'Nur im Arsenal-Modus', 'klassisch: Tarnturm nicht baubar');
}
{
  const g = make(true), A = g.players[1], B = g.players[2], R = g.R;
  const cx = (A.x0 + A.x1) >> 1, cy = (A.y0 + A.y1) >> 1;
  const tower = g.build(A, UT.CLOAK, spot(g, A, cx, cy, 0));
  ok(!!tower && tower.built, 'Tarnturm gebaut, kostet ' + G.fmt(g.cost(A, UT.CLOAK, 0)) + ', Reichweite ' + R.cloak + ' Felder, Abstand zwischen Gebäuden ' + R.structDist);
  const near = g.build(A, UT.SAM, spot(g, A, tower.x, tower.y, Math.round(R.structDist * 1.3)));
  const far = g.build(A, UT.SILO, spot(g, A, tower.x, tower.y, R.cloak + 12));
  ok(!!near && !!far, 'Flugabwehr nahe und Silo weiter weg gebaut');
  ok(g.hiddenFrom(tower, B) && g.hiddenFrom(near, B), 'Turm und Flugabwehr daneben sind für B versteckt');
  ok(!g.hiddenFrom(far, B), 'Silo ausserhalb der Reichweite bleibt sichtbar');
  ok(!g.hiddenFrom(near, A), 'der Besitzer sieht sein Gebäude');
  ok(g.seenCount(B, A, UT.SAM) === 0 && g.seenCount(A, A, UT.SAM) === 1, 'Zählung: B sieht keine Flugabwehr, A seine eine');
  ok(g.samsOnPath(B, far.x, far.y + 200, near.x, near.y, UT.ATOM).indexOf(near) < 0, 'Zielvorschau von B zeigt die versteckte Flugabwehr nicht');
  // how many buildings one tower can cover at most (packed as tight as allowed)
  let n = 0;
  for (let i = 0; i < 12; i++) { const t = spot(g, A, tower.x, tower.y, Math.round(R.structDist + (R.cloak - R.structDist) * (i % 3) / 3)); if (t >= 0 && g.build(A, UT.CITY, t)) n++; }
  g.cloakScan();
  const covered = A.units.filter((u) => u.cloak && u !== tower).length;
  ok(covered === G.CLOAK_COVER, 'ein Turm deckt höchstens ' + G.CLOAK_COVER + ' weitere Gebäude, auch dicht gepackt (' + n + ' Städte daneben gebaut)');
  ok(!g.canUpgrade(A, tower), 'Tarnturm hat keine Stufen');
  // allies always see it
  A.allies.set(B.id, { end: 1e9 }); B.allies.set(A.id, { end: 1e9 });
  ok(!g.hiddenFrom(near, B), 'Verbündete sehen versteckte Gebäude');
  A.allies.delete(B.id); B.allies.delete(A.id);
  // B gets land close by: it shows up
  const W = g.W;
  let t0 = -1;
  for (let k = R.reveal - 2; k > 0 && t0 < 0; k--) for (let a = 0; a < 6.28 && t0 < 0; a += 0.1) { const t = Math.round(near.y + Math.sin(a) * k) * W + Math.round(near.x + Math.cos(a) * k); if (map.land[t] && g.owner[t] === A.id && !A.units.some((u) => u.tile === t)) t0 = t; }
  g.conquer(B, t0);
  ok(!g.hiddenFrom(near, B), 'B hält Land ' + Math.round(Math.hypot(t0 % W - near.x, ((t0 / W) | 0) - near.y)) + ' Felder neben der Flugabwehr: jetzt sichtbar (Grenze ' + R.reveal + ')');
  // tower gone: nothing hidden any more
  g.removeUnit(tower);
  g.cloakScan();
  ok(!A.units.some((u) => u.cloak), 'Turm weg: nichts mehr versteckt');
}
{
  // nations in Arsenal mode build cloaking towers next to their silos and air defences
  const g = new G.Game(map, { seed: 7, bots: 10, difficulty: 2, arsenal: true });
  g.setup(null);
  // 20 minutes: with momentum (switch `schwung`, 22.11.2026) nations grow slower and arm later
  for (let i = 0; i < 12000; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; }
  const towers = g.units.filter((u) => u.active && u.type === UT.CLOAK).length;
  g.cloakScan();
  const hid = g.units.filter((u) => u.active && u.cloak && u.type !== UT.CLOAK).length;
  ok(towers > 0, 'Nationen bauen Tarntürme: ' + towers + ' Türme decken ' + hid + ' Gebäude');
}
console.log(fails ? fails + ' FEHLER' : 'alles ok');
process.exit(fails ? 1 : 0);
