// Two browsers play together through a local relay: room, invite link, start, orders, and the
// check that both devices compute exactly the same game. Needs aedes and ws (see BROKER below).
const BROKER = process.env.BROKER_MODULES || '/tmp/broker/node_modules';
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'), http = require('http');
const aedes = require(BROKER + '/aedes')();
const ws = require(BROKER + '/websocket-stream');
const page = 'file://' + path.join(__dirname, '..', 'build', 'index.html');
(async () => {
  const server = http.createServer();
  ws.createServer({ server }, aedes.handle);
  await new Promise((r) => server.listen(18883, r));
  const relay = 'ws://localhost:18883';
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
  const errors = [];
  const open = async (url, name) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ' PAGEERROR ' + e.message + '\n' + (e.stack || '')));
    p.on('console', (m) => { if (m.type() === 'error' && !/ERR_TUNNEL|Failed to load resource/.test(m.text())) errors.push(name + ' CONSOLE ' + m.text()); });
    await p.goto(url);
    await p.waitForTimeout(900);
    return p;
  };
  const must = (ok, what) => { if (!ok) { errors.push('FAILED: ' + what); console.log('FAILED', what); } else console.log('ok', what); };

  const host = await open(page + '?relay=' + encodeURIComponent(relay), 'host');
  await host.fill('#fName', 'Anna');
  await host.evaluate(() => { document.getElementById('fBots').value = 60; document.getElementById('fBots').dispatchEvent(new Event('input')); });
  await host.click('#fHost');
  await host.waitForSelector('#lLink', { timeout: 10000 });
  const link = await host.inputValue('#lLink');
  console.log('invite link', link.replace(/^file:.*index.html/, '…/index.html'));
  await host.screenshot({ path: path.join(__dirname, '..', 'build', 'net_1lobby.png') });

  const guest = await open(link, 'guest');
  await guest.screenshot({ path: path.join(__dirname, '..', 'build', 'net_2invited.png') });
  await guest.fill('#fName', 'Ben');
  await guest.click('.sw[data-i="1"]');
  await guest.click('#fJoin');
  await host.waitForFunction(() => G.debug.mp.players.length === 2, null, { timeout: 10000 });
  await guest.waitForFunction(() => G.debug.mp && G.debug.mp.players.length === 2, null, { timeout: 10000 });
  must(true, 'guest appears in the room on both devices');
  await host.screenshot({ path: path.join(__dirname, '..', 'build', 'net_3room.png') });
  await host.click('#lStart');
  for (const p of [host, guest]) {
    await p.waitForFunction(() => G.debug.game && G.debug.game.humans.length === 2, null, { timeout: 20000 });
    await p.evaluate(() => {
      window.sums = {};
      const g = G.debug.game, tick = g.tick;
      g.tick = function () { tick.call(g); if (g.ticks % 25 === 0) window.sums[g.ticks] = g.checksum(); };
    });
  }
  must(await guest.evaluate(() => G.debug.game.human.name) === 'Ben' && await host.evaluate(() => G.debug.game.human.name) === 'Anna', 'each device controls its own player');
  const spawn = (p, k) => p.evaluate((k) => {
    const g = G.debug.game;
    let n = 0;
    for (let t = 0; t < g.N; t += 97) if (g.canSpawnAt(t) && !g.map.shore[t] && n++ === k) { G.debug.act({ k: 'spawn', t: t }); return t; }
  }, k);
  await spawn(host, 40);
  await host.waitForTimeout(700);
  must(await host.evaluate(() => G.debug.game.phase) === 'spawn', 'game waits until everyone has a start point');
  await host.screenshot({ path: path.join(__dirname, '..', 'build', 'net_4wait.png') });
  await spawn(guest, 90);
  for (const p of [host, guest]) await p.waitForFunction(() => G.debug.game.phase === 'play', null, { timeout: 8000 });
  must(true, 'game starts on both devices once both have picked');
  const expand = (p) => p.evaluate(() => {
    const g = G.debug.game, h = g.human, W = g.W;
    for (const b of h.border) for (const n of [b - 1, b + 1, b - W, b + W]) if (g.map.land[n] && g.owner[n] !== h.id) { G.debug.act({ k: 'strike', t: n, r: 0.5 }); return; }
  });
  for (let i = 0; i < 6; i++) {
    await expand(host); await expand(guest);
    await host.waitForTimeout(2500);
    if (i === 2) {      // cut the guest's line for a moment: it must catch up from the host's log
      await guest.evaluate(() => G.debug.mp.link.ws.close());
    }
  }
  await host.waitForTimeout(3000);
  const a = await host.evaluate(() => ({ sums: window.sums, bad: G.debug.mp.bad, tiles: G.debug.game.humans.map((h) => h.tiles), T: G.debug.game.ticks }));
  const b = await guest.evaluate(() => ({ sums: window.sums, bad: G.debug.mp.bad, tiles: G.debug.game.humans.map((h) => h.tiles), T: G.debug.game.ticks }));
  let same = 0, diff = 0;
  for (const k in a.sums) if (k in b.sums) { if (a.sums[k] === b.sums[k]) same++; else diff++; }
  console.log('host tick', a.T, 'guest tick', b.T, 'tiles', a.tiles, b.tiles, 'checks equal', same, 'different', diff);
  must(same >= 4 && diff === 0 && !a.bad && !b.bad, 'both devices compute the same game');
  must(a.tiles[0] > 60 && a.tiles[1] > 60, 'orders of both players were carried out');
  must(Math.abs(a.T - b.T) < 12, 'guest keeps up after a short loss of connection');
  await guest.screenshot({ path: path.join(__dirname, '..', 'build', 'net_5play.png') });
  console.log(errors.length ? errors.join('\n') : 'no errors');
  await browser.close(); server.close(); aedes.close();
  process.exit(errors.length ? 1 : 0);
})();
