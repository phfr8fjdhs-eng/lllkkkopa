// The map drawn by the graphics card (src/06b_gl.js) against the rules of View.color: plays a
// while in real time, then reads back the colour of every tile from the card and compares it
// with what View.color works out. Also cut into pieces (as on devices with small textures), and
// the way back to the 2D picture when the card is lost. And the ships: their hulls drawn by the
// card (G.ShipGL) against the same frame drawn in Canvas 2D, pixel for pixel.
//   node test/gl.js [karte] [seconds]          (first `python3 tools/build.py`)
// The machine needs no graphics card: ?gl=1 makes the page use WebGL in software as well.
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const MAP = process.argv[2] || 'welt', SECS = +(process.argv[3] || 15);
let bad = 0;
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const run = async (chunk, lose) => {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    if (chunk) await page.addInitScript((c) => { window.G = window.G || {}; G.debugChunk = c; }, chunk);
    await page.goto('file://' + path.join(__dirname, '..', 'build', 'index.html') + '?karte=' + MAP + '&gl=1');
    await page.waitForTimeout(800);
    await page.click('#fStart');
    await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 120000 });
    await page.evaluate(() => { const g = G.debug.game; for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t]) { G.debug.act({ k: 'spawn', t: t }); break; } });
    await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 60000 });
    await page.waitForTimeout(SECS * 1000);
    if (lose) {
      await page.evaluate(() => G.debug.view.glm.gl.getExtension('WEBGL_lose_context').loseContext());
      await page.waitForTimeout(2500);
    }
    const r = await page.evaluate(() => {
      const g = G.debug.game, v = G.debug.view;
      G.ui.setPaused(true);
      // every realm's shading worked out now, then everything to the picture
      v.shadeAt = -1e9; v.shadeI = undefined;
      for (let k = 0; k < 10000 && (v.shadeI === undefined || v.shadeI < g.players.length); k++) v.shadeScan(performance.now() + 1e7);
      v.flush();
      let got;
      if (v.glm) { v.glm.render(); got = v.glm.readAll(); } else got = v.px.slice();
      let n = 0, worst = 0;
      for (let t = 0; t < g.N; t++) {
        const a = got[t], c = v.color(t);
        if (a === c) continue;
        n++;
        worst = Math.max(worst, Math.abs((a & 255) - (c & 255)), Math.abs(((a >>> 8) & 255) - ((c >>> 8) & 255)), Math.abs(((a >>> 16) & 255) - ((c >>> 16) & 255)));
      }
      return { gl: !!v.glm, chunks: v.glm ? v.glm.chunks.length : 0, N: g.N, n: n, worst: worst, ticks: g.ticks };
    });
    await page.close();
    return Object.assign(r, { errors: errors });
  };
  const a = await run(0, false);
  ok(a.gl && a.n === 0, 'WebGL draws every tile as View.color: ' + a.N + ' tiles after ' + a.ticks + ' ticks' + (a.n ? ', ' + a.n + ' differ (up to ' + a.worst + ')' : ''));
  const b = await run(700, false);
  ok(b.gl && b.chunks > 1 && b.n === 0, 'cut into ' + b.chunks + ' pieces: every tile as View.color' + (b.n ? ', ' + b.n + ' differ (up to ' + b.worst + ')' : ''));
  const c = await run(0, true);
  ok(!c.gl && c.n === 0, 'graphics card lost: the 2D picture takes over, every tile right' + (c.n ? ', ' + c.n + ' differ' : ''));
  // ships: the same frame twice, hulls in Canvas 2D and on the graphics card
  const ships = async () => {
    const page = await (await browser.newContext({ viewport: { width: 1000, height: 700 } })).newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('file://' + path.join(__dirname, '..', 'build', 'index.html') + '?karte=welt&gl=1&worker=0');
    await page.waitForTimeout(800);
    await page.click('#fStart');
    await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 120000 });
    await page.evaluate(() => { const g = G.debug.game; for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t]) { g.spawn(g.human, t); break; } });
    await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 10000 });
    const r = await page.evaluate(() => {
      const g = G.debug.game, v = G.debug.view, UT = G.UT, map = g.map;
      for (let i = 0; i < 600; i++) g.tick();
      v.flush(); G.ui.setPaused(true);
      const alive = g.players.filter((p) => p && p.alive), rng = new G.RNG(5), sea = [];
      for (let t = 0; t < map.N; t += 7) if (!map.land[t]) sea.push(t);
      for (let k = 0; k < 1500; k++) {   // every kind of hull, every heading
        const p = alive[rng.int(0, alive.length)], t = sea[rng.int(0, sea.length)], kind = k % 6;
        const u = g.newUnit(kind < 3 ? UT.WARSHIP : kind < 5 ? UT.TRADE : UT.TRANSPORT, p, t);
        u.cls = kind < 3 ? (kind === 2 ? 1 : 0) : 0; u.kind = kind === 3 ? 0 : kind === 4 ? (k % 3) : 0;
        u.hp = 1000; u.path = null; u.pi = 0; u.captured = k % 50 === 0; u.hits = 1; u.gold = 100; u.tid = 0; u.troops = 1;
        u.px = u.x - Math.cos(k) * 2; u.py = u.y - Math.sin(k) * 2;
        g.addUnit(u);
      }
      const shot = (gl, z) => {
        v.sglOff = !gl; v.fly = null; v.cam.z = z; v.cam.x = map.W / 2; v.cam.y = map.H / 2; v.clampCam();
        for (const u of g.units) u.vf = -9;   // every ship takes its heading at once, the same in both
        v.draw(0.5, 1e6);
        return v.ctx.getImageData(0, 0, v.cv.width, v.cv.height).data;
      };
      const out = [];
      for (const z of [0.6, 2, 6]) {
        shot(true, z);   // a first frame each way, so both start from the same state
        const a = shot(false, z), b = shot(true, z);
        // a pixel counts as off when neither picture has its colour within one pixel around it in
        // the other (a picture pixel on the edge may fall a screen pixel this way or that)
        const W = v.cv.width, H = v.cv.height;
        // compared as seen: laid over the sea (the edges of a turned picture are smoothed in 2D and
        // multisampled on the card, so their coverage differs a little)
        const SEA = [17, 34, 51], over = (p, i, c) => (p[i + c] * p[i + 3] + SEA[c] * (255 - p[i + 3])) / 255;
        const same = (p, i, q, j) => Math.abs(over(p, i, 0) - over(q, j, 0)) <= 40 && Math.abs(over(p, i, 1) - over(q, j, 1)) <= 40 && Math.abs(over(p, i, 2) - over(q, j, 2)) <= 40;
        const near = (x, y, p, q) => {
          const i = (y * W + x) * 4;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx, yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
            if (same(p, i, q, (yy * W + xx) * 4)) return true;
          }
          return false;
        };
        let ink = 0, diff = 0, far = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (!a[i + 3] && !b[i + 3]) continue;
          ink++;
          if (a[i] === b[i] && a[i + 1] === b[i + 1] && a[i + 2] === b[i + 2] && a[i + 3] === b[i + 3]) continue;
          diff++;
          if (!near(x, y, a, b) || !near(x, y, b, a)) far++;
        }
        out.push({ z: z, ink: ink, diff: diff, far: far });
      }
      return { used: !!v.sgl && !v.sglOff, out: out };
    });
    await page.close();
    return Object.assign(r, { errors: errors });
  };
  const d = await ships();
  // at the smallest zoom a picture pixel is 1.4 screen pixels; where an edge of it falls on a
  // pixel's middle, the two ways of drawing may round it apart (about 2 % there, unseen by eye)
  for (const o of d.out) ok(d.used && o.far <= o.ink * (o.z < 1 ? 0.03 : 0.01), 'ships on the graphics card as in 2D, zoom ' + o.z + ': ' + o.ink + ' drawn pixels, ' + o.diff + ' differ, ' + o.far + ' with no such colour a pixel around');
  const errs = a.errors.concat(b.errors, c.errors, d.errors);
  ok(errs.length === 0, 'no errors on the page' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(bad ? bad + ' failed' : 'alles ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
