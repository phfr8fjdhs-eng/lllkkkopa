(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  // Factories, railways and trains. A factory links itself to nearby cities, ports and factories
  // with tracks laid over land; trains run along them and pay gold at every station they reach.
  const Game = G.Game, UT = G.UT;
  // Gold per station a train reaches: own station, a trade partner's, an ally's (as in OpenFront: 10K / 25K / 35K).
  // From the tenth station of its journey on a train pays 5K less per stop, but never under 5K.
  const TRAIN_OWN = 10000, TRAIN_FOREIGN = 25000, TRAIN_ALLY = 35000, TRAIN_EVERY = 200, HOPS = 4;

  G.isStation = function (t) { return t === UT.CITY || t === UT.PORT || t === UT.FACTORY; };

  // Switch `bahn` (22.11.2026): trains carry goods from a factory to a city or port of the network
  // and are paid on arrival.
  //   base       gold for a delivery to a city of level 1 over a short way
  //   every      ticks between two trains of a factory of level 1; level L sends every every/sqrt(L)
  //   way        a long way pays up to (1 + way) times as much (it also takes longer, so the gold per
  //              minute of a line stays about the same whatever its length)
  //   ally       a delivery into an ally's city pays the sender that many times, the ally half of it
  //   cut        ticks a track stays closed after a train found it running through hostile land
  //   factoryGap factories stand that many times the usual room between buildings apart
  // A city or port of level L pays sqrt(L) times the base: every level brings more, each a
  // little less than the one before (from level 3 on every level costs the same 1M).
  G.BAHN = { base: 30000, every: 200, way: 1, ally: 1.5, cut: 300, factoryGap: 3 };

  // A track between two stations, the way OpenFront lays it: only along the two axes of the map,
  // never at a slant, and every bend costs as much as three tiles of straight track. So a line
  // runs in long straight stretches with a few right-angled corners, like a drawn plan. Tiles on
  // the shore cost extra, which keeps tracks off the beaches. Searched (Dijkstra over tile and
  // heading) inside a box around the two ends; returns the tiles from a to b, the corners in
  // `.pts` for drawing, or null if there is no way over land or it would be too long.
  const TURN = 3, SHORE = 2, DX = [1, -1, 0, 0], DY = [0, 0, 1, -1];
  Game.prototype.railPath = function (a, b) {
    const W = this.W, H = this.H, land = this.map.land, shore = this.map.shore, pad = 24;
    const ax = a % W, ay = (a / W) | 0, bx = b % W, by = (b / W) | 0;
    const x0 = Math.max(0, Math.min(ax, bx) - pad), x1 = Math.min(W - 1, Math.max(ax, bx) + pad);
    const y0 = Math.max(0, Math.min(ay, by) - pad), y1 = Math.min(H - 1, Math.max(ay, by) + pad);
    const w = x1 - x0 + 1, h = y1 - y0 + 1, n = w * h;
    const dist = new Float32Array(n * 4).fill(1e9), prev = new Int32Array(n * 4).fill(-1), done = new Uint8Array(n * 4);
    const heap = this.railHeap || (this.railHeap = new G.Heap(4096));
    heap.clear();
    const start = (by - y0) * w + (bx - x0), goal = (ay - y0) * w + (ax - x0);
    for (let d = 0; d < 4; d++) { dist[start * 4 + d] = 0; heap.push(0, start * 4 + d); }
    let found = -1;
    while (heap.n > 0) {
      const s = heap.pop();
      if (done[s]) continue;
      done[s] = 1;
      const c = s >> 2, d = s & 3;
      if (c === goal) { found = s; break; }
      const cx = c % w, cy = (c - cx) / w, ds = dist[s];
      for (let k = 0; k < 4; k++) {
        if ((k ^ 1) === d && c !== start) continue;                  // no turning back on itself
        const nx = cx + DX[k], ny = cy + DY[k];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const t = (ny + y0) * W + nx + x0;
        if (!land[t]) continue;
        const ns = (ny * w + nx) * 4 + k;
        if (done[ns]) continue;
        const nd = ds + 1 + (k !== d ? TURN : 0) + (shore[t] ? SHORE : 0);
        if (nd < dist[ns]) { dist[ns] = nd; prev[ns] = s; heap.push(nd, ns); }
      }
    }
    if (found < 0) return null;
    const out = [], pts = [];
    let last = -1;
    for (let s = found; s !== -1; s = prev[s]) {
      const c = s >> 2, t = ((c / w | 0) + y0) * W + (c % w) + x0;
      if (out.length && t === out[out.length - 1]) continue;
      out.push(t);
    }
    if (out.length > this.R.rail * 2) return null;                   // as in OpenFront a single track has a longest length
    for (let i = 0; i < out.length; i++) {
      const d = i < out.length - 1 ? out[i + 1] - out[i] : last;
      if (i === 0 || i === out.length - 1 || d !== last) pts.push(out[i]);
      last = d;
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
    // The network grows the way OpenFront's does: a station is only tied in if it cannot already be
    // reached over four tracks or fewer, and a newcomer is joined to the nearest station of the
    // network instead of always to the factory. That gives a branching web without tracks lying on
    // top of or across each other.
    const links = new Map(), byId = new Map();
    for (const s of stations) byId.set(s.id, s);
    const tie = function (e) {
      if (!links.has(e.a.id)) links.set(e.a.id, []);
      if (!links.has(e.b.id)) links.set(e.b.id, []);
      links.get(e.a.id).push(e.b.id); links.get(e.b.id).push(e.a.id);
    };
    for (const e of this.rails) tie(e);
    const hopsFrom = function (id) {      // how many tracks away every connected station is
      const hop = new Map([[id, 0]]);
      let frontier = [id];
      while (frontier.length) {
        const next = [];
        for (const c of frontier) for (const n of links.get(c) || []) if (!hop.has(n)) { hop.set(n, hop.get(c) + 1); next.push(n); }
        frontier = next;
      }
      return hop;
    };
    let budget = 6, more = false;
    for (const f of factories) {
      const near = [];
      for (const s of stations) {
        if (s === f) continue;
        // only the factory owner's own stations and those of allies: a track to a foreign station
        // carried no train of his anyway and ran across other realms (until 23.11.2026)
        if (s.owner !== f.owner && !this.friendly(f.owner, s.owner)) continue;
        const d = (s.x - f.x) * (s.x - f.x) + (s.y - f.y) * (s.y - f.y);
        if (d <= range2) near.push({ s: s, d: d });
      }
      near.sort(function (m, n) { return m.d - n.d || m.s.id - n.s.id; });
      let hop = hopsFrom(f.id);
      for (let i = 0; i < near.length; i++) {
        const s = near[i].s, far = hop.get(s.id);
        if (far !== undefined && (this.bahn || far <= HOPS)) continue;     // with `bahn` a tree: one way to every station
        // join it to the closest station that is already part of this factory's network
        let from = f, bd = near[i].d;
        if (far === undefined) for (const id of hop.keys()) {
          const c = byId.get(id);
          if (!c || c === f) continue;
          const d = (c.x - s.x) * (c.x - s.x) + (c.y - s.y) * (c.y - s.y);
          if (d < bd || (d === bd && c.id < from.id)) { bd = d; from = c; }
        }
        // Two tracks must not leave a station side by side. If a station that is already tied to
        // `from` lies almost in the same direction and nearer to the newcomer, the new track
        // branches off there instead, so the network forks cleanly instead of fanning out.
        for (let turn = 0; turn < 3; turn++) {
          const vx = s.x - from.x, vy = s.y - from.y, vl = Math.sqrt(vx * vx + vy * vy) || 1;
          let via = null, vd = vl * vl;
          for (const id of links.get(from.id) || []) {
            const c = byId.get(id);
            if (!c || c === s) continue;
            const cx = c.x - from.x, cy = c.y - from.y, cl = Math.sqrt(cx * cx + cy * cy) || 1;
            if ((vx * cx + vy * cy) / (vl * cl) < 0.88) continue;            // more than about 28 degrees apart: fine
            const d = (c.x - s.x) * (c.x - s.x) + (c.y - s.y) * (c.y - s.y);
            if (d < vd || (d === vd && via && c.id < via.id)) { vd = d; via = c; }
          }
          if (!via) break;
          from = via;
        }
        let key = Math.min(from.id, s.id) + '_' + Math.max(from.id, s.id);
        if (this.railBad.has(key) && from !== f) { from = f; key = Math.min(f.id, s.id) + '_' + Math.max(f.id, s.id); }
        if (this.railKeys.has(key) || this.railBad.has(key)) continue;
        if (budget <= 0) { more = true; break; }
        budget--;
        const path = this.railPath(from.tile, s.tile);
        if (!path) { this.railBad.add(key); continue; }
        let x0 = W, x1 = 0, y0 = this.H, y1 = 0;
        for (let j = 0; j < path.length; j++) {
          const x = path[j] % W, y = (path[j] / W) | 0;
          if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        }
        const e = { key: key, a: from, b: s, path: path, x0: x0, x1: x1, y0: y0, y1: y1 };
        this.rails.push(e); this.railKeys.set(key, e);
        tie(e); hop = hopsFrom(f.id);
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
  // Switch `bahn`: whether a track can carry p's trains now: both ends are p's or an ally's, and it
  // is not closed after running through hostile land.
  Game.prototype.railOpen = function (p, e) {
    if ((e.cutUntil || 0) > this.ticks) return false;
    const a = e.a.owner, b = e.b.owner;
    return (a === p || p.allies.has(a.id)) && (b === p || p.allies.has(b.id));
  };
  // Every city and port a factory's trains can reach, with the tracks of the way there (breadth
  // first over the stations, so the way with the fewest tracks) and its length in tiles.
  Game.prototype.railTargets = function (f) {
    const p = f.owner, seen = new Map([[f.id, null]]), out = [];
    let frontier = [f];
    while (frontier.length) {
      const next = [];
      for (const st of frontier) {
        for (const e of this.railAdj.get(st.id) || []) {
          const o = e.a === st ? e.b : e.a;
          if (seen.has(o.id) || !o.active || !o.built || !this.railOpen(p, e)) continue;
          seen.set(o.id, { e: e, from: st });
          next.push(o);
          if (o.type === UT.CITY || o.type === UT.PORT) {
            const way = [];
            let len = 0;
            for (let c = o; seen.get(c.id); c = seen.get(c.id).from) { const s = seen.get(c.id); way.unshift(s.e); len += s.e.path.length; }
            out.push({ st: o, way: way, len: len });
          }
        }
      }
      frontier = next;
    }
    return out;
  };
  // For the build preview (switch `bahn`): what a new building of `type` at `tile` would bring by
  // rail, roughly, in gold per minute, and which factories it would hang on. Reads the game only.
  Game.prototype.railGuess = function (p, type, tile) {
    const W = this.W, x = tile % W, y = (tile / W) | 0, rr = this.R.rail * this.R.rail, B = G.BAHN, res = { perMin: 0, factories: [], stations: 0 };
    const near = function (u) { return (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= rr; };
    if (type === UT.FACTORY) {
      // a new factory: one train every B.every ticks, shared out over the cities and ports in reach
      let pay = 0;
      for (const u of p.units) if (u.built && (u.type === UT.CITY || u.type === UT.PORT) && near(u)) { res.stations++; pay += this.deliveryPay(p, u, Math.sqrt((u.x - x) * (u.x - x) + (u.y - y) * (u.y - y)) * 1.3); }
      if (res.stations) res.perMin = 600 / B.every * pay / res.stations;
      return res;
    }
    // a new city or port: a share of the trains of every own factory in reach
    for (const f of p.units) {
      if (f.type !== UT.FACTORY || !f.built || !near(f)) continue;
      res.factories.push(f);
      const n = this.railTargets(f).length + 1, d = Math.sqrt((f.x - x) * (f.x - x) + (f.y - y) * (f.y - y)) * 1.3;
      res.perMin += 600 / (B.every / Math.sqrt(Math.max(1, f.level))) / n * this.deliveryPay(p, { level: 1, owner: p }, d);
    }
    return res;
  };
  // What a delivery to station `st` pays its sender p, over a way of `len` tiles.
  Game.prototype.deliveryPay = function (p, st, len) {
    const B = G.BAHN, way = 1 + B.way * Math.min(1, len / Math.max(1, 2 * this.R.rail));
    return Math.round(B.base * Math.sqrt(Math.max(1, st.level)) * way * (st.owner === p ? 1 : B.ally));
  };

  Game.prototype.tickRail = function () {
    if (this.railDirty && this.ticks >= this.railAt) this.rebuildRails();
    if (this.ticks % 10) return;
    if (this.bahn) { this.tickDeliveries(); return; }
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY || !u.built || this.ticks < u.nextTrain) continue;
      const p = u.owner;
      if (!p.alive) continue;
      u.nextTrain = this.ticks + Math.round(TRAIN_EVERY * 2 / (1 + u.level)) + this.rng.int(0, 60);
      if (p.cnt[UT.TRAIN] >= 2 * p.cnt[UT.FACTORY] + 1) continue;
      const e = this.railNext(p, u, null);
      if (!e) continue;
      const t = this.newUnit(UT.TRAIN, p, u.tile);
      t.edge = e; t.fwd = e.a === u; t.pi = t.fwd ? 0 : e.path.length - 1; t.hops = 4;
      this.addUnit(t);
    }
  };

  // Switch `bahn`: every factory sends a train every G.BAHN.every / sqrt(level) ticks to the next
  // city or port of its network in turn (so every station gets its share), on the way there.
  Game.prototype.tickDeliveries = function () {
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY || !u.built || this.ticks < u.nextTrain) continue;
      const p = u.owner;
      if (!p.alive) continue;
      u.nextTrain = this.ticks + Math.round(G.BAHN.every / Math.sqrt(Math.max(1, u.level))) + this.rng.int(0, 20);
      const ts = this.railTargets(u);
      if (!ts.length) continue;
      u.turn = ((u.turn || 0) + 1) % ts.length;
      const tg = ts[u.turn];
      const t = this.newUnit(UT.TRAIN, p, u.tile);
      t.way = tg.way; t.wi = 0; t.goal = tg.st; t.len = tg.len; t.at = u;
      const e = tg.way[0];
      t.edge = e; t.fwd = e.a === u; t.pi = t.fwd ? 0 : e.path.length - 1;
      this.addUnit(t);
    }
  };
  // A delivery train: along its way, track by track; paid when it reaches its goal.
  Game.prototype.tickDelivery = function (u) {
    const p = u.owner;
    let e = u.edge;
    if (!e.a.active || !e.b.active || !p.alive || !u.goal.active) { this.removeUnit(u); return; }
    const end = u.fwd ? e.path.length - 1 : 0;
    if (u.pi !== end) {
      for (let n = this.stride(u, this.pace0); n > 0 && u.pi !== end; n--) {
        u.pi += u.fwd ? 1 : -1;
        this.setPos(u, e.path[u.pi]);
        const o = this.owner[u.tile];
        if (o && o !== p.id && !p.allies.has(o)) { e.cutUntil = this.ticks + G.BAHN.cut; this.removeUnit(u); return; }   // the line is cut
      }
      return;
    }
    const st = u.fwd ? e.b : e.a;
    if (st !== u.goal) {
      const nx = u.way[++u.wi];
      if (!nx || !this.railOpen(p, nx)) { this.removeUnit(u); return; }
      u.edge = nx; u.fwd = nx.a === st; u.pi = u.fwd ? 0 : nx.path.length - 1;
      return;
    }
    const q = st.owner, h = this.human;
    if (q !== p && !p.allies.has(q.id)) { this.removeUnit(u); return; }
    const pay = this.deliveryPay(p, st, u.len);
    p.gold += pay;
    if (q !== p) q.gold += Math.round(pay / G.BAHN.ally / 2);
    this.railPaid = (this.railPaid || 0) + pay;
    if (h && (p === h || q === h)) { h.trainGold = (h.trainGold || 0) + pay; h.trainTotal = (h.trainTotal || 0) + pay; }
    this.fx.push({ k: 'coin', x: st.x, y: st.y, t: this.ticks, mine: p === h || q === h, amt: pay });
    if (this.fx.length > 300) this.fx.splice(0, 150);
    if (st.type === UT.PORT && this.hafen) this.portCargo(st, pay);      // goods for the sea trade
    this.removeUnit(u);
  };

  Game.prototype.tickTrain = function (u) {
    if (u.way) { this.tickDelivery(u); return; }
    const e = u.edge, p = u.owner;
    if (!e.a.active || !e.b.active || !p.alive) { this.removeUnit(u); return; }
    const end = u.fwd ? e.path.length - 1 : 0;
    if (u.pi !== end) {
      for (let n = this.stride(u, this.pace0); n > 0 && u.pi !== end; n--) {
        u.pi += u.fwd ? 1 : -1;
        this.setPos(u, e.path[u.pi]);
        const o = this.owner[u.tile];
        if (o && o !== p.id && !this.canTrade(p, this.players[o])) { this.removeUnit(u); return; }   // rolled into hostile land
      }
      return;
    }
    const st = u.fwd ? e.b : e.a, q = st.owner, h = this.human;
    u.stops = (u.stops || 0) + 1;
    const worn = Math.max(0, u.stops - 9) * 5000;
    let pay = Math.max(5000, TRAIN_OWN - worn);
    this.railPaid = (this.railPaid || 0) + pay;
    if (q === p) p.gold += pay;
    else if (q.alive && this.canTrade(p, q)) {
      pay = Math.max(5000, (p.allies.has(q.id) ? TRAIN_ALLY : TRAIN_FOREIGN) - worn);
      p.gold += pay; q.gold += pay;
    } else { this.removeUnit(u); return; }
    // what the railways bring the player is kept apart from the sea trade, so each can be shown
    if (h && (p === h || q === h)) { h.trainGold = (h.trainGold || 0) + pay; h.trainTotal = (h.trainTotal || 0) + pay; }
    this.fx.push({ k: 'coin', x: st.x, y: st.y, t: this.ticks, mine: p === h || q === h, amt: pay });
    if (this.fx.length > 300) this.fx.splice(0, 150);
    // at the end of a branch the train turns round
    const nx = --u.hops > 0 ? (this.railNext(p, st, e) || this.railNext(p, st, null)) : null;
    if (!nx) { this.removeUnit(u); return; }
    u.edge = nx; u.fwd = nx.a === st; u.pi = u.fwd ? 0 : nx.path.length - 1;
  };
})(globalThis.G = globalThis.G || {});
