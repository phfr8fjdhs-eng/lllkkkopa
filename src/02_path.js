(function (G) {
  'use strict';

  // Sea routes: weighted A* over water tiles, eight directions, no cutting across land corners.
  // A search can be worked on in slices, so one long route never stalls a step of the game.
  //
  // Memory matters here: the Earth map has close to fourteen million tiles. Per tile a search
  // keeps the cost so far (4 bytes), the direction it was reached from (1 byte) and two stamps
  // that say whether the tile was seen and settled in this search (2 x 2 bytes). A search with a
  // `cap` works in a window around start and goal instead of on the whole map, with arrays of
  // only `cap` tiles: that is the lane for a warship's short hops.
  const DX = [-1, 1, 0, 0, -1, 1, -1, 1], DY = [0, 0, -1, 1, -1, -1, 1, 1];
  const COST = [1, 1, 1, 1, 1.4142, 1.4142, 1.4142, 1.4142];

  function Pathfinder(map, cap) {
    const n = cap || map.N;
    this.map = map; this.cap = cap || 0;
    this.gs = new Float32Array(n); this.dir = new Uint8Array(n);
    this.seen = new Uint16Array(n); this.done = new Uint16Array(n);
    this.sid = 0; this.heap = new G.Heap(8192);
    this.bx = 0; this.by = 0; this.bw = map.W; this.bh = map.H;      // the window (the whole map without a cap)
    this.state = 2; this.src = -1; this.dst = -1; this.exp = 0;       // state: 0 running, 1 found, 2 no route
    this.shy = false; this.limit = 900000; this.gaveUp = false;
  }

  // Returns false when there cannot be a route (land, or separate bodies of water).
  // `shy`: keep clear of the coast where there is room (warships). Tiles within three of land
  // cost extra, so the route swings out to sea but still goes through a strait if it has to.
  // `limit`: give up after that many tiles (`gaveUp` then tells a search that was cut short
  // from one that found there is no way).
  // `lane`: search only inside a corridor of the sea graph (see SeaGraph below): { box: [x0, y0,
  // x1, y1], cells, id, cw } - a tile may be used if cells[its cell] === id.
  Pathfinder.prototype.start = function (src, dst, shy, limit, lane) {
    const map = this.map, land = map.land, W = map.W, H = map.H;
    this.state = 2; this.shy = !!shy; this.limit = limit || 900000; this.gaveUp = false; this.lane = lane || null;
    if (src < 0 || dst < 0 || land[src] || land[dst] || map.wcomp[src] !== map.wcomp[dst] || src === dst) return false;
    if (this.cap) {
      // a window around both ends, padded so the route can swing round a headland
      const sx = src % W, sy = (src / W) | 0, tx = dst % W, ty = (dst / W) | 0, pad = 48;
      let x0 = Math.max(0, Math.min(sx, tx) - pad), x1 = Math.min(W - 1, Math.max(sx, tx) + pad);
      let y0 = Math.max(0, Math.min(sy, ty) - pad), y1 = Math.min(H - 1, Math.max(sy, ty) + pad);
      if (lane) { x0 = lane.box[0]; y0 = lane.box[1]; x1 = lane.box[2]; y1 = lane.box[3]; }
      const bw = x1 - x0 + 1, bh = y1 - y0 + 1;
      if (bw * bh > this.cap) { this.gaveUp = true; this.state = 2; this.src = src; this.dst = dst; return true; }   // too far apart for this lane
      this.bx = x0; this.by = y0; this.bw = bw; this.bh = bh;
    }
    if (++this.sid > 65000) { this.sid = 1; this.seen.fill(0); this.done.fill(0); }
    this.src = src; this.dst = dst; this.exp = 0; this.state = 0;
    this.heap.clear();
    const l = this.cap ? ((src / W | 0) - this.by) * this.bw + (src % W - this.bx) : src;
    this.gs[l] = 0; this.dir[l] = 8; this.seen[l] = this.sid;
    this.heap.push(0, src);
    return true;
  };

  // Work on the current search for at most `budget` expansions; returns how many were used.
  Pathfinder.prototype.run = function (budget) {
    if (this.state !== 0) return 1;
    const map = this.map, land = map.land, W = map.W;
    const sid = this.sid, gs = this.gs, dir = this.dir, seen = this.seen, done = this.done;
    const heap = this.heap, dst = this.dst, shy = this.shy, off = map.mag;   // for water, mag is the distance to land
    const bx = this.bx, by = this.by, bw = this.bw, bh = this.bh;
    const tx = dst % W, ty = (dst / W) | 0;
    const lane = this.lane, lc = lane ? lane.cells : null, lid = lane ? lane.id : 0, lcw = lane ? lane.cw : 0, lk = lane ? lane.shift : 0;
    let used = 0;
    while (heap.n) {
      const t = heap.pop();
      const x = t % W, y = (t - x) / W, lx = x - bx, ly = y - by, lt = ly * bw + lx;
      if (done[lt] === sid) continue;
      done[lt] = sid;
      if (t === dst) { this.state = 1; return used + 1; }
      used++;
      if (++this.exp > this.limit) { this.state = 2; this.gaveUp = true; return used; }
      const g0 = gs[lt];
      const l = lx > 0 && !land[t - 1], r = lx < bw - 1 && !land[t + 1];
      const u = ly > 0 && !land[t - W], d = ly < bh - 1 && !land[t + W];
      for (let k = 0; k < 8; k++) {
        // straight steps need the tile itself to be water, diagonal ones both tiles they pass between as well
        if (k === 0 ? !l : k === 1 ? !r : k === 2 ? !u : k === 3 ? !d : k === 4 ? !(l && u) : k === 5 ? !(r && u) : k === 6 ? !(l && d) : !(r && d)) continue;
        const n = t + DX[k] + DY[k] * W;
        if (k > 3 && land[n]) continue;
        if (lc && lc[((y + DY[k]) >> lk) * lcw + ((x + DX[k]) >> lk)] !== lid) continue;   // outside the corridor
        const ln = lt + DX[k] + DY[k] * bw;
        if (done[ln] === sid) continue;
        const g1 = g0 + COST[k] + (shy && off[n] < 4 ? (4 - off[n]) * 1.2 : 0);
        if (seen[ln] !== sid || g1 < gs[ln]) {
          seen[ln] = sid; gs[ln] = g1; dir[ln] = k;
          const ax = Math.abs(x + DX[k] - tx), ay = Math.abs(y + DY[k] - ty);
          heap.push(g1 + 1.5 * (ax > ay ? ax + 0.4142 * ay : ay + 0.4142 * ax), n);
        }
      }
      if (used >= budget) return used;
    }
    this.state = 2;
    return used + 1;
  };

  Pathfinder.prototype.result = function () {
    const W = this.map.W, dir = this.dir, bx = this.bx, by = this.by, bw = this.bw;
    const loc = function (t) { return ((t / W | 0) - by) * bw + (t % W - bx); };
    let n = 1;
    for (let t = this.dst; dir[loc(t)] !== 8; t -= DX[dir[loc(t)]] + DY[dir[loc(t)]] * W) n++;
    const path = new Int32Array(n);
    let t = this.dst;
    for (let i = n - 1; i >= 0; i--) { path[i] = t; const k = dir[loc(t)]; if (k === 8) break; t -= DX[k] + DY[k] * W; }
    return path;
  };

  // One-shot search, for tests and tools.
  Pathfinder.prototype.find = function (src, dst) {
    if (!this.start(src, dst)) return (src === dst && src >= 0 && !this.map.land[src]) ? new Int32Array([src]) : null;
    while (this.state === 0) this.run(1e9);
    return this.state === 1 ? this.result() : null;
  };

  G.Pathfinder = Pathfinder;

  // ---------- long routes: the sea graph ----------
  // A search tile by tile across an ocean of ten million tiles takes far too long, and the
  // merchants of half the world would queue for it. So the sea is cut into cells of 8 x 8 tiles.
  // Every patch of connected water inside a cell is a node; two nodes are linked where their
  // water touches across the edge (or the corner) of the cells. A long route is found in two
  // steps: first over this graph, which has a hundredth of the tiles; then tile by tile, leg by
  // leg, inside the corridor of cells the first step chose. The graph has exactly the
  // connections the sea has, so a route that exists is always found.
  const K = 3, CS = 1 << K;
  function SeaGraph(map) {
    const W = map.W, H = map.H, land = map.land;
    const cw = this.cw = (W + CS - 1) >> K, ch = this.ch = (H + CS - 1) >> K, nc = cw * ch;
    this.map = map;
    const first = this.first = new Int32Array(nc + 1);
    const sub = new Uint8Array(map.N);                     // which patch of its cell a water tile belongs to (only needed while building)
    const rep = [], cellOf = [], stack = new Int32Array(CS * CS);
    for (let cy = 0, c = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++, c++) {
      const x0 = cx << K, y0 = cy << K, x1 = Math.min(W, x0 + CS), y1 = Math.min(H, y0 + CS);
      const mx = (x0 + x1 - 1) / 2, my = (y0 + y1 - 1) / 2;
      let k = 0;
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const t = y * W + x;
        if (land[t] || sub[t]) continue;
        k++;
        let sp = 0, best = t, bd = Infinity;
        stack[sp++] = t; sub[t] = k;
        while (sp) {
          const u = stack[--sp], ux = u % W, uy = (u - ux) / W, d = (ux - mx) * (ux - mx) + (uy - my) * (uy - my);
          if (d < bd) { bd = d; best = u; }
          if (ux > x0 && !land[u - 1] && !sub[u - 1]) { sub[u - 1] = k; stack[sp++] = u - 1; }
          if (ux < x1 - 1 && !land[u + 1] && !sub[u + 1]) { sub[u + 1] = k; stack[sp++] = u + 1; }
          if (uy > y0 && !land[u - W] && !sub[u - W]) { sub[u - W] = k; stack[sp++] = u - W; }
          if (uy < y1 - 1 && !land[u + W] && !sub[u + W]) { sub[u + W] = k; stack[sp++] = u + W; }
        }
        rep.push(best); cellOf.push(c);
      }
      first[c + 1] = first[c] + k;
    }
    const nn = this.n = rep.length;
    this.rep = Int32Array.from(rep); this.cellOf = Int32Array.from(cellOf);
    // links: across the right and the lower edge of every cell, and across its two lower corners
    const ea = [], eb = [], seen = new Map();
    const link = function (ta, tb, c, d) {
      const a = first[c] + sub[ta] - 1, b = first[d] + sub[tb] - 1, key = a * nn + b;
      if (seen.has(key)) return;
      seen.set(key, 1); ea.push(a); eb.push(b);
    };
    for (let cy = 0, c = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++, c++) {
      if (first[c + 1] === first[c]) continue;
      const x0 = cx << K, y0 = cy << K, x1 = Math.min(W, x0 + CS) - 1, y1 = Math.min(H, y0 + CS) - 1;
      seen.clear();
      if (cx < cw - 1) for (let y = y0; y <= y1; y++) { const t = y * W + x1; if (!land[t] && !land[t + 1]) link(t, t + 1, c, c + 1); }
      if (cy < ch - 1) for (let x = x0; x <= x1; x++) { const t = y1 * W + x; if (!land[t] && !land[t + W]) link(t, t + W, c, c + cw); }
      if (cx < cw - 1 && cy < ch - 1) { const t = y1 * W + x1; if (!land[t] && !land[t + 1] && !land[t + W] && !land[t + W + 1]) link(t, t + W + 1, c, c + cw + 1); }
      if (cx > 0 && cy < ch - 1) { const t = y1 * W + x0; if (!land[t] && !land[t - 1] && !land[t + W] && !land[t + W - 1]) link(t, t + W - 1, c, c + cw - 1); }
    }
    const deg = new Int32Array(nn + 1);
    for (let i = 0; i < ea.length; i++) { deg[ea[i] + 1]++; deg[eb[i] + 1]++; }
    for (let i = 0; i < nn; i++) deg[i + 1] += deg[i];
    const adj = this.adj = new Int32Array(ea.length * 2), fill = deg.slice(0, nn);
    for (let i = 0; i < ea.length; i++) { adj[fill[ea[i]]++] = eb[i]; adj[fill[eb[i]]++] = ea[i]; }
    this.off = deg;
    this.gs = new Float32Array(nn); this.from = new Int32Array(nn); this.seen = new Uint16Array(nn); this.done = new Uint16Array(nn);
    this.sid = 0; this.heap = new G.Heap(4096); this.state = 2; this.src = -1; this.dst = -1;
    this.lane = { box: [0, 0, 0, 0], cells: new Uint16Array(nc), id: 0, cw: cw, shift: K };
  }
  // The node a water tile belongs to: walk through its patch until the tile that stands for a node turns up.
  SeaGraph.prototype.nodeOf = function (tile) {
    const map = this.map, W = map.W, H = map.H, land = map.land, x = tile % W, y = (tile - x) / W;
    const c = (y >> K) * this.cw + (x >> K), a = this.first[c], b = this.first[c + 1];
    if (b - a === 1) return a;
    if (b === a) return -1;
    const x0 = (x >> K) << K, y0 = (y >> K) << K, x1 = Math.min(W, x0 + CS), y1 = Math.min(H, y0 + CS);
    const mark = new Uint8Array(CS * CS), stack = [tile];
    mark[(y - y0) * CS + (x - x0)] = 1;
    while (stack.length) {
      const u = stack.pop(), ux = u % W, uy = (u - ux) / W;
      for (let n = a; n < b; n++) if (this.rep[n] === u) return n;
      const tryT = function (v, vx, vy) { const m = (vy - y0) * CS + (vx - x0); if (!land[v] && !mark[m]) { mark[m] = 1; stack.push(v); } };
      if (ux > x0) tryT(u - 1, ux - 1, uy);
      if (ux < x1 - 1) tryT(u + 1, ux + 1, uy);
      if (uy > y0) tryT(u - W, ux, uy - 1);
      if (uy < y1 - 1) tryT(u + W, ux, uy + 1);
    }
    return -1;
  };
  SeaGraph.prototype.start = function (srcTile, dstTile) {
    this.state = 2;
    const a = this.nodeOf(srcTile), b = this.nodeOf(dstTile);
    if (a < 0 || b < 0) return false;
    if (++this.sid > 65000) { this.sid = 1; this.seen.fill(0); this.done.fill(0); }
    this.src = a; this.dst = b; this.state = 0;
    this.heap.clear();
    this.gs[a] = 0; this.from[a] = -1; this.seen[a] = this.sid;
    this.heap.push(0, a);
    return true;
  };
  SeaGraph.prototype.run = function (budget) {
    if (this.state !== 0) return 1;
    const W = this.map.W, rep = this.rep, off = this.off, adj = this.adj, sid = this.sid;
    const gs = this.gs, from = this.from, seen = this.seen, done = this.done, heap = this.heap, dst = this.dst;
    const tx = rep[dst] % W, ty = (rep[dst] / W) | 0;
    let used = 0;
    while (heap.n) {
      const a = heap.pop();
      if (done[a] === sid) continue;
      done[a] = sid;
      if (a === dst) { this.state = 1; return used + 1; }
      used++;
      const ax = rep[a] % W, ay = (rep[a] / W) | 0, g0 = gs[a];
      for (let i = off[a]; i < off[a + 1]; i++) {
        const b = adj[i];
        if (done[b] === sid) continue;
        const bx = rep[b] % W, by = (rep[b] / W) | 0;
        const g1 = g0 + Math.sqrt((bx - ax) * (bx - ax) + (by - ay) * (by - ay));
        if (seen[b] !== sid || g1 < gs[b]) {
          seen[b] = sid; gs[b] = g1; from[b] = a;
          heap.push(g1 + 1.2 * Math.sqrt((bx - tx) * (bx - tx) + (by - ty) * (by - ty)), b);
        }
      }
      if (used >= budget) return used;
    }
    this.state = 2;
    return used + 1;
  };
  SeaGraph.prototype.result = function () {
    const from = this.from;
    let n = 0;
    for (let a = this.dst; a !== -1; a = from[a]) n++;
    const out = new Int32Array(n);
    for (let a = this.dst, i = n - 1; a !== -1; a = from[a]) out[i--] = a;
    return out;
  };
  // Mark the corridor for one leg: the cells of nodes[i0..i1] and the ring of cells around each.
  SeaGraph.prototype.corridor = function (nodes, i0, i1) {
    const lane = this.lane, cells = lane.cells, cw = this.cw, ch = this.ch, W = this.map.W, H = this.map.H;
    if (++lane.id > 65000) { lane.id = 1; cells.fill(0); }
    let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
    for (let i = i0; i <= i1; i++) {
      const c = this.cellOf[nodes[i]], cx = c % cw, cy = (c - cx) / cw;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= cw || y >= ch) continue;
        cells[y * cw + x] = lane.id;
        if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    lane.box[0] = x0 << K; lane.box[1] = y0 << K; lane.box[2] = Math.min(W - 1, ((x1 + 1) << K) - 1); lane.box[3] = Math.min(H - 1, ((y1 + 1) << K) - 1);
    return lane;
  };
  G.SeaGraph = SeaGraph;
})(globalThis.G = globalThis.G || {});
