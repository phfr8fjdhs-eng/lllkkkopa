// Where a tick of the simulation goes, part by part: conquest, posture (troop density), bots,
// units, rails, sea routes. Average per tick, peak of one tick, and the spread of whole ticks
// (95 % and 99 % of the ticks are faster than ...), so spikes show and not only the average.
//   node test/phasen.js [karte] [ticks] [bots]
//   node --max-old-space-size=4096 test/phasen.js erde 1500 400
// The timing wrappers cost a little themselves (only top level parts are timed, nothing per
// tile); compare parts with each other, and before with after.
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, loadMap = require('./load.js');

(async () => {
  const id = process.argv[2] || 'welt', ticks = +(process.argv[3] || 2000), bots = +(process.argv[4] || 150);
  const map = await loadMap(G, id);
  const g = new G.Game(map, { seed: 7, bots: bots, difficulty: 1, spawnTicks: 10 });
  g.setup(null);
  const sum = {}, peak = {}, cur = {}, group = {};
  const wrap = (obj, name, label, grp) => {
    const orig = obj[name];
    if (!orig) return;
    sum[label] = 0; peak[label] = 0; cur[label] = 0; group[label] = grp;
    obj[name] = function () {
      const a = process.hrtime.bigint();
      try { return orig.apply(this, arguments); } finally { cur[label] += Number(process.hrtime.bigint() - a) / 1e6; }
    };
  };
  const GP = G.Game.prototype;
  // top level parts of Game.tick (they do not nest into each other)
  wrap(GP, 'tickAttack', 'Eroberung: tickAttack', 'Eroberung');
  wrap(GP, 'removeClusters', 'Eroberung: removeClusters (Kessel)', 'Eroberung');
  wrap(GP, 'shrinkBox', 'Eroberung: shrinkBox', 'Eroberung');
  wrap(GP, 'postTick', 'Dichte: postTick (Marsch, Taschen)', 'Dichte');
  wrap(G.AI.prototype, 'tick', 'Bots und Nationen: AI.tick', 'Bots');
  wrap(GP, 'tickUnit', 'Einheiten: tickUnit', 'Einheiten');
  wrap(GP, 'pathStep', 'Einheiten: pathStep (Seerouten)', 'Einheiten');
  wrap(GP, 'tickRail', 'Einheiten: tickRail (Bahn)', 'Einheiten');
  wrap(GP, 'tickDiplomacy', 'Rest: tickDiplomacy', 'Rest');
  wrap(GP, 'reap', 'Rest: reap', 'Rest');
  const times = [];
  for (let i = 0; i < ticks; i++) {
    for (const k in cur) cur[k] = 0;
    const a = process.hrtime.bigint();
    g.tick();
    const ms = Number(process.hrtime.bigint() - a) / 1e6;
    for (const k in cur) { sum[k] += cur[k]; if (cur[k] > peak[k]) peak[k] = cur[k]; }
    // what the page or the worker does after a tick
    for (let k = 0; k < g.dirtyN; k++) g.dirtyFlag[g.dirty[k]] = 0;
    g.dirtyN = 0; g.fx.length = 0; g.events.length = 0;
    if (i >= 200) times.push(ms);    // the first ticks are the spawn phase
  }
  times.sort((a, b) => a - b);
  const n = times.length, avg = times.reduce((s, v) => s + v, 0) / n, q = (f) => times[Math.min(n - 1, Math.floor(n * f))].toFixed(1);
  const alive = g.players.filter((p) => p && p.alive).length;
  console.log(`${id}, ${bots} Bots, ${ticks} Ticks, am Ende ${alive} Reiche und ${g.units.length} Einheiten`);
  console.log(`Tick: Mittel ${avg.toFixed(2)} ms, 95 % unter ${q(0.95)} ms, 99 % unter ${q(0.99)} ms, längster ${times[n - 1].toFixed(1)} ms`);
  const tot = Object.values(sum).reduce((s, v) => s + v, 0), byGroup = {};
  for (const k in sum) byGroup[group[k]] = (byGroup[group[k]] || 0) + sum[k];
  console.log('Anteile: ' + Object.keys(byGroup).sort((a, b) => byGroup[b] - byGroup[a]).map((k) => `${k} ${(byGroup[k] / tot * 100).toFixed(0)} %`).join(', '));
  for (const k of Object.keys(sum).sort((a, b) => sum[b] - sum[a])) {
    console.log('  ' + k.padEnd(38) + (sum[k] / ticks).toFixed(3).padStart(8) + ' ms/Tick   längster Tick ' + peak[k].toFixed(1).padStart(5) + ' ms');
  }
  console.log('Speicher: ' + Math.round(process.memoryUsage().heapUsed / 1e6) + ' MB JS, ' + Math.round(process.memoryUsage().arrayBuffers / 1e6) + ' MB in Arrays');
})().catch((e) => { console.error(e); process.exit(1); });
