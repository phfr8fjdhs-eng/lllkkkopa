// Drives the human player's actions with a script, to exercise everything the interface will call.
const fs = require('fs'), path = require('path');
const src = path.join(__dirname, '..', 'src');
for (const f of ['00_util.js', '01_map.js', '02_path.js', '03_game.js', '04_units.js', '04b_rail.js', '05_ai.js']) require(path.join(src, f));
const G = globalThis.G, UT = G.UT;
const sharp = require('/opt/npm-tools/node_modules/sharp');
(async () => {
  const maps = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'build', 'maps.json'), 'utf8'));
  const m = maps.find((x) => x.id === (process.argv[2] || 'europa'));
  const raw = await sharp(Buffer.from(m.png, 'base64')).raw().toBuffer({ resolveWithObject: true });
  const cls = new Uint8Array(m.w * m.h);
  for (let i = 0; i < cls.length; i++) cls[i] = Math.round(raw.data[i * raw.info.channels] / 85);
  const map = G.buildMap(m.w, m.h, cls, 12345, { id: m.id, name: m.name, nations: m.nations });
  for (const rich of [false, true]) {
    const g = new G.Game(map, { seed: rich ? 11 : 5, bots: 120, difficulty: 1, spawnTicks: 30, infiniteGold: rich, instantBuild: rich, infiniteTroops: rich });
    g.setup({ name: 'Tester', color: [220, 60, 50] });
    const h = g.human, r = new G.RNG(42);
    const stats = { strikes: 0, boats: 0, builds: new Int32Array(14), upgrades: 0, ally: 0, donate: 0, retreat: 0, nukes: 0, warmove: 0, fails: {} };
    // spawn somewhere free, twice, to test re-spawning
    for (let k = 0; k < 2; k++) { let t; do { t = r.int(0, g.N); } while (!g.canSpawnAt(t) || map.shore[t] !== 1 || g.portWater(t) < 0); if (!g.spawn(h, t)) throw new Error('spawn failed'); }
    const seen = [];
    for (let i = 0; i < 9000 && !g.winner; i++) {
      g.tick(); g.dirtyN = 0; g.dirtyFlag.fill(0);
      for (const e of g.events) { if (e.k === 'allyReq') g.answerRequest(e.id, r.chance(2)); else if (e.k === 'renew') g.renewAlliance(h, g.players[e.id]); if (e.k !== 'msg') seen.push(e.k); }
      g.events.length = 0;
      if (!h.alive || g.phase !== 'play') continue;
      if (i % 15 === 0) {
        // attack something next door, or sail somewhere
        const nb = g.neighbors(h);
        let tile = -1;
        if (nb.tn && r.chance(2)) { for (const b of h.border) { const c = [b - 1, b + 1, b - g.W, b + g.W].find((n) => n >= 0 && n < g.N && map.land[n] && g.owner[n] === 0); if (c !== undefined) { tile = c; break; } } }
        else if (nb.ids.size && r.chance(2)) { const id = [...nb.ids][r.int(0, nb.ids.size)]; const q = g.players[id]; for (let k = 0; k < 50 && tile < 0; k++) { const t = r.int(q.y0, q.y1 + 1) * g.W + r.int(q.x0, q.x1 + 1); if (g.owner[t] === id) tile = t; } }
        else { for (let k = 0; k < 50 && tile < 0; k++) { const t = r.int(0, g.N); if (map.land[t] && g.owner[t] !== h.id) tile = t; } }
        if (tile >= 0) {
          const before = h.boats, why = g.strike(h, tile, 0.2 + r.next() * 0.3);
          if (why) stats.fails[why] = (stats.fails[why] || 0) + 1; else if (h.boats > before) stats.boats++; else stats.strikes++;
        }
      }
      if (i % 40 === 0) {
        // build something
        const type = r.pick([UT.CITY, UT.CITY, UT.PORT, UT.DEFENSE, UT.SILO, UT.SAM, UT.WARSHIP, UT.ATOM, UT.HYDRO, UT.MIRV]);
        let tile = -1;
        for (let k = 0; k < 60 && tile < 0; k++) {
          const t = r.int(0, g.N);
          if (type <= UT.SAM) { const tt = r.int(h.y0, h.y1 + 1) * g.W + r.int(h.x0, h.x1 + 1); if (g.owner[tt] === h.id) tile = tt; }
          else if (type === UT.WARSHIP) { if (!map.land[t]) tile = t; }
          else if (map.land[t] && g.owner[t] && g.owner[t] !== h.id && !h.allies.has(g.owner[t])) tile = t;
        }
        if (tile >= 0) {
          const c = g.buildCheck(h, type, tile);
          if (c.ok) { const u = g.build(h, type, tile); if (!u) throw new Error('build returned null after ok check'); stats.builds[type]++; if (type >= UT.ATOM) stats.nukes++; }
          else stats.fails[G.UNAME[type] + ': ' + c.why] = (stats.fails[G.UNAME[type] + ': ' + c.why] || 0) + 1;
        }
      }
      if (i % 200 === 100) {
        for (const u of h.units) if (g.canUpgrade(h, u) && g.upgrade(h, u)) { stats.upgrades++; break; }
        const nb = g.neighbors(h); if (nb.ids.size) { const q = g.players[[...nb.ids][0]]; if (g.requestAlliance(h, q)) stats.ally++; }
        for (const e of h.allies) { if (g.donate(h, g.players[e[0]], r.chance(2) ? 'gold' : 'troops', 1000)) stats.donate++; if (r.chance(6)) g.breakAlliance(h, g.players[e[0]]); break; }
        if (h.out.length && r.chance(2)) { g.retreat(h.out[0]); stats.retreat++; }
        for (const u of h.units) if (u.type === UT.TRANSPORT && r.chance(3)) { u.retreat = true; break; }
        if (h.cnt[UT.WARSHIP]) { const w = h.units.find((u) => u.type === UT.WARSHIP); if (g.moveWarship(h, w.tile + 5)) stats.warmove++; }
        const a = g.actionsAt(h, r.int(0, g.N)); if (typeof a.why !== 'string') throw new Error('actionsAt');
      }
      if (i % 500 === 0) {
        const cnt = new Int32Array(g.players.length);
        for (let t = 0; t < g.N; t++) { const o = g.owner[t]; if (o) cnt[o]++; }
        for (let k = 1; k < g.players.length; k++) { const p = g.players[k]; if (cnt[k] !== p.tiles) throw new Error('tiles'); if (!(p.troops >= 0) || !(p.gold >= 0)) throw new Error('numbers ' + p.name + ' ' + p.troops + ' ' + p.gold); }
        for (const [t, u] of g.structAt) if (g.owner[t] !== u.owner.id) throw new Error('struct on foreign tile');
        if (h.boats < 0 || h.boats > 3) throw new Error('boat count ' + h.boats);
      }
    }
    console.log(rich ? '--- unendlich Gold, sofort bauen' : '--- normal');
    console.log('ticks', g.ticks, 'human alive', h.alive, 'tiles', (h.tiles / map.landTiles * 100).toFixed(1) + '%', 'troops', G.fmtTroops(h.troops), 'gold', G.fmt(h.gold), 'winner', g.winner ? g.winner.name : '-');
    console.log('strikes', stats.strikes, 'boats', stats.boats, 'builds', Array.from(stats.builds).map((v, i) => v ? G.UNAME[i] + ':' + v : '').filter(Boolean).join(' '), 'upgrades', stats.upgrades, 'ally', stats.ally, 'donate', stats.donate, 'retreat', stats.retreat, 'warmove', stats.warmove);
    console.log('events', [...new Set(seen)].join(','), '| fails', JSON.stringify(stats.fails));
  }
})().catch((e) => { console.error(e); process.exit(1); });
