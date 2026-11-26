// Mode «Langes Spiel» (doku/langes-spiel.md): checks the rules of the mode against the classic game.
//   node test/lang.js
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
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
check('Bodenkampf gleich', a.attackPace === b.attackPace && a.R.defense === b.R.defense);
// on the Earth (a side scale S of 1): a ship over the Atlantic (about 80 tiles a minute today)
console.log('Erde: Schiff ' + (1 * W) + ' Felder pro Tick, Atombombe ' + (6 * A).toFixed(1) + ' (heute 1 und 6)');
if (bad) { console.log(bad + ' Fehler'); process.exit(1); }
console.log('alles gut');
