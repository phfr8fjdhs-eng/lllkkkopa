// «Langes Spiel», Paket 8 (doku/langes-spiel.md): the base islands of G.ISLES on the Earth. Each is
// there with ground for a port and an airfield, the classic Earth is unchanged, no nation starts on one.
//   node --max-old-space-size=4096 test/inseln.js
const path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '04c_lang.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, load = require('./load.js');
(async () => {
  const fs = require('fs'), def = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'erde.json'), 'utf8'));
  const base = await load(G, 'erde');
  const sharp = require('/opt/npm-tools/node_modules/sharp');
  const gray = async (b64) => { const r = await sharp(Buffer.from(b64, 'base64'), { limitInputPixels: false }).raw().toBuffer({ resolveWithObject: true }); const ch = r.info.channels, n = r.info.width * r.info.height, out = new Uint8Array(n); for (let i = 0; i < n; i++) out[i] = r.data[i * ch]; return out; };
  const m = G.buildWorld(def, await gray(def.png), await gray(def.mag), await gray(def.hgt), { isles: true });
  let bad = 0;
  const check = (name, ok, line) => { console.log((ok ? 'ok   ' : 'FAIL ') + name + (line ? ': ' + line : '')); if (!ok) bad++; };
  check('klassische Erde ohne Inselliste', !base.isle);
  const W = m.W, lats = G.rowLats(m.H, { proj: 'pat', lat: def.lat });
  const out = [];
  for (const it of G.ISLES) {
    let y = 0; while (y < m.H - 1 && lats[y] > it[2]) y++;
    const lon = it[1] < G.EARTH_LON0 ? it[1] + 360 : it[1], x = Math.floor((lon - G.EARTH_LON0) / 360 * W);
    const t = y * W + x;
    let n = 0;
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) if (m.land[t + dy * W + dx]) n++;
    out.push(it[0] + ' ' + n);
    if (!m.land[t] || n < 40) check(it[0], false, n + ' Felder Land');
  }
  check('alle ' + G.ISLES.length + ' Inseln mit Land', true, out.join(', '));
  check('Landfläche wächst', m.landTiles > base.landTiles, base.landTiles + ' -> ' + m.landTiles);
  const g = new G.Game(m, { seed: 7, bots: 0, nations: true, lang: true, difficulty: 1 }); g.setup(null);
  const on = g.players.filter((p) => p && p.type === G.PT.NATION && p.units && [...p.border || []].some((t) => m.isle[t]));
  check('keine Nation startet auf einer Stützpunkt-Insel', on.length === 0, on.map((p) => p.name).join(', '));
  if (bad) { console.log(bad + ' Fehler'); process.exit(1); }
  console.log('alles gut');
})();
