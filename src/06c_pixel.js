// Pixel style for «Langes Spiel» (plan «Pixel-Stil», rules in doku/stil.md).
//
// Every picture is pixel art in the style of the reference image (docs/assets/vorbild2.jpg):
// seen from above at a slant, light from the top left, a 1 pixel outline that is never black,
// only the colours measured from the reference (G.PIX_PAL, src/assets/palette.js) plus the
// player colour. The eight ships come cut out of the reference (src/assets/schiffe-sheet.png);
// everything else is built here from a few shapes (boxes, roofs, cylinders, small stamps) on a
// 2 : 1 isometric grid, so it all shares one angle, one light and one pixel size.
//
// Only the page uses this. A picture is built once, on first use, into a plain pixel buffer
// (Pix, no DOM: test/pixel.js builds them all in Node) and from there into a canvas per player
// colour. Nothing here touches the game.
(function () {
  'use strict';
  const G = globalThis.G;

  // ---------------------------------------------------------------- colours
  // Pixels are 32 bit ABGR (the byte order of ImageData on every little endian device).
  function pack(r, g, b, a) { return (((a === undefined ? 255 : a) << 24) | (b << 16) | (g << 8) | r) >>> 0; }
  const PAL = new Map(), LIST = [];
  for (const h of G.PIX_PAL) {
    const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16);
    const v = pack(r, g, b); PAL.set(h, v); LIST.push([v, r, g, b]);
  }
  // A colour by its hex name; throws for anything that is not in the palette.
  function C(h) { const v = PAL.get(h); if (v === undefined) throw new Error('pixel: colour not in palette: ' + h); return v; }
  const R = (v) => v & 255, Gc = (v) => (v >>> 8) & 255, B = (v) => (v >>> 16) & 255, A = (v) => v >>> 24;
  function nearest(r, g, b, not) {
    let best = 0, bd = 1e9;
    for (const [v, pr, pg, pb] of LIST) {
      if (v === not) continue;
      const d = (pr - r) * (pr - r) * 3 + (pg - g) * (pg - g) * 4 + (pb - b) * (pb - b) * 2;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }
  // The next darker palette colour of the same hue: inner edges, contact lines.
  const DARKER = new Map();
  function darker(v) {
    let d = DARKER.get(v);
    if (d === undefined) {
      d = (v >>> 24) !== 255 ? v : nearest(R(v) * 0.74, Gc(v) * 0.74, B(v) * 0.78, v);
      DARKER.set(v, d);
    }
    return d;
  }
  // The next lighter one: 1 pixel wear marks, glints.
  const LIGHTER = new Map();
  function lighter(v) {
    let d = LIGHTER.get(v);
    if (d === undefined) {
      d = (v >>> 24) !== 255 ? v : nearest(Math.min(255, R(v) * 1.13 + 4), Math.min(255, Gc(v) * 1.13 + 4), Math.min(255, B(v) * 1.12 + 4), v);
      LIGHTER.set(v, d);
    }
    return d;
  }
  // Player colour: three placeholders (light, base, shade), replaced when a variant is made.
  const PC1 = pack(1, 0, 0, 254), PC2 = pack(2, 0, 0, 254), PC3 = pack(3, 0, 0, 254), PC4 = pack(4, 0, 0, 254);   // PC4: dark (× 0.4)
  const SHADE = 0.35;
  // The flag: a light grey pole (k its knob) and the 4 × 3 cloth hanging from it in player colour.
  // Column 0 is the pole; the last row stands on the mast top.
  const FLAG = ['k....', 'paabb', 'pabbc', 'pbbcc', 'p....', 'p....', 'p....'];                     // drop shadow: black at 35 %

  // ---------------------------------------------------------------- pixel buffer
  // d: colour, id: which shape put it (for inner contact edges), k: outline class
  // (1 cool: grey, blue, white; 2 warm: red, brown; 0: none, e.g. smoke).
  function Pix(w, h) {
    this.w = w; this.h = h;
    this.d = new Uint32Array(w * h); this.id = new Uint16Array(w * h); this.k = new Uint8Array(w * h);
    this.cur = 0; this.curK = 1; this.edge = true; this.edges = [true];
  }
  // Start a new shape: its pixels get their own id. `edge` false: no contact line where it
  // touches shapes behind it (decals, details that sit on a surface).
  Pix.prototype.obj = function (k, edge) {
    this.cur++; this.curK = k === undefined ? this.curK : k;
    this.edges[this.cur] = edge !== false;
    return this.cur;
  };
  Pix.prototype.put = function (x, y, v) {
    if (!v || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = y * this.w + x;
    this.d[i] = v; this.id[i] = this.cur; this.k[i] = this.curK;
  };
  Pix.prototype.get = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.d[y * this.w + x]; };
  Pix.prototype.idAt = function (x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? 0 : this.id[y * this.w + x]; };

  // Finish a picture: contact lines, drop shadow, outline.
  //  shadow: ids of the ground (base plate) the shadow falls on; casters are all later shapes.
  Pix.prototype.finish = function (o) {
    o = o || {};
    const w = this.w, h = this.h, d = this.d, id = this.id, k = this.k;
    // 1. contact lines: a pixel next to a shape that stands in front of it gets one step darker.
    //    Only above and to the left of the front shape, where the light would make no edge.
    const dk = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, a = id[i];
      if (!d[i] || !a || (o.ground && o.ground.has(a))) continue;
      const q = [x + 1 < w ? i + 1 : -1, y + 1 < h ? i + w : -1];
      for (const j of q) if (j >= 0 && d[j] && id[j] > a && this.edges[id[j]] && !(o.ground && o.ground.has(id[j]))) { dk[i] = 1; break; }
    }
    for (let i = 0; i < w * h; i++) if (dk[i]) d[i] = darker(d[i]);
    // 2. drop shadow onto the ground, 2 pixels to the lower right
    if (o.ground) {
      const sh = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (!d[i] || !o.ground.has(id[i])) continue;
        for (const [dx, dy] of [[-2, -1], [-2, 0]]) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0) continue;
          const j = yy * w + xx;
          if (d[j] && !o.ground.has(id[j]) && id[j] && k[j]) { sh[i] = 1; break; }
        }
      }
      for (let i = 0; i < w * h; i++) if (sh[i]) {
        const v = d[i], f = 1 - SHADE;
        d[i] = pack(Math.round(R(v) * f), Math.round(Gc(v) * f), Math.round(B(v) * f), A(v));
      }
    }
    // 3. outline: 1 pixel around everything, dark blue or dark brown, never black
    const OUT = [0, C('#16273b'), C('#2e2118')];
    const out = new Uint32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (d[i]) continue;
      let cls = 0;
      if (x > 0 && d[i - 1] && k[i - 1]) cls = k[i - 1];
      else if (x + 1 < w && d[i + 1] && k[i + 1]) cls = k[i + 1];
      else if (y > 0 && d[i - w] && k[i - w]) cls = k[i - w];
      else if (y + 1 < h && d[i + w] && k[i + w]) cls = k[i + w];
      if (cls) out[i] = OUT[cls];
    }
    for (let i = 0; i < w * h; i++) if (out[i]) { d[i] = out[i]; k[i] = 0; id[i] = 0; }
    return this;
  };
  // Cut away empty rows and columns; ax, ay (the anchor) move along.
  Pix.prototype.trim = function () {
    const w = this.w, h = this.h, d = this.d;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (d[y * w + x]) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) return this;
    const p = new Pix(x1 - x0 + 1, y1 - y0 + 1);
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const i = y * w + x, j = (y - y0) * p.w + (x - x0);
      p.d[j] = d[i]; p.id[j] = this.id[i]; p.k[j] = this.k[i];
    }
    p.ax = (this.ax || 0) - x0; p.ay = (this.ay || 0) - y0;
    return p;
  };

  // ---------------------------------------------------------------- isometric shapes
  // World: x runs to the lower right, y to the lower left, z up. One step in x or y is
  // 2 pixels across and 1 down (2 : 1 stairs), one step in z is 1 pixel up.
  function Iso(pix, ox, oy) { this.p = pix; this.ox = ox; this.oy = oy; }
  Iso.prototype.sx = function (x, y) { return this.ox + 2 * (x - y); };
  Iso.prototype.sy = function (x, y, z) { return this.oy + x + y - z; };
  Iso.prototype.at = function (x, y, z) { return [Math.round(this.sx(x, y)), Math.round(this.sy(x, y, z || 0))]; };
  // A flat face O + u·U + v·V (u, v in [0, 1), or u + v <= 1 for a triangle), each pixel
  // coloured by tex(u, v, px, py); pixel centres decide, so 2 : 1 edges come out as clean stairs.
  Iso.prototype.face = function (O, U, V, tri, tex) {
    const ax = 2 * (U[0] - U[1]), ay = U[0] + U[1] - U[2], bx = 2 * (V[0] - V[1]), by = V[0] + V[1] - V[2];
    const det = ax * by - ay * bx;
    if (Math.abs(det) < 1e-9) return;
    const x0 = this.sx(O[0], O[1]), y0 = this.sy(O[0], O[1], O[2]);
    const xs = [x0, x0 + ax, x0 + bx, x0 + ax + bx], ys = [y0, y0 + ay, y0 + by, y0 + ay + by];
    const X0 = Math.floor(Math.min(...xs)), X1 = Math.ceil(Math.max(...xs)), Y0 = Math.floor(Math.min(...ys)), Y1 = Math.ceil(Math.max(...ys));
    const e = 1e-7;
    for (let py = Y0; py <= Y1; py++) for (let px = X0; px <= X1; px++) {
      const dx = px + 0.5 - x0, dy = py + 0.5 - y0;
      const u = (dx * by - dy * bx) / det, v = (ax * dy - ay * dx) / det;
      if (u < -e || v < -e || u >= 1 - e || v >= 1 - e || (tri && u + v > 1 + e)) continue;
      const c = typeof tex === 'function' ? tex(Math.max(0, u), Math.max(0, v), px, py) : tex;
      if (c) this.p.put(px, py, c);
    }
  };
  const fn = (f) => typeof f === 'function' ? f : () => f;
  // A box: footprint a × b at (x, y), standing on z, h high. m: material
  //   t (top), l (left wall, lit), r (right wall, shaded): colour or fn(s, t, px, py) with s, t in
  //   world units along the face (s from the back towards the front corner, t up);
  //   hi: 1 pixel rim on the top's front edges; lo: bottom row of the walls; k: outline class.
  Iso.prototype.box = function (x, y, z, a, b, h, m, edge) {
    this.p.obj(m.k, edge);
    const l = fn(m.l), r = fn(m.r), t = fn(m.t);
    if (h > 0) {
      this.face([x, y + b, z], [a, 0, 0], [0, 0, h], false, (u, v, px, py) => (m.lo && v * h < 1 ? m.lo : l(u * a, v * h, px, py)));
      this.face([x + a, y, z], [0, b, 0], [0, 0, h], false, (u, v, px, py) => (m.lo && v * h < 1 ? (m.lo2 || m.lo) : r(u * b, v * h, px, py)));
    }
    if (m.t === null) return;
    const low = m.hi ? new Map() : null;
    this.face([x, y, z + h], [a, 0, 0], [0, b, 0], false, (u, v, px, py) => {
      if (low) { const q = low.get(px); if (q === undefined || py > q) low.set(px, py); }
      return t(u * a, v * b, px, py);
    });
    if (low) for (const [px, py] of low) this.p.put(px, py, m.hi);
  };
  // A box turned to any angle (ship hulls): corner O = [x, y], long edge U and short edge V (world
  // x, y vectors), from z, h high. Only the faces turned towards the viewer are drawn; a side is
  // lit (m.l) when it faces the lower left, shaded (m.r) when it faces the lower right. Textures get
  // (s, t) along the side and up, and which side: 'u+' (the end at O + U), 'u-', 'v+', 'v-'.
  // m.t gets (along U, along V) in world units and may return 0 to leave a hole (a well deck).
  Iso.prototype.obox = function (O, U, V, z, h, m, edge) {
    this.p.obj(m.k, edge);
    const lu = Math.hypot(U[0], U[1]), lv = Math.hypot(V[0], V[1]);
    const P = (a, b) => [O[0] + a * U[0] + b * V[0], O[1] + a * U[1] + b * V[1]];
    const sides = [[P(0, 0), U, lu, [-V[0] / lv, -V[1] / lv], 'v-'], [P(1, 0), V, lv, [U[0] / lu, U[1] / lu], 'u+'],
      [P(0, 1), U, lu, [V[0] / lv, V[1] / lv], 'v+'], [P(0, 0), V, lv, [-U[0] / lu, -U[1] / lu], 'u-']];
    if (h > 0) for (const [S, E, len, n, name] of sides) {
      if (n[0] + n[1] <= 0) continue;
      const f = fn(n[1] > n[0] ? m.l : m.r);
      this.face([S[0], S[1], z], [E[0], E[1], 0], [0, 0, h], false, (u, v, px, py) => (m.lo && v * h < 1 ? m.lo : f(u * len, v * h, name, px, py)));
    }
    if (!m.t) return;
    const t = fn(m.t), low = m.hi ? new Map() : null;
    this.face([O[0], O[1], z + h], [U[0], U[1], 0], [V[0], V[1], 0], false, (u, v, px, py) => {
      const c = t(u * lu, v * lv, px, py);
      if (c && low) { const q = low.get(px); if (q === undefined || py > q) low.set(px, py); }
      return c;
    });
    if (low) for (const [px, py] of low) this.p.put(px, py, m.hi);
  };
  // A pitched roof over a × b on z, ridge rh above the eaves, ridge along 'x' or 'y'.
  //   m: f (slope towards the viewer), g (slope away), e (gable end): colour or fn(s, t);
  //   ridge: colour of the ridge line; verge: the roof's edge above the gable; ov: overhang, the
  //   gable wall sits that far inside the roof's edge; es: its edge in the roof's shadow.
  Iso.prototype.gable = function (x, y, z, a, b, rh, along, m, edge) {
    this.p.obj(m.k, edge);
    const f = fn(m.f), g = fn(m.g), e = fn(m.e), ov = m.ov || 0, zo = ov ? rh * ov / (along === 'x' ? b / 2 : a / 2) : 0;
    if (along === 'x') {
      const hb = b / 2;
      this.face([x, y, z], [a, 0, 0], [0, hb, rh], false, (u, v, px, py) => g(u * a, v, px, py));       // back slope
      this.face([x + a - ov, y + ov, z + zo], [0, b - 2 * ov, 0], [0, hb - ov, rh - zo], true, (u, v, px, py) => (u + v > 1 - 0.12 || v < 0.12 ? (m.es || e(u, v, px, py)) : e(u, v, px, py)));   // gable end, right
      this.face([x, y + b, z], [a, 0, 0], [0, -hb, rh], false, (u, v, px, py) => (m.ridge && v > 1 - 1.2 / Math.max(rh, hb) ? m.ridge : m.verge && u * a > a - 0.5 ? m.verge : f(u * a, v, px, py)));
    } else {
      const ha = a / 2;
      this.face([x, y, z], [0, b, 0], [ha, 0, rh], false, (u, v, px, py) => g(u * b, v, px, py));
      this.face([x + ov, y + b - ov, z + zo], [a - 2 * ov, 0, 0], [ha - ov, 0, rh - zo], true, (u, v, px, py) => (u + v > 1 - 0.12 || v < 0.12 ? (m.es || e(u, v, px, py)) : e(u, v, px, py)));   // gable end, left
      this.face([x + a, y, z], [0, b, 0], [-ha, 0, rh], false, (u, v, px, py) => (m.ridge && v > 1 - 1.2 / Math.max(rh, ha) ? m.ridge : m.verge && u * b > b - 0.5 ? m.verge : f(u * b, v, px, py)));
    }
  };
  // A standing cylinder (tank, round chimney) of radius r around (x, y), from z, h high.
  //   m: ramp [light, mid, dark, darkest] across the side, top, rim, bands (heights of rings)
  Iso.prototype.cyl = function (x, y, z, r, h, m, edge) {
    this.p.obj(m.k, edge);
    const cx = this.sx(x, y), cy = this.sy(x, y, z), A = 2 * Math.SQRT2 * r, Bv = Math.SQRT2 * r, ramp = m.ramp;
    for (let px = Math.floor(cx - A); px <= Math.ceil(cx + A); px++) {
      const dx = px + 0.5 - cx;
      if (Math.abs(dx) >= A) continue;
      const n = dx / A, e = Bv * Math.sqrt(1 - n * n);
      const side = n < -0.5 ? ramp[0] : n < 0.1 ? ramp[1] : n < 0.62 ? ramp[2] : ramp[3];
      for (let py = Math.floor(cy - h - e); py <= Math.ceil(cy + e); py++) {
        const dy = py + 0.5 - cy;
        if (dy > e || dy < -h - e) continue;
        if (dy <= -h + e && m.top) {                         // the top, its front rim lit
          this.p.put(px, py, m.rim && dy + h > e - 1 ? m.rim : (typeof m.top === 'function' ? m.top(n, (dy + h) / Bv, px, py) : m.top));
          continue;
        }
        const zs = e - dy;                                   // height up the side
        let c = side;
        if (m.bands) for (const bz of m.bands) if (zs >= bz && zs < bz + 1) c = darker(side);
        if (m.lo && zs < 1) c = m.lo;
        this.p.put(px, py, c);
      }
    }
  };
  // A small hand drawn stamp: rows of characters, `map` gives each character a colour.
  // (px, py) is the stamp's bottom middle.
  Iso.prototype.stamp = function (px, py, rows, map, k, edge) {
    this.p.obj(k, edge);
    const h = rows.length, w = rows[0].length, x0 = Math.round(px - w / 2), y0 = Math.round(py - h + 1);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const ch = rows[j][i];
      if (ch === '.' || ch === ' ') continue;
      this.p.put(x0 + i, y0 + j, map[ch]);
    }
  };
  // A ball (dome, mine, radar sphere) of radius r pixels whose centre is at world (x, y, z), lit
  // from the upper left: ramp [light, mid, shade, dark]; a 1 pixel glint above left of the middle.
  Iso.prototype.ball = function (x, y, z, r, ramp, glint, k, edge, cut) {
    this.p.obj(k === undefined ? 1 : k, edge);
    const cx = this.sx(x, y), cy = this.sy(x, y, z);
    for (let py = Math.floor(cy - r); py <= Math.ceil(cy + r); py++) for (let px = Math.floor(cx - r); px <= Math.ceil(cx + r); px++) {
      const dx = px + 0.5 - cx, dy = py + 0.5 - cy;
      if (dx * dx + dy * dy > r * r || (cut !== undefined && dy > cut)) continue;
      const l = (-dx * 0.7 - dy * 0.75) / r;
      this.p.put(px, py, l > 0.45 ? ramp[0] : l > -0.05 ? ramp[1] : l > -0.5 ? ramp[2] : ramp[3]);
    }
    if (glint) this.p.put(Math.round(cx - r * 0.45), Math.round(cy - r * 0.5), glint);
  };
  // A line of pixels from world point a to b (masts, rails, struts).
  Iso.prototype.line = function (a, b, c, k, edge) {
    this.p.obj(k === undefined ? 1 : k, edge);
    const [x0, y0] = this.at(a[0], a[1], a[2]), [x1, y1] = this.at(b[0], b[1], b[2]);
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.p.put(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n), typeof c === 'function' ? c(i, n) : c);
  };
  Iso.prototype.pt = function (x, y, z, c) { const [a, b] = this.at(x, y, z); this.p.put(a, b, c); };
  // Small deterministic noise for speckles (grass, stains, lit windows).
  function hash(a, b, s) { let h = (a * 374761393 + b * 668265263 + (s || 0) * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }

  // ---------------------------------------------------------------- player colour, canvases
  // Placeholders: PC1–PC3 (light ×1.2, base, shade ×0.6); codes from 10 up: a red of the sheet,
  // its own brightness relative to the base red (TONE).
  //   TONE[i] = [brightness k, saturation s]: player colour × k, faded towards its grey by s.
  const TONE = [];
  function tones(rgb) {
    const f = (k, s) => {
      const y = (rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11) * k;
      const c = (v) => Math.max(0, Math.min(255, Math.round(y + (v * k - y) * (s === undefined ? 1 : s))));
      return pack(c(rgb[0]), c(rgb[1]), c(rgb[2]));
    };
    const t = [0, f(1.2), f(1), f(0.6), f(0.4)];
    for (let i = 0; i < TONE.length; i++) t[10 + i] = f(TONE[i][0], TONE[i][1]);
    return t;
  }
  // A copy of the picture's pixels with the player colour put in (rgb: [r, g, b]; none: grey).
  function colorize(pix, rgb) {
    const t = tones(rgb || [128, 134, 140]), d = new Uint32Array(pix.d);
    for (let i = 0; i < d.length; i++) { const v = d[i]; if ((v >>> 24) === 254) d[i] = t[v & 255] || t[2]; }
    return d;
  }
  // Canvas of a picture in a player colour; cached per picture and colour.
  function canvas(pix, rgb) {
    const key = rgb ? rgb.join(',') : '-';
    const c = pix.cv || (pix.cv = new Map());
    let cv = c.get(key);
    if (cv) return cv;
    cv = document.createElement('canvas'); cv.width = pix.w; cv.height = pix.h;
    const cx = cv.getContext('2d'), im = cx.createImageData(pix.w, pix.h);
    new Uint32Array(im.data.buffer).set(colorize(pix, rgb));
    cx.putImageData(im, 0, 0);
    c.set(key, cv);
    return cv;
  }

  // ---------------------------------------------------------------- the eight ships of the sheet
  // Cut out of the reference at 1 art pixel = 1 pixel (src/assets/schiffe-sheet.png). x, y, w, h
  // on the sheet; war: the reds become the player colour; at: where they lie in the reference
  // picture (at 2.7 ×, for the test page); bow: which end is the bow; rail: the line of the rail
  // on merchant ships (the stripe in player colour goes there, on the hull's red pixels).
  const SHIPS = {
    trade0: { name: 'Kutter', x: 0, y: 88, w: 51, h: 18, at: [18, 213], bow: 'r', side: true, rail: [[12, 4], [47, 4]] },
    trade1: { name: 'Frachter', x: 55, y: 83, w: 63, h: 23, at: [169, 204], bow: 'r', side: true, rail: [[15, 7], [58, 7]] },
    trade2: { name: 'Containerschiff', x: 122, y: 51, w: 71, h: 55, at: [351, 133], bow: 'l', rail: [[14, 40], [66, 15]] },
    war3: { name: 'Flugzeugträger', x: 197, y: 8, w: 111, h: 98, at: [532, 22], war: true, bow: 'r' },
    war1: { name: 'Schlachtschiff', x: 312, y: 0, w: 107, h: 106, at: [780, 20], war: true, bow: 'r' },
    war0: { name: 'Zerstörer', x: 423, y: 31, w: 100, h: 75, at: [1019, 93], war: true, bow: 'l' },
    war2: { name: 'U-Boot', x: 527, y: 45, w: 68, h: 61, at: [1276, 123], war: true, bow: 'l' },
    war5: { name: 'Radarschiff', x: 599, y: 61, w: 67, h: 45, at: [1468, 130], war: true, bow: 'r' }
  };
  // «Red» on the sheet. The plan's starting rule (r > 110, r > 1.9 g, r > 1.7 b) left out the
  // shaded and muted reds (the carrier's island and deck edge, the destroyer's stripes, the dark
  // side of every dome); checked on the test page, by hue it catches just the red parts:
  // hue within 20° of red, saturation > 0.36, brightness > 0.3.
  function hsv(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0;
    if (d) h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, mx ? d / mx : 0, mx / 255];
  }
  const isRed = (r, g, b) => { const [h, s, v] = hsv(r, g, b); return (h < 12 || h > 340) && s > 0.36 && v > 0.3; };
  const BASE_RED = 147;                                    // #933539, the middle red of the accents
  // From the sheet's pixels (RGBA bytes, sheet width sw) the Pix of one ship: warships get their
  // reds as player tones; merchant ships get a flag on the highest point and the stripe along the
  // rail (the topmost hull red of each column).
  function shipPix(kind, px, sw) {
    const S = SHIPS[kind], top = 7, p = new Pix(S.w, S.h + top);
    p.obj(1);
    for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) {
      const o = ((S.y + y) * sw + S.x + x) * 4, r = px[o], g = px[o + 1], b = px[o + 2];
      if (px[o + 3] < 128) continue;
      let v = pack(r, g, b);
      if (S.war && isRed(r, g, b)) {
        const [, sat, val] = hsv(r, g, b), k = Math.round(val * 255 / BASE_RED * 100) / 100, sf = Math.min(1, Math.round(sat / 0.55 * 100) / 100);
        let i = TONE.findIndex((t) => t[0] === k && t[1] === sf);
        if (i < 0) { i = TONE.length; TONE.push([k, sf]); }
        v = pack(10 + i, 0, 0, 254);
      }
      p.put(x, y + top, v);
    }
    if (!S.war) {
      // stripe along the rail, only where the hull is (reddish, dark ones too)
      const [[x0, y0], [x1, y1]] = S.rail;
      for (let x = x0; x <= x1; x++) {
        const y = Math.round(y0 + (y1 - y0) * (x - x0) / (x1 - x0)) + top, v = p.d[y * p.w + x];
        const [h, sat] = v ? hsv(R(v), Gc(v), B(v)) : [0, 0];
        if (v && (h < 20 || h > 330) && sat > 0.2) p.d[y * p.w + x] = PC2;
      }
      // flag on the highest point
      let fx = -1, fy = -1;
      for (let y = top; y < p.h && fx < 0; y++) for (let x = 0; x < p.w; x++) if (p.d[y * p.w + x]) { fx = x; fy = y; break; }
      const M = { k: C('#cbd0d3'), p: C('#a4acb1'), a: PC1, b: PC2, c: PC3 }, put = [];
      for (let j = 0; j < FLAG.length; j++) for (let i = 0; i < 5; i++) {
        const ch = FLAG[j][i], x = fx + i, y = fy - FLAG.length + j;
        if (ch !== '.' && x < p.w) { p.put(x, y, M[ch]); put.push(x, y); }
      }
      for (let n = 0; n < put.length; n += 2) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {   // its outline
        const x = put[n] + dx, y = put[n + 1] + dy;
        if (y >= 0 && x >= 0 && x < p.w && y < p.h && !p.get(x, y)) p.put(x, y, C('#16273b'));
      }
    }
    p.ax = S.w / 2; p.ay = p.h - 1;
    return p;
  }
  // Load the sheet (a data URL the build puts in G.PIX_SHEET), then cb(ships: kind -> Pix).
  function loadShips(cb) {
    if (loadShips.done) return cb(loadShips.done);
    const im = new Image();
    im.onload = () => {
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const cx = c.getContext('2d'); cx.drawImage(im, 0, 0);
      const px = cx.getImageData(0, 0, im.width, im.height).data, out = {};
      for (const k in SHIPS) out[k] = shipPix(k, px, im.width);
      loadShips.done = out; cb(out);
    };
    im.src = G.PIX_SHEET;
  }

  G.PIX_SHEET = "/*__PIX_SHEET__*/";
  G.Pixel = { pack, C, nearest, darker, lighter, FLAG, Pix, Iso, hash, PC1, PC2, PC3, PC4, PAL, colorize, canvas, SHIPS, shipPix, loadShips, isRed };
})();
