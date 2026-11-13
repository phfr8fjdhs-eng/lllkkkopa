// Aufstellung (posture): where a realm keeps its ground troops.
//
// The land of a person is laid over a fixed grid of cells (16 x 16 tiles, never re-gridded). Every
// cell holds a share of the troops. Left alone the shares are even, which is the game as it was.
// A person can weigh cells up or down (the "net"), and the troops then march there: over time,
// slower through forest and mountains, much faster along their railways. The net is how a realm
// stands, not a shield: it decides how much is at hand at a spot when an order is given, it slows
// an advance through dense ground a little, and troops that stand dense lose fewer of their number.
// There is no hard limit anywhere; everything saturates smoothly.
//
// Bookkeeping: a cell stores `u`, its share in arbitrary units; `post.H` is the sum. The troops
// standing in a cell are u / H * p.troops. So everything that changes p.troops as a whole (growth,
// a boat leaving, a donation) scales every cell alike without touching a single one, and only
// local events (a fight, an order) move units. Only people have a posture; nations and bots are
// spread evenly as before.
(function (G) {
  'use strict';
  const Math = G.M;
  const Game = G.Game, within = G.within;
  const SH = 4, CS = 1 << SH;             // cell size in tiles
  const FLOW = 5;                         // ticks between two steps of marching
  const BASE = 30;                        // ticks to cross one cell of open ground
  const HAND = 4;                         // an order has at hand what stands within so many cells of the spot
  const RAIL = 0.2;                       // a railway makes a cell that much quicker to cross
  const M_MIN = 0.2, M_MAX = 6;           // range of the weight a person can give a cell
  G.POST = { cell: CS, flow: FLOW, mMin: M_MIN, mMax: M_MAX };

  Game.prototype.postInit = function (p) {
    if (!this.CW) { this.CW = Math.ceil(this.W / CS); this.CH = Math.ceil(this.H / CS); this.cellCost = new Float32Array(this.CW * this.CH); this.cellRail = new Uint8Array(this.CW * this.CH); this.railSeen = -1; }
    p.post = { cells: new Map(), H: 0, edits: 0 };
  };
  Game.prototype.cellOf = function (t) { const W = this.W, x = t % W; return (((t - x) / W) >> SH) * this.CW + (x >> SH); };

  // How slow a cell is to march through (1 = open lowland). Worked out once per cell.
  Game.prototype.cellSlow = function (id) {
    let v = this.cellCost[id];
    if (v > 0) return v;
    const map = this.map, W = this.W, H = this.H, cx = id % this.CW, cy = (id - cx) / this.CW;
    const mg = map.mag, cov = map.cover, land = map.land, TS = G.TERRAIN.speed;
    let sum = 0, n = 0;
    for (let y = cy * CS; y < cy * CS + CS && y < H; y += 2) {
      for (let x = cx * CS; x < cx * CS + CS && x < W; x += 2) {
        const t = y * W + x;
        if (land[t] !== 1) continue;
        const m = mg[t];
        sum += (m < 10 ? 1 : m < 20 ? 1.4 : 2) * (cov ? TS[cov[t]] : 1); n++;
      }
    }
    v = n ? sum / n : 1.5;
    this.cellCost[id] = v;
    return v;
  };
  // Which cells a railway runs through. Looked at again whenever the network has changed.
  Game.prototype.postRails = function () {
    const rails = this.rails || [];
    let sig = rails.length;
    for (let i = 0; i < rails.length; i++) sig = (sig * 31 + rails[i].path.length) | 0;
    if (sig === this.railSeen) return;
    this.railSeen = sig;
    const cr = this.cellRail, W = this.W, CW = this.CW;
    cr.fill(0);
    for (let i = 0; i < rails.length; i++) {
      const path = rails[i].path;
      for (let j = 0; j < path.length; j += 2) { const t = path[j], x = t % W; cr[(((t - x) / W) >> SH) * CW + (x >> SH)] = 1; }
    }
  };

  // No units anywhere (a fresh realm, or one that had lost every soldier): stand evenly.
  function even(post) {
    let H = 0;
    for (const c of post.cells.values()) { c.u = c.n * c.m; H += c.u; }
    post.H = H;
  }
  // Troops standing in a cell.
  Game.prototype.postReal = function (p, c) {
    const post = p.post;
    if (!(post.H > 0)) even(post);
    return post.H > 0 ? c.u / post.H * p.troops : 0;
  };
  // Density at a cell, 1 = the average of the realm.
  Game.prototype.postDens = function (p, c) {
    const post = p.post;
    if (!(post.H > 0)) even(post);
    if (!(post.H > 0) || c.n <= 0 || p.tiles <= 0) return 1;
    return (c.u / c.n) / (post.H / p.tiles);
  };
  // Take up to x troops out of a cell; the rest of the realm is untouched. Returns what was taken.
  Game.prototype.postTake = function (p, c, x) {
    const post = p.post, T = p.troops;
    if (!(post.H > 0)) even(post);
    if (!(x > 0) || !(T > 0) || !(post.H > 0)) return 0;
    let uu = x * post.H / T;
    if (uu > c.u) uu = c.u;
    if (uu >= post.H) uu = post.H * 0.999999;
    const got = uu / post.H * T;
    c.u -= uu; post.H -= uu; p.troops = T - got;
    return got;
  };
  // Put x troops into a cell.
  Game.prototype.postGive = function (p, c, x) {
    const post = p.post, T = p.troops;
    if (!(x > 0)) return;
    if (!(post.H > 0)) even(post);
    if (!(T > 0) || !(post.H > 0)) {
      for (const o of post.cells.values()) o.u = 0;
      c.u = 1; post.H = 1; p.troops = (T > 0 ? T : 0) + x;
      return;
    }
    const uu = x * post.H / T;
    c.u += uu; post.H += uu; p.troops = T + x;
  };

  // ---------- land changes hands ----------
  Game.prototype.postGain = function (p, t) {
    const post = p.post, id = this.cellOf(t);
    let c = post.cells.get(id);
    if (!c) { c = { id: id, n: 0, u: 0, m: 1, want: 0, diff: 0, r: 0, d: 0, to: null, ec: 0 }; post.cells.set(id, c); }   // new ground starts empty
    c.n++;
  };
  Game.prototype.postLose = function (p, t) {
    const post = p.post, id = this.cellOf(t), c = post.cells.get(id);
    if (!c) return;
    if (--c.n > 0) return;
    post.cells.delete(id);
    if (!(c.u > 0)) return;
    // the last of the cell is gone: whoever stood there falls back to the cells next to it
    const CW = this.CW, cx = id % CW, near = [];
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || cx + dx < 0 || cx + dx >= CW) continue;
        const o = post.cells.get(id + dy * CW + dx);
        if (o) near.push(o);
      }
    }
    if (near.length) { const s = c.u / near.length; for (let i = 0; i < near.length; i++) near[i].u += s; }
    else post.H -= c.u;      // cut off: they find their way back to the rest of the realm
  };

  // The own cell nearest to a tile: where troops gather for an order given there.
  Game.prototype.postGather = function (p, tile) {
    const W = this.W, CW = this.CW, tx = (tile % W) / CS - 0.5, ty = ((tile / W) | 0) / CS - 0.5;
    let best = null, bd = 1e18;
    for (const c of p.post.cells.values()) {
      const cx = c.id % CW, cy = (c.id - cx) / CW, d = (cx - tx) * (cx - tx) + (cy - ty) * (cy - ty);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  };
  Game.prototype.postCellOfAttack = function (at) {
    const post = at.a.post;
    let c = post.cells.get(at.cell);
    if (!c && at.near >= 0) { c = this.postGather(at.a, at.near); if (c) at.cell = c.id; }
    return c || null;
  };

  // ---------- orders that draw on the troops at hand ----------
  // What is ordered (`want`) is taken from the cell at the spot as far as it reaches; the rest is
  // reserved and marches there, and joins the fight as it arrives.
  Game.prototype.postDrain = function (at) {
    const a = at.a;
    if (at.want > a.troops) at.want = a.troops;
    if (at.want < 1) { at.want = 0; return; }
    const c = this.postCellOfAttack(at);
    if (!c) { at.want = 0; return; }
    // at hand: the cell at the spot and the cells around it, nearest first
    const cells = a.post.cells, CW = this.CW, cx = c.id % CW;
    let got = this.postTake(a, c, at.want);
    for (let r = 1; r <= HAND && at.want - got >= 1; r++) {
      for (let dy = -r; dy <= r && at.want - got >= 1; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if ((dy > -r && dy < r && dx > -r && dx < r) || cx + dx < 0 || cx + dx >= CW) continue;      // only the ring
          const o = cells.get(c.id + dy * CW + dx);
          if (o && o.u > 0) got += this.postTake(a, o, at.want - got);
          if (at.want - got < 1) break;
        }
      }
    }
    if (got <= 0) return;
    at.want -= got;
    this.feedAttack(at, got);
  };
  // What a click would do, for the display next to the slider: how much is at hand at once, how
  // much has to march, and roughly how long until most of it is there.
  Game.prototype.commitInfo = function (p, tile, ratio) {
    const res = { now: 0, later: 0, eta: 0 };
    if (!p.post || !p.alive || !(p.troops > 0)) return res;
    const g = this.postGather(p, tile);
    if (!g) return res;
    let pend = 0;
    for (const o of p.out) if (o.active && o.want > 0) pend += o.want;
    const want = Math.min(p.troops * ratio, Math.max(0, p.troops - pend));
    const H = p.post.H, T = p.troops, real = function (c) { return H > 0 ? c.u / H * T : 0; };   // read only: the display must not touch the game
    const CW = this.CW, gx = g.id % CW, gy = (g.id - gx) / CW;
    const near = function (c) { const x = c.id % CW, y = (c.id - x) / CW; return Math.abs(x - gx) <= HAND && Math.abs(y - gy) <= HAND; };
    let hand = 0;
    for (const c of p.post.cells.values()) if (near(c)) hand += real(c);
    res.now = Math.min(want, hand);
    res.later = want - res.now;
    if (res.later < 1) { res.later = 0; return res; }
    // everything thins by the same share; how far away does 85% of what is needed stand?
    this.postDijkstra(p, [g]);
    const list = [];
    let all = 0;
    for (const c of p.post.cells.values()) { if (near(c) || !(c.d < 1e17)) continue; all += real(c); list.push(c); }
    list.sort(function (x, y) { return x.d - y.d || x.id - y.id; });
    let acc = 0, eta = 0;
    for (let i = 0; i < list.length; i++) {
      acc += real(list[i]); eta = list[i].d;
      if (acc >= all * 0.85) break;
    }
    res.eta = eta / 10;     // seconds
    return res;
  };

  // ---------- marching ----------
  // Shortest marching time from a set of cells to every other cell of the realm; every cell
  // remembers the next cell on its way there (`to`) and what that step costs (`ec`).
  Game.prototype.postDijkstra = function (p, from) {
    const cells = p.post.cells, CW = this.CW, heap = this.postHeap || (this.postHeap = new G.Heap(1024));
    const list = this.postList || (this.postList = []);
    this.postRails();
    heap.clear(); list.length = 0;
    let i = 0;
    for (const c of cells.values()) { c.d = 1e18; c.to = null; c.ec = 0; c.ix = i++; c.done = false; list.push(c); }
    for (let k = 0; k < from.length; k++) { from[k].d = 0; heap.push(0, from[k].ix); }
    const cr = this.cellRail;
    while (heap.n > 0) {
      const c = list[heap.pop()];
      if (c.done) continue;
      c.done = true;
      const id = c.id, cx = id % CW, sc = this.cellSlow(id) * (cr[id] ? RAIL : 1);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || cx + dx < 0 || cx + dx >= CW) continue;
          const nid = id + dy * CW + dx, o = cells.get(nid);
          if (!o || o.done) continue;
          const e = BASE * (sc + this.cellSlow(nid) * (cr[nid] ? RAIL : 1)) / 2 * (dx && dy ? 1.414 : 1);
          const nd = c.d + e;
          if (nd < o.d) { o.d = nd; o.to = c; o.ec = e; heap.push(nd, o.ix); }
        }
      }
    }
  };
  // One step of marching for one realm: cells that hold more than their share send toward the
  // nearest cell that holds less.
  Game.prototype.postFlow = function (p) {
    const post = p.post, cells = post.cells;
    if (!cells.size) return;
    let H = 0, Wt = 0;
    for (const c of cells.values()) { H += c.u; Wt += c.n * c.m; c.r = 0; }
    post.H = H;
    if (!(H > 0)) { even(post); H = post.H; }
    if (!(H > 0) || !(Wt > 0)) return;
    // troops called to an order are reserved at the spot where they gather
    let R = 0;
    const T = p.troops;
    if (T > 0) {
      for (const at of p.out) {
        if (!at.active || !(at.want > 0)) continue;
        const c = this.postCellOfAttack(at);
        if (!c) continue;
        const r = Math.min(at.want, T) * H / T;
        c.r += r; R += r;
      }
    }
    let k = 1;
    if (R > H * 0.999) { k = H * 0.999 / R; R = H * 0.999; }
    const base = (H - R) / Wt, from = [];
    let lack = 0;
    for (const c of cells.values()) {
      c.want = base * c.n * c.m + c.r * k;
      c.diff = c.u - c.want;
      c.tol = 1e-7 * H;
      if (c.diff < -(0.01 * c.want + c.tol)) { from.push(c); lack -= c.diff; }     // a cell asks only when it is clearly short ...
    }
    if (!from.length) return;
    this.postDijkstra(p, from);
    let pool = 0;
    for (const c of cells.values()) {
      c.send = 0;
      if (!(c.diff > c.tol)) continue;                                             // .. but every cell with anything to spare gives
      if (c.to) c.send = c.diff * Math.min(1, FLOW / c.ec);
      else if (c.d > 1e17) { const s = c.diff * 0.02; c.u -= s; pool += s; }    // cut off by water or foreign land: a slow trickle by other ways
    }
    for (const c of cells.values()) if (c.send > 0) { c.u -= c.send; c.to.u += c.send; }
    if (pool > 0 && lack > 0) for (let i = 0; i < from.length; i++) from[i].u -= pool * from[i].diff / lack;
  };
  Game.prototype.postTick = function () {
    const hs = this.humans, T = this.ticks;
    for (let i = 0; i < hs.length; i++) {
      const p = hs[i];
      if (p.post && p.alive && (T + p.id) % FLOW === 0) this.postFlow(p);
    }
  };

  // ---------- the net ----------
  // cells: ids, vals: the weight each of them gets.
  Game.prototype.postPaint = function (p, ids, vals) {
    if (!p.post || !Array.isArray(ids) || !Array.isArray(vals) || ids.length > 600) return false;
    const cells = p.post.cells;
    for (let i = 0; i < ids.length; i++) {
      const c = cells.get(ids[i] | 0), v = +vals[i];
      if (c && v === v) c.m = within(v, M_MIN, M_MAX);
    }
    p.post.edits++;
    return true;
  };
  Game.prototype.postReset = function (p) {
    if (!p.post) return false;
    for (const c of p.post.cells.values()) c.m = 1;
    p.post.edits++;
    return true;
  };

  // What dense ground does to an attack on it. d is the density of the defender's cell (1 =
  // average), `rough` whether the ground is narrow (forest, mountains, a river): there a few hold
  // as well as many, so more troops stop adding sooner. Smooth, with no limit to bump into.
  //   brake: factor on the time a tile costs the attacker (1 at average density)
  //   bleed: factor on what a tile costs the attacker in troops
  //   keep:  factor on what the defender loses per tile, as a multiple of the average
  Game.prototype.postEffect = function (d, rough, out) {
    const s = rough ? 1.2 : 2.5, f = (1 + s) * d / (s + d);     // 0 at d = 0, 1 at d = 1, saturates at 1 + s
    out.brake = 0.4 + 0.6 * f;
    out.bleed = 0.7 + 0.3 * f;
    out.keep = d > 0 ? Math.pow(d, 0.35) : 0;
  };
})(globalThis.G = globalThis.G || {});
