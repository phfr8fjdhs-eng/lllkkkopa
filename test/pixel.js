// Pixel style (src/06c_pixel.js, src/06d_pixart.js, doku/stil.md): every picture built here in
// Node uses only the measured palette (src/assets/palette.js), the player colour placeholders and
// the drop shadow; it comes out the same twice; the sizes stay within the plan
// (building picture A about 32 × 28, picture E at most 96 × 80, outline included: + 2).
const fs = require('fs'), vm = require('vm'), path = require('path');
globalThis.G = {};
for (const f of ['assets/palette.js', '06c_pixel.js', '06d_pixart.js', '06e_pixfx.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'src', f), 'utf8'), { filename: f });
const X = G.Pixel, A = G.PixArt;
const ok = new Set(X.PAL.values()); ok.add(X.PC1); ok.add(X.PC2); ok.add(X.PC3); ok.add(X.PC4);
const okRgb = new Set([...X.PAL.values()].map((v) => v & 0xffffff));
// shadow: a palette colour × 0.65
const shade = new Set();
for (const v of X.PAL.values()) shade.add(X.pack(Math.round((v & 255) * 0.65), Math.round(((v >>> 8) & 255) * 0.65), Math.round(((v >>> 16) & 255) * 0.65)));
let fail = 0;
const check = (name, p, maxW, maxH) => {
  let bad = 0, n = 0;
  for (const v of p.d) {
    if (!v) continue;
    n++;
    if (ok.has(v) || shade.has(v)) continue;
    // see-through: shadows (black), smoke (palette colours): any alpha below 255
    if ((v >>> 24) < 254 && (okRgb.has(v & 0xffffff) || (v & 0xffffff) === 0)) continue;
    bad++;
  }
  const size = p.w + ' × ' + p.h;
  const tooBig = (maxW && p.w > maxW) || (maxH && p.h > maxH);
  if (bad || tooBig) fail++;
  console.log((bad || tooBig ? 'FEHLER ' : 'ok     ') + name.padEnd(12) + size.padEnd(10) + n + ' Pixel' + (bad ? ', ' + bad + ' nicht aus der Palette' : '') + (tooBig ? ', zu gross' : ''));
};
const same = (a, b) => a.w === b.w && a.h === b.h && a.d.every((v, i) => v === b.d[i]);
for (const k of ['city', 'factory']) for (let s = 0; s < 5; s++) {
  const p = A[k](s);
  check(k + ' ' + 'ABCDE'[s], p, s === 0 ? 36 : 98, s === 0 ? 32 : 82);
  if (!same(p, A[k](s))) { fail++; console.log('FEHLER ' + k + ' ' + s + ' nicht gleich beim zweiten Mal'); }
}
for (const k of ['port', 'defense', 'sam0', 'sam1', 'radar', 'airfield', 'cloak']) for (let s = 0; s < (k === 'cloak' ? 2 : 5); s++) {
  const p = A[k](s, 0);
  check(k + ' ' + 'ABCDE'[s], p, s === 0 ? 40 : 110, s === 0 ? 46 : 90);
}
for (const k of ['city', 'factory', 'defense', 'radar']) { check(k + ' im Bau', A.building(k, 0, { build: true })); check(k + ' kaputt', A.building(k, 2, { damage: 2 })); }
for (const f of [0, 1, 2, 3]) { check('sam0 E/' + f, A.sam0(4, f)); check('radar E/' + f, A.radar(4, f)); }
const F = G.PixFx;
check('mine', F.mine(), 14, 14);
check('loco', F.loco(), 34, 22); for (const k of [0, 1, 2]) check('wagon ' + k, F.wagon(k), 28, 18);
check('loco vorn', F.trainEnd('loco', true), 16, 18); check('loco hinten', F.trainEnd('loco', false), 16, 18); for (const k of [0, 1, 2]) check('wagon end ' + k, F.trainEnd(k), 16, 18);
for (const k of ['h', 'v', 'x', 'c0', 'c1', 'c2', 'c3']) check('rail ' + k, F.rail(k), 12, 12);
for (const k of ['bomber', 'stealth', 'fighter', 'recon']) for (let d = 0; d < 8; d++) { const q = F.plane(k, d); check(k + ' ' + d, q.pix, 46, 46); check(k + ' Schatten ' + d, q.shadow); }
check('shell', F.shell()); F.explosion(16).forEach((p, i) => check('boom16 ' + i, p, 22, 22)); F.explosion(40).forEach((p, i) => check('boom40 ' + i, p, 50, 50));
F.splash().forEach((p, i) => check('splash ' + i, p)); F.sink(A.boat()).forEach((p, i) => check('sink ' + i, p)); check('gold', F.gold('+25k')); check('ziel', F.target(), 15, 15);
check('boat', A.boat(), 54, 38);                       // hull about 42 × 30, plus foam and wake
for (const [lv, st] of [[1, 0], [2, 1], [4, 1], [5, 2], [9, 2], [10, 3], [29, 3], [30, 4], [100, 4]]) if (A.stage(lv) !== st) { fail++; console.log('FEHLER Stufe ' + lv + ' → Bild ' + A.stage(lv)); }
console.log(fail ? fail + ' Fehler' : 'alles in Ordnung');
process.exit(fail ? 1 : 0);
