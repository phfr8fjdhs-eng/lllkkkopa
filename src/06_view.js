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
    this.drawUnits(ctx, g, z, ox, oy, alpha, now);
    this.drawFx(ctx, g, z, ox, oy, now);
    this.drawNames(ctx, g, z, ox, oy);
    this.drawRaids(ctx, g, z, ox, oy, now);
    this.drawIncoming(ctx, g, z, ox, oy, alpha, now);
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
    if (z < 2.4) {
      // From afar: a dark bed, sleepers showing as short cross strokes on both sides of it, and
      // one pale line for the glint of the rails.
      const base = within(z * 0.95, 1.8, 2.6);
      trace(0);
      ctx.lineCap = 'butt';
      ctx.setLineDash([Math.max(1.1, z * 0.34), Math.max(1.7, z * 0.56)]);
      ctx.lineWidth = base * 2.15; ctx.strokeStyle = 'rgba(126,110,92,.75)'; ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineCap = 'round';
      ctx.lineWidth = base; ctx.strokeStyle = 'rgba(38,32,26,.9)'; ctx.stroke();
      ctx.lineWidth = Math.max(0.7, base * 0.38); ctx.strokeStyle = 'rgba(234,230,220,.9)'; ctx.stroke();
      return;
    }
    // Close up: gravel bed, wooden sleepers, two steel rails.
    trace(0);
    ctx.lineWidth = z * 1.1; ctx.strokeStyle = 'rgba(30,25,20,.55)'; ctx.stroke();
    ctx.lineWidth = z * 0.86; ctx.strokeStyle = '#8f8676'; ctx.stroke();
    ctx.lineCap = 'butt';
    ctx.setLineDash([z * 0.16, z * 0.3]);
    ctx.lineWidth = z * 0.74; ctx.strokeStyle = '#4b3826'; ctx.stroke();
    ctx.setLineDash([]);
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, z * 0.1);
    trace(z * 0.2); ctx.strokeStyle = '#f0f3f6'; ctx.stroke();
    trace(-z * 0.2); ctx.stroke();
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
        ctx.globalAlpha = 0.38;
        ctx.lineWidth = Math.max(1.3, z * 0.8); ctx.strokeStyle = u.owner.css; ctx.stroke();
        ctx.globalAlpha = 0.16;
        ctx.lineWidth = Math.max(0.5, z * 0.24); ctx.strokeStyle = '#fff'; ctx.stroke();
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
  function rocket(ctx, x, y, ang, len, col, kind, flame) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang);
    const w = kind ? len * 0.34 : len * 0.17;
    if (flame > 0) {
      // exhaust: a flickering tongue of fire behind the tail
      const fl = len * (kind ? 0.5 : 0.75) * (0.75 + 0.25 * flame);
      ctx.beginPath(); ctx.moveTo(-len * 0.5, -w * 0.32); ctx.lineTo(-len * 0.5 - fl, 0); ctx.lineTo(-len * 0.5, w * 0.32); ctx.closePath();
      ctx.fillStyle = 'rgba(255,190,70,.95)'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-len * 0.5, -w * 0.16); ctx.lineTo(-len * 0.5 - fl * 0.55, 0); ctx.lineTo(-len * 0.5, w * 0.16); ctx.closePath();
      ctx.fillStyle = '#fff6d8'; ctx.fill();
    }
    ctx.lineJoin = 'round';
    // wings or fins first, so the body lies on top
    ctx.beginPath();
    if (kind === 0) {
      ctx.moveTo(len * 0.1, 0); ctx.lineTo(-len * 0.16, -len * 0.36); ctx.lineTo(-len * 0.28, -len * 0.36); ctx.lineTo(-len * 0.12, 0);
      ctx.lineTo(-len * 0.28, len * 0.36); ctx.lineTo(-len * 0.16, len * 0.36); ctx.closePath();
      ctx.moveTo(-len * 0.36, 0); ctx.lineTo(-len * 0.5, -len * 0.17); ctx.lineTo(-len * 0.5, len * 0.17); ctx.closePath();
    } else {
      ctx.moveTo(-len * 0.2, 0); ctx.lineTo(-len * 0.5, -w * 1.05); ctx.lineTo(-len * 0.5, w * 1.05); ctx.closePath();
    }
    ctx.lineWidth = 2; ctx.strokeStyle = '#0d1319'; ctx.stroke();
    ctx.fillStyle = 'rgb(' + col + ')'; ctx.fill();
    // body with a pointed nose
    ctx.beginPath();
    ctx.moveTo(-len * 0.5, -w * 0.5); ctx.lineTo(len * 0.18, -w * 0.5);
    ctx.quadraticCurveTo(len * 0.42, -w * 0.42, len * 0.5, 0);
    ctx.quadraticCurveTo(len * 0.42, w * 0.42, len * 0.18, w * 0.5);
    ctx.lineTo(-len * 0.5, w * 0.5); ctx.closePath();
    ctx.lineWidth = 2; ctx.strokeStyle = '#0d1319'; ctx.stroke();
    ctx.fillStyle = kind === 0 ? '#eef2f6' : '#d9dee4'; ctx.fill();
    // nose cone and a band in the colour of the weapon
    ctx.fillStyle = 'rgb(' + col + ')';
    ctx.beginPath(); ctx.moveTo(len * 0.26, -w * 0.44); ctx.quadraticCurveTo(len * 0.43, -w * 0.36, len * 0.5, 0); ctx.quadraticCurveTo(len * 0.43, w * 0.36, len * 0.26, w * 0.44); ctx.closePath(); ctx.fill();
    ctx.fillRect(-len * 0.3, -w * 0.5, len * 0.1, w);
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

  // Everything flying at you gets a loud warning, drawn over the names and borders so nothing can
  // hide it: a pulsing ring on the outer edge of the blast, the inner ring where nothing survives,
  // cross hairs on the tile itself and the seconds left until it hits.
  View.prototype.drawIncoming = function (ctx, g, z, ox, oy, alpha, now) {
    const h = g.human;
    if (!h || !g.nukes.length) return;
    const k = 0.5 + 0.5 * Math.sin(now / 115);                      // the pulse
    const fs = within(z * 2.6, 12, 18);
    for (const u of g.nukes) {
      if (!u.active || u.owner === h || g.friendly(u.owner, h)) continue;
      const b = blast(g.R, u.type);
      if (!b) continue;
      const x = (u.dx + 0.5) * z + ox, y = (u.dy + 0.5) * z + oy, r = b[1] * z;
      if (x + r < -40 || y + r < -40 || x - r > this.cw + 40 || y - r > this.ch + 40) continue;
      ctx.beginPath(); ctx.arc(x, y, b[0] * z, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,70,55,' + (0.12 + 0.14 * k).toFixed(3) + ')'; ctx.fill();
      ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255,130,110,' + (0.5 + 0.35 * k).toFixed(2) + ')'; ctx.stroke();
      ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
      ctx.lineWidth = 3.4 + 1.4 * k; ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();   // dark halo for contrast
      ctx.setLineDash([9, 6]); ctx.lineDashOffset = -now / 26;
      ctx.lineWidth = 2 + 1.4 * k; ctx.strokeStyle = 'rgba(255,90,74,' + (0.75 + 0.25 * k).toFixed(2) + ')'; ctx.stroke();
      ctx.setLineDash([]); ctx.lineDashOffset = 0;
      // cross hairs, so the exact tile stays readable when the rings run off the screen
      const a = Math.min(Math.max(r, 6), 9 + 7 * k);
      ctx.beginPath();
      ctx.moveTo(x - a, y); ctx.lineTo(x + a, y); ctx.moveTo(x, y - a); ctx.lineTo(x, y + a);
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
      ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,236,232,' + (0.65 + 0.35 * k).toFixed(2) + ')'; ctx.stroke();
      // ticks still to run: the wait before it drops, then the rest of the flight
      const left = (u.delay || 0) + Math.max(0, (1 - Math.min(1, u.prog + alpha * u.speed / u.dist)) * u.dist / u.speed);
      const s = left / 10;                                          // ten ticks to the second
      const label = (s >= 10 ? Math.round(s) : s.toFixed(1)) + ' s';
      const ly = y - Math.min(r, 26) - 5;
      ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.lineJoin = 'round';
      ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,.8)'; ctx.strokeText(label, x, ly);
      ctx.fillStyle = '#ffd7cf'; ctx.fillText(label, x, ly);
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
    if (ty === UT.WARHEAD) {
      ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.2832);
      ctx.fillStyle = 'rgb(' + col + ')'; ctx.fill();
      return;
    }
    // the nose points along the arc it is flying
    const ang = Math.atan2((ey - sy) - Math.cos(Math.PI * prog) * Math.PI * liftMax * z, ex - sx);
    const flick = 0.5 + 0.5 * Math.sin(now / 38 + u.id);
    if (ty === UT.CRUISE) rocket(ctx, x, y, ang, within(z * 4.2, 13, 24), col, 0, flick);
    else if (ty === UT.ATOM) rocket(ctx, x, y, ang, within(z * 3.6, 12, 20), col, 1, flick);
    else if (ty === UT.HYDRO) rocket(ctx, x, y, ang, within(z * 4.6, 15, 27), col, 2, flick);
    else rocket(ctx, x, y, ang, within(z * 5, 16, 30), col, 2, flick);      // the MIRV carrier
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
      const dur = f.k === 'boom' ? (f.big ? 2600 : 1100) : f.k === 'text' ? 2500 : f.k === 'coin' ? 1500 : f.k === 'flag' ? 700 : f.k === 'muzzle' ? 170 : 420, k = (now - f.t0) / dur;
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
