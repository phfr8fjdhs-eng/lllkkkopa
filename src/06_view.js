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
    up: 'M12 3l8 8h-5v9H9v-9H4z',
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
    const g = this.game;
    g.shrinkBox(p);
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
  };

  View.prototype.drawRails = function (ctx, g, z, ox, oy) {
    const rails = g.rails;
    if (!rails.length) return;
    const W = g.W, x0 = -ox / z, y0 = -oy / z, x1 = (this.cw - ox) / z, y1 = (this.ch - oy) / z;
    const step = Math.max(1, Math.round(2.5 / z));
    ctx.beginPath();
    for (const e of rails) {
      if (e.x1 < x0 || e.x0 > x1 || e.y1 < y0 || e.y0 > y1) continue;
      const p = e.path, n = p.length;
      for (let i = 0; i < n; i += step) {
        const j = i + step >= n ? n - 1 : i, t = p[j];
        const x = (t % W + 0.5) * z + ox, y = (((t / W) | 0) + 0.5) * z + oy;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        if (j === n - 1) break;
      }
    }
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = within(z * 0.55, 1.6, 5); ctx.strokeStyle = 'rgba(16,22,29,.78)'; ctx.stroke();
    if (z >= 2) {
      ctx.setLineDash([within(z * 0.5, 2, 5), within(z * 0.9, 3, 8)]);
      ctx.lineWidth = within(z * 0.22, 0.8, 2); ctx.strokeStyle = 'rgba(236,240,245,.8)'; ctx.stroke();
      ctx.setLineDash([]);
    }
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
        const bx = x + s * 0.42, by = y + s * 0.42, br = Math.max(5, s * 0.3);
        ctx.beginPath(); ctx.arc(bx, by, br, 0, 6.2832);
        ctx.fillStyle = '#10161d'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '700 ' + Math.round(br * 1.5) + 'px ' + FONT;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(u.level), bx, by + 0.5);
      }
    }
  };

  View.prototype.drawUnits = function (ctx, g, z, ox, oy, alpha) {
    const cw = this.cw, ch = this.ch, us = g.units;
    const ws = within(4 + z * 2.2, 7, 17), bs = within(3 + z * 1.6, 5, 12);
    for (let i = 0; i < us.length; i++) {
      const u = us[i], ty = u.type;
      if (!u.active || ty <= UT.FACTORY) continue;
      if (ty >= UT.ATOM) { this.drawMissile(ctx, g, u, z, ox, oy, alpha); continue; }
      const x = (u.px + (u.x - u.px) * alpha + 0.5) * z + ox, y = (u.py + (u.y - u.py) * alpha + 0.5) * z + oy;
      if (x < -20 || y < -20 || x > cw + 20 || y > ch + 20) continue;
      const p = u.owner;
      if (ty === UT.WARSHIP) {
        ctx.beginPath();
        ctx.moveTo(x, y - ws * 0.62); ctx.lineTo(x + ws * 0.62, y); ctx.lineTo(x, y + ws * 0.62); ctx.lineTo(x - ws * 0.62, y);
        ctx.closePath();
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = '#10161d'; ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = '#fff'; ctx.stroke();
        if (u.hp < 1000) {
          ctx.fillStyle = '#10161d'; ctx.fillRect(x - ws / 2, y + ws * 0.8, ws, 3);
          ctx.fillStyle = '#63d391'; ctx.fillRect(x - ws / 2, y + ws * 0.8, ws * u.hp / 1000, 3);
        }
      } else if (ty === UT.TRANSPORT) {
        ctx.beginPath();
        ctx.moveTo(x, y - bs * 0.7); ctx.lineTo(x + bs * 0.7, y + bs * 0.55); ctx.lineTo(x - bs * 0.7, y + bs * 0.55);
        ctx.closePath();
        ctx.fillStyle = p.css; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#fff'; ctx.stroke();
      } else if (ty === UT.TRAIN) {
        const h = within(bs * 0.5, 2.6, 6);
        ctx.fillStyle = p.css; ctx.fillRect(x - h, y - h * 0.7, h * 2, h * 1.4);
        ctx.lineWidth = 1.2; ctx.strokeStyle = '#10161d'; ctx.strokeRect(x - h, y - h * 0.7, h * 2, h * 1.4);
        ctx.fillStyle = '#fff'; ctx.fillRect(x - h * 0.45, y - h * 0.3, h * 0.9, h * 0.6);
      } else if (ty === UT.TRADE) {
        const h = bs * 0.42;
        ctx.fillStyle = u.captured ? '#f4b740' : '#fff';
        ctx.fillRect(x - h, y - h, h * 2, h * 2);
        ctx.lineWidth = 1.5; ctx.strokeStyle = p.cssB;
        ctx.strokeRect(x - h, y - h, h * 2, h * 2);
      } else {
        ctx.beginPath(); ctx.arc(x, y, ty === UT.SHELL ? 1.6 : 2.2, 0, 6.2832);
        ctx.fillStyle = ty === UT.SHELL ? '#10161d' : '#fff'; ctx.fill();
      }
    }
  };

  View.prototype.drawMissile = function (ctx, g, u, z, ox, oy, alpha) {
    if (u.delay > 0) return;
    const ty = u.type, prog = Math.min(1, u.prog + alpha * u.speed / u.dist);
    const liftMax = Math.min(u.dist * 0.28, 70);
    const col = ty === UT.ATOM ? '255,86,64' : ty === UT.HYDRO ? '255,150,40' : '206,120,255';
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
    if (ty === UT.ATOM || ty === UT.HYDRO) {
      const r = (ty === UT.HYDRO ? g.R.hydroOut : g.R.atomOut) * z;
      ctx.beginPath(); ctx.arc(ex, ey, r, 0, 6.2832);
      ctx.setLineDash([6, 5]); ctx.strokeStyle = 'rgba(' + col + ',0.75)'; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.beginPath(); ctx.arc(x, y, ty === UT.WARHEAD ? 2 : ty === UT.ATOM ? 3.5 : 5, 0, 6.2832);
    ctx.fillStyle = 'rgb(' + col + ')'; ctx.fill();
    if (ty !== UT.WARHEAD) { ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
  };

  View.prototype.drawFx = function (ctx, g, z, ox, oy, now) {
    while (g.fx.length) { const f = g.fx.shift(); f.t0 = now; this.fxList.push(f); }
    const list = this.fxList;
    for (let i = list.length - 1; i >= 0; i--) {
      const f = list[i], dur = f.k === 'boom' ? 1100 : f.k === 'text' ? 2200 : 420, k = (now - f.t0) / dur;
      if (k >= 1 || (f.k === 'coin' && !f.mine)) { list.splice(i, 1); continue; }
      const x = (f.x + 0.5) * z + ox, y = (f.y + 0.5) * z + oy, e = k * (2 - k);
      if (f.k === 'boom') {
        const r = Math.max(6, f.r * z) * (0.3 + 0.7 * e);
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,176,72,' + (0.7 * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,250,225,' + ((1 - k) * (1 - k)).toFixed(3) + ')'; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
      } else if (f.k === 'text') {
        const pop = k < 0.12 ? 0.6 + k / 0.12 * 0.5 : 1.1 - Math.min(0.1, (k - 0.12) * 0.5), fs = 26 * pop;
        ctx.globalAlpha = k < 0.7 ? 1 : (1 - k) / 0.3;
        ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
        ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(16,22,29,0.9)'; ctx.strokeText(f.text, x, y - 46 * e);
        ctx.fillStyle = '#ffd25e'; ctx.fillText(f.text, x, y - 46 * e);
        ctx.globalAlpha = 1;
      } else if (f.k === 'coin') {
        ctx.beginPath(); ctx.arc(x, y - 10 * e, 2 + 5 * e, 0, 6.2832);
        ctx.strokeStyle = 'rgba(244,183,64,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 2; ctx.stroke();
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
      const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy, r = R.sam * z;
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
      const lift = Math.min(dist * 0.28, 70) * z, r2 = R.sam * R.sam, n = 48;
      // the shadow of the path on the ground: this is where air defence measures its reach
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(tx, ty);
      ctx.setLineDash([2, 6]); ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(16,22,29,0.55)'; ctx.stroke(); ctx.setLineDash([]);
      let px = sx, py = sy;
      for (let i = 1; i <= n; i++) {
        const q = i / n, gx = a.silo.x + (a.tile % W - a.silo.x) * q, gy = a.silo.y + (((a.tile / W) | 0) - a.silo.y) * q;
        let danger = false;
        if (a.type !== UT.MIRV) for (const u of hostile) if ((gx - u.x) * (gx - u.x) + (gy - u.y) * (gy - u.y) <= r2) { danger = true; break; }
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
    const rin = (a.type === UT.HYDRO ? R.hydroIn : a.type === UT.ATOM ? R.atomIn : R.headIn) * z;
    const rout = (a.type === UT.HYDRO ? R.hydroOut : a.type === UT.ATOM ? R.atomOut : R.headOut) * z;
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
