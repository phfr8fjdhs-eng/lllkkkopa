(function (G) {
  'use strict';

  // Sea routes: weighted A* over water tiles, eight directions, no cutting across land corners.
  // A search can be worked on in slices, so one long route never stalls a step of the game.
  function Pathfinder(map) {
    const N = map.N;
    this.map = map;
    this.gs = new Float32Array(N); this.from = new Int32Array(N);
    this.seen = new Int32Array(N); this.done = new Int32Array(N);
    this.sid = 0; this.heap = new G.Heap(8192);
    this.nb = new Int32Array(8); this.nc = new Float32Array(8);
    this.state = 2; this.dst = -1; this.exp = 0;   // state: 0 running, 1 found, 2 no route
  }

  // Returns false when there cannot be a route (land, or separate bodies of water).
  Pathfinder.prototype.start = function (src, dst) {
    const map = this.map, land = map.land;
    this.state = 2;
    if (src < 0 || dst < 0 || land[src] || land[dst] || map.wcomp[src] !== map.wcomp[dst] || src === dst) return false;
    this.sid++; this.dst = dst; this.exp = 0; this.state = 0;
    this.heap.clear();
    this.gs[src] = 0; this.from[src] = -1; this.seen[src] = this.sid;
    this.heap.push(0, src);
    return true;
  };

  // Work on the current search for at most `budget` expansions; returns how many were used.
  Pathfinder.prototype.run = function (budget) {
    if (this.state !== 0) return 1;
    const map = this.map, land = map.land, W = map.W, H = map.H;
    const sid = this.sid, gs = this.gs, from = this.from, seen = this.seen, done = this.done;
    const heap = this.heap, nb = this.nb, nc = this.nc, dst = this.dst;
    const tx = dst % W, ty = (dst / W) | 0;
    let used = 0;
    while (heap.n) {
      const t = heap.pop();
      if (done[t] === sid) continue;
      done[t] = sid;
      if (t === dst) { this.state = 1; return used + 1; }
      used++;
      if (++this.exp > 900000) { this.state = 2; return used; }
      const x = t % W, y = (t - x) / W, g0 = gs[t];
      const l = x > 0 && !land[t - 1], r = x < W - 1 && !land[t + 1];
      const u = y > 0 && !land[t - W], d = y < H - 1 && !land[t + W];
      let k = 0;
      if (l) { nb[k] = t - 1; nc[k++] = 1; }
      if (r) { nb[k] = t + 1; nc[k++] = 1; }
      if (u) { nb[k] = t - W; nc[k++] = 1; }
      if (d) { nb[k] = t + W; nc[k++] = 1; }
      if (l && u && !land[t - W - 1]) { nb[k] = t - W - 1; nc[k++] = 1.4142; }
      if (r && u && !land[t - W + 1]) { nb[k] = t - W + 1; nc[k++] = 1.4142; }
      if (l && d && !land[t + W - 1]) { nb[k] = t + W - 1; nc[k++] = 1.4142; }
      if (r && d && !land[t + W + 1]) { nb[k] = t + W + 1; nc[k++] = 1.4142; }
      for (let i = 0; i < k; i++) {
        const n = nb[i];
        if (done[n] === sid) continue;
        const g1 = g0 + nc[i];
        if (seen[n] !== sid || g1 < gs[n]) {
          seen[n] = sid; gs[n] = g1; from[n] = t;
          const ax = Math.abs(n % W - tx), ay = Math.abs(((n / W) | 0) - ty);
          heap.push(g1 + 1.5 * (ax > ay ? ax + 0.4142 * ay : ay + 0.4142 * ax), n);
        }
      }
      if (used >= budget) return used;
    }
    this.state = 2;
    return used + 1;
  };

  Pathfinder.prototype.result = function () {
    const from = this.from;
    let n = 0;
    for (let t = this.dst; t !== -1; t = from[t]) n++;
    const path = new Int32Array(n);
    for (let t = this.dst, i = n - 1; t !== -1; t = from[t]) path[i--] = t;
    return path;
  };

  // One-shot search, for tests and tools.
  Pathfinder.prototype.find = function (src, dst) {
    if (!this.start(src, dst)) return (src === dst && src >= 0 && !this.map.land[src]) ? new Int32Array([src]) : null;
    while (this.state === 0) this.run(1e9);
    return this.state === 1 ? this.result() : null;
  };

  G.Pathfinder = Pathfinder;
})(globalThis.G = globalThis.G || {});
