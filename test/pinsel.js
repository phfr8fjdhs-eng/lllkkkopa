// Quick brush and shortcuts (24.11.2026) in headless Chrome: the key V held (Shift + V thins
// out), the buttons + and - at the right edge (one stroke, then off; held long, they stay on), a
// double click held on own land, the «?» panel with all shortcuts, and the order of the build bar.
// Saves screenshots into build/. Needs the build (python3 tools/build.py) and Playwright.
const { chromium } = (function () { try { return require('playwright'); } catch (e) { return require('/opt/npm-tools/node_modules/playwright'); } })();
const path = require('path');
const out = (n) => path.join(__dirname, '..', 'build', n);
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: 1280, height: 760 } })).newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
  const must = (ok, what) => { if (!ok) { errors.push('FAILED: ' + what); console.log('FAILED', what); } else console.log('ok', what); };
  await page.goto('file://' + out('index.html') + '?karte=welt');
  await page.waitForTimeout(800);
  await page.click('#fStart');
  await page.waitForFunction(() => G.debug.game && G.debug.game.players.length > 5, null, { timeout: 20000 });
  const spot = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view;
    for (let r = 0; r < 300; r += 6) for (let a = 0; a < 6.28; a += 0.4) {
      const x = v.cw / 2 + Math.cos(a) * r, y = v.ch / 2 + Math.sin(a) * r * 0.6, t = v.tileAt(x, y);
      if (t >= 0 && g.canSpawnAt(t) && g.map.shore[t] === 0) return { x, y };
    }
    return null;
  });
  await page.mouse.click(spot.x, spot.y);
  await page.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 3000 });
  await page.waitForTimeout(2500);
  must(await page.evaluate(() => !document.getElementById('brushBtns').hidden), 'the buttons + and - are there');
  // the build bar: digits first, the specials to the right
  const keys = await page.evaluate(() => [...document.querySelectorAll('#hotbar .hk kbd')].map((k) => k.textContent).join(''));
  console.log('build bar keys', keys);
  must(/^1234567890HM/.test(keys), 'build bar: 1-0, then H and M');
  // the «?» panel
  await page.click('#bKeys');
  await page.waitForTimeout(200);
  const kp = await page.evaluate(() => ({ open: !document.getElementById('keysPanel').hidden, badges: document.body.classList.contains('showKeys'), boat: /Boot losschicken/.test(document.getElementById('keysPanel').textContent), noBomb: !/Atombombe/.test(document.getElementById('keysPanel').textContent) }));
  await page.screenshot({ path: out('pinsel_1keys.png') });
  must(kp.open && kp.badges && kp.boat && kp.noBomb, '«?» shows the shortcuts (boat yes, bombs no) and the keys on the buttons');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(150);
  must(await page.evaluate(() => document.getElementById('keysPanel').hidden && !document.body.classList.contains('showKeys')), 'Esc closes it');
  await page.keyboard.press('Shift+Slash');   // «?» on a US keyboard
  await page.waitForTimeout(150);
  must(await page.evaluate(() => !document.getElementById('keysPanel').hidden), 'the key ? opens it');
  await page.keyboard.press('Escape');
  // a spot in the middle of own land, and the density of its cell
  const own = await page.evaluate(() => {
    const g = G.debug.game, v = G.debug.view, h = g.human;
    v.fly = null; v.cam.x = h.nameX; v.cam.y = h.nameY; v.cam.z = 4;
    const t = Math.round(h.nameY) * g.W + Math.round(h.nameX);
    return { t: t, c: g.cellOf(t), pt: v.screenOf(t), mine: g.owner[t] === h.id };
  });
  must(own.mine, 'own land under the brush');
  const dens = () => page.evaluate((c) => { const k = G.debug.game.human.post.cells.get(c); return k ? k.m : -1; }, own.c);
  const wiggle = async () => { for (let i = 0; i < 6; i++) { await page.mouse.move(own.pt.x + (i % 2 ? 14 : -14), own.pt.y + (i % 3) * 6, { steps: 3 }); await page.waitForTimeout(40); } };
  const state = () => page.evaluate(() => ({ bar: !document.getElementById('netBar').hidden, net: G.debug.view.net.on, more: document.getElementById('brMore').getAttribute('aria-pressed'), less: document.getElementById('brLess').getAttribute('aria-pressed'), ctrl: !document.getElementById('ctrl').hidden }));
  await page.mouse.move(own.pt.x, own.pt.y);
  // the key V held: thicker, without a click; letting go ends it
  let m0 = await dens();
  await page.keyboard.down('v');
  await wiggle();
  await page.screenshot({ path: out('pinsel_2key.png') });
  await page.keyboard.up('v');
  await page.waitForTimeout(400);
  let m1 = await dens(), s = await state();
  console.log('V', m0, '->', m1, JSON.stringify(s));
  must(m1 > m0 && !s.bar && !s.net, 'V held thickens, letting go ends it (no panel, no Fertig)');
  // Shift + V: thinner
  m0 = m1;
  await page.keyboard.down('Shift'); await page.keyboard.down('v');
  await wiggle();
  await page.keyboard.up('v'); await page.keyboard.up('Shift');
  await page.waitForTimeout(400);
  m1 = await dens();
  console.log('Shift+V', m0, '->', m1);
  must(m1 < m0, 'Shift + V thins out');
  // the button +: one stroke, then off by itself
  await page.click('#brMore');
  await page.waitForTimeout(150);
  s = await state();
  must(s.more === 'true' && s.net && !s.bar && s.ctrl, '+ arms the brush, without the panel');
  m0 = await dens();
  await page.mouse.move(own.pt.x - 20, own.pt.y);
  await page.mouse.down(); await wiggle(); await page.mouse.up();
  await page.waitForTimeout(400);
  m1 = await dens(); s = await state();
  console.log('+', m0, '->', m1, JSON.stringify(s));
  must(m1 > m0 && s.more === 'false' && !s.net, '+ : one stroke thickens, lifting ends it');
  // the button -, held long: stays on for several strokes, a tap puts it away
  const lb = await page.locator('#brLess').boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2);
  await page.mouse.down(); await page.waitForTimeout(600); await page.mouse.up();
  await page.waitForTimeout(150);
  m0 = await dens();
  for (let k = 0; k < 2; k++) { await page.mouse.move(own.pt.x - 20, own.pt.y); await page.mouse.down(); await wiggle(); await page.mouse.up(); await page.waitForTimeout(250); }
  m1 = await dens(); s = await state();
  console.log('- held', m0, '->', m1, JSON.stringify(s));
  must(m1 < m0 && s.less === 'true' && s.net, '- held long: stays on after two strokes');
  await page.click('#brLess');
  await page.waitForTimeout(150);
  s = await state();
  must(s.less === 'false' && !s.net, 'a tap on - puts it away');
  // a double click held on own land: thickens
  m0 = await dens();
  await page.mouse.move(own.pt.x, own.pt.y);
  await page.mouse.down(); await page.mouse.up();
  await page.waitForTimeout(80);
  await page.mouse.down(); await wiggle(); await page.mouse.up();
  await page.waitForTimeout(400);
  m1 = await dens(); s = await state();
  console.log('double', m0, '->', m1, JSON.stringify(s));
  must(m1 > m0 && !s.net, 'a double click held on own land thickens, lifting ends it');
  // N still opens the full mode with the panel
  await page.keyboard.press('n');
  await page.waitForTimeout(150);
  s = await state();
  must(s.bar && s.net, 'N still opens the full mode');
  await page.keyboard.press('Escape');
  await page.screenshot({ path: out('pinsel_3end.png') });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();
