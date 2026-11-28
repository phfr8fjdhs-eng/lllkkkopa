// The pictures of the pixel style (plan «Pixel-Stil», doku/stil.md), built with the shapes of
// src/06c_pixel.js. Each builder returns a finished Pix with its anchor (ax, ay): bottom middle
// for buildings, the water line for ships.
(function () {
  'use strict';
  const G = globalThis.G, X = G.Pixel, C = X.C, hash = X.hash;
  const PC1 = X.PC1, PC2 = X.PC2, PC3 = X.PC3;

  // ---------------------------------------------------------------- materials (palette only)
  // Muted like the reference (round 1 feedback): little pure white, no bright blue.
  const K = {
    // outline
    ink: C('#16273b'), inkW: C('#2e2118'),
    // red tiles
    tile0: C('#a04143'), tile1: C('#964340'), tile2: C('#7d363c'), tile3: C('#663d3e'), tile4: C('#562f32'), tile5: C('#4c1d23'),
    // dark brick: lit, mid, shaded, dark joints
    brk0: C('#8a4544'), brk1: C('#7c423d'), brk2: C('#663d3e'), brk3: C('#562f32'), brk4: C('#49292d'),
    // plaster: beige, light and shaded
    bg0: C('#c4a76a'), bg1: C('#aa9976'), bg2: C('#8f7b73'), bg3: C('#7d6e64'), bg4: C('#6f5036'),
    // «white»: light grey, as on the ships' superstructures
    wh0: C('#b1bdd0'), wh1: C('#a4acb1'), wh2: C('#898d95'), wh3: C('#7f8a95'), wh4: C('#6c707e'), wh5: C('#5b5f6c'),
    // steel
    st0: C('#a4acb1'), st1: C('#898d95'), st2: C('#747c89'), st3: C('#5b626e'), st4: C('#3d4552'), st5: C('#2c303d'),
    // glass: dark blue grey
    gl0: C('#7692ac'), gl1: C('#607e93'), gl2: C('#516980'), gl3: C('#45576a'), gl4: C('#33465b'),
    // green
    gr0: C('#85885d'), gr1: C('#5a8662'), gr2: C('#456957'), gr3: C('#2b5d46'), gr4: C('#305234'),
    // wood
    wd0: C('#a27544'), wd1: C('#774f31'), wd2: C('#2e2118'),
    // earth under the grass
    dt0: C('#826e5e'), dt1: C('#6f5036'), dt2: C('#59342f'),
    // paving, asphalt
    pv0: C('#a4acb1'), pv1: C('#898d95'), pv2: C('#797c86'), pv3: C('#636a79'), as0: C('#4f515e'), as1: C('#3d4552'),
    // lights (dim)
    lamp: C('#a49e50'), lamp2: C('#9d9e5e'), cnt: [C('#3c7cc3'), C('#448549'), C('#9d303c'), C('#cc8738'), C('#c6b63f')],
    // flag pole
    pole: C('#a4acb1'), knob: C('#cbd0d3')
  };
  G.PIX_K = K;

  // ---------------------------------------------------------------- textures
  // Wear: here and there a pixel one step darker or lighter, like the decks of the ships.
  function wear(f, amt, seed) {
    const g = typeof f === 'function' ? f : () => f;
    return (s, t, px, py) => {
      const c = g(s, t, px, py);
      if (!c || (c >>> 24) !== 255) return c;
      const r = hash(px, py, seed || 9);
      return r < amt ? X.darker(c) : r > 1 - amt * 0.5 ? X.lighter(c) : c;
    };
  }
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
        // a streak of dirt under some windows
        if (fs < o.w && ft >= o.wh && ft < o.wh + 1 && (o.rows === undefined || tt < o.rows * o.rs) && hash(Math.floor(ss / o.step), Math.floor(tt / (o.rs || 99)), (o.seed || 1) + 5) < 0.35) {
          const c = typeof base === 'function' ? base(s, t, px, py) : base;
          return X.darker(c);
        }
      }
      return typeof base === 'function' ? base(s, t, px, py) : base;
    };
  }
  // Bricks: courses of 2 pixel rows, upright joints staggered every 4 pixels, both in the darker
  // joint colour; a few bricks one step off.
  function bricks(c0, c1) {
    return (s, t, px, py) => {
      const row = Math.floor(t / 2);
      if ((px + (row % 2) * 2) % 4 === 0) return c1;
      const r = hash(px >> 2, row, 21);
      return r < 0.12 ? X.darker(c0) : r > 0.93 ? X.lighter(c0) : c0;
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
    if (hash(px >> 1, py, 17) < 0.025) return K.dt0;            // bare earth
    return h < 0.1 ? K.gr2 : h > 0.94 ? K.gr0 : K.gr1;
  }
  function plate(iso, n, m, edgeOnly) {
    const mat = m === 'grass' ? { t: grass, l: wear(K.dt0, 0.08), r: wear(K.dt1, 0.08), lo: K.dt2, hi: K.gr0, k: 2 }
      : m === 'pave' ? { t: wear((s, t, px, py) => ((Math.floor(s) % 3 === 0 && (px & 1)) || (Math.floor(t) % 3 === 0 && !(px & 1) && (py & 1)) ? K.pv2 : K.pv1), 0.04, 3), l: wear(K.pv2, 0.05), r: wear(K.pv3, 0.05), lo: K.st4, hi: K.pv0, k: 1 }
        : { t: wear((s, t, px, py) => (hash(px >> 1, py, 5) < 0.04 ? K.st3 : (Math.floor(s) % 4 === 0 && (px + py) % 2 ? K.st3 : K.st2)), 0.05, 5), l: wear(K.st3, 0.05), r: wear(K.st4, 0.05), lo: K.st5, hi: K.st1, k: 1 };
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
    iso.box(x, y, z, a, b, h, { l: wear(eave(door, wl[1]), 0.05, 31), r: wear(eave(winR, wl[2]), 0.05, 32), t: null, lo: wl[2], lo2: K.bg4, k: 2 });
    const ov = 0.5, rh = o.rh || Math.min(a, b) * 0.75;
    const top = z + h;
    const along = o.along || (a >= b ? 'x' : 'y');
    iso.gable(x - ov, y - ov, top, a + 2 * ov, b + 2 * ov, rh, along, {
      f: wear(tiles(Math.max(2, Math.round((rh + (along === 'x' ? b : a) / 2) / 2)), K.tile1, K.tile2, K.tile3), 0.08, 33), g: K.tile3,
      e: along === 'x' ? wl[1] : wl[0], es: along === 'x' ? wl[2] : wl[1], ridge: K.tile0, verge: K.tile3, ov, k: 2
    });
    if (o.chimney !== false) {                               // astride the ridge
      const cx = along === 'x' ? x + a * 0.68 : x + a / 2 - 0.5, cy = along === 'x' ? y + b / 2 - 0.5 : y + b * 0.3;
      iso.box(cx, cy, top + rh - 1.5, 1, 1, 4, { l: bricks(K.brk1, K.brk2), r: bricks(K.brk2, K.brk3), t: K.wd2, hi: K.brk0, k: 2 });
    }
    if (o.flag) flag(iso, x + a * 0.25, y + b / 2, top + rh);
  }
  // A flag in player colour (X.FLAG): light grey pole, the 4 × 3 cloth hanging from its top.
  function flag(iso, x, y, z) {
    const [px, py] = iso.at(x, y, z);
    iso.stamp(px + 2.5, py, X.FLAG, { k: K.knob, p: K.pole, a: PC1, b: PC2, c: PC3 }, 1, false);
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
      l: wear(band(wL, K.wh2), 0.05, 41), r: wear(band(wR, K.wh4), 0.05, 42), lo: K.wh4, lo2: K.wh5, hi: K.wh0, k: 1,
      t: wear((s, t) => (s < 0.5 || t < 0.5 || s > a - 0.5 || t > b - 0.5 ? K.wh1 : K.wh3), 0.1, 43)
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
      if (fl === 2) return K.st3;
      if (lit && hash(Math.floor(s * 2), Math.floor(t / 3), 11) < lit * 0.6) return K.lamp2;
      const r = (px * 0.5 + py) % 16;
      if (r >= 0 && r < 1.5) return K.gl0;
      return (px & 1) ? K.gl2 : K.gl1;
    };
    const Rt = (s, t, px, py) => {
      const fl = Math.floor(t) % 3;
      if (fl === 2) return K.st5;
      if (lit && hash(Math.floor(s * 2), Math.floor(t / 3), 13) < lit * 0.6) return K.lamp2;
      return (px & 1) ? K.gl4 : C('#2a3a4b');
    };
    iso.box(x, y, z, a, b, h, { l: wear(L, 0.03, 51), r: Rt, t: wear((s, t) => (s < 0.5 || t < 0.5 ? K.st1 : K.st3), 0.1, 52), hi: K.st0, lo: K.st3, lo2: K.st4, k: 1 });
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
      if (Math.abs(t - w / 2) < 0.25 && Math.floor(s) % 2 === 0) return K.wh2;
      return hash(px, py, 61) < 0.08 ? K.as1 : K.as0;
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
    const wL = windows(bricks(K.brk1, K.brk3), { s0: 0.6, step: 1.5, w: 1, t0: h - 3.5, wh: 2, glass: [K.gl2, K.gl4] });
    const wR = windows(bricks(K.brk3, K.brk4), { s0: 0.6, step: 1.5, w: 1, t0: h - 3.5, wh: 2, glass: [K.gl3, K.gl4] });
    const gate = (s, t, px, py) => {
      if (o.gate && s >= a / 2 - 1 && s < a / 2 + 1 && t < Math.min(5, h - 2)) return t % 2 < 1 ? K.st3 : K.st2;
      return wL(s, t, px, py);
    };
    iso.box(x, y, z, a, b, h, { l: gate, r: wR, t: null, lo: K.brk4, lo2: K.brk4, k: 2 });
    const top = z + h;
    for (let i = 0; i < n; i++) {
      const y0 = y + i * w;
      iso.p.obj(2);
      iso.face([x, y0, top], [a, 0, 0], [0, w, th], false, wear((u, v, px, py) => (v > 0.86 ? K.brk0 : (Math.floor(v * 4) % 2 ? K.brk2 : K.tile4)), 0.08, 71 + i));
      iso.face([x, y0 + w, top], [a, 0, 0], [0, 0, th], false, (u, v, px, py) => (v > 0.7 ? K.st5 : hash(px >> 1, py, 72) < 0.12 ? K.gl2 : ((px >> 1) % 2 ? K.gl4 : K.gl3)));
      iso.face([x + a, y0 + w, top], [0, -w, 0], [0, 0, th], true, (u, v) => K.brk3);
    }
    if (o.flag) flag(iso, x + a * 0.3, y + w * 0.5, top + th);
    if (o.stripe) {
      iso.p.obj(2, false);
      for (let i = 0; i < a * 2; i++) { const [px, py] = iso.at(x + i / 2 + 0.25, y + b, top); iso.p.put(px, py - 1, PC2); }
    }
  }
  // A brick chimney: dark red brown brick with darker joints, soot near the top, a dark mouth.
  function chimney(iso, x, y, z, h) {
    const soot = (c0, c1, cs) => (s, t, px, py) => (t > h - 2 ? cs : t > h - 4 && hash(px, py, 81) < 0.5 ? cs : bricks(c0, c1)(s, t, px, py));
    iso.box(x, y, z, 1.5, 1.5, h, { l: soot(K.brk1, K.brk3, K.brk3), r: soot(K.brk3, K.brk4, K.brk4), t: (s, t) => (s > 0.4 && t > 0.4 && s < 1.1 && t < 1.1 ? C('#271e1f') : K.brk3), hi: K.brk2, k: 2 });
  }
  function tank(iso, x, y, z, r, h) {
    iso.cyl(x, y, z, r, h, { ramp: [K.st1, K.st2, K.st3, K.st4], top: K.st2, rim: K.st0, bands: [Math.round(h / 3), Math.round(2 * h / 3)], lo: K.st4, k: 1 });
  }
  function crate(iso, x, y, z, c) {
    iso.box(x, y, z, 1.5, 1.5, 3, { l: wear(c ? c[0] : K.wd0, 0.12), r: c ? c[1] : K.wd1, t: c ? c[0] : K.wd0, hi: c ? K.wh1 : K.bg1, k: 2 });
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
  // Foam as on the ships of the sheet: muted light blue pixels hugging the hull where it meets the
  // water (the lower part of the outline, round both ends), a little spray at the bow, a short
  // wake behind the stern. bow: 'r' (upper right) or 'l'.
  function foam(p, bow) {
    const w = p.w, h = p.h, d = p.d, F = [C('#7692ac'), C('#88a7c3'), C('#a1bdd7')], SP = C('#cbd0d3');
    const low = new Int16Array(w).fill(-1);
    for (let x = 0; x < w; x++) for (let y = h - 1; y >= 0; y--) if (d[y * w + x]) { low[x] = y; break; }
    let x0 = -1, x1 = -1;
    for (let x = 0; x < w; x++) if (low[x] >= 0) { if (x0 < 0) x0 = x; x1 = x; }
    const put = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (d[y * w + x]) continue;
      const n = (x > 0 && d[y * w + x - 1]) || (x + 1 < w && d[y * w + x + 1]) || (y > 0 && d[(y - 1) * w + x]);
      if (!n) continue;
      const lx = low[x] >= 0 ? low[x] : (x < x0 ? low[x0] : low[x1]);
      if (y < lx - 2) continue;                                 // only near the water line
      const r = hash(x, y, 91);
      if (r < 0.15) continue;                                   // gaps
      put.push(x, y, r < 0.6 ? F[0] : r < 0.9 ? F[1] : F[2]);
    }
    p.obj(0, false);
    for (let i = 0; i < put.length; i += 3) p.put(put[i], put[i + 1], put[i + 2]);
    const sgn = bow === 'l' ? -1 : 1, bx = bow === 'l' ? x0 : x1, by = low[bx];
    for (const [dx, dy, c] of [[1, 0, SP], [2, 1, F[2]], [1, -1, F[1]], [3, 0, F[1]]]) if (!p.get(bx + sgn * dx, by + dy)) p.put(bx + sgn * dx, by + dy, c);
    const sx = bow === 'l' ? x1 : x0, sy = low[sx];
    for (const [dx, dy, c] of [[2, 0, F[1]], [3, 1, F[0]], [5, 0, F[0]], [4, -1, F[1]], [7, 1, F[0]]]) if (!p.get(sx - sgn * dx, sy + dy)) p.put(sx - sgn * dx, sy + dy, c);
  }
  // Landing craft (UT.TRANSPORT): lies at a slant like the destroyer, bow to the upper right. A
  // boxy grey green hull with a visible side wall, the bow ramp standing up at the front, 6
  // soldiers with green helmets (2 × 2) in the well deck, the wheelhouse aft with the flag, a
  // stripe in player colour along the rail.
  function boat() {
    const p = new X.Pix(80, 70), iso = new X.Iso(p, 34, 46);
    const L = 15, W = 5.6, hh = 5, fz = hh - 2.5;              // length, beam, side wall, floor of the well
    const u = [-0.164, -0.986], v = [0.986, -0.164];         // along the hull (bow up right), across
    const P = (a, b) => [a * u[0] + b * v[0], a * u[1] + b * v[1]];
    const U = (k) => [u[0] * k, u[1] * k], V = (k) => [v[0] * k, v[1] * k];
    const H0 = C('#82978d'), H1 = C('#6a797d'), H2 = C('#536753'), H3 = C('#456957'), H4 = C('#305234'), H5 = C('#344c1b');
    const FL = C('#3d4552'), FL2 = C('#33465b');
    const bowAt = L - 1.3, rim = 0.6;
    // the well: floor, the far inner wall
    iso.p.obj(1);
    iso.face([...P(rim, rim), fz], [...U(bowAt - rim), 0], [...V(W - 2 * rim), 0], false, (a, b, px, py) => (Math.floor(a * (bowAt - rim)) % 2 === 0 ? FL2 : FL));
    iso.face([...P(rim, rim), fz], [...U(bowAt - rim), 0], [0, 0, hh - fz], false, wear(H4, 0.08, 93));
    // bow ramp: a tall plate across the front; its inner face (towards the stern) is lit, with ribs
    iso.obox(P(bowAt, 0), U(1.3), V(W), 0, hh + 3.5, {
      l: wear((s, t, side) => (side === 'u-' ? (t > hh + 2.5 ? K.st0 : Math.floor(t) % 2 === 0 ? K.st3 : K.st2) : K.st2), 0.05, 94), r: (s, t) => (t < 2 ? K.st4 : K.st3),
      t: K.st1, hi: K.st0, lo: K.st4, k: 1
    });
    // wheelhouse aft, on the floor of the well
    const wt = hh - fz + 7;
    iso.obox(P(1.2, 1.3), U(2.6), V(W - 2.6), fz, wt, {
      l: (s, t) => (t > wt - 4 && t < wt - 2 && s > 0.5 ? (Math.floor(s * 2) % 2 ? K.gl3 : K.gl4) : t >= wt - 1 ? K.wh1 : K.wh0),
      r: (s, t) => (t > wt - 4 && t < wt - 2 && s > 0.5 && s < 2.2 ? K.gl4 : K.wh3),
      t: K.wh1, hi: K.knob, lo: K.wh4, k: 1
    });
    // the hull: side walls and the rim around the well
    iso.obox([0, 0], U(L), V(W), 0, hh, {
      l: wear((s, t) => (t >= hh - 1 ? H1 : H2), 0.06, 95),
      r: wear((s, t, side) => (t >= hh - 1.5 && t < hh - 0.5 ? PC2 : t >= hh - 0.5 ? H2 : t < 2 ? H4 : H3), 0.06, 96),
      lo: H5, hi: H0, k: 1,
      t: (a, b) => (a < rim || b < rim || b > W - rim || a > bowAt ? H1 : 0)
    });
    // soldiers: a green helmet (2 × 2 with its light side), the face below, shoulders
    const SOL = ['hg', 'hg', 'fk', 'oo'], map = { h: C('#5a8662'), g: C('#448549'), f: C('#bc845c'), k: C('#875f47'), o: C('#4f4f34') };
    for (const [a, b] of [[5.6, 1.8], [6, 3.9], [8.1, 1.8], [8.5, 3.9], [10.6, 1.8], [11, 3.9]]) {
      const [x, y] = P(a, b), [px, py] = iso.at(x, y, fz + 0.5);
      iso.stamp(px, py, SOL, map, 1);
    }
    // mast on the wheelhouse, flag on top
    const [mx, my] = P(2.5, 2.3);
    const [qx, qy] = iso.at(mx, my, hh + 7);
    iso.stamp(qx, qy, ['p', 'p'], { p: K.pole }, 1, false);
    flag(iso, mx, my, hh + 9);
    p.finish();
    foam(p, 'r');
    const q = p.trim();
    q.ax = Math.round(q.w / 2); q.ay = q.h - 2;
    return q;
  }

  G.PixArt = { city, factory, boat, foam, wear, stage, block, tower, hall, chimney, tank, crate, lamp, road, K, flag, house, tree, windows, bricks, tiles };
})();
