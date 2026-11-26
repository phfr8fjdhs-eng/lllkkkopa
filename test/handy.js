// Like a phone: a small touch screen (390 x 844), sharpness DPR (default 2), the processor of the
// page CPU times slower (default 4; the worker is not slowed). Plays SECS seconds, attacking, and
// counts the gaps between pictures, long tasks on the page and ticks.   First `python3 tools/build.py`.
//   node test/handy.js [karte] [sekunden] [cpu]      DPR=1|2|3, Q='&gl=1', PROF=1 (where the page's time goes),
//   HTML=build/rohstoffe.html for the version «Rohstoffe»
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const HTML = process.env.HTML ? path.resolve(process.env.HTML) : path.join(__dirname, '..', 'build', 'index.html');
const [MAP, SECS, CPU] = [process.argv[2] || 'welt', +(process.argv[3] || 20), +(process.argv[4] || 4)];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox', '--enable-precise-memory-info'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: +(process.env.DPR || 2), isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await ctx.newCDPSession(page);
  const t0 = Date.now();
  await page.goto('file://' + HTML + '?karte=' + MAP + (process.env.Q || ''));
  await page.waitForTimeout(800);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  const tStart = Date.now();
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 300000 });
  const loadS = (Date.now() - tStart) / 1000;
  await page.evaluate(() => { const g = G.debug.game; for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t]) { G.debug.act({ k: 'spawn', t: t }); break; } });
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 120000 });
  await page.evaluate(() => {
    const S = window.__S = { gap: [], long: [] };
    let last = performance.now();
    const loop = (n) => { S.gap.push(n - last); last = n; requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    try { new PerformanceObserver((l) => { for (const e of l.getEntries()) S.long.push(e.duration); }).observe({ type: 'longtask', buffered: false }); } catch (e) {}
    S.t0 = G.debug.game.ticks;
    window.__play = setInterval(() => {
      const g = G.debug.game, h = g && g.human; if (!h || !h.alive) return;
      const W = g.W; let tgt = -1;
      for (const b of h.border) { for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < g.N && g.map.land[n] && g.owner[n] !== h.id) { tgt = n; break; } if (tgt >= 0) break; }
      if (tgt >= 0) G.debug.host.exec(h.id, { k: 'strike', t: tgt, r: 0.3 }, () => {});
    }, 700);
  });
  if (process.env.PROF) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 500 }); await cdp.send('Profiler.start');
  }
  await page.waitForTimeout(SECS * 1000);
  if (process.env.PROF) {
  const prof = (await cdp.send('Profiler.stop')).profile;
  const self = {}, byId = {}; for (const n of prof.nodes) byId[n.id] = n;
  const dt = prof.timeDeltas; const cnt = {}; for (let i = 0; i < prof.samples.length; i++) cnt[prof.samples[i]] = (cnt[prof.samples[i]] || 0) + (dt[i] || 0);
  let tot = 0; for (const id in cnt) { const n = byId[id], f = n.callFrame, k = (f.functionName || '(anon)') + ' :' + (f.lineNumber + 1); self[k] = (self[k] || 0) + cnt[id]; tot += cnt[id]; }
  const top = Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, 28);
  for (const [k, v] of top) console.log((v / tot * 100).toFixed(1).padStart(5) + ' %  ' + k);
  }
  const r = await page.evaluate(() => {
    clearInterval(window.__play);
    const S = window.__S, s = S.gap.slice(5).sort((a, b) => a - b), g = G.debug.game;
    const m = performance.memory || {};
    return { bilder: s.length, mittel: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(1), p95: +s[Math.floor(s.length * 0.95)].toFixed(1), max: +s[s.length - 1].toFixed(1),
      ueber50ms: s.filter((x) => x > 50).length, langeAufgaben: S.long.length, laengste: Math.round(Math.max(0, ...S.long)), ticks: g.ticks - S.t0,
      worker: !G.debug.host.local, heapMB: Math.round((m.usedJSHeapSize || 0) / 1048576), gl: !!(G.debug.view && G.debug.view.gl) };
  });
  r.ladenS = loadS; r.fehler = errors.slice(0, 3);
  console.log(MAP, 'CPU x' + CPU, 'DPR ' + (process.env.DPR || 2), JSON.stringify(r));
  if (r.fehler.length) process.exitCode = 1;
  await browser.close();
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
