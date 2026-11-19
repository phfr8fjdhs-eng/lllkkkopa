// Nahansicht (close-up): from a zoom of Z3D pixels per tile on, the map shows a model of the war
// instead of signs. Buildings stand as small 3D models that grow with their level (a village, a
// town, a city of towers), the troops stand as tanks where the posture puts them, attacks are lines
// of tanks firing at the front, conquered ground is scorched, dug-in borders get sandbags.
//
// Only a picture: nothing here changes the game, so every device still computes the same numbers.
// No Math.random: the little that looks random comes from a hash of fixed numbers, time comes from
// the frame clock `now`. Only what the player may know is drawn: the net of the others stays hidden
// (their tanks stand evenly, as the plain troop count says), hidden buildings stay hidden.
//
// The projection keeps the map flat and exactly where it was (taps hit the same tiles as before):
// a point at height h is drawn LEAN * h to the right and h up. One looks at the world from the south
// west, so the top, the south and the west side of a body are seen. Light comes from the north west.
(function (G) {
  'use strict';
  const View = G.View, UT = G.UT, PT = G.PT, within = G.within;
  const Z3D = G.Z3D = 7;                      // pixels per tile from which on the close-up is drawn
  const LEAN = 0.3;                           // how far a height leans to the right
  const LX = -0.45, LY = -0.5, LZ = 0.74;     // the light, from the north west and above
  const SHX = 0.36, SHY = 0.4;               // a shadow per pixel of height (shortened, the map must stay readable)
  const TANK_CAP = 180;                       // at most so many tanks on the screen
  const PLATOON = 9;                          // at most so many tanks in one cell
  const Z_PARK = 11;                          // from this zoom on also the tanks parked in the hinterland
  const SCORCH = 18000;                       // ms a crater stays
  let BASE = 1;                               // the opacity everything is drawn with (below 1 while the models fade in)

  // ---------- small helpers ----------
  function hash(a, b) {
    let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  }
  function css(c, k) {
    return 'rgb(' + within(Math.round(c[0] * k), 0, 255) + ',' + within(Math.round(c[1] * k), 0, 255) + ',' + within(Math.round(c[2] * k), 0, 255) + ')';
  }
  function mix(a, b, f) { return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]; }
  // brightness of a face with the outward normal (nx, ny, nz), the top at 1
  function lit(nx, ny, nz) { const d = LX * nx + LY * ny + LZ * nz; return (0.6 + 0.4 * Math.max(0, d)) / 0.896; }
  const K_TOP = lit(0, 0, 1);
  function rect(cx, cy, x0, y0, x1, y1, s) { return [[cx + x0 * s, cy + y0 * s], [cx + x1 * s, cy + y0 * s], [cx + x1 * s, cy + y1 * s], [cx + x0 * s, cy + y1 * s]]; }
  function ngon(cx, cy, r, n, rot, sy) {
    const out = [];
    for (let i = 0; i < n; i++) { const a = rot + i * 6.2832 / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * (sy || 1)]); }
    return out;
  }
  function turn(cx, cy, pts, ang) {      // points given relative to (cx, cy), turned by ang
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map(function (p) { return [cx + p[0] * c - p[1] * s, cy + p[0] * s + p[1] * c]; });
  }
  function hull(pts) {
    const p = pts.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    if (p.length < 3) return p;
    const cr = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    const lo = [], up = [];
    for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
    for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  function path(ctx, pts) {
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    ctx.closePath();
  }

  // ---------- bodies ----------
  // A body: a ground outline `g` (convex, screen pixels) raised from h0 to h1 pixels. Drawn: the walls
  // that face the viewer, then the top. `top` may differ from the walls' colour.
  function body(g, h0, h1, col, top) { return { g: g, h0: h0, h1: h1, col: col, top: top || col }; }
  function drawBody(ctx, b) {
    const g = b.g, n = g.length, h0 = b.h0, h1 = b.h1;
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += g[i][0]; cy += g[i][1]; }
    cx /= n; cy /= n;
    ctx.lineJoin = 'round';
    if (h1 - h0 > 0.4) {
      for (let i = 0; i < n; i++) {
        const a = g[i], c = g[(i + 1) % n];
        let nx = c[1] - a[1], ny = a[0] - c[0];
        const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
        if (nx * ((a[0] + c[0]) / 2 - cx) + ny * ((a[1] + c[1]) / 2 - cy) < 0) { nx = -nx; ny = -ny; }
        if (ny - LEAN * nx <= 0.01) continue;                   // faces away from the viewer
        ctx.beginPath();
        ctx.moveTo(a[0] + LEAN * h0, a[1] - h0); ctx.lineTo(c[0] + LEAN * h0, c[1] - h0);
        ctx.lineTo(c[0] + LEAN * h1, c[1] - h1); ctx.lineTo(a[0] + LEAN * h1, a[1] - h1); ctx.closePath();
        const s = css(b.col, lit(nx, ny, 0));
        ctx.fillStyle = s; ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = s; ctx.stroke();   // the stroke closes the seams between walls
      }
    }
    ctx.beginPath();
    ctx.moveTo(g[0][0] + LEAN * h1, g[0][1] - h1);
    for (let i = 1; i < n; i++) ctx.lineTo(g[i][0] + LEAN * h1, g[i][1] - h1);
    ctx.closePath();
    ctx.fillStyle = css(b.top, K_TOP); ctx.fill();
    ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(20,24,30,.28)'; ctx.stroke();
  }
  // The shadows of a group of bodies as one shape, so where they overlap it is not darker.
  function drawShadow(ctx, bodies, alpha) {
    ctx.beginPath();
    for (const b of bodies) {
      if (b.h1 < 1) continue;
      const pts = [];
      for (const p of b.g) { pts.push([p[0] + SHX * b.h0, p[1] + SHY * b.h0]); pts.push([p[0] + SHX * b.h1, p[1] + SHY * b.h1]); }
      path(ctx, hull(pts));
    }
    ctx.fillStyle = 'rgba(14,18,10,' + alpha + ')'; ctx.fill('nonzero');
  }
  // Smoke rising from a point, driven by the clock: a few puffs that grow and fade.
  function smoke(ctx, x, y, s, now, seed, dark, n) {
    n = n || 4;
    for (let k = 0; k < n; k++) {
      const f = (now / 2600 + k / n + seed) % 1;
      const r = s * (0.08 + 0.2 * f), px = x + s * (0.12 * f + 0.05 * Math.sin(f * 6 + seed * 9)), py = y - s * 0.85 * f;
      ctx.beginPath(); ctx.arc(px, py, r, 0, 6.2832);
      ctx.fillStyle = dark ? 'rgba(46,44,42,' + (0.5 * (1 - f)).toFixed(3) + ')' : 'rgba(226,226,222,' + (0.55 * (1 - f)).toFixed(3) + ')';
      ctx.fill();
    }
  }
  function fire(ctx, x, y, s, now, seed) {
    for (let k = 0; k < 3; k++) {
      const f = (now / 700 + k / 3 + seed) % 1, r = s * (0.11 - 0.07 * f);
      ctx.beginPath(); ctx.arc(x + s * 0.05 * Math.sin(seed * 7 + k * 2), y - s * 0.3 * f, Math.max(0.5, r), 0, 6.2832);
      ctx.fillStyle = 'rgba(255,' + Math.round(200 - 140 * f) + ',40,' + (0.9 * (1 - f)).toFixed(3) + ')'; ctx.fill();
    }
  }

  // ---------- the buildings ----------
  const CONCRETE = [206, 201, 190];
  const WALLS = [[222, 212, 192], [204, 182, 152], [186, 192, 198], [214, 200, 178], [198, 168, 146], [228, 222, 210]];
  const LAYOUT = [   // city blocks: x, y, width, depth (fractions of the size); the first is the centre tower
    [0.02, -0.04, 0.28, 0.28], [-0.27, 0.16, 0.22, 0.2], [0.26, 0.16, 0.2, 0.22], [-0.25, -0.25, 0.22, 0.19], [0.27, -0.24, 0.19, 0.19],
    [0.0, 0.33, 0.24, 0.13], [-0.02, -0.38, 0.22, 0.11], [-0.42, -0.03, 0.12, 0.24], [0.42, -0.02, 0.12, 0.24]
  ];
  // How a city of level lv looks: how many blocks, how high. Grows smoothly with lv (also between
  // levels while it is being built up). Level 1 and 2 are a village of houses with pitched roofs.
  function cityParts(cx, cy, s, lv, seed, own) {
    const parts = [], roof = mix(own, [60, 60, 60], 0.22), glass = mix([92, 128, 158], own, 0.1);
    const n = Math.min(LAYOUT.length, 3 + 2.4 * Math.log2(Math.max(1, lv)));
    const top = s * (0.15 + 0.3 * Math.log10(1 + lv));
    for (let i = 0; i < n; i++) {
      const L = LAYOUT[i], grow = within(n - i, 0, 1);
      const w = L[2] * s, d = L[3] * s, x = cx + L[0] * s, y = cy + L[1] * s;
      const village = lv < 3;
      let h = (i === 0 ? (lv >= 10 ? 1.3 : 1) : 0.3 + 0.5 * hash(seed, i)) * top;
      if (village) h = s * (i === 0 ? 0.13 : 0.09);
      h *= grow;
      if (h < 0.8) continue;
      const tall = i === 0 && lv >= 20;
      const wall = mix(WALLS[(hash(seed, i + 40) * WALLS.length) | 0], own, 0.07);
      const key = y + d / 2 + (x - w / 2) * 0.01;
      parts.push({ b: body([[x - w / 2, y - d / 2], [x + w / 2, y - d / 2], [x + w / 2, y + d / 2], [x - w / 2, y + d / 2]], 0, h, tall ? glass : wall, i < 3 || village ? roof : mix(wall, [90, 90, 90], 0.45)), x0: x - w / 2, y0: y - d / 2, x1: x + w / 2, y1: y + d / 2, key: key, gable: village, tall: tall, seed: seed + i * 7 });
      if (tall) {   // a set-back crown on the tower, and a mast on the highest
        const w2 = w * 0.62, d2 = d * 0.62;
        parts.push({ b: body([[x - w2 / 2, y - d2 / 2], [x + w2 / 2, y - d2 / 2], [x + w2 / 2, y + d2 / 2], [x - w2 / 2, y + d2 / 2]], h, h + top * 0.22 * grow, glass, roof), x0: x - w2 / 2, y0: y - d2 / 2, x1: x + w2 / 2, y1: y + d2 / 2, key: key + 1e-3, tall: true, crown: true, mast: lv >= 50 ? top * 0.3 : 0, seed: seed + 3 });
      }
    }
    return parts;
  }
  // Floors on the south and the west wall of a box: dark bands of windows, some of them lit.
  function floors(ctx, x0, y0, x1, y1, h0, h1, seed, glass) {
    const H = h1 - h0, step = 4.6;
    if (H < 8 || x1 - x0 < 6) return;
    const n = Math.floor((H - 2.5) / step);
    for (let r = 0; r < n; r++) {
      const h = h0 + 2.5 + r * step;
      ctx.fillStyle = glass ? 'rgba(200,232,250,.38)' : 'rgba(40,52,66,.55)';
      ctx.fillRect(x0 + LEAN * h + 1, y1 - h - 1.7, x1 - x0 - 2, 1.7);
      ctx.beginPath();   // the same band on the west wall
      ctx.moveTo(x0 + LEAN * h, y0 - h + 1); ctx.lineTo(x0 + LEAN * h, y1 - h - 1); ctx.lineTo(x0 + LEAN * (h + 1.7), y1 - h - 2.7); ctx.lineTo(x0 + LEAN * (h + 1.7), y0 - h - 0.7); ctx.closePath();
      ctx.fill();
      // a few lit windows
      const k = Math.floor((x1 - x0 - 2) / 3);
      ctx.fillStyle = 'rgba(255,214,120,.95)';
      for (let c = 0; c < k; c++) if (hash(seed + r * 31, c) < 0.22) ctx.fillRect(x0 + LEAN * h + 1.5 + c * 3, y1 - h - 1.7, 1.8, 1.7);
    }
  }
  function drawCity(ctx, u, x, y, s, own, lv, now) {
    const seed = u.id * 13;
    s *= 1 + 0.2 * Math.log10(Math.max(1, lv));           // a big city takes more ground
    const village = lv < 3;
    const pad = body(rect(x, y, -0.5, -0.46, 0.5, 0.48, s), 0, s * 0.025, village ? [150, 146, 118] : [104, 108, 112], village ? [164, 160, 128] : [112, 116, 120]);
    const parts = cityParts(x, y, s, lv, seed, own);
    drawShadow(ctx, [pad].concat(parts.map(function (p) { return p.b; })), 0.24);
    drawBody(ctx, pad);
    if (!village) {   // the streets between the blocks
      const h = s * 0.025;
      ctx.strokeStyle = 'rgba(214,214,206,.5)'; ctx.lineWidth = Math.max(0.8, s * 0.012); ctx.setLineDash([s * 0.05, s * 0.04]);
      ctx.beginPath();
      ctx.moveTo(x - 0.48 * s + LEAN * h, y + 0.04 * s - h); ctx.lineTo(x + 0.48 * s + LEAN * h, y + 0.04 * s - h);
      ctx.moveTo(x - 0.11 * s + LEAN * h, y - 0.44 * s - h); ctx.lineTo(x - 0.11 * s + LEAN * h, y + 0.46 * s - h);
      ctx.stroke(); ctx.setLineDash([]);
    }
    parts.sort(function (a, b) { return a.key - b.key; });
    for (const p of parts) {
      drawBody(ctx, p.b);
      if (p.gable) {   // a pitched roof in the owner's colour on a small house
        const h = p.b.h1, r = (p.y1 - p.y0) * 0.45, my = (p.y0 + p.y1) / 2;
        ctx.beginPath();
        ctx.moveTo(p.x0 + LEAN * h, p.y1 - h); ctx.lineTo(p.x1 + LEAN * h, p.y1 - h);
        ctx.lineTo(p.x1 + LEAN * (h + r), my - h - r); ctx.lineTo(p.x0 + LEAN * (h + r), my - h - r); ctx.closePath();
        ctx.fillStyle = css(mix(own, [40, 40, 40], 0.15), 0.95); ctx.fill();
        ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(30,20,20,.5)'; ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x0 + LEAN * h, p.y0 - h); ctx.lineTo(p.x0 + LEAN * h, p.y1 - h); ctx.lineTo(p.x0 + LEAN * (h + r), my - h - r); ctx.closePath();
        ctx.fillStyle = css(CONCRETE, 0.86); ctx.fill();
      } else if (!p.crown) floors(ctx, p.x0, p.y0, p.x1, p.y1, p.b.h0, p.b.h1, p.seed, p.tall);
      if (p.mast) {
        const tx = (p.x0 + p.x1) / 2 + LEAN * p.b.h1, ty = (p.y0 + p.y1) / 2 - p.b.h1;
        ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + LEAN * p.mast, ty - p.mast);
        ctx.lineWidth = 1.4; ctx.strokeStyle = '#dfe5ea'; ctx.stroke();
        if ((now / 600 | 0) % 2) { ctx.beginPath(); ctx.arc(tx + LEAN * p.mast, ty - p.mast, 1.6, 0, 6.2832); ctx.fillStyle = '#ff5040'; ctx.fill(); }
      }
    }
    let hi = 0;
    for (const p of parts) hi = Math.max(hi, p.b.h1 + (p.mast || 0) + (p.gable ? (p.y1 - p.y0) * 0.45 : 0));
    return hi;
  }
  function drawFactory(ctx, u, x, y, s, own, now, lv) {
    const brick = mix([172, 96, 72], own, 0.12), roof = mix(own, [70, 70, 70], 0.3);
    const pad = body(rect(x, y, -0.48, -0.42, 0.48, 0.44, s), 0, s * 0.03, [160, 158, 150]);
    const hall = body(rect(x, y, -0.42, -0.14, 0.18, 0.32, s), 0, s * 0.22, brick, roof);
    const hall2 = body(rect(x, y, -0.36, -0.36, 0.04, -0.14, s), 0, s * 0.16, brick, roof);
    const stacks = [[0.3, -0.22, 0.62], [0.3, 0.06, 0.5]];
    if (lv >= 5) stacks.push([0.08, -0.3, 0.44]);
    const chim = stacks.map(function (c) { return body(ngon(x + c[0] * s, y + c[1] * s, s * 0.065, 10, 0), 0, s * c[2], [168, 160, 152], [70, 64, 60]); });
    drawShadow(ctx, [pad, hall, hall2].concat(chim), 0.24);
    drawBody(ctx, pad); drawBody(ctx, hall2); drawBody(ctx, hall);
    // the saw-tooth roof as light stripes
    const h = s * 0.22;
    ctx.lineWidth = Math.max(1, s * 0.025); ctx.strokeStyle = 'rgba(235,240,245,.55)';
    for (let k = 1; k < 5; k++) {
      const fx = x + (-0.42 + 0.6 * k / 5) * s;
      ctx.beginPath(); ctx.moveTo(fx + LEAN * h, y - 0.14 * s - h); ctx.lineTo(fx + LEAN * h, y + 0.32 * s - h); ctx.stroke();
    }
    floors(ctx, x - 0.42 * s, y - 0.14 * s, x + 0.18 * s, y + 0.32 * s, 0, h * 0.8, u.id, false);
    let hi = 0;
    stacks.forEach(function (c, i) {
      drawBody(ctx, chim[i]);
      const hh = s * c[2], tx = x + c[0] * s + LEAN * hh, ty = y + c[1] * s - hh;
      ctx.fillStyle = 'rgba(230,72,60,.9)'; ctx.fillRect(tx - s * 0.065, ty + s * 0.05, s * 0.13, s * 0.035);   // a red band near the top
      smoke(ctx, tx, ty - 1, s, now, (u.id * 0.37 + i * 0.31) % 1, false, 4);
      hi = Math.max(hi, hh);
    });
    return hi;
  }
  function drawPort(ctx, u, x, y, s, own, now) {
    const quay = body(rect(x, y, -0.5, -0.4, 0.5, 0.44, s), 0, s * 0.05, [120, 122, 124], [138, 140, 142]);
    const shed = body(rect(x, y, -0.42, -0.32, 0.02, 0.02, s), 0, s * 0.2, mix(CONCRETE, own, 0.12), mix(own, [70, 70, 70], 0.25));
    const box = [];
    const tones = [[196, 70, 52], [52, 104, 168], [222, 150, 46], [70, 140, 92]];
    for (let i = 0; i < 6; i++) {
      const cx = 0.12 + (i % 3) * 0.12, cy = 0.1 + ((i / 3) | 0) * 0.14, lvl = i % 2;
      box.push(body(rect(x, y, cx - 0.05, cy - 0.06, cx + 0.05, cy + 0.06, s), s * 0.05 + lvl * s * 0.06, s * 0.11 + lvl * s * 0.06, tones[(u.id + i) % 4]));
    }
    drawShadow(ctx, [quay, shed].concat(box), 0.24);
    drawBody(ctx, quay); drawBody(ctx, shed);
    for (const b of box) drawBody(ctx, b);
    // a gantry crane over the quay
    const ch = s * 0.62, ax = x + 0.3 * s, ay = y - 0.28 * s;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, s * 0.03); ctx.strokeStyle = '#e8b830';
    ctx.beginPath();
    ctx.moveTo(ax - 0.1 * s, ay + 0.16 * s); ctx.lineTo(ax - 0.1 * s + LEAN * ch, ay + 0.16 * s - ch);
    ctx.moveTo(ax + 0.1 * s, ay + 0.16 * s); ctx.lineTo(ax + 0.1 * s + LEAN * ch, ay + 0.16 * s - ch);
    ctx.moveTo(ax - 0.22 * s + LEAN * ch, ay + 0.16 * s - ch); ctx.lineTo(ax + 0.34 * s + LEAN * ch, ay + 0.16 * s - ch);
    ctx.stroke();
    const k = 0.5 + 0.5 * Math.sin(now / 1500 + u.id), hx = ax - 0.15 * s + 0.4 * s * k + LEAN * ch, hy = ay + 0.16 * s - ch;
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#30343a'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + ch * 0.45); ctx.stroke();
    ctx.lineCap = 'butt';
    return ch;
  }
  function drawDefense(ctx, u, x, y, s, own, aim) {
    const g = ngon(x, y, s * 0.3, 8, 0.3927);
    const pad = body(ngon(x, y, s * 0.46, 8, 0.3927), 0, s * 0.02, [150, 140, 112]);
    const bunk = body(g, 0, s * 0.16, [150, 150, 142], mix([150, 150, 142], own, 0.35));
    drawShadow(ctx, [bunk], 0.26);
    drawBody(ctx, pad);
    // sandbags around it
    for (let i = 0; i < 14; i++) {
      const a = i * 6.2832 / 14, bx = x + Math.cos(a) * s * 0.4, by = y + Math.sin(a) * s * 0.4;
      ctx.beginPath(); ctx.ellipse(bx, by - s * 0.02, s * 0.065, s * 0.04, a + 1.57, 0, 6.2832);
      ctx.fillStyle = '#b39f72'; ctx.fill(); ctx.lineWidth = 0.6; ctx.strokeStyle = 'rgba(60,50,30,.6)'; ctx.stroke();
    }
    drawBody(ctx, bunk);
    const h = s * 0.16;
    // the slit and the gun, pointed at the nearest stranger
    const gx = x + LEAN * h * 0.7, gy = y - h * 0.7;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.6, s * 0.05); ctx.strokeStyle = '#2a2e33';
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(aim) * s * 0.42, gy + Math.sin(aim) * s * 0.42); ctx.stroke();
    ctx.lineCap = 'butt';
    return h;
  }
  function drawSam(ctx, u, x, y, s, own, now) {
    const pad = body(rect(x, y, -0.36, -0.34, 0.36, 0.36, s), 0, s * 0.04, [140, 142, 138]);
    const base = body(rect(x, y, -0.18, -0.08, 0.16, 0.2, s), s * 0.04, s * 0.16, mix([96, 108, 92], own, 0.3));
    drawShadow(ctx, [pad, base], 0.24);
    drawBody(ctx, pad); drawBody(ctx, base);
    // three missiles on their rail, pointing up to the north east
    const h = s * 0.16, bx = x - 0.08 * s + LEAN * h, by = y + 0.1 * s - h;
    for (let i = 0; i < 3; i++) {
      const ox = bx + i * s * 0.07, oy = by + i * s * 0.035;
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, s * 0.06); ctx.strokeStyle = '#2f3438';
      ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(ox + s * 0.28, oy - s * 0.4); ctx.stroke();
      ctx.lineWidth = Math.max(1.2, s * 0.038); ctx.strokeStyle = '#e6e9ec';
      ctx.beginPath(); ctx.moveTo(ox + s * 0.02, oy - s * 0.03); ctx.lineTo(ox + s * 0.27, oy - s * 0.38); ctx.stroke();
      ctx.fillStyle = '#d84a3a'; ctx.beginPath(); ctx.arc(ox + s * 0.28, oy - s * 0.4, Math.max(1, s * 0.022), 0, 6.2832); ctx.fill();
    }
    // a turning radar dish
    const rx = x + 0.24 * s, ry = y - 0.2 * s, rh = s * 0.32, a = now / 900 + u.id;
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#4a5056';
    ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx + LEAN * rh, ry - rh); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(rx + LEAN * rh, ry - rh, s * 0.11 * Math.abs(Math.cos(a)) + 1, s * 0.07, 0, 0, 6.2832);
    ctx.fillStyle = '#d6dbe0'; ctx.fill(); ctx.strokeStyle = '#59616a'; ctx.stroke();
    ctx.lineCap = 'butt';
    return s * 0.45;
  }
  function drawSilo(ctx, u, x, y, s, own) {
    const pad = body(ngon(x, y, s * 0.44, 8, 0.3927), 0, s * 0.04, [150, 148, 140], [166, 164, 156]);
    const n = Math.min(3, u.level), bodies = [];
    const spots = n === 1 ? [[0, 0]] : n === 2 ? [[-0.15, 0.04], [0.15, -0.04]] : [[-0.17, 0.08], [0.17, 0.06], [0, -0.16]];
    for (const sp of spots) bodies.push(body(ngon(x + sp[0] * s, y + sp[1] * s, s * (n === 1 ? 0.19 : 0.14), 12, 0), s * 0.04, s * 0.42, [214, 214, 208], [228, 228, 222]));
    drawShadow(ctx, [pad].concat(bodies), 0.24);
    drawBody(ctx, pad);
    bodies.sort(function (a, b) { return a.g[2][1] + a.g[9][1] - b.g[2][1] - b.g[9][1]; });
    for (const b of bodies) {
      drawBody(ctx, b);
      // a band in the owner's colour and the dome
      let cx = 0, cy = 0;
      for (const p of b.g) { cx += p[0]; cy += p[1]; }
      cx /= b.g.length; cy /= b.g.length;
      const r = Math.hypot(b.g[0][0] - cx, b.g[0][1] - cy), h = b.h1;
      ctx.beginPath(); ctx.arc(cx + LEAN * h * 0.78, cy - h * 0.78, r * 0.98, 0.15, 3.0); ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.strokeStyle = css(own, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + LEAN * h, cy - h, r * 0.62, 0, 6.2832); ctx.fillStyle = '#b9bcbf'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx + LEAN * h - r * 0.15, cy - h - r * 0.15, r * 0.22, 0, 6.2832); ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fill();
    }
    return s * 0.42;
  }
  function drawCloak(ctx, u, x, y, s, own, now) {
    const base = body(ngon(x, y, s * 0.18, 6, 0), 0, s * 0.1, [90, 84, 110], mix([120, 110, 150], own, 0.3));
    const mast = body(ngon(x, y, s * 0.045, 8, 0), s * 0.1, s * 0.8, [180, 176, 196]);
    const k = 0.5 + 0.5 * Math.sin(now / 500);
    ctx.beginPath(); ctx.ellipse(x, y, s * (0.34 + 0.06 * k), s * (0.3 + 0.05 * k), 0, 0, 6.2832);
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(176,140,255,' + (0.35 + 0.3 * k).toFixed(2) + ')'; ctx.stroke();
    drawShadow(ctx, [base, mast], 0.22);
    drawBody(ctx, base); drawBody(ctx, mast);
    const h = s * 0.8, tx = x + LEAN * h, ty = y - h;
    ctx.beginPath(); ctx.ellipse(tx, ty, s * 0.16, s * 0.07, -0.4, 0, 6.2832);
    ctx.fillStyle = '#e4e0f0'; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#6a5e8a'; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty - 2, 2.2, 0, 6.2832); ctx.fillStyle = 'rgba(190,150,255,' + (0.5 + 0.5 * k).toFixed(2) + ')'; ctx.fill();
    return h;
  }
  // A building site: foundation, scaffolding up to how far it is, a tower crane.
  function drawSite(ctx, u, x, y, s, k, now) {
    const pad = body(rect(x, y, -0.4, -0.36, 0.4, 0.4, s), 0, s * 0.04, [168, 164, 154], [180, 176, 166]);
    drawShadow(ctx, [pad], 0.2);
    drawBody(ctx, pad);
    const H = s * 0.5 * Math.max(0.08, k), x0 = x - 0.26 * s, x1 = x + 0.26 * s, y0 = y - 0.24 * s, y1 = y + 0.26 * s;
    // what is built so far: a grey core
    drawBody(ctx, body(rect(x, y, -0.2, -0.18, 0.2, 0.2, s), s * 0.04, s * 0.04 + H * 0.85, [182, 180, 174]));
    ctx.lineWidth = 0.9; ctx.strokeStyle = 'rgba(70,58,40,.85)';
    ctx.beginPath();
    for (const p of [[x0, y1], [x1, y1], [x0, y0]]) { ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + LEAN * H, p[1] - H); }
    for (let f = 0; f <= H; f += Math.max(4, s * 0.1)) { ctx.moveTo(x0 + LEAN * f, y1 - f); ctx.lineTo(x1 + LEAN * f, y1 - f); ctx.moveTo(x0 + LEAN * f, y1 - f); ctx.lineTo(x0 + LEAN * f, y0 - f); }
    ctx.stroke();
    // the crane
    const cx = x + 0.32 * s, cy = y - 0.3 * s, ch = s * 0.95, tx = cx + LEAN * ch, ty = cy - ch;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.3, s * 0.03); ctx.strokeStyle = '#f2c230';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.moveTo(tx - s * 0.62, ty); ctx.lineTo(tx + s * 0.18, ty); ctx.stroke();
    const hx = tx - s * (0.25 + 0.25 * (0.5 + 0.5 * Math.sin(now / 900 + u.id)));
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#3a3f45'; ctx.beginPath(); ctx.moveTo(hx, ty); ctx.lineTo(hx, ty + ch * 0.5); ctx.stroke();
    ctx.fillStyle = '#3a3f45'; ctx.fillRect(hx - 1.5, ty + ch * 0.5, 3, 2.5);
    ctx.lineCap = 'butt';
    return ch;
  }

  // ---------- tanks ----------
  // One tank, `L` pixels long, standing at (x, y), facing `ang`. `col`: the owner's colour.
  const TRACK = [44, 48, 50];
  function drawTank(ctx, x, y, L, ang, tur, col, alpha, fireK, mine) {
    if (alpha < 0.98) ctx.globalAlpha = alpha * BASE;
    const hullG = turn(x, y, [[-0.5 * L, -0.31 * L], [0.5 * L, -0.31 * L], [0.5 * L, 0.31 * L], [-0.5 * L, 0.31 * L]], ang);
    const deckG = turn(x, y, [[-0.44 * L, -0.24 * L], [0.4 * L, -0.24 * L], [0.48 * L, 0], [0.4 * L, 0.24 * L], [-0.44 * L, 0.24 * L]], ang);
    const tx = x - Math.cos(ang) * 0.08 * L, ty = y - Math.sin(ang) * 0.08 * L;
    const turG = ngon(tx, ty, 0.2 * L, 8, ang + tur + 0.39);
    const tracks = body(hullG, 0, 0.15 * L, TRACK), deck = body(deckG, 0.15 * L, 0.25 * L, col), turret = body(turG, 0.25 * L, 0.37 * L, mix(col, [255, 255, 255], 0.12));
    drawShadow(ctx, [tracks, turret], 0.3);
    drawBody(ctx, tracks);
    // a dark rim holds the shape on any ground; your own tanks are rimmed white, as your buildings are
    ctx.beginPath(); path(ctx, hullG);
    if (mine) { ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke(); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(10,12,14,.75)'; ctx.stroke();
    drawBody(ctx, deck); drawBody(ctx, turret);
    const a = ang + tur, h = 0.31 * L, bx = tx + LEAN * h, by = ty - h, ex = bx + Math.cos(a) * 0.62 * L, ey = by + Math.sin(a) * 0.62 * L;
    ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.4, 0.08 * L); ctx.strokeStyle = '#1d2226';
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey); ctx.stroke(); ctx.lineCap = 'butt';
    if (fireK > 0) {
      ctx.beginPath(); ctx.arc(ex + Math.cos(a) * L * 0.12, ey + Math.sin(a) * L * 0.12, L * (0.14 + 0.16 * fireK), 0, 6.2832);
      ctx.fillStyle = 'rgba(255,236,150,' + fireK.toFixed(2) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(ex + Math.cos(a) * L * 0.12, ey + Math.sin(a) * L * 0.12, L * 0.07, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
    }
    if (alpha < 0.98) ctx.globalAlpha = BASE;
  }

  // ---------- the land: trees, rocks and peaks ----------
  // Drawn from small pictures made once per size, so a forest costs little.
  const sprites = new Map();
  function sprite(kind, size, v, dpr) {
    const key = kind + ':' + size + ':' + v + ':' + dpr;
    let c = sprites.get(key);
    if (c) return c;
    if (sprites.size > 160) sprites.clear();
    const big = kind === 'peak' ? 1.6 : 1;
    c = document.createElement('canvas');
    const cw = Math.ceil(size * 2.4 * big), chh = Math.ceil(size * 2.4 * big);
    c.width = Math.ceil(cw * dpr); c.height = Math.ceil(chh * dpr); c.w = cw; c.h = chh;
    const x = c.getContext('2d'), bx = cw * 0.36, by = chh * 0.84;
    x.scale(dpr, dpr);
    c.ax = bx; c.ay = by;
    const sh = function (rx, ry, dx) { x.beginPath(); x.ellipse(bx + dx, by + ry * 0.2, rx, ry, 0, 0, 6.2832); x.fillStyle = 'rgba(14,18,10,.24)'; x.fill(); };
    if (kind === 'tree') {
      const tones = [[74, 122, 62], [92, 132, 58], [64, 110, 72]], t = tones[v % 3], h = size * 0.95;
      sh(size * 0.48, size * 0.22, size * 0.36);
      x.strokeStyle = '#5a4430'; x.lineWidth = Math.max(1, size * 0.12); x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + LEAN * h * 0.5, by - h * 0.5); x.stroke();
      const blobs = [[-0.18, 0.62, 0.3], [0.2, 0.66, 0.3], [0.02, 0.9, 0.34]];
      for (const b of blobs) {
        const cx = bx + b[0] * size + LEAN * b[1] * h, cy = by - b[1] * h;
        x.beginPath(); x.arc(cx, cy, b[2] * size, 0, 6.2832); x.fillStyle = css(t, 0.82); x.fill();
        x.beginPath(); x.arc(cx - b[2] * size * 0.25, cy - b[2] * size * 0.25, b[2] * size * 0.62, 0, 6.2832); x.fillStyle = css(t, 1.08); x.fill();
      }
    } else if (kind === 'pine') {
      const h = size * 1.25, t = v % 2 ? [52, 92, 66] : [60, 100, 70];
      sh(size * 0.4, size * 0.18, size * 0.4);
      x.strokeStyle = '#4e3a28'; x.lineWidth = Math.max(1, size * 0.1); x.beginPath(); x.moveTo(bx, by); x.lineTo(bx + LEAN * h * 0.25, by - h * 0.25); x.stroke();
      for (let k = 0; k < 3; k++) {
        const h0 = h * (0.18 + k * 0.24), h1 = h0 + h * 0.42, w = size * (0.42 - k * 0.1);
        x.beginPath(); x.moveTo(bx + LEAN * h0 - w, by - h0); x.lineTo(bx + LEAN * h0 + w, by - h0); x.lineTo(bx + LEAN * h1, by - h1); x.closePath();
        x.fillStyle = css(t, 0.9); x.fill();
        x.beginPath(); x.moveTo(bx + LEAN * h0 - w, by - h0); x.lineTo(bx + LEAN * h0, by - h0); x.lineTo(bx + LEAN * h1, by - h1); x.closePath();
        x.fillStyle = css(t, 1.12); x.fill();
      }
    } else if (kind === 'rock') {
      sh(size * 0.5, size * 0.2, size * 0.2);
      const pts = [[-0.5, 0], [-0.3, -0.42], [0.08, -0.6], [0.45, -0.3], [0.5, 0]];
      x.beginPath(); pts.forEach(function (q, i) { const px = bx + q[0] * size + LEAN * -q[1] * size, py = by + q[1] * size; if (i) x.lineTo(px, py); else x.moveTo(px, py); }); x.closePath();
      x.fillStyle = v % 2 ? '#9a958a' : '#8c877c'; x.fill(); x.lineWidth = 0.8; x.strokeStyle = 'rgba(40,36,30,.5)'; x.stroke();
      x.beginPath(); x.moveTo(bx - 0.5 * size, by); x.lineTo(bx - 0.3 * size + LEAN * 0.42 * size, by - 0.42 * size); x.lineTo(bx + 0.08 * size + LEAN * 0.6 * size, by - 0.6 * size); x.lineTo(bx - 0.05 * size, by); x.closePath();
      x.fillStyle = 'rgba(255,255,255,.22)'; x.fill();
    } else {   // a peak: a ridge with a snow cap, lit from the west
      const w = size * 0.8, h = size * (0.9 + 0.2 * (v % 3) / 2);
      sh(size * 0.8, size * 0.25, size * 0.5);
      const tx = bx + LEAN * h + size * 0.05, ty = by - h;
      x.beginPath(); x.moveTo(bx - w, by); x.lineTo(tx, ty); x.lineTo(bx + w, by); x.closePath(); x.fillStyle = '#8e8a84'; x.fill();
      x.beginPath(); x.moveTo(bx - w, by); x.lineTo(tx, ty); x.lineTo(bx + w * 0.1, by); x.closePath(); x.fillStyle = '#b2aea6'; x.fill();
      x.beginPath(); x.moveTo(tx, ty);
      x.lineTo(tx - (tx - (bx - w)) * 0.36, ty + (by - ty) * 0.36); x.lineTo(tx - (tx - bx) * 0.2, ty + (by - ty) * 0.28);
      x.lineTo(tx + ((bx + w) - tx) * 0.3, ty + (by - ty) * 0.34); x.closePath(); x.fillStyle = '#f2f4f6'; x.fill();
      x.lineWidth = 0.8; x.strokeStyle = 'rgba(50,46,40,.45)';
      x.beginPath(); x.moveTo(bx - w, by); x.lineTo(tx, ty); x.lineTo(bx + w, by); x.stroke();
    }
    sprites.set(key, c);
    return c;
  }
  // Which trees, rocks and peaks stand on the screen: from the ground under them (forest on the
  // Earth, height everywhere), never on a building or a railway. Worked out when the view moves.
  View.prototype.closeDecor = function (g, z, x0, y0, x1, y1) {
    // a little more than the screen, in steps of 8 tiles, so a small move needs no new list
    x0 = (x0 >> 3) * 8 - 8; y0 = (y0 >> 3) * 8 - 8; x1 = (x1 >> 3) * 8 + 16; y1 = (y1 >> 3) * 8 + 16;
    const S = this.nah, key = x0 + ',' + y0 + ',' + x1 + ',' + y1 + ',' + g.structAt.size + ',' + g.rails.length;
    if (S.decorKey === key) return S.decor;
    S.decorKey = key;
    const map = g.map, W = g.W, H = g.H, land = map.land, mg = map.mag, cov = map.cover, shore = map.shore, C = G.COVER;
    if (S.railN !== g.rails.length) {
      S.railN = g.rails.length; S.rail = new Set();
      for (const r of g.rails) for (const t of r.path) S.rail.add(t);
    }
    const out = [];
    for (let y = Math.max(0, y0); y <= Math.min(H - 1, y1); y++) {
      for (let x = Math.max(0, x0); x <= Math.min(W - 1, x1); x++) {
        const t = y * W + x;
        if (!land[t] || shore[t]) continue;
        const d = hash(x * 3 + 1, y * 5 + 2), m = mg[t];
        if (d >= 0.32) continue;                       // most tiles stay bare: no need to look further
        let kind = null;
        const cold = map.temp10 ? map.temp10(t) : 100;
        if (m >= 20) { if (d < 0.055 && !((x + y) & 1)) kind = 'peak'; }
        else if (m >= 10) { if (d < 0.025) kind = 'rock'; else if (d < 0.05 && cold > -150) kind = 'pine'; }
        else if (cov) {
          const c = cov[t];
          if (c === C.FOREST) { if (d < 0.32) kind = cold < 0 ? 'pine' : 'tree'; }
          else if (c === C.GRASS || c === C.SWAMP) { if (d < 0.025) kind = cold < 0 ? 'pine' : 'tree'; }
          else if (c === C.TUNDRA) { if (d < 0.02) kind = 'pine'; }
        } else if (d < 0.035 && cold > -150) kind = cold < -20 ? 'pine' : 'tree';
        if (!kind || S.rail.has(t) || g.fallout[t]) continue;
        let free = true;
        if (g.structAt.size) for (let dy = -2; dy <= 2 && free; dy++) for (let dx = -2; dx <= 2; dx++) if (g.structAt.has(t + dy * W + dx)) { free = false; break; }
        if (!free) continue;
        out.push([x + 0.2 + hash(x, y + 9) * 0.6, y + 0.2 + hash(x + 9, y) * 0.6, kind, (d * 997 | 0) % 3]);
      }
    }
    S.decor = out;
    return out;
  };

  // ---------- state of the close-up ----------
  function state(v) {
    return v.nah || (v.nah = { own: null, scorch: [], pend: [], flips: 0, tanks: new Map(), cellAt: 0, U: 0, Uat: -1e9, units: new Map(), rect: [0, 0, 0, 0], live: false, front: new Set(), sand: null, sandAt: 0, aim: new Map() });
  }
  View.prototype.closeOn = function (z) { return this.close3d !== false && !!this.game && z >= Z3D; };
  // Called by flush for every tile that was repainted: notes land that changed hands in a fight.
  View.prototype.closeSeen = function (t) {
    const S = this.nah, g = this.game;
    if (!S || !S.own) return;
    const was = S.own[t], o = g.owner[t];
    if (was === o) return;
    S.own[t] = o;
    if (!was || !o) return;                          // free land taken, or land given up: no fight
    S.flips++;
    const W = g.W, x = t % W, y = (t - x) / W, r = S.rect;
    if (x < r[0] || x > r[2] || y < r[1] || y > r[3]) return;
    if (hash(t, g.ticks) > 0.3) return;              // some of the tiles are enough for a scorched front
    S.pend.push(t);
  };
  // After a repaint: the tiles taken in a fight leave craters. When a whole realm falls at once (taken
  // over, encircled) nothing was fought for tile by tile, so it leaves none. At most a few a second.
  View.prototype.closeFlush = function () {
    const S = this.nah, g = this.game, W = g.W, now = performance.now();
    const mass = S.flips > 900;
    S.flips = 0;
    if (mass) { S.pend.length = 0; return; }
    S.tok = Math.min(24, (S.tok || 0) + (now - (S.tokAt || now)) * 0.015); S.tokAt = now;
    for (const t of S.pend) {
      if (S.tok < 1) break;
      S.tok--;
      const x = t % W, y = (t - x) / W;
      if (S.scorch.length > 500) S.scorch.splice(0, 150);
      S.scorch.push({ x: x + 0.5 + (hash(t, 3) - 0.5) * 0.8, y: y + 0.5 + (hash(t, 4) - 0.5) * 0.8, t: now, r: 0.5 + hash(t, 5) * 0.6, k: hash(t, 6), boom: hash(t, 7) < 0.3 });
    }
    S.pend.length = 0;
  };

  // How many troops one tank stands for: chosen so that a cell of the middle realm of the world
  // shows about three tanks. Changed only now and then and in steps, so the tanks do not flicker.
  function tankUnit(g, S, now) {
    if (S.U && now - S.Uat < 6000) return S.U;
    // the middle realm of the world (nations and people, troops at home and out in attacks)
    const ps = [];
    for (const p of g.players) {
      if (!p || !p.alive || p.tiles <= 0 || p.type === PT.BOT) continue;
      let t = p.troops;
      for (const a of p.out) if (a.active) t += a.troops;
      ps.push(t / p.tiles);
    }
    ps.sort(function (a, b) { return a - b; });
    const per = ps.length ? ps[ps.length >> 1] : 1;
    let U = Math.max(1, per * 256 / 3);
    U = Math.pow(1.5, Math.round(Math.log(U) / Math.log(1.5)));
    if (S.U && Math.abs(Math.log(U / S.U)) < 0.5) U = S.U;
    S.U = U; S.Uat = now;
    return U;
  }

  // Where the tanks of the cells on the screen stand. Worked out a few times a second; in between
  // every tank glides to its spot, so reserves are seen rolling to where they are needed.
  View.prototype.closeTanks = function (g, z, now, x0, y0, x1, y1) {
    const S = state(this), W = g.W, H = g.H, own = g.owner, land = g.map.land, h = g.human, CS = 16, CW = Math.ceil(W / CS);
    const U = tankUnit(g, S, now);
    const Lt = within(z * 1.3, 11, 30) / z;           // a tank's length in tiles
    const gap = Lt * 1.55;
    const want = new Map();
    // 1. the attacks: a line of tanks along the front of every attack on a realm, on the attacker's
    //    side, each facing the tile it is taking. They stand for the troops of the attack.
    S.front.clear();
    const busy = new Set();
    let atkN = 0;
    for (let i = 1; i < g.players.length; i++) {
      const a = g.players[i];
      if (!a || !a.alive) continue;
      for (const at of a.out) {
        if (!at.active || !at.tid || at.troops < 1) continue;
        const nMax = Math.min(24, Math.max(2, Math.round(at.troops / U * 1.2)));
        const bucket = new Map();
        let seen = 0;
        for (const f of at.front) {
          if (++seen > 6000) break;
          const fx = f % W, fy = (f - fx) / W;
          if (fx < x0 - 2 || fx > x1 + 2 || fy < y0 - 2 || fy > y1 + 2) continue;
          S.front.add(((fy >> 2) * 4096 + (fx >> 2)) * 64 + (at.tid & 63));
          const key = Math.floor(fy / (gap * 1.6)) * 65536 + Math.floor(fx / (gap * 1.6));
          if (!bucket.has(key)) bucket.set(key, f);
        }
        const list = Array.from(bucket.values());
        const n = Math.min(nMax, list.length, 80 - atkN), step = list.length > n ? list.length / n : 1;
        for (let k = 0; k < n; k++) {
          const f = list[Math.floor(k * step)], fx = f % W, fy = (f - fx) / W;
          // stand on the attacker's tile next to the front tile, a little back
          let sx = fx, sy = fy, found = false;
          for (const d of NB8) {
            const nx = fx + d[0], ny = fy + d[1];
            if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
            if (own[ny * W + nx] === a.id) { sx = nx; sy = ny; found = true; break; }
          }
          if (!found) continue;
          const dx = fx - sx, dy = fy - sy, l = Math.hypot(dx, dy) || 1;
          const px = sx + 0.5 - dx / l * Lt * 0.4, py = sy + 0.5 - dy / l * Lt * 0.4;
          want.set('a' + at.id + ':' + k, { x: px, y: py, ang: Math.atan2(dy, dx), p: a, front: true, fight: true, tx: fx + 0.5, ty: fy + 0.5, seed: hash(at.id, k) });
          busy.add(a.id + ':' + ((Math.floor(py) >> 4) * CW + (Math.floor(px) >> 4)));
          atkN++;
        }
      }
    }
    // 2. what stands at home, cell by cell. No tank parks on a building or right next to it.
    const block = new Set(), br = 3;
    for (const u of g.structAt.values()) {
      if (u.x < x0 - br || u.x > x1 + br || u.y < y0 - br || u.y > y1 + br) continue;
      for (let dy = -br; dy <= br; dy++) for (let dx = -br; dx <= br; dx++) block.add((u.y + dy) * W + u.x + dx);
    }
    const cx0 = Math.max(0, Math.floor(x0 / CS)), cy0 = Math.max(0, Math.floor(y0 / CS)), cx1 = Math.min(CW - 1, Math.floor(x1 / CS)), cy1 = Math.min(Math.ceil(H / CS) - 1, Math.floor(y1 / CS));
    const park = z >= Z_PARK, groups = [];
    let total = 0;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const id = cy * CW + cx, by = new Map();
        for (let yy = cy * CS + 1; yy < cy * CS + CS && yy < H; yy += 2) {
          for (let xx = cx * CS + 1; xx < cx * CS + CS && xx < W; xx += 2) {
            const t = yy * W + xx, o = own[t];
            if (!o || !land[t]) continue;
            let e = by.get(o);
            if (!e) { e = { n: 0, spots: [], front: 0 }; by.set(o, e); }
            e.n++;
            // near a stranger? then this is a spot at the front, facing him
            let fx = 0, fy = 0, front = false;
            for (let d = 2; d <= 5 && !front; d += 3) {
              const q0 = xx - d >= 0 ? own[t - d] : o, q1 = xx + d < W ? own[t + d] : o, q2 = yy - d >= 0 ? own[t - d * W] : o, q3 = yy + d < H ? own[t + d * W] : o;
              if (q0 && q0 !== o) { fx--; front = true; }
              if (q1 && q1 !== o) { fx++; front = true; }
              if (q2 && q2 !== o) { fy--; front = true; }
              if (q3 && q3 !== o) { fy++; front = true; }
            }
            if (front) e.front++;
            if (!block.has(t)) e.spots.push([xx, yy, front ? 1 : 0, fx, fy]);
          }
        }
        for (const [o, e] of by) {
          const p = g.players[o];
          if (!p || !p.alive || p.tiles <= 0 || !e.spots.length || busy.has(o + ':' + id)) continue;
          const bot = p.type === PT.BOT;
          let per = p.troops / p.tiles;                      // others: as even as the plain number says
          let cut = false;
          if (p === h && p.post && p.post.H > 0) {           // your own: as the posture puts them
            const c = p.post.cells.get(id);
            if (c && c.n > 0) { per = c.u / p.post.H * p.troops / c.n; cut = !!c.cut; }
          }
          let n = per * e.n * 4 / U;                           // every sample stands for 4 tiles
          if (bot) n = e.front && hash(id, o) < 0.5 ? 1 : 0;  // bots keep a guard at the border, no army
          else if (e.front && n < 1 && per > 0) n = 1;         // whoever holds a front shows at least one tank there
          if (!e.front && !park && !cut) continue;             // from afar only the fronts, so the eye finds them
          if (n < 0.35) continue;
          groups.push({ id: id, o: o, p: p, e: e, n: n, cut: cut, cx: cx, cy: cy });
          total += n;
        }
      }
    }
    const scale = total > TANK_CAP ? TANK_CAP / total : 1;
    for (const gr of groups) {
      let n = gr.n * scale;
      n = Math.min(PLATOON, Math.floor(n) + (hash(gr.id, gr.o) < n - Math.floor(n) ? 1 : 0));
      if (gr.e.front && n < 1) n = 1;
      if (n <= 0) continue;
      const spots = gr.e.spots, p = gr.p;
      let front = null, fw = 0;
      for (const sp of spots) if (sp[2]) { const w = Math.abs(sp[3]) + Math.abs(sp[4]) + hash(sp[0], sp[1]) * 0.1; if (w > fw) { fw = w; front = sp; } }
      // a platoon: one group per cell, in rows of three behind the leading tank. At the front it
      // stands a little back from the border and faces the stranger; in the hinterland it parks in
      // the middle of the cell and faces outwards.
      let ax, ay, ang;
      if (front) {
        ang = front[3] || front[4] ? Math.atan2(front[4], front[3]) : 0;
        ax = front[0] + 0.5 - Math.cos(ang) * 1.4; ay = front[1] + 0.5 - Math.sin(ang) * 1.4;
      } else {
        const mx = gr.cx * CS + CS / 2, my = gr.cy * CS + CS / 2;
        let best = spots[0], bd = 1e9;
        for (const sp of spots) { const d = (sp[0] - mx) * (sp[0] - mx) + (sp[1] - my) * (sp[1] - my); if (d < bd) { bd = d; best = sp; } }
        ax = best[0] + 0.5; ay = best[1] + 0.5;
        ang = Math.round(Math.atan2(ay - (p.y0 + p.y1) / 2, ax - (p.x0 + p.x1) / 2) / 1.5708) * 1.5708;   // parked: in neat rows, square to the map
      }
      const fx = Math.cos(ang), fy = Math.sin(ang), rx = -fy, ry = fx, side = [0, -1, 1];
      for (let k = 0; k < n; k++) {
        const row = Math.floor(k / 3), col = side[k % 3];
        let px = ax - fx * row * gap * 1.1 + rx * col * gap * 0.95, py = ay - fy * row * gap * 1.1 + ry * col * gap * 0.95;
        // keep every tank on its owner's land: pull it towards the leader until it is
        let ok = false;
        for (let tries = 0; tries < 4 && !ok; tries++) {
          const tx = Math.floor(px), ty = Math.floor(py);
          if (tx >= 0 && ty >= 0 && tx < W && ty < H && own[ty * W + tx] === gr.o && land[ty * W + tx] && !block.has(ty * W + tx)) ok = true;
          else { px = (px + ax) / 2; py = (py + ay) / 2; }
        }
        if (!ok) continue;
        want.set('c' + gr.id + ':' + gr.o + ':' + k, { x: px, y: py, ang: ang, p: p, front: !!front, cut: gr.cut });
      }
    }
    // 3. glide what exists, add what is new (it fades in), let what is gone fade out
    for (const [key, w] of want) {
      const t = S.tanks.get(key);
      if (t) { t.wx = w.x; t.wy = w.y; t.wang = w.ang; t.p = w.p; t.front = w.front; t.fight = w.fight; t.cut = w.cut; t.tx = w.tx; t.ty = w.ty; t.gone = 0; }
      else S.tanks.set(key, { x: w.x, y: w.y, ang: w.ang, wx: w.x, wy: w.y, wang: w.ang, p: w.p, front: w.front, fight: w.fight, cut: w.cut, tx: w.tx, ty: w.ty, born: now, gone: 0, seed: w.seed === undefined ? hash(key.length * 31 + key.charCodeAt(1), Math.round(w.x * 7 + w.y * 13)) : w.seed });
    }
    for (const [key, t] of S.tanks) if (!want.has(key) && !t.gone) t.gone = now;
  };
  const NB8 = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [1, -1], [-1, 1]];

  // ---------- the frame ----------
  View.prototype.drawClose = function (ctx, g, z, ox, oy, now) {
    const S = state(this), cw = this.cw, ch = this.ch, h = g.human, W = g.W;
    if (S.g !== g) { S.g = g; S.own = null; S.tanks.clear(); S.units.clear(); S.aim.clear(); S.decorKey = ''; S.railN = -1; S.U = 0; }   // a new game
    if (!S.own || !S.live) { S.own = Uint16Array.from(g.owner); S.scorch.length = 0; S.liveAt = now; }   // start from the map as it is
    S.live = true;
    const fadeIn = Math.min(1, (now - S.liveAt) / 220);   // the models come up softly when one zooms in
    const x0 = Math.floor(-ox / z) - 2, y0 = Math.floor(-oy / z) - 2, x1 = Math.ceil((cw - ox) / z) + 2, y1 = Math.ceil((ch - oy) / z) + 6;
    S.rect[0] = x0; S.rect[1] = y0; S.rect[2] = x1; S.rect[3] = y1;
    const dt = Math.min(0.1, Math.max(0, (now - (S.last || now)) / 1000)); S.last = now;
    ctx.save();
    // 1. the ground: scorched patches where land was fought for
    const sc = S.scorch;
    while (sc.length && now - sc[0].t > SCORCH) sc.shift();
    for (const e of sc) {
      const x = e.x * z + ox, y = e.y * z + oy, age = (now - e.t) / SCORCH;
      if (x < -40 || y < -40 || x > cw + 40 || y > ch + 40) continue;
      const r = Math.max(2.5, e.r * z * 0.6), a = 1 - age;
      // a crater: a burnt ring of earth, the hole darker, its northern lip catching the light
      ctx.fillStyle = 'rgba(52,40,28,' + (0.3 * a).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.25, r * 0.95, e.k * 3, 0, 6.2832); ctx.fill();
      ctx.fillStyle = 'rgba(30,24,18,' + (0.45 * a).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(x, y, r * 0.55, r * 0.42, 0, 0, 6.2832); ctx.fill();
      if (r > 5) { ctx.strokeStyle = 'rgba(214,196,160,' + (0.35 * a).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, r * 0.12); ctx.beginPath(); ctx.ellipse(x, y + r * 0.08, r * 0.62, r * 0.48, 0, 3.4, 6.0); ctx.stroke(); }
      if (e.boom && now - e.t < 1600) {           // the hit itself: a flash, then smoke
        const k = (now - e.t) / 1600;
        ctx.beginPath(); ctx.arc(x, y - r * 0.5 * k, r * (0.45 + 0.6 * k), 0, 6.2832);
        ctx.fillStyle = k < 0.25 ? 'rgba(255,200,90,' + (0.9 - k * 2).toFixed(2) + ')' : 'rgba(84,80,74,' + (0.4 * (1 - k)).toFixed(3) + ')'; ctx.fill();
      }
    }
    // 2. sandbags along your own border where the troops have dug in (from the posture)
    if (h && h.alive && h.post && z >= 8) this.drawSandbags(ctx, g, z, ox, oy, now, x0, y0, x1, y1);
    // 3. the bodies, back to front: buildings and tanks
    const s = within(z * 3.6, 38, 104), L = within(z * 1.3, 11, 30), list = [];
    g.cloakScan();
    for (const u of g.structAt.values()) {
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy;
      if (x < -s * 1.2 || x > cw + s * 0.8 || y < -s * 0.6 || y > ch + s * 2.2 || G.hidFromMe(g, u)) continue;
      list.push({ k: 0, y: y + s * 0.45, u: u, x: x, gy: y });
    }
    if (now - S.cellAt > 400 || Math.abs((S.z || 0) - z) > z * 0.15) { S.cellAt = now; S.z = z; this.closeTanks(g, z, now, x0, y0, x1, y1); }
    const ease = Math.min(1, dt * 2.2);
    for (const [key, t] of S.tanks) {
      if (t.gone && now - t.gone > 600) { S.tanks.delete(key); continue; }
      if (!t.p || !t.p.alive) { S.tanks.delete(key); continue; }
      // roll towards the spot, at most 3 tiles a second, turning first
      const dx = t.wx - t.x, dy = t.wy - t.y, d = Math.hypot(dx, dy);
      if (d > 0.04) {
        const step = Math.min(d, Math.max(3 * dt, d * ease * 0.5));
        const head = Math.atan2(dy, dx);
        t.ang += angDiff(t.ang, d > 0.6 ? head : t.wang) * Math.min(1, dt * 5);
        t.x += dx / d * step; t.y += dy / d * step;
        t.moving = d > 0.3;
      } else { t.ang += angDiff(t.ang, t.wang) * Math.min(1, dt * 3); t.moving = false; }
      const x = t.x * z + ox, y = t.y * z + oy;
      if (x < -L || y < -L || x > cw + L || y > ch + L * 2) continue;
      list.push({ k: 1, y: y + L * 0.3, t: t, x: x, gy: y });
    }
    if (z >= 8) {
      const ts = Math.round(within(z * 0.9, 7, 22)), rs = Math.round(within(z * 0.7, 5, 16)), ps = Math.round(within(z * 1.9, 14, 46));
      for (const d of this.closeDecor(g, z, x0, y0, x1, y1)) {
        const sp = sprite(d[2], d[2] === 'peak' ? ps : d[2] === 'rock' ? rs : ts, d[3], this.dpr), x = d[0] * z + ox, y = d[1] * z + oy;
        if (x < -sp.w || x > cw + sp.w || y < -10 || y > ch + sp.h) continue;
        list.push({ k: 2, y: y, sp: sp, x: x, gy: y });
      }
    }
    list.sort(function (a, b) { return a.y - b.y; });
    BASE = fadeIn; ctx.globalAlpha = BASE;
    const tags = [], burn = [];
    for (const e of list) {
      if (e.k === 0) {
        const top = this.closeBuilding(ctx, g, e.u, e.x, e.gy, s, now);
        if (top) { tags.push([e.u, e.x, e.gy, top]); }
        const m = S.units.get(e.u.id);
        if (m && m.burn > now) burn.push([e.x, e.gy, top]);
      } else if (e.k === 2) ctx.drawImage(e.sp, e.x - e.sp.ax, e.gy - e.sp.ay, e.sp.w, e.sp.h);
      else this.closeTank(ctx, g, e.t, e.x, e.gy, L, now, z, ox, oy);
    }
    // 4. above everything on the ground: fires in taken buildings, level tags, the own mark
    for (const b of burn) { fire(ctx, b[0] + LEAN * b[2] * 0.6, b[1] - b[2] * 0.6, s, now, b[0] % 1); smoke(ctx, b[0] + LEAN * b[2] * 0.7, b[1] - b[2] * 0.7, s * 1.3, now, (b[1] * 0.01) % 1, true, 5); }
    for (const t of tags) {
      const u = t[0];
      if (u.built && u.level > 1 && G.levelTag) G.levelTag(ctx, u.level, t[1] + LEAN * t[3], t[2] - t[3] - 4, Math.min(40, s * 0.62));
    }
    BASE = 1;
    ctx.restore();
  };
  function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= 6.2832; while (d < -Math.PI) d += 6.2832; return d; }

  // One building as a model. Returns how high it stands (pixels), for the level tag on top.
  View.prototype.closeBuilding = function (ctx, g, u, x, y, s, now) {
    const S = this.nah, h = g.human, p = u.owner, own = [p.r, p.g, p.b];
    // what the close-up remembers of a building: the level it shows (it grows up to a new one) and who owned it
    let m = S.units.get(u.id);
    if (!m) { m = { lv: u.level, o: p.id, burn: 0, up: 0 }; S.units.set(u.id, m); if (S.units.size > 4000) S.units.clear(); }
    if (m.o !== p.id) { m.o = p.id; m.burn = now + 20000; }
    if (u.level > m.lv + 0.001) { m.lv += Math.max(0.02, (u.level - m.lv) * 0.04); if (u.level - m.lv < 0.02) m.lv = u.level; m.up = now; }
    else if (u.level < m.lv) m.lv = u.level;
    const veil = u.cloak && p === h;
    if (veil) ctx.globalAlpha = 0.55 * BASE;
    // your own buildings stand on a white ring, as the signs do
    if (p === h) {
      const rs = u.type === UT.CITY && u.built ? s * (1 + 0.2 * Math.log10(Math.max(1, m.lv))) : s;
      ctx.beginPath(); ctx.ellipse(x, y + rs * 0.02, rs * 0.62, rs * 0.56, 0, 0, 6.2832);
      ctx.lineWidth = Math.max(1.6, rs * 0.035); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
    }
    let top;
    if (!u.built) top = drawSite(ctx, u, x, y, s, within((g.ticks - u.buildStart) / Math.max(1, u.buildEnd - u.buildStart), 0, 1), now);
    else if (u.type === UT.CITY) top = drawCity(ctx, u, x, y, s, own, m.lv, now);
    else if (u.type === UT.FACTORY) top = drawFactory(ctx, u, x, y, s, own, now, u.level);
    else if (u.type === UT.PORT) top = drawPort(ctx, u, x, y, s, own, now);
    else if (u.type === UT.DEFENSE) top = drawDefense(ctx, u, x, y, s, own, this.closeAim(g, u));
    else if (u.type === UT.SAM) top = drawSam(ctx, u, x, y, s, own, now);
    else if (u.type === UT.SILO) top = drawSilo(ctx, u, x, y, s, own);
    else top = drawCloak(ctx, u, x, y, s, own, now);
    if (!u.built) {
      const k = within((g.ticks - u.buildStart) / Math.max(1, u.buildEnd - u.buildStart), 0, 1);
      ctx.beginPath(); ctx.arc(x, y, s * 0.56, -1.5708, -1.5708 + 6.2832 * k);
      ctx.strokeStyle = '#f4b740'; ctx.lineWidth = 2.5; ctx.stroke();
    } else if (u.type === UT.CITY && now - m.up < 2500 && m.lv < u.level) {
      // still growing to its new level: a crane on the roof
      const cx = x + 0.2 * s + LEAN * top, cy = y - top, hh = s * 0.4;
      ctx.lineCap = 'round'; ctx.lineWidth = Math.max(1.3, s * 0.028); ctx.strokeStyle = '#f2c230';
      ctx.beginPath(); ctx.moveTo(cx, cy + 2); ctx.lineTo(cx + LEAN * hh, cy - hh); ctx.moveTo(cx + LEAN * hh - s * 0.4, cy - hh); ctx.lineTo(cx + LEAN * hh + s * 0.12, cy - hh); ctx.stroke();
      ctx.lineCap = 'butt';
    }
    if (veil) ctx.globalAlpha = BASE;
    return top;
  };
  // Which way a defence post points its gun: at the nearest tile of another realm. Looked up now and then.
  View.prototype.closeAim = function (g, u) {
    const S = this.nah, e = S.aim.get(u.id);
    if (e && g.ticks - e.t < 50) return e.a;
    const W = g.W, H = g.H, own = g.owner, o = u.owner.id;
    let best = 1e9, a = -0.6;
    for (let r = 2; r <= 24 && best > 1e8; r += 2) {
      for (let k = 0; k < 16; k++) {
        const ang = k * 0.3927, x = Math.round(u.x + Math.cos(ang) * r), y = Math.round(u.y + Math.sin(ang) * r);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const q = own[y * W + x];
        if (q && q !== o && r < best) { best = r; a = ang; }
      }
    }
    if (S.aim.size > 2000) S.aim.clear();
    S.aim.set(u.id, { t: g.ticks, a: a });
    return a;
  };

  View.prototype.closeTank = function (ctx, g, t, x, y, L, now, z, ox, oy) {
    const born = Math.min(1, (now - t.born) / 500), fade = t.gone ? Math.max(0, 1 - (now - t.gone) / 600) : 1;
    const p = t.p;
    // the body in a deep shade of the owner's colour, so a tank stands out from its own land
    if (!p.tankCol || p.tankKey !== p.r + ',' + p.g + ',' + p.b) {
      const mx = Math.max(p.r, p.g, p.b), mn = Math.min(p.r, p.g, p.b);
      p.tankCol = mx - mn < 26 ? [104, 110, 118] : G.hsl(G.hueOf([p.r, p.g, p.b]), 0.5, 0.4);
      p.tankKey = p.r + ',' + p.g + ',' + p.b;
    }
    let col = p.tankCol;
    if (t.cut) col = mix(col, [120, 120, 120], 0.6);       // cut off: grey, no supply
    // a tank at a front under attack fires back; an attacking tank fires at the tile it is taking
    let fireK = 0, tur = Math.sin(now / 2300 + t.seed * 20) * 0.25 * (t.front ? 0.4 : 1);
    const S = this.nah;
    const fighting = t.fight || (t.front && nearFront(S.front, t.x, t.y, p.id));
    if (fighting) {
      tur = 0;
      const per = 1700 + t.seed * 1500, ph = ((now + t.seed * 9000) % per) / per;
      if (ph < 0.09) fireK = 1 - ph / 0.09;
      if (t.fight && ph > 0.12 && ph < 0.3 && t.tx !== undefined) {   // the shell lands on the tile under attack
        const k = (ph - 0.12) / 0.18, ix = t.tx * z + ox, iy = t.ty * z + oy;
        ctx.beginPath(); ctx.arc(ix, iy - L * 0.2 * k, L * (0.18 + 0.4 * k), 0, 6.2832);
        ctx.fillStyle = k < 0.35 ? 'rgba(255,190,80,' + (0.95 - k).toFixed(2) + ')' : 'rgba(80,72,64,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx.fill();
      }
    }
    drawTank(ctx, x, y, L, t.ang, tur, col, born * fade, fireK, p === g.human);
    if (t.moving && !t.gone) {          // dust behind a tank on the move
      const bx = x - Math.cos(t.ang) * L * 0.6, by = y - Math.sin(t.ang) * L * 0.6, f = (now / 400 + t.seed) % 1;
      ctx.beginPath(); ctx.arc(bx - Math.cos(t.ang) * L * 0.3 * f, by - Math.sin(t.ang) * L * 0.3 * f - L * 0.1, L * (0.12 + 0.18 * f), 0, 6.2832);
      ctx.fillStyle = 'rgba(196,180,140,' + (0.45 * (1 - f)).toFixed(3) + ')'; ctx.fill();
    }
    if (t.cut && !t.gone) smoke(ctx, x + LEAN * L * 0.3, y - L * 0.3, L * 1.4, now, t.seed, true, 3);
  };
  // Is the defender `pid` being attacked within a few tiles of (x, y)? The fronts are kept in buckets of 4 x 4 tiles.
  function nearFront(set, x, y, pid) {
    const bx = Math.floor(x) >> 2, by = Math.floor(y) >> 2;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (set.has(((by + dy) * 4096 + (bx + dx)) * 64 + (pid & 63))) return true;
    return false;
  }

  // Sandbags on the own border towards other realms, as far as the cell behind it has dug in.
  View.prototype.drawSandbags = function (ctx, g, z, ox, oy, now, x0, y0, x1, y1) {
    const S = this.nah, h = g.human, W = g.W, H = g.H, own = g.owner, id = h.id, post = h.post;
    if (!S.sand || now - S.sandAt > 700 || S.sandKey !== x0 + ',' + y0 + ',' + x1 + ',' + y1) {
      S.sandAt = now; S.sandKey = x0 + ',' + y0 + ',' + x1 + ',' + y1;
      const out = [];
      for (let y = Math.max(1, y0); y <= Math.min(H - 2, y1); y++) {
        for (let x = Math.max(1, x0); x <= Math.min(W - 2, x1); x++) {
          const t = y * W + x;
          if (own[t] !== id || ((x + y) & 1)) continue;
          let nx = 0, ny = 0;
          const q = [own[t - 1], own[t + 1], own[t - W], own[t + W]];
          if (q[0] && q[0] !== id) nx -= 1;
          if (q[1] && q[1] !== id) nx += 1;
          if (q[2] && q[2] !== id) ny -= 1;
          if (q[3] && q[3] !== id) ny += 1;
          if (!nx && !ny) continue;
          const c = post.cells.get(g.cellOf(t)), e = c ? c.e || 0 : 0;
          if (e < 0.15) continue;
          out.push([x, y, nx, ny, e]);
        }
      }
      S.sand = out;
    }
    const r = Math.max(2.2, z * 0.34);
    for (const b of S.sand) {
      const cx = (b[0] + 0.5 + b[2] * 0.22) * z + ox, cy = (b[1] + 0.5 + b[3] * 0.22) * z + oy;
      const a = Math.atan2(b[3], b[2]) + 1.5708, al = within(b[4] * 1.4, 0.3, 1);
      ctx.globalAlpha = al;
      for (let k = -1; k <= 1; k++) {
        const bx = cx + Math.cos(a) * k * r * 1.25, by = cy + Math.sin(a) * k * r * 1.25;
        ctx.beginPath(); ctx.ellipse(bx, by - r * 0.3, r * 0.7, r * 0.42, a, 0, 6.2832);
        ctx.fillStyle = '#b8a272'; ctx.fill(); ctx.lineWidth = 0.7; ctx.strokeStyle = 'rgba(70,58,34,.8)'; ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };
})(globalThis.G = globalThis.G || {});
