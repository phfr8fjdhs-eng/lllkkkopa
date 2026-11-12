(function (G) {
  'use strict';
  const UT = G.UT, within = G.within;
  const SEA = '#1e4a7c';
  const FONT = '"Barlow Condensed", "Arial Narrow", "Roboto Condensed", sans-serif';

  // Icon shapes on a 24-unit grid, shared by the map and the menus.
  const ICON = G.ICON = {
    city: 'M3 21V10h5v11zM9.5 21V4h5v17zM16 21v-8h5v8z',
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
      if (map.shore[i]) return pack(96, 158, 204);
      const d = Math.min(m, 14) / 14;
      return pack(Math.round(58 - 28 * d), Math.round(118 - 44 * d), Math.round(170 - 46 * d));
    }
    if (map.shore[i]) return pack(214, 205, 160);
    if (m < 10) return pack(Math.round(172 + 1.6 * m), Math.round(212 - 2.2 * m), Math.round(128 + 0.5 * m));
    if (m < 20) return pack(Math.round(196 + 2.2 * (m - 10)), Math.round(184 + 1.6 * (m - 10)), Math.round(140 + 2.2 * (m - 10)));
    const v = Math.round(222 + 3 * (m - 20));
    return pack(v - 6, v - 3, v);
  }
  function flagOf(iso) {
    if (!iso || iso.length !== 2) return '';
    return String.fromCodePoint(0x1F1E6 + iso.charCodeAt(0) - 65, 0x1F1E6 + iso.charCodeAt(1) - 65);
  }
  G.flagOf = flagOf;

  function View(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.cam = { x: 0, y: 0, z: 1 };
    this.fly = null; this.map = null; this.game = null;
    this.fxList = []; this.mark = -1; this.aim = null;
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
    this.base = new Uint32Array(map.N);
    for (let i = 0; i < map.N; i++) this.base[i] = terrainColor(map, i);
    this.px.set(this.base);
    this.mctx.putImageData(this.img, 0, 0);
  };
  View.prototype.setGame = function (game) {
    this.game = game;
    for (let i = 1; i < game.players.length; i++) {
      const p = game.players[i];
      p.c32b = pack(Math.round(p.r * 0.58), Math.round(p.g * 0.58), Math.round(p.b * 0.58));
      p.c32l = pack(Math.round(p.r * 0.5 + 127), Math.round(p.g * 0.5 + 127), Math.round(p.b * 0.5 + 127));
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
    } else {
      this.px[t] = pack(((b & 255) * 84 + p.r * 172) >> 8, (((b >>> 8) & 255) * 84 + p.g * 172) >> 8, (((b >>> 16) & 255) * 84 + p.b * 172) >> 8);
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
    p.nameSize = Math.min(rh * 0.42, rw / (Math.max(4, p.name.length) * 0.5));
    p.nameX = p.x0 + (c0 + c1 + 1) / 2 * st;
    p.nameY = p.y0 + (r0 + by + 1) / 2 * st;
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
    this.drawRails(ctx, g, z, ox, oy);
    this.drawStructures(ctx, g, z, ox, oy);
    this.drawUnits(ctx, g, z, ox, oy, alpha);
    this.drawFx(ctx, g, z, ox, oy, now);
    this.drawNames(ctx, g, z, ox, oy);
    this.drawMarks(ctx, g, z, ox, oy, now);
    if (this.aim) this.drawAim(ctx, g, z, ox, oy, now);
    if (this.ghost) this.drawGhost(ctx, g, z, ox, oy);
  };

  // What a build key is about to place, shown under the mouse pointer: in the player's colour when it
  // can be built there, red when it cannot (too little gold, wrong spot ...). Bombs show their blast.
  View.prototype.drawGhost = function (ctx, g, z, ox, oy) {
    const gh = this.ghost, W = g.W, R = g.R, h = g.human;
    if (gh.tile < 0 || !h) return;
    const x = (gh.tile % W + 0.5) * z + ox, y = (((gh.tile / W) | 0) + 0.5) * z + oy;
    const s = within(5 + z * 3, 9, 22) * 1.5, t = gh.type, bad = !gh.ok;
    const rout = t === UT.HYDRO ? R.hydroOut : t === UT.ATOM ? R.atomOut : t === UT.CRUISE ? R.cruiseOut : t === UT.LASER ? R.laserOut : 0;
    const rin = t === UT.HYDRO ? R.hydroIn : t === UT.ATOM ? R.atomIn : t === UT.CRUISE ? R.cruiseIn : t === UT.LASER ? R.laserIn : 0;
    if (rout) {
      ctx.beginPath(); ctx.arc(x, y, rout * z, 0, 6.2832);
      ctx.fillStyle = bad ? 'rgba(216,54,47,.14)' : 'rgba(255,176,72,.16)'; ctx.fill();
      ctx.setLineDash([5, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = bad ? 'rgba(255,120,110,.9)' : 'rgba(255,220,160,.9)'; ctx.stroke(); ctx.setLineDash([]);
      ctx.beginPath(); ctx.arc(x, y, rin * z, 0, 6.2832);
      ctx.fillStyle = bad ? 'rgba(216,54,47,.2)' : 'rgba(255,120,40,.24)'; ctx.fill();
      // hostile air defence in reach of the target: these can shoot the bomb down (not the satellite beam, not a MIRV)
      if (t !== UT.LASER) for (const u of g.structAt.values()) {
        if (u.type !== UT.SAM || !u.built || u.owner === h || h.allies.has(u.owner.id)) continue;
        const sr = g.samRange(u), ux = (u.x + 0.5) * z + ox, uy = (u.y + 0.5) * z + oy;
        if (ux < -sr * z || uy < -sr * z || ux > this.cw + sr * z || uy > this.ch + sr * z) continue;
        ctx.beginPath(); ctx.arc(ux, uy, sr * z, 0, 6.2832);
        ctx.fillStyle = 'rgba(197,139,255,.08)'; ctx.fill();
        ctx.setLineDash([6, 5]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(197,139,255,.9)'; ctx.stroke(); ctx.setLineDash([]);
      }
    } else if (t <= UT.FACTORY) {
      // what the building would cover: a defence post its stretch of border, an air defence its sky
      const reach = t === UT.DEFENSE ? R.defense : t === UT.SAM ? g.samRange({ level: 1 }) : 0;
      if (reach && !bad) {
        ctx.beginPath(); ctx.arc(x, y, reach * z, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.stroke();
      }
      // the room this building keeps free around itself
      ctx.beginPath(); ctx.arc(x, y, R.structDist * z, 0, 6.2832);
      ctx.setLineDash([4, 5]); ctx.lineWidth = 1.2; ctx.strokeStyle = bad ? 'rgba(255,120,110,.7)' : 'rgba(255,255,255,.55)'; ctx.stroke(); ctx.setLineDash([]);
    }
    // a dark rim first, so the marker stands out on any colour of land
    ctx.beginPath(); ctx.arc(x, y, s / 2 + 3, 0, 6.2832);
    ctx.fillStyle = 'rgba(13,20,27,.85)'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 6.2832);
    ctx.fillStyle = bad ? '#e02a20' : h.cssB; ctx.fill();
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
  View.prototype.drawRails = function (ctx, g, z, ox, oy) {
    const rails = g.rails;
    if (!rails.length) return;
    const W = g.W, x0 = -ox / z - 2, y0 = -oy / z - 2, x1 = (this.cw - ox) / z + 2, y1 = (this.ch - oy) / z + 2;
    const vis = [];
    for (const e of rails) if (!(e.x1 < x0 || e.x0 > x1 || e.y1 < y0 || e.y0 > y1)) vis.push(e);
    if (!vis.length) return;
    const trace = function () {
      ctx.beginPath();
      for (const e of vis) {
        const p = e.path.pts || e.path;
        for (let i = 0; i < p.length; i++) {
          const x = (p[i] % W + 0.5) * z + ox, y = (((p[i] / W) | 0) + 0.5) * z + oy;
          if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
      }
    };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    trace();
    if (z < 2.4) {
      ctx.lineWidth = within(z * 0.8, 1.5, 2.6); ctx.strokeStyle = 'rgba(30,26,22,.8)'; ctx.stroke();
      ctx.setLineDash([2, 3]);
      ctx.lineWidth = within(z * 0.3, 0.7, 1.1); ctx.strokeStyle = 'rgba(240,236,226,.85)'; ctx.stroke();
      ctx.setLineDash([]);
      return;
    }
    ctx.lineWidth = z * 1.05; ctx.strokeStyle = 'rgba(40,34,28,.5)'; ctx.stroke();
    ctx.lineWidth = z * 0.82; ctx.strokeStyle = '#8b8172'; ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.setLineDash([z * 0.15, z * 0.33]);
    ctx.lineWidth = z * 0.72; ctx.strokeStyle = '#4e3b28'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    const off = z * 0.2;
    ctx.beginPath();
    for (const e of vis) {
      const p = e.path.pts || e.path;
      for (let side = -1; side <= 1; side += 2) {
        let lx = 0, ly = 0;
        for (let i = 0; i < p.length; i++) {
          const x = (p[i] % W + 0.5) * z + ox, y = (((p[i] / W) | 0) + 0.5) * z + oy;
          if (i) {
            const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy) || 1, nx = -dy / d * off * side, ny = dx / d * off * side;
            ctx.moveTo(lx + nx, ly + ny); ctx.lineTo(x + nx, y + ny);
          }
          lx = x; ly = y;
        }
      }
    }
    ctx.lineWidth = Math.max(1, z * 0.1); ctx.strokeStyle = '#eef1f4'; ctx.stroke();
  };

  View.prototype.drawStructures = function (ctx, g, z, ox, oy) {
    const s = within(5 + z * 3, 9, 22), cw = this.cw, ch = this.ch, T = g.ticks;
    for (const u of g.structAt.values()) {
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy;
      if (x < -s || y < -s || x > cw + s || y > ch + s) continue;
      ctx.globalAlpha = u.built ? 1 : 0.6;
      ctx.beginPath(); ctx.arc(x, y, s / 2, 0, 6.2832);
      ctx.fillStyle = u.owner.cssB; ctx.fill();
      ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      ctx.fillStyle = '#fff';
      glyph(ctx, STRUCT_ICON[u.type], x, y, s * 0.62);
      ctx.globalAlpha = 1;
      if (!u.built) {
        const k = within((T - u.buildStart) / Math.max(1, u.buildEnd - u.buildStart), 0, 1);
        ctx.beginPath(); ctx.arc(x, y, s / 2 + 2.5, -1.5708, -1.5708 + 6.2832 * k);
        ctx.strokeStyle = '#f4b740'; ctx.lineWidth = 2; ctx.stroke();
      } else if (u.level > 1 && s >= 11) {
        const digits = u.level > 99 ? 3 : u.level > 9 ? 2 : 1;
        const bx = x + s * 0.42, by = y + s * 0.42, br = Math.max(5, s * 0.3) * (digits > 1 ? 1.3 : 1);
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
      if (end < 1) continue;
      const hx = (u.px + (u.x - u.px) * alpha + 0.5) * z + ox, hy = (u.py + (u.y - u.py) * alpha + 0.5) * z + oy;
      if (ty === UT.TRANSPORT) {
        const step = Math.max(1, Math.round(2.5 / z));
        ctx.beginPath();
        for (let k = 0; k < end; k += step) {
          const x = (p[k] % W + 0.5) * z + ox, y = (((p[k] / W) | 0) + 0.5) * z + oy;
          if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y);
        }
        ctx.lineTo(hx, hy);
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = Math.max(1.6, z * 0.95); ctx.strokeStyle = u.owner.css; ctx.stroke();
        ctx.globalAlpha = 0.4;
        ctx.lineWidth = Math.max(0.6, z * 0.28); ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      if (hx < -60 || hy < -60 || hx > cw + 60 || hy > ch + 60 || z < 1.3) continue;
      const len = ty === UT.WARSHIP ? 14 : 8, wide = ty === UT.WARSHIP ? 0.55 : 0.4;
      let lx = hx, ly = hy;
      for (let k = 0; k < 3; k++) {
        const idx = Math.max(0, end - Math.round((k + 1) * len / 3));
        const x = (p[idx] % W + 0.5) * z + ox, y = (((p[idx] / W) | 0) + 0.5) * z + oy;
        ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(x, y);
        ctx.lineWidth = Math.max(1, z * wide * (1 - k * 0.22));
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.5 - k * 0.15).toFixed(2) + ')'; ctx.stroke();
        lx = x; ly = y;
        if (!idx) break;
      }
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

  View.prototype.drawUnits = function (ctx, g, z, ox, oy, alpha) {
    const cw = this.cw, ch = this.ch, us = g.units;
    const ws = within(4 + z * 2.2, 7, 17), bs = within(3 + z * 1.6, 5, 12);
    this.drawWakes(ctx, g, z, ox, oy, alpha);
    ctx.lineJoin = 'round';
    for (let i = 0; i < us.length; i++) {
      const u = us[i], ty = u.type;
      if (!u.active || ty <= UT.FACTORY) continue;
      if (ty >= UT.ATOM) { this.drawMissile(ctx, g, u, z, ox, oy, alpha); continue; }
      const x = (u.px + (u.x - u.px) * alpha + 0.5) * z + ox, y = (u.py + (u.y - u.py) * alpha + 0.5) * z + oy;
      if (x < -30 || y < -30 || x > cw + 30 || y > ch + 30) continue;
      const p = u.owner;
      if (u.x !== u.px || u.y !== u.py) u.ang = Math.atan2(u.y - u.py, u.x - u.px);
      const ang = u.ang || 0;
      if (ty === UT.WARSHIP) {
        const s = ws * 0.62;
        hull(ctx, x, y, ang, s, 'war');
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = 2.6; ctx.strokeStyle = '#10161d'; ctx.stroke();
        ctx.lineWidth = 1.1; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#10161d';
        ctx.beginPath(); ctx.arc(x + Math.cos(ang) * s * 0.3, y + Math.sin(ang) * s * 0.3, Math.max(1.2, s * 0.2), 0, 6.2832); ctx.fill();
        ctx.beginPath(); ctx.arc(x - Math.cos(ang) * s * 0.4, y - Math.sin(ang) * s * 0.4, Math.max(1, s * 0.16), 0, 6.2832); ctx.fill();
        if (u.hp < 1000) {
          ctx.fillStyle = '#10161d'; ctx.fillRect(x - ws / 2, y + ws * 0.8, ws, 3);
          ctx.fillStyle = u.hp < 400 ? '#ff6b5e' : '#63d391'; ctx.fillRect(x - ws / 2, y + ws * 0.8, ws * u.hp / 1000, 3);
        }
      } else if (ty === UT.TRANSPORT) {
        hull(ctx, x, y, ang, bs * 0.62, 'boat');
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      } else if (ty === UT.TRAIN) {
        this.drawTrain(ctx, g, u, z, ox, oy, alpha);
      } else if (ty === UT.TRADE) {
        const s = bs * 0.56;
        hull(ctx, x, y, ang, s, 'trade');
        ctx.fillStyle = u.captured ? '#f4b740' : '#f6efdc'; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = p.cssB; ctx.stroke();
        // the gold on board
        ctx.fillStyle = u.captured ? '#7a5200' : '#e0a21c';
        const cx = Math.cos(ang) * s, cy = Math.sin(ang) * s, r = Math.max(0.9, s * 0.22);
        ctx.beginPath(); ctx.arc(x - cx * 0.45, y - cy * 0.45, r, 0, 6.2832); ctx.arc(x + cx * 0.1, y + cy * 0.1, r, 0, 6.2832); ctx.fill();
        if (z >= 4.5) {
          ctx.font = '700 ' + within(z * 1.6, 9, 13).toFixed(0) + 'px ' + FONT;
          ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
          ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(13,20,27,.8)'; ctx.strokeText(G.fmt(u.gold), x, y - s * 0.8);
          ctx.fillStyle = '#f4b740'; ctx.fillText(G.fmt(u.gold), x, y - s * 0.8);
        }
      } else {
        ctx.beginPath(); ctx.arc(x, y, ty === UT.SHELL ? 1.6 : 2.2, 0, 6.2832);
        ctx.fillStyle = ty === UT.SHELL ? '#10161d' : '#fff'; ctx.fill();
      }
    }
  };

  // An engine pulling two wagons along the track.
  View.prototype.drawTrain = function (ctx, g, u, z, ox, oy, alpha) {
    const path = u.edge.path, n = path.length, W = g.W, dir = u.fwd ? 1 : -1, p = u.owner;
    const moved = u.x !== u.px || u.y !== u.py;
    const head = u.pi - (moved ? dir * (1 - alpha) : 0);
    const L = Math.max(5, z * 1.25), B = Math.max(3, z * 0.72);
    for (let k = 2; k >= 0; k--) {
      const f = within(head - dir * k * 1.55, 0, n - 1), i0 = Math.min(n - 2, Math.floor(f)), fr = f - i0;
      if (i0 < 0) return;
      const ax = path[i0] % W, ay = (path[i0] / W) | 0, bx = path[i0 + 1] % W, by = (path[i0 + 1] / W) | 0;
      const x = (ax + (bx - ax) * fr + 0.5) * z + ox, y = (ay + (by - ay) * fr + 0.5) * z + oy;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(Math.atan2(by - ay, bx - ax));
      ctx.fillStyle = k ? p.cssB : p.css;
      ctx.fillRect(-L / 2, -B / 2, L, B);
      ctx.lineWidth = 1.1; ctx.strokeStyle = k ? 'rgba(255,255,255,.75)' : '#fff'; ctx.strokeRect(-L / 2, -B / 2, L, B);
      if (!k) { ctx.fillStyle = '#fff'; ctx.fillRect(dir * L * 0.12 - L * 0.14, -B * 0.26, L * 0.28, B * 0.52); }
      ctx.restore();
    }
  };

  View.prototype.drawMissile = function (ctx, g, u, z, ox, oy, alpha) {
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
    if (u.delay > 0) return;
    const ty = u.type, prog = Math.min(1, u.prog + alpha * u.speed / u.dist);
    const liftMax = Math.min(u.dist * 0.28, 70) * (ty === UT.CRUISE ? 0.12 : 1);
    const col = ty === UT.ATOM ? '255,86,64' : ty === UT.HYDRO ? '255,150,40' : ty === UT.CRUISE ? '110,215,255' : '206,120,255';
    const sx = (u.sx + 0.5) * z + ox, sy = (u.sy + 0.5) * z + oy;
    const ex = (u.dx + 0.5) * z + ox, ey = (u.dy + 0.5) * z + oy;
    if (Math.max(sx, ex) < -80 || Math.min(sx, ex) > this.cw + 80 || Math.max(sy, ey) < -200 || Math.min(sy, ey) > this.ch + 80) return;
    ctx.beginPath();
    const steps = ty === UT.WARHEAD ? 6 : 14;
    let x = sx, y = sy;
    ctx.moveTo(sx, sy);
    for (let i = 1; i <= steps; i++) {
      const q = prog * i / steps;
      x = sx + (ex - sx) * q; y = sy + (ey - sy) * q - Math.sin(Math.PI * q) * liftMax * z;
      ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(' + col + ',0.5)'; ctx.lineWidth = ty === UT.WARHEAD ? 1 : 2; ctx.stroke();
    if (ty === UT.ATOM || ty === UT.HYDRO || ty === UT.CRUISE) {
      const r = (ty === UT.HYDRO ? g.R.hydroOut : ty === UT.CRUISE ? g.R.cruiseOut : g.R.atomOut) * z;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, 6.2832);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(' + col + ',0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(x, y, ty === UT.WARHEAD ? 2 : ty === UT.ATOM || ty === UT.CRUISE ? 3.5 : 5, 0, 6.2832);
    ctx.fillStyle = 'rgb(' + col + ')'; ctx.fill();
    if (ty !== UT.WARHEAD) { ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
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
      const dur = f.k === 'boom' ? (f.big ? 2600 : 1100) : f.k === 'text' ? 2500 : f.k === 'coin' ? 1500 : f.k === 'flag' ? 700 : 420, k = (now - f.t0) / dur;
      if (k >= 1 || (f.k === 'coin' && !f.mine)) { list.splice(i, 1); continue; }
      const x = (f.x + 0.5) * z + ox, y = (f.y + 0.5) * z + oy, e = k * (2 - k);
      if (f.k === 'boom') {
        const r = Math.max(6, f.r * z) * (0.3 + 0.7 * e);
        if (f.big) {
          // hydrogen bomb: the whole screen flashes, then two shock rings roll outward
          if (k < 0.22 && x > -r && y > -r && x < cw + r && y < ch + r) {
            ctx.fillStyle = 'rgba(255,246,220,' + (0.75 * (1 - k / 0.22)).toFixed(3) + ')'; ctx.fillRect(0, 0, cw, ch);
          }
          ctx.beginPath(); ctx.arc(x, y, r * (1 + 0.5 * k), 0, 6.2832);
          ctx.strokeStyle = 'rgba(255,214,150,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 5 * (1 - k) + 1; ctx.stroke();
          ctx.beginPath(); ctx.arc(x, y, r * 0.7, 0, 6.2832);
          ctx.fillStyle = 'rgba(255,120,40,' + (0.5 * (1 - k)).toFixed(3) + ')'; ctx.fill();
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
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,176,72,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,250,225,' + ((1 - k) * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
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
          ctx.fillStyle = '#ffe08a'; ctx.fillText(label, x, y - 10 - 18 * k);
          ctx.globalAlpha = 1;
        }
      } else if (f.k === 'flag') {
        ctx.beginPath(); ctx.arc(x, y, 4 + 16 * e, 0, 6.2832);
        ctx.strokeStyle = 'rgba(244,183,64,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 3 * (1 - k) + 1; ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(x, y, 3 + 13 * e, 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  };

  View.prototype.drawNames = function (ctx, g, z, ox, oy) {
    const ps = g.players, h = g.human, cw = this.cw, ch = this.ch, T = g.ticks;
    let leader = null;
    for (let i = 1; i < ps.length; i++) if (ps[i].alive && (!leader || ps[i].tiles > leader.tiles)) leader = ps[i];
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive || !p.nameSize) continue;
      let fs = p.nameSize * z;
      if (fs < 7.5) { if (p !== h) continue; fs = 7.5; }
      if (fs > 44) fs = 44;
      const x = p.nameX * z + ox, y = p.nameY * z + oy;
      if (x < -160 || y < -40 || x > cw + 160 || y > ch + 40) continue;
      let label = p.name;
      if (p.flag && fs >= 10) label = flagOf(p.flag) + ' ' + label;
      if (p === leader && fs >= 9 && g.phase === 'play') label = '👑 ' + label;
      if (h && p !== h && h.allies.has(p.id)) label += ' 🤝';
      if (p.traitorUntil > T) label += ' ⚠';
      ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      ctx.lineWidth = Math.max(2, fs / 5); ctx.strokeStyle = 'rgba(255,255,255,0.74)';
      ctx.strokeText(label, x, y - fs * 0.36);
      ctx.fillStyle = '#0d141b';
      ctx.fillText(label, x, y - fs * 0.36);
      const fs2 = fs * 0.74;
      if (fs2 >= 6.5) {
        const tr = G.fmtTroops(p.troops);
        ctx.font = '600 ' + fs2.toFixed(1) + 'px ' + FONT;
        ctx.lineWidth = Math.max(2, fs2 / 5);
        ctx.strokeText(tr, x, y + fs * 0.5);
        ctx.fillText(tr, x, y + fs * 0.5);
      }
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
  View.prototype.drawAim = function (ctx, g, z, ox, oy, now) {
    const a = this.aim, W = g.W, h = g.human, R = g.R;
    const tx = (a.tile % W + 0.5) * z + ox, ty = (((a.tile / W) | 0) + 0.5) * z + oy;
    const hostile = [];
    ctx.lineWidth = 1.5;
    for (const u of g.structAt.values()) {
      if (u.type !== UT.SAM || !u.built) continue;
      const mine = h && (u.owner === h || h.allies.has(u.owner.id));
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy, r = g.samRange(u) * z;
      if (x < -r || y < -r || x > this.cw + r || y > this.ch + r) { if (!mine) hostile.push(u); continue; }
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.fillStyle = mine ? 'rgba(99,211,145,0.10)' : 'rgba(197,139,255,0.20)'; ctx.fill();
      ctx.setLineDash([7, 5]); ctx.lineWidth = 2; ctx.strokeStyle = mine ? 'rgba(99,211,145,0.9)' : 'rgb(197,139,255)'; ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = mine ? 'rgb(99,211,145)' : 'rgb(197,139,255)'; glyph(ctx, 'sam', x, y - within(5 + z * 3, 9, 22) * 0.95, 13);
      if (!mine) hostile.push(u);
    }
    const col = a.ok ? '255,214,94' : '190,200,210';
    if (a.silo) {
      const sx = (a.silo.x + 0.5) * z + ox, sy = (a.silo.y + 0.5) * z + oy;
      const dist = Math.max(1, Math.hypot(a.tile % W - a.silo.x, ((a.tile / W) | 0) - a.silo.y));
      const lift = Math.min(dist * 0.28, 70) * z * (a.type === UT.CRUISE ? 0.12 : 1), n = 48;
      // the shadow of the path on the ground: this is where air defence measures its reach
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty);
      ctx.setLineDash([2, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(16,22,29,0.55)'; ctx.stroke(); ctx.setLineDash([]);
      let px = sx, py = sy;
      for (let i = 1; i <= n; i++) {
        const q = i / n, gx = a.silo.x + (a.tile % W - a.silo.x) * q, gy = a.silo.y + (((a.tile / W) | 0) - a.silo.y) * q;
        let danger = false;
        if (a.type !== UT.MIRV) for (const u of hostile) { const sr = g.samRange(u); if ((gx - u.x) * (gx - u.x) + (gy - u.y) * (gy - u.y) <= sr * sr) { danger = true; break; } }
        const x = sx + (tx - sx) * q, y = sy + (ty - sy) * q - Math.sin(Math.PI * q) * lift;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(x, y);
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(16,22,29,0.6)'; ctx.stroke();
        ctx.lineWidth = 2.5; ctx.strokeStyle = danger ? 'rgb(255,107,94)' : 'rgb(' + col + ')'; ctx.stroke();
        px = x; py = y;
      }
      ctx.beginPath(); ctx.arc(sx, sy, 13, 0, 6.2832);
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(16,22,29,0.6)'; ctx.stroke();
      ctx.lineWidth = 2; ctx.strokeStyle = 'rgb(' + col + ')'; ctx.stroke();
    }
    const rin = (a.type === UT.HYDRO ? R.hydroIn : a.type === UT.ATOM ? R.atomIn : a.type === UT.CRUISE ? R.cruiseIn : a.type === UT.LASER ? R.laserIn : R.headIn) * z;
    const rout = (a.type === UT.HYDRO ? R.hydroOut : a.type === UT.ATOM ? R.atomOut : a.type === UT.CRUISE ? R.cruiseOut : a.type === UT.LASER ? R.laserOut : R.headOut) * z;
    const pulse = 0.5 + 0.5 * Math.sin(now / 220);
    ctx.beginPath(); ctx.arc(tx, ty, rout, 0, 6.2832);
    ctx.fillStyle = 'rgba(255,107,94,0.14)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,107,94,' + (0.7 + 0.3 * pulse).toFixed(2) + ')'; ctx.stroke();
    ctx.beginPath(); ctx.arc(tx, ty, rin, 0, 6.2832);
    ctx.fillStyle = 'rgba(255,70,50,0.32)'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgb(255,107,94)'; ctx.stroke();
    const c = 9 + pulse * 3;
    ctx.beginPath();
    ctx.moveTo(tx - c - 6, ty); ctx.lineTo(tx - 4, ty); ctx.moveTo(tx + 4, ty); ctx.lineTo(tx + c + 6, ty);
    ctx.moveTo(tx, ty - c - 6); ctx.lineTo(tx, ty - 4); ctx.moveTo(tx, ty + 4); ctx.lineTo(tx, ty + c + 6);
    ctx.lineWidth = 4.5; ctx.strokeStyle = 'rgba(16,22,29,0.7)'; ctx.stroke();
    ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke();
  };

  G.View = View;
})(globalThis.G = globalThis.G || {});
