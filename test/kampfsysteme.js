// The five combat systems (doku/kampfsysteme.md): who has a posture, what a tap does, the stance
// of the automatic front, the rally flags, and that every system gives the same game twice.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '03b_posture.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G;
const sharp = require('/opt/npm-tools/node_modules/sharp');
const ok = (c, msg) => { if (!c) { console.log('FAIL', msg); process.exitCode = 1; } else console.log('ok  ', msg); };
(async () => {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === 'europa');
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * raw.info.channels] / 85);
  const map = G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations, lat: m.lat, lon: m.lon });

  const run = (kampf, script) => {
    const g = new G.Game(map, { seed: 7, bots: 60, difficulty: 1, spawnTicks: 30, kampf: kampf });
    g.setup({ name: 'Tester', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(3);
    let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t]);
    g.spawn(h, t);
    const step = (n) => { for (let i = 0; i < n; i++) { g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0); g.events.length = 0; } };
    for (let k = 0; k < 30; k++) {
      let tile = -1;
      for (const b of h.border) { const c = [b - 1, b + 1, b - g.W, b + g.W].find((n) => n >= 0 && n < g.N && map.land[n] && g.owner[n] === 0); if (c !== undefined) { tile = c; break; } }
      if (tile >= 0) g.exec(h.id, { k: 'strike', t: tile, r: 0.3 });
      step(25);
    }
    if (script) script(g, h, step);
    step(600);
    return g;
  };
  const nation = (g) => g.players.find((p) => p && p.type === G.PT.NATION);

  // 1 classic and 4 arrows only: nobody stands in cells
  for (const k of [1, 4]) {
    const g = run(k);
    ok(g.kampf === k && !g.human.post && !nation(g).post, 'System ' + k + ': kein Netz, weder Mensch noch Nation');
    ok(g.exec(g.human.id, { k: 'mesh', c: [0], v: [3] }) !== '', 'System ' + k + ': Netz malen geht nicht');
  }
  // 2, 3 and 5: people and nations stand in cells
  for (const k of [2, 3, 5]) {
    const g = run(k);
    ok(!!g.human.post && !!nation(g).post, 'System ' + k + ': Mensch und Nation haben ein Netz');
  }
  // system 5 is the default
  ok(new G.Game(map, { seed: 1 }).kampf === 5, 'ohne Angabe gilt System 5 (Netz von Hand)');

  // 2: the stance shapes the net by itself
  {
    let dens = {};
    for (const st of [0, 1, 2]) {
      const g = run(2, (g, h) => { ok(g.exec(h.id, { k: 'stance', v: st }) === '', 'System 2: Haltung ' + st + ' gesetzt'); });
      const h = g.human;
      let bm = 0, bn = 0, im = 0, inn = 0;
      for (const c of h.post.cells.values()) { if (c.thr > 0) { bm += c.m; bn++; } else { im += c.m; inn++; } }
      dens[st] = { border: bm / Math.max(1, bn), inland: im / Math.max(1, inn) };
    }
    ok(dens[2].inland < dens[1].inland && dens[2].border >= dens[1].border, 'Verteidigung: Grenze dichter, Hinterland dünner als ausgeglichen (' + dens[2].border.toFixed(2) + '/' + dens[2].inland.toFixed(2) + ' gegen ' + dens[1].border.toFixed(2) + '/' + dens[1].inland.toFixed(2) + ')');
    const g = run(5);
    ok(g.exec(g.human.id, { k: 'stance', v: 0 }) !== '', 'Haltung gibt es nur in System 2');
  }
  // 3: flags pull the troops together
  {
    let flagTile = -1, near = 0, far = 0;
    const g = run(3, (g, h, step) => {
      ok(g.exec(h.id, { k: 'flag', t: 0 }) !== '', 'System 3: keine Fahne auf fremdem Land');
      flagTile = [...h.border][0];
      ok(g.exec(h.id, { k: 'flag', t: flagTile }) === '' && h.post.flags.length === 1, 'System 3: Fahne gesetzt');
    });
    const h = g.human, c0 = g.cellOf(flagTile);
    for (const c of h.post.cells.values()) { const d = g.postDens(h, c); if (c.id === c0) near = d; else if (c.m <= 0.5) far = Math.max(far, d); }
    ok(near > 2 && far < 1, 'Truppen sammeln sich an der Fahne: Dichte dort ' + near.toFixed(2) + ', weit weg höchstens ' + far.toFixed(2));
    ok(g.exec(h.id, { k: 'flag', t: flagTile }) === '' && h.post.flags.length === 0, 'Nochmal tippen nimmt die Fahne weg');
    const tiles = [...h.border];
    for (let i = 0; i < 5; i++) g.exec(h.id, { k: 'flag', t: tiles[Math.floor(i * tiles.length / 5)] });
    ok(h.post.flags.length === G.FLAG.max, 'Höchstens ' + G.FLAG.max + ' Fahnen');
  }
  // 1 classic forces the whole front, 4 arrows only forces a thrust against a nation
  {
    const pick = (g, h) => {
      for (const b of h.border) for (const n of [b - 1, b + 1, b - g.W, b + g.W]) {
        const o = g.owner[n];
        if (o && o !== h.id && g.players[o].type === G.PT.NATION) return n;
      }
      return -1;
    };
    for (const k of [1, 4]) {
      let shape = null;
      run(k, (g, h, step) => {
        step(2400);
        g.immuneUntil = 0;
        const t = pick(g, h);
        if (t < 0) return;
        g.exec(h.id, { k: 'strike', t: t, r: 0.3, w: k === 1 ? 2 : 0 });
        const at = h.out.find((a) => a.active && a.tid === g.owner[t]);
        shape = at ? (at.goal >= 0 ? 'Stoss' : 'Front') : 'nichts';
      });
      if (shape === null) console.log('skip', 'System ' + k + ': keine Nation an der Grenze');
      else ok(shape === (k === 1 ? 'Front' : 'Stoss'), 'System ' + k + ': Angriff auf eine Nation wird ' + shape);
    }
  }
  // same game twice, in every system
  for (const k of [1, 2, 3, 4, 5]) {
    const script = (g, h) => { if (k === 2) g.exec(h.id, { k: 'stance', v: 2 }); if (k === 3) g.exec(h.id, { k: 'flag', t: [...h.border][0] }); };
    const a = run(k, script), b = run(k, script);
    ok(a.checksum() === b.checksum(), 'System ' + k + ': zwei Läufe, dasselbe Spiel');
  }
})();
