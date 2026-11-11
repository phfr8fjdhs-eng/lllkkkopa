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
  G.randomClassMap = function (W, H, seed, kind, ref) {
    const N = W * H, cls = new Uint8Array(N), e = new Float32Array(N);
    const sh = SHAPES[kind] || SHAPES.zufall, k = (ref || W) / W;
    const fbm = makeNoise(seed ^ 0x51ed27), sc = W / sh.freq;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const u = x / W, v = y / H;
      const nx = Math.abs(u - 0.5) * 2, ny = Math.abs(v - 0.5) * 2;
      const edge = Math.max(nx, ny), n = fbm(x / sc, y / sc, 5);
      let h;
      if (kind === 'pangaea') h = n * 0.5 + 0.62 * (1 - Math.hypot(nx, ny));
      else if (kind === 'ring') h = n * 0.45 + 0.7 * (1 - Math.abs(Math.hypot(nx, ny * 0.92) - 0.6) * 3.4);
      else if (kind === 'duell') {
        const dl = Math.hypot((u - 0.25) / 0.2, (v - 0.5) / 0.4), dr = Math.hypot((u - 0.75) / 0.2, (v - 0.5) / 0.4);
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
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!land[i]) { mag[i] = dist[i] || 30; continue; }
      const n = fbm(x / 48, y / 48, 4), n2 = fbm(x / 11 + 300, y / 11 + 300, 3);
      let e = Math.max(0, (n - 0.45) * 26) + n2 * 6;
      e += P[i] * (7 + 6 * n2) + M[i] * (9 + 14 * n2);
      e *= 0.4 + 0.6 * Math.min(1, (dist[i] || 30) / 5);
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

    return {
      W: W, H: H, N: N, land: land, mag: mag, shore: shore, wcomp: wcomp, wsize: wsize,
      landTiles: landTiles,
      // Ranges are tuned for a two-million-tile world; smaller maps scale them down.
      S: G.within(Math.sqrt(N / 2e6), 0.4, 1),
      id: meta.id, name: meta.name, nations: meta.nations || []
    };
  };
})(globalThis.G = globalThis.G || {});
