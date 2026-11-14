(function (G) {
  'use strict';
  const UT = G.UT, PT = G.PT, within = G.within;
  const SEA = '#456f95';
  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

  // Icon shapes on a 24-unit grid, shared by the map and the menus.
  const ICON = G.ICON = {
    city: 'M4 21V4h10v17zM6 6v2.5h2.5V6zM9.5 6v2.5H12V6zM6 10.5V13h2.5v-2.5zM9.5 10.5V13H12v-2.5zM6 15v2.5h2.5V15zM9.5 15v2.5H12V15zM15 21V10h5.5v11zM16.5 12v2.5H19V12zM16.5 16v2.5H19V16z',
    defense: 'M12 2.5l8 3v6c0 5-3.4 8.6-8 10c-4.6-1.4-8-5-8-10v-6z',
    port: 'M12 2.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5zM11 7.5h2V20h-2zM8 9.5h8v2H8zM5 13h2.2c0 3.3 2 5.8 4.8 5.8s4.8-2.5 4.8-5.8H19c0 4.5-3 8-7 8s-7-3.5-7-8z',
    silo: 'M12 2c2.6 2.2 4 5.4 4 9v6H8v-6c0-3.6 1.4-6.8 4-9zM6 15l2-2v6H6zM18 15l-2-2v6h2zM10 18h4v4h-4z',
    sam: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 5.2a6.8 6.8 0 1 1 0 13.6a6.8 6.8 0 0 1 0-13.6zM12 9.5a2.5 2.5 0 1 0 0 5a2.5 2.5 0 0 0 0-5zM11 1v5h2V1zM11 18v5h2v-5zM1 11v2h5v-2zM18 11v2h5v-2z',
    factory: 'M3 21V9l5 3.5V9l5 3.5V4h3.5v8.5H21V21zM6 15.5v2.5h2.5v-2.5zM11 15.5v2.5h2.5v-2.5zM16 15.5v2.5h2.5v-2.5z',
    warship: 'M2 14h20l-2.5 6h-15zM7 13V9h4V6h3v3h3v4z',
    boat: 'M3 14h18l-3 6H6zM11 3h1.6v10H11zM13.4 4l5.6 8h-5.6z',
    atom: 'M12 2l2 3h-4zM9.5 5h5v2.5c2.6 1 4.5 3.6 4.5 6.6c0 3.9-3.1 7-7 7s-7-3.1-7-7c0-3 1.9-5.6 4.5-6.6z',
    hydro: 'M12 1l2.4 6.2l6.2-2.6l-2.6 6.2L24 12l-6 1.2l2.6 6.2l-6.2-2.6L12 23l-2.4-6.2l-6.2 2.6l2.6-6.2L0 12l6-1.2L3.4 4.6l6.2 2.6z',
    mirv: 'M4 20l2.5-13L9 20zM9.5 20L12 4l2.5 16zM15 20l2.5-13L20 20z',
    sword: 'M21 3l-1.5 6L10 18.5L5.5 14L15 4.5zM3.5 13L5 11.5l7.5 7.5l-1.5 1.5zM5.2 16.6l2.2 2.2l-2.9 2.9l-2.2-2.2z',
    hammer: 'M13.5 2.5l8 8l-3.5 3.5l-8-8zM11.6 9.6l2.8 2.8L5.3 21.5a2 2 0 0 1-2.8-2.8z',
    info: 'M12 2.5a9.5 9.5 0 1 0 0 19a9.5 9.5 0 0 0 0-19zM12 4.3a7.7 7.7 0 1 1 0 15.4a7.7 7.7 0 0 1 0-15.4zM12 6.3a1.3 1.3 0 1 0 0 2.6a1.3 1.3 0 0 0 0-2.6zM11 10.5h2V18h-2z',
    ally: 'M9 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11zM9 8.1a3.9 3.9 0 1 1 0 7.8a3.9 3.9 0 0 1 0-7.8zM15 6.5a5.5 5.5 0 1 0 0 11a5.5 5.5 0 0 0 0-11zM15 8.1a3.9 3.9 0 1 1 0 7.8a3.9 3.9 0 0 1 0-7.8z',
    close: 'M5.3 3.9L12 10.6l6.7-6.7l1.4 1.4L13.4 12l6.7 6.7l-1.4 1.4L12 13.4l-6.7 6.7l-1.4-1.4L10.6 12L3.9 5.3z',
    pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
    play: 'M7 4l13 8l-13 8z',
    menu: 'M3 5h18v2.4H3zM3 10.8h18v2.4H3zM3 16.6h18V19H3z',
    home: 'M12 3l9 8h-2.5v9h-5v-6h-3v6h-5v-9H3z',
    net: 'M3 3h18v18H3zm2 2v3.5h3.5V5zm5.5 0v3.5h3V5zm5 0v3.5H19V5zM5 10.5v3h3.5v-3zm5.5 0v3h3v-3zm5 0v3H19v-3zM5 15.5V19h3.5v-3.5zm5.5 0V19h3v-3.5zm5 0V19H19v-3.5z',
    troops: 'M12 3a4 4 0 1 0 0 8a4 4 0 0 0 0-8zM4 21c0-4.4 3.6-8 8-8s8 3.6 8 8z',
    gold: 'M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18zM12 6.5a5.5 5.5 0 1 1 0 11a5.5 5.5 0 0 1 0-11z',
    sound: 'M3 9h4l5-4.5v15L7 15H3zM14.5 8.2a5 5 0 0 1 0 7.6l-1.2-1.4a3.2 3.2 0 0 0 0-4.8zM17 5.4a8.8 8.8 0 0 1 0 13.2l-1.2-1.4a7 7 0 0 0 0-10.4z',
    mute: 'M3 9h4l5-4.5v15L7 15H3zM14.3 9.3l1.4-1.4l2.3 2.3l2.3-2.3l1.4 1.4l-2.3 2.3l2.3 2.3l-1.4 1.4l-2.3-2.3l-2.3 2.3l-1.4-1.4l2.3-2.3z',
    up: 'M12 3l8 8h-5v9H9v-9H4z',
    laser: 'M11 1h2v9l5.5-5.5l1.4 1.4L14.4 11.5H23v2h-8.6l5.5 5.6l-1.4 1.4L13 15v8h-2v-8l-5.5 5.5l-1.4-1.4l5.5-5.6H1v-2h8.6L4.1 5.9l1.4-1.4L11 10z',
    cruise: 'M22 2l-1.2 5.2L9.5 18.5l-4-4L16.8 3.2zM4.3 15.7l4 4L3 21zM10.5 6.5H6L3.5 9.5l4 .5zM17.5 13.5V18l-3 2.5l-.5-4z',
    people: 'M8 4a3.5 3.5 0 1 0 0 7a3.5 3.5 0 0 0 0-7zM16.5 5a3 3 0 1 0 0 6a3 3 0 0 0 0-6zM1.5 20c0-3.6 2.9-6.5 6.5-6.5s6.5 2.9 6.5 6.5zM16 20c0-2-.7-3.9-1.9-5.4c.8-.4 1.6-.6 2.4-.6c3 0 5.5 2.5 5.5 6z',
    copy: 'M8 3h11a2 2 0 0 1 2 2v11h-2V5H8zM5 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z',
    target: 'M11 1h2v3.1a8 8 0 0 1 6.9 6.9H23v2h-3.1a8 8 0 0 1-6.9 6.9V23h-2v-3.1A8 8 0 0 1 4.1 13H1v-2h3.1A8 8 0 0 1 11 4.1zM12 6a6 6 0 1 0 0 12a6 6 0 0 0 0-12zM12 9.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 0 1 0-5z'
  };
  const STRUCT_ICON = ['city', 'defense', 'port', 'silo', 'sam', 'factory'];
  const STRUCT_RANK = [1, 5, 3, 0, 4, 2];     // which kind stands for a cluster seen from afar: silo, city, factory, port, air defence, post
  const paths = {};
  function glyph(ctx, name, x, y, s) {
    const p = paths[name] || (paths[name] = new Path2D(ICON[name]));
    ctx.save();
    ctx.translate(x - s / 2, y - s / 2);
    ctx.scale(s / 24, s / 24);
    ctx.fill(p);
    ctx.restore();
  }

  function pack(r, g, b) { return (0xff000000 | (b << 16) | (g << 8) | r) >>> 0; }
  function terrainColor(map, i) {
    const m = map.mag[i];
    if (!map.land[i]) {
      if (map.shore[i]) return pack(104, 146, 180);
      const d = Math.min(m, 14) / 14;
      return pack(Math.round(88 - 19 * d), Math.round(130 - 19 * d), Math.round(166 - 17 * d));
    }
    let r, g, b;
    if (map.shore[i]) { r = 214; g = 205; b = 160; }
    else if (m < 10) { r = 172 + 1.6 * m; g = 212 - 2.2 * m; b = 128 + 0.5 * m; }
    else if (m < 20) { r = 196 + 2.2 * (m - 10); g = 184 + 1.6 * (m - 10); b = 140 + 2.2 * (m - 10); }
    else { const v = 222 + 3 * (m - 20); r = v - 6; g = v - 3; b = v; }
    // the colder, the whiter: first snow at about -2 C, solid ice below -15 C
    const s = within((-map.temp10(i) / 10 - 2) / 13, 0, 1) * 0.9;
    if (s > 0) { r += (236 - r) * s; g += (242 - g) * s; b += (248 - b) * s; return pack(r | 0, g | 0, b | 0); }
    return calm(r, g, b);
  }
  // Land colours are taken down a notch before they reach the map: a quarter of the way to grey,
  // and a quarter of the way to a middle brightness. The ground is the stage, not the play.
  function calm(r, g, b) {
    const l = r * 0.3 + g * 0.59 + b * 0.11;
    r += (l - r) * 0.25; g += (l - g) * 0.25; b += (l - b) * 0.25;
    r = 188 + (r - 188) * 0.76; g = 188 + (g - 188) * 0.76; b = 188 + (b - 188) * 0.76;
    return pack(r > 255 ? 255 : r | 0, g > 255 ? 255 : g | 0, b > 255 ? 255 : b | 0);
  }
  // ---------- the Earth: how real terrain is painted ----------
  // Calm, flat colours per kind of ground, so a glance tells what an attack will have to cross:
  // light green grassland, pale yellow-green farmland, dark green forest (blue-green taiga,
  // deep green rain forest), sand-coloured desert, grey-olive tundra, white ice, grey-green
  // swamp. The harder the ground (highland, mountains) the more the colour turns to bare rock,
  // with snow on the highest steep peaks. A soft relief, lit from the north-west, is laid over
  // it: plains stay flat, ranges stand out. The same numbers as tools/render_preview.py.
  const COVER_RGB = [[0, 0, 0], [178, 205, 134], [208, 214, 146], [112, 154, 98], [230, 213, 164], [180, 181, 158], [241, 246, 249], [132, 168, 150]];
  function worldColors(map) {
    const W = map.W, H = map.H, N = map.N, hw = map.hw, hh = map.hh, hgt = map.hgt;
    const cover = map.cover, feat = map.feat, mag = map.mag, land = map.land, snowBit = map.snow, ct = map.ctile || null;
    // relief at half resolution: height in metres, slope towards the light, squeezed by tanh
    const lum2 = new Float32Array(hw * hh), e = new Float32Array(hw * hh);
    for (let i = 0; i < e.length; i++) { const v = hgt[i] / 255; e[i] = v * v * 8850; }
    const tanh = function (x) { const a = Math.exp(2 * x); return (a - 1) / (a + 1); };
    for (let y = 0, i = 0; y < hh; y++) for (let x = 0; x < hw; x++, i++) {
      const gx = e[x < hw - 1 ? i + 1 : i] - e[x > 0 ? i - 1 : i], gy = e[y < hh - 1 ? i + hw : i] - e[y > 0 ? i - hw : i];
      const sh = tanh((gx + gy) / 900);
      lum2[i] = 1 + (sh > 0 ? 0.08 : 0.12) * sh;
    }
    // water: light near the coast, deep blue far out (mag of a water tile is its distance to land)
    const sea = new Uint32Array(31);
    for (let m = 0; m <= 30; m++) {
      const k = Math.pow(Math.min(1, m / 26), 0.8);
      sea[m] = pack(Math.round(98 + (69 - 98) * k), Math.round(140 + (111 - 140) * k), Math.round(174 + (149 - 174) * k));   // one calm blue, a little lighter in the shallows
    }
    const out = new Uint32Array(N);
    for (let y = 0, i = 0; y < H; y++) {
      const fy = Math.min(hh - 1, Math.max(0, (y + 0.5) / 2 - 0.5)), y0 = fy | 0, y1 = Math.min(hh - 1, y0 + 1), ty = fy - y0;
      for (let x = 0; x < W; x++, i++) {
        if (!land[i]) { out[i] = sea[mag[i]]; continue; }
        const f = feat[i];
        if (f & 2) { out[i] = pack(92, 134, 172); continue; }            // a great river
        const cv = cover[i];
        let r, g, b;
        if (cv === 3 && (f & 4)) { r = 92; g = 132; b = 106; }             // taiga
        else if (cv === 3 && (f & 8)) { r = 78; g = 142; b = 90; }         // rain forest
        else { const c = COVER_RGB[cv]; r = c[0]; g = c[1]; b = c[2]; }
        if (cv !== 6) {
          const t = Math.min(1, Math.max(0, (mag[i] - 9) / 19)) * 0.6;
          r += (158 - r) * t; g += (148 - g) * t; b += (134 - b) * t;
        }
        if (snowBit[i]) { r = r * 0.12 + 244 * 0.88; g = g * 0.12 + 246 * 0.88; b = b * 0.12 + 248 * 0.88; }
        const fx = Math.min(hw - 1, Math.max(0, (x + 0.5) / 2 - 0.5)), x0 = fx | 0, x1 = Math.min(hw - 1, x0 + 1), tx = fx - x0;
        const l = (lum2[y0 * hw + x0] * (1 - tx) + lum2[y0 * hw + x1] * tx) * (1 - ty) + (lum2[y1 * hw + x0] * (1 - tx) + lum2[y1 * hw + x1] * tx) * ty;
        r *= l; g *= l; b *= l;
        { const cc = calm(r, g, b); r = cc & 255; g = (cc >>> 8) & 255; b = (cc >>> 16) & 255; }
        if (f & 1) { r = r * 0.25 + 104 * 0.75; g = g * 0.25 + 146 * 0.75; b = b * 0.25 + 182 * 0.75; }   // a river
        if (ct) {                                                    // version «Rohstoffe»: a country border, darker ground
          const c = ct[i];
          if ((x < W - 1 && ct[i + 1] && ct[i + 1] !== c) || (y < H - 1 && ct[i + W] && ct[i + W] !== c)) { r *= 0.62; g *= 0.62; b *= 0.62; }
        }
        out[i] = pack(r > 255 ? 255 : r | 0, g > 255 ? 255 : g | 0, b > 255 ? 255 : b | 0);
      }
    }
    return out;
  }

  // Flags are off for now: emoji flags look different on every device and cheapen the map.
  function flagOf(iso) { return ''; }
  G.flagOf = flagOf;

  function View(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.cam = { x: 0, y: 0, z: 1 };
    this.fly = null; this.map = null; this.game = null;
    this.fxList = []; this.mark = -1; this.aim = null;
    this.net = { on: false, edit: new Map(), at: -1e9, tint: null, mask: null, x0: 0, y0: 0, w: 0, h: 0, heavy: [], brush: null, lines: null };
    this.occ = new Uint8Array(2600); this.sq = new Uint16Array(2600);
    this.dpr = 1; this.cw = 1; this.ch = 1;
    this.resize();
  }

  View.prototype.resize = function () {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cw = Math.max(1, r.width); this.ch = Math.max(1, r.height);
    this.cv.width = Math.round(this.cw * this.dpr);
    this.cv.height = Math.round(this.ch * this.dpr);
    this.clampCam();
  };

  View.prototype.setMap = function (map) {
    this.map = map; this.game = null; this.fxList.length = 0; this.mark = -1; this.aim = null;
    const mc = this.mc = document.createElement('canvas');
    mc.width = map.W; mc.height = map.H;
    this.mctx = mc.getContext('2d');
    this.img = this.mctx.createImageData(map.W, map.H);
    this.px = new Uint32Array(this.img.data.buffer);
    if (map.cover) this.base = worldColors(map);
    else {
      this.base = new Uint32Array(map.N);
      for (let i = 0; i < map.N; i++) this.base[i] = terrainColor(map, i);
    }
    this.px.set(this.base);
    this.mctx.putImageData(this.img, 0, 0);
  };
  View.prototype.setGame = function (game) {
    this.game = game;
    for (let i = 1; i < game.players.length; i++) {
      const p = game.players[i];
      // the border: the land's colour a shade darker; the player's own border is near white, so
      // the own realm is found at a glance (its defended stretches alternate with a dark shade)
      this.borderColors(p);
      // On a map in the owner's colour a sign must not be of the same colour again: the body of
      // every building and every ship is a deep shade of it, the rim a light one. That holds the
      // shape against the land under it, whoever owns that land.
      p.cssD = 'rgb(' + Math.round(p.r * 0.46) + ',' + Math.round(p.g * 0.46) + ',' + Math.round(p.b * 0.46) + ')';
      p.cssL = 'rgb(' + Math.round(p.r * 0.3 + 172) + ',' + Math.round(p.g * 0.3 + 172) + ',' + Math.round(p.b * 0.3 + 172) + ')';
      p.css = 'rgb(' + p.r + ',' + p.g + ',' + p.b + ')';
      p.cssB = 'rgb(' + Math.round(p.r * 0.58) + ',' + Math.round(p.g * 0.58) + ',' + Math.round(p.b * 0.58) + ')';
    }
    this.px.set(this.base);
    for (let t = 0; t < game.N; t++) if (game.owner[t] || game.fallout[t]) this.paint(t);
    this.mctx.putImageData(this.img, 0, 0);
    game.dirtyN = 0; game.dirtyFlag.fill(0);
  };

  // Colour of one tile: terrain, tinted by its owner, with a darker rim at the border.
  View.prototype.paint = function (t) {
    const g = this.game, own = g.owner, o = own[t], b = this.base[t];
    if (!o) {
      if (!g.fallout[t]) { this.px[t] = b; return; }
      this.px[t] = pack(((b & 255) * 120 + 104 * 136) >> 8, (((b >>> 8) & 255) * 120 + 214 * 136) >> 8, (((b >>> 16) & 255) * 120 + 78 * 136) >> 8);
      return;
    }
    const p = g.players[o], W = g.W, x = t % W, y = (t - x) / W;
    const edge = (x > 0 && own[t - 1] !== o) || (x < W - 1 && own[t + 1] !== o) ||
      (y > 0 && own[t - W] !== o) || (y < g.H - 1 && own[t + W] !== o);
    if (edge) {
      let c = p.c32b;
      if (p.dposts.length && ((x + y) & 1)) {
        const r2 = g.R.defense * g.R.defense;
        for (let i = 0; i < p.dposts.length; i++) {
          const dx = p.dposts[i].x - x, dy = p.dposts[i].y - y;
          if (dx * dx + dy * dy <= r2) { c = p.c32l; break; }
        }
      }
      this.px[t] = c;
    } else if (g.map.feat) {
      const br = b & 255, bg = (b >>> 8) & 255, bb = (b >>> 16) & 255;
      if (g.map.feat[t] & 1) {
        // a river stays a river under any flag: it is a line of defence, and you have to see it
        this.px[t] = pack((br * 120 + p.r * 136) >> 8, (bg * 120 + p.g * 136) >> 8, (bb * 120 + p.b * 136) >> 8);
      } else {
        // On the Earth the owner's colour takes on the light and dark of the ground under it:
        // forest shows as a darker stretch, desert and snow as lighter ones, ranges keep their
        // relief. The hue stays the owner's, so borders read cleanly, and the terrain that
        // decides the next attack can still be seen.
        const lum = (br * 77 + bg * 150 + bb * 29) >> 8;
        // only a hint of it: the land is one calm colour, forest and ranges a shade deeper
        const f = 226 + ((lum * 40 / 190) | 0);
        let r = (p.r * f) >> 8, gg = (p.g * f) >> 8, bl = (p.b * f) >> 8;
        r = (r * 226 + br * 30) >> 8; gg = (gg * 226 + bg * 30) >> 8; bl = (bl * 226 + bb * 30) >> 8;
        this.px[t] = pack(r > 255 ? 255 : r, gg > 255 ? 255 : gg, bl > 255 ? 255 : bl);
      }
    } else {
      this.px[t] = pack(((b & 255) * 84 + p.r * 172) >> 8, (((b >>> 8) & 255) * 84 + p.g * 172) >> 8, (((b >>> 16) & 255) * 84 + p.b * 172) >> 8);
    }
  };
  // The two colours a border is drawn in: c32b for the plain stretch, c32l for the stretches a
  // defence post covers. Your own realm is rimmed near white, an ally's in green, so a glance at
  // the map says who is with you. Worked out again whenever an alliance is made or broken.
  View.prototype.borderColors = function (p) {
    const h = this.game && this.game.human;
    if (p === h) {
      p.c32b = pack(240, 240, 240);
      p.c32l = pack(Math.round(p.r * 0.5), Math.round(p.g * 0.5), Math.round(p.b * 0.5));
      return;
    }
    const ally = !!h && h.allies.has(p.id);
    const mix = function (f, gr, gg, gb) {
      return pack(Math.round(p.r * f * (1 - gr[0]) + gr[0] * gr[1]), Math.round(p.g * f * (1 - gg[0]) + gg[0] * gg[1]), Math.round(p.b * f * (1 - gb[0]) + gb[0] * gb[1]));
    };
    if (ally) {
      // nearly half way to a deep green, so the land's own colour still shows through
      p.c32b = pack(Math.round(p.r * 0.72 * 0.55 + 0.45 * 46), Math.round(p.g * 0.72 * 0.55 + 0.45 * 186), Math.round(p.b * 0.72 * 0.55 + 0.45 * 96));
      p.c32l = pack(Math.round(p.r * 0.5 * 0.55 + 0.45 * 150), Math.round(p.g * 0.5 * 0.55 + 0.45 * 240), Math.round(p.b * 0.5 * 0.55 + 0.45 * 176));
      return;
    }
    p.c32b = pack(Math.round(p.r * 0.72), Math.round(p.g * 0.72), Math.round(p.b * 0.72));
    p.c32l = pack(Math.round(p.r * 0.5 + 127), Math.round(p.g * 0.5 + 127), Math.round(p.b * 0.5 + 127));
  };
  // An alliance made or broken repaints the border of whoever it concerns.
  View.prototype.checkAllies = function () {
    const g = this.game, h = g && g.human;
    if (!h) return;
    const seen = this.allySeen || (this.allySeen = new Set());
    let change = false;
    for (const id of h.allies.keys()) if (!seen.has(id)) { seen.add(id); change = true; }
    for (const id of Array.from(seen)) if (!h.allies.has(id)) { seen.delete(id); change = true; }
    if (!change) return;
    for (let i = 1; i < g.players.length; i++) {
      const p = g.players[i];
      this.borderColors(p);
      if (p !== h && p.alive) for (const t of p.border) g.markDirty(t);
    }
  };
  View.prototype.flush = function () {
    const g = this.game, n = g.dirtyN;
    if (!n) return;
    const d = g.dirty, f = g.dirtyFlag, W = g.W;
    let x0 = W, x1 = -1, y0 = g.H, y1 = -1;
    for (let i = 0; i < n; i++) {
      const t = d[i], x = t % W, y = (t - x) / W;
      f[t] = 0;
      this.paint(t);
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    g.dirtyN = 0;
    this.mctx.putImageData(this.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  };

  // ---------- name labels: the largest clear rectangle inside each territory ----------
  View.prototype.placeNames = function () {
    const g = this.game, T = g.ticks, ps = g.players;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (p.nameAt !== undefined && (p.lastChange < p.nameAt || T - p.nameAt < 12)) continue;
      p.nameAt = T;
      this.placeName(p);
    }
  };
  View.prototype.placeName = function (p) {
    const g = this.game;   // the box around the territory is kept tight by the simulation; never change it from here
    if (p.x1 < p.x0) { p.nameSize = 0; return; }
    const W = g.W, own = g.owner, id = p.id, occ = this.occ, sq = this.sq;
    const bw = p.x1 - p.x0 + 1, bh = p.y1 - p.y0 + 1;
    const st = Math.max(1, Math.ceil(Math.max(bw, bh) / 50));
    const gw = Math.ceil(bw / st), gh = Math.ceil(bh / st);
    let best = 0, bx = 0, by = 0;
    for (let gy = 0; gy < gh; gy++) {
      const y = Math.min(p.y1, p.y0 + gy * st + (st >> 1));
      for (let gx = 0; gx < gw; gx++) {
        const x = Math.min(p.x1, p.x0 + gx * st + (st >> 1)), i = gy * gw + gx;
        let s = 0;
        if (own[y * W + x] === id) {
          s = 1;
          if (gx > 0 && gy > 0) s = 1 + Math.min(sq[i - 1], sq[i - gw], sq[i - gw - 1]);
        }
        occ[i] = s ? 1 : 0; sq[i] = s;
        if (s > best) { best = s; bx = gx; by = gy; }
      }
    }
    if (!best) { p.nameSize = 0; return; }
    let c0 = bx - best + 1, c1 = bx;
    const r0 = by - best + 1;
    const full = function (gx) { for (let gy = r0; gy <= by; gy++) if (!occ[gy * gw + gx]) return false; return true; };
    while (c0 > 0 && c1 - c0 + 1 < best * 4 && full(c0 - 1)) c0--;
    while (c1 < gw - 1 && c1 - c0 + 1 < best * 4 && full(c1 + 1)) c1++;
    const rw = (c1 - c0 + 1) * st, rh = best * st;
    let size = Math.min(rh * 0.42, rw / (Math.max(4, p.name.length) * 0.5));
    let nx = p.x0 + (c0 + c1 + 1) / 2 * st, ny = p.y0 + (r0 + by + 1) / 2 * st;
    // The rectangle above was found on a coarse grid. Check the label against the real tiles: every
    // spot the two lines of text cover must belong to this player (so never sea, never a neighbour).
    // Shrink and nudge until it fits; the label then always sits inside the territory.
    const H = g.H, chars = Math.max(4, p.name.length) + 4;   // the extra characters leave room for flag, crown, alliance sign
    const fits = function (x, y, sz) {
      const hw = chars * 0.29 * sz, ys = [-0.86, -0.36, 0.5, 0.87], n = Math.max(2, Math.min(9, Math.ceil(hw * 2)));
      for (let a = 0; a < ys.length; a++) {
        const ty = Math.floor(y + ys[a] * sz);
        if (ty < 0 || ty >= H) return false;
        for (let b = 0; b <= n; b++) {
          const tx = Math.floor(x - hw + 2 * hw * b / n);
          if (tx < 0 || tx >= W || own[ty * W + tx] !== id) return false;
        }
      }
      return true;
    };
    let ok = false;
    for (let tries = 0; tries < 14 && !ok; tries++) {
      const hw = chars * 0.29 * size;
      for (let o = 0; o < 9 && !ok; o++) {
        const ox = ((o % 3) - 1) * hw * 0.3, oy = (((o / 3) | 0) - 1) * size * 0.4;
        if (fits(nx + ox, ny + oy, size)) { nx += ox; ny += oy; ok = true; }
      }
      if (!ok) size *= 0.85;
    }
    if (!ok) {   // too small for any label: keep it on the centre tile of the largest block
      size = Math.min(size, 1.5);
      if (own[Math.floor(ny) * W + Math.floor(nx)] !== id) { nx = p.x0 + (c0 + c1 + 1) / 2 * st; ny = p.y0 + (r0 + by + 1) / 2 * st; }
    }
    p.nameSize = size; p.nameX = nx; p.nameY = ny;
  };

  // ---------- camera ----------
  View.prototype.clampCam = function () {
    const m = this.map, c = this.cam;
    if (!m) return;
    c.z = within(c.z, Math.min(this.cw / m.W, this.ch / m.H) * 0.75, 28);
    c.x = within(c.x, 0, m.W); c.y = within(c.y, 0, m.H);
  };
  View.prototype.fit = function (cover) {
    const m = this.map, c = this.cam;
    c.z = cover ? Math.max(this.cw / m.W, this.ch / m.H) : Math.min(this.cw / m.W, this.ch / m.H);
    c.x = m.W / 2; c.y = m.H / 2; this.fly = null;
    this.clampCam();
  };
  View.prototype.zoomAt = function (sx, sy, f) {
    const c = this.cam, wx = (sx - this.cw / 2) / c.z + c.x, wy = (sy - this.ch / 2) / c.z + c.y;
    c.z *= f; this.clampCam();
    c.x = wx - (sx - this.cw / 2) / c.z; c.y = wy - (sy - this.ch / 2) / c.z;
    this.clampCam();
  };
  View.prototype.pan = function (dx, dy) {
    this.cam.x -= dx / this.cam.z; this.cam.y -= dy / this.cam.z;
    this.clampCam();
  };
  View.prototype.tileAt = function (sx, sy) {
    const c = this.cam, m = this.map;
    if (!m) return -1;
    const x = Math.floor((sx - this.cw / 2) / c.z + c.x), y = Math.floor((sy - this.ch / 2) / c.z + c.y);
    if (x < 0 || y < 0 || x >= m.W || y >= m.H) return -1;
    return y * m.W + x;
  };
  View.prototype.screenOf = function (tile) {
    const c = this.cam, W = this.map.W;
    return {
      x: (tile % W + 0.5 - c.x) * c.z + this.cw / 2,
      y: (((tile / W) | 0) + 0.5 - c.y) * c.z + this.ch / 2
    };
  };
  View.prototype.flyTo = function (x, y, z) {
    const c = this.cam;
    this.fly = { x: x, y: y, z: z || c.z, fx: c.x, fy: c.y, fz: c.z, t0: performance.now() };
  };

  // ---------- drawing ----------
  View.prototype.draw = function (alpha, now) {
    if (this.game) this.checkAllies();
    const ctx = this.ctx, c = this.cam, dpr = this.dpr, cw = this.cw, ch = this.ch;
    if (this.fly) {
      const f = this.fly, k = Math.min(1, (now - f.t0) / 480), e = k * (2 - k);
      c.x = f.fx + (f.x - f.fx) * e; c.y = f.fy + (f.y - f.fy) * e;
      c.z = f.fz * Math.pow(f.z / f.fz, e);
      if (k >= 1) this.fly = null;
      this.clampCam();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = SEA;
    ctx.fillRect(0, 0, this.cv.width, this.cv.height);
    if (!this.map) return;
    const z = c.z, ox = cw / 2 - c.x * z, oy = ch / 2 - c.y * z;
    ctx.setTransform(z * dpr, 0, 0, z * dpr, ox * dpr, oy * dpr);
    ctx.imageSmoothingEnabled = z < 1.5;
    ctx.drawImage(this.mc, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const g = this.game;
    if (!g) return;
    this.drawNet(ctx, g, z, ox, oy, now);
    this.drawRails(ctx, g, z, ox, oy);
    this.drawReach(ctx, g, z, ox, oy);
    this.drawStructures(ctx, g, z, ox, oy);
    this.drawUnits(ctx, g, z, ox, oy, alpha, now);
    this.drawFx(ctx, g, z, ox, oy, now);
    if (g.res && this.resSigns) this.drawRes(ctx, g, z, ox, oy);
    this.drawNames(ctx, g, z, ox, oy);
    this.drawRaids(ctx, g, z, ox, oy, now);
    this.drawFronts(ctx, g, z, ox, oy, now);
    this.drawIncoming(ctx, g, z, ox, oy, alpha, now);
    this.drawMarks(ctx, g, z, ox, oy, now);
    if (this.aim) this.drawAim(ctx, g, z, ox, oy, now);
    if (this.ghost) this.drawGhost(ctx, g, z, ox, oy, now);
  };

  // The ground a defence post covers and the sky an air defence guards, drawn around the building at all
  // times so nobody has to tap it to learn how far it reaches. Own and allied ones are drawn clearly,
  // those of others fainter.
  // ---------- the net: how the own troops stand ----------
  // Only the player's own posture is ever drawn; nobody sees anyone else's. Outside the editing
  // mode it is a faint tint (red where troops stand dense, dark where the land is thin); in the
  // mode the grid is drawn over it, finer where the net has been pulled together.
  // The tint lives on a small canvas, one pixel for 4 x 4 tiles, cut to the shape of the realm.
  View.prototype.netWeight = function (c) {
    const e = this.net.edit.get(c.id);
    return e ? e.m : c.m;
  };
  View.prototype.buildNet = function (g, p) {
    const N = this.net, post = p.post, CS = G.POST.cell, Q = 4, W = g.W, own = g.owner, id = p.id;
    const cx0 = Math.floor(p.x0 / CS), cy0 = Math.floor(p.y0 / CS), cx1 = Math.floor(p.x1 / CS), cy1 = Math.floor(p.y1 / CS);
    const w = (cx1 - cx0 + 1) * (CS / Q), h = (cy1 - cy0 + 1) * (CS / Q);
    if (!N.tint) { N.tint = document.createElement('canvas'); N.mask = document.createElement('canvas'); }
    if (N.tint.width !== w || N.tint.height !== h) { N.tint.width = w; N.tint.height = h; N.mask.width = w; N.mask.height = h; }
    N.x0 = cx0 * CS; N.y0 = cy0 * CS; N.w = w; N.h = h;
    const tc = N.tint.getContext('2d'), mc = N.mask.getContext('2d');
    const ti = tc.createImageData(w, h), mi = mc.createImageData(w, h), td = ti.data, md = mi.data;
    const H = post.H, avg = p.tiles > 0 && H > 0 ? H / p.tiles : 0, CW = g.CW, per = CS / Q;
    N.heavy.length = 0;
    for (const c of post.cells.values()) {
      const cx = c.id % CW, cy = (c.id - cx) / CW;
      const d = avg > 0 && c.n > 0 ? (c.u / c.n) / avg : 1;
      let r, gg, b, a;
      if (d >= 1) { r = 255; gg = 52; b = 36; a = 215 * (1 - 1 / Math.pow(d, 0.8)); }
      else { r = 6; gg = 10; b = 20; a = 120 * (1 - d); }
      const m = this.netWeight(c);
      if (m > 1.25 || m < 0.8) N.heavy.push(cx, cy, m);
      const bx = (cx - cx0) * per, by = (cy - cy0) * per;
      for (let j = 0; j < per; j++) {
        const ty = cy * CS + j * Q + 1;
        if (ty >= g.H) break;
        for (let i = 0; i < per; i++) {
          const tx = cx * CS + i * Q + 1;
          if (tx >= W) break;
          const row = ty * W + tx;
          // four of the sixteen tiles of the block decide how much of it is ours
          let k = 0;
          if (own[row] === id) k++;
          if (own[row + 2] === id) k++;
          if (ty + 2 < g.H) { if (own[row + 2 * W] === id) k++; if (own[row + 2 * W + 2] === id) k++; }
          if (!k) continue;
          const o = ((by + j) * w + bx + i) * 4;
          td[o] = r; td[o + 1] = gg; td[o + 2] = b; td[o + 3] = a * k / 4;
          md[o] = 8; md[o + 1] = 13; md[o + 2] = 22; md[o + 3] = 64 * k - 1;
        }
      }
    }
    tc.putImageData(ti, 0, 0); mc.putImageData(mi, 0, 0);
  };
  View.prototype.drawNet = function (ctx, g, z, ox, oy, now) {
    const p = g.human, N = this.net;
    if (!p || !p.post || !p.alive || g.phase !== 'play' || !p.post.cells.size) return;
    if (now - N.at > (N.on ? 300 : 1200) || N.dirty) { N.at = now; N.dirty = false; this.buildNet(g, p); }
    if (!N.w) return;
    for (const e of N.edit) if (now - e[1].at > 2500) N.edit.delete(e[0]);
    const dpr = this.dpr, cw = this.cw, ch = this.ch, CS = G.POST.cell;
    const sx = N.x0 * z + ox, sy = N.y0 * z + oy, sw = N.w * 4 * z, sh = N.h * 4 * z;
    if (sx > cw || sy > ch || sx + sw < 0 || sy + sh < 0) return;
    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if (N.on) { ctx.globalAlpha = 0.42; ctx.drawImage(N.mask, sx, sy, sw, sh); }    // a veil over the own colour, so the net reads the same on every colour
    ctx.globalAlpha = N.on ? 1 : 0.4;
    ctx.drawImage(N.tint, sx, sy, sw, sh);
    ctx.globalAlpha = 1;
    if (N.on) {
      // the grid, on its own layer so it can be cut to the shape of the realm
      let lc = N.lines;
      if (!lc) lc = N.lines = document.createElement('canvas');
      if (lc.width !== this.cv.width || lc.height !== this.cv.height) { lc.width = this.cv.width; lc.height = this.cv.height; }
      const l = lc.getContext('2d');
      l.setTransform(dpr, 0, 0, dpr, 0, 0);
      l.globalCompositeOperation = 'source-over';
      l.clearRect(0, 0, cw, ch);
      let k = 1;
      while (CS * k * z < 9) k *= 2;       // zoomed out: a coarser grid, so it never turns into a grey film
      const step = CS * k * z;
      const x0 = Math.max(sx, 0), x1 = Math.min(sx + sw, cw), y0 = Math.max(sy, 0), y1 = Math.min(sy + sh, ch);
      l.beginPath();
      for (let x = sx + Math.ceil((x0 - sx) / step) * step; x <= x1 + 0.5; x += step) { l.moveTo(x, y0); l.lineTo(x, y1); }
      for (let y = sy + Math.ceil((y0 - sy) / step) * step; y <= y1 + 0.5; y += step) { l.moveTo(x0, y); l.lineTo(x1, y); }
      l.strokeStyle = 'rgba(255,255,255,0.5)'; l.lineWidth = 1; l.stroke();
      // where the net is pulled together its meshes get finer and glow, where it is let go they fade
      const hv = N.heavy, cell = CS * z;
      if (cell >= 5) {
        l.beginPath();
        for (let i = 0; i < hv.length; i += 3) {
          const m = hv[i + 2];
          if (m < 1) continue;
          const x = hv[i] * cell + ox, y = hv[i + 1] * cell + oy;
          if (x > cw || y > ch || x + cell < 0 || y + cell < 0) continue;
          const parts = m > 3.2 ? 4 : m > 1.9 ? 3 : 2;
          for (let q = 1; q < parts; q++) {
            const f = q / parts * cell;
            l.moveTo(x + f, y); l.lineTo(x + f, y + cell); l.moveTo(x, y + f); l.lineTo(x + cell, y + f);
          }
        }
        l.strokeStyle = 'rgba(255,214,190,0.75)'; l.lineWidth = 1; l.stroke();
        l.fillStyle = 'rgba(8,14,24,0.5)';
        for (let i = 0; i < hv.length; i += 3) {
          if (hv[i + 2] >= 1) continue;
          const x = hv[i] * cell + ox, y = hv[i + 1] * cell + oy;
          if (x > cw || y > ch || x + cell < 0 || y + cell < 0) continue;
          l.clearRect(x + 1, y + 1, cell - 2, cell - 2);
          l.globalAlpha = Math.min(1, (1 - hv[i + 2]) * 1.2); l.fillRect(x, y, cell, cell); l.globalAlpha = 1;
        }
      }
      l.globalCompositeOperation = 'destination-in';
      l.imageSmoothingEnabled = true;
      l.drawImage(N.mask, sx, sy, sw, sh);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(lc, 0, 0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const b = N.brush;
      if (b) {
        ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.2832);
        ctx.strokeStyle = b.less ? 'rgba(150,200,255,0.9)' : 'rgba(255,170,140,0.95)'; ctx.lineWidth = 1.5; ctx.stroke();
      }
    }
    ctx.restore();
  };

  View.prototype.drawReach = function (ctx, g, z, ox, oy) {
    const h = g.human, cw = this.cw, ch = this.ch;
    for (const u of g.structAt.values()) {
      if (!u.built || (u.type !== UT.DEFENSE && u.type !== UT.SAM)) continue;
      const own = h && (u.owner === h || h.allies.has(u.owner.id));
      const rad = u.type === UT.DEFENSE ? g.R.defense : g.samRange(u);
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy, r = rad * z;
      if (r < 6 || x < -r || y < -r || x > cw + r || y > ch + r) continue;
      if (u.type === UT.SAM && !own) continue;   // enemy air defence only shows while a bomb is being aimed
      // a foreign defence post only shows its reach while there is fighting with its owner
      if (!own && !(h && (h.out.some(function (a) { return a.active && a.tid === u.owner.id; }) || h.inc.some(function (a) { return a.active && a.a === u.owner; })))) continue;
      const p = u.owner, col = u.type === UT.DEFENSE ? p.r + ',' + p.g + ',' + p.b : '197,139,255';
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + col + ',' + (own ? 0.10 : 0.05) + ')'; ctx.fill();
      ctx.setLineDash([7, 6]); ctx.lineWidth = own ? 2 : 1.4;
      ctx.strokeStyle = u.type === UT.DEFENSE ? 'rgba(255,255,255,' + (own ? 0.6 : 0.4) + ')' : 'rgba(197,139,255,0.7)';
      ctx.stroke(); ctx.setLineDash([]);
    }
  };

  // What a build key is about to place, shown under the mouse pointer: in the player's colour when it
  // can be built there, red when it cannot (too little gold, wrong spot ...). Bombs show their blast.
  View.prototype.drawGhost = function (ctx, g, z, ox, oy, now) {
    const gh = this.ghost, W = g.W, R = g.R, h = g.human;
    if (gh.tile < 0 || !h) return;
    const x = (gh.tile % W + 0.5) * z + ox, y = (((gh.tile / W) | 0) + 0.5) * z + oy;
    const s = within(8 + z * 3.2, 18, 30) * 1.3, t = gh.type, bad = !gh.ok;
    const rout = t === UT.HYDRO ? R.hydroOut : t === UT.ATOM ? R.atomOut : t === UT.CRUISE ? R.cruiseOut : t === UT.LASER ? R.laserOut : 0;
    const rin = t === UT.HYDRO ? R.hydroIn : t === UT.ATOM ? R.atomIn : t === UT.CRUISE ? R.cruiseIn : t === UT.LASER ? R.laserIn : 0;
    if (t >= UT.ATOM && t !== UT.LASER) {
      // a bomb from a silo: the full picture while you are still choosing the target. The flight path
      // from the silo (red where hostile air defence reaches it), the blast, and every air defence in
      // sight with its reach: the enemy's in violet, your own and your allies' in green.
      const keep = this.aim;
      this.aim = { tile: gh.tile, type: t, ok: gh.ok, silo: gh.silo || null };
      this.drawAim(ctx, g, z, ox, oy, now);
      this.aim = keep;
    } else if (rout) {
      telegraph(ctx, x, y, rin * z, rout * z, bad ? '200,208,216' : REL.aim, now);
    } else if (t <= UT.FACTORY) {
      // what the building would cover: a defence post its stretch of border, an air defence its sky
      const reach = t === UT.DEFENSE ? R.defense : t === UT.SAM ? g.samRange({ level: 1 }) : 0;
      if (reach && !bad) {
        ctx.beginPath(); ctx.arc(x, y, reach * z, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
      }
      // Railways: a factory ties in every station (city, port, factory) within its reach, and a
      // new city or port is tied to a factory in reach. Shown before the building is placed.
      if (t === UT.FACTORY || t === UT.CITY || t === UT.PORT) {
        const gx = gh.tile % W, gy = (gh.tile / W) | 0, rr = R.rail * R.rail;
        if (t === UT.FACTORY) {
          ctx.beginPath(); ctx.arc(x, y, R.rail * z, 0, 6.2832);
          ctx.fillStyle = 'rgba(255,214,120,.06)'; ctx.fill();
          ctx.setLineDash([8, 6]); ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(255,214,120,.85)'; ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,214,120,.9)';
        if (!bad) for (const u of h.units) {
          if (!u.built || !(t === UT.FACTORY ? G.isStation(u.type) : u.type === UT.FACTORY)) continue;
          const dx = u.x - gx, dy = u.y - gy;
          if (dx * dx + dy * dy > rr) continue;
          const ux = (u.x + 0.5) * z + ox, uy = (u.y + 0.5) * z + oy;
          ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ux, uy); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(ux, uy, s / 2 + 2, 0, 6.2832); ctx.stroke();
        }
      }
      // the room this building keeps free around itself
      ctx.beginPath(); ctx.arc(x, y, R.structDist * z, 0, 6.2832);
      ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = bad ? 'rgba(255,120,110,.7)' : 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.setLineDash([]);
    }
    // a dark rim first, so the marker stands out on any colour of land
    ctx.beginPath(); ctx.arc(x, y, s / 2 + 3, 0, 6.2832);
    ctx.fillStyle = 'rgba(13,20,27,.85)'; ctx.fill();
    shape(ctx, t <= UT.FACTORY ? t : UT.CITY, x, y, s / 2);
    ctx.fillStyle = bad ? '#e02a20' : h.cssD; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = bad ? '#ffd0cb' : '#fff'; ctx.stroke();
    ctx.fillStyle = '#fff';
    glyph(ctx, gh.icon, x, y, s * 0.62);
    // the label on a pill: name and price, or the reason it cannot be built
    ctx.font = '700 13px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = ctx.measureText(gh.text).width + 16, ty = y + s / 2 + 18;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - tw / 2, ty - 11, tw, 22, 11); else ctx.rect(x - tw / 2, ty - 11, tw, 22);
    ctx.fillStyle = bad ? 'rgba(150,24,18,.95)' : 'rgba(13,20,27,.9)'; ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillText(gh.text, x, ty + 0.5);
  };

  // Railways: a gravel bed, sleepers and two rails once you are close enough; a plain line from far away.
  // The line a track is drawn along and a train rides on: the straight stretches of the route
  // with every bend rounded off into a curve, as a chain of points in tile coordinates. Each
  // point also knows which step of the route (`ps`) it stands for, so a train at step 17.4 of
  // its route can be put exactly on the drawn rail instead of beside it.
  function railGeo(e, W) {
    const path = e.path;
    if (e.geo && e.geo.of === path) return e.geo;
    const c = path.pts || path, n = c.length, px = [], py = [], idx = [0];
    for (let i = 0; i < n; i++) { px.push(c[i] % W); py.push((c[i] / W) | 0); }
    for (let i = 1; i < n; i++) idx.push(idx[i - 1] + Math.max(Math.abs(px[i] - px[i - 1]), Math.abs(py[i] - py[i - 1])));
    const xs = [px[0]], ys = [py[0]], ps = [0];
    for (let i = 1; i < n - 1; i++) {
      const ax = px[i] - px[i - 1], ay = py[i] - py[i - 1], bx = px[i + 1] - px[i], by = py[i + 1] - py[i];
      const la = Math.hypot(ax, ay) || 1, lb = Math.hypot(bx, by) || 1;
      const r = Math.min(7, la * 0.45, lb * 0.45);                    // how far before the corner the curve begins
      const x0 = px[i] - ax / la * r, y0 = py[i] - ay / la * r, x1 = px[i] + bx / lb * r, y1 = py[i] + by / lb * r;
      const p0 = idx[i] - r * (idx[i] - idx[i - 1]) / la, p1 = idx[i] + r * (idx[i + 1] - idx[i]) / lb;
      for (let k = 0; k <= 8; k++) {
        const t = k / 8, u = 1 - t;
        xs.push(u * u * x0 + 2 * u * t * px[i] + t * t * x1); ys.push(u * u * y0 + 2 * u * t * py[i] + t * t * y1);
        ps.push(p0 + (p1 - p0) * t);
      }
    }
    xs.push(px[n - 1]); ys.push(py[n - 1]); ps.push(idx[n - 1]);
    e.geo = { of: path, xs: xs, ys: ys, ps: ps, scale: idx[n - 1] > 0 ? (path.length - 1) / idx[n - 1] : 1 };
    return e.geo;
  }
  // Where on the drawn rail is step `f` of the route?  Returns x, y and the direction of the rail there.
  function railAt(geo, f, out) {
    const ps = geo.ps, xs = geo.xs, ys = geo.ys, q = f / geo.scale;
    let lo = 0, hi = ps.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (ps[m] <= q) lo = m; else hi = m; }
    const d = ps[hi] - ps[lo], t = d > 0 ? within((q - ps[lo]) / d, 0, 1) : 0;
    out.x = xs[lo] + (xs[hi] - xs[lo]) * t; out.y = ys[lo] + (ys[hi] - ys[lo]) * t;
    out.a = Math.atan2(ys[hi] - ys[lo], xs[hi] - xs[lo]);
    return out;
  }

  View.prototype.drawRails = function (ctx, g, z, ox, oy) {
    const rails = g.rails;
    if (!rails.length) return;
    const W = g.W, x0 = -ox / z - 2, y0 = -oy / z - 2, x1 = (this.cw - ox) / z + 2, y1 = (this.ch - oy) / z + 2;
    const vis = [];
    for (const e of rails) if (!(e.x1 < x0 || e.x0 > x1 || e.y1 < y0 || e.y0 > y1)) vis.push(railGeo(e, W));
    if (!vis.length) return;
    // `off`: the same line pushed sideways, for the two rails
    const trace = function (off) {
      ctx.beginPath();
      for (const geo of vis) {
        const xs = geo.xs, ys = geo.ys, n = xs.length;
        for (let i = 0; i < n; i++) {
          let x = (xs[i] + 0.5) * z + ox, y = (ys[i] + 0.5) * z + oy;
          if (off) {
            const a = i > 0 ? i - 1 : 0, b = i < n - 1 ? i + 1 : n - 1;
            const dx = xs[b] - xs[a], dy = ys[b] - ys[a], d = Math.hypot(dx, dy) || 1;
            x += -dy / d * off; y += dx / d * off;
          }
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      }
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (z < 1.1) {
      // From very far: one thin dark line, so the networks of a whole continent do not shout.
      trace(0);
      ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(40,34,28,' + within(z * 0.5, 0.22, 0.5).toFixed(2) + ')'; ctx.stroke();
      return;
    }
    if (z < 2.4) {
      // From afar: a dark bed, sleepers showing as short cross strokes on both sides of it, and
      // one pale line for the glint of the rails.
      const base = within(z * 0.95, 1.8, 2.6);
      trace(0);
      ctx.lineCap = 'butt';
      ctx.setLineDash([Math.max(1.1, z * 0.34), Math.max(1.7, z * 0.56)]);
      ctx.lineWidth = base * 1.9; ctx.strokeStyle = 'rgba(110,98,84,.45)'; ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.lineWidth = base * 0.8; ctx.strokeStyle = 'rgba(46,40,34,.62)'; ctx.stroke();
      ctx.lineWidth = Math.max(0.6, base * 0.3); ctx.strokeStyle = 'rgba(234,230,220,.6)'; ctx.stroke();
      return;
    }
    // Close up: gravel bed, wooden sleepers, two steel rails.
    trace(0);
    ctx.lineWidth = z * 1.1; ctx.strokeStyle = 'rgba(30,25,20,.4)'; ctx.stroke();
    ctx.lineWidth = z * 0.86; ctx.strokeStyle = 'rgba(126,118,104,.8)'; ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.setLineDash([z * 0.16, z * 0.3]);
    ctx.lineWidth = z * 0.74; ctx.strokeStyle = 'rgba(75,56,38,.75)'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, z * 0.1);
    trace(z * 0.2); ctx.strokeStyle = 'rgba(226,230,236,.7)'; ctx.stroke();
    trace(-z * 0.2); ctx.stroke();
  };

  // Every kind of building has its own outline, so it can be told apart without reading the sign
  // inside: city a hexagon, port a pentagon, factory a square, defence post a shield, air defence
  // a circle, missile silo a triangle. r is half the size.
  function shape(ctx, type, x, y, r) {
    ctx.beginPath();
    if (type === UT.SAM) { ctx.arc(x, y, r * 0.94, 0, 6.2832); return; }
    if (type === UT.FACTORY) {
      const q = r * 0.86, c = r * 0.22;
      if (ctx.roundRect) ctx.roundRect(x - q, y - q, 2 * q, 2 * q, c); else ctx.rect(x - q, y - q, 2 * q, 2 * q);
      return;
    }
    if (type === UT.DEFENSE) {
      ctx.moveTo(x - r * 0.86, y - r * 0.82); ctx.lineTo(x + r * 0.86, y - r * 0.82); ctx.lineTo(x + r * 0.86, y + r * 0.1);
      ctx.quadraticCurveTo(x + r * 0.8, y + r * 0.78, x, y + r * 1.08); ctx.quadraticCurveTo(x - r * 0.8, y + r * 0.78, x - r * 0.86, y + r * 0.1);
      ctx.closePath(); return;
    }
    if (type === UT.SILO) {
      ctx.moveTo(x, y - r * 1.12); ctx.lineTo(x + r * 1.05, y + r * 0.8); ctx.lineTo(x - r * 1.05, y + r * 0.8); ctx.closePath(); return;
    }
    const n = type === UT.PORT ? 5 : 6, a0 = type === UT.PORT ? -1.5708 : 0, rr = r * (n === 5 ? 1.06 : 1.02);
    for (let i = 0; i < n; i++) {
      const a = a0 + i * 6.2832 / n, px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
    }
    ctx.closePath();
  }
  G.structShape = shape;
  // Buildings, in three steps of nearness, so the map of the world is not buried under signs:
  //   close:  the outline in the owner's colour with the white sign inside, level badge
  //   middle: the bare outline, small
  //   far:    small outlines, and what lies close together is drawn once, with a number
  View.prototype.drawStructures = function (ctx, g, z, ox, oy) {
    const cw = this.cw, ch = this.ch, T = g.ticks, h = g.human;
    const full = z >= 1.6, far = z < 1.1;
    const s = full ? within(8 + z * 3.2, 18, 30) : far ? 9 : 14;
    ctx.lineJoin = 'round';
    if (far) {
      // bucket by owner and by a coarse screen grid; the most important kind stands for the lot
      const cell = 15, bk = this.sBk || (this.sBk = new Map());
      bk.clear();
      for (const u of g.structAt.values()) {
        const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy;
        if (x < -s || y < -s || x > cw + s || y > ch + s) continue;
        const key = (u.owner.id * 4096 + ((y / cell) | 0)) * 4096 + ((x / cell) | 0);
        let e = bk.get(key);
        if (!e) { e = { n: 0, x: 0, y: 0, type: u.type, rank: 99, owner: u.owner }; bk.set(key, e); }
        e.n++; e.x += x; e.y += y;
        const rank = STRUCT_RANK[u.type];
        if (rank < e.rank) { e.rank = rank; e.type = u.type; }
      }
      for (const e of bk.values()) {
        const x = e.x / e.n, y = e.y / e.n, mine = e.owner === h;
        shape(ctx, e.type, x, y, s / 2);
        ctx.fillStyle = e.owner.cssD; ctx.fill();
        ctx.lineWidth = mine ? 2 : 1.3; ctx.strokeStyle = mine ? '#fff' : 'rgba(255,255,255,.82)'; ctx.stroke();
        if (e.n > 1) {
          ctx.font = '700 9px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(12,18,26,.8)'; ctx.strokeText(String(e.n), x + s / 2 + 1.5, y + 0.5);
          ctx.fillStyle = '#fff'; ctx.fillText(String(e.n), x + s / 2 + 1.5, y + 0.5);
        }
      }
      return;
    }
    for (const u of g.structAt.values()) {
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy;
      if (x < -s || y < -s || x > cw + s || y > ch + s) continue;
      const mine = u.owner === h;
      shape(ctx, u.type, x, y, s / 2);
      ctx.fillStyle = u.built ? u.owner.cssD : 'rgba(18,24,32,.72)'; ctx.fill();
      ctx.lineWidth = full ? (mine ? 2.6 : 1.9) : (mine ? 2 : 1.4); ctx.strokeStyle = mine ? '#fff' : 'rgba(255,255,255,.85)'; ctx.stroke();
      if (full) {
        ctx.fillStyle = u.built ? '#fff' : 'rgba(255,255,255,.6)';
        glyph(ctx, STRUCT_ICON[u.type], x, y + (u.type === UT.SILO ? s * 0.08 : 0), s * (u.type === UT.SILO ? 0.5 : 0.58));
      }
      if (!u.built) {
        const k = within((T - u.buildStart) / Math.max(1, u.buildEnd - u.buildStart), 0, 1);
        ctx.beginPath(); ctx.arc(x, y, s / 2 + 3, -1.5708, -1.5708 + 6.2832 * k);
        ctx.strokeStyle = '#f4b740'; ctx.lineWidth = 2; ctx.stroke();
      } else if (full && u.level > 1) {
        const digits = u.level > 99 ? 3 : u.level > 9 ? 2 : 1;
        const bx = x + s * 0.46, by = y + s * 0.46, br = Math.max(5, s * 0.28) * (digits > 1 ? 1.3 : 1);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832);
        ctx.fillStyle = '#10161d'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(br * (digits === 1 ? 1.5 : digits === 2 ? 1.15 : 0.85)) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(u.level), bx, by + 0.5);
      }
    }
  };

  // The water a ship has crossed. A troop boat keeps its whole course in its owner's colour until it
  // lands (as in OpenFront); warships and merchants trail a short streak of foam.
  View.prototype.drawWakes = function (ctx, g, z, ox, oy, alpha) {
    const us = g.units, W = g.W, cw = this.cw, ch = this.ch;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    for (let i = 0; i < us.length; i++) {
      const u = us[i], ty = u.type;
      if (!u.active || !u.path || (ty !== UT.TRANSPORT && ty !== UT.WARSHIP && ty !== UT.TRADE)) continue;
      const p = u.path, end = Math.min(u.pi, p.length - 1);
      const hx = (u.vx + 0.5) * z + ox, hy = (u.vy + 0.5) * z + oy;
      if (ty === UT.TRANSPORT) {
        if (end < 1) continue;
        const step = Math.max(1, Math.round(2.5 / z));
        ctx.beginPath();
        for (let k = 0; k < end - 2; k += step) {
          const x = (p[k] % W + 0.5) * z + ox, y = (((p[k] / W) | 0) + 0.5) * z + oy;
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.lineTo(hx, hy);
        // The route a boat has sailed is background information: faint enough not to compete
        // with borders and buildings, still clear enough to follow.
        // The course of a troop boat is worth seeing at a glance: a dark edge, the owner's
        // colour on top, a light core. What lies ahead is dashed, and a ring marks the landing.
        // Own boats are drawn in full; those of others are a thin line, fainter the further out.
        const own = u.owner === g.human, fa = own ? 1 : within(z / 2.2, 0.3, 0.75);
        if (own) { ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(3.2, z * 1.3); ctx.strokeStyle = 'rgba(8,14,22,1)'; ctx.stroke(); }
        ctx.globalAlpha = 0.95 * fa;
        ctx.lineWidth = own ? Math.max(2, z * 0.9) : Math.max(1.1, z * 0.6); ctx.strokeStyle = u.owner.cssB || u.owner.css; ctx.stroke();
        if (own) { ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(0.7, z * 0.26); ctx.strokeStyle = '#fff'; ctx.stroke(); }
        if (own && !u.retreat && end < p.length - 1) {
          ctx.beginPath(); ctx.moveTo(hx, hy);
          for (let k = end + 2; k < p.length; k += step) ctx.lineTo((p[k] % W + 0.5) * z + ox, (((p[k] / W) | 0) + 0.5) * z + oy);
          const lt = p[p.length - 1], lx = (lt % W + 0.5) * z + ox, ly = (((lt / W) | 0) + 0.5) * z + oy;
          ctx.lineTo(lx, ly);
          ctx.setLineDash([6, 5]);
          ctx.globalAlpha = 0.5; ctx.lineWidth = Math.max(3, z * 1.1); ctx.strokeStyle = 'rgba(8,14,22,1)'; ctx.stroke();
          ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(1.6, z * 0.6); ctx.strokeStyle = u.owner.cssB || u.owner.css; ctx.stroke();
          ctx.setLineDash([]);
          ctx.beginPath(); ctx.arc(lx, ly, Math.max(5, z * 1.6), 0, 6.2832);
          ctx.globalAlpha = 0.9; ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,14,22,1)'; ctx.stroke();
          ctx.lineWidth = 2; ctx.strokeStyle = u.owner.cssB || u.owner.css; ctx.stroke();
        }
        ctx.globalAlpha = 1;
        continue;
      }
      if (hx < -60 || hy < -60 || hx > cw + 60 || hy > ch + 60 || z < 1.3 || u.st !== g.ticks) continue;
      // A ship under way pushes two short lines of foam out from the stern, like the arms of a
      // V. Nothing more: the long white streak belonged to a speedboat, not to a ship of war.
      const s = ty === UT.WARSHIP ? within(4 + z * 2.2, 7, 17) * 0.95 : within(3 + z * 1.6, 5, 12) * 0.56;
      const ca = Math.cos(u.va), sa = Math.sin(u.va), len = s * 0.75, sp = s * 0.5;
      const bx = hx - ca * s * 0.95, by = hy - sa * s * 0.95;
      ctx.beginPath();
      ctx.moveTo(bx - sa * s * 0.16, by + ca * s * 0.16); ctx.lineTo(bx - ca * len - sa * sp, by - sa * len + ca * sp);
      ctx.moveTo(bx + sa * s * 0.16, by - ca * s * 0.16); ctx.lineTo(bx - ca * len + sa * sp, by - sa * len - ca * sp);
      ctx.lineWidth = Math.max(1, s * 0.13); ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.stroke();
    }
  };

  // A hull seen from above, pointing along the ship's course.
  function hull(ctx, x, y, ang, s, kind) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.beginPath();
    if (kind === 'war') {
      ctx.moveTo(-1.05, -0.4); ctx.lineTo(0.35, -0.44); ctx.lineTo(1.2, 0); ctx.lineTo(0.35, 0.44); ctx.lineTo(-1.05, 0.4); ctx.lineTo(-0.85, 0);
    } else if (kind === 'boat') {
      ctx.moveTo(-0.8, -0.46); ctx.lineTo(0.2, -0.46); ctx.lineTo(1, 0); ctx.lineTo(0.2, 0.46); ctx.lineTo(-0.8, 0.46);
    } else {
      ctx.moveTo(-1, -0.5); ctx.lineTo(0.5, -0.5); ctx.quadraticCurveTo(1.15, -0.3, 1.2, 0); ctx.quadraticCurveTo(1.15, 0.3, 0.5, 0.5); ctx.lineTo(-1, 0.5);
    }
    ctx.closePath();
    ctx.restore();
  }

  // ---------- how ships sit on the water ----------
  // A route is a chain of tiles, eight directions only. Drawn tile by tile a ship zigzags and its
  // bow snaps round by 45 degrees every step, which is what made the sea look nervous. So the
  // picture glides along the route instead: the position is the average of a short stretch of
  // the route around the ship, the heading is the direction of that stretch, and the heading
  // is eased from frame to frame.
  function routeAt(path, W, f, out) {
    const n = path.length - 1;
    if (f <= 0) { out.x = path[0] % W; out.y = (path[0] / W) | 0; return out; }
    if (f >= n) { out.x = path[n] % W; out.y = (path[n] / W) | 0; return out; }
    const i = f | 0, fr = f - i, a = path[i], b = path[i + 1];
    const ax = a % W, ay = (a / W) | 0;
    out.x = ax + (b % W - ax) * fr; out.y = ay + (((b / W) | 0) - ay) * fr;
    return out;
  }
  const RA = { x: 0, y: 0 }, RB = { x: 0, y: 0 };
  View.prototype.pose = function (g, u, alpha) {
    const path = u.path, W = g.W;
    let x, y, ang = u.va;
    if (path && path.length > 1 && path[u.pi] === u.tile) {
      const n = path.length - 1, dir = u.retreat ? -1 : 1;
      // `mv` is the part of the next tile already covered; while the ship is under way the
      // frame adds what the running tick will bring
      const rate = g.pace * (u.hunt ? 2 : 1), going = u.st === g.ticks;
      const f = within(u.pi + dir * ((u.mv || 0) + (going ? alpha * rate : 0)), 0, n);
      const w = Math.min(3.5, f, n - f);                 // the stretch shrinks to nothing at both ends
      let sx = 0, sy = 0;
      for (let k = -2; k <= 2; k++) { routeAt(path, W, f + k * w * 0.5, RA); sx += RA.x; sy += RA.y; }
      x = sx / 5; y = sy / 5;
      const l = Math.max(1.2, w);
      routeAt(path, W, f - l, RA); routeAt(path, W, f + l, RB);
      if (RB.x !== RA.x || RB.y !== RA.y) ang = Math.atan2((RB.y - RA.y) * dir, (RB.x - RA.x) * dir);
    } else {
      x = u.px + (u.x - u.px) * alpha; y = u.py + (u.y - u.py) * alpha;
      if (u.x !== u.px || u.y !== u.py) ang = Math.atan2(u.y - u.py, u.x - u.px);
    }
    if (ang === undefined) ang = 0;
    if (u.va === undefined || u.vf !== this.frame - 1) u.va = ang;        // first sight: no easing in from nowhere
    else {
      let d = ang - u.va;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      u.va += d * 0.14;
    }
    u.vf = this.frame; u.vx = x; u.vy = y;
  };

  // A warship, seen from above: a long grey hull with a sharp bow and a square stern, a deck in
  // the owner's colour, a bridge amidships and two gun turrets that turn towards whatever the
  // ship is fighting. `s` is half the length of the hull on the screen.
  function warship(ctx, x, y, ang, s, p, aim) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const hullPath = function (k) {
      ctx.beginPath();
      ctx.moveTo(-1 * s * k, -0.27 * s * k); ctx.lineTo(0.42 * s * k, -0.3 * s * k);
      ctx.quadraticCurveTo(0.8 * s * k, -0.2 * s * k, 1.08 * s * k, 0);
      ctx.quadraticCurveTo(0.8 * s * k, 0.2 * s * k, 0.42 * s * k, 0.3 * s * k);
      ctx.lineTo(-1 * s * k, 0.27 * s * k); ctx.closePath();
    };
    hullPath(1);
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2.6, s * 0.3); ctx.strokeStyle = '#0d1319'; ctx.stroke();      // dark edge: shows on any water
    ctx.fillStyle = '#9aa5b0'; ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.11); ctx.strokeStyle = p.cssB; ctx.stroke();           // whose it is
    hullPath(0.72);
    ctx.fillStyle = p.css; ctx.fill();                                                       // deck
    if (s >= 7) {
      // bridge and funnel
      ctx.fillStyle = '#39424c'; ctx.fillRect(-0.3 * s, -0.15 * s, 0.5 * s, 0.3 * s);
      ctx.fillStyle = '#c9d1d9'; ctx.fillRect(-0.02 * s, -0.09 * s, 0.17 * s, 0.18 * s);
      ctx.fillStyle = '#12181e'; ctx.beginPath(); ctx.arc(-0.2 * s, 0, 0.07 * s, 0, 6.2832); ctx.fill();
    } else {
      ctx.fillStyle = '#2a323b'; ctx.fillRect(-0.24 * s, -0.13 * s, 0.4 * s, 0.26 * s);
    }
    // turrets fore and aft; at rest the after one points astern
    const tr = Math.max(1.2, s * 0.12), bl = s * 0.3;
    for (let i = 0; i < 2; i++) {
      const tx = i ? -0.66 * s : 0.56 * s, ta = aim === null ? (i ? Math.PI : 0) : aim;
      ctx.beginPath(); ctx.moveTo(tx, 0); ctx.lineTo(tx + Math.cos(ta) * bl, Math.sin(ta) * bl);
      ctx.lineWidth = Math.max(1, s * 0.07); ctx.strokeStyle = '#0d1319'; ctx.lineCap = 'butt'; ctx.stroke();
      ctx.beginPath(); ctx.arc(tx, 0, tr, 0, 6.2832); ctx.fillStyle = '#20272e'; ctx.fill();
    }
    ctx.restore();
  }

  // A rocket or bomb in flight, nose along `ang`. `kind`: 0 cruise missile (slim, swept wings),
  // 1 atom bomb, 2 hydrogen bomb (stubby, tail fins).
  // A missile seen from above. No outline and no toy colours: a slim body of dull metal that catches
  // the light along its back, small fins, a narrow band in the colour of the weapon, a glowing
  // exhaust and a position light that blinks. kind 0: cruise missile with wings, 1/2: ballistic.
  function rocket(ctx, x, y, ang, len, col, kind, flame, blink) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const w = kind ? len * 0.2 : len * 0.12, tail = -len * 0.5;
    if (flame > 0) {
      // exhaust: a soft glow with a white-hot core, flickering in length
      const fl = len * (kind ? 0.9 : 0.6) * (0.7 + 0.3 * flame);
      const gr = ctx.createRadialGradient(tail, 0, 0, tail - fl * 0.35, 0, fl);
      gr.addColorStop(0, 'rgba(255,250,230,.95)'); gr.addColorStop(0.25, 'rgba(255,196,96,.7)'); gr.addColorStop(0.6, 'rgba(' + col + ',.28)'); gr.addColorStop(1, 'rgba(' + col + ',0)');
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.ellipse(tail - fl * 0.4, 0, fl, w * 1.5 + fl * 0.16, 0, 0, 6.2832); ctx.fill();
      ctx.beginPath(); ctx.moveTo(tail, -w * 0.3); ctx.lineTo(tail - fl * 0.55, 0); ctx.lineTo(tail, w * 0.3); ctx.closePath();
      ctx.fillStyle = 'rgba(255,252,240,.95)'; ctx.fill();
    }
    // fins or wings, dark, under the body
    ctx.beginPath();
    if (kind === 0) {
      ctx.moveTo(len * 0.06, 0); ctx.lineTo(-len * 0.14, -len * 0.3); ctx.lineTo(-len * 0.22, -len * 0.3); ctx.lineTo(-len * 0.1, 0);
      ctx.lineTo(-len * 0.22, len * 0.3); ctx.lineTo(-len * 0.14, len * 0.3); ctx.closePath();
      ctx.moveTo(-len * 0.38, 0); ctx.lineTo(tail, -len * 0.13); ctx.lineTo(tail, len * 0.13); ctx.closePath();
    } else {
      ctx.moveTo(-len * 0.26, 0); ctx.lineTo(tail, -w * 1.25); ctx.lineTo(tail + len * 0.05, 0); ctx.lineTo(tail, w * 1.25); ctx.closePath();
    }
    ctx.fillStyle = '#20262d'; ctx.fill();
    // the body: a long ogive
    ctx.beginPath();
    ctx.moveTo(tail, -w * 0.5); ctx.lineTo(len * 0.12, -w * 0.5);
    ctx.quadraticCurveTo(len * 0.4, -w * 0.4, len * 0.5, 0);
    ctx.quadraticCurveTo(len * 0.4, w * 0.4, len * 0.12, w * 0.5);
    ctx.lineTo(tail, w * 0.5); ctx.closePath();
    const bg = ctx.createLinearGradient(0, -w * 0.5, 0, w * 0.5);
    bg.addColorStop(0, '#59626c'); bg.addColorStop(0.35, '#c9d0d8'); bg.addColorStop(0.55, '#8d96a0'); bg.addColorStop(1, '#2c333b');
    ctx.fillStyle = bg; ctx.fill();
    ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(10,14,18,.75)'; ctx.stroke();
    // a narrow band says which weapon it is
    ctx.fillStyle = 'rgba(' + col + ',.95)';
    ctx.fillRect(-len * 0.05, -w * 0.5, len * 0.06, w);
    if (kind === 2) ctx.fillRect(-len * 0.2, -w * 0.5, len * 0.035, w);
    // position light
    if (blink) {
      const lr = Math.max(1.4, len * 0.07);
      const lg = ctx.createRadialGradient(len * 0.3, 0, 0, len * 0.3, 0, lr * 4);
      lg.addColorStop(0, 'rgba(255,255,255,1)'); lg.addColorStop(0.25, 'rgba(255,90,70,.85)'); lg.addColorStop(1, 'rgba(255,60,40,0)');
      ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(len * 0.3, 0, lr * 4, 0, 6.2832); ctx.fill();
    }
    ctx.restore();
  }

  View.prototype.drawUnits = function (ctx, g, z, ox, oy, alpha, now) {
    const cw = this.cw, ch = this.ch, us = g.units;
    const ws = within(4 + z * 2.2, 7, 17), bs = within(3 + z * 1.6, 5, 12);
    this.frame = (this.frame || 0) + 1;
    for (let i = 0; i < us.length; i++) {
      const u = us[i], ty = u.type;
      if (u.active && (ty === UT.WARSHIP || ty === UT.TRANSPORT || ty === UT.TRADE)) this.pose(g, u, alpha);
    }
    this.drawWakes(ctx, g, z, ox, oy, alpha);
    ctx.lineJoin = 'round';
    for (let i = 0; i < us.length; i++) {
      const u = us[i], ty = u.type;
      if (!u.active || ty <= UT.FACTORY) continue;
      if (ty >= UT.ATOM) { this.drawMissile(ctx, g, u, z, ox, oy, alpha, now); continue; }
      const sea = ty === UT.WARSHIP || ty === UT.TRANSPORT || ty === UT.TRADE;
      const x = ((sea ? u.vx : u.px + (u.x - u.px) * alpha) + 0.5) * z + ox, y = ((sea ? u.vy : u.py + (u.y - u.py) * alpha) + 0.5) * z + oy;
      if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
      const p = u.owner;
      const ang = sea ? u.va : 0;
      if (z < 1.1 && p !== g.human && ty !== UT.SHELL) {
        // seen from afar, other people's traffic is not worth a picture: trains and merchants
        // are left out, warships and troop boats are a dot in their owner's colour
        if (ty === UT.WARSHIP || ty === UT.TRANSPORT) {
          ctx.beginPath(); ctx.arc(x, y, ty === UT.WARSHIP ? 2.6 : 2, 0, 6.2832);
          ctx.fillStyle = p.cssB; ctx.fill();
          ctx.lineWidth = 0.8; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.stroke();
        }
        continue;
      }
      if (ty === UT.SHELL) {
        // a shell: a short glowing streak along its flight, not a dot
        const dx = u.x - u.px, dy = u.y - u.py, d = Math.hypot(dx, dy) || 1, len = within(z * 2.2, 6, 13);
        const bx = x - dx / d * len, by = y - dy / d * len;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(x, y);
        ctx.lineWidth = 3.6; ctx.strokeStyle = 'rgba(255,120,30,.38)'; ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - dx / d * len * 0.55, y - dy / d * len * 0.55); ctx.lineTo(x, y);
        ctx.lineWidth = 1.7; ctx.strokeStyle = '#ffe9a8'; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, 1.5, 0, 6.2832); ctx.fillStyle = '#fff'; ctx.fill();
        continue;
      }
      if (ty === UT.WARSHIP) {
        const s = ws * 0.95, tg = u.target && u.target.active && u.target.type !== UT.TRADE ? u.target : null;
        warship(ctx, x, y, ang, s, p, tg ? Math.atan2(tg.y - u.y, tg.x - u.x) - ang : null);
        if (u.hp < 1000) {
          ctx.fillStyle = '#10161d'; ctx.fillRect(x - ws / 2 - 1, y + ws * 0.85 - 1, ws + 2, 5);
          ctx.fillStyle = u.hp < 400 ? '#ff6b5e' : u.hp < 750 ? '#f4b740' : '#63d391'; ctx.fillRect(x - ws / 2, y + ws * 0.85, ws * u.hp / 1000, 3);
        }
        if (u.repair) {
          // heading for the quay or lying there: a small spanner-coloured ring
          ctx.beginPath(); ctx.arc(x, y, s * 1.45, 0, 6.2832);
          ctx.setLineDash([3, 3]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(244,183,64,.9)'; ctx.stroke(); ctx.setLineDash([]);
        }
      } else if (ty === UT.TRANSPORT) {
        hull(ctx, x, y, ang, bs * 0.72, 'boat');
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = p.cssD; ctx.stroke();
      } else if (ty === UT.TRAIN) {
        this.drawTrain(ctx, g, u, z, ox, oy, alpha);
      } else if (ty === UT.TRADE) {
        // Whose ship it is has to be readable from the hull, not from a hairline: the body is the
        // owner's colour with a deep rim of the same, and the cargo is a light spot amidships.
        const s = bs * 0.72;
        hull(ctx, x, y, ang, s, 'trade');
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = Math.max(1.4, s * 0.22); ctx.strokeStyle = p.cssD; ctx.stroke();
        ctx.fillStyle = u.captured ? '#f4b740' : '#fdfaf0';
        const r = Math.max(1.1, s * 0.3);
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
        ctx.lineWidth = Math.max(0.8, s * 0.12); ctx.strokeStyle = p.cssD; ctx.stroke();
        if (z >= 4.5) {
          ctx.font = '700 ' + within(z * 1.6, 9, 13).toFixed(0) + 'px ' + FONT;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13,20,27,.8)'; ctx.strokeText(G.fmt(u.gold), x, y - s * 0.8);
          ctx.fillStyle = '#fff'; ctx.fillText(G.fmt(u.gold), x, y - s * 0.8);
        }
      } else {
        ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 6.2832);
        ctx.fillStyle = '#fff'; ctx.fill();
      }
    }
  };

  // An engine pulling two wagons along the track.
  const RP = { x: 0, y: 0, a: 0 };
  View.prototype.drawTrain = function (ctx, g, u, z, ox, oy, alpha) {
    const n = u.edge.path.length, dir = u.fwd ? 1 : -1, p = u.owner, geo = railGeo(u.edge, g.W);
    // glide between tiles the way ships do: `mv` is the part of the next tile already covered
    const head = within(u.pi + dir * ((u.mv || 0) + (u.st === g.ticks ? alpha * g.pace : 0)), 0, n - 1);
    // Big enough to make out even on a map zoomed right out, where a train used to be three
    // specks melting into the track.
    const L = Math.max(9.5, z * 1.45), B = Math.max(4.5, z * 0.86);
    // Keep the carriages a carriage-length apart on the screen, not a fixed number of tiles,
    // so they stay separate instead of piling up when zoomed out.
    const gap = Math.max(1.55, L * 1.3 / z);
    for (let k = 2; k >= 0; k--) {
      railAt(geo, within(head - dir * k * gap, 0, n - 1), RP);
      const x = (RP.x + 0.5) * z + ox, y = (RP.y + 0.5) * z + oy;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(RP.a);
      // dark skirt, so the carriage lifts off the track and the land underneath
      ctx.fillStyle = 'rgba(16,14,12,.5)';
      ctx.fillRect(-L / 2 - 1.2, -B / 2 - 1.2, L + 2.4, B + 2.4);
      ctx.fillStyle = k ? p.cssB : p.css;
      ctx.fillRect(-L / 2, -B / 2, L, B);
      ctx.lineWidth = 1.2; ctx.strokeStyle = k ? 'rgba(255,255,255,.8)' : '#fff'; ctx.strokeRect(-L / 2, -B / 2, L, B);
      if (!k) { ctx.fillStyle = '#fff'; ctx.fillRect(dir * L * 0.14 - L * 0.16, -B * 0.28, L * 0.32, B * 0.56); }
      ctx.restore();
    }
  };

  // The two blast radii of a bomb, for the mark on the ground.
  const blast = function (R, ty) {
    if (ty === UT.HYDRO) return [R.hydroIn, R.hydroOut];
    if (ty === UT.ATOM) return [R.atomIn, R.atomOut];
    if (ty === UT.CRUISE) return [R.cruiseIn, R.cruiseOut];
    if (ty === UT.WARHEAD) return [R.headIn, R.headOut];
    return null;
  };
  // Where your own bomb will land: a thin dashed ring, no fuss.
  View.prototype.drawImpact = function (ctx, g, u, z, ox, oy) {
    const b = blast(g.R, u.type);
    if (!b) return;
    const h = g.human;
    if (h && u.owner !== h && !g.friendly(u.owner, h)) return;   // that one gets the warning instead
    const ty = u.type;
    const col = ty === UT.ATOM ? '255,86,64' : ty === UT.HYDRO ? '255,150,40' : ty === UT.CRUISE ? '110,215,255' : '206,120,255';
    const x = (u.dx + 0.5) * z + ox, y = (u.dy + 0.5) * z + oy, r = b[1] * z;
    if (x + r < -40 || y + r < -40 || x - r > this.cw + 40 || y - r > this.ch + 40) return;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
    ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(' + col + ',0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.setLineDash([]);
  };

  // Every bomb in the air shows where it will land, as in OpenFront: the two rings of its blast in
  // red (an enemy's), green (your own) or yellow (an ally's). A bomb aimed at you also shows the
  // seconds left, and the reach of your own air defence appears so you can see what is covered.
  View.prototype.drawIncoming = function (ctx, g, z, ox, oy, alpha, now) {
    const h = g.human;
    if (!h || !g.nukes.length) return;
    let threat = false;
    for (const u of g.nukes) {
      if (!u.active || u.owner === h || g.friendly(u.owner, h) || u.type === UT.LASER) continue;
      if (u.tid === h.id || g.owner[u.dy * g.W + u.dx] === h.id) { threat = true; break; }
    }
    if (threat && !this.aim && !(this.ghost && this.ghost.type >= UT.ATOM)) this.drawSamRings(ctx, g, z, ox, oy, now, 'self');
    const fs = within(z * 2.6, 12, 16);
    for (const u of g.nukes) {
      if (!u.active || u.type === UT.LASER) continue;
      const b = blast(g.R, u.type);
      if (!b) continue;
      const x = (u.dx + 0.5) * z + ox, y = (u.dy + 0.5) * z + oy, r = b[1] * z;
      if (x + r < -40 || y + r < -40 || x - r > this.cw + 40 || y - r > this.ch + 40) continue;
      const mine = u.owner === h, friend = !mine && g.friendly(u.owner, h);
      telegraph(ctx, x, y, b[0] * z, r, mine ? REL.self : friend ? REL.ally : REL.enemy, now);
      if (mine || friend) continue;
      // ticks still to run: the wait before it drops, then the rest of the flight
      const left = (u.delay || 0) + Math.max(0, (1 - Math.min(1, u.prog + alpha * u.speed / u.dist)) * u.dist / u.speed);
      const sec = left / 10;                                        // ten ticks to the second
      const label = (sec >= 10 ? Math.round(sec) : sec.toFixed(1)) + ' s';
      ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,12,18,.85)'; ctx.strokeText(label, x, y);
      ctx.fillStyle = '#fff'; ctx.fillText(label, x, y);
    }
  };

  View.prototype.drawMissile = function (ctx, g, u, z, ox, oy, alpha, now) {
    if (u.type === UT.LASER) {
      // the beam gathering: a ring closes in on the target while a thin ray comes down from above
      const x = (u.dx + 0.5) * z + ox, y = (u.dy + 0.5) * z + oy, k = 1 - Math.max(0, u.fuse - alpha) / 30;
      const r = (g.R.laserOut * (2.2 - 1.2 * k)) * z;
      if (x < -r || y < -r || x > this.cw + r || y > this.ch + r) return;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.lineWidth = 2 + 2 * k; ctx.strokeStyle = 'rgba(120,235,255,' + (0.35 + 0.6 * k).toFixed(2) + ')'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, g.R.laserIn * z, 0, 6.2832);
      ctx.fillStyle = 'rgba(120,235,255,' + (0.08 + 0.2 * k).toFixed(2) + ')'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y);
      ctx.lineWidth = 1 + 2 * k; ctx.strokeStyle = 'rgba(190,245,255,' + (0.25 + 0.5 * k).toFixed(2) + ')'; ctx.stroke();
      return;
    }
    this.drawImpact(ctx, g, u, z, ox, oy);
    if (u.delay > 0) return;
    const ty = u.type, prog = Math.min(1, u.prog + alpha * u.speed / u.dist);
    const liftMax = Math.min(u.dist * 0.28, 70) * (ty === UT.CRUISE ? 0.12 : 1);
    const col = ty === UT.ATOM ? '255,86,64' : ty === UT.HYDRO ? '255,150,40' : ty === UT.CRUISE ? '110,215,255' : '206,120,255';
    const sx = (u.sx + 0.5) * z + ox, sy = (u.sy + 0.5) * z + oy;
    const ex = (u.dx + 0.5) * z + ox, ey = (u.dy + 0.5) * z + oy;
    if (Math.max(sx, ex) < -80 || Math.min(sx, ex) > this.cw + 80 || Math.max(sy, ey) < -200 || Math.min(sy, ey) > this.ch + 80) return;
    const steps = ty === UT.WARHEAD ? 6 : 22;
    let x = sx, y = sy;
    if (ty === UT.WARHEAD) {
      ctx.beginPath(); ctx.moveTo(sx, sy);
      for (let i = 1; i <= steps; i++) {
        const q = prog * i / steps;
        x = sx + (ex - sx) * q; y = sy + (ey - sy) * q - Math.sin(Math.PI * q) * liftMax * z;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(' + col + ',0.5)'; ctx.lineWidth = 1; ctx.stroke();
    } else {
      // The trail is smoke, not a drawn line: it thins out and fades the older it is, and only
      // the last stretch behind the engine still glows in the colour of the weapon.
      ctx.lineCap = 'round';
      let px = sx, py = sy;
      for (let i = 1; i <= steps; i++) {
        const f = i / steps, q = prog * f;
        x = sx + (ex - sx) * q; y = sy + (ey - sy) * q - Math.sin(Math.PI * q) * liftMax * z;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y);
        ctx.strokeStyle = 'rgba(232,235,240,' + (0.07 + 0.5 * f * f).toFixed(3) + ')';
        ctx.lineWidth = 0.8 + 2.6 * (1 - f) + (f > 0.9 ? 0.6 : 0); ctx.stroke();
        if (f > 0.8) { ctx.strokeStyle = 'rgba(' + col + ',' + ((f - 0.8) * 3.6).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.stroke(); }
        px = x; py = y;
      }
      ctx.lineCap = 'butt';
      // its shadow runs along the ground below, so the height of the arc can be read
      const gx = sx + (ex - sx) * prog, gy = sy + (ey - sy) * prog, hgt = Math.sin(Math.PI * prog);
      ctx.beginPath(); ctx.ellipse(gx, gy, 3 + 2.5 * hgt, 1.6 + 1.2 * hgt, 0, 0, 6.2832);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.3 - 0.16 * hgt).toFixed(3) + ')'; ctx.fill();
    }
    if (ty === UT.WARHEAD) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832);
      ctx.fillStyle = 'rgb(' + col + ')'; ctx.fill();
      return;
    }
    // the nose points along the arc it is flying
    const ang = Math.atan2((ey - sy) - Math.cos(Math.PI * prog) * Math.PI * liftMax * z, ex - sx);
    const flick = 0.5 + 0.5 * Math.sin(now / 38 + u.id);
    // higher up it is nearer to the eye: it grows towards the top of the arc
    const up = 1 + 0.35 * Math.sin(Math.PI * prog) * (ty === UT.CRUISE ? 0.3 : 1);
    const blink = (now + u.id * 137) % 620 < 150;
    if (ty === UT.CRUISE) rocket(ctx, x, y, ang, within(z * 4.2, 13, 24) * up, col, 0, flick, blink);
    else if (ty === UT.ATOM) rocket(ctx, x, y, ang, within(z * 3.6, 12, 20) * up, col, 1, flick, blink);
    else if (ty === UT.HYDRO) rocket(ctx, x, y, ang, within(z * 4.6, 15, 27) * up, col, 2, flick, blink);
    else rocket(ctx, x, y, ang, within(z * 5, 16, 30) * up, col, 2, flick, blink);      // the MIRV carrier
  };

  // A warship that is destroyed: white flash, fireball, shock ring, a second blast from the magazine,
  // burning debris thrown out in an arc and a column of smoke. Every part is driven by k (0..1).
  View.prototype.drawShipBoom = function (ctx, f, x, y, z, k) {
    const u = within(z * 4.5, 16, 40), seed = (f.x * 73 + f.y * 151) | 0;
    const rnd = function (i) { const v = Math.sin(seed * 12.9898 + i * 78.233) * 43758.5453; return v - Math.floor(v); };
    // smoke first, so the fire is on top of it
    for (let i = 0; i < 7; i++) {
      const t0 = 0.12 + i * 0.05, kk = (k - t0) / (1 - t0);
      if (kk <= 0) continue;
      const sx = x + (rnd(i) - 0.5) * u * 1.4, sy = y - kk * u * (1.4 + rnd(i + 9)), r = u * (0.35 + 0.8 * kk);
      ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(52,56,62,' + (0.5 * (1 - kk)).toFixed(3) + ')'; ctx.fill();
    }
    // main blast
    if (k < 0.5) {
      const kk = k / 0.5, e = kk * (2 - kk), r = u * (0.5 + 1.5 * e);
      if (kk < 0.25) {
        ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,' + (0.9 * (1 - kk / 0.25)).toFixed(3) + ')'; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,140,40,' + (0.85 * (1 - kk)).toFixed(3) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,236,160,' + (0.95 * (1 - kk)).toFixed(3) + ')'; ctx.fill();
    }
    // magazine goes up a moment later
    if (k > 0.14 && k < 0.6) {
      const kk = (k - 0.14) / 0.46, e = kk * (2 - kk), r = u * (0.4 + 1.1 * e);
      ctx.beginPath(); ctx.arc(x + u * 0.5, y - u * 0.2, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,170,60,' + (0.8 * (1 - kk)).toFixed(3) + ')'; ctx.fill();
      ctx.beginPath(); ctx.arc(x + u * 0.5, y - u * 0.2, r * 0.45, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,250,220,' + (0.95 * (1 - kk)).toFixed(3) + ')'; ctx.fill();
    }
    // shock ring on the water
    ctx.beginPath(); ctx.ellipse(x, y, u * (0.6 + 3.2 * k), u * (0.35 + 1.8 * k), 0, 0, 6.2832);
    ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 2.5 * (1 - k) + 0.5; ctx.stroke();
    // burning debris on arcs
    for (let i = 0; i < 14; i++) {
      const ang = rnd(i + 20) * 6.2832, sp = u * (1.2 + 2.6 * rnd(i + 40)), kk = Math.min(1, k * 1.25);
      const dx = Math.cos(ang) * sp * kk, dy = Math.sin(ang) * sp * 0.55 * kk - Math.sin(Math.PI * kk) * u * (0.8 + 1.4 * rnd(i + 60));
      ctx.globalAlpha = Math.max(0, 1 - kk);
      ctx.fillStyle = i % 3 ? '#ffb347' : '#3c4048';
      const sz = Math.max(1.5, u * (0.1 + 0.12 * rnd(i + 80)));
      ctx.fillRect(x + dx - sz / 2, y + dy - sz / 2, sz, sz);
    }
    ctx.globalAlpha = 1;
  };

  View.prototype.drawFx = function (ctx, g, z, ox, oy, now) {
    const cw = this.cw, ch = this.ch;
    while (g.fx.length) {
      const f = g.fx.shift();
      f.t0 = now; this.fxList.push(f);
      if (G.onFx) {
        const x = (f.x + 0.5) * z + ox, y = (f.y + 0.5) * z + oy;
        G.onFx(f, x > -40 && y > -40 && x < cw + 40 && y < ch + 40);
      }
    }
    const list = this.fxList;
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i];
      const dur = f.k === 'shipboom' ? 2000 : f.k === 'boom' ? (f.big ? 2600 : 1100) : f.k === 'text' ? 2500 : f.k === 'coin' ? 1500 : f.k === 'flag' ? 700 : f.k === 'muzzle' ? 170 : 420, k = (now - f.t0) / dur;
      if (k >= 1 || (f.k === 'coin' && !f.mine)) { list.splice(i, 1); continue; }
      const x = (f.x + 0.5) * z + ox, y = (f.y + 0.5) * z + oy, e = k * (2 - k);
      if (f.k === 'boom') {
        const r = Math.max(6, f.r * z) * (0.3 + 0.7 * e);
        if (f.big) {
          // hydrogen bomb: the whole screen flashes, then two shock rings roll outward
          if (k < 0.22 && x > -r && y > -r && x < cw + r && y < ch + r) {
            ctx.fillStyle = 'rgba(255,246,220,' + (0.75 * (1 - k / 0.22)).toFixed(3) + ')'; ctx.fillRect(0, 0, cw, ch);
          }
          ctx.beginPath(); ctx.arc(x, y, r * (1.25 + 0.6 * k), 0, 6.2832);
          ctx.strokeStyle = 'rgba(255,240,215,' + (0.6 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 4 * (1 - k) + 1; ctx.stroke();
        }
        if (f.beam) {
          // satellite beam: a column of light from the top of the screen, cold instead of fiery
          const w = Math.max(4, f.r * z * 0.7) * (1 - k);
          ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, y);
          ctx.lineCap = 'butt';
          ctx.lineWidth = w; ctx.strokeStyle = 'rgba(120,235,255,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx.stroke();
          ctx.lineWidth = w * 0.35; ctx.strokeStyle = 'rgba(255,255,255,' + (0.95 * (1 - k)).toFixed(3) + ')'; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
          ctx.fillStyle = 'rgba(120,235,255,' + (0.6 * (1 - k)).toFixed(3) + ')'; ctx.fill();
          ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.2832);
          ctx.fillStyle = 'rgba(255,255,255,' + ((1 - k) * (1 - k)).toFixed(3) + ')'; ctx.fill();
          continue;
        }
        // a fireball that glows from white through yellow to a dull red and thins out, and a
        // crisp shock ring racing ahead of it
        const R0 = Math.max(6, f.r * z), fr = R0 * (0.25 + 0.75 * e);
        const gr = ctx.createRadialGradient(x, y, 0, x, y, fr);
        const heat = 1 - k;
        gr.addColorStop(0, 'rgba(255,255,240,' + (heat * heat).toFixed(3) + ')');
        gr.addColorStop(0.35, 'rgba(255,214,110,' + (0.9 * heat).toFixed(3) + ')');
        gr.addColorStop(0.7, 'rgba(240,110,40,' + (0.6 * heat).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(90,30,20,0)');
        ctx.beginPath(); ctx.arc(x, y, fr, 0, 6.2832); ctx.fillStyle = gr; ctx.fill();
        const sr = R0 * (0.2 + 1.25 * e);
        ctx.beginPath(); ctx.arc(x, y, sr, 0, 6.2832);
        ctx.lineWidth = 1 + 3 * heat; ctx.strokeStyle = 'rgba(255,255,255,' + (0.85 * heat).toFixed(3) + ')'; ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, sr * 0.82, 0, 6.2832);
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,230,190,' + (0.35 * heat).toFixed(3) + ')'; ctx.stroke();
      } else if (f.k === 'shipboom') {
        this.drawShipBoom(ctx, f, x, y, z, k);
      } else if (f.k === 'text') {
        // conquest reward: plain white, in place, fading out (as in OpenFront)
        ctx.globalAlpha = 1 - k;
        ctx.font = '600 17px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13,20,27,.75)'; ctx.strokeText(f.text, x, y + 8 * z);
        ctx.fillStyle = '#fff'; ctx.fillText(f.text, x, y + 8 * z);
        ctx.globalAlpha = 1;
      } else if (f.k === 'coin') {
        // income at a station or port: small text that drifts up and fades evenly
        if (f.amt && z >= 1) {
          const label = '+ ' + G.fmt(f.amt);
          ctx.globalAlpha = 1 - k;
          ctx.font = '600 ' + within(z * 2.4, 11, 14).toFixed(1) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
          ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(13,20,27,.7)'; ctx.strokeText(label, x, y - 10 - 18 * k);
          ctx.fillStyle = '#ffffff'; ctx.fillText(label, x, y - 10 - 18 * k);
          ctx.globalAlpha = 1;
        }
      } else if (f.k === 'muzzle') {
        // gun flash at the muzzle, towards the target
        const a = Math.atan2(f.ty - f.y, f.tx - f.x), r = within(z * 2.4, 6, 13) * (1 - k * 0.5);
        const mx = x + Math.cos(a) * r * 0.9, my = y + Math.sin(a) * r * 0.9;
        ctx.beginPath(); ctx.arc(mx, my, r * 0.75, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,170,60,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(mx, my, r * 0.35, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,250,220,' + (1 - k).toFixed(3) + ')'; ctx.fill();
      } else if (f.k === 'pop' && f.hit) {
        // a shell striking home: a burst of fire, then a ring of spray
        const r = within(z * 3, 7, 16);
        ctx.beginPath(); ctx.arc(x, y, r * (0.4 + 0.6 * e), 0, 6.2832);
        ctx.fillStyle = 'rgba(255,150,50,' + (0.75 * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.3 * (1 - k), 0, 6.2832);
        ctx.fillStyle = 'rgba(255,250,220,' + (1 - k).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * (0.6 + 1.1 * e), 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 1.6; ctx.stroke();
      } else if (f.k === 'flag') {
        ctx.beginPath(); ctx.arc(x, y, 4 + 16 * e, 0, 6.2832);
        ctx.strokeStyle = 'rgba(244,183,64,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 3 * (1 - k) + 1; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 3 + 13 * e, 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  };

  // Version «Rohstoffe»: the signs are only drawn once one has zoomed into a country (or picked it
  // with a click), so the map of the world stays calm. A deposit is a light round badge at its
  // spot, ringed green when it is yours; the factory good is a small plate under the country.
  const iconPaths = new Map();
  function drawIcon(ctx, id, x, y, s) {
    let ps = iconPaths.get(id);
    if (!ps) { ps = G.RES_ICON[id].map(function (l) { return [l[0], new Path2D(l[1])]; }); iconPaths.set(id, ps); }
    ctx.save(); ctx.translate(x - s / 2, y - s / 2); ctx.scale(s / 24, s / 24);
    ctx.lineWidth = 1.1; ctx.strokeStyle = 'rgba(10,16,24,0.55)'; ctx.lineJoin = 'round';
    for (const l of ps) { ctx.stroke(l[1]); ctx.fillStyle = l[0]; ctx.fill(l[1]); }
    ctx.restore();
  }
  View.prototype.drawRes = function (ctx, g, z, ox, oy) {
    const map = g.map, cs = map.countries, deps = map.deposits, cw = this.cw, ch = this.ch, sel = this.resSel || 0, h = g.human;
    const near = z >= G.RES.ZOOM, names = z >= 4;
    if (!near && !sel) return;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    const from = near ? 0 : cs[sel].deps.length ? cs[sel].deps[0] : 0, to = near ? deps.length : from + cs[sel].deps.length;
    for (let i = from; i < to; i++) {
      const d = deps[i], x = (d.x + 0.5) * z + ox, y = (d.y + 0.5) * z + oy;
      if (x < -60 || y < -30 || x > cw + 60 || y > ch + 40) continue;
      const mine = h && g.owner[d.t] === h.id, r = d.c === sel ? 13 : 11;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = '#f6f1e4'; ctx.fill();
      ctx.lineWidth = mine ? 3 : 1.6; ctx.strokeStyle = mine ? '#35c46a' : d.c === sel ? '#f4b740' : 'rgba(12,21,32,0.85)'; ctx.stroke();
      drawIcon(ctx, d.raw, x, y, r * 1.36);
      // The plant: its level in a small round badge in the colour of the holder; a dashed ring while it
      // is being built. Your own deposit without a plant gets an amber badge with a plus.
      const lv = g.dg ? g.dg.lv[i] : 0, o = g.owner[d.t];
      if (lv || mine) {
        const bx = x + r * 0.8, by = y + r * 0.8, built = lv && g.ticks >= g.dg.at[i];
        if (lv && !built) {
          ctx.save(); ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(x, y, r + 4, 0, 6.2832);
          ctx.lineWidth = 2; ctx.strokeStyle = '#f4b740'; ctx.stroke(); ctx.restore();
        }
        ctx.beginPath(); ctx.arc(bx, by, 6.5, 0, 6.2832);
        ctx.fillStyle = lv ? (o && g.players[o] ? g.players[o].css : '#888') : '#f4b740'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.font = '700 10px ' + FONT;
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(12,21,32,0.9)';
        const t = lv ? String(lv) : '+';
        ctx.strokeText(t, bx, by + 0.5); ctx.fillStyle = '#fff'; ctx.fillText(t, bx, by + 0.5);
      }
      if (names || d.c === sel) {
        const label = G.RAW[d.raw][0];
        ctx.font = '600 11.5px ' + FONT;
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(12,21,32,0.85)'; ctx.strokeText(label, x, y + r + 8);
        ctx.fillStyle = '#fff'; ctx.fillText(label, x, y + r + 8);
      }
    }
    for (let c = 1; c < cs.length; c++) {
      const k = cs[c];
      if (!k.tiles || (!near && c !== sel)) continue;
      const x = k.x * z + ox, y = k.y * z + oy + (near ? 34 : 0);
      if (x < -120 || y < -30 || x > cw + 120 || y > ch + 30) continue;
      const label = G.WARE[k.ware][0];
      ctx.font = '600 12px ' + FONT;
      const tw = ctx.measureText(label).width, w = tw + 34, hh = 22, px = x - w / 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, y - hh / 2, w, hh, 6); else ctx.rect(px, y - hh / 2, w, hh);
      ctx.fillStyle = 'rgba(12,21,32,0.86)'; ctx.fill();
      if (c === sel) { ctx.lineWidth = 1.5; ctx.strokeStyle = '#f4b740'; ctx.stroke(); }
      drawIcon(ctx, 'fabrik', px + 13, y, 15);
      ctx.textAlign = 'left'; ctx.fillStyle = '#fff'; ctx.fillText(label, px + 25, y + 0.5); ctx.textAlign = 'center';
    }
  };
  // Names, as calm as the map: black for people, dark grey for nations, lighter grey for bots,
  // no flags. A name is only drawn once it is big enough on the screen to be read (bots need to
  // be bigger than nations), the biggest come first, and a name that would lie across one
  // already drawn is left out. So zooming out thins the names instead of piling them up.
  View.prototype.drawNames = function (ctx, g, z, ox, oy) {
    const ps = g.players, h = g.human, cw = this.cw, ch = this.ch, T = g.ticks;
    let leader = null;
    const list = this.nmList || (this.nmList = []);
    list.length = 0;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (!leader || p.tiles > leader.tiles) leader = p;
      if (!p.nameSize) continue;
      const fs = p.nameSize * z, min = p === h ? 0 : p.type === PT.BOT ? 13 : p.type === PT.NATION ? 10.5 : 9;
      if (fs < min) continue;
      const x = p.nameX * z + ox, y = p.nameY * z + oy;
      if (x < -160 || y < -40 || x > cw + 160 || y > ch + 40) continue;
      list.push(p);
    }
    list.sort(function (a, b) { return (b === h) - (a === h) || b.nameSize - a.nameSize || a.id - b.id; });
    const boxes = this.nmBox || (this.nmBox = []);
    boxes.length = 0;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    let drawn = 0;
    for (let i = 0; i < list.length && drawn < 60; i++) {
      const p = list[i];
      let fs = p.nameSize * z;
      if (fs < 9) fs = 9;
      if (fs > 44) fs = 44;
      const x = p.nameX * z + ox, y = p.nameY * z + oy;
      let label = p.name;
      if (p === leader && fs >= 10 && g.phase === 'play') label = '♛ ' + label;
      if (h && p !== h && h.allies.has(p.id)) label += ' ✓';
      if (p.traitorUntil > T) label += ' !';
      ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      const hw = ctx.measureText(label).width / 2 + 2, top = y - fs * 0.95, bot = y + fs * 0.95;
      let hit = false;
      for (let k = 0; k < boxes.length; k += 4) if (x - hw < boxes[k + 2] && x + hw > boxes[k] && top < boxes[k + 3] && bot > boxes[k + 1]) { hit = true; break; }
      if (hit && p !== h) continue;
      boxes.push(x - hw, top, x + hw, bot); drawn++;
      const person = p.type === PT.HUMAN;
      ctx.lineWidth = Math.max(2, fs / 5.5);
      ctx.strokeStyle = person ? 'rgba(255,255,255,0.82)' : p.type === PT.NATION ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.34)';
      ctx.fillStyle = person ? '#06090d' : p.type === PT.NATION ? '#33383e' : '#565c63';
      ctx.strokeText(label, x, y - fs * 0.36);
      ctx.fillText(label, x, y - fs * 0.36);
      const fs2 = fs * 0.66;
      if (fs2 >= 8) {
        const tr = G.fmtTroops(p.troops);
        ctx.font = '600 ' + fs2.toFixed(1) + 'px ' + FONT;
        ctx.lineWidth = Math.max(2, fs2 / 5.5);
        ctx.strokeText(tr, x, y + fs * 0.46);
        ctx.fillText(tr, x, y + fs * 0.46);
      }
    }
  };

  // Every attack on you is marked where it comes in: a red ring pulsing on the border with an
  // exclamation mark in it, so the eye finds the spot at once, even far from where you are looking.
  View.prototype.drawRaids = function (ctx, g, z, ox, oy, now) {
    const h = g.human, W = g.W;
    if (!h || !h.inc.length) return;
    const k = 0.5 + 0.5 * Math.sin(now / 130);
    for (const at of h.inc) {
      if (!at.active || !at.front.size) continue;
      if (at.vAt === undefined || now - at.vAt > 500) {
        // the middle of the contested stretch of border, pinned to a tile that really is on it
        let sx = 0, sy = 0, c = 0;
        for (const t of at.front) { sx += t % W; sy += (t / W) | 0; if (++c >= 80) break; }
        sx /= c; sy /= c;
        let bd = Infinity, bx = sx, by = sy; c = 0;
        for (const t of at.front) {
          const x = t % W, y = (t / W) | 0, d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
          if (d < bd) { bd = d; bx = x; by = y; }
          if (++c >= 80) break;
        }
        // ease towards the new spot so the mark does not jump about as the front moves
        at.vx = at.vAt === undefined ? bx : at.vx + (bx - at.vx) * 0.5; at.vy = at.vAt === undefined ? by : at.vy + (by - at.vy) * 0.5;
        at.vAt = now;
      }
      const x = (at.vx + 0.5) * z + ox, y = (at.vy + 0.5) * z + oy;
      if (x < -30 || y < -30 || x > this.cw + 30 || y > this.ch + 30) continue;
      const r = 9 + 3 * k;
      ctx.beginPath(); ctx.arc(x, y, r + 5 + 9 * k, 0, 6.2832);
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,60,48,' + (0.55 * (1 - k)).toFixed(3) + ')'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(214,40,32,' + (0.78 + 0.2 * k).toFixed(2) + ')'; ctx.fill();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.font = '800 ' + (r * 1.5).toFixed(1) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff'; ctx.fillText('!', x, y + 0.5);
    }
  };

  // ---------- the fronts ----------
  // Where the player is fighting, a small plate on the border says how many troops are in the
  // fight and how many are still on the march there. Attacks on the player get a red plate.
  View.prototype.frontSpot = function (g, at, now) {
    const map = this.fronts || (this.fronts = new Map());
    let e = map.get(at.id);
    if (e && now - e.at < 500) return e;
    if (!e) { e = { x: 0, y: 0, ok: false, at: 0 }; map.set(at.id, e); }
    e.at = now; e.ok = false;
    const W = g.W;
    let tx, ty, n = 0;
    if (at.near >= 0) { tx = at.near % W; ty = (at.near / W) | 0; }
    else {
      let sx = 0, sy = 0;
      for (const t of at.front) { sx += t % W; sy += (t / W) | 0; if (++n >= 4000) break; }
      if (!n) return e;
      tx = sx / n; ty = sy / n;
    }
    let bd = 1e18; n = 0;
    for (const t of at.front) {
      const x = t % W, y = (t / W) | 0, d = (x - tx) * (x - tx) + (y - ty) * (y - ty);
      if (d < bd) { bd = d; e.x = x; e.y = y; e.ok = true; }
      if (++n >= 20000) break;
    }
    return e;
  };
  View.prototype.drawFronts = function (ctx, g, z, ox, oy, now) {
    const h = g.human;
    if (!h || !h.alive || g.phase !== 'play') return;
    const cw = this.cw, ch = this.ch, fmtT = G.fmtTroops;
    if (this.fronts && this.fronts.size > 64) this.fronts.clear();
    const plate = function (x, y, a, b, bad) {
      ctx.font = '700 12px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      const wa = ctx.measureText(a).width, wb = b ? ctx.measureText(b).width + 8 : 0, w = wa + wb + 16, hh = 20;
      const px = within(x - w / 2, 4, cw - w - 4), py = y - hh - 9;
      ctx.beginPath(); ctx.moveTo(x - 5, py + hh - 0.5); ctx.lineTo(x, py + hh + 6); ctx.lineTo(x + 5, py + hh - 0.5); ctx.closePath();
      ctx.fillStyle = bad ? 'rgba(120,22,16,.94)' : 'rgba(13,20,27,.92)'; ctx.fill();
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(px, py, w, hh, 6); else ctx.rect(px, py, w, hh);
      ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = bad ? 'rgba(255,150,140,.8)' : 'rgba(255,255,255,.35)'; ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillText(a, px + 8, py + hh / 2 + 0.5);
      if (b) { ctx.fillStyle = '#ffd27a'; ctx.fillText(b, px + 8 + wa + 8, py + hh / 2 + 0.5); }
    };
    for (const at of h.out) {
      if (!at.active) continue;
      const e = this.frontSpot(g, at, now);
      if (!e.ok) continue;
      const x = (e.x + 0.5) * z + ox, y = (e.y + 0.5) * z + oy;
      if (x < -40 || y < -10 || x > cw + 40 || y > ch + 40) continue;
      plate(x, y, fmtT(at.troops), at.want >= 1 ? '+' + fmtT(at.want) + ' unterwegs' : '', false);
    }
    let shown = 0;
    for (const at of h.inc) {
      if (!at.active || at.troops < 1 || shown >= 4) continue;
      const e = this.frontSpot(g, at, now);
      if (!e.ok) continue;
      const x = (e.x + 0.5) * z + ox, y = (e.y + 0.5) * z + oy;
      if (x < -40 || y < -10 || x > cw + 40 || y > ch + 40) continue;
      plate(x, y, fmtT(at.troops), '', true); shown++;
    }
  };

  View.prototype.drawMarks = function (ctx, g, z, ox, oy, now) {
    const h = g.human, W = g.W;
    if (h && h.spawned && g.phase === 'spawn' && h.spawnTile >= 0) {
      const x = (h.spawnTile % W + 0.5) * z + ox, y = (((h.spawnTile / W) | 0) + 0.5) * z + oy;
      const pulse = 0.5 + 0.5 * Math.sin(now / 260);
      const r = Math.max(16, (g.R.spawn + 2) * z) + pulse * 8;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(16,22,29,0.55)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
    if (this.mark >= 0) {
      const x = (this.mark % W + 0.5) * z + ox, y = (((this.mark / W) | 0) + 0.5) * z + oy;
      ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.2832);
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(16,22,29,0.6)'; ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
    }
  };

  // Float a line of text up from a place on the map (gold won, for example).
  View.prototype.floatText = function (x, y, text) {
    this.fxList.push({ k: 'text', x: x, y: y, text: text, t0: performance.now() });
  };

  // Preview while a bomb is being aimed: reach of every air defence, the flight path from the silo,
  // the point of impact and how far the blast goes.
  // The look of everything around bombs follows OpenFront: thin dashed rings that slowly turn,
  // in three colours by whose it is (green yours, yellow an ally's, red an enemy's), a white
  // dashed flight path that turns red where air defence can reach it, and no heavy fills.
  const REL = { self: '70,230,120', ally: '255,225,70', enemy: '255,72,60', aim: '255,255,255' };
  function dashRing(ctx, x, y, r, rgb, alpha, now, speed, width) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
    ctx.setLineDash([12, 6]); ctx.lineDashOffset = -now / 1000 * (speed || 14);
    ctx.lineWidth = (width || 1.5) + 2; ctx.strokeStyle = 'rgba(8,12,18,' + (alpha * 0.45).toFixed(3) + ')'; ctx.stroke();
    ctx.lineWidth = width || 1.5; ctx.strokeStyle = 'rgba(' + rgb + ',' + alpha.toFixed(3) + ')'; ctx.stroke();
    ctx.setLineDash([]); ctx.lineDashOffset = 0;
  }
  // The two circles of a blast: the turning dashed outer ring (half the land inside is lost) and
  // the solid inner one (nothing survives), both breathing slightly.
  function telegraph(ctx, x, y, rin, rout, rgb, now) {
    const al = 0.85 + 0.1 * Math.sin(now / 1000 * 3);
    ctx.beginPath(); ctx.arc(x, y, rout, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + rgb + ',0.07)'; ctx.fill();
    dashRing(ctx, x, y, rout, rgb, al, now, 20, 1.5);
    ctx.beginPath(); ctx.arc(x, y, rin, 0, 6.2832);
    ctx.fillStyle = 'rgba(' + rgb + ',' + (al - 0.6).toFixed(3) + ')'; ctx.fill();
    ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(8,12,18,' + (al * 0.4).toFixed(3) + ')'; ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(' + rgb + ',' + al.toFixed(3) + ')'; ctx.stroke();
  }
  // Reach of every air defence in sight. `only` limits it to the player's own.
  View.prototype.drawSamRings = function (ctx, g, z, ox, oy, now, only) {
    const h = g.human, hostile = [];
    for (const u of g.structAt.values()) {
      if (u.type !== UT.SAM || !u.built) continue;
      const rel = h && u.owner === h ? 'self' : h && h.allies.has(u.owner.id) ? 'ally' : 'enemy';
      if (rel === 'enemy') hostile.push(u);
      if (only && rel !== only) continue;
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy, r = g.samRange(u) * z;
      if (x < -r || y < -r || x > this.cw + r || y > this.ch + r) continue;
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = 'rgba(' + REL[rel] + ',0.05)'; ctx.fill();
      dashRing(ctx, x, y, r, REL[rel], 0.8, now, 14, 1.5);
      ctx.fillStyle = 'rgba(' + REL[rel] + ',0.95)'; glyph(ctx, 'sam', x, y - within(5 + z * 3, 9, 22) * 0.95, 12);
    }
    return hostile;
  };

  View.prototype.drawAim = function (ctx, g, z, ox, oy, now) {
    const a = this.aim, W = g.W, h = g.human, R = g.R;
    const tx = (a.tile % W + 0.5) * z + ox, ty = (((a.tile / W) | 0) + 0.5) * z + oy;
    const hostile = a.type === UT.LASER ? [] : this.drawSamRings(ctx, g, z, ox, oy, now, null);
    ctx.lineJoin = 'round'; ctx.lineCap = 'butt';
    if (a.silo) {
      const sx = (a.silo.x + 0.5) * z + ox, sy = (a.silo.y + 0.5) * z + oy;
      const ax = a.tile % W, ay = (a.tile / W) | 0;
      const dist = Math.max(1, Math.hypot(ax - a.silo.x, ay - a.silo.y));
      const lift = Math.min(dist * 0.28, 70) * z * (a.type === UT.CRUISE ? 0.12 : 1), n = 64;
      // split the flight into stretches that air defence can and cannot reach
      const pts = [], hot = [];
      for (let i = 0; i <= n; i++) {
        const q = i / n, gx = a.silo.x + (ax - a.silo.x) * q, gy = a.silo.y + (ay - a.silo.y) * q;
        let danger = false;
        if (a.type !== UT.MIRV) for (const u of hostile) {
          const sr = g.samRange(u) * (a.type === UT.CRUISE ? 0.5 : 1);
          if ((gx - u.x) * (gx - u.x) + (gy - u.y) * (gy - u.y) <= sr * sr) { danger = true; break; }
        }
        pts.push([sx + (tx - sx) * q, sy + (ty - sy) * q - Math.sin(Math.PI * q) * lift]);
        hot.push(danger);
      }
      const stroke = function (red) {
        ctx.beginPath();
        let open = false;
        for (let i = 1; i <= n; i++) {
          if (hot[i] !== red) { open = false; continue; }
          if (!open) { ctx.moveTo(pts[i - 1][0], pts[i - 1][1]); open = true; }
          ctx.lineTo(pts[i][0], pts[i][1]);
        }
        ctx.setLineDash(red ? [] : [8, 4]);
        ctx.lineWidth = 5.5; ctx.strokeStyle = red ? 'rgba(150,90,90,.75)' : 'rgba(140,140,140,.6)'; ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = red ? 'rgb(255,80,80)' : (a.ok ? '#fff' : 'rgb(190,200,210)'); ctx.stroke();
        ctx.setLineDash([]);
      };
      stroke(false); stroke(true);
      // small circles where the bomb enters and leaves reach, a cross where it would first be met
      let first = -1;
      for (let i = 1; i <= n; i++) if (hot[i] !== hot[i - 1]) {
        if (first < 0 && hot[i]) first = i;
        ctx.beginPath(); ctx.arc(pts[i][0], pts[i][1], 4.5, 0, 6.2832);
        ctx.fillStyle = 'rgba(8,12,18,.8)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = hot[i] ? 'rgb(255,80,80)' : '#fff'; ctx.stroke();
      }
      if (first >= 0) {
        const m = pts[Math.min(n, first + 2)], c = 6;
        ctx.beginPath(); ctx.moveTo(m[0] - c, m[1] - c); ctx.lineTo(m[0] + c, m[1] + c); ctx.moveTo(m[0] + c, m[1] - c); ctx.lineTo(m[0] - c, m[1] + c);
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(8,12,18,.7)'; ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgb(255,80,80)'; ctx.stroke();
      }
      dashRing(ctx, sx, sy, 13, REL.self, 0.9, now, 14, 1.5);
    }
    // the blast: white while you aim, yellow when it would hit an ally and break the alliance
    const b = blast(R, a.type) || [R.headIn, R.headOut];
    let rgb = REL.aim;
    if (h) { const o = g.owner[a.tile]; if (o && o !== h.id && h.allies.has(o)) rgb = REL.ally; }
    if (!a.ok) rgb = '200,208,216';
    telegraph(ctx, tx, ty, b[0] * z, b[1] * z, rgb, now);
    ctx.beginPath();
    ctx.moveTo(tx - 9, ty); ctx.lineTo(tx - 3, ty); ctx.moveTo(tx + 3, ty); ctx.lineTo(tx + 9, ty);
    ctx.moveTo(tx, ty - 9); ctx.lineTo(tx, ty - 3); ctx.moveTo(tx, ty + 3); ctx.lineTo(tx, ty + 9);
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(8,12,18,.7)'; ctx.stroke();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#fff'; ctx.stroke();
  };

  G.View = View;
})(globalThis.G = globalThis.G || {});
