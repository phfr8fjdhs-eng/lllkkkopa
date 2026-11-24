// The map drawn by the graphics card (src/06b_gl.js) against the rules of View.color: plays a
// while in real time, then reads back the colour of every tile from the card and compares it
// with what View.color works out. Also cut into pieces (as on devices with small textures), and
// the way back to the 2D picture when the card is lost.
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
  const errs = a.errors.concat(b.errors, c.errors);
  ok(errs.length === 0, 'no errors on the page' + (errs.length ? ': ' + errs.slice(0, 3).join(' | ') : ''));
  await browser.close();
  console.log(bad ? bad + ' failed' : 'alles ok');
  process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
