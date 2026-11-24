// The map drawn by the graphics card (WebGL 2, doku/leistung.md, 25.11.2026).
//
// Until now every changed tile was coloured in JavaScript (View.color) and copied into a picture
// of the whole map, 16 million pixels on the Earth, that the browser then took to the graphics
// card again. Here the card gets the numbers and works out the colours itself:
//   own    per tile: owner (bits 0-12), defended by an own defence post (bit 13), fallout (bit 14)
//   base   per tile: the colour of the ground, alpha = a river (only the Earth has them)
//   pal    per player: border, defended border, colour, colour at 85 % saturation
//   cell   per cell of the posture (16 x 16 tiles): up to four owners with their density step,
//          each as owner << 8 | step
// A first pass colours the changed tiles into a colour picture of the map: each changed tile as
// one point (one draw for all of them), and whole blocks of 32 x 32 tiles where the shading or
// the colours of a player changed. A second pass shows that picture with the camera, every frame.
// Only with a graphics card: where the browser would draw WebGL in software (no card, or one it
// does not trust), the 2D picture is faster, and that is used instead (?gl=1 forces WebGL).
// The rules are those of View.color; test/gl.js reads the picture back and compares every tile.
//
// Maps larger than the card's largest texture are cut into pieces (chunks), each with a rim of
// one tile from its neighbours, so a border between two pieces is found as anywhere else.
(function (G) {
  'use strict';
  const BSH = 5, BLK = 1 << BSH;          // blocks of 32 x 32 tiles, as View.flush
  const OWN = 0x1fff, DEF = 0x2000, FALL = 0x4000;
  const PALW = 1024;                      // palette: 1024 players per row, four rows per kind

  const VS_TILE = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;
  // one changed tile: aPos is the tile, uOrg and uSize the chunk
  const VS_POINT = `#version 300 es
in vec2 aPos;
uniform vec2 uOrgF, uSize;
void main() { gl_Position = vec4((aPos - uOrgF + 0.5) / uSize * 2.0 - 1.0, 0.0, 1.0); gl_PointSize = 1.0; }`;
  // the colour of one tile, as View.color
  const FS_TILE = `#version 300 es
precision highp float; precision highp int;
uniform highp usampler2D uOwn;
uniform sampler2D uBase;
uniform sampler2D uPal;
uniform highp usampler2D uCell;
uniform ivec2 uOrg, uMap, uCells;
uniform int uFeat, uCS, uRows;
out vec4 outc;
uint ownAt(ivec2 l) { return texelFetch(uOwn, l + 1, 0).r; }
ivec3 pal(int kind, uint o) { int i = int(o); return ivec3(texelFetch(uPal, ivec2(i % ${PALW}, kind * uRows + i / ${PALW}), 0).rgb * 255.0 + 0.5); }
float stepAt(int cx, int cy, uint o) {
  if (cx < 0 || cy < 0 || cx >= uCells.x || cy >= uCells.y) return 0.0;
  uvec4 c = texelFetch(uCell, ivec2(cx, cy), 0);
  if ((c.r >> 8u) == o) return float(c.r & 255u);
  if ((c.g >> 8u) == o) return float(c.g & 255u);
  if ((c.b >> 8u) == o) return float(c.b & 255u);
  if ((c.a >> 8u) == o) return float(c.a & 255u);
  return 0.0;
}
ivec3 dense(uint o, ivec2 g, ivec3 c) {
  float cs = float(uCS), fx = (float(g.x) + 0.5) / cs - 0.5, fy = (float(g.y) + 0.5) / cs - 0.5;
  int cx = int(floor(fx)), cy = int(floor(fy));
  float ax = fx - float(cx), ay = fy - float(cy);
  float st = (stepAt(cx, cy, o) * (1.0 - ax) + stepAt(cx + 1, cy, o) * ax) * (1.0 - ay) + (stepAt(cx, cy + 1, o) * (1.0 - ax) + stepAt(cx + 1, cy + 1, o) * ax) * ay;
  if (st < 0.25) return c;
  int f = 256 - int(floor(st * 19.0 + 0.5));
  return (c * f) >> 8;
}
void main() {
  ivec2 l = ivec2(gl_FragCoord.xy), g = l + uOrg;
  uint w = ownAt(l), o = w & ${OWN}u;
  vec4 bt = texelFetch(uBase, l, 0);
  ivec3 b = ivec3(bt.rgb * 255.0 + 0.5), c;
  if (o == 0u) {
    c = (w & ${FALL}u) == 0u ? b : (b * 120 + ivec3(104, 214, 78) * 136) >> 8;
  } else {
    bool edge = (g.x > 0 && (ownAt(l + ivec2(-1, 0)) & ${OWN}u) != o) || (g.x < uMap.x - 1 && (ownAt(l + ivec2(1, 0)) & ${OWN}u) != o) ||
      (g.y > 0 && (ownAt(l + ivec2(0, -1)) & ${OWN}u) != o) || (g.y < uMap.y - 1 && (ownAt(l + ivec2(0, 1)) & ${OWN}u) != o);
    if (edge) c = pal((w & ${DEF}u) != 0u && ((g.x + g.y) & 1) == 1 ? 1 : 0, o);
    else if (uFeat == 1) {
      ivec3 pc = pal(2, o);
      if (bt.a > 0.5) c = dense(o, g, (b * 120 + pc * 136) >> 8);
      else {
        int lum = (b.r * 77 + b.g * 150 + b.b * 29) >> 8, f = 226 + lum * 40 / 190;
        ivec3 r = (((pc * f) >> 8) * 226 + b * 30) >> 8;
        c = dense(o, g, min(r, ivec3(255)));
      }
    } else c = dense(o, g, (b * 105 + pal(3, o) * 151) >> 8);
  }
  outc = vec4(vec3(c) / 255.0, 1.0);
}`;
  // the colour picture on the screen
  const VS_MAP = `#version 300 es
in vec2 aPos;
uniform vec4 uRect;   // x0, y0, x1, y1 of the chunk in tiles
uniform vec4 uCam;    // z, ox, oy in device pixels, and 0
uniform vec2 uView;   // canvas size in device pixels
out vec2 vUV;
void main() {
  vec2 t = mix(uRect.xy, uRect.zw, aPos);
  vec2 p = t * uCam.x + uCam.yz;
  vUV = aPos;
  gl_Position = vec4(p.x / uView.x * 2.0 - 1.0, 1.0 - p.y / uView.y * 2.0, 0.0, 1.0);
}`;
  const FS_MAP = `#version 300 es
precision mediump float;
uniform sampler2D uColor;
in vec2 vUV;
out vec4 outc;
void main() { outc = texture(uColor, vUV); }`;

  function shader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error('shader: ' + gl.getShaderInfoLog(s));
    return s;
  }
  function program(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('program: ' + gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u };
  }
  function tex(gl, filter) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter || gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  function unpack(gl, row, x, y) {
    gl.pixelStorei(gl.UNPACK_ROW_LENGTH, row); gl.pixelStorei(gl.UNPACK_SKIP_PIXELS, x); gl.pixelStorei(gl.UNPACK_SKIP_ROWS, y);
  }

  // canvas: the <canvas> to draw into; map, base (the ground colours, View.base); chunk: the
  // largest piece (tests use a small one to try the cutting). Throws if WebGL 2 is not there.
  function MapGL(canvas, map, base, chunk) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, premultipliedAlpha: false, preserveDrawingBuffer: false, failIfMajorPerformanceCaveat: !MapGL.forced() });
    if (!gl) throw new Error('no WebGL 2 on a graphics card');
    this.gl = gl; this.cv = canvas; this.map = map; this.game = null;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1); gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const W = map.W, H = map.H, N = map.N;
    const max = Math.min(gl.getParameter(gl.MAX_TEXTURE_SIZE), 8192);
    const C = this.C = Math.max(64, Math.min(chunk || max, max) - 2);
    this.tile = program(gl, VS_TILE, FS_TILE);
    this.point = program(gl, VS_POINT, FS_TILE);
    this.show = program(gl, VS_MAP, FS_MAP);
    this.word = new Uint16Array(N);                 // the own texture's numbers, for the whole map
    this.bw = (W + BLK - 1) >> BSH; this.bh = (H + BLK - 1) >> BSH;
    this.blk = new Uint8Array(this.bw * this.bh); this.anyBlk = false;   // blocks to colour whole
    this.up = new Uint8Array(this.bw * this.bh);                           // blocks whose numbers changed
    this.pts = new Float32Array(2 * 4096); this.np = 0;                    // changed tiles, x and y
    this.quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
    this.rects = gl.createBuffer(); this.rectData = new Float32Array(12 * 256);
    this.vao = gl.createVertexArray();
    // the ground colours with the rivers in alpha
    const rgba = new Uint8Array(N * 4), b32 = new Uint32Array(rgba.buffer), feat = map.feat;
    for (let i = 0; i < N; i++) b32[i] = feat && (feat[i] & 1) ? base[i] | 0xff000000 : base[i] & 0x00ffffff;
    this.chunks = [];
    for (let y0 = 0; y0 < H; y0 += C) for (let x0 = 0; x0 < W; x0 += C) {
      const cw = Math.min(C, W - x0), ch = Math.min(C, H - y0), k = { x0: x0, y0: y0, w: cw, h: ch };
      k.own = tex(gl);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.R16UI, cw + 2, ch + 2, 0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, null);
      k.base = tex(gl);
      unpack(gl, W, x0, y0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, rgba);
      k.color = tex(gl, gl.LINEAR);
      unpack(gl, 0, 0, 0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, cw, ch, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      k.fbo = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, k.color, 0);
      if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('framebuffer');
      this.chunks.push(k);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    unpack(gl, 0, 0, 0);
    this.pal = tex(gl); this.palRows = 0; this.palN = 0;
    this.cell = tex(gl); this.cells = null; this.CW = 0; this.CH = 0; this.cellDirty = false;
    this.lost = false;
    const self = this;
    canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); self.lost = true; if (self.onLost) self.onLost(); }, false);
    this.setGame(null);   // the bare map, until a game is on it
    if (gl.getError() !== gl.NO_ERROR) throw new Error('WebGL error while setting up');
  }

  // A new game on the map: every tile from the game, the palette, no shading yet.
  MapGL.prototype.setGame = function (g) {
    this.game = g;
    const map = this.map, N = map.N, w = this.word;
    if (g) for (let t = 0; t < N; t++) w[t] = this.wordOf(g, t);
    else w.fill(0);
    const CS = G.POST.cell;
    this.CW = (g && g.CW) || Math.ceil(map.W / CS); this.CH = Math.ceil(map.H / CS);
    this.cells = new Uint32Array(this.CW * this.CH * 4);
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.cell);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32UI, this.CW, this.CH, 0, gl.RGBA_INTEGER, gl.UNSIGNED_INT, this.cells);
    this.palette();
    for (const k of this.chunks) this.upload(k, k.x0 - 1, k.y0 - 1, k.w + 2, k.h + 2);
    this.blk.fill(1); this.anyBlk = true;
    this.render();
  };
  MapGL.prototype.wordOf = function (g, t) {
    const o = g.owner[t];
    if (!o) return g.fallout[t] ? FALL : 0;
    const p = g.players[o];
    if (p.dposts && p.dposts.length) {
      const W = g.W, x = t % W, y = (t - x) / W, r2 = g.R.defense * g.R.defense;
      for (let i = 0; i < p.dposts.length; i++) {
        const dx = p.dposts[i].x - x, dy = p.dposts[i].y - y;
        if (dx * dx + dy * dy <= r2) return o | DEF;
      }
    }
    return o;
  };
  // the players' colours (View.setGame and View.borderColors have worked them out)
  MapGL.prototype.palette = function () {
    const g = this.game, n = g ? g.players.length : 1, rows = Math.ceil(n / PALW), d = new Uint8Array(PALW * rows * 4 * 4);
    const put = function (kind, i, r, gg, b) { const k = ((kind * rows + ((i / PALW) | 0)) * PALW + i % PALW) * 4; d[k] = r; d[k + 1] = gg; d[k + 2] = b; d[k + 3] = 255; };
    for (let i = 1; i < n; i++) {
      const p = g.players[i];
      if (!p || p.c32b === undefined) continue;
      put(0, i, p.c32b & 255, (p.c32b >>> 8) & 255, (p.c32b >>> 16) & 255);
      put(1, i, p.c32l & 255, (p.c32l >>> 8) & 255, (p.c32l >>> 16) & 255);
      put(2, i, p.r, p.g, p.b);
      put(3, i, p.rs, p.gs, p.bs);
    }
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.pal);
    unpack(gl, 0, 0, 0);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, PALW, rows * 4, 0, gl.RGBA, gl.UNSIGNED_BYTE, d);
    this.palRows = rows; this.palN = n;
  };
  // the colours changed (an alliance made or broken): the whole map again
  MapGL.prototype.recolour = function () { this.palette(); this.blk.fill(1); this.anyBlk = true; };
  // one tile changed hands (or its border, or its fallout): View.flush calls this for each
  MapGL.prototype.mark = function (t) {
    const g = this.game, W = g.W, x = t % W, y = (t - x) / W;
    this.word[t] = this.wordOf(g, t);
    this.up[(y >> BSH) * this.bw + (x >> BSH)] = 1;
    if (this.np * 2 + 2 > this.pts.length) { const e = new Float32Array(this.pts.length * 2); e.set(this.pts); this.pts = e; }
    this.pts[this.np * 2] = x; this.pts[this.np * 2 + 1] = y; this.np++;
  };
  // the density step of a cell for one owner (View.shadeScan): up to four owners per cell
  MapGL.prototype.shade = function (cell, o, st) {
    const c = this.cells, k = cell * 4;
    let at = -1, free = -1;
    for (let i = k; i < k + 4; i++) { if (c[i] >>> 8 === o) at = i; else if (free < 0 && !(c[i] & 255)) free = i; }
    if (at >= 0) { if ((c[at] & 255) === st) return; c[at] = st ? (o << 8 | st) >>> 0 : 0; }
    else if (!st) return;
    else if (free >= 0) c[free] = (o << 8 | st) >>> 0;
    else return;   // a fifth owner in one cell: it goes without shading there until room is free
    this.cellDirty = true;
    // the blend reaches half a cell into the neighbours
    const CS = G.POST.cell, cx = cell % this.CW, cy = (cell - cx) / this.CW;
    const x0 = Math.max(0, (cx - 1) * CS) >> BSH, x1 = Math.min(this.map.W - 1, (cx + 2) * CS - 1) >> BSH;
    const y0 = Math.max(0, (cy - 1) * CS) >> BSH, y1 = Math.min(this.map.H - 1, (cy + 2) * CS - 1) >> BSH;
    for (let by = y0; by <= y1; by++) for (let bx = x0; bx <= x1; bx++) this.blk[by * this.bw + bx] = 1;
    this.anyBlk = true;
  };
  // tiles of the map (x, y, w, h, may reach past it) into the own texture of a chunk, with its rim
  MapGL.prototype.upload = function (k, x, y, w, h) {
    const W = this.map.W, H = this.map.H;
    let x0 = Math.max(x, k.x0 - 1, 0), y0 = Math.max(y, k.y0 - 1, 0);
    const x1 = Math.min(x + w, k.x0 + k.w + 1, W), y1 = Math.min(y + h, k.y0 + k.h + 1, H);
    if (x1 <= x0 || y1 <= y0) return;
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, k.own);
    unpack(gl, W, x0, y0);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, x0 - (k.x0 - 1), y0 - (k.y0 - 1), x1 - x0, y1 - y0, gl.RED_INTEGER, gl.UNSIGNED_SHORT, this.word);
  };
  // The changed blocks: their numbers to the card, their colours worked out anew.
  MapGL.prototype.render = function () {
    if (this.lost || (!this.anyBlk && !this.np)) return;
    const gl = this.gl, bw = this.bw, bh = this.bh, W = this.map.W, H = this.map.H;
    if (this.game && this.game.players.length > this.palN) this.palette();
    if (this.cellDirty) {
      gl.bindTexture(gl.TEXTURE_2D, this.cell);
      unpack(gl, 0, 0, 0);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.CW, this.CH, gl.RGBA_INTEGER, gl.UNSIGNED_INT, this.cells);
      this.cellDirty = false;
    }
    // runs of marked blocks in a row, as rectangles in tiles
    const runsOf = function (mk) {
      const runs = [];
      for (let by = 0; by < bh; by++) {
        const row = by * bw;
        for (let bx = 0; bx < bw; bx++) {
          if (!mk[row + bx]) continue;
          let ex = bx;
          while (ex + 1 < bw && mk[row + ex + 1]) ex++;
          for (let i = bx; i <= ex; i++) mk[row + i] = 0;
          runs.push(bx * BLK, by * BLK, Math.min(W, (ex + 1) * BLK), Math.min(H, (by + 1) * BLK));
          bx = ex;
        }
      }
      return runs;
    };
    // the numbers of the changed blocks to the card, one tile wider all round (a border looks at
    // its neighbours, and a chunk keeps a rim of its neighbours' tiles)
    const up = runsOf(this.up);
    for (const k of this.chunks) for (let i = 0; i < up.length; i += 4) this.upload(k, up[i] - 1, up[i + 1] - 1, up[i + 2] - up[i] + 2, up[i + 3] - up[i + 1] + 2);
    unpack(gl, 0, 0, 0);
    const runs = this.anyBlk ? runsOf(this.blk) : [];
    this.anyBlk = false;
    gl.bindVertexArray(this.vao);
    gl.disable(gl.BLEND);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.rects);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const uni = (P) => {
      gl.useProgram(P.p);
      gl.uniform2i(P.u.uMap, W, H); gl.uniform2i(P.u.uCells, this.CW, this.CH);
      gl.uniform1i(P.u.uFeat, this.map.feat ? 1 : 0); gl.uniform1i(P.u.uCS, G.POST.cell); gl.uniform1i(P.u.uRows, this.palRows);
      gl.uniform1i(P.u.uOwn, 0); gl.uniform1i(P.u.uBase, 1); gl.uniform1i(P.u.uPal, 2); gl.uniform1i(P.u.uCell, 3);
    };
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, this.pal);
    gl.activeTexture(gl.TEXTURE3); gl.bindTexture(gl.TEXTURE_2D, this.cell);
    const one = this.chunks.length === 1;
    for (const k of this.chunks) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.fbo);
      gl.viewport(0, 0, k.w, k.h);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, k.own);
      gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, k.base);
      // whole blocks
      let n = 0, d = this.rectData;
      for (let i = 0; i < runs.length; i += 4) {
        const x0 = Math.max(runs[i], k.x0), y0 = Math.max(runs[i + 1], k.y0), x1 = Math.min(runs[i + 2], k.x0 + k.w), y1 = Math.min(runs[i + 3], k.y0 + k.h);
        if (x1 <= x0 || y1 <= y0) continue;
        if ((n + 1) * 12 > d.length) { const e = new Float32Array(d.length * 2); e.set(d); d = this.rectData = e; }
        const ax = (x0 - k.x0) / k.w * 2 - 1, bx = (x1 - k.x0) / k.w * 2 - 1, ay = (y0 - k.y0) / k.h * 2 - 1, by = (y1 - k.y0) / k.h * 2 - 1, o = n * 12;
        d[o] = ax; d[o + 1] = ay; d[o + 2] = bx; d[o + 3] = ay; d[o + 4] = ax; d[o + 5] = by;
        d[o + 6] = ax; d[o + 7] = by; d[o + 8] = bx; d[o + 9] = ay; d[o + 10] = bx; d[o + 11] = by;
        n++;
      }
      if (n) {
        uni(this.tile);
        gl.uniform2i(this.tile.u.uOrg, k.x0, k.y0);
        gl.bufferData(gl.ARRAY_BUFFER, d.subarray(0, n * 12), gl.STREAM_DRAW);
        gl.drawArrays(gl.TRIANGLES, 0, n * 6);
      }
      // single tiles
      if (this.np) {
        let pts = this.pts, m = this.np;
        if (!one) {
          // only the tiles of this chunk
          if (!this.sel || this.sel.length < this.pts.length) this.sel = new Float32Array(this.pts.length);
          const sel = this.sel;
          m = 0;
          for (let i = 0; i < this.np; i++) {
            const x = this.pts[2 * i], y = this.pts[2 * i + 1];
            if (x >= k.x0 && x < k.x0 + k.w && y >= k.y0 && y < k.y0 + k.h) { sel[2 * m] = x; sel[2 * m + 1] = y; m++; }
          }
          pts = sel;
        }
        if (m) {
          uni(this.point);
          gl.uniform2i(this.point.u.uOrg, k.x0, k.y0);
          gl.uniform2f(this.point.u.uOrgF, k.x0, k.y0); gl.uniform2f(this.point.u.uSize, k.w, k.h);
          gl.bufferData(gl.ARRAY_BUFFER, pts.subarray(0, m * 2), gl.STREAM_DRAW);
          gl.drawArrays(gl.POINTS, 0, m);
        }
      }
    }
    this.np = 0;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };
  // The map on the screen: sea, then the colour picture of every chunk in view. z, ox, oy as in
  // View.draw (CSS pixels); smooth when zoomed out, sharp tiles when zoomed in (as the 2D picture).
  MapGL.prototype.draw = function (z, ox, oy, dpr, sea) {
    if (this.lost) return;
    const gl = this.gl, cv = this.cv, P = this.show;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, cv.width, cv.height);
    gl.clearColor(sea[0] / 255, sea[1] / 255, sea[2] / 255, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(P.p);
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform4f(P.u.uCam, z * dpr, ox * dpr, oy * dpr, 0);
    gl.uniform2f(P.u.uView, cv.width, cv.height);
    gl.uniform1i(P.u.uColor, 0);
    gl.activeTexture(gl.TEXTURE0);
    const filt = z < 1.5 ? gl.LINEAR : gl.NEAREST, cw = cv.width / dpr, ch = cv.height / dpr;
    for (const k of this.chunks) {
      const sx0 = k.x0 * z + ox, sy0 = k.y0 * z + oy, sx1 = (k.x0 + k.w) * z + ox, sy1 = (k.y0 + k.h) * z + oy;
      if (sx1 < 0 || sy1 < 0 || sx0 > cw || sy0 > ch) continue;
      gl.bindTexture(gl.TEXTURE_2D, k.color);
      if (k.filt !== filt) { gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filt); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filt); k.filt = filt; }
      gl.uniform4f(P.u.uRect, k.x0, k.y0, k.x0 + k.w, k.y0 + k.h);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  // for the tests: the colour of every tile, as View.color packs it (r | g << 8 | b << 16 | 255 << 24)
  MapGL.prototype.readAll = function () {
    const gl = this.gl, W = this.map.W, out = new Uint32Array(this.map.N);
    for (const k of this.chunks) {
      const d = new Uint8Array(k.w * k.h * 4), d32 = new Uint32Array(d.buffer);
      gl.bindFramebuffer(gl.FRAMEBUFFER, k.fbo);
      gl.readPixels(0, 0, k.w, k.h, gl.RGBA, gl.UNSIGNED_BYTE, d);
      for (let y = 0; y < k.h; y++) for (let x = 0; x < k.w; x++) out[(k.y0 + y) * W + k.x0 + x] = d32[y * k.w + x];
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return out;
  };
  MapGL.prototype.free = function () {
    const gl = this.gl;
    if (this.lost) return;
    for (const k of this.chunks) { gl.deleteTexture(k.own); gl.deleteTexture(k.base); gl.deleteTexture(k.color); gl.deleteFramebuffer(k.fbo); }
    gl.deleteTexture(this.pal); gl.deleteTexture(this.cell);
    this.chunks = [];
  };
  // ?gl=0: never, ?gl=1: even in software (the tests on a machine without a graphics card)
  const asked = function () { try { return new URLSearchParams(location.search).get('gl'); } catch (e) { return null; } };
  MapGL.forced = function () { return asked() === '1'; };
  // WebGL 2 on a graphics card at hand?
  MapGL.wanted = function () {
    if (asked() === '0') return false;
    try {
      const c = document.createElement('canvas'), gl = c.getContext('webgl2', { failIfMajorPerformanceCaveat: !MapGL.forced() });
      if (!gl) return false;
      // some browsers still hand out a software one: the name of the renderer says so
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : '';
      const lose = gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return MapGL.forced() || !/swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch (e) { return false; }
  };
  G.MapGL = MapGL;
})(globalThis.G = globalThis.G || {});
