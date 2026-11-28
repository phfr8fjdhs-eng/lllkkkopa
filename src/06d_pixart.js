// The pictures of the pixel style (plan «Pixel-Stil», doku/stil.md), built with the shapes of
// src/06c_pixel.js. Each builder returns a finished Pix with its anchor (ax, ay): bottom middle
// for buildings, the water line for ships.
(function () {
  'use strict';
  const G = globalThis.G, X = G.Pixel, C = X.C, hash = X.hash;
  const PC1 = X.PC1, PC2 = X.PC2, PC3 = X.PC3, PC4 = X.PC4;

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
    if (hash(px >> 1, py, 17) < 0.008) return K.dt0;            // bare earth, rare (before 2.5 %: read as noise)
    return h < 0.12 ? K.gr2 : h > 0.97 ? K.gr0 : K.gr1;
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
  const MSIZE = [8, 10, 12, 15, 19];                        // military buildings: smaller plates, fuller
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

  // ---------------------------------------------------------------- shared military pieces
  const CON = { l: wear(C('#898d95'), 0.06, 101), r: wear(C('#6c707e'), 0.06, 102), t: wear(C('#a4acb1'), 0.08, 103), hi: C('#b1bdd0'), lo: C('#5b5f6c'), lo2: C('#4f515e'), k: 1 };
  const OLIVE = [C('#787146'), C('#4f4f34'), C('#344c1b')];   // vehicles: lit, shaded, dark
  const MISSILE = [C('#cbd0d3'), C('#a4acb1'), C('#7f8a95')];
  // Concrete box with a 1 pixel player colour stripe under the roof edge.
  function concrete(iso, x, y, z, a, b, h, o) {
    o = o || {};
    const band = (f) => (s, t, px, py) => (t >= h - 1.5 && t < h - 0.5 && o.stripe !== false ? PC2 : f(s, t, px, py));
    const slit = (f) => (s, t, px, py) => (o.slit && t > h - 4 && t < h - 2.5 && s > a * 0.25 && s < a * 0.75 ? C('#20283a') : f(s, t, px, py));
    iso.box(x, y, z, a, b, h, { l: slit(band(CON.l)), r: band(CON.r), t: o.top || CON.t, hi: CON.hi, lo: CON.lo, lo2: CON.lo2, k: 1 });
  }
  // Sandbags: a low wall of bags, 2 pixel courses, staggered, dark seams.
  const BAG = [C('#c4a76a'), C('#aa9976'), C('#8f7b73'), C('#6f5036')];
  function bags(iso, x, y, z, a, b, h) {
    const tex = (c0, c1) => (s, t, px, py) => {
      const row = Math.floor(t);
      if ((px + (row % 2) * 2) % 4 === 0) return c1;
      return hash(px >> 2, row, 111) < 0.2 ? X.darker(c0) : c0;
    };
    iso.box(x, y, z, a, b, h, { l: tex(BAG[1], BAG[2]), r: tex(BAG[2], BAG[3]), t: wear(BAG[0], 0.15, 112), hi: C('#dbc67a'), k: 2 });
  }
  // A machine gun on its tripod (stamp), barrel to the upper right.
  function mg(iso, x, y, z) {
    const [px, py] = iso.at(x, y, z);
    iso.stamp(px, py, ['....bb', '..abb.', '.aaa..', '.c.c..', 'c...c.'], { a: C('#3d4552'), b: C('#2c303d'), c: C('#5b626e') }, 1);
  }
  // A missile lying at a slant (launcher rails): body light grey, tip in player colour.
  // dx, dy: screen direction per step, n steps long.
  function missile(iso, px, py, n, dx, dy) {
    iso.p.obj(1);
    for (let i = 0; i < n; i++) {
      const x = Math.round(px + dx * i), y = Math.round(py + dy * i);
      iso.p.put(x, y, i >= n - 2 ? (i === n - 1 ? PC1 : PC2) : MISSILE[i % 3 === 0 ? 1 : 0]);
      iso.p.put(x, y + 1, i >= n - 2 ? PC3 : MISSILE[2]);
    }
  }
  // A radar dish on its post, tilted up; frame 0–3 turns it about the post (0 open towards the
  // viewer, 1 and 3 half turned, 2 seen from behind). r: radius in pixels. (x, y, z): foot of the post.
  // A real bowl, as on the radar ship of the sheet: in the player colour, a thick rim lit along
  // its upper edge, the hollow inside dark at the top and lit at the bottom (light from the upper
  // left falls into a hollow from the other side), the lip's thickness below, a feed horn held by
  // two struts in front of it, a yoke under it. Seen from behind: the round back, lit on the upper
  // left, with ribs and a hub. (28.11.2026; before a flat grey disc on a stick, which read as a
  // lollipop or a street lamp.)
  function dish(iso, x, y, z, r, frame) {
    const [cx, cy] = iso.at(x, y, z), f = frame || 0;
    const w = [1, 0.5, 0.85, 0.5][f], back = f === 2, sx = [0, 1, 0, -1][f];
    const p = iso.p;
    p.obj(1);
    const oy = cy - 2 - Math.round(r * 0.75);                                      // centre of the bowl
    // the post, 2 pixels, and the yoke the bowl hangs in
    for (let i = 0; i < cy - oy; i++) { p.put(cx, cy - i, K.st3); p.put(cx + 1, cy - i, K.st4); }
    for (let i = -1; i <= 2; i++) p.put(cx + i, oy + Math.round(r * 0.45), i < 1 ? K.st2 : K.st4);
    p.obj(1);
    const rx = Math.max(1.6, r * w * 1.1), ry = back ? r * 0.72 : r * 0.5, ox = cx + sx + 0.5;   // open side tilted up to the sky: a flat oval
    const lip = [];
    for (let py = -Math.ceil(ry); py <= Math.ceil(ry); py++) for (let px = -Math.ceil(rx); px <= Math.ceil(rx); px++) {
      const e = (px * px) / (rx * rx) + (py * py) / (ry * ry);
      if (e > 1.0) continue;
      let c;
      if (back) {
        const l = (-px / rx - py / ry);                                          // convex: lit on the upper left
        c = e > 0.72 ? (py < 0 ? PC2 : PC3) : l > 0.5 ? PC1 : l > -0.3 ? PC2 : PC3;
        if ((px === 0 || py === 0) && e < 0.72 && e > 0.08) c = PC4;             // ribs
        if (e <= 0.08) c = K.st3;                                                 // hub
      } else if (e > 0.55) {
        c = py < 0 ? PC1 : (py > ry * 0.5 ? PC3 : PC2);                          // the rim
        if (sx && px * sx < 0) c = PC3;                                           // the far edge when turned
      } else {
        const l = (px * 0.3 + py) / ry;                                           // hollow: lit low, dark high
        c = l > 0.35 ? PC2 : l > -0.15 ? PC3 : PC4;
      }
      p.put(Math.floor(ox + px), Math.floor(oy + py), c);
      if (py > 0 && e > 0.55) lip.push(Math.floor(ox + px), Math.floor(oy + py) + 1, Math.floor(ox + px), Math.floor(oy + py) + 2);
    }
    // the lip: the underside of the bowl below its front edge, 2 pixels, darkest at the bottom
    for (let i = 0; i < lip.length; i += 2) if (!p.get(lip[i], lip[i + 1]) || p.idAt(lip[i], lip[i + 1]) !== p.cur) p.put(lip[i], lip[i + 1], i % 4 ? PC4 : PC3);
    if (!back) {
      // feed horn in front of the hollow, two struts from the lower rim
      p.obj(1, false);
      const hx = Math.floor(ox + sx * 1.5), hy = oy;
      for (const side of [-1, 1]) {
        const fx = Math.floor(ox + side * rx * 0.7), fy = Math.floor(oy + ry * 0.6);
        const n = Math.max(Math.abs(fx - hx), Math.abs(fy - hy), 1);
        for (let i = 1; i < n; i++) p.put(Math.round(fx + (hx - fx) * i / n), Math.round(fy + (hy - fy) * i / n), K.st1);
      }
      p.put(hx, hy, K.st5); p.put(hx, hy - 1, K.st2);
    }
  }
  // A lattice mast: two legs, cross braces, h pixels high, from the world point (x, y, z).
  function lattice(iso, x, y, z, h, w) {
    const [cx, cy] = iso.at(x, y, z);
    iso.p.obj(1);
    w = w || 2;
    for (let i = 0; i <= h; i++) {
      const half = Math.round(w * (1 - i / h * 0.6));
      iso.p.put(cx - half, cy - i, K.st3); iso.p.put(cx + half, cy - i, K.st4);
      if (i % 4 === 0) for (let k = -half; k <= half; k++) iso.p.put(cx + k, cy - i, K.st2);
      else if (half > 0) iso.p.put(cx + ((i % 4 < 2) ? -1 : 1) * Math.min(half - 1, 1), cy - i, K.st2);
    }
    return [cx, cy - h];
  }
  // A truck (launcher, radar): cab and bed along x, olive.
  function truck(iso, x, y, z, len) {
    iso.box(x, y, z + 0.6, len, 2.4, 2.2, { l: OLIVE[0], r: OLIVE[1], t: OLIVE[0], hi: C('#85885d'), lo: OLIVE[2], k: 1 });
    iso.box(x + len - 1.7, y + 0.2, z + 2.8, 1.7, 2, 2.4, { l: (s, t) => (t > 0.8 ? K.gl3 : OLIVE[0]), r: (s, t) => (t > 0.8 ? K.gl4 : OLIVE[1]), t: OLIVE[0], hi: C('#85885d'), k: 1 });
    for (const wx of [0.6, len / 2, len - 1]) { const [px, py] = iso.at(x + wx, y + 2.4, z + 0.6); iso.stamp(px, py + 1, ['dd', 'dd'], { d: C('#20283a') }, 1); }
  }

  // ---------------------------------------------------------------- port
  function container(iso, x, y, z, ci, along) {
    const c = K.cnt[ci % 5], d = X.darker(c), dd = X.darker(d);
    const rib = (c0, c1) => (s, t, px, py) => ((px & 1) ? c0 : c1);
    if (along === 'y') iso.box(x, y, z, 1.2, 2.6, 1.6, { l: c, r: rib(d, dd), t: X.lighter(c), hi: X.lighter(X.lighter(c)), k: 1 });
    else iso.box(x, y, z, 2.6, 1.2, 1.6, { l: rib(c, d), r: d, t: X.lighter(c), hi: X.lighter(X.lighter(c)), k: 1 });
  }
  // A harbour crane: four legs, the machine house on top, the boom out over the water (+x).
  function crane(iso, x, y, z, h, boom) {
    const leg = { l: C('#cc8738'), r: C('#934e1a'), t: C('#cc8738'), k: 2 };
    for (const [dx, dy] of [[0, 0], [1.6, 0], [0, 1.6], [1.6, 1.6]]) iso.box(x + dx, y + dy, z, 0.4, 0.4, h, leg);
    iso.box(x - 0.2, y - 0.2, z + h, 2.4, 2.4, 2.5, { l: (s, t) => (t > 0.8 && t < 1.8 && s > 0.6 && s < 1.6 ? K.gl3 : C('#cc8738')), r: C('#934e1a'), t: C('#c38a4e'), hi: C('#dbc67a'), k: 2 });
    iso.box(x + 2.2, y + 0.7, z + h + 1.2, boom, 0.8, 0.8, { l: (s) => (Math.floor(s * 2) % 2 ? C('#cc8738') : C('#934e1a')), r: C('#934e1a'), t: C('#cc8738'), k: 2 });
    iso.line([x + 1, y + 1, z + h + 2.5], [x + 1, y + 1, z + h + 5], K.st4, 1, false);
    iso.line([x + 1, y + 1, z + h + 5], [x + 2.2 + boom, y + 1, z + h + 2], K.st3, 1, false);
    iso.line([x + 1.6 + boom, y + 1.1, z + h + 1.2], [x + 1.6 + boom, y + 1.1, z + 1], K.st4, 1, false);   // hook rope
  }
  function warehouse(iso, x, y, z, a, b, h) {
    const door = (s, t) => (s > a / 2 - 1 && s < a / 2 + 1 && t < h - 1.5 ? (Math.floor(t) % 2 ? C('#5b626e') : C('#747c89')) : null);
    iso.box(x, y, z, a, b, h, { l: wear((s, t, px, py) => door(s, t) || (px % 3 === 0 ? C('#7d6e64') : C('#8f7b73')), 0.05, 121), r: (s, t, px) => (px % 3 === 0 ? C('#6d6b7b') : C('#6f6a6b')), t: null, lo: C('#59342f'), k: 2 });
    iso.gable(x - 0.3, y - 0.3, z + h, a + 0.6, b + 0.6, 2.5, 'x', { f: wear((s, v, px) => (px % 2 ? C('#747c89') : C('#898d95')), 0.06, 122), g: C('#5b626e'), e: C('#6f6a6b'), ridge: C('#a4acb1'), ov: 0.3, k: 1 });
  }
  // The pier: planks across, posts at the corners, out over the water along +x.
  function pier(iso, x, y, z, len, w) {
    iso.p.obj(2);
    iso.face([x, y, z], [len, 0, 0], [0, w, 0], false, (u, v, px, py) => (Math.floor(u * len * 2) % 2 ? K.wd0 : (hash(px, py, 131) < 0.15 ? K.wd1 : C('#875f47'))));
    iso.face([x, y + w, z], [len, 0, 0], [0, 0, -0.8], false, () => K.wd1);
    iso.face([x + len, y, z], [0, w, 0], [0, 0, -0.8], false, () => C('#59342f'));
    for (let i = 1; i <= len; i += 2) { const [px, py] = iso.at(x + i, y + w, z - 0.8); iso.stamp(px, py + 2, ['d', 'd'], { d: C('#2e2118') }, 2); }
  }
  // Port pictures: the land part is the plate; quay, piers, cranes reach out to +x (the water).
  function port(st) {
    const n = SIZE[st], iso = canvas(n + 4, 56), g = new Set([plate(iso, n, st >= 2 ? 'pave' : 'grass')]);
    const z = 2;
    const quay = (s, t) => iso.box(n - 1, 0, 0, 1, n, 2, { l: K.st3, r: (ss, tt, px) => ((px + Math.floor(tt)) % 4 === 0 ? K.st4 : K.st3), t: K.st1, hi: K.st0, lo: K.st5, k: 1 });
    if (st === 0) {
      pier(iso, n - 1, 3, 1.4, 5, 2);
      crate(iso, 2, 3, z); crate(iso, 3.7, 3.5, z, [C('#875f47'), K.wd1]);
      flag(iso, 5, 2, z);
    } else if (st === 1) {
      quay();
      warehouse(iso, 1, 1, z, 5, 4, 6);
      pier(iso, n, 6, 1.4, 5, 2);
      crate(iso, 2, 7, z); crate(iso, 3.7, 7.5, z); crate(iso, 6, 8, z, [K.cnt[3], C('#934e1a')]);
      flag(iso, 3.5, 3, z + 8.5);
    } else if (st === 2) {
      quay();
      warehouse(iso, 1, 1, z, 6, 4, 6);
      crane(iso, 9, 3, z, 9, 5);
      container(iso, 2, 7.5, z, 0); container(iso, 2, 9, z, 2); container(iso, 5, 8, z, 4, 'y');
      pier(iso, n, 9, 1.4, 4, 2);
      flag(iso, 4, 3, z + 8.5);
    } else if (st === 3) {
      quay();
      warehouse(iso, 1, 1, z, 7, 4, 7);
      crane(iso, 13, 2, z, 10, 5); crane(iso, 13, 9, z, 10, 5);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) container(iso, 2 + i * 3, 8 + j * 1.4, z, i + j * 2);
      for (let i = 0; i < 2; i++) container(iso, 2 + i * 3, 8, z + 1.6, i + 3);
      container(iso, 3, 13, z, 1); container(iso, 6, 13, z, 3);
      flag(iso, 5, 3, z + 10);
    } else {
      quay();
      warehouse(iso, 1, 1, z, 8, 5, 7); warehouse(iso, 1, 7.5, z, 6, 4, 6);
      crane(iso, 19, 2, z, 12, 6); crane(iso, 19, 9, z, 12, 6); crane(iso, 19, 16, z, 12, 6);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) container(iso, 9 + i * 3, 3 + j * 1.4, z, i + j);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) container(iso, 9 + i * 3, 3 + j * 1.4, z + 1.6, i + j + 2);
      for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) container(iso, 3 + i * 3, 14 + j * 1.4, z, i * 2 + j);
      for (let i = 0; i < 3; i++) container(iso, 3 + i * 3, 14, z + 1.6, i + 1);
      flag(iso, 5, 3, z + 10);
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- defence post
  function wire(iso, n, z, from) {
    iso.p.obj(1, false);
    for (let i = 0; i <= n - from * 2; i += 0.5) {
      for (const [x, y] of [[from + i, n - from], [n - from, from + i]]) {
        const [px, py] = iso.at(x, y, z + 1.5);
        iso.p.put(px, py + ((Math.round(i * 2) % 2) ? -1 : 0), (Math.round(i * 2) % 3 === 0) ? K.st0 : K.st3);
      }
    }
    for (let i = 0; i <= n - from * 2; i += 3) for (const [x, y] of [[from + i, n - from], [n - from, from + i]]) iso.line([x, y, z], [x, y, z + 2], K.wd1, 2, false);
  }
  function defense(st) {
    const n = MSIZE[st], iso = canvas(n, 56), g = new Set([plate(iso, n, 'grass')]);
    const z = 2, c = n / 2;
    if (st === 0) {
      const r = 3;
      bags(iso, c - r, c - r, z, 2 * r, 1, 2); bags(iso, c - r, c - r + 1, z, 1, 2 * r - 1, 2);
      mg(iso, c, c, z + 1);
      bags(iso, c + r - 1, c - r + 1, z, 1, 2 * r - 1, 2); bags(iso, c - r + 1, c + r - 1, z, 2 * r - 2, 1, 2);
      iso.p.obj(1, false); const [px, py] = iso.at(c - r + 0.5, c - r + 0.5, z + 2); iso.p.put(px, py, PC2); iso.p.put(px + 1, py, PC2);
    } else {
      const big = st >= 4;
      if (st >= 2) wire(iso, n, z, 0.6);
      if (big) {                                           // fortress: wall, two towers, the bunker inside
        concrete(iso, 2, 2, z, n - 4, 1.2, 5, { stripe: false }); concrete(iso, 2, 3.2, z, 1.2, n - 5.2, 5, { stripe: false });
      }
      const a = big ? 7 : st === 1 ? 5.5 : 6.5, b = big ? 6 : st === 1 ? 4.5 : 5.5, h = big ? 8 : 7, x = c - a / 2, y = c - b / 2;
      concrete(iso, x, y, z, a, b, h, { slit: true });
      if (st >= 3) {                                        // gun turret on the roof
        iso.cyl(x + a / 2, y + b / 2, z + h, 1.6, 2.5, { ramp: [C('#898d95'), C('#747c89'), C('#5b626e'), C('#3d4552')], top: PC2, rim: PC1, k: 1 });
        iso.line([x + a / 2 + 1, y + b / 2 - 0.5, z + h + 2], [x + a / 2 + 4.5, y + b / 2 - 0.5, z + h + 2.6], C('#2c303d'), 1);
      }
      if (st === 1) bags(iso, x - 1.6, y + b + 0.4, z, 3, 1, 2);
      if (big) {
        for (const [tx, ty] of [[1.2, 1.2], [n - 4.4, 1.2], [1.2, n - 4.4]]) {
          concrete(iso, tx, ty, z, 3.2, 3.2, 11);
          for (let i = 0; i < 3; i++) iso.box(tx + i * 1.1, ty + 2.4, z + 11, 0.8, 0.8, 1.2, { l: CON.l, r: CON.r, t: PC2, k: 1 });
        }
        concrete(iso, n - 2.2 - 1.2, 3.2, z, 1.2, n - 7.6, 5, { stripe: false }); concrete(iso, 3.2, n - 3.4, z, n - 7.6, 1.2, 5, { stripe: false });
        concrete(iso, n - 4.4, n - 4.4, z, 3.2, 3.2, 11);
      }
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- air defence (SAM class 0)
  // A launcher truck with its ramp raised to the upper right, 2 missiles (4 from picture B).
  function launcher(iso, x, y, z, two) {
    truck(iso, x, y, z, 6);
    iso.box(x + 0.6, y + 0.5, z + 2.8, 3.2, 1.4, 1, { l: K.st3, r: K.st4, t: K.st2, k: 1 });
    const [px, py] = iso.at(x + 0.9, y + 1, z + 3.8);
    for (let i = 0; i < (two ? 4 : 2); i++) missile(iso, px + (i % 2) * 3 - (i > 1 ? 1 : 0), py - (i > 1 ? 2 : 0) + (i % 2), 10, 1, -0.8);
  }
  function sam0(st, frame) {
    const n = MSIZE[st], iso = canvas(n, 56), g = new Set([plate(iso, n, 'grass')]);
    const z = 2;
    const pad = (x, y, a, b) => { iso.p.obj(1, false); iso.face([x, y, z], [a, 0, 0], [0, b, 0], false, wear(C('#797c86'), 0.1, 141)); g.add(iso.p.cur); };
    pad(1, 1, n - 2, n - 2);
    if (st === 0) launcher(iso, 1, 2.5, z, false);
    else if (st === 1) launcher(iso, 1.5, 3.5, z, true);
    else if (st === 2) { dish(iso, 2.5, 2.5, z, 4, frame); launcher(iso, 3, 6, z, true); }
    else if (st === 3) { truck(iso, 1.5, 1.5, z, 5); dish(iso, 3.5, 2.5, z + 4.6, 5, frame); launcher(iso, 8, 2.5, z, true); launcher(iso, 2.5, 9, z, true); }
    else { truck(iso, 1.5, 1.5, z, 5); dish(iso, 3.5, 2.5, z + 4.6, 5, frame); launcher(iso, 10.5, 2, z, true); launcher(iso, 2, 10.5, z, true); launcher(iso, 10.5, 11, z, true); }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- missile defence (SAM class 1)
  // A launcher: a block of upright canisters (round tubes, 3 pixels wide, a gap between) on a
  // concrete base, the caps in the player colour, a dark steel frame round the block.
  // (28.11.2026; before thin white sticks in a row between two lines, which read as a garden fence.)
  function rack(iso, x, y, z, k) {
    concrete(iso, x - 0.5, y - 0.5, z, 2 + k * 1.6, 3.2, 1.5, { stripe: false });
    const TUBE = ['aabc', 'aabc', 'abbc', 'abbc', 'abbc', 'abbc', 'abbc', 'abbc', 'abcc', 'dddd'];
    const cap = ['.ef.', 'efgg'];
    for (let i = k - 1; i >= 0; i--) {                     // back to front along x: later ones in front
      const [px, py] = iso.at(x + 0.5 + i * 1.6, y + 1.4, z + 1.5);
      iso.stamp(px - 1, py, cap.concat(TUBE), { a: MISSILE[0], b: MISSILE[1], c: MISSILE[2], d: K.st4, e: PC1, f: PC2, g: PC3 }, 1);
    }
    // the frame: two posts and a beam over the caps
    const top = z + 1.5 + TUBE.length + 2;
    iso.line([x - 0.2, y + 1.4, z + 1.5], [x - 0.2, y + 1.4, top], K.st4, 1, false);
    iso.line([x + 0.8 + k * 1.6, y + 1.4, z + 1.5], [x + 0.8 + k * 1.6, y + 1.4, top], K.st5, 1, false);
    iso.line([x - 0.2, y + 1.4, top], [x + 0.8 + k * 1.6, y + 1.4, top], K.st3, 1, false);
  }
  // The fire-control radar: a flat panel leaning back on a trailer, held by two struts from
  // behind, its frame in the player colour. (Before the panel hung in the air over a thin sill.)
  function panel(iso, x, y, z, w, h) {
    truck(iso, x - 0.3, y + 0.2, z, w + 0.6);
    const base = z + 2.8;
    iso.line([x + 0.6, y + 0.3, base], [x + 0.6, y + 0.3, base + h * 0.7], K.st4, 1);
    iso.line([x + w - 0.6, y + 0.3, base], [x + w - 0.6, y + 0.3, base + h * 0.7], K.st5, 1);
    iso.p.obj(1);
    iso.face([x, y + 2, base], [w, 0, 0], [0, -1.4, h], false, (u, v, px, py) => (u < 0.08 || u > 0.92 || v < 0.08 || v > 0.92 ? (v > 0.5 ? PC1 : PC2) : (v > 0.66 ? ((px + py) % 2 ? C('#516980') : C('#607e93')) : (px + py) % 2 ? C('#45576a') : C('#516980'))));
  }
  function sam1(st) {
    const n = MSIZE[st], iso = canvas(n, 64), g = new Set([plate(iso, n, 'concrete')]);
    const z = 2;
    if (st === 0) rack(iso, 2.5, 3, z, 2);
    else if (st === 1) rack(iso, 2, 3.5, z, 4);
    else if (st === 2) { concrete(iso, 7, 1.5, z, 4, 3, 5); rack(iso, 2, 5.5, z, 4); }
    else if (st === 3) { panel(iso, 9, 1.5, z, 5, 9); concrete(iso, 2, 1.5, z, 4, 3, 5); rack(iso, 3, 8.5, z, 4); }
    else { panel(iso, 11, 1.5, z, 7, 13); concrete(iso, 2, 1.5, z, 5, 4, 6); rack(iso, 2.5, 9, z, 4); rack(iso, 10, 12.5, z, 4); }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- radar (SAM class 2)
  const DOME = [PC1, PC2, PC3, PC4];
  function radar(st, frame) {
    const n = MSIZE[st], iso = canvas(n, 64), g = new Set([plate(iso, n, 'grass')]);
    const z = 2, f = frame || 0;
    const mast = (x, y, h, r) => { const [tx, ty] = lattice(iso, x, y, z, h, 2); dish(iso, x, y, z + h, r, f); return [tx, ty]; };
    if (st === 0) { concrete(iso, 1.5, 4.5, z, 3, 2.5, 4, {}); mast(5.5, 3, 14, 4); }
    else if (st === 1) { concrete(iso, 1.5, 5.5, z, 3.5, 3, 4, {}); mast(6.5, 3, 16, 6); }
    else if (st === 2) { iso.ball(3.5, 4, z + 5, 5, DOME, PC1, 1); mast(8.5, 3, 17, 6); concrete(iso, 3, 8.5, z, 4, 2.5, 4, {}); }
    // D and E: masts on the left and right corners, never in front of the dome or the hall
    // (before, a mast stood on the front edge and ran straight through the building)
    else if (st === 3) { iso.ball(4.5, 4.5, z + 6, 6, DOME, PC1, 1); mast(11.5, 2.5, 18, 6); concrete(iso, 2.5, 10.5, z, 5, 3, 4, {}); }
    else {
      iso.ball(3.5, 3, z + 4, 4, DOME, PC1, 1);
      mast(16, 2.5, 20, 6);
      concrete(iso, 5.5, 5.5, z, 8, 8, 5, {});
      iso.ball(9.5, 9.5, z + 5 + 7, 8, DOME, PC1, 1, true, 5.5);
      mast(2.5, 16, 15, 5);
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- airfield (SILO class 1)
  function runway(iso, x, y, z, len, w) {
    iso.p.obj(1, false);
    iso.face([x, y, z], [len, 0, 0], [0, w, 0], false, (u, v, px, py) => {
      const s = u * len, t = v * w;
      if (t < 0.4 || t > w - 0.4) return C('#5b5f6c');
      if (Math.abs(t - w / 2) < 0.25 && Math.floor(s) % 2 === 0) return C('#cbd0d3');
      if ((s < 1.2 || s > len - 1.2) && Math.floor(t * 2) % 2 === 0) return C('#a4acb1');   // threshold stripes
      return hash(px, py, 151) < 0.06 ? C('#3d4552') : C('#4f515e');
    });
    return iso.p.cur;
  }
  // A hangar: arched roof (light on the left of its crest), the door at the front in steel, a
  // player colour stripe above the door.
  function hangar(iso, x, y, z, a, b, h) {
    iso.box(x, y, z, a, b, h, { l: (s, t) => (t >= h - 1 ? PC2 : s > 0.4 && s < a - 0.4 && t < h - 1 ? (Math.floor(t) % 2 ? C('#5b626e') : C('#6c707e')) : C('#7f8a95')), r: C('#5b5f6c'), t: null, lo: C('#3d4552'), k: 1 });
    iso.gable(x, y - 0.1, z + h, a, b + 0.1, 2.5, 'y', { f: (s, v, px) => (px % 2 ? C('#747c89') : C('#898d95')), g: C('#898d95'), e: C('#7f8a95'), ridge: C('#a4acb1'), k: 1 });
  }
  function ctower(iso2, x, y, z, h) {
    concrete(iso2, x, y, z, 1.6, 1.6, h, { stripe: false });
    iso2.box(x - 0.4, y - 0.4, z + h, 2.4, 2.4, 2.2, { l: (s, t) => (t > 0.5 && t < 1.8 ? K.gl2 : C('#a4acb1')), r: (s, t) => (t > 0.5 && t < 1.8 ? K.gl4 : C('#7f8a95')), t: PC2, hi: PC1, k: 1 });
  }
  // A parked jet seen from above at the slant, nose to the upper right along the apron: drawn
  // from a few flat parts (fuselage, swept wings, tailplanes), light grey with a darker lower right
  // edge, dark canopy, the fin standing up in the player colour. About 13 × 9 pixels.
  // (28.11.2026; before a 6 × 7 stamp that read as a grey smudge.)
  const JETP = [
    { c: C('#a4acb1'), poly: [[7, 0], [5, -0.9], [-6, -0.9], [-6, 0.9], [5, 0.9]] },
    { c: C('#a4acb1'), poly: [[2, -0.8], [-3, -5], [-4.2, -5], [-3, -0.8]] },
    { c: C('#a4acb1'), poly: [[2, 0.8], [-3, 5], [-4.2, 5], [-3, 0.8]] },
    { c: C('#a4acb1'), poly: [[-4.5, -0.8], [-6.2, -2.6], [-7, -2.6], [-6.5, -0.8]] },
    { c: C('#a4acb1'), poly: [[-4.5, 0.8], [-6.2, 2.6], [-7, 2.6], [-6.5, 0.8]] },
    { c: K.gl3, poly: [[5, 0], [4, -0.6], [2.4, -0.6], [2.4, 0.6], [4, 0.6]] }
  ];
  function inPoly(x, y, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function jet(iso, x, y, z) {
    const [cx, cy] = iso.at(x, y, z), p = iso.p;
    const ang = Math.atan2(-1, 2), ca = Math.cos(ang), sa = Math.sin(ang);
    p.obj(1);
    const hit = (px, py) => {
      const X0 = px + 0.5 - cx, Y0 = (py + 0.5 - cy) / 0.8;
      const lx = X0 * ca + Y0 * sa, ly = -X0 * sa + Y0 * ca;
      for (let i = JETP.length - 1; i >= 0; i--) if (inPoly(lx, ly, JETP[i].poly)) return i;
      return -1;
    };
    for (let py = cy - 7; py <= cy + 7; py++) for (let px = cx - 9; px <= cx + 9; px++) {
      const i = hit(px, py);
      if (i < 0) continue;
      let c = JETP[i].c;
      if (i !== 5 && hit(px + 1, py + 1) < 0) c = C('#7f8a95');                   // the edge away from the light
      p.put(px, py, c);
    }
    // the fin on the tail, 3 pixels up, in the player colour
    p.obj(1);
    const tx = Math.round(cx - 5.5 * ca), ty = Math.round(cy - 5.5 * sa * 0.8);
    p.put(tx, ty - 1, PC2); p.put(tx, ty - 2, PC1); p.put(tx + 1, ty - 1, PC3); p.put(tx + 1, ty - 2, PC2);
  }
  // The apron: grey concrete between the hangars and the runway, with painted parking marks.
  function apron(iso, x, y, z, a, b) {
    iso.p.obj(1, false);
    iso.face([x, y, z], [a, 0, 0], [0, b, 0], false, wear((u, v, px, py) => {
      const s = u * a, t = v * b;
      if (t > b - 0.5 && Math.floor(s * 2) % 2 === 0) return C('#a49e50');           // taxi line to the runway
      return (Math.floor(s) % 5 === 0 && (px & 1)) ? K.as1 : K.as0;            // dark, so the light jets stand out
    }, 0.05, 152));
    return iso.p.cur;
  }
  function airfield(st) {
    const n = SIZE[st], iso = canvas(n, 48), g = new Set([plate(iso, n, 'grass')]);
    const z = 2, len = st >= 3 ? n - 1 : n - 2;
    g.add(runway(iso, 0.5, n - 4, z, len, 3));
    // the apron reaches under the hangars, so they stand on it and cast their shadow there
    // (before they stood on bare grass far from the runway, and the plate looked empty)
    g.add(apron(iso, 1, 1, z, len - 0.5, n - 5.6));
    if (st === 0) { hangar(iso, 2, 1.5, z, 3, 4, 3); jet(iso, 5.5, 6.2, z); }
    else if (st === 1) { hangar(iso, 2, 1.5, z, 3, 4, 3); ctower(iso, 7, 2, z, 6); jet(iso, 4.5, 7.6, z); }
    else if (st === 2) { hangar(iso, 1.5, 1.5, z, 3, 4, 3); hangar(iso, 5.5, 1.5, z, 3, 4, 3); ctower(iso, 10.5, 2, z, 7); jet(iso, 4, 8.6, z); jet(iso, 9, 8.6, z); }
    else if (st === 3) { hangar(iso, 1.5, 1.5, z, 3.5, 5, 3.5); hangar(iso, 6, 1.5, z, 3.5, 5, 3.5); ctower(iso, 13, 3, z, 8); jet(iso, 3.5, 10.4, z); jet(iso, 8.5, 10.4, z); jet(iso, 13.5, 10.4, z); }
    else { for (let i = 0; i < 3; i++) hangar(iso, 1.5 + i * 5, 1.5, z, 4, 6, 4); ctower(iso, 18, 3, z, 9); for (let i = 0; i < 4; i++) jet(iso, 3.5 + i * 5, 14, z); }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- cloaking tower (A, B only)
  function cloak(st) {
    st = Math.min(st, 1);
    const n = MSIZE[st], iso = canvas(n, 64), g = new Set([plate(iso, n, 'grass')]);
    const z = 2, c = n / 2, h = st ? 24 : 16;
    concrete(iso, c - 1.5, c - 1.5, z, 3, 3, 2, { stripe: false });
    const [tx, ty] = lattice(iso, c, c, z + 2, h, 3);
    iso.ball(c, c, z + 2 + h + 1, 2, [PC1, PC2, PC3, PC4], PC1, 1);
    // the net: green speckled cloth hanging from the top in a tent shape
    iso.p.obj(2);
    const NET = [K.gr1, K.gr2, K.gr3, K.gr0, C('#4f4f34')];
    for (let j = 0; j < h; j++) {
      const w = 2 + Math.round(j * 0.55), yy = ty + 3 + j;
      for (let i = -w; i <= w; i++) {
        if (hash(i, j, 161) < 0.18 && Math.abs(i) > 1) continue;                    // holes in the net
        const edge = Math.abs(i) >= w - 0;
        const r = hash(i >> 1, j >> 1, 162);
        iso.p.put(tx + i, yy, edge ? K.gr3 : (i > w * 0.3 ? (r < 0.5 ? K.gr3 : NET[4]) : NET[Math.floor(r * 4)]));
      }
    }
    iso.p.finish({ ground: g });
    return iso.p.trim();
  }

  // ---------------------------------------------------------------- states
  // Under construction: picture A cut to half its height, wooden scaffold and a small crane.
  function building(kind, st, o) {
    o = o || {};
    const F = { city, factory, port, defense, sam0, sam1, radar, airfield, cloak }[kind];
    const p = F(o.build ? 0 : st, o.frame || 0);
    if (o.build) return underConstruction(p);
    if (o.damage) return damaged(p, o.damage);
    return p;
  }
  // The rows of the plate are the bottom 2 n + 4 rows of A's picture; above them the building.
  function underConstruction(p) {
    const w = p.w, h = p.h, d = p.d;
    let top = h;
    for (let y = 0; y < h && top === h; y++) for (let x = 0; x < w; x++) if (d[y * w + x]) { top = y; break; }
    const cut = Math.round(top + (h - 20 - top) * 0.55);
    const q = new X.Pix(w, h); q.ax = p.ax; q.ay = p.ay;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (y < cut) continue;
      q.d[i] = d[i]; q.id[i] = p.id[i]; q.k[i] = p.k[i];
    }
    // cut edge: one dark row (the unfinished top), then the scaffold
    q.obj(2, false);
    for (let x = 0; x < w; x++) if (q.d[cut * w + x] && q.k[cut * w + x] && y0ok(q, x, cut)) q.put(x, cut, X.darker(q.d[cut * w + x]));
    let x0 = w, x1 = 0;
    for (let x = 0; x < w; x++) if (q.d[(cut + 1) * w + x]) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    const P = K.wd1, PL = K.wd0;
    for (let x = x0 + 2; x <= x1 - 2; x += 5) for (let y = cut - 4; y < cut + 9; y++) q.put(x, y, P);
    for (const y of [cut - 4, cut + 2]) for (let x = x0 + 2; x <= x1 - 2; x++) q.put(x, y, PL);
    // small crane: mast and jib
    const cx = x1 - 3;
    for (let y = cut - 14; y < cut + 2; y++) q.put(cx, y, C('#cc8738'));
    for (let x = cx - 9; x <= cx + 3; x++) q.put(x, cut - 14, C('#cc8738'));
    for (let y = cut - 13; y < cut - 9; y++) q.put(cx - 7, y, K.st4);
    // outline for what was added
    const add = [];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (!q.d[y * w + x] && ((x > 0 && q.d[y * w + x - 1] && q.k[y * w + x - 1]) || (x + 1 < w && q.d[y * w + x + 1] && q.k[y * w + x + 1]) || (y > 0 && q.d[(y - 1) * w + x] && q.k[(y - 1) * w + x]) || (y + 1 < h && q.d[(y + 1) * w + x] && q.k[(y + 1) * w + x]))) add.push(x, y);
    q.obj(0, false);
    for (let i = 0; i < add.length; i += 2) q.put(add[i], add[i + 1], K.inkW);
    return q.trim();
  }
  function y0ok() { return true; }
  // Damaged: burnt patches on the building (not the plate), 1–2 smoke columns (see-through grey).
  function damaged(p, n) {
    const w = p.w, h = p.h, q = new X.Pix(w, h + 14);
    q.ax = p.ax; q.ay = p.ay + 14;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x, j = (y + 14) * w + x; q.d[j] = p.d[i]; q.id[j] = p.id[i]; q.k[j] = p.k[i]; }
    const plateBottom = h - 1, char = C('#271e1f');
    let top = h;
    for (let y = 0; y < h && top === h; y++) for (let x = 0; x < w; x++) if (p.d[y * w + x]) { top = y; break; }
    const bodyBottom = h - Math.round(w / 2) + 2;
    for (let y = top; y < bodyBottom; y++) for (let x = 0; x < w; x++) {
      const j = (y + 14) * w + x, v = q.d[j];
      if (!v || !q.k[j] || (v >>> 24) !== 255) continue;
      const r = hash(x >> 1, y >> 1, 171);
      if (r < 0.14) q.d[j] = X.darker(X.darker(v));
      else if (r < 0.19) q.d[j] = char;
    }
    // smoke: a column of puffs rising out of the roof, joined (each overlaps the one below),
    // dark and dense at the bottom, lighter and thinner going up, drifting a little to the right;
    // a few pixels of fire where it leaves the roof. (28.11.2026; before the puffs started above
    // the roof with gaps between them and looked like grey ghosts floating over the building.)
    const SM = [X.pack(61, 69, 82, 225), X.pack(91, 98, 110, 200), X.pack(116, 124, 137, 170), X.pack(137, 141, 149, 130)];
    const FIRE = [C('#d1be6d'), C('#cc8738'), C('#9d303c')];
    const seeds = n > 1 ? [0.35, 0.68] : [0.5];
    for (const f of seeds) {
      const sx = Math.round(w * f);
      let sy = h; for (let y = 0; y < h; y++) if (p.d[y * w + sx] && p.k[y * w + sx]) { sy = y; break; }
      sy += 14 + 1;                                         // into the roof by a pixel
      q.obj(0, false);
      for (let k = 6; k >= 0; k--) {                        // top first, so the denser lower puffs lie over it
        const r = 1.3 + k * 0.42, cx = sx + 0.5 + k * 0.55 + Math.sin(k * 1.7) * 0.6, cy = sy - k * 2.1;
        const tone = Math.min(3, Math.floor(k / 2));
        for (let yy = Math.floor(cy - r); yy <= cy + r; yy++) for (let xx = Math.floor(cx - r); xx <= cx + r; xx++) {
          const dx = xx + 0.5 - cx, dy = yy + 0.5 - cy;
          if (dx * dx + dy * dy > r * r || yy < 0) continue;
          const cur = q.get(xx, yy);
          if (cur && (cur >>> 24) === 255) continue;          // never over the building
          q.put(xx, yy, SM[Math.max(0, Math.min(3, tone + (dx + dy < -0.8 ? 1 : 0)))]);
        }
      }
      q.obj(0, false);
      q.put(sx, sy, FIRE[1]); q.put(sx + 1, sy, FIRE[2]); q.put(sx, sy - 1, FIRE[0]);
      if (n > 1) { q.put(sx - 1, sy, FIRE[1]); q.put(sx + 1, sy - 1, FIRE[1]); }
    }
    void plateBottom;
    return q.trim();
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

  G.PixArt = { city, factory, port, defense, sam0, sam1, radar, airfield, cloak, building, boat, foam, wear, concrete, missile, dish, lattice, jet, JETP, MISSILE, stage, block, tower, hall, chimney, tank, crate, lamp, road, K, flag, house, tree, windows, bricks, tiles };
})();
