// Mode «Langes Spiel» (doku/langes-spiel.md): checks the rules of the mode against the classic game.
//   node test/lang.js
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const seed = 4242, map = G.buildMap(480, 300, G.randomClassMap(480, 300, seed), seed, { id: 'zufall', name: 'Test', nations: [] });
const make = (lang) => { const g = new G.Game(map, { seed: 99, bots: 0, difficulty: 1, me: 0, lang: lang }); g.setup([{ name: 'A' }]); return g; };
const a = make(false), b = make(true);
let bad = 0;
const near = (x, y) => Math.abs(x - y) < 1e-9;
const check = (name, ok, line) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (line ? ': ' + line : '')); if (!ok) bad++; };
const W = G.LANG.world, A = G.LANG.air;
check('Schiffe', near(b.pace, a.pace * W), a.pace.toFixed(3) + ' -> ' + b.pace.toFixed(3) + ' Felder pro Tick');
check('Züge und Granaten wie bisher', near(b.pace0, a.pace), b.pace0.toFixed(3));
check('Bomben', near(b.R.nukeSpeed, a.R.nukeSpeed * A), a.R.nukeSpeed.toFixed(2) + ' -> ' + b.R.nukeSpeed.toFixed(2));
check('Abwehrrakete', near(b.sammSpeed(), a.sammSpeed() * A), a.sammSpeed().toFixed(2) + ' -> ' + b.sammSpeed().toFixed(2));
for (const L of [1, 10]) {
  const ra = a.samRange({ level: L }), rb = b.samRange({ level: L });
  check('Flugabwehr Stufe ' + L, Math.abs(rb - ra * W) <= 1, ra + ' -> ' + rb + ' Felder');
}
check('Bündnis dauert 8 Minuten (klassisch 5)', b.allyTicks() === 4800 && a.allyTicks() === 3000 && G.LANG.allyRadar < G.LANG.allyTicks && G.LANG.allySight < G.LANG.allyRadar);
check('Kriegsschiff Patrouille', Math.abs(b.R.warPatrol - a.R.warPatrol * W) <= 1, a.R.warPatrol + ' -> ' + b.R.warPatrol);
check('Bodenkampf im Tempo gleich', a.attackPace === b.attackPace);
check('Verteidigungsposten grösser', b.R.defense === Math.round(a.R.defense * G.LANG.postR), a.R.defense + ' -> ' + b.R.defense);
check('Posten stärker', b.postMag(1) > a.postMag(1) && b.postSpd(1) > a.postSpd(1), 'Verluste x' + a.postMag(1) + ' -> x' + b.postMag(1) + ', Zeit x' + a.postSpd(1) + ' -> x' + b.postSpd(1));
// digging in: a cell 2 minutes quiet is fully dug in, a lost tile takes a little of it
const c = { dig0: b.ticks - G.LANG.digTicks };
check('Eingraben nach 2 Minuten voll', b.digOf(c) === 1);
b.digLose(c);
check('ein verlorenes Feld nimmt etwas', Math.abs(b.digOf(c) - (1 - G.LANG.digDrop)) < 1e-9, b.digOf(c).toFixed(3));
check('klassisch kein Eingraben', !a.lang && a.postMag(1) === 5);
// two air defences: shots per salvo and reload of the missile defence by level
const shots = [1, 4, 8, 10].map((L) => b.samShotsOf({ cls: 1, level: L }));
check('Raketenabwehr: Schüsse 1, 2, 3, 3', shots.join(',') === '1,2,3,3', shots.join(', '));
check('kleine Flugabwehr: 2 Schüsse pro Stufe', b.samShotsOf({ cls: 0, level: 3 }) === 6);
const wise = { tech: { abm3: 1, abm4: 1, abm5: 1 } };
check('Raketenabwehr nur gegen Atomwaffen (mit Forschung)', b.samCan({ cls: 1, owner: wise }, G.UT.ATOM) && b.samCan({ cls: 1, owner: wise }, G.UT.WARHEAD) && !b.samCan({ cls: 1, owner: wise }, G.UT.CRUISE) && !b.samCan({ cls: 1, owner: {} }, G.UT.ATOM));
check('Flugzeuge: kleine nie, Raketenabwehr ab Stufe 3', !b.samCan({ cls: 0, level: 10 }, G.UT.BOMBER) && !b.samCan({ cls: 1, level: 2 }, G.UT.BOMBER) && b.samCan({ cls: 1, level: 3 }, G.UT.BOMBER) && b.samCan({ cls: 1, level: 3 }, G.UT.RECON) && b.samCan({ cls: 0 }, G.UT.SRBM));
check('Tarnbomber: Raketenabwehr ab Stufe 5 mit Forschung', !b.samCan({ cls: 0, level: 9, owner: { tech: { abw5: 1 } } }, G.UT.STEALTH) && !b.samCan({ cls: 1, level: 4, owner: { tech: { abw5: 1 } } }, G.UT.STEALTH) && b.samCan({ cls: 1, level: 5, owner: { tech: { abw5: 1 } } }, G.UT.STEALTH) && !b.samCan({ cls: 1, level: 5, owner: { tech: {} } }, G.UT.STEALTH));
check('kleine nur gegen Marschflugkörper', b.samCan({ cls: 0 }, G.UT.CRUISE) && !b.samCan({ cls: 0 }, G.UT.ATOM));
// Paket 2: nuclear weapons late and dear, reach from the silo
const pb = b.players[1];
check('ohne Forschung kein Marschflugkörper', b.weaponWhy(pb, G.UT.CRUISE) !== '', b.weaponWhy(pb, G.UT.CRUISE));
pb.tech = {}; for (const t of G.TECH) pb.tech[t.id] = 1;
check('Atombombe erst ab Minute 30', b.weaponWhy(pb, G.UT.ATOM) !== '' && b.weaponWhy(pb, G.UT.CRUISE) === '', b.weaponWhy(pb, G.UT.ATOM));
check('Atombombe teurer', b.cost(pb, G.UT.ATOM) === a.cost(a.players[1], G.UT.ATOM) * G.LANG.nukeCost[G.UT.ATOM], G.fmt(a.cost(a.players[1], G.UT.ATOM)) + ' -> ' + G.fmt(b.cost(pb, G.UT.ATOM)));
const rs = [G.UT.SRBM, G.UT.CRUISE, G.UT.ATOM, G.UT.HYDRO, G.UT.MIRV].map((t) => b.weaponReach(t));
check('Reichweiten steigen', rs[0] < rs[1] && rs[1] < rs[2] && rs[2] < rs[3] && rs[4] === Infinity, rs.slice(0, 4).map((r) => Math.round(r)).join(' / ') + ' Felder, MIRV ganze Welt');
check('kleine Flugabwehr gegen die neuen Waffen', b.samCan({ cls: 0 }, G.UT.SRBM) && b.samCan({ cls: 0 }, G.UT.CLUSTER) && !b.samCan({ cls: 1 }, G.UT.SRBM));
// Paket 6: the navy
{
  const UT = G.UT, foe = { id: 77, tech: {} }, me = { id: 78, tech: { sonar: 1 }, units: [] };
  const sub = { cls: 2, owner: foe, x: 100, y: 100, shown: 0 };
  b.friendly = (() => { const f = b.friendly; return function (p, q) { return p.allies ? f.call(this, p, q) : false; }; })();
  check('U-Boot unsichtbar ohne Sonar', !b.subSeen(sub, { id: 79, tech: {}, units: [] }));
  me.units.push({ type: UT.WARSHIP, cls: 0, x: 105, y: 100 });
  check('Zerstörer mit Sonar findet es', b.subSeen(sub, me));
  sub.shown = b.ticks + 10;
  check('wer feuert, zeigt sich', b.subSeen(sub, { id: 79, tech: {}, units: [] }));
  check('Flugzeugträger doppelt so stark', b.shipFull({ cls: 3, owner: me }) === G.SHIP_CLASS[3].hp * G.LANG.shipHp * 2);
  { const rich = b.players[1], g0 = rich.gold; rich.gold = 1e12;
    const pr = (cls) => b.buildCheck(rich, G.UT.WARSHIP, 0, cls).cost, base = a.buildCheck(a.players[1], G.UT.WARSHIP, 0, 0).cost;
    check('Schiffe teurer: U-Boot und Träger doppelt, Zerstörer 1.3', pr(2) === Math.round(Math.round(base * 2) * 2) && pr(3) === Math.round(Math.round(base * 5) * 2) && pr(0) === Math.round(base * 1.3), G.fmt(pr(0)) + ' / ' + G.fmt(pr(2)) + ' / ' + G.fmt(pr(3)));
    rich.gold = g0; }
  check('Kriegsschiffe schwerer', b.shipFull({ cls: 1, owner: me }) === G.SHIP_CLASS[1].hp * G.LANG.shipHp);
  check('U-Boot feuert erst mit Forschung', !b.subCan({ tech: {} }, UT.CRUISE) && b.subCan({ tech: { ub3: 1 } }, UT.CRUISE) && !b.subCan({ tech: { ub3: 1 } }, UT.ATOM) && b.subCan({ tech: { ub3: 1, hydro: 1 } }, UT.HYDRO));
  check('Seemine nur mit Hafen in der Nähe', b.mineWhy(pb, 0, {}) !== '', b.mineWhy(pb, 0, {}));
}
// Paket 7: arms industry
{
  const UT = G.UT, silo = { x: 0, y: 0 };
  check('ohne Fabrik doppelt so lange', b.armFactory({ units: [] }, silo).k === G.LANG.armNoFab);
  const two = b.armFactory({ units: [{ type: UT.FACTORY, built: true, level: 3, x: 5, y: 0 }, { type: UT.FACTORY, built: true, level: 2, x: 50, y: 0 }] }, silo);
  check('mehr Fabrikstufen schneller', two.f.x === 5 && Math.abs(two.k - 1 / (1 + G.LANG.armFab * 4)) < 1e-9, 'Zeit x' + two.k.toFixed(2));
}
// on the Earth (a side scale S of 1): a ship over the Atlantic (about 80 tiles a minute today)
console.log('Erde: Schiff ' + (1 * W) + ' Felder pro Tick, Atombombe ' + (6 * A).toFixed(1) + ' (heute 1 und 6)');
// war (27.11.2026): who attacks is at war, both ways; only then do ships and mines go for each other
{
  const g = new G.Game(map, { seed: 99, bots: 0, difficulty: 1, me: 0, lang: true }); g.setup([{ name: 'A' }, { name: 'B' }]);
  let n = 0; for (let t = 0; t < map.N && n < 2; t += 53) if (g.canSpawnAt(t) && !map.shore[t]) { g.exec(++n, { k: 'spawn', t: t }); t += 20000; }
  while (g.phase !== 'play' || g.ticks < g.immuneUntil) g.tick();
  const A = g.players[1], B = g.players[2], bot = { type: G.PT.BOT, id: 99, allies: new Map() };
  check('Krieg: anfangs keiner', !g.atWar(A, B) && !g.hostile(A, B) && g.hostile(A, bot));
  check('Krieg: klassisch greift jeder an', a.hostile(a.players[1], { type: G.PT.HUMAN, id: 5, allies: new Map() }));
  g.declareWar(A, B);
  check('Krieg: beide Seiten', g.atWar(A, B) && g.atWar(B, A) && g.hostile(B, A));
  g.exec(B.id, { k: 'peace', p: A.id });
  check('Krieg: Angebot steht', g.atWar(A, B) && B.peace[A.id] > g.ticks && g.events.some((e) => e.k === 'peaceReq' && e.from === B.id) === (g.human === A));
  g.exec(A.id, { k: 'peace', p: B.id });
  check('Frieden: angenommen', !g.atWar(A, B) && !g.hostile(A, B));
  g.declareWar(B, A); g.makeAlliance(A, B);
  check('Verbündete nie im Krieg', !g.atWar(A, B) && !g.hostile(A, B));
  A.allies.delete(B.id); B.allies.delete(A.id);
  B.type = G.PT.NATION; g.declareWar(A, B);
  g.exec(A.id, { k: 'peace', p: B.id });
  check('Nation: erst nach einer Weile', g.atWar(A, B));
  g.ticks += G.LANG.peaceWait;
  g.exec(A.id, { k: 'peace', p: B.id });
  check('Nation: dann Frieden und Ruhe', !g.atWar(A, B) && g.truce(B, A));
  B.type = G.PT.HUMAN; g.ticks -= G.LANG.peaceWait;
  g.exec(A.id, { k: 'spy', p: B.id });
  check('Spion ist kein Krieg', !g.atWar(A, B));
}
if (bad) { console.log(bad + ' Fehler'); process.exit(1); }
console.log('alles gut');
