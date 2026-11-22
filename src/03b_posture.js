// Aufstellung (posture): where a realm keeps its ground troops.
//
// The land of a person is laid over a fixed grid of cells (16 x 16 tiles, never re-gridded). Every
// cell holds a share of the troops. Left alone the shares are even, which is the game as it was.
// A person can weigh cells up or down (the "net"), and the troops then march there: over time,
// slower through forest and mountains, much faster along their railways. The net is how a realm
// stands: it decides how much is at hand at a spot when an order is given, and an attacker meets
// the troops that stand where he attacks (the fight is local, see tickAttack in 03_game.js).
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
  const BASE = 20;                        // ticks to cross one cell of open ground (was 30 until 15.11.2026)
  const HAND = 4;                         // an order has at hand what stands within so many cells of the spot
  const RAIL = [0.2, 0.45, 0.75];         // a railway makes its own cell, and the cells one and two away, that much quicker to cross
  const M_MIN = 0.2, M_MAX = 6;           // range of the weight a person can give a cell
  // Defence beyond numbers:
  //   dig      entrenchment: troops that have stood in a cell for a while defend up to `dig` better
  //   digT     ticks until a cell is two thirds dug in; newcomers dilute it, fresh ground starts at 0
  //   alarm    a cell under attack calls reserves for so many ticks ...
  //   reserve  ... and while it does, it wants that many times its share
  //   cut      a pocket cut off from the coast and the main land loses that share every step of marching
  //   cutHold  and defends only that well
  const PO = G.POST = { cell: CS, flow: FLOW, mMin: M_MIN, mMax: M_MAX, dig: 0.5, digT: 600, alarm: 60, reserve: 3, cut: 0.05, cutHold: 0.6 };

  Game.prototype.postInit = function (p) {
    if (!this.CW) {
      this.CW = Math.ceil(this.W / CS); this.CH = Math.ceil(this.H / CS);
      this.cellCost = new Float32Array(this.CW * this.CH); this.cellRail = new Float32Array(this.CW * this.CH).fill(1); this.railSeen = -1;
      this.cellCoast = new Int8Array(this.CW * this.CH).fill(-1);
    }
    p.post = { cells: new Map(), H: 0, edits: 0, autoAt: 0 };
    (this.posted || (this.posted = [])).push(p);
  };
  // How well a cell holds, beyond its number of troops: dug in, or cut off.
  Game.prototype.postHold = function (c) { return (1 + PO.dig * (c.e || 0)) * (c.cut ? PO.cutHold : 1); };
  // Whether a cell has sea coast in it (a pocket on the coast is supplied by sea). Worked out once.
  Game.prototype.cellCoastal = function (id) {
    let v = this.cellCoast[id];
    if (v >= 0) return v === 1;
    const map = this.map, W = this.W, H = this.H, cx = id % this.CW, cy = (id - cx) / this.CW;
    v = 0;
    for (let y = cy * CS; y < cy * CS + CS && y < H && !v; y++) for (let x = cx * CS; x < cx * CS + CS && x < W; x++) { const t = y * W + x; if (map.land[t] && map.shore[t]) { v = 1; break; } }
    this.cellCoast[id] = v;
    return v === 1;
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
        sum += (m < 10 ? 1 : m < 20 ? 1.4 : 2) * G.groundSpeed(map, t); n++;
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
    // every cell a railway runs through gets the full speed-up; the cells one and two away a part of it
    cr.fill(1);
    const CH = this.CH;
    for (let i = 0; i < rails.length; i++) {
      const path = rails[i].path;
      for (let j = 0; j < path.length; j += 2) {
        const t = path[j], x = t % W, cx = x >> SH, cy = ((t - x) / W) >> SH;
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= CW || ny >= CH) continue;
          const f = RAIL[Math.max(Math.abs(dx), Math.abs(dy))], k = ny * CW + nx;
          if (f < cr[k]) cr[k] = f;
        }
      }
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
    if (!c) { c = { id: id, n: 0, u: 0, m: 1, want: 0, diff: 0, r: 0, d: 0, to: null, ec: 0, e: 0, alarm: -1e9, cut: false }; post.cells.set(id, c); }   // new ground starts empty and not dug in
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
      const id = c.id, cx = id % CW, sc = this.cellSlow(id) * cr[id];
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || cx + dx < 0 || cx + dx >= CW) continue;
          const nid = id + dy * CW + dx, o = cells.get(nid);
          if (!o || o.done) continue;
          const e = BASE * (sc + this.cellSlow(nid) * cr[nid]) / 2 * (dx && dy ? 1.414 : 1);
          const nd = c.d + e;
          if (nd < o.d) { o.d = nd; o.to = c; o.ec = e; heap.push(nd, o.ix); }
        }
      }
    }
  };
  // One step of marching for one realm: cells that hold more than their share send toward the
  // nearest cell that holds less.
  // Which cells are cut off: a group of cells (neighbours in eight directions) that is not the
  // largest one and has no sea coast is a pocket without supply.
  Game.prototype.postPockets = function (p) {
    const cells = p.post.cells, CW = this.CW, q = this.pocketQ || (this.pocketQ = []);
    for (const c of cells.values()) { c.grp = -1; c.cut = false; }
    const groups = [];
    for (const c of cells.values()) {
      if (c.grp >= 0) continue;
      const g = { n: 0, coast: false, list: [] };
      c.grp = groups.length; groups.push(g);
      q.length = 0; q.push(c);
      for (let i = 0; i < q.length; i++) {
        const o = q[i], cx = o.id % CW;
        g.n += o.n; g.list.push(o);
        if (!g.coast && this.cellCoastal(o.id)) g.coast = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || cx + dx < 0 || cx + dx >= CW) continue;
          const nb = cells.get(o.id + dy * CW + dx);
          if (nb && nb.grp < 0) { nb.grp = c.grp; q.push(nb); }
        }
      }
    }
    if (groups.length < 2) return;
    let main = groups[0];
    for (const g of groups) if (g.n > main.n) main = g;
    for (const g of groups) if (g !== main && !g.coast) for (const c of g.list) c.cut = true;
  };
  Game.prototype.postFlow = function (p) {
    const post = p.post, cells = post.cells, now = this.ticks;
    if (!cells.size) return;
    this.postPockets(p);
    // A cell under attack raises the alarm for its sector (the cells around it): the sector
    // wants several times its share for a while, so reserves come from further back instead of
    // out of the very cell the enemy is about to enter.
    const CW = this.CW;
    for (const c of cells.values()) c.hot = false;
    for (const c of cells.values()) {
      if (!(now - c.alarm < PO.alarm)) continue;
      const cx = c.id % CW;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (cx + dx < 0 || cx + dx >= CW) continue;
        const o = cells.get(c.id + dy * CW + dx);
        if (o) o.hot = true;
      }
    }
    let H = 0, Wt = 0;
    for (const c of cells.values()) {
      // dug in: grows toward 1 while the troops stand
      c.e = (c.e || 0) + (1 - (c.e || 0)) * FLOW / PO.digT;
      c.w = c.m * (c.hot ? PO.reserve : 1);
      H += c.u; Wt += c.n * c.w; c.r = 0;
    }
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
      c.want = base * c.n * c.w + c.r * k;
      c.diff = c.u - c.want;
      c.tol = 1e-7 * H;
      if (!c.cut && c.diff < -(0.01 * c.want + c.tol)) { from.push(c); lack -= c.diff; }      // a pocket gets nothing from outside     // a cell asks only when it is clearly short ...
    }
    if (!from.length) return;
    this.postDijkstra(p, from);
    let pool = 0;
    for (const c of cells.values()) {
      c.send = 0;
      if (!(c.diff > c.tol)) continue;                                             // .. but every cell with anything to spare gives
      if (c.to) c.send = c.diff * Math.min(1, FLOW / c.ec);
      else if (c.d > 1e17 && !c.cut) { const s = c.diff * 0.02; c.u -= s; pool += s; }    // across water: a slow trickle by boat
    }
    for (const c of cells.values()) if (c.send > 0) {
      const o = c.to;
      if (o.u + c.send > 0) o.e = (o.e || 0) * Math.max(0, o.u) / (o.u + c.send);      // newcomers are not dug in
      c.u -= c.send; o.u += c.send;
    }
    if (pool > 0 && lack > 0) for (let i = 0; i < from.length; i++) from[i].u -= pool * from[i].diff / lack;
  };
  // A pocket without supply loses troops every step and is gone after half a minute or so.
  Game.prototype.postStarve = function (p) {
    const post = p.post, T = p.troops;
    if (!(post.H > 0) || !(T > 0)) return;
    let lost = 0;
    for (const c of post.cells.values()) if (c.cut && c.u > 0) { const uu = c.u * PO.cut; c.u -= uu; lost += uu; }
    if (!(lost > 0)) return;
    const H0 = post.H;
    post.H = H0 - lost;
    p.troops = T * post.H / H0;
  };
  Game.prototype.postTick = function () {
    const ps = this.posted, T = this.ticks;
    if (!ps) return;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.post || !p.alive || (T + p.id) % FLOW !== 0) continue;
      if (p.type !== G.PT.HUMAN && T - p.post.autoAt >= AUTO) { p.post.autoAt = T; this.postAuto(p); }
      this.postFlow(p);
      this.postStarve(p);
    }
  };
  // How a nation stands: its computer decides, every few seconds, much as a person would with the
  // net. Dense along borders with realms that could hurt it (the stronger the neighbour, the
  // denser), a little less along allies, thin in the interior. Reserves for a cell under attack
  // come on top of that by themselves (`alarm`).
  const AUTO = 50;
  Game.prototype.postAuto = function (p) {
    const cells = p.post.cells, own = this.owner, W = this.W, N = this.N, ps = this.players, pid = p.id;
    for (const c of cells.values()) c.thr = 0;
    const T = Math.max(1, p.troops);
    for (const b of p.border) {
      const x = b % W;
      let thr = 0;
      for (let k = 0; k < 4; k++) {
        const n = k === 0 ? (x > 0 ? b - 1 : -1) : k === 1 ? (x < W - 1 ? b + 1 : -1) : k === 2 ? b - W : b + W;
        if (n < 0 || n >= N) continue;
        const o = own[n];
        if (!o || o === pid) continue;
        const q = ps[o];
        const v = (this.friendly(p, q) ? 0.4 : 1) * within(q.troops / T, 0.2, 2) * (q.type === G.PT.BOT ? 0.3 : 1);
        if (v > thr) thr = v;
      }
      if (thr > 0) { const c = cells.get(this.cellOf(b)); if (c && thr > c.thr) c.thr = thr; }
    }
    for (const c of cells.values()) c.m = within(c.thr > 0 ? 1 + c.thr : 0.7, M_MIN, M_MAX);     // at most 3 : 0.7, a reserve stays inland
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

  // What the defender loses with a tile, as a multiple of the average per tile, in a cell of
  // density d (1 = average). Where troops stand dense they do not all die with the tile: part of
  // them fall back into the rest of the cell, so the cell grows denser as it shrinks.
  Game.prototype.postKeep = function (d) { return d > 0 ? Math.pow(d, 0.35) : 0; };
})(globalThis.G = globalThis.G || {});
