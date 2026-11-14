(function (G) {
  'use strict';

  function boxBlur(src, W, H, r, tmp) {
    const win = 2 * r + 1;
    for (let y = 0; y < H; y++) {
      const row = y * W;
      let acc = 0;
      for (let x = -r; x <= r; x++) acc += src[row + Math.min(W - 1, Math.max(0, x))];
      for (let x = 0; x < W; x++) {
        tmp[row + x] = acc / win;
        acc += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < W; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x];
      for (let y = 0; y < H; y++) {
        src[y * W + x] = acc / win;
        acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
      }
    }
  }

  function makeNoise(seed) {
    const rng = new G.RNG(seed), lat = new Float32Array(65536);
    for (let i = 0; i < 65536; i++) lat[i] = rng.next();
    function v(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      let fx = x - xi, fy = y - yi;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const x0 = xi & 255, x1 = (xi + 1) & 255, y0 = (yi & 255) << 8, y1 = ((yi + 1) & 255) << 8;
      const a = lat[y0 | x0], b = lat[y0 | x1], c = lat[y1 | x0], d = lat[y1 | x1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    }
    return function (x, y, oct) {
      let s = 0, amp = 1, tot = 0, f = 1;
      for (let o = 0; o < oct; o++) {
        s += v(x * f + o * 37.1, y * f + o * 91.7) * amp;
        tot += amp; amp *= 0.5; f *= 2;
      }
      return s / tot;
    };
  }

  // Turn tiny islands into water and tiny ponds into land, so every piece of the map is playable.
  function cleanup(cls, W, H) {
    const N = W * H, seen = new Uint8Array(N), q = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (seen[s]) continue;
      const isLand = cls[s] > 0;
      let qh = 0, qt = 0;
      q[qt++] = s; seen[s] = 1;
      while (qh < qt) {
        const t = q[qh++], x = t % W, y = (t - x) / W;
        if (x > 0) { const n = t - 1; if (!seen[n] && (cls[n] > 0) === isLand) { seen[n] = 1; q[qt++] = n; } }
        if (x < W - 1) { const n = t + 1; if (!seen[n] && (cls[n] > 0) === isLand) { seen[n] = 1; q[qt++] = n; } }
        if (y > 0) { const n = t - W; if (!seen[n] && (cls[n] > 0) === isLand) { seen[n] = 1; q[qt++] = n; } }
        if (y < H - 1) { const n = t + W; if (!seen[n] && (cls[n] > 0) === isLand) { seen[n] = 1; q[qt++] = n; } }
      }
      if (isLand && qt < 12) for (let i = 0; i < qt; i++) cls[q[i]] = 0;
      else if (!isLand && qt < 30) for (let i = 0; i < qt; i++) cls[q[i]] = 1;
    }
  }

  // Invented maps. `kind` picks the overall shape; the default is a scatter of continents.
  // `ref` is the width the features are sized for, so a small preview shows the same world.
  const SHAPES = {
    zufall: { share: 0.4, freq: 4.6 },
    inseln: { share: 0.24, freq: 17 },
    pangaea: { share: 0.5, freq: 4.2 },
    ring: { share: 0.36, freq: 5.5 },
    duell: { share: 0.37, freq: 5 },
    seen: { share: 0.74, freq: 9 }
  };
  // plain square root, so every device builds exactly the same map
  function hyp(x, y) { return Math.sqrt(x * x + y * y); }
  G.randomClassMap = function (W, H, seed, kind, ref) {
    const N = W * H, cls = new Uint8Array(N), e = new Float32Array(N);
    const sh = SHAPES[kind] || SHAPES.zufall, k = (ref || W) / W;
    const fbm = makeNoise(seed ^ 0x51ed27), sc = W / sh.freq;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const nx = Math.abs(u - 0.5) * 2, ny = Math.abs(v - 0.5) * 2;
      const edge = Math.max(nx, ny), n = fbm(x / sc, y / sc, 5);
      let h;
      if (kind === 'pangaea') h = n * 0.5 + 0.62 * (1 - hyp(nx, ny));
      else if (kind === 'ring') h = n * 0.45 + 0.7 * (1 - Math.abs(hyp(nx, ny * 0.92) - 0.6) * 3.4);
      else if (kind === 'duell') {
        const dl = hyp((u - 0.25) / 0.2, (v - 0.5) / 0.4), dr = hyp((u - 0.75) / 0.2, (v - 0.5) / 0.4);
        h = n * 0.5 + 0.55 * (1 - Math.min(dl, dr));
      } else if (kind === 'seen') h = n - Math.max(0, edge - 0.86) * 3;
      else h = n - Math.max(0, edge - 0.74) * 1.7;
      e[y * W + x] = h;
    }
    const sample = new Float32Array(Math.ceil(N / 7));
    for (let i = 0, j = 0; i < N && j < sample.length; i += 7, j++) sample[j] = e[i];
    sample.sort();
    const thr = sample[Math.floor(sample.length * (1 - sh.share))];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (e[i] <= thr) continue;
      const ridge = 1 - Math.abs(fbm(x * k / 60 + 900, y * k / 60 + 900, 4) * 2 - 1);
      const plat = fbm(x * k / 90 + 400, y * k / 90 + 400, 3);
      cls[i] = (ridge > 0.9 && e[i] > thr + 0.02) ? 3 : (plat > 0.6 ? 2 : 1);
    }
    cleanup(cls, W, H);
    return cls;
  };
  // Hand-picked invented worlds with a fixed seed, so each one is always the same map.
  G.SPECIAL_MAPS = [
    { id: 'inseln', kind: 'inseln', name: 'Inselreich', note: 'Viele Inseln, Seemacht zählt', w: 960, h: 600, seed: 7411 },
    { id: 'pangaea', kind: 'pangaea', name: 'Pangäa', note: 'Ein einziger Riesenkontinent', w: 900, h: 620, seed: 2203 },
    { id: 'ring', kind: 'ring', name: 'Ringwelt', note: 'Land im Kreis um ein Binnenmeer', w: 860, h: 800, seed: 5150 },
    { id: 'duell', kind: 'duell', name: 'Zwei Welten', note: 'Zwei Kontinente, ein Meer dazwischen', w: 980, h: 560, seed: 9031 },
    { id: 'seen', kind: 'seen', name: 'Seenplatte', note: 'Viel Land, überall Seen', w: 900, h: 600, seed: 1287 }
  ];
  G.specialMap = function (def) {
    return G.buildMap(def.w, def.h, G.randomClassMap(def.w, def.h, def.seed, def.kind), def.seed, { id: def.id, name: def.name, nations: [] });
  };

  // Build the playable map from a class grid (0 water, 1 plain, 2 plateau, 3 mountain range).
  G.buildMap = function (W, H, cls, seed, meta) {
    const N = W * H;
    const land = new Uint8Array(N), mag = new Uint8Array(N), shore = new Uint8Array(N);
    let landTiles = 0;
    for (let i = 0; i < N; i++) if (cls[i]) { land[i] = 1; landTiles++; }

    // Distance to the nearest tile of the other kind (land <-> water), capped.
    const dist = new Uint8Array(N), q = new Int32Array(N);
    let qh = 0, qt = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, l = land[i];
      if ((x > 0 && land[i - 1] !== l) || (x < W - 1 && land[i + 1] !== l) ||
          (y > 0 && land[i - W] !== l) || (y < H - 1 && land[i + W] !== l)) {
        dist[i] = 1; shore[i] = l ? 1 : 2; q[qt++] = i;
      }
    }
    while (qh < qt) {
      const i = q[qh++], d = dist[i];
      if (d >= 30) continue;
      const l = land[i], x = i % W, y = (i - x) / W;
      if (x > 0 && land[i - 1] === l && !dist[i - 1]) { dist[i - 1] = d + 1; q[qt++] = i - 1; }
      if (x < W - 1 && land[i + 1] === l && !dist[i + 1]) { dist[i + 1] = d + 1; q[qt++] = i + 1; }
      if (y > 0 && land[i - W] === l && !dist[i - W]) { dist[i - W] = d + 1; q[qt++] = i - W; }
      if (y < H - 1 && land[i + W] === l && !dist[i + W]) { dist[i + W] = d + 1; q[qt++] = i + W; }
    }

    // Elevation: rolling plains everywhere, raised inside plateau and mountain regions.
    const fbm = makeNoise(seed);
    const M = new Float32Array(N), P = new Float32Array(N), tmp = new Float32Array(N);
    for (let i = 0; i < N; i++) { if (cls[i] === 3) M[i] = 1; if (cls[i] >= 2) P[i] = 1; }
    boxBlur(M, W, H, 3, tmp); boxBlur(M, W, H, 2, tmp);
    boxBlur(P, W, H, 4, tmp); boxBlur(P, W, H, 3, tmp);
    // Maps cut from the real Earth know where they lie (meta.lat, meta.lon). There Antarctica and
    // Greenland carry their ice sheet: the ground rises from the coast to a dome some 3000 m high.
    const geo = meta.lat ? { proj: 'merc', lat: meta.lat, lon: meta.lon } : null;
    const lats = G.rowLats(H, geo);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!land[i]) { mag[i] = dist[i] || 30; continue; }
      const n = fbm(x / 48, y / 48, 4), n2 = fbm(x / 11 + 300, y / 11 + 300, 3);
      let e = Math.max(0, (n - 0.45) * 26) + n2 * 6;
      e += P[i] * (7 + 6 * n2) + M[i] * (9 + 14 * n2);
      e *= 0.4 + 0.6 * Math.min(1, (dist[i] || 30) / 5);
      if (geo && geo.lon) {
        const lat = lats[y], lon = geo.lon[0] + (x + 0.5) / W * (geo.lon[1] - geo.lon[0]), lw = lon > 180 ? lon - 360 : lon;
        if (lat < -64 || (lat > 68 && lw > -73 && lw < -12) || (lat > 59 && lat <= 68 && lw > -55 && lw < -40)) e += 10 * Math.min(1, (dist[i] || 30) / 14);
      }
      mag[i] = Math.min(30, Math.round(e));
    }

    // Connected bodies of water, so ships only sail where they can actually arrive.
    const wcomp = new Uint16Array(N), wsize = [0];
    let nc = 0;
    for (let s = 0; s < N; s++) {
      if (land[s] || wcomp[s]) continue;
      nc++; qh = 0; qt = 0; q[qt++] = s; wcomp[s] = nc;
      while (qh < qt) {
        const t = q[qh++], x = t % W, y = (t - x) / W;
        if (x > 0 && !land[t - 1] && !wcomp[t - 1]) { wcomp[t - 1] = nc; q[qt++] = t - 1; }
        if (x < W - 1 && !land[t + 1] && !wcomp[t + 1]) { wcomp[t + 1] = nc; q[qt++] = t + 1; }
        if (y > 0 && !land[t - W] && !wcomp[t - W]) { wcomp[t - W] = nc; q[qt++] = t - W; }
        if (y < H - 1 && !land[t + W] && !wcomp[t + W]) { wcomp[t + W] = nc; q[qt++] = t + W; }
      }
      wsize.push(qt);
    }

    return G.addClimate({
      W: W, H: H, N: N, land: land, mag: mag, shore: shore, wcomp: wcomp, wsize: wsize,
      landTiles: landTiles,
      // Ranges are tuned for a two-million-tile world; smaller maps scale them down.
      S: G.within(Math.sqrt(N / 2e6), 0.4, 1),
      id: meta.id, name: meta.name, nations: meta.nations || []
    }, lats);
  };

  // ---------- climate: height, temperature and what the cold does ----------
  // Latitude of every row of a map, in degrees. `geo.proj` is 'merc' (the small maps, Mercator) or
  // 'pat' (the Earth, Patterson), `geo.lat` the southern and northern edge. Invented maps pretend
  // to reach from 55 N down to 5 N. Only G.M and plain arithmetic, so every device gets the same rows.
  G.rowLats = function (H, geo) {
    const M = G.M, RAD = M.PI / 180, out = new Float64Array(H);
    // inverse of a rising function by halving the interval
    const solve = function (f, v, lo, hi) { for (let i = 0; i < 46; i++) { const m = (lo + hi) / 2; if (f(m) < v) lo = m; else hi = m; } return (lo + hi) / 2; };
    if (!geo || !geo.lat) { for (let y = 0; y < H; y++) out[y] = 55 - 50 * (y + 0.5) / H; return out; }
    let fwd;
    if (geo.proj === 'pat') fwd = function (phi) { const p2 = phi * phi; return phi * (1.0148 + p2 * p2 * (0.23185 + p2 * (-0.14499 + p2 * 0.02406))); };
    else {
      // Mercator: y = artanh(sin(phi)), found by halving as well (G.M has no logarithm)
      const tanh = function (v) { const e = M.exp(2 * v); return (e - 1) / (e + 1); };
      fwd = function (phi) { return solve(tanh, M.sin(phi), -4, 4); };
    }
    const lim = geo.proj === 'pat' ? 90 : 85;
    const cl = function (d) { return d < -lim ? -lim : d > lim ? lim : d; };
    const ys = fwd(cl(geo.lat[0]) * RAD), yn = fwd(cl(geo.lat[1]) * RAD);
    for (let y = 0; y < H; y++) out[y] = solve(fwd, yn - (y + 0.5) / H * (yn - ys), -M.PI / 2, M.PI / 2) / RAD;
    return out;
  };
  // Height in metres, mean temperature and the cold factor of every tile, worked out on demand
  // (no extra memory per tile: the Earth has sixteen million of them).
  //   height       the Earth: the real height; other maps: 150 m for every step of `mag`
  //   temperature  at sea level 27 C on the equator, 10 C at 45 degrees, -1 C at 60, -31 C at the poles, and 6.5 C colder
  //                for every 1000 m of height
  //   cold         1 down to freezing, then rising evenly to 2 at -45 C: how many times slower
  //                the frozen ground is to cross (see G.groundSpeed in 03_game.js)
  G.CLIMATE = { equator: 27, k: 0.0175, pow: 1.8, lapse: 6.5, coldest: 45, step: 150 };
  G.addClimate = function (map, lats) {
    const M = G.M, C = G.CLIMATE, W = map.W, H = map.H, rowT = new Int16Array(H);
    for (let y = 0; y < H; y++) {
      const al = lats[y] < 0 ? -lats[y] : lats[y];
      rowT[y] = M.round(10 * (C.equator - (al > 0.01 ? C.k * M.pow(al, C.pow) : 0)));
    }
    const mag = map.mag, hgt = map.hgt, hw = map.hw, hh = map.hh;
    map.rowLat = lats; map.rowT = rowT;
    map.elevOf = hgt ? function (t) {
      const x = t % W, y = (t - x) / W, hx = x >> 1, hy = y >> 1;
      const v = hgt[(hy < hh ? hy : hh - 1) * hw + (hx < hw ? hx : hw - 1)];
      return (v * v * 8850 / 65025) | 0;            // the builder stores sqrt(height / 8850 m) in a byte
    } : function (t) { return mag[t] * C.step; };
    // in tenths of a degree, a whole number
    map.temp10 = function (t) { return rowT[(t / W) | 0] - M.round(C.lapse * map.elevOf(t) / 100); };
    map.tempOf = function (t) { return M.round(map.temp10(t) / 10); };
    map.coldOf = function (t) {
      const d = -map.temp10(t);
      return d <= 0 ? 1 : d >= C.coldest * 10 ? 2 : 1 + d / (C.coldest * 10);
    };
    return map;
  };

  // ---------- the Earth: a map made from real data (tools/build_world.py) ----------
  // What the land is covered with. Together with the height it decides how hard a tile is to
  // take (see G.TERRAIN in 03_game.js) and how it is painted.
  G.COVER = { WATER: 0, GRASS: 1, FARM: 2, FOREST: 3, DESERT: 4, TUNDRA: 5, ICE: 6, SWAMP: 7 };
  G.COVER_NAME = ['Wasser', 'Grasland', 'Ackerland', 'Wald', 'Wüste', 'Tundra', 'Eis', 'Sumpf'];
  // bits of map.feat
  G.FEAT = { RIVER: 1, GREAT: 2, TAIGA: 4, JUNGLE: 8 };

  // `cls`: one byte per tile as written by the builder (cover in bits 0-2, river bit 3, great
  // river bit 4, taiga bit 5, rain forest bit 6, snow cap bit 7). `cost`: 0..30 per tile. `hgt`: height at half
  // the resolution, for the relief shading only.
  G.buildWorld = function (def, cls, cost, hgt) {
    const W = def.w, H = def.h, N = W * H;
    const land = new Uint8Array(N), mag = new Uint8Array(N), shore = new Uint8Array(N);
    const cover = new Uint8Array(N), feat = new Uint8Array(N), snow = new Uint8Array(N);
    let landTiles = 0;
    for (let i = 0; i < N; i++) {
      const c = cls[i], cv = c & 7;
      if (!cv) continue;
      snow[i] = c >> 7;
      land[i] = 1; landTiles++; cover[i] = cv; mag[i] = cost[i] > 30 ? 30 : cost[i];
      feat[i] = ((c >> 3) & 1) | (((c >> 4) & 1) << 1) | (((c >> 5) & 1) << 2) | (((c >> 6) & 1) << 3);
    }
    // the coast, on both sides
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      const l = land[i];
      if ((x > 0 && land[i - 1] !== l) || (x < W - 1 && land[i + 1] !== l) || (y > 0 && land[i - W] !== l) || (y < H - 1 && land[i + W] !== l)) shore[i] = l ? 1 : 2;
    }
    // Distance of every water tile to the nearest land, in thirds of a tile, by two sweeps over
    // the map (a chamfer transform: a straight step counts 3, a diagonal one 4). Whole numbers
    // only, so every device gets the same sea. It is what ships use to keep off the coast and
    // what the picture uses to shade the water.
    const INF = 60000, d = new Uint16Array(N);
    for (let i = 0; i < N; i++) d[i] = land[i] ? 0 : INF;
    for (let y = 0, i = 0; y < H; y++) for (let x = 0; x < W; x++, i++) {
      let v = d[i];
      if (!v) continue;
      if (x > 0 && d[i - 1] + 3 < v) v = d[i - 1] + 3;
      if (y > 0) {
        if (d[i - W] + 3 < v) v = d[i - W] + 3;
        if (x > 0 && d[i - W - 1] + 4 < v) v = d[i - W - 1] + 4;
        if (x < W - 1 && d[i - W + 1] + 4 < v) v = d[i - W + 1] + 4;
      }
      d[i] = v;
    }
    for (let y = H - 1, i = N - 1; y >= 0; y--) for (let x = W - 1; x >= 0; x--, i--) {
      let v = d[i];
      if (!v) continue;
      if (x < W - 1 && d[i + 1] + 3 < v) v = d[i + 1] + 3;
      if (y < H - 1) {
        if (d[i + W] + 3 < v) v = d[i + W] + 3;
        if (x < W - 1 && d[i + W + 1] + 4 < v) v = d[i + W + 1] + 4;
        if (x > 0 && d[i + W - 1] + 4 < v) v = d[i + W - 1] + 4;
      }
      d[i] = v;
      const t = (v + 1) / 3 | 0;
      mag[i] = t > 30 ? 30 : t;
    }
    for (let i = 0; i < N; i++) if (!land[i] && d[i] < INF) { const t = (d[i] + 1) / 3 | 0; mag[i] = t > 30 ? 30 : t < 1 ? 1 : t; }

    // Connected bodies of water, so ships only sail where they can actually arrive.
    const wcomp = new Uint16Array(N), wsize = [0], q = new Int32Array(N);
    let nc = 0;
    for (let s = 0; s < N; s++) {
      if (land[s] || wcomp[s]) continue;
      nc++;
      let qh = 0, qt = 0;
      q[qt++] = s; wcomp[s] = nc;
      while (qh < qt) {
        const t = q[qh++], x = t % W, y = (t - x) / W;
        if (x > 0 && !land[t - 1] && !wcomp[t - 1]) { wcomp[t - 1] = nc; q[qt++] = t - 1; }
        if (x < W - 1 && !land[t + 1] && !wcomp[t + 1]) { wcomp[t + 1] = nc; q[qt++] = t + 1; }
        if (y > 0 && !land[t - W] && !wcomp[t - W]) { wcomp[t - W] = nc; q[qt++] = t - W; }
        if (y < H - 1 && !land[t + W] && !wcomp[t + W]) { wcomp[t + W] = nc; q[qt++] = t + W; }
      }
      wsize.push(qt);
    }
    return G.addClimate({
      W: W, H: H, N: N, land: land, mag: mag, shore: shore, wcomp: wcomp, wsize: wsize, landTiles: landTiles,
      cover: cover, feat: feat, snow: snow, hgt: hgt, hw: W >> 1, hh: H >> 1,
      S: G.within(Math.sqrt(N / 2e6), 0.4, 1),
      id: def.id, name: def.name, nations: def.nations || [], credit: def.credit || ''
    }, G.rowLats(H, { proj: 'pat', lat: def.lat || [-57.5, 79.5] }));
  };
})(globalThis.G = globalThis.G || {});
