/* Grenzland – Spielkern: Karte, Spieler, Gebiet, Angriffe, Allianzen */
(function (G) {
  'use strict';

  const HUMAN = 0, NATION = 1, BOT = 2;
  G.HUMAN = HUMAN; G.NATION = NATION; G.BOT = BOT;

  // ---------------------------------------------------------------- Hilfen
  G.makeRng = function (seed) {
    let s = seed >>> 0;
    const f = function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.int = function (a, b) { return a + Math.floor(f() * (b - a)); };   // a <= x < b
    f.chance = function (n) { return f() * n < 1; };                     // 1 zu n
    f.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    return f;
  };

  const within = G.within = function (v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; };

  // Min-Heap mit Zahlenschlüssel und Ganzzahlwert
  class Heap {
    constructor(cap) { this.k = new Float64Array(cap || 64); this.v = new Int32Array(cap || 64); this.n = 0; }
    clear() { this.n = 0; }
    push(key, val) {
      if (this.n === this.k.length) {
        const k = new Float64Array(this.n * 2), v = new Int32Array(this.n * 2);
        k.set(this.k); v.set(this.v); this.k = k; this.v = v;
      }
      const k = this.k, v = this.v;
      let i = this.n++;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (k[p] <= key) break;
        k[i] = k[p]; v[i] = v[p]; i = p;
      }
      k[i] = key; v[i] = val;
    }
    pop() {
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
    }
  }
  G.Heap = Heap;

  G.fmtNum = function (n) {
    n = Math.max(0, n);
    if (n >= 1e9) return (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e8) return Math.floor(n / 1e6) + 'M';
    if (n >= 1e7) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e5) return Math.floor(n / 1000) + 'K';
    if (n >= 1e4) return (n / 1000).toFixed(1) + 'K';
    if (n >= 1e3) return (n / 1000).toFixed(2) + 'K';
    return String(Math.floor(n));
  };
  G.fmtTroops = function (t) { return G.fmtNum(t / 10); };

  function hsl(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    const f = function (t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    return [Math.round(f(h + 1 / 3) * 255), Math.round(f(h) * 255), Math.round(f(h - 1 / 3) * 255)];
  }
  G.hsl = hsl;
  G.HUMAN_COLORS = [[226, 62, 52], [38, 110, 230], [245, 150, 20], [150, 60, 210], [20, 160, 150], [225, 60, 150]];

  // ---------------------------------------------------------------- Karte
  function noise(W, H, rnd, scale, oct) {
    const out = new Float32Array(W * H);
    let amp = 1, sum = 0, sc = scale;
    for (let o = 0; o < oct; o++) {
      const gw = Math.ceil(W / sc) + 2, gh = Math.ceil(H / sc) + 2;
      const g = new Float32Array(gw * gh);
      for (let i = 0; i < g.length; i++) g[i] = rnd();
      for (let y = 0; y < H; y++) {
        const fy = y / sc, y0 = fy | 0;
        let ty = fy - y0; ty = ty * ty * (3 - 2 * ty);
        const r0 = y0 * gw, r1 = r0 + gw, row = y * W;
        for (let x = 0; x < W; x++) {
          const fx = x / sc, x0 = fx | 0;
          let tx = fx - x0; tx = tx * tx * (3 - 2 * tx);
          const a = g[r0 + x0], b = g[r0 + x0 + 1], c = g[r1 + x0], d = g[r1 + x0 + 1];
          out[row + x] += amp * (a + (b - a) * tx + (c - a) * ty + (a - b - c + d) * tx * ty);
        }
      }
      sum += amp; amp *= 0.5; sc /= 2;
    }
    for (let i = 0; i < out.length; i++) out[i] /= sum;
    return out;
  }

  function blur(a, W, H, r) {
    const tmp = new Float32Array(a.length), n = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let s = 0;
      for (let x = -r; x <= r; x++) s += a[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = s / n;
        s += a[row + Math.min(W - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        a[y * W + x] = s / n;
        s += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
  }

  // Zusammenhängende Flächen einer Sorte (Land = 1 oder Wasser = 0) nummerieren
  function label(land, W, H, kind) {
    const N = W * H, comp = new Uint16Array(N), sizes = [0], q = new Int32Array(N);
    let next = 1;
    for (let s = 0; s < N; s++) {
      if (land[s] !== kind || comp[s]) continue;
      const id = next < 65535 ? next++ : 65535;
      let qh = 0, qt = 0, size = 0;
      q[qt++] = s; comp[s] = id;
      while (qh < qt) {
        const t = q[qh++], x = t % W;
        size++;
        if (x > 0 && land[t - 1] === kind && !comp[t - 1]) { comp[t - 1] = id; q[qt++] = t - 1; }
        if (x < W - 1 && land[t + 1] === kind && !comp[t + 1]) { comp[t + 1] = id; q[qt++] = t + 1; }
        if (t >= W && land[t - W] === kind && !comp[t - W]) { comp[t - W] = id; q[qt++] = t - W; }
        if (t < N - W && land[t + W] === kind && !comp[t + W]) { comp[t + W] = id; q[qt++] = t + W; }
      }
      sizes[id] = (sizes[id] || 0) + size;
    }
    return { comp: comp, sizes: sizes };
  }

  // cls: 0 Wasser, 1 Land, 2 Hochebene, 3 Gebirge
  G.buildMap = function (def, cls) {
    const W = def.W, H = def.H, N = W * H;
    const land = new Uint8Array(N);
    let landTiles = 0;
    for (let i = 0; i < N; i++) if (cls[i]) { land[i] = 1; landTiles++; }
    const rnd = G.makeRng(def.seed || 7331);
    const n1 = noise(W, H, rnd, 64, 3), n2 = noise(W, H, rnd, 20, 3), n3 = noise(W, H, rnd, 30, 2);
    const mt = new Float32Array(N), pl = new Float32Array(N);
    for (let i = 0; i < N; i++) { if (cls[i] === 3) mt[i] = 1; else if (cls[i] === 2) pl[i] = 1; }
    blur(mt, W, H, 3); blur(mt, W, H, 3);
    blur(pl, W, H, 5); blur(pl, W, H, 5);

    // Abstand zur Küste: Land -> nächstes Wasser, Wasser -> nächstes Land
    const dist = new Uint8Array(N), q = new Int32Array(N);
    let qh = 0, qt = 0;
    for (let t = 0; t < N; t++) {
      const k = land[t], x = t % W;
      if ((x > 0 && land[t - 1] !== k) || (x < W - 1 && land[t + 1] !== k) ||
          (t >= W && land[t - W] !== k) || (t < N - W && land[t + W] !== k)) { dist[t] = 1; q[qt++] = t; }
    }
    while (qh < qt) {
      const t = q[qh++], d = dist[t];
      if (d >= 40) continue;
      const k = land[t], x = t % W;
      if (x > 0 && land[t - 1] === k && !dist[t - 1]) { dist[t - 1] = d + 1; q[qt++] = t - 1; }
      if (x < W - 1 && land[t + 1] === k && !dist[t + 1]) { dist[t + 1] = d + 1; q[qt++] = t + 1; }
      if (t >= W && land[t - W] === k && !dist[t - W]) { dist[t - W] = d + 1; q[qt++] = t - W; }
      if (t < N - W && land[t + W] === k && !dist[t + W]) { dist[t + W] = d + 1; q[qt++] = t + W; }
    }

    const mag = new Uint8Array(N), shore = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      const d = dist[i] || 40;
      if (d === 1) shore[i] = 1;
      if (land[i]) {
        const ridge = 1 - Math.abs(2 * n3[i] - 1);
        let e = 2 + 21 * n1[i] * n2[i] + pl[i] * (7 + 5 * n2[i]) + mt[i] * (3 + 26 * ridge * ridge);
        if (d < 6) e *= 0.4 + d * 0.1;
        mag[i] = within(Math.round(e), 0, 30);
      } else {
        mag[i] = d > 20 ? 20 : d;
      }
    }
    const wl = label(land, W, H, 0), ll = label(land, W, H, 1);
    return {
      id: def.id, name: def.name, W: W, H: H, N: N, S: def.S,
      land: land, mag: mag, shore: shore,
      wcomp: wl.comp, wsize: wl.sizes, lcomp: ll.comp, lsize: ll.sizes,
      landTiles: landTiles, nations: def.nations || []
    };
  };

  // Zufallskarte: Kontinente aus Rauschen
  G.randomClasses = function (W, H, seed) {
    const N = W * H, rnd = G.makeRng(seed);
    const a = noise(W, H, rnd, 150, 5), b = noise(W, H, rnd, 46, 3);
    const e = new Float32Array(N);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const edge = Math.min(Math.min(x, W - 1 - x) / (W * 0.5), Math.min(y, H - 1 - y) / (H * 0.5));
      e[i] = a[i] * 0.75 + b[i] * 0.25 - Math.max(0, 0.16 - edge) * 2.2;
    }
    const sorted = Float32Array.from(e).sort();
    const sea = sorted[Math.floor(N * 0.6)], hi = sorted[Math.floor(N * 0.9)], top = sorted[Math.floor(N * 0.955)];
    const cls = new Uint8Array(N);
    const r2 = noise(W, H, rnd, 34, 2);
    for (let i = 0; i < N; i++) {
      if (e[i] <= sea) continue;
      cls[i] = 1;
      if (e[i] > top && r2[i] > 0.42) cls[i] = 3; else if (e[i] > hi) cls[i] = 2;
    }
    // Winzige Inseln und Tümpel entfernen
    const land = new Uint8Array(N);
    for (let i = 0; i < N; i++) land[i] = cls[i] ? 1 : 0;
    const ll = label(land, W, H, 1), wl = label(land, W, H, 0);
    for (let i = 0; i < N; i++) {
      if (land[i] && ll.sizes[ll.comp[i]] < 40) cls[i] = 0;
      else if (!land[i] && wl.sizes[wl.comp[i]] < 80) cls[i] = 1;
    }
    return cls;
  };

  // ---------------------------------------------------------------- Namen
  const BOT_A = ['Nord', 'Süd', 'Ost', 'West', 'Alt', 'Neu', 'Hoch', 'Tief', 'Eisen', 'Gold', 'Silber', 'Stein', 'Wald',
    'See', 'Berg', 'Sturm', 'Feuer', 'Schatten', 'Licht', 'Rot', 'Blau', 'Grau', 'Wolf', 'Adler', 'Falken', 'Raben',
    'Löwen', 'Drachen', 'Hirsch', 'Bären', 'Nebel', 'Donner', 'Frost', 'Sonnen', 'Mond', 'Stern', 'Dorn', 'Eichen',
    'Birken', 'Kupfer', 'Salz', 'Sand', 'Moor', 'Heide', 'Klippen', 'Winter', 'Sommer', 'Herbst', 'Weiss', 'Schwarz'];
  const BOT_B = ['mark', 'land', 'reich', 'bund', 'heim', 'burg', 'tal', 'wacht', 'feld', 'hain', 'furt', 'gard',
    'stein', 'au', 'horst', 'wall', 'hafen', 'berg', 'brück', 'weiler', 'hof', 'grund', 'ried', 'see'];
  const FANTASY = ['Valdoria', 'Kesmark', 'Tarneth', 'Ostrava', 'Lumeria', 'Brannoch', 'Zephyra', 'Korvath', 'Elmsund',
    'Aravell', 'Durnholm', 'Selvara', 'Mirenia', 'Thalgard', 'Ondara', 'Veskar', 'Halvoren', 'Castria'];
  G.FANTASY = FANTASY;

  // ---------------------------------------------------------------- Spiel
  const DIFF = [
    { name: 'Leicht', start: 2500, max: 0.5, grow: 0.9 },
    { name: 'Mittel', start: 5000, max: 1, grow: 1 },
    { name: 'Schwer', start: 20000, max: 1.5, grow: 1.1 },
    { name: 'Unmöglich', start: 50000, max: 2, grow: 1.2 }
  ];
  G.DIFF = DIFF;

  class Game {
    constructor(map, opts) {
      this.map = map; this.W = map.W; this.H = map.H; this.N = map.N; this.S = map.S;
      this.land = map.land; this.mag = map.mag; this.shore = map.shore; this.wcomp = map.wcomp;
      this.opts = Object.assign({
        seed: 1, difficulty: 1, bots: 100, nations: true, instantBuild: false,
        infiniteGold: false, infiniteTroops: false, name: 'Du', color: 0, duel: false
      }, opts || {});
      this.rng = G.makeRng(this.opts.seed);
      const N = this.N, S = this.S;
      this.owner = new Uint16Array(N);
      this.fallout = new Uint8Array(N); this.falloutCount = 0;
      this.players = [null];
      this.ticks = 0; this.phase = 'spawn'; this.playStart = 0; this.winner = null;
      this.attacks = []; this.attackSeq = 1;
      this.units = []; this.structAt = new Map(); this.unitSeq = 1; this.unitsDirty = false;
      this.requests = [];
      this.events = []; this.fx = [];
      this.dq = new Int32Array(N); this.dn = 0; this.dflag = new Uint8Array(N);
      this.stamp = new Int32Array(N); this.stampId = 0;
      this.q = new Int32Array(N);
      this.dp = new Uint16Array(64 * 64);
      this.R = {
        spawn: 4,
        spawnDist: Math.max(8, Math.round(30 * S)),
        defense: Math.max(8, Math.round(30 * S)),
        struct: Math.max(5, Math.round(15 * S)),
        sam: Math.max(14, Math.round(75 * S)),
        atomIn: Math.max(4, Math.round(12 * S)), atomOut: Math.max(8, Math.round(30 * S)),
        hydroIn: Math.max(16, Math.round(80 * S)), hydroOut: Math.max(20, Math.round(100 * S)),
        mirvIn: Math.max(3, Math.round(12 * S)), mirvOut: Math.max(5, Math.round(18 * S)),
        warTarget: Math.max(24, Math.round(130 * S)), warPatrol: Math.max(18, Math.round(100 * S)),
        port: Math.max(10, Math.round(40 * S)),
        reach: Math.max(60, Math.round(200 * S)),
        big1: 100000 * S * S, big2: 75000 * S * S,
        deadTiles: Math.max(30, Math.round(100 * S * S))
      };
      this.human = null; this.rival = null;
      this.tradeShips = 0; this.tradeSum = 0; this.tradeN = 0;
      if (this._initPath) this._initPath();
    }

    // ------------------------------------------------------------ Spieler
    addPlayer(name, type, extra) {
      extra = extra || {};
      const id = this.players.length;
      let col = extra.color;
      if (!col) {
        const h = (id * 137.508) % 360;
        col = type === BOT ? hsl(h, 0.30 + (id % 4) * 0.05, 0.62 + (id % 3) * 0.05)
                           : hsl(h, 0.62 + (id % 3) * 0.1, 0.52 + (id % 4) * 0.04);
      }
      const p = {
        id: id, name: name, type: type, color: col,
        bcolor: [Math.round(col[0] * 0.55), Math.round(col[1] * 0.55), Math.round(col[2] * 0.55)],
        flag: extra.flag || '', strength: extra.strength || 1,
        troops: 0, gold: 0, tiles: 0, border: new Set(), alive: true, spawned: false, spawnTile: -1,
        x0: 1e9, y0: 1e9, x1: -1, y1: -1, lastChange: 0, lastCluster: id % 20, lostTiles: false,
        nameAt: -1, nx: 0, ny: 0, ns: 0,
        units: [], defs: [], cityLv: 0, out: [], boats: 0,
        allies: new Map(), traitorUntil: -1, betrayals: 0,
        rel: new Map(), embargo: new Set(), reqCool: new Map(), hitBy: new Map(),
        ai: null, peak: 0
      };
      this.players.push(p);
      return p;
    }

    startTroops(p) {
      if (p.type === BOT) return 10000;
      if (p.type === NATION) return DIFF[this.opts.difficulty].start * p.strength;
      return this.opts.infiniteTroops ? 1000000 : 25000;
    }

    maxTroops(p) {
      if (p.type === HUMAN && this.opts.infiniteTroops) return 1e9;
      const m = 2 * (Math.pow(p.tiles, 0.6) * 1000 + 50000) + p.cityLv * 250000;
      if (p.type === BOT) return m / 3;
      if (p.type === HUMAN) return m;
      return m * DIFF[this.opts.difficulty].max;
    }

    troopRate(p) {
      const max = this.maxTroops(p);
      let add = 10 + Math.pow(p.troops, 0.73) / 4;
      add *= 1 - p.troops / max;
      if (p.type === BOT) add *= 0.6;
      else if (p.type === NATION) add *= DIFF[this.opts.difficulty].grow;
      return Math.min(p.troops + add, max) - p.troops;
    }

    goldRate(p) { return p.type === BOT ? 50 : 100; }

    isTraitor(p) { return this.ticks < p.traitorUntil; }

    // ------------------------------------------------------------ Aufbau
    setup() {
      const o = this.opts, m = this.map, r = this.rng, W = this.W, H = this.H;
      this.human = this.addPlayer(o.name || 'Du', HUMAN, { color: G.HUMAN_COLORS[o.color % G.HUMAN_COLORS.length] });
      this.human.troops = this.startTroops(this.human);
      const spots = [];
      const sd = this.R.spawnDist, sd2 = sd * sd;
      const free = function (x, y) {
        for (let i = 0; i < spots.length; i += 2) {
          const dx = spots[i] - x, dy = spots[i + 1] - y;
          if (dx * dx + dy * dy < sd2) return false;
        }
        return true;
      };
      if (o.duel) {
        // Duell: genau ein Rivale auf einer grossen Landmasse
        const names = G.FANTASY;
        for (let k = 0; k < 6000; k++) {
          const x = r.int(8, W - 8), y = r.int(8, H - 8), t = y * W + x;
          if (!m.land[t] || m.lsize[m.lcomp[t]] < m.landTiles * 0.04) continue;
          const p = this.addPlayer(names[r.int(0, names.length)], NATION, { strength: 2, color: [70, 120, 235] });
          if (this.human.color[2] > 180 && this.human.color[0] < 120) { p.color = [226, 62, 52]; p.bcolor = [124, 34, 29]; }
          this.spawn(p, t);
          p.troops = this.startTroops(p);
          spots.push(x, y);
          if (this._initAI) this._initAI(p);
          this.rival = p;
          break;
        }
      } else if (o.nations) {
        let list = m.nations;
        if (!list.length) {
          // Zufallskarte: Fantasienationen frei verteilen
          list = [];
          const names = G.FANTASY.slice();
          for (let i = 0; i < 14 && names.length; i++) {
            const nm = names.splice(r.int(0, names.length), 1)[0];
            for (let k = 0; k < 300; k++) {
              const x = r.int(8, W - 8), y = r.int(8, H - 8), t = y * W + x;
              if (m.land[t] && m.lsize[m.lcomp[t]] >= 400 && list.every(function (n) {
                return (n[1] - x) * (n[1] - x) + (n[2] - y) * (n[2] - y) > 45 * 45; })) {
                list.push([nm, x, y, 1 + (i % 3 === 0 ? 1 : 0), '']); break;
              }
            }
          }
        }
        for (const n of list) {
          const t = this._landNear(n[1], n[2], 14);
          if (t < 0) continue;
          const iso = n[4] || '';
          const flag = iso.length === 2 ? String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65, 0x1F1E6 + iso.charCodeAt(1) - 65) : '';
          const p = this.addPlayer(n[0], NATION, { strength: n[3], flag: flag });
          this.spawn(p, t);
          p.troops = this.startTroops(p);
          spots.push(t % W, (t / W) | 0);
          if (this._initAI) this._initAI(p);
        }
      }
      const used = new Set();
      for (let i = 0; i < o.bots; i++) {
        let t = -1;
        for (let k = 0; k < 120; k++) {
          const x = r.int(4, W - 4), y = r.int(4, H - 4), c = y * W + x;
          if (!m.land[c] || this.owner[c] || m.lsize[m.lcomp[c]] < 120) continue;
          if (!free(x, y)) continue;
          t = c; break;
        }
        if (t < 0) continue;
        let name = '';
        for (let k = 0; k < 20; k++) {
          name = r.pick(BOT_A) + r.pick(BOT_B);
          if (!used.has(name)) break;
        }
        used.add(name);
        const p = this.addPlayer(name, BOT);
        this.spawn(p, t);
        p.troops = this.startTroops(p);
        spots.push(t % W, (t / W) | 0);
        if (this._initAI) this._initAI(p);
      }
    }

    _landNear(x, y, rad) {
      const W = this.W, H = this.H;
      for (let r = 0; r <= rad; r++) {
        for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const xx = x + dx, yy = y + dy;
          if (xx < 2 || yy < 2 || xx >= W - 2 || yy >= H - 2) continue;
          const t = yy * W + xx;
          if (this.land[t] && !this.owner[t]) return t;
        }
      }
      return -1;
    }

    spawn(p, tile) {
      if (p.tiles > 0) this._clearTiles(p);
      const W = this.W, H = this.H, cx = tile % W, cy = (tile / W) | 0, r = this.R.spawn;
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy > r * r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const t = y * W + x;
        if (this.land[t] && !this.owner[t]) this.conquer(p, t);
      }
      p.spawnTile = tile; p.spawned = true;
      this._placeName(p);
    }

    spawnHuman(tile) {
      const p = this.human;
      if (this.phase !== 'spawn' || !this.land[tile]) return false;
      if (this.owner[tile] && this.owner[tile] !== p.id) return false;
      this.spawn(p, tile);
      return p.tiles > 0;
    }

    randomSpawn() {
      const W = this.W, H = this.H, m = this.map;
      for (let k = 0; k < 4000; k++) {
        const x = this.rng.int(6, W - 6), y = this.rng.int(6, H - 6), t = y * W + x;
        if (m.land[t] && !this.owner[t] && m.lsize[m.lcomp[t]] >= 300 && this.spawnHuman(t)) return true;
      }
      return false;
    }

    startPlay() {
      if (this.phase !== 'spawn') return;
      if (!this.human.spawned) this.randomSpawn();
      this.phase = 'play'; this.playStart = this.ticks;
    }

    _clearTiles(p) {
      const W = this.W, o = this.owner;
      for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
        const t = y * W + x;
        if (o[t] === p.id) this.relinquish(t);
      }
      p.x0 = 1e9; p.y0 = 1e9; p.x1 = -1; p.y1 = -1;
    }

    // ------------------------------------------------------------ Felder
    _dirty(t) { if (!this.dflag[t]) { this.dflag[t] = 1; this.dq[this.dn++] = t; } }

    _fixBorder(t) {
      const o = this.owner, id = o[t];
      if (!id) return;
      const W = this.W, x = t % W;
      const b = (x > 0 && o[t - 1] !== id) || (x < W - 1 && o[t + 1] !== id) ||
                (t >= W && o[t - W] !== id) || (t < this.N - W && o[t + W] !== id);
      const s = this.players[id].border;
      if (b) s.add(t); else s.delete(t);
    }

    _touch(t) {
      const W = this.W, x = t % W;
      this._fixBorder(t); this._dirty(t);
      if (x > 0) { this._fixBorder(t - 1); this._dirty(t - 1); }
      if (x < W - 1) { this._fixBorder(t + 1); this._dirty(t + 1); }
      if (t >= W) { this._fixBorder(t - W); this._dirty(t - W); }
      if (t < this.N - W) { this._fixBorder(t + W); this._dirty(t + W); }
    }

    conquer(p, t) {
      const o = this.owner, prev = o[t], id = p.id;
      if (prev === id) return;
      if (prev) {
        const q = this.players[prev];
        q.tiles--; q.border.delete(t); q.lastChange = this.ticks; q.lostTiles = true;
      }
      o[t] = id; p.tiles++; p.lastChange = this.ticks;
      if (this.fallout[t]) { this.fallout[t] = 0; this.falloutCount--; }
      const x = t % this.W, y = (t / this.W) | 0;
      if (x < p.x0) p.x0 = x;
      if (x > p.x1) p.x1 = x;
      if (y < p.y0) p.y0 = y;
      if (y > p.y1) p.y1 = y;
      this._touch(t);
      if (this.structAt.size) {
        const u = this.structAt.get(t);
        if (u) this._capture(u, p);
      }
    }

    relinquish(t) {
      const o = this.owner, prev = o[t];
      if (!prev) return;
      const q = this.players[prev];
      q.tiles--; q.border.delete(t); q.lastChange = this.ticks; q.lostTiles = true;
      o[t] = 0;
      this._touch(t);
      if (this.structAt.size) {
        const u = this.structAt.get(t);
        if (u) this._killUnit(u);
      }
    }

    // Hat p eine gemeinsame Landgrenze mit Ziel (0 = herrenloses Land)?
    sharesBorder(p, tid) {
      const o = this.owner, W = this.W, N = this.N, land = this.land;
      for (const t of p.border) {
        const x = t % W;
        if (x > 0 && o[t - 1] === tid && land[t - 1]) return true;
        if (x < W - 1 && o[t + 1] === tid && land[t + 1]) return true;
        if (t >= W && o[t - W] === tid && land[t - W]) return true;
        if (t < N - W && o[t + W] === tid && land[t + W]) return true;
      }
      return false;
    }

    // Nachbarn: Map Spieler-ID -> Anzahl Grenzfelder; Schlüssel 0 = herrenloses Land
    neighbors(p) {
      const o = this.owner, W = this.W, N = this.N, land = this.land, id = p.id, res = new Map();
      const add = function (n) {
        if (!land[n]) return;
        const k = o[n];
        if (k !== id) res.set(k, (res.get(k) || 0) + 1);
      };
      for (const t of p.border) {
        const x = t % W;
        if (x > 0) add(t - 1);
        if (x < W - 1) add(t + 1);
        if (t >= W) add(t - W);
        if (t < N - W) add(t + W);
      }
      return res;
    }

    // Kann p das Feld auf dem Landweg angreifen?
    canAttackTile(p, t) {
      if (!this.land[t]) return false;
      const tid = this.owner[t];
      if (tid === p.id) return false;
      if (tid) {
        if (p.allies.has(tid)) return false;
        return this.sharesBorder(p, tid);
      }
      // Herrenloses Land: von hier aus über herrenloses Land bis zur eigenen Grenze suchen
      const W = this.W, N = this.N, o = this.owner, land = this.land, q = this.q, st = this.stamp, sid = ++this.stampId;
      const cx = t % W, cy = (t / W) | 0, lim = this.R.reach;
      let qh = 0, qt = 0;
      q[qt++] = t; st[t] = sid;
      while (qh < qt) {
        const c = q[qh++], x = c % W, y = (c / W) | 0;
        for (let k = 0; k < 4; k++) {
          const n = k === 0 ? (x > 0 ? c - 1 : -1) : k === 1 ? (x < W - 1 ? c + 1 : -1) : k === 2 ? (c >= W ? c - W : -1) : (c < N - W ? c + W : -1);
          if (n < 0 || !land[n]) continue;
          if (o[n] === p.id) return true;
          if (o[n] || st[n] === sid) continue;
          if (Math.abs((n % W) - cx) + Math.abs(((n / W) | 0) - cy) > lim) continue;
          st[n] = sid; q[qt++] = n;
        }
      }
      return false;
    }

    // ------------------------------------------------------------ Angriffe
    attack(a, tid, troops, src) {
      if (!a.alive || this.phase !== 'play') return null;
      troops = Math.min(troops, a.troops);
      if (troops < 1) return null;
      let tp = null;
      if (tid) {
        tp = this.players[tid];
        if (!tp || !tp.alive || tp === a || a.allies.has(tid)) return null;
        if (this.ticks < this.playStart + 50 && tp.type !== BOT) return null;
      }
      a.troops -= troops;
      if (tp) {
        this._onAttacked(tp, a, troops);
        for (const inc of tp.out) {
          if (!inc.active || inc.t !== a.id) continue;
          if (inc.troops > troops) { inc.troops -= troops; return null; }
          troops -= inc.troops; inc.troops = 0; inc.active = false;
        }
        if (troops < 1) return null;
      }
      for (const ex of a.out) {
        if (ex.active && ex.t === tid) {
          ex.troops += troops;
          if (src !== undefined && src >= 0) this._addFront(ex, src);
          return ex;
        }
      }
      const at = { id: this.attackSeq++, a: a, t: tid, troops: troops, heap: new Heap(128), front: new Set(), active: true, start: this.ticks };
      a.out.push(at); this.attacks.push(at);
      if (src !== undefined && src >= 0) this._addFront(at, src); else this._refreshFront(at);
      return at;
    }

    _onAttacked(tp, a, troops) {
      tp.hitBy.set(a.id, this.ticks);
      if (tp.type === NATION) this._rel(tp, a, -80);
      if (tp === this.human) {
        const last = tp.warned || (tp.warned = new Map());
        if (!(this.ticks - (last.get(a.id) || -999) < 150)) {
          last.set(a.id, this.ticks);
          this.note(a.name + ' greift dich an (' + G.fmtTroops(troops) + ' Truppen)', 'bad', a.id);
        }
      }
    }

    _rel(p, other, delta) {
      const v = within((p.rel.get(other.id) || 0) + delta, -100, 100);
      p.rel.set(other.id, v);
    }

    _addFront(at, tile) {
      const o = this.owner, W = this.W, N = this.N, land = this.land, tid = at.t, aid = at.a.id, x0 = tile % W;
      for (let k = 0; k < 4; k++) {
        const n = k === 0 ? (x0 > 0 ? tile - 1 : -1) : k === 1 ? (x0 < W - 1 ? tile + 1 : -1) : k === 2 ? (tile >= W ? tile - W : -1) : (tile < N - W ? tile + W : -1);
        if (n < 0 || o[n] !== tid || !land[n]) continue;
        at.front.add(n);
        const x = n % W;
        let own = 0;
        if (x > 0 && o[n - 1] === aid) own++;
        if (x < W - 1 && o[n + 1] === aid) own++;
        if (n >= W && o[n - W] === aid) own++;
        if (n < N - W && o[n + W] === aid) own++;
        if (own > 2) own = 10;
        const m = this.mag[n], tf = m < 10 ? 1 : m < 20 ? 1.5 : 2;
        at.heap.push((this.rng.int(0, 7) + 10) * (1 - own * 0.5 + tf / 2) + this.ticks, n);
      }
    }

    _refreshFront(at) {
      at.heap.clear(); at.front.clear();
      for (const t of at.a.border) this._addFront(at, t);
    }

    _defended(tp, t) {
      const W = this.W, x = t % W, y = (t / W) | 0, r2 = this.R.defense * this.R.defense;
      for (const d of tp.defs) {
        const dx = d.x - x, dy = d.y - y;
        if (dx * dx + dy * dy <= r2) return true;
      }
      return false;
    }

    _tickAttack(at) {
      const a = at.a;
      if (!a.alive) { at.active = false; return; }
      let tp = null;
      if (at.t) {
        tp = this.players[at.t];
        if (!tp.alive || a.allies.has(at.t)) { this.endAttack(at, 0); return; }
      }
      if (at.troops < 1) { at.active = false; return; }
      const n = at.front.size + this.rng.int(0, 6);
      let budget = tp ? within(((5 * at.troops) / Math.max(1, tp.troops)) * 2, 0.01, 0.5) * n * 3 : n * 2;
      const o = this.owner, W = this.W, N = this.N, aid = a.id, tid = at.t, heap = at.heap, R = this.R;
      while (budget > 0) {
        if (at.troops < 1) { at.active = false; return; }
        if (heap.n === 0) {
          this._refreshFront(at);
          if (heap.n === 0) { this.endAttack(at, 0); return; }
        }
        const t = heap.pop();
        at.front.delete(t);
        if (o[t] !== tid) continue;
        const x = t % W;
        if (!((x > 0 && o[t - 1] === aid) || (x < W - 1 && o[t + 1] === aid) ||
              (t >= W && o[t - W] === aid) || (t < N - W && o[t + W] === aid))) continue;
        this._addFront(at, t);
        const m = this.mag[t];
        let mg, sp;
        if (m < 10) { mg = 80; sp = 16.5; } else if (m < 20) { mg = 100; sp = 20; } else { mg = 120; sp = 25; }
        if (tp && tp.defs.length && this._defended(tp, t)) { mg *= 5; sp *= 5; }
        if (this.fallout[t]) {
          const f = 5 - (this.falloutCount / this.map.landTiles) * 2;
          mg *= f; sp *= f;
        }
        if (tp && tp.type === BOT && a.type !== BOT) mg *= 0.8;
        let aLoss, dLoss, used;
        if (tp) {
          const lossMod = a.tiles > R.big1 ? Math.sqrt(R.big1 / a.tiles) : 1;
          const slow = a.tiles > R.big2 ? Math.pow(R.big2 / a.tiles, 0.6) : 1;
          aLoss = within(tp.troops / at.troops, 0.6, 2) * mg * 0.8 * lossMod * (this.ticks < tp.traitorUntil ? 0.5 : 1);
          dLoss = tp.troops / Math.max(1, tp.tiles);
          used = within(tp.troops / (5 * at.troops), 0.2, 1.5) * sp * slow;
        } else {
          aLoss = a.type === BOT ? mg / 10 : mg / 5;
          dLoss = 0;
          used = within((2000 * Math.max(10, sp)) / at.troops, 5, 100);
        }
        budget -= used;
        at.troops -= aLoss;
        if (tp) tp.troops = Math.max(0, tp.troops - dLoss);
        this.conquer(a, t);
        if (tp && tp.tiles < R.deadTiles) {
          this._finish(a, tp);
          if (!tp.alive || tp.tiles === 0) { this.endAttack(at, 0); return; }
        }
      }
    }

    // Angriff beenden; malus = Anteil der Truppen, der beim Rückzug verloren geht
    endAttack(at, malus) {
      if (!at.active) return;
      at.a.troops += Math.max(0, at.troops) * (1 - (malus || 0));
      at.troops = 0; at.active = false;
    }

    // Besiegten Gegner auflösen: Gold übernehmen, Restfelder verteilen
    _finish(a, tp) {
      const W = this.W, N = this.N, o = this.owner, id = tp.id;
      const gold = tp.gold;
      if (gold > 0) {
        tp.gold = 0; a.gold += gold;
        if (a === this.human) this.note(tp.name + ' besiegt' + (gold >= 1000 ? ', ' + G.fmtNum(gold) + ' Gold erbeutet' : ''), 'good', tp.id);
      }
      const list = [];
      for (let y = tp.y0; y <= tp.y1; y++) for (let x = tp.x0; x <= tp.x1; x++) {
        const t = y * W + x;
        if (o[t] === id) list.push(t);
      }
      for (let pass = 0; pass < 10 && tp.tiles > 0; pass++) {
        let moved = false;
        for (const t of list) {
          if (o[t] !== id) continue;
          const x = t % W;
          let other = 0, mine = false;
          const chk = function (n) { const k = o[n]; if (k === a.id) mine = true; else if (k && k !== id && !other) other = k; };
          if (x > 0) chk(t - 1);
          if (x < W - 1) chk(t + 1);
          if (t >= W) chk(t - W);
          if (t < N - W) chk(t + W);
          if (mine) { this.conquer(a, t); moved = true; }
          else if (other) { this.conquer(this.players[other], t); moved = true; }
        }
        if (!moved) break;
      }
      if (tp.tiles === 0) this._kill(tp, a);
    }

    _kill(p, by) {
      if (!p.alive) return;
      p.alive = false; p.troops = 0;
      for (const at of p.out) { at.active = false; at.troops = 0; }
      for (const at of this.attacks) if (at.active && at.t === p.id) this.endAttack(at, 0);
      for (const u of p.units.slice()) this._killUnit(u);
      for (const id of Array.from(p.allies.keys())) { this.players[id].allies.delete(p.id); }
      p.allies.clear();
      this.requests = this.requests.filter(function (r) { return r.from !== p && r.to !== p; });
      if (p === this.human) this.events.push({ k: 'defeat', by: by ? by.id : 0 });
    }

    // ------------------------------------------------------------ Eingeschlossene Gebiete
    _clusters(p) {
      const border = p.border;
      if (!border.size) return;
      const st = this.stamp, sid = ++this.stampId, W = this.W, H = this.H, N = this.N, o = this.owner, land = this.land, pid = p.id, q = this.q;
      const list = [];
      for (const s of border) {
        if (st[s] === sid) continue;
        let qh = 0, qt = 0;
        q[qt++] = s; st[s] = sid;
        const c = { first: s, size: 0, open: false, tn: false, x0: 1e9, y0: 1e9, x1: -1, y1: -1, ex0: 1e9, ey0: 1e9, ex1: -1, ey1: -1, en: null };
        while (qh < qt) {
          const t = q[qh++], x = t % W, y = (t / W) | 0;
          c.size++;
          if (x < c.x0) c.x0 = x;
          if (x > c.x1) c.x1 = x;
          if (y < c.y0) c.y0 = y;
          if (y > c.y1) c.y1 = y;
          if (x === 0 || y === 0 || x === W - 1 || y === H - 1) c.open = true;
          for (let k = 0; k < 8; k++) {
            const nx = x + DX8[k], ny = y + DY8[k];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            const n = ny * W + nx, on = o[n];
            if (k < 4 && on !== pid) {
              if (!land[n]) c.open = true;
              else if (!on) c.tn = true;
              else {
                if (nx < c.ex0) c.ex0 = nx;
                if (nx > c.ex1) c.ex1 = nx;
                if (ny < c.ey0) c.ey0 = ny;
                if (ny > c.ey1) c.ey1 = ny;
                if (!c.en) c.en = new Map();
                c.en.set(on, (c.en.get(on) || 0) + 1);
              }
            }
            if (on === pid && st[n] !== sid && border.has(n)) { st[n] = sid; q[qt++] = n; }
          }
        }
        list.push(c);
      }
      list.sort(function (a, b) { return b.size - a.size; });
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        if (c.open || !c.en) continue;
        if (!(c.ex0 <= c.x0 && c.ey0 <= c.y0 && c.ex1 >= c.x1 && c.ey1 >= c.y1)) continue;
        if (i === 0 && (c.tn || c.en.size !== 1)) continue;   // Hauptgebiet nur, wenn ein einziger Gegner es umschliesst
        this._takeCluster(p, c);
        if (!p.alive || p.tiles === 0) return;
      }
    }

    _takeCluster(p, c) {
      // Wer bekommt das Gebiet? Der Nachbar mit dem grössten laufenden Angriff, sonst der häufigste Nachbar
      let cap = null, best = 0;
      for (const id of c.en.keys()) {
        const q = this.players[id];
        if (!q.alive || q.allies.has(p.id)) continue;
        for (const at of q.out) if (at.active && at.t === p.id && at.troops > best) { best = at.troops; cap = q; }
      }
      if (!cap) {
        let bn = 0;
        for (const e of c.en) if (e[1] > bn) { bn = e[1]; cap = this.players[e[0]]; }
        if (!cap || !cap.alive || cap.allies.has(p.id)) return;
      }
      const W = this.W, N = this.N, o = this.owner, pid = p.id, st = this.stamp, sid = ++this.stampId;
      const tiles = [c.first];
      st[c.first] = sid;
      for (let i = 0; i < tiles.length; i++) {
        const t = tiles[i], x = t % W;
        if (x > 0 && o[t - 1] === pid && st[t - 1] !== sid) { st[t - 1] = sid; tiles.push(t - 1); }
        if (x < W - 1 && o[t + 1] === pid && st[t + 1] !== sid) { st[t + 1] = sid; tiles.push(t + 1); }
        if (t >= W && o[t - W] === pid && st[t - W] !== sid) { st[t - W] = sid; tiles.push(t - W); }
        if (t < N - W && o[t + W] === pid && st[t + W] !== sid) { st[t + W] = sid; tiles.push(t + W); }
      }
      const all = tiles.length === p.tiles;
      if (all) {
        const gold = p.gold;
        if (gold > 0) { p.gold = 0; cap.gold += gold; }
        if (cap === this.human) this.note(p.name + ' eingekreist' + (gold >= 1000 ? ', ' + G.fmtNum(gold) + ' Gold erbeutet' : ''), 'good', p.id);
      }
      for (const t of tiles) this.conquer(cap, t);
      if (all) this._kill(p, cap);
    }

    // ------------------------------------------------------------ Beschriftung
    _shrinkBox(p) {
      const W = this.W, o = this.owner, id = p.id;
      let x0 = p.x0, x1 = p.x1, y0 = p.y0, y1 = p.y1;
      const row = function (y) { for (let x = x0; x <= x1; x++) if (o[y * W + x] === id) return true; return false; };
      const col = function (x) { for (let y = y0; y <= y1; y++) if (o[y * W + x] === id) return true; return false; };
      while (y0 <= y1 && !row(y0)) y0++;
      while (y1 >= y0 && !row(y1)) y1--;
      while (x0 <= x1 && !col(x0)) x0++;
      while (x1 >= x0 && !col(x1)) x1--;
      if (y0 > y1 || x0 > x1) { p.x0 = 1e9; p.y0 = 1e9; p.x1 = -1; p.y1 = -1; }
      else { p.x0 = x0; p.x1 = x1; p.y0 = y0; p.y1 = y1; }
      p.lostTiles = false;
    }

    _placeName(p) {
      if (p.lostTiles) this._shrinkBox(p);
      p.nameAt = this.ticks;
      if (p.x1 < p.x0) { p.ns = 0; return; }
      const W = this.W, o = this.owner, id = p.id, dp = this.dp;
      const bw = p.x1 - p.x0 + 1, bh = p.y1 - p.y0 + 1;
      const st = Math.max(1, Math.ceil(Math.max(bw, bh) / 60));
      const gw = Math.ceil(bw / st), gh = Math.ceil(bh / st), half = st >> 1;
      let best = 0, bx = 0, by = 0;
      for (let gy = 0; gy < gh; gy++) {
        const y = p.y0 + Math.min(bh - 1, gy * st + half);
        for (let gx = 0; gx < gw; gx++) {
          const x = p.x0 + Math.min(bw - 1, gx * st + half);
          let v = 0;
          if (o[y * W + x] === id) {
            v = 1;
            if (gx > 0 && gy > 0) v += Math.min(dp[(gy - 1) * 64 + gx], dp[gy * 64 + gx - 1], dp[(gy - 1) * 64 + gx - 1]);
          }
          dp[gy * 64 + gx] = v;
          if (v > best) { best = v; bx = gx; by = gy; }
        }
      }
      if (!best) { p.ns = 0; return; }
      const ty = by - best + 1;
      let lx = bx - best + 1, rx = bx;
      const full = function (c) { for (let r = ty; r <= by; r++) if (!dp[r * 64 + c]) return false; return true; };
      while (lx > 0 && rx - lx + 1 < best * 4 && full(lx - 1)) lx--;
      while (rx < gw - 1 && rx - lx + 1 < best * 4 && full(rx + 1)) rx++;
      const nw = (rx - lx + 1) * st, nh = best * st;
      p.nx = p.x0 + (lx + rx + 1) / 2 * st;
      p.ny = p.y0 + (ty + by + 1) / 2 * st;
      p.ns = Math.min(nh * 0.36, (nw * 0.92) / (0.6 * Math.max(4, p.name.length)));
    }

    // ------------------------------------------------------------ Allianzen
    allied(a, b) { return a.allies.has(b.id); }

    canRequest(from, to) {
      if (!from.alive || !to.alive || from === to || from.allies.has(to.id)) return false;
      if (this.isTraitor(from)) return false;
      if (this.ticks < (from.reqCool.get(to.id) || 0)) return false;
      for (const r of this.requests) if ((r.from === from && r.to === to) || (r.from === to && r.to === from)) return false;
      return true;
    }

    requestAlliance(from, to) {
      if (!this.canRequest(from, to)) return false;
      this.requests.push({ from: from, to: to, at: this.ticks });
      if (to === this.human) this.events.push({ k: 'allyReq', from: from.id, until: this.ticks + 200 });
      return true;
    }

    answerRequest(from, to, yes) {
      const i = this.requests.findIndex(function (r) { return r.from === from && r.to === to; });
      if (i < 0) return;
      this.requests.splice(i, 1);
      from.reqCool.set(to.id, this.ticks + 300);
      if (yes && from.alive && to.alive) {
        this._ally(from, to);
      } else if (from === this.human) {
        this.note(to.name + ' lehnt die Allianz ab', 'warn', to.id);
      }
    }

    _ally(a, b) {
      const exp = this.ticks + 6000;
      a.allies.set(b.id, exp); b.allies.set(a.id, exp);
      a.embargo.delete(b.id); b.embargo.delete(a.id);
      if (a.type === NATION) this._rel(a, b, 60);
      if (b.type === NATION) this._rel(b, a, 60);
      for (const at of this.attacks) {
        if (at.active && ((at.a === a && at.t === b.id) || (at.a === b && at.t === a.id))) this.endAttack(at, 0);
      }
      if (a === this.human || b === this.human) {
        const o = a === this.human ? b : a;
        this.note('Allianz mit ' + o.name + ' geschlossen (10 Minuten)', 'good', o.id);
      }
    }

    breakAlliance(p, other) {
      if (!p.allies.has(other.id)) return;
      p.allies.delete(other.id); other.allies.delete(p.id);
      p.traitorUntil = this.ticks + 300; p.betrayals++;
      other.embargo.add(p.id);
      for (const q of this.players) {
        if (q && q.alive && q.type === NATION && q !== p) this._rel(q, p, q === other ? -100 : -40);
      }
      if (other === this.human) this.note(p.name + ' hat die Allianz mit dir gebrochen', 'bad', p.id);
      else if (p === this.human) this.note('Du hast die Allianz mit ' + other.name + ' gebrochen. 30 Sekunden lang bist du als Verräter geschwächt.', 'warn', other.id);
    }

    donate(from, to, troops, gold) {
      if (!from.allies.has(to.id)) return false;
      troops = Math.min(troops || 0, from.troops); gold = Math.min(gold || 0, from.gold);
      if (troops < 1 && gold < 1) return false;
      from.troops -= troops; to.troops += troops; from.gold -= gold; to.gold += gold;
      if (to.type === NATION) this._rel(to, from, 20);
      if (to === this.human) this.note(from.name + ' schickt dir ' + (troops >= 1 ? G.fmtTroops(troops) + ' Truppen' : G.fmtNum(gold) + ' Gold'), 'good', from.id);
      return true;
    }

    _tickAlliances() {
      const t = this.ticks;
      for (const p of this.players) {
        if (!p || !p.alive || !p.allies.size) continue;
        for (const e of Array.from(p.allies)) {
          const id = e[0], exp = e[1];
          if (id < p.id) continue;
          const q = this.players[id];
          const left = exp - t;
          if (left <= 0) {
            p.allies.delete(id); q.allies.delete(p.id);
            if (p === this.human || q === this.human) this.note('Allianz mit ' + (p === this.human ? q : p).name + ' ist abgelaufen', 'warn', (p === this.human ? q : p).id);
          } else if (left <= 300 && left > 290) {
            if (p === this.human || q === this.human) {
              this.events.push({ k: 'renew', with: (p === this.human ? q : p).id, until: exp });
            } else if (this.rng.chance(2)) {
              p.allies.set(id, t + 6000); q.allies.set(p.id, t + 6000);
            }
          }
        }
      }
      // Anfragen: KI antwortet nach kurzer Bedenkzeit, alte Anfragen verfallen
      for (const r of this.requests.slice()) {
        if (r.to.type !== HUMAN && t - r.at >= 15) {
          this.answerRequest(r.from, r.to, this._aiAccepts ? this._aiAccepts(r.to, r.from) : false);
        } else if (t - r.at > 200) {
          this.answerRequest(r.from, r.to, false);
        }
      }
    }

    // Mensch verlängert eine Allianz: die KI entscheidet sofort
    renewAlliance(p, other) {
      if (!p.allies.has(other.id)) return false;
      const ok = other.type === HUMAN || (this._aiAccepts ? this._aiAccepts(other, p) : true);
      if (ok) {
        const exp = this.ticks + 6000;
        p.allies.set(other.id, exp); other.allies.set(p.id, exp);
        if (p === this.human) this.note('Allianz mit ' + other.name + ' verlängert', 'good', other.id);
      } else if (p === this.human) {
        this.note(other.name + ' will die Allianz nicht verlängern', 'warn', other.id);
      }
      return ok;
    }

    // ------------------------------------------------------------ Meldungen
    note(text, cls, pid) { this.events.push({ k: 'msg', text: text, cls: cls || 'info', pid: pid || 0 }); }

    // ------------------------------------------------------------ Takt
    tick() {
      this.ticks++;
      if (this.phase !== 'play') return;
      const t = this.ticks, ps = this.players;
      for (let i = 1; i < ps.length; i++) {
        const p = ps[i];
        if (!p.alive) continue;
        if (p.tiles === 0) { if (p.spawned) this._kill(p, null); continue; }
        p.troops += this.troopRate(p);
        p.gold += this.goldRate(p);
        if (p.type === HUMAN) {
          if (this.opts.infiniteGold && p.gold < 1e9) p.gold = 1e9;
          if (this.opts.infiniteTroops && p.troops < 1e6) p.troops = 1e6;
        }
        if (p.tiles > p.peak) p.peak = p.tiles;
        if (t - p.lastCluster >= 20 && p.lastChange >= p.lastCluster) {
          p.lastCluster = t;
          this._clusters(p);
        }
        if ((t + p.id * 3) % 20 === 0 && p.lastChange >= p.nameAt) this._placeName(p);
      }
      const as = this.attacks;
      let dead = false;
      for (let i = 0; i < as.length; i++) {
        if (as[i].active) this._tickAttack(as[i]);
        if (!as[i].active) dead = true;
      }
      if (dead) {
        this.attacks = as.filter(function (a) { return a.active; });
        for (let i = 1; i < ps.length; i++) {
          const p = ps[i];
          if (p.out.length) p.out = p.out.filter(function (a) { return a.active; });
        }
      }
      if (this._tickUnits) this._tickUnits();
      if (this._tickAI) this._tickAI();
      if (t % 10 === 0) { this._tickAlliances(); this._checkWin(); }
      if (t % 150 === 0 && this.tradeSum > 0) {
        // Handelseinnahmen gesammelt melden statt für jedes Schiff einzeln
        this.note('Handel: +' + G.fmtNum(this.tradeSum) + ' Gold aus ' + this.tradeN + (this.tradeN === 1 ? ' Fahrt' : ' Fahrten'), 'trade', 0);
        this.tradeSum = 0; this.tradeN = 0;
      }
    }

    _checkWin() {
      if (this.winner) return;
      const total = Math.max(1, this.map.landTiles - this.falloutCount);
      if (this.opts.duel && this.rival) {
        // Duell: Es gewinnt, wer den anderen ausschaltet
        const h = this.human, rv = this.rival;
        const w = !rv.alive && h.alive ? h : !h.alive && rv.alive ? rv : null;
        if (w) { this.winner = w; this.events.push({ k: 'win', id: w.id }); return; }
      }
      for (let i = 1; i < this.players.length; i++) {
        const p = this.players[i];
        if (p.alive && p.tiles / total >= 0.8) {
          this.winner = p;
          this.events.push({ k: 'win', id: p.id });
          return;
        }
      }
    }
  }

  const DX8 = [-1, 1, 0, 0, -1, 1, -1, 1], DY8 = [0, 0, -1, 1, -1, -1, 1, 1];
  G.DX8 = DX8; G.DY8 = DY8;
  G.Game = Game;
})(typeof window !== 'undefined' ? (window.G = window.G || {}) : (globalThis.G = globalThis.G || {}));
