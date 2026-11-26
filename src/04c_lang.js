(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const Game = G.Game, PT = G.PT, UT = G.UT, within = G.within;

  // ---------- mode «Langes Spiel» (opts.lang, doku/langes-spiel.md) ----------
  // Rules that only exist in the mode. The numbers are in G.LANG (src/03_game.js). Everything here
  // runs only with this.lang; the classic game never calls it.
  //
  // Every 50 ticks (5 s), spread over the players by id:
  //   - which own cells are front (touch a realm one is not allied with), and how many troops of
  //     each neighbour stand in its cells along the common border (one pass over the border tiles)
  //   - the warning «Truppen sammeln sich an deiner Grenze (X)» when that number rises fast
  //   - wear on cells far denser than the own front (from minute 20)
  // Cost: the border tiles of the realms with a net, every 5 s; nothing grows with the whole map.
  const EVERY = 50;

  Game.prototype.langTick = function () {
    const T = this.ticks, ps = this.posted;
    if (!ps || this.phase !== 'play') return;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.post || !p.alive || (T + p.id * 13) % EVERY !== 0) continue;
      const seen = this.langFront(p);
      if (p.type === PT.HUMAN) this.langMass(p, seen);
      if (T - this.playStart >= this.wearFrom) this.langWear(p);
    }
  };

  // Front cells of p (kept in p.post.front, a Set of cell ids) and, per neighbour with a net,
  // the cells of that neighbour along the border. Returns Map(neighbour id -> Set of their cells).
  Game.prototype.langFront = function (p) {
    const own = this.owner, W = this.W, N = this.N, ps = this.players, pid = p.id;
    const front = p.post.front || (p.post.front = new Set());
    front.clear();
    const seen = new Map();
    for (const t of p.border) {
      const x = t % W;
      for (let k = 0; k < 4; k++) {
        const n = k === 0 ? (x > 0 ? t - 1 : -1) : k === 1 ? (x < W - 1 ? t + 1 : -1) : k === 2 ? t - W : t + W;
        if (n < 0 || n >= N) continue;
        const o = own[n];
        if (!o || o === pid) continue;
        const q = ps[o];
        if (q.type === PT.BOT || this.friendly(p, q)) continue;
        front.add(this.cellOf(t));
        if (!q.post) continue;
        let s = seen.get(o);
        if (!s) { s = new Set(); seen.set(o, s); }
        s.add(this.cellOf(n));
      }
    }
    return seen;
  };

  // The warning: how dense a neighbour stands along the common border (1 = his average), a
  // minute ago and now. It comes only for a big rise: the density grows by G.LANG.massRise (and
  // is above average by as much), and the troops there grow by G.LANG.massShare of one's own
  // army. Plain growth of the whole realm does not count, it lifts every cell alike. Then not
  // again for that neighbour for G.LANG.massQuiet ticks.
  Game.prototype.langMass = function (p, seen) {
    const L = G.LANG, T = this.ticks, ps = this.players;
    const mass = p.mass || (p.mass = {});
    const slots = Math.round(L.massSpan / EVERY);
    for (const e of seen) {
      const q = ps[e[0]];
      let sum = 0, n = 0;
      for (const id of e[1]) { const c = q.post.cells.get(id); if (c) { sum += this.postReal(q, c); n += c.n; } }
      const dens = n > 0 && q.tiles > 0 && q.troops > 0 ? sum / n / (q.troops / q.tiles) : 1;
      let m = mass[q.id];
      if (!m) { m = mass[q.id] = { d: [], t: [], quiet: 0 }; }
      m.d.push(Math.round(dens * 1000) / 1000); m.t.push(Math.round(sum));
      if (m.d.length > slots) { m.d.shift(); m.t.shift(); }
      if (m.d.length < 2 || T < m.quiet) continue;
      // against the thinnest moment of the last minute
      let lo = 0;
      for (let j = 1; j < m.d.length; j++) if (m.d[j] < m.d[lo]) lo = j;
      const k = 1 + L.massRise;
      if (dens >= k * m.d[lo] && dens >= k && sum - m.t[lo] >= L.massShare * p.troops) {
        m.quiet = T + L.massQuiet;
        if (p === this.human) this.say('Truppen sammeln sich an deiner Grenze (' + q.name + ')', 'warn');
        this.emit({ k: 'mass', p: p.id, q: q.id });
      }
    }
    // neighbours no longer at the border are forgotten
    for (const k in mass) if (!seen.has(+k)) delete mass[k];
  };

  // Supply of a cell, 0 to 1: a railway in or next to it, an own city or port nearby. Full
  // supply means no wear at all.
  Game.prototype.langSupply = function (p, id) {
    const L = G.LANG, CW = this.CW, cx = id % CW, cy = (id - cx) / CW;
    let v = 0;
    if (this.cellRail) v = within((1 - this.cellRail[id]) / (1 - L.rail[0]), 0, 1);
    if (v >= 1) return 1;
    const CS = G.POST.cell;
    for (const u of p.units) {
      if (!u.active || !u.built || (u.type !== UT.CITY && u.type !== UT.PORT)) continue;
      const d = Math.max(Math.abs(Math.floor(u.x / CS) - cx), Math.abs(Math.floor(u.y / CS) - cy));
      if (d > 2) continue;
      const w = (u.type === UT.CITY ? within(0.4 + 0.15 * u.level, 0, 1) : 0.6) * (d <= 1 ? 1 : 0.5);
      if (w > v) v = w;
      if (v >= 1) return 1;
    }
    return v;
  };

  // Wear: a front cell more than G.LANG.wearOver times as dense as the average of the own front
  // loses G.LANG.wear of what stands above that line per minute, less with supply.
  Game.prototype.langWear = function (p) {
    const L = G.LANG, post = p.post, front = post.front;
    if (!front || front.size < 2 || !(post.H > 0) || !(p.troops > 0) || p.tiles <= 0) return;
    let sum = 0, n = 0;
    for (const id of front) { const c = post.cells.get(id); if (c && c.n > 0) { sum += this.postDens(p, c); n++; } }
    if (n < 2) return;
    const avg = sum / n, line = L.wearOver * avg, per = post.H / p.tiles, rate = L.wear * EVERY / 600;
    let lost = 0;
    for (const id of front) {
      const c = post.cells.get(id);
      if (!c || c.n <= 0) continue;
      const top = line * per * c.n;
      if (c.u <= top) continue;
      const v = this.langSupply(p, id);
      if (v >= 1) continue;
      const uu = (c.u - top) * rate * (1 - v);
      c.u -= uu; lost += uu;
    }
    if (!(lost > 0)) return;
    const H0 = post.H;
    post.H = H0 - lost;
    p.troops = p.troops * post.H / H0;
    p.wearLost = (p.wearLost || 0) + p.troops * lost / Math.max(1, post.H);
    if (p === this.human && this.ticks >= (p.wearSaid || 0)) { p.wearSaid = this.ticks + 3000; this.say('Deine Truppen an der überdichten Front nutzen sich ab. Eine Stadt oder Schiene in der Nähe versorgt sie.', 'warn'); }
  };

  // ---------- two air defences ----------
  // Class 0 (air defence) shoots at cruise missiles (later planes and short-range missiles),
  // class 1 (missile defence) at atom and hydrogen bombs and MIRV warheads.
  Game.prototype.samCan = function (u, type) {
    return u.cls ? type === UT.ATOM || type === UT.HYDRO || type === UT.WARHEAD : type === UT.CRUISE;
  };
  // Shots per salvo: class 0 G.LANG.samShots per level, class 1 1 + floor(level / 4).
  Game.prototype.samShotsOf = function (u) {
    return u.cls ? 1 + Math.floor(u.level / 4) : G.LANG.samShots * u.level;
  };
  Game.prototype.samSlots = function (u) {
    const n = this.samShotsOf(u), r = u.ready || (u.ready = []);
    while (r.length < n) r.push(0);
    if (r.length > n) r.length = n;
  };
  // Reload in ticks, times the stacking: the oldest of the own launchers of a class standing within
  // reach of each other reloads at full speed, the next at half, the third at a quarter...
  Game.prototype.samReload = function (u) {
    const L = G.LANG, base = u.cls ? Math.round(L.abmReload * 8 / (u.level + 7)) : L.samReload;
    if (u.stackSig !== this.samSig) {
      u.stackSig = this.samSig;
      const r = this.samRange(u), r2 = r * r;
      let k = 0;
      for (const v of u.owner.units) {
        if (v === u || v.type !== UT.SAM || !v.built || !v.active || (v.cls || 0) !== (u.cls || 0) || v.id > u.id) continue;
        if ((v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y) <= r2) k++;
      }
      u.stackF = Math.pow(L.abmStack, k);
    }
    return Math.round(base / u.stackF);
  };

  // ---------- digging in and defence posts ----------
  // A cell that loses nothing digs in: from 0 to 1 within G.LANG.digTicks. Every tile it loses
  // takes G.LANG.digDrop of it again. Fresh land starts at 0.
  Game.prototype.digOf = function (c) {
    if (!c || c.dig0 === undefined) return 0;
    return within((this.ticks - c.dig0) / G.LANG.digTicks, 0, 1);
  };
  Game.prototype.digLose = function (c) {
    const e = this.digOf(c), L = G.LANG;
    c.dig0 = this.ticks - Math.max(0, e - L.digDrop) * L.digTicks;
  };
  // What a defence post does to a tile it covers: [factor on losses, factor on time].
  Game.prototype.postMag = function (level) { return this.lang ? G.LANG.postLoss[0] + G.LANG.postLoss[1] * level : 3 + 2 * level; };
  Game.prototype.postSpd = function (level) { return this.lang ? 1 + G.LANG.postTime * level : 1 + 2 * level; };

})(globalThis.G = globalThis.G || {});
