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
  check('Kriegsschiffe schwerer', b.shipFull({ cls: 1, owner: me }) === G.SHIP_CLASS[1].hp * G.LANG.shipHp);
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
if (bad) { console.log(bad + ' Fehler'); process.exit(1); }
console.log('alles gut');
