/* Grenzland – Darstellung auf der Zeichenfläche */
(function (G) {
  'use strict';
  const U = G.U;

  // Symbole: "s:" = Linie, "f:" = Fläche (24er-Raster)
  const IC = G.IC = {
    sword: 's:M19.5 4.5 9 15M19.5 4.5h-5M19.5 4.5v5M6 12l6 6M8.5 15.5l-4 4',
    boat: 'f:M2.5 15h19l-3.2 5.5H5.7zM11 3h1.8v10.5H11zM14 5.2l5 7.3h-5z',
    hammer: 'f:M12.5 2.5l9 9-3 3-9-9zM11 10l3 3-8.5 8.5-3-3z',
    info: 's:M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.4v.2',
    link: 's:M10 14a4 4 0 0 0 5.7 0l3-3A4 4 0 0 0 13 5.3l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3A4 4 0 0 0 11 18.7l1-1',
    close: 's:M6 6l12 12M18 6 6 18',
    anchor: 's:M12 7v13M12 7a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM7.5 11h9M4.5 14a7.5 7.5 0 0 0 15 0',
    city: 'f:M3 21V10h5v11zM9.5 21V4h5v17zM16 21v-8h5v8z',
    shield: 'f:M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z',
    rocket: 'f:M12 2c3 2.5 4.5 6 4.5 10v5h-9v-5C7.5 8 9 4.5 12 2zM7.5 14 4 18v3l3.5-2zM16.5 14l3.5 4v3l-3.5-2z',
    sam: 's:M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 1.5V7M12 17v5.5M1.5 12H7M17 12h5.5M12 11.8v.4',
    warship: 'f:M2 15h20l-2.5 5.5h-15zM7 11h10v3H7zM10 7h4v3.5h-4zM13.5 8.2h6v1.3h-6z',
    atom: 'f:M12 2l2.2 5.3L19.5 5l-2.3 5.3 5.3 1.7-5.3 1.7 2.3 5.3-5.3-2.3L12 22l-2.2-5.3L4.5 19l2.3-5.3L1.5 12l5.3-1.7L4.5 5l5.3 2.3z',
    hydro: 'e:M12 1l2.6 6.2L21 4.5l-2.7 6.4L24 12l-5.7 1.1L21 19.5l-6.4-2.7L12 23l-2.6-6.2L3 19.5l2.7-6.4L0 12l5.7-1.1L3 4.5l6.4 2.7zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    mirv: 'f:M5 4c1.5 1.5 2 3.5 2 6v4H3v-4c0-2.5.5-4.5 2-6zM12 2c1.5 1.5 2 3.5 2 6v6h-4V8c0-2.5.5-4.5 2-6zM19 4c1.5 1.5 2 3.5 2 6v4h-4v-4c0-2.5.5-4.5 2-6zM3 16h18v2H3zM6 20h12v2H6z',
    pause: 'f:M6 4h4v16H6zM14 4h4v16h-4z',
    play: 'f:M7 4l13 8-13 8z',
    menu: 's:M4 7h16M4 12h16M4 17h16',
    home: 's:M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v4M12 18v4M2 12h4M18 12h4',
    crown: 'f:M3 18.5h18l1.5-10.5-5.5 4-5-7-5 7-5.5-4z',
    chev: 's:M6 9l6 6 6-6',
    swap: 's:M4 8h14l-3-3M20 16H6l3 3',
    gift: 's:M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-4 0-5-4-2-4 2 0 2 4 2 4zM12 7c4 0 5-4 2-4-2 0-2 4-2 4z'
  };
  G.svg = function (name, color) {
    const d = IC[name], kind = d[0], path = d.slice(2);
    const attr = kind === 's'
      ? 'fill="none" stroke="' + (color || 'currentColor') + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
      : 'fill="' + (color || 'currentColor') + '"' + (kind === 'e' ? ' fill-rule="evenodd"' : '');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" aria-hidden="true"><path ' + attr + ' d="' + path + '"/></svg>';
  };
  const UICON = { 1: 'city', 2: 'shield', 3: 'anchor', 4: 'rocket', 5: 'sam', 6: 'warship', 11: 'atom', 12: 'hydro', 13: 'mirv' };
  G.UICON = UICON;

  const FONT = "'Barlow Condensed','Arial Narrow',system-ui,sans-serif";

  // Kann dieses Gerät Flaggen-Emoji farbig darstellen? Sonst lassen wir sie weg.
  G.flagsOK = (function () {
    try {
      const c = document.createElement('canvas');
      c.width = 28; c.height = 28;
      const x = c.getContext('2d', { willReadFrequently: true });
      x.font = '18px sans-serif'; x.textBaseline = 'top'; x.fillStyle = '#000';
      x.fillText('\uD83C\uDDE8\uD83C\uDDED', 1, 3);
      const d = x.getImageData(0, 0, 28, 28).data;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] > 80 && (Math.abs(d[i] - d[i + 1]) > 40 || Math.abs(d[i + 1] - d[i + 2]) > 40)) return true;
      }
    } catch (e) { /* dann eben ohne */ }
    return false;
  })();

  class Renderer {
    constructor(canvas, game) {
      this.cv = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
      this.game = game;
      const m = game.map;
      this.mc = document.createElement('canvas'); this.mc.width = m.W; this.mc.height = m.H;
      this.mx = this.mc.getContext('2d');
      this.img = this.mx.createImageData(m.W, m.H); this.data = this.img.data;
      this.base = new Uint8Array(m.N * 3);
      this.cam = { x: m.W / 2, y: m.H / 2, z: 1 };
      this.dpr = 1; this.cw = 1; this.ch = 1;
      this.fxs = []; this.marker = -1; this.showNames = true; this.leader = 0;
      this.icons = {};
      for (const k of [1, 2, 3, 4, 5]) {
        const im = new Image();
        im.src = 'data:image/svg+xml;utf8,' + encodeURIComponent(G.svg(UICON[k], '#ffffff'));
        this.icons[k] = im;
      }
      this._base();
      this.resize();
      this.fit();
      this.paintAll();
    }

    _base() {
      const m = this.game.map, b = this.base, land = m.land, mag = m.mag, shore = m.shore;
      for (let t = 0; t < m.N; t++) {
        const v = mag[t];
        let r, g, bl;
        if (land[t]) {
          if (shore[t]) { r = 216; g = 207; bl = 163; }
          else if (v < 10) { r = 180 + v; g = 214 - 2.2 * v; bl = 138; }
          else if (v < 20) { const k = v - 10; r = 198 + 2.2 * k; g = 186 + 1.8 * k; bl = 142 + 2.4 * k; }
          else { const k = v - 20; r = 206 + 4 * k; g = 207 + 4 * k; bl = 212 + 3.8 * k; }
        } else if (shore[t]) { r = 104; g = 154; bl = 206; }
        else { const f = Math.min(v, 12) / 12; r = 68 - 28 * f; g = 126 - 36 * f; bl = 180 - 32 * f; }
        b[t * 3] = r; b[t * 3 + 1] = g; b[t * 3 + 2] = bl;
      }
    }

    paint(t) {
      const g = this.game, o = g.owner, id = o[t], d = this.data, b = this.base, i = t * 4, j = t * 3;
      let r = b[j], gg = b[j + 1], bb = b[j + 2];
      if (id) {
        const p = g.players[id], W = g.W, x = t % W;
        const border = (x > 0 && o[t - 1] !== id) || (x < W - 1 && o[t + 1] !== id) ||
                       (t >= W && o[t - W] !== id) || (t < g.N - W && o[t + W] !== id);
        if (border) {
          const c = p.bcolor;
          r = c[0]; gg = c[1]; bb = c[2];
          if (p.defs.length && ((x + ((t / W) | 0)) & 1) === 0 && g._defended(p, t)) {
            r = Math.min(255, r + 120); gg = Math.min(255, gg + 120); bb = Math.min(255, bb + 120);
          }
        } else {
          const c = p.color;
          r = r * 0.36 + c[0] * 0.64; gg = gg * 0.36 + c[1] * 0.64; bb = bb * 0.36 + c[2] * 0.64;
        }
      } else if (g.fallout[t]) {
        r = r * 0.45 + 52; gg = gg * 0.45 + 120; bb = bb * 0.45 + 30;
      }
      d[i] = r; d[i + 1] = gg; d[i + 2] = bb; d[i + 3] = 255;
    }

    paintAll() {
      const N = this.game.N;
      for (let t = 0; t < N; t++) this.paint(t);
      this.mx.putImageData(this.img, 0, 0);
      this.game.dn = 0; this.game.dflag.fill(0);
    }

    // Geänderte Felder nachzeichnen
    flush() {
      const g = this.game, n = g.dn;
      if (!n) return;
      const q = g.dq, f = g.dflag, W = g.W;
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      for (let k = 0; k < n; k++) {
        const t = q[k];
        f[t] = 0;
        this.paint(t);
        const x = t % W, y = (t / W) | 0;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
      g.dn = 0;
      this.mx.putImageData(this.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    }

    resize() {
      const r = this.cv.getBoundingClientRect();
      this.dpr = Math.min(2.5, window.devicePixelRatio || 1);
      this.cw = Math.max(1, r.width); this.ch = Math.max(1, r.height);
      const w = Math.round(this.cw * this.dpr), h = Math.round(this.ch * this.dpr);
      if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    }

    minZoom() { return Math.min(this.cw / this.game.W, this.ch / this.game.H) * 0.85; }

    fit() {
      const g = this.game;
      this.cam.z = Math.min(this.cw / g.W, this.ch / g.H);
      this.cam.x = g.W / 2; this.cam.y = g.H / 2;
    }

    clamp() {
      const g = this.game, c = this.cam;
      c.z = Math.max(this.minZoom(), Math.min(26, c.z));
      c.x = Math.max(0, Math.min(g.W, c.x)); c.y = Math.max(0, Math.min(g.H, c.y));
    }

    zoomAt(px, py, f) {
      const c = this.cam, wx = (px - this.cw / 2) / c.z + c.x, wy = (py - this.ch / 2) / c.z + c.y;
      c.z *= f;
      this.clamp();
      c.x = wx - (px - this.cw / 2) / c.z; c.y = wy - (py - this.ch / 2) / c.z;
      this.clamp();
    }

    center(x, y, z) { this.cam.x = x; this.cam.y = y; if (z) this.cam.z = z; this.clamp(); }

    // Bildschirmpunkt -> Feld (oder -1)
    tileAt(px, py) {
      const c = this.cam, g = this.game;
      const x = Math.floor((px - this.cw / 2) / c.z + c.x), y = Math.floor((py - this.ch / 2) / c.z + c.y);
      if (x < 0 || y < 0 || x >= g.W || y >= g.H) return -1;
      return y * g.W + x;
    }

    screenOf(x, y) {
      const c = this.cam;
      return [(x + 0.5 - c.x) * c.z + this.cw / 2, (y + 0.5 - c.y) * c.z + this.ch / 2];
    }

    render(alpha, now) {
      const ctx = this.ctx, cv = this.cv, g = this.game, c = this.cam, dpr = this.dpr;
      const z = c.z * dpr, ox = cv.width / 2 - c.x * z, oy = cv.height / 2 - c.y * z;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#15293a';
      ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.setTransform(z, 0, 0, z, ox, oy);
      ctx.imageSmoothingEnabled = c.z < 1.6;
      ctx.drawImage(this.mc, 0, 0);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.z = z; this.ox = ox; this.oy = oy;

      // neue Effekte übernehmen
      if (g.fx.length) {
        for (const e of g.fx) { e.born = now; this.fxs.push(e); }
        g.fx.length = 0;
      }
      if (this.showNames) this._names(ctx, z, ox, oy, dpr);
      this._structures(ctx, z, ox, oy, dpr);
      this._ships(ctx, z, ox, oy, dpr, alpha);
      this._bombs(ctx, z, ox, oy, dpr, alpha, now);
      this._effects(ctx, z, ox, oy, dpr, now);
      if (this.marker >= 0) {
        const x = (this.marker % g.W + 0.5) * z + ox, y = (((this.marker / g.W) | 0) + 0.5) * z + oy;
        ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 2 * dpr;
        ctx.beginPath(); ctx.arc(x, y, Math.max(5 * dpr, z * 0.8), 0, 6.283); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.lineWidth = dpr;
        ctx.beginPath(); ctx.arc(x, y, Math.max(5 * dpr, z * 0.8) + 2 * dpr, 0, 6.283); ctx.stroke();
      }
      if (g.phase === 'spawn' && g.human.spawned) {
        const t = g.human.spawnTile, x = (t % g.W + 0.5) * z + ox, y = (((t / g.W) | 0) + 0.5) * z + oy;
        const k = (now % 1400) / 1400, rad = Math.max(14 * dpr, z * 6) * (0.6 + k * 1.2);
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - k).toFixed(3) + ')'; ctx.lineWidth = 3 * dpr;
        ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.stroke();
      }
    }

    _structures(ctx, z, ox, oy, dpr) {
      const g = this.game, cv = this.cv;
      if (!g.structAt.size) return;
      const rad = Math.max(2.6, Math.min(12, (z / dpr) * 3.4)) * dpr;
      const glyph = rad >= 6.2 * dpr;
      for (const u of g.structAt.values()) {
        const x = (u.x + 0.5) * z + ox, y = (u.y + 0.5) * z + oy;
        if (x < -rad || y < -rad || x > cv.width + rad || y > cv.height + rad) continue;
        const p = u.owner, c = p.bcolor, wip = u.building > 0;
        ctx.globalAlpha = wip ? 0.55 : 1;
        ctx.beginPath();
        if (u.type === U.DEFENSE) {
          ctx.moveTo(x - rad, y - rad); ctx.lineTo(x + rad, y - rad); ctx.lineTo(x + rad, y + rad * 0.15);
          ctx.lineTo(x, y + rad * 1.15); ctx.lineTo(x - rad, y + rad * 0.15); ctx.closePath();
        } else if (u.type === U.SILO) {
          ctx.moveTo(x, y - rad * 1.2); ctx.lineTo(x + rad * 1.1, y + rad * 0.9); ctx.lineTo(x - rad * 1.1, y + rad * 0.9); ctx.closePath();
        } else if (u.type === U.SAM) {
          ctx.moveTo(x, y - rad * 1.15); ctx.lineTo(x + rad * 1.15, y); ctx.lineTo(x, y + rad * 1.15); ctx.lineTo(x - rad * 1.15, y); ctx.closePath();
        } else if (u.type === U.PORT) {
          ctx.rect(x - rad * 0.95, y - rad * 0.95, rad * 1.9, rad * 1.9);
        } else ctx.arc(x, y, rad, 0, 6.283);
        ctx.fillStyle = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        ctx.fill();
        ctx.lineWidth = Math.max(1, rad * 0.16); ctx.strokeStyle = '#ffffff';
        ctx.stroke();
        if (glyph) {
          const im = this.icons[u.type], s = rad * (u.type === U.SILO ? 0.95 : 1.25);
          if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x - s / 2, y - s / 2 + (u.type === U.SILO ? rad * 0.18 : 0), s, s);
          if (u.level > 1) {
            ctx.font = '700 ' + Math.round(rad * 0.95) + 'px ' + FONT;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            const bx = x + rad * 0.95, by = y - rad * 0.95;
            ctx.fillStyle = '#10202c'; ctx.beginPath(); ctx.arc(bx, by, rad * 0.62, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#ffd77a'; ctx.fillText(String(u.level), bx, by + rad * 0.05);
          }
        }
        if (wip) {
          const tot = G.UINFO[u.type].time, k = 1 - u.building / tot;
          ctx.globalAlpha = 1; ctx.strokeStyle = '#ffd77a'; ctx.lineWidth = Math.max(1.5, rad * 0.22);
          ctx.beginPath(); ctx.arc(x, y, rad * 1.45, -1.571, -1.571 + 6.283 * k); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    }

    _ships(ctx, z, ox, oy, dpr, alpha) {
      const g = this.game, cv = this.cv, us = g.units;
      const s = Math.max(2.2, Math.min(9, (z / dpr) * 1.7)) * dpr;
      for (let i = 0; i < us.length; i++) {
        const u = us[i];
        if (!u.alive || u.type < U.WARSHIP || u.type > U.SAMM) continue;
        const wx = u.px + (u.x - u.px) * alpha, wy = u.py + (u.y - u.py) * alpha;
        const x = (wx + 0.5) * z + ox, y = (wy + 0.5) * z + oy;
        if (x < -20 || y < -20 || x > cv.width + 20 || y > cv.height + 20) continue;
        const c = u.owner.color;
        if (u.type === U.SHELL || u.type === U.SAMM) {
          ctx.fillStyle = u.type === U.SHELL ? '#ffe9a8' : '#ffffff';
          ctx.beginPath(); ctx.arc(x, y, Math.max(1.5 * dpr, s * 0.35), 0, 6.283); ctx.fill();
          continue;
        }
        const col = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        // Fahrtrichtung
        let ang = Math.atan2(u.y - u.py, u.x - u.px);
        if (u.x === u.px && u.y === u.py) ang = u.ang || 0; else u.ang = ang;
        ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
        ctx.beginPath();
        if (u.type === U.WARSHIP) {
          const k = s * 1.5;
          ctx.moveTo(k * 1.3, 0); ctx.lineTo(k * 0.3, -k * 0.62); ctx.lineTo(-k, -k * 0.62); ctx.lineTo(-k, k * 0.62); ctx.lineTo(k * 0.3, k * 0.62); ctx.closePath();
          ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.3); ctx.strokeStyle = '#10202c'; ctx.stroke();
          ctx.fillStyle = '#10202c'; ctx.fillRect(-k * 0.35, -k * 0.2, k * 0.6, k * 0.4);
        } else if (u.type === U.TRANSPORT) {
          ctx.moveTo(s * 1.25, 0); ctx.lineTo(-s * 0.9, -s * 0.8); ctx.lineTo(-s * 0.9, s * 0.8); ctx.closePath();
          ctx.fillStyle = col; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.3); ctx.strokeStyle = '#ffffff'; ctx.stroke();
        } else {
          ctx.rect(-s * 0.85, -s * 0.5, s * 1.7, s);
          ctx.fillStyle = u.captured ? '#10202c' : '#f4ead0'; ctx.fill(); ctx.lineWidth = Math.max(1, s * 0.28); ctx.strokeStyle = col; ctx.stroke();
        }
        ctx.restore();
        if (u.type === U.WARSHIP && u.hp < 1000 && s > 4 * dpr) {
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - s * 1.5, y - s * 2.3, s * 3, s * 0.45);
          ctx.fillStyle = u.hp > 500 ? '#5fd08f' : '#f26a5e'; ctx.fillRect(x - s * 1.5, y - s * 2.3, s * 3 * (u.hp / 1000), s * 0.45);
        }
      }
    }

    _bombs(ctx, z, ox, oy, dpr, alpha, now) {
      const g = this.game, us = g.units, R = g.R;
      for (let i = 0; i < us.length; i++) {
        const u = us[i];
        if (!u.alive || u.type < U.ATOM) continue;
        const wx = u.px + (u.x - u.px) * alpha, wy = u.py + (u.y - u.py) * alpha;
        const k = Math.min(1, u.prog / u.dist), alt = Math.sin(Math.PI * k) * Math.min(u.dist * 0.18, 46);
        const x = (wx + 0.5) * z + ox, y = (wy + 0.5 - alt) * z + oy;
        const tx = (u.tx + 0.5) * z + ox, ty = (u.ty + 0.5) * z + oy;
        if (u.type !== U.WARHEAD) {
          // Zielkreis
          const rad = (u.type === U.HYDRO ? R.hydroOut : u.type === U.ATOM ? R.atomOut : R.mirvOut * 2) * z;
          const pulse = 0.55 + 0.45 * Math.sin(now / 160);
          ctx.strokeStyle = 'rgba(255,70,50,' + (0.45 + 0.4 * pulse).toFixed(3) + ')'; ctx.lineWidth = 2 * dpr;
          ctx.setLineDash([6 * dpr, 5 * dpr]);
          ctx.beginPath(); ctx.arc(tx, ty, Math.max(6 * dpr, rad), 0, 6.283); ctx.stroke();
          ctx.setLineDash([]);
          // Flugbahn
          const sx = (u.sx + 0.5) * z + ox, sy = (u.sy + 0.5) * z + oy;
          ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo((sx + x) / 2, (sy + y) / 2 - alt * z * 0.5, x, y); ctx.stroke();
        }
        const s = (u.type === U.WARHEAD ? 2.2 : u.type === U.ATOM ? 4 : 5.5) * dpr;
        ctx.fillStyle = u.type === U.WARHEAD ? '#ff5a3c' : '#ffffff';
        ctx.beginPath(); ctx.arc(x, y, s, 0, 6.283); ctx.fill();
        if (u.type !== U.WARHEAD) {
          ctx.strokeStyle = '#ff4632'; ctx.lineWidth = 2 * dpr; ctx.stroke();
        }
      }
    }

    _effects(ctx, z, ox, oy, dpr, now) {
      if (!this.fxs.length) return;
      const keep = [];
      for (const e of this.fxs) {
        const life = e.k === 'boom' ? (e.big ? 1400 : 900) : 350, k = (now - e.born) / life;
        if (k >= 1) continue;
        keep.push(e);
        const x = (e.x + 0.5) * z + ox, y = (e.y + 0.5) * z + oy;
        if (e.k === 'boom') {
          const rad = Math.max(4 * dpr, e.r * z * (0.25 + 0.85 * Math.sqrt(k)));
          ctx.fillStyle = 'rgba(255,' + Math.round(240 - 150 * k) + ',' + Math.round(170 - 150 * k) + ',' + (0.75 * (1 - k)).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.9 * (1 - k)).toFixed(3) + ')'; ctx.lineWidth = 3 * dpr;
          ctx.beginPath(); ctx.arc(x, y, rad, 0, 6.283); ctx.stroke();
        } else {
          ctx.fillStyle = 'rgba(255,230,150,' + (1 - k).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(x, y, (3 + 7 * k) * dpr, 0, 6.283); ctx.fill();
        }
      }
      this.fxs = keep;
    }

    _names(ctx, z, ox, oy, dpr) {
      const g = this.game, ps = g.players, cv = this.cv, h = g.human;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      for (let i = 1; i < ps.length; i++) {
        const p = ps[i];
        if (!p.alive || !(p.ns > 0)) continue;
        let fs = p.ns * z;
        if (fs < 8.5 * dpr) continue;
        if (fs > 58 * dpr) fs = 58 * dpr;
        const x = p.nx * z + ox, y = p.ny * z + oy;
        if (x < -200 || y < -60 || x > cv.width + 200 || y > cv.height + 60) continue;
        const ally = h && h !== p && h.allies.has(p.id);
        const label = (G.flagsOK && p.flag && fs > 13 * dpr ? p.flag + ' ' : '') + p.name;
        ctx.font = '700 ' + fs.toFixed(1) + 'px ' + FONT;
        ctx.lineWidth = Math.max(2 * dpr, fs / 5.5);
        ctx.strokeStyle = 'rgba(10,20,28,0.78)';
        ctx.strokeText(label, x, y - fs * 0.28);
        ctx.fillStyle = p === h ? '#fff3c4' : ally ? '#c9f7d9' : '#ffffff';
        ctx.fillText(label, x, y - fs * 0.28);
        const f2 = fs * 0.74;
        if (f2 >= 7.5 * dpr) {
          let sub = G.fmtTroops(p.troops);
          if (g.ticks < p.traitorUntil) sub += ' · Verräter';
          else if (ally) sub += ' · verbündet';
          ctx.font = '600 ' + f2.toFixed(1) + 'px ' + FONT;
          ctx.lineWidth = Math.max(2 * dpr, f2 / 5.5);
          ctx.strokeText(sub, x, y + fs * 0.52);
          ctx.fillStyle = g.ticks < p.traitorUntil ? '#ffb4a8' : '#e6eef2';
          ctx.fillText(sub, x, y + fs * 0.52);
        }
        if (p.id === this.leader && fs > 12 * dpr) {
          const cs = fs * 0.9, cx = x - cs / 2, cy = y - fs * 0.28 - fs * 0.55 - cs;
          ctx.save(); ctx.translate(cx, cy); ctx.scale(cs / 24, cs / 24);
          if (!this.crownPath) this.crownPath = new Path2D(IC.crown.slice(2));
          ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(10,20,28,0.8)'; ctx.stroke(this.crownPath);
          ctx.fillStyle = '#ffcc4d'; ctx.fill(this.crownPath);
          ctx.restore();
        }
      }
    }
  }
  G.Renderer = Renderer;
})(window.G);
