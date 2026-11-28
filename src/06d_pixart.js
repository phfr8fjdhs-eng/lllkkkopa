// The pictures of the pixel style (plan «Pixel-Stil», doku/stil.md), built with the shapes of
// src/06c_pixel.js. Each builder returns a finished Pix with its anchor (ax, ay): bottom middle
// for buildings, the water line for ships.
(function () {
  'use strict';
  const G = globalThis.G, X = G.Pixel, C = X.C, hash = X.hash;
  const PC1 = X.PC1, PC2 = X.PC2, PC3 = X.PC3;

  // ---------------------------------------------------------------- materials (palette only)
  const K = {
    // outline, glint
    ink: C('#16273b'), inkW: C('#2e2118'),
    // red tiles
    tile0: C('#c26946'), tile1: C('#b04945'), tile2: C('#9d303c'), tile3: C('#7e2b2e'), tile4: C('#66282e'), tile5: C('#4c1d23'),
    // brick and rust
    brk0: C('#c38a4e'), brk1: C('#934d39'), brk2: C('#732a12'), brk3: C('#59342f'), brk4: C('#4c1d23'),
    // plaster: beige, light and shaded
    bg0: C('#dbc67a'), bg1: C('#c4a76a'), bg2: C('#aa9976'), bg3: C('#8f7b73'), bg4: C('#6f5036'),
    // white
    wh0: C('#f2f4fe'), wh1: C('#cddddb'), wh2: C('#b1bdd0'), wh3: C('#a4acb1'), wh4: C('#898d95'), wh5: C('#6c707e'),
    // steel
    st0: C('#a4acb1'), st1: C('#919994'), st2: C('#747c89'), st3: C('#5b626e'), st4: C('#3d4552'), st5: C('#2c303d'),
    // glass
    gl0: C('#cde5fd'), gl1: C('#9ccced'), gl2: C('#709fc9'), gl3: C('#3a69a2'), gl4: C('#20456f'),
    // green
    gr0: C('#889c46'), gr1: C('#609761'), gr2: C('#448549'), gr3: C('#2b5d46'), gr4: C('#344c1b'),
    // wood
    wd0: C('#a27544'), wd1: C('#774f31'), wd2: C('#2e2118'),
    // earth under the grass
    dt0: C('#875f47'), dt1: C('#6f5036'), dt2: C('#59342f'),
    // paving, asphalt
    pv0: C('#cbd0d3'), pv1: C('#a7acb6'), pv2: C('#898d95'), pv3: C('#6a797d'), as0: C('#505663'), as1: C('#3d4552'),
    // lights
    lamp: C('#d1be6d'), lamp2: C('#dbc67a'), cnt: [C('#3c7cc3'), C('#448549'), C('#9d303c'), C('#cc8738'), C('#c6b63f')]
  };
  G.PIX_K = K;

  // ---------------------------------------------------------------- textures
  // Window rows on a wall: columns every `step` world units from `s0`, w wide; rows from t0 every
  // `rs` high, `wh` tall; `glass` [lit pixel, glass]; frame shading by the caller.
  function windows(base, o) {
    return (s, t, px, py) => {
      const ss = s - o.s0, tt = t - o.t0;
      if (ss >= 0 && tt >= 0 && (o.n === undefined || ss < o.n * o.step)) {
        const fs = ss % o.step, ft = tt % (o.rs || 99);
        if (fs < o.w && ft < o.wh && (o.rows === undefined || tt < o.rows * o.rs)) {
          if (o.lit && hash(Math.floor(ss / o.step), Math.floor(tt / (o.rs || 99)), o.seed || 1) < o.lit) return K.lamp;
          return ft >= o.wh - 1 && fs < 0.5 ? o.glass[0] : o.glass[1];
        }
      }
      return typeof base === 'function' ? base(s, t, px, py) : base;
    };
  }
  // Bricks: courses of 2 pixel rows, joints staggered.
  function bricks(c0, c1, jo) {
    return (s, t, px, py) => {
      const row = Math.floor(t / 2);
      if (Math.floor(t) % 2 === 1 && jo) return jo;
      return ((px + (row % 2) * 2) % 4 === 0) ? c1 : c0;
    };
  }
  // Tiles on a roof slope (v is 0 at the eaves, 1 at the ridge): courses of 2 pixel rows, the
  // lower row of each one darker, the course at the eaves darkest.
  function tiles(rows, c0, c1, c2) {
    return (s, v, px, py) => {
      const r = Math.floor(v * rows), f = v * rows - r;
      if (r === 0 && f < 0.5) return c2;
      return f < 0.5 ? c1 : c0;
    };
  }

  // ---------------------------------------------------------------- base plates
  function grass(s, t, px, py) {
    const h = hash(px, py, 7);
    return h < 0.08 ? K.gr2 : h > 0.95 ? K.gr0 : K.gr1;
  }
  function plate(iso, n, m, edgeOnly) {
    const mat = m === 'grass' ? { t: grass, l: K.dt0, r: K.dt1, lo: K.dt2, hi: K.gr0, k: 2 }
      : m === 'pave' ? { t: (s, t, px, py) => ((Math.floor(s) + Math.floor(t)) % 2 ? K.pv1 : (hash(px, py, 3) < 0.1 ? K.pv2 : K.pv1)), l: K.pv2, r: K.pv3, lo: K.st4, hi: K.pv0, k: 1 }
        : { t: (s, t, px, py) => (hash(px, py, 5) < 0.07 ? K.st2 : (Math.floor(s) % 4 === 0 && (px + py) % 2 ? K.st2 : K.st1)), l: K.st2, r: K.st3, lo: K.st4, hi: K.st0, k: 1 };
    iso.box(0, 0, 0, n, n, 2, mat);
    return iso.p.cur;
  }

  // ---------------------------------------------------------------- pieces
  // A house: walls a × b × h, pitched roof along `along`, chimney.
  function house(iso, x, y, z, a, b, h, o) {
    o = o || {};
    const wl = o.wall || [K.bg1, K.bg2, K.bg3];             // lit, shaded, bottom
    const eave = (base, sh) => (s, t, px, py) => (t >= h - 1 ? sh : (typeof base === 'function' ? base(s, t, px, py) : base));
    const winL = windows(wl[0], { s0: 0.6, step: a > 4 ? (a - 1.2) / 2 : 9, w: 1, t0: h - 4, wh: 2, glass: [K.gl1, K.gl3], n: a > 4 ? 3 : 1 });
    const winR = windows(wl[1], { s0: b / 2 - 0.5, step: 9, w: 1, t0: h - 4, wh: 2, glass: [K.gl3, K.gl4], n: 1 });
    const door = o.door === false ? winL : (s, t, px, py) => {
      const d0 = a / 2 - 0.5;
      if (s >= d0 && s < d0 + 1 && t < 4) return t >= 3 ? K.wd1 : (s - d0 < 0.5 ? K.wd0 : K.wd1);
      return winL(s, t, px, py);
    };
    iso.box(x, y, z, a, b, h, { l: eave(door, wl[1]), r: eave(winR, wl[2]), t: null, lo: wl[2], lo2: K.bg4, k: 2 });
    const ov = 0.5, rh = o.rh || Math.min(a, b) * 0.75;
    const top = z + h;
    const along = o.along || (a >= b ? 'x' : 'y');
    iso.gable(x - ov, y - ov, top, a + 2 * ov, b + 2 * ov, rh, along, {
      f: tiles(Math.max(2, Math.round((rh + (along === 'x' ? b : a) / 2) / 2)), K.tile1, K.tile2, K.tile3), g: K.tile3,
      e: along === 'x' ? wl[1] : wl[0], es: along === 'x' ? wl[2] : wl[1], ridge: K.tile0, verge: K.tile3, ov, k: 2
    });
    if (o.chimney !== false) {                               // astride the ridge
      const cx = along === 'x' ? x + a * 0.68 : x + a / 2 - 0.5, cy = along === 'x' ? y + b / 2 - 0.5 : y + b * 0.3;
      iso.box(cx, cy, top + rh - 1.5, 1, 1, 4, { l: bricks(K.brk1, K.brk2), r: bricks(K.brk2, K.brk3), t: K.wd2, hi: K.brk0, k: 2 });
    }
    if (o.flag) flag(iso, x + a * 0.25, y + b / 2, top + rh);
  }
  // A flag in player colour: 1 pixel pole, 4 × 3 cloth (light, base, shade).
  function flag(iso, x, y, z) {
    const [px, py] = iso.at(x, y, z);
    iso.stamp(px + 2, py, ['.aab', '.abb', '.bbc', 'p...', 'p...', 'p...'], { a: PC1, b: PC2, c: PC3, p: K.st4 }, 1, false);
  }
  const TREE = ['..aab..', '.abbbc.', 'abbbbcc', 'bbbbccd', 'bbcccdd', '.ccddd.', '..ddd..', '...t...', '...t...'];
  function tree(iso, x, y, z) {
    const [px, py] = iso.at(x, y, z);
    iso.stamp(px, py, TREE, { a: K.gr0, b: K.gr1, c: K.gr2, d: K.gr3, t: K.wd1 }, 2);
  }

  // ---------------------------------------------------------------- city, pictures A to E
  // Stage of a building level: A 1, B 2–4, C 5–9, D 10–29, E 30 and more.
  function stage(level) { return level >= 30 ? 4 : level >= 10 ? 3 : level >= 5 ? 2 : level >= 2 ? 1 : 0; }
  const SIZE = [8, 11, 14, 18, 24];                         // plate edge in world units, per picture
  function canvas(n, extra) {
    const w = 4 * n + 8, h = 2 * n + extra + 8;
    const p = new X.Pix(w, h), iso = new X.Iso(p, w / 2, extra + 4);
    p.ax = w / 2; p.ay = extra + 4 + 2 * n + 2;
    return iso;
  }
  // A flat roofed block: white walls with rows of windows, a rim around the roof.
  function block(iso, x, y, z, a, b, h, o) {
    o = o || {};
    const fl = o.floor || 4;
    const wL = windows(K.wh1, { s0: 0.5, step: 1.5, w: 1, t0: 2, rs: fl, wh: 2, glass: [K.gl1, K.gl3], rows: Math.floor((h - 3) / fl) + 1, lit: o.lit, seed: 3 });
    const wR = windows(K.wh3, { s0: 0.5, step: 1.5, w: 1, t0: 2, rs: fl, wh: 2, glass: [K.gl3, K.gl4], rows: Math.floor((h - 3) / fl) + 1, lit: o.lit, seed: 4 });
    const band = (base, c) => (s, t, px, py) => (t >= h - 1 ? c : base(s, t, px, py));
    iso.box(x, y, z, a, b, h, {
      l: band(wL, K.wh2), r: band(wR, K.wh4), lo: K.wh4, lo2: K.wh5, hi: K.wh0, k: 1,
      t: (s, t) => (s < 0.5 || t < 0.5 || s > a - 0.5 || t > b - 0.5 ? K.wh1 : K.wh3)
    });
    if (o.hut) iso.box(x + 0.8, y + 0.8, z + h, 1.5, 1.5, 3, { l: K.wh2, r: K.wh4, t: K.wh1, hi: K.wh0, k: 1 });
    if (o.ac) iso.box(x + a - 1.6, y + b - 1.8, z + h, 1, 1, 1, { l: K.st1, r: K.st3, t: K.st0, k: 1 });
    if (o.stripe) {                                          // player colour along the roof's edge
      iso.p.obj(1, false);
      for (let i = 0; i < a * 2; i++) { const [px, py] = iso.at(x + i / 2 + 0.25, y + b, z + h); iso.p.put(px, py, PC2); }
    }
  }
  // A glass tower: curtain wall, a floor line every 3 pixels, a reflection across the lit side.
  function tower(iso, x, y, z, a, b, h, o) {
    o = o || {};
    const lit = o.lit || 0;
    const L = (s, t, px, py) => {
      const fl = Math.floor(t) % 3;
      if (fl === 2) return K.gl3;
      if (lit && hash(Math.floor(s * 2), Math.floor(t / 3), 11) < lit) return K.lamp;
      const r = (px * 0.5 + py) % 14;
      if (r >= 0 && r < 2) return K.gl0;
      return (px & 1) ? K.gl2 : K.gl1;
    };
    const Rt = (s, t, px, py) => {
      const fl = Math.floor(t) % 3;
      if (fl === 2) return K.gl4;
      if (lit && hash(Math.floor(s * 2), Math.floor(t / 3), 13) < lit) return K.lamp2;
      return (px & 1) ? K.gl3 : K.gl4;
    };
    iso.box(x, y, z, a, b, h, { l: L, r: Rt, t: (s, t) => (s < 0.5 || t < 0.5 ? K.st0 : K.st2), hi: K.wh0, lo: K.st3, lo2: K.st4, k: 1 });
    if (o.top) iso.box(x + 0.7, y + 0.7, z + h, a - 1.4, b - 1.4, 2, { l: K.st1, r: K.st3, t: K.st2, hi: K.st0, k: 1 });
    if (o.antenna) {
      const [px, py] = iso.at(x + a / 2, y + b / 2, z + h + (o.top ? 2 : 0));
      iso.stamp(px, py, ['r', 'p', 'p', 'p', 'p', 'p', 'p', 'q'], { r: K.tile1, p: K.st4, q: K.st3 }, 1, false);
    }
    if (o.flag) flag(iso, x + a / 2, y + b / 2, z + h + (o.top ? 2 : 0));
  }
  const LAMP = ['ab', 'p.', 'p.', 'p.', 'p.', 'q.'];
  function lamp(iso, x, y, z) { const [px, py] = iso.at(x, y, z); iso.stamp(px + 1, py, LAMP, { a: K.lamp, b: K.lamp2, p: K.st4, q: K.st3 }, 1); }
  // A road along x across the plate: asphalt, white dashes.
  function road(iso, y, z, n, w) {
    iso.p.obj(1, false);
    iso.face([0, y, z], [n, 0, 0], [0, w, 0], false, (u, v, px, py) => {
      const s = u * n, t = v * w;
      if (t < 0.5 || t > w - 0.5) return K.pv2;
      if (Math.abs(t - w / 2) < 0.25 && Math.floor(s) % 2 === 0) return K.wh1;
      return K.as0;
    });
    return iso.p.cur;
  }

  function city(st) {
    const n = SIZE[st], iso = canvas(n, 64), g = new Set([plate(iso, n, st >= 3 ? 'pave' : 'grass')]);
    const z = 2;
    if (st === 0) {
      house(iso, 1.5, 2, z, 5, 4, 7, { flag: true, rh: 4 });
    } else if (st === 1) {
      house(iso, 1, 1.5, z, 4, 3.5, 6, { rh: 3 });
      house(iso, 6, 1, z, 4, 4.5, 10, { along: 'y', rh: 4, flag: true });
      tree(iso, 2, 8, z);
      house(iso, 3.5, 6, z, 4.5, 3.5, 6, { rh: 3, chimney: false });
      tree(iso, 9, 8.5, z);
    } else if (st === 2) {
      block(iso, 7.5, 1, z, 5, 4, 17, { hut: true, ac: true, stripe: true });
      house(iso, 1, 1.5, z, 4.5, 3.5, 7, { rh: 3.5 });
      flag(iso, 10, 3, z + 17);
      tree(iso, 1.5, 7.5, z);
      house(iso, 7, 7.5, z, 5, 4, 7, { rh: 4 });
      house(iso, 3, 7, z, 3.5, 5, 9, { along: 'y', rh: 3, chimney: false });
      tree(iso, 12, 12, z);
    } else if (st === 3) {
      tower(iso, 10.5, 1, z, 4, 4, 30, { top: true, flag: true });
      block(iso, 3, 1, z, 5, 4, 17, { hut: true, stripe: true });
      house(iso, 1, 7, z, 4, 3.5, 7, { rh: 3 });
      block(iso, 10, 7, z, 5, 3, 9, { ac: true, floor: 4 });
      tree(iso, 7, 9.5, z);
      house(iso, 15.5, 6.5, z, 2, 3.5, 6, { along: 'y', rh: 2.5, chimney: false });
      g.add(road(iso, 13, z, n, 3));
      lamp(iso, 4, 16.8, z); lamp(iso, 12, 16.8, z);
      tree(iso, 8, 17.3, z); tree(iso, 16, 17.3, z);
    } else {
      tower(iso, 4.5, 2, z, 4, 4, 24, { top: true, lit: 0.18 });
      tower(iso, 10, 1, z, 5, 5, 34, { top: true, antenna: true, lit: 0.22, flag: true });
      tower(iso, 16.5, 2.5, z, 4, 4, 29, { lit: 0.2, top: true });
      block(iso, 1.5, 9, z, 4.5, 4, 13, { hut: true, lit: 0.2, stripe: true });
      tree(iso, 8.5, 11.5, z);
      block(iso, 10, 9.5, z, 5, 4, 11, { ac: true, lit: 0.25 });
      house(iso, 17, 9.5, z, 5, 4, 7, { rh: 3.5 });
      g.add(road(iso, 17.5, z, n, 3));
      lamp(iso, 5, 21.3, z); lamp(iso, 13, 21.3, z); lamp(iso, 21, 21.3, z);
      tree(iso, 9, 22, z); tree(iso, 17, 22, z);
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- factory, pictures A to E
  // A hall with a sawtooth roof: brick walls, rust red slopes, glass strips facing the light.
  function hall(iso, x, y, z, a, b, h, o) {
    o = o || {};
    const tw = o.tooth || 2, th = 3, n = Math.max(1, Math.round(b / tw)), w = b / n;
    const wL = windows(bricks(K.brk1, K.brk2), { s0: 0.6, step: 1.5, w: 1, t0: h - 3.5, wh: 2, glass: [K.gl1, K.gl3] });
    const wR = windows(bricks(K.brk2, K.brk3), { s0: 0.6, step: 1.5, w: 1, t0: h - 3.5, wh: 2, glass: [K.gl3, K.gl4] });
    const gate = (s, t, px, py) => {
      if (o.gate && s >= a / 2 - 1 && s < a / 2 + 1 && t < Math.min(5, h - 2)) return t % 2 < 1 ? K.st3 : K.st2;
      return wL(s, t, px, py);
    };
    iso.box(x, y, z, a, b, h, { l: gate, r: wR, t: null, lo: K.brk3, lo2: K.brk4, k: 2 });
    const top = z + h;
    for (let i = 0; i < n; i++) {
      const y0 = y + i * w;
      iso.p.obj(2);
      iso.face([x, y0, top], [a, 0, 0], [0, w, th], false, (u, v, px, py) => (v > 0.86 ? K.brk0 : (Math.floor(v * 4) % 2 ? K.brk1 : K.tile3)));
      iso.face([x, y0 + w, top], [a, 0, 0], [0, 0, th], false, (u, v, px, py) => (v > 0.7 ? K.st4 : ((px >> 1) % 2 ? K.gl2 : K.gl1)));
      iso.face([x + a, y0 + w, top], [0, -w, 0], [0, 0, th], true, (u, v) => K.brk3);
    }
    if (o.flag) flag(iso, x + a * 0.3, y + w * 0.5, top + th);
    if (o.stripe) {
      iso.p.obj(2, false);
      for (let i = 0; i < a * 2; i++) { const [px, py] = iso.at(x + i / 2 + 0.25, y + b, top); iso.p.put(px, py - 1, PC2); }
    }
  }
  // A brick chimney: a lighter band near the top, a dark mouth.
  function chimney(iso, x, y, z, h) {
    const band = (c0, c1, cb) => (s, t, px, py) => (t > h - 3 && t < h - 1.5 ? cb : bricks(c0, c1)(s, t, px, py));
    iso.box(x, y, z, 1.5, 1.5, h, { l: band(K.brk1, K.brk2, K.wh2), r: band(K.brk2, K.brk3, K.wh4), t: (s, t) => (s > 0.4 && t > 0.4 && s < 1.1 && t < 1.1 ? K.wd2 : K.brk2), hi: K.brk0, k: 2 });
  }
  function tank(iso, x, y, z, r, h) {
    iso.cyl(x, y, z, r, h, { ramp: [K.st0, K.st1, K.st2, K.st3], top: K.st1, rim: K.wh1, bands: [Math.round(h / 3), Math.round(2 * h / 3)], lo: K.st4, k: 1 });
  }
  function crate(iso, x, y, z, c) {
    iso.box(x, y, z, 1.5, 1.5, 3, { l: c ? c[0] : K.wd0, r: c ? c[1] : K.wd1, t: c ? c[0] : K.wd0, hi: c ? K.wh1 : K.bg1, k: 2 });
  }
  function belt(iso, x0, y, z0, len, rise) {
    iso.p.obj(1);
    iso.face([x0, y, z0], [len, 0, rise], [0, 1, 0], false, (u, v, px, py) => (v < 0.4 ? K.st2 : (px % 3 === 0 ? K.st4 : K.st3)));
    iso.face([x0, y + 1, z0], [len, 0, rise], [0, 0, -1], false, () => K.st4);
    for (let i = 1; i < 3; i++) { const f = i / 3; iso.box(x0 + len * f, y + 0.3, 2, 0.5, 0.5, z0 + rise * f - 2, { l: K.st3, r: K.st4, t: K.st2, k: 1 }); }
  }
  function factory(st) {
    const n = SIZE[st], iso = canvas(n, 64), g = new Set([plate(iso, n, 'concrete')]);
    const z = 2;
    if (st === 0) {
      chimney(iso, 5.5, 1, z, 16);
      hall(iso, 1, 2.5, z, 6, 4.5, 6, { flag: true, stripe: true });
    } else if (st === 1) {
      chimney(iso, 7.5, 1, z, 18);
      hall(iso, 1, 1, z, 5, 4, 6, {});
      hall(iso, 5, 4.5, z, 5.5, 4.5, 7, { gate: true, flag: true, stripe: true });
      crate(iso, 1.5, 7, z); crate(iso, 1.5, 8.7, z, [K.cnt[0], C('#2f5e82')]);
    } else if (st === 2) {
      chimney(iso, 8, 1, z, 20);
      hall(iso, 1, 1, z, 6, 4, 7, {});
      tank(iso, 11, 4.5, z, 1.8, 8);
      hall(iso, 2, 7, z, 7, 5, 7, { gate: true, flag: true, stripe: true });
      crate(iso, 10.5, 9.5, z); crate(iso, 12.2, 9.5, z, [K.cnt[0], C('#2f5e82')]);
    } else if (st === 3) {
      chimney(iso, 5, 1, z, 22); chimney(iso, 8, 1, z, 18);
      hall(iso, 1, 3, z, 7, 5, 8, {});
      tank(iso, 13.5, 3.5, z, 2, 9);
      hall(iso, 1.5, 10, z, 7, 6, 7, { gate: true, flag: true, stripe: true });
      belt(iso, 9, 12, z + 1, 4.5, 5);
      crate(iso, 14, 11, z); crate(iso, 15.7, 11, z, [K.cnt[3], C('#934e1a')]); crate(iso, 14, 12.7, z, [K.cnt[1], C('#2b5d46')]);
      tank(iso, 14.5, 15.5, z, 1.4, 5);
    } else {
      chimney(iso, 4, 1, z, 24); chimney(iso, 7.5, 1, z, 28); chimney(iso, 11, 1, z, 22);
      hall(iso, 1, 3, z, 13, 5, 9, {});
      tank(iso, 17.5, 3, z, 2.2, 11); tank(iso, 21, 7, z, 1.8, 8);
      hall(iso, 1, 10, z, 8, 6, 8, { gate: true, stripe: true });
      hall(iso, 12, 11, z, 7, 5, 8, { gate: true, flag: true, stripe: true });
      belt(iso, 9, 18, z + 1, 5, 5);
      tank(iso, 21.5, 15, z, 1.5, 6);
      crate(iso, 2, 18.5, z); crate(iso, 3.7, 18.5, z, [K.cnt[0], C('#2f5e82')]); crate(iso, 2, 20.2, z, [K.cnt[4], C('#856d1c')]);
      crate(iso, 16, 19, z, [K.cnt[2], K.tile3]); crate(iso, 17.7, 19, z, [K.cnt[1], C('#2b5d46')]);
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- ships drawn here
  // Foam on the water: a 1 pixel line under the hull, spray at the bow, small swirls at the stern.
  //   bow: 'r' (upper right) or 'l'
  function foam(p, bow) {
    const w = p.w, h = p.h, F0 = C('#cddddb'), F1 = C('#f2f4fe');
    const low = new Int16Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (p.d[y * w + x]) { low[x] = y; break; }
    p.obj(0, false);
    let x0 = -1, x1 = -1;
    for (let x = 0; x < w; x++) if (low[x] >= 0) { if (x0 < 0) x0 = x; x1 = x; }
    for (let x = x0; x <= x1; x++) if (low[x] >= 0 && low[x] + 1 < h) p.put(x, low[x] + 1, (x % 5 === 0 || x % 7 === 3) ? F1 : F0);
    const bx = bow === 'l' ? x0 : x1, sgn = bow === 'l' ? -1 : 1;
    const by = low[bx];
    for (const [dx, dy, c] of [[1, 0, F1], [2, -1, F0], [1, 1, F0], [3, 0, F0]]) p.put(bx + sgn * dx, by + dy, c);
    const sx = bow === 'l' ? x1 : x0, sy = low[sx];
    for (const [dx, dy, c] of [[1, 0, F0], [2, 1, F1], [4, 1, F0], [3, -1, F0]]) p.put(sx - sgn * dx, sy + dy, c);
  }
  // Landing craft (UT.TRANSPORT): a boxy grey green hull, the bow ramp up front, soldiers in the
  // well deck, a small wheelhouse aft, a stripe in player colour. Lies like the submarine: bow to
  // the upper right.
  function boat() {
    const p = new X.Pix(60, 50), iso = new X.Iso(p, 22, 14);
    const a = 6, L = 16, hh = 4;
    const H0 = C('#5a8662'), H1 = C('#456957'), H2 = C('#536753'), H3 = C('#305234'), DK = C('#2b5d46'), FL = C('#3d4552'), FL2 = C('#33465b');
    // bow ramp, standing a little higher than the sides
    iso.box(0, 0, 0, a, 0.8, hh + 2, { l: H1, r: H3, t: H0, hi: C('#82978d'), lo: DK, k: 1 });
    // hull with an open well deck
    iso.box(0, 0.8, 0, a, L - 0.8, hh, {
      l: (s, t) => (t >= hh - 1 ? H0 : H1), r: (s, t) => (t >= hh - 1.5 && t < hh - 0.5 ? PC2 : t >= hh - 0.5 ? H2 : H3), lo: DK, lo2: C('#344c1b'), hi: C('#82978d'), k: 1,
      t: (s, t) => (s < 0.6 || s > a - 0.6 || t > L - 0.8 - 0.6 ? H0 : (Math.floor(t) % 3 === 0 ? FL2 : FL))
    });
    // soldiers: 2 × 2 heads, helmet on top
    const SOL = ['hg', 'fk'], map = { h: C('#448549'), g: C('#344c1b'), f: C('#bc845c'), k: C('#875f47') };
    for (const [x, y] of [[1.4, 2.2], [3.9, 2.4], [1.4, 5], [3.9, 5.2], [1.4, 7.8], [3.9, 8]]) {
      const [px, py] = iso.at(x, y, 1.5);
      iso.stamp(px, py, SOL, map, 1);
    }
    // wheelhouse aft
    iso.box(1.2, L - 4, hh, 3.6, 2.8, 5, { l: (s, t) => (t > 2 && t < 4 && s > 0.4 && s < 3.2 ? ((s * 2 | 0) % 2 ? K.gl3 : K.gl1) : K.wh2), r: (s, t) => (t > 2 && t < 4 && s > 0.4 && s < 2.4 ? K.gl4 : K.wh4), t: K.wh1, hi: K.wh0, lo: K.wh4, lo2: K.wh5, k: 1 });
    const [mx, my] = iso.at(3, L - 2.6, hh + 5);
    iso.stamp(mx, my, ['a', 'p', 'p', 'p'], { a: K.wh0, p: K.st4 }, 1, false);
    flag(iso, 3, L - 2.6, hh + 9);
    p.finish();
    foam(p, 'r');
    const q = p.trim();
    return q;
  }

  G.PixArt = { city, factory, boat, foam, stage, block, tower, hall, chimney, tank, crate, lamp, road, K, flag, house, tree, windows, bricks, tiles };
})();
