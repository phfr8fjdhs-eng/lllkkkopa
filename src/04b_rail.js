(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  // Factories, railways and trains. A factory links itself to nearby cities, ports and factories
  // with tracks laid over land; trains run along them and pay gold at every station they reach.
  const Game = G.Game, UT = G.UT;
  // Gold per station a train reaches: own station, a trade partner's, an ally's (as in OpenFront: 10K / 25K / 50K).
  const TRAIN_OWN = 10000, TRAIN_FOREIGN = 25000, TRAIN_ALLY = 50000, TRAIN_EVERY = 200, LINKS = 4;
  G.TRAIN_GOLD = [TRAIN_OWN, TRAIN_FOREIGN, TRAIN_ALLY];

  G.isStation = function (t) { return t === UT.CITY || t === UT.PORT || t === UT.FACTORY; };

  // Shortest land route between two tiles, searched inside a box around them. Returns tiles from a to b.
  Game.prototype.railPath = function (a, b) {
    const W = this.W, H = this.H, land = this.map.land, pad = 14;
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
    const x0 = Math.max(0, Math.min(ax, bx) - pad), x1 = Math.min(W - 1, Math.max(ax, bx) + pad);
    const y0 = Math.max(0, Math.min(ay, by) - pad), y1 = Math.min(H - 1, Math.max(ay, by) + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, n = w * h;
    const prev = new Int32Array(n).fill(-2), q = new Int32Array(n);
    const start = (by - y0) * w + (bx - x0), goal = (ay - y0) * w + (ax - x0);
    let qh = 0, qt = 0;
    q[qt++] = start; prev[start] = -1;
    while (qh < qt && prev[goal] === -2) {
      const c = q[qh++], cx = c % w, cy = (c / w) | 0;
      for (let k = 0; k < 8; k++) {
        const dx = k === 0 ? 1 : k === 1 ? -1 : k < 4 ? 0 : (k & 1 ? 1 : -1);
        const dy = k === 2 ? 1 : k === 3 ? -1 : k < 4 ? 0 : (k < 6 ? 1 : -1);
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const m = ny * w + nx;
        if (prev[m] !== -2 || !land[(ny + y0) * W + nx + x0]) continue;
        if (dx && dy && !land[(cy + y0) * W + nx + x0] && !land[(ny + y0) * W + cx + x0]) continue;
        prev[m] = c; q[qt++] = m;
      }
    }
    if (prev[goal] === -2) return null;
    const raw = [];
    for (let c = goal; c !== -1; c = prev[c]) raw.push(((c / w | 0) + y0) * W + (c % w) + x0);
    return this.straighten(raw);
  };

  // Can a track run in a straight line between two tiles without touching water?
  Game.prototype.landLine = function (a, b) {
    const W = this.W, land = this.map.land;
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2;
    for (let i = 1; i < n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      if (!land[Math.round(y) * W + Math.round(x)]) return false;
      if (!land[Math.floor(y) * W + Math.floor(x)] || !land[Math.ceil(y) * W + Math.ceil(x)]) return false;
    }
    return true;
  };
  // Replace the stair-stepped search result by a few long straight stretches.
  // Returns the tiles to travel along; the corner tiles are kept in `.pts` for drawing.
  Game.prototype.straighten = function (raw) {
    const W = this.W, pts = [raw[0]];
    let i = 0;
    while (i < raw.length - 1) {
      let j = Math.min(raw.length - 1, i + 60);
      while (j > i + 1 && !this.landLine(raw[i], raw[j])) j = i + ((j - i) >> 1);
      pts.push(raw[j]); i = j;
    }
    const out = [pts[0]];
    for (let k = 1; k < pts.length; k++) {
      const a = pts[k - 1], b = pts[k];
      const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
      const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
      for (let s = 1; s <= n; s++) {
        const t = Math.round(ay + (by - ay) * s / n) * W + Math.round(ax + (bx - ax) * s / n);
        if (t !== out[out.length - 1]) out.push(t);
      }
    }
    const path = Int32Array.from(out);
    path.pts = Int32Array.from(pts);
    return path;
  };

  // Bring the network in line with the stations that exist now. Works in small steps so a big map never stalls.
  Game.prototype.rebuildRails = function () {
    const W = this.W, range2 = this.R.rail * this.R.rail;
    const keep = [];
    for (const e of this.rails) {
      if (e.a.active && e.b.active && e.a.built && e.b.built) keep.push(e);
      else this.railKeys.delete(e.key);
    }
    this.rails = keep;
    const stations = [], factories = [];
    for (const u of this.structAt.values()) {
      if (!u.built || !G.isStation(u.type)) continue;
      stations.push(u);
      if (u.type === UT.FACTORY) factories.push(u);
    }
    let budget = 6, more = false;
    for (const f of factories) {
      const near = [];
      for (const s of stations) {
        if (s === f) continue;
        const d = (s.x - f.x) * (s.x - f.x) + (s.y - f.y) * (s.y - f.y);
        if (d <= range2) near.push({ s: s, d: d });
      }
      near.sort(function (m, n) { return m.d - n.d || m.s.id - n.s.id; });
      for (let i = 0; i < near.length && i < LINKS; i++) {
        const s = near[i].s, key = Math.min(f.id, s.id) + '_' + Math.max(f.id, s.id);
        if (this.railKeys.has(key) || this.railBad.has(key)) continue;
        if (budget <= 0) { more = true; break; }
        budget--;
        const path = this.railPath(f.tile, s.tile);
        if (!path) { this.railBad.add(key); continue; }
        let x0 = W, x1 = 0, y0 = this.H, y1 = 0;
        for (let j = 0; j < path.length; j++) {
          const x = path[j] % W, y = (path[j] / W) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        const e = { key: key, a: f, b: s, path: path, x0: x0, x1: x1, y0: y0, y1: y1 };
        this.rails.push(e); this.railKeys.set(key, e);
      }
    }
    const adj = new Map();
    for (const e of this.rails) {
      if (!adj.has(e.a.id)) adj.set(e.a.id, []);
      if (!adj.has(e.b.id)) adj.set(e.b.id, []);
      adj.get(e.a.id).push(e); adj.get(e.b.id).push(e);
    }
    this.railAdj = adj;
    this.railDirty = more;
    this.railAt = this.ticks + (more ? 2 : 10);
  };

  // Pick a track leaving this station that the train's owner may use.
  Game.prototype.railNext = function (p, st, not) {
    const list = this.railAdj.get(st.id);
    if (!list) return null;
    const ok = [];
    for (const e of list) {
      if (e === not) continue;
      const o = (e.a === st ? e.b : e.a).owner;
      if (o === p || (o.alive && this.canTrade(p, o))) ok.push(e);
    }
    return ok.length ? ok[this.rng.int(0, ok.length)] : null;
  };

  Game.prototype.tickRail = function () {
    if (this.railDirty && this.ticks >= this.railAt) this.rebuildRails();
    if (this.ticks % 10) return;
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY || !u.built || this.ticks < u.nextTrain) continue;
      const p = u.owner;
      if (!p.alive) continue;
      u.nextTrain = this.ticks + Math.round(TRAIN_EVERY * 2 / (1 + u.level)) + this.rng.int(0, 60);
      if (p.cnt[UT.TRAIN] >= 2 * p.cnt[UT.FACTORY] + 1) continue;
      const e = this.railNext(p, u, null);
      if (!e) continue;
      const t = this.newUnit(UT.TRAIN, p, u.tile);
      t.edge = e; t.fwd = e.a === u; t.pi = t.fwd ? 0 : e.path.length - 1; t.hops = 3;
      this.addUnit(t);
    }
  };

  Game.prototype.tickTrain = function (u) {
    const e = u.edge, p = u.owner;
    if (!e.a.active || !e.b.active || !p.alive) { this.removeUnit(u); return; }
    const end = u.fwd ? e.path.length - 1 : 0;
    if (u.pi !== end) {
      u.pi += u.fwd ? 1 : -1;
      this.setPos(u, e.path[u.pi]);
      const o = this.owner[u.tile];
      if (o && o !== p.id && !this.canTrade(p, this.players[o])) this.removeUnit(u);   // rolled into hostile land
      return;
    }
    const st = u.fwd ? e.b : e.a, q = st.owner, h = this.human;
    let pay = TRAIN_OWN;
    if (q === p) p.gold += pay;
    else if (q.alive && this.canTrade(p, q)) {
      pay = p.allies.has(q.id) ? TRAIN_ALLY : TRAIN_FOREIGN;
      p.gold += pay; q.gold += pay;
      if (h && (p === h || q === h)) h.tradeGold += pay;
    } else { this.removeUnit(u); return; }
    if (h && p === h) h.trainGold = (h.trainGold || 0) + pay;
    this.fx.push({ k: 'coin', x: st.x, y: st.y, t: this.ticks, mine: p === h || q === h, amt: pay });
    if (this.fx.length > 300) this.fx.splice(0, 150);
    const nx = --u.hops > 0 ? this.railNext(p, st, e) : null;
    if (!nx) { this.removeUnit(u); return; }
    u.edge = nx; u.fwd = nx.a === st; u.pi = u.fwd ? 0 : nx.path.length - 1;
  };
})(globalThis.G = globalThis.G || {});
