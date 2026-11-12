(function (G) {
  'use strict';

  // Small deterministic random generator so a game can be replayed from its seed.
  function RNG(seed) { this.s = seed >>> 0; }
  RNG.prototype.next = function () {
    let t = (this.s += 0x6D2B79F5) | 0;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a)); };   // [a, b)
  RNG.prototype.chance = function (n) { return this.next() * n < 1; };                      // 1 in n
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  G.RNG = RNG;

  // Binary min-heap on typed arrays: float key, integer payload.
  function Heap(cap) {
    cap = cap || 256;
    this.k = new Float64Array(cap); this.v = new Int32Array(cap); this.n = 0;
  }
  Heap.prototype.push = function (key, val) {
    if (this.n === this.k.length) {
      const k2 = new Float64Array(this.n * 2), v2 = new Int32Array(this.n * 2);
      k2.set(this.k); v2.set(this.v); this.k = k2; this.v = v2;
    }
    const k = this.k, v = this.v;
    let i = this.n++;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (k[p] <= key) break;
      k[i] = k[p]; v[i] = v[p]; i = p;
    }
    k[i] = key; v[i] = val;
  };
  Heap.prototype.pop = function () {
    const k = this.k, v = this.v, top = v[0], n = --this.n;
    if (n > 0) {
      const key = k[n], val = v[n];
      let i = 0;
      for (;;) {
        let c = 2 * i + 1;
        if (c >= n) break;
        if (c + 1 < n && k[c + 1] < k[c]) c++;
        if (k[c] >= key) break;
        k[i] = k[c]; v[i] = v[c]; i = c;
      }
      k[i] = key; v[i] = val;
    }
    return top;
  };
  Heap.prototype.clear = function () { this.n = 0; };
  G.Heap = Heap;


  // Arithmetic for the simulation that gives the same bits on every device, so that players
  // connected over the network stay in step. Built only from + - * / and sqrt, which are exact everywhere.
  const LN2 = 0.6931471805599453, SQ2 = 1.4142135623730951, PI = 3.141592653589793;
  function dln(x) {
    let e = 0;
    while (x > SQ2) { x /= 2; e++; }
    while (x < SQ2 / 2) { x *= 2; e--; }
    const z = (x - 1) / (x + 1), z2 = z * z;
    let s = 0, t = z;
    for (let k = 1; k <= 27; k += 2) { s += t / k; t *= z2; }
    return 2 * s + e * LN2;
  }
  function dexp(x) {
    const k = Math.round(x / LN2), r = x - k * LN2;
    let s = 1, t = 1;
    for (let i = 1; i <= 18; i++) { t *= r / i; s += t; }
    if (k > 0) for (let i = 0; i < k; i++) s *= 2; else for (let i = 0; i < -k; i++) s /= 2;
    return s;
  }
  function dpow(x, y) {
    if (y === 0) return 1;
    if (!(x > 0)) return x === 0 ? 0 : NaN;
    if (y === 1) return x;
    if (y > 0 && y < 64 && Math.floor(y) === y) { let r = 1; for (let i = 0; i < y; i++) r *= x; return r; }
    return dexp(y * dln(x));
  }
  function dsin(a) {
    a -= 2 * PI * Math.round(a / (2 * PI));
    const a2 = a * a;
    let s = a, t = a;
    for (let i = 1; i <= 12; i++) { t *= -a2 / ((2 * i) * (2 * i + 1)); s += t; }
    return s;
  }
  G.M = {
    min: Math.min, max: Math.max, floor: Math.floor, ceil: Math.ceil, round: Math.round, abs: Math.abs,
    sqrt: Math.sqrt, imul: Math.imul, PI: PI, pow: dpow, exp: dexp, sin: dsin,
    cos: function (a) { return dsin(a + PI / 2); },
    hypot: function (x, y) { return Math.sqrt(x * x + y * y); }
  };

  G.within = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  // 1234 -> "1.23K", 123456 -> "123K", 2500000 -> "2.50M"
  G.fmt = function (n) {
    n = Math.floor(n);
    const a = Math.abs(n);
    if (a >= 1e7) return (n / 1e6).toFixed(1) + 'M';
    if (a >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e5) return Math.floor(n / 1e3) + 'K';
    if (a >= 1e4) return (n / 1e3).toFixed(1) + 'K';
    if (a >= 1e3) return (n / 1e3).toFixed(2) + 'K';
    return String(n);
  };
  // Troops are stored tenfold internally, as fine-grained units.
  G.fmtTroops = function (t) { return G.fmt(t / 10); };

  G.hsl = function (h, s, l) {
    const a = s * Math.min(l, 1 - l);
    const f = function (n) {
      const k = (n + h / 30) % 12;
      return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
    };
    return [f(0), f(8), f(4)];
  };
})(globalThis.G = globalThis.G || {});
