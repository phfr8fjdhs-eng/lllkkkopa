// Wraps the hot functions to see where slow ticks come from.
const path = require('path');
process.argv.splice(2, 0);
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const stat = {};
function wrap(obj, name) {
  const orig = obj[name];
  stat[name] = { n: 0, total: 0, max: 0 };
  obj[name] = function () {
    const a = process.hrtime.bigint();
    const r = orig.apply(this, arguments);
    const ms = Number(process.hrtime.bigint() - a) / 1e6;
    const s = stat[name]; s.n++; s.total += ms; if (ms > s.max) s.max = ms;
    return r;
  };
}
wrap(G.Pathfinder.prototype, 'find');
for (const n of ['removeClusters', 'tickAttack', 'refreshFront', 'finishOff', 'capturePocket', 'neighbors', 'boatPlan', 'detonate', 'tickDiplomacy', 'tickWarship', 'tickPort']) wrap(G.Game.prototype, n);
for (const n of ['nation', 'bot', 'construct', 'boat', 'strikeFromAir']) wrap(G.AI.prototype, n);
globalThis.__stat = stat;
process.on('exit', () => {
  for (const k of Object.keys(stat)) { const s = stat[k]; console.log(k.padEnd(16), 'calls', String(s.n).padStart(8), 'total', s.total.toFixed(0).padStart(7), 'ms  max', s.max.toFixed(1), 'ms'); }
});
require('./sim.js');
