/* Grenzland – Einheiten: Gebäude, Schiffe, Bomben, Seewege */
(function (G) {
  'use strict';
  const HUMAN = G.HUMAN, NATION = G.NATION, P = G.Game.prototype;
  const U = G.U = { CITY: 1, DEFENSE: 2, PORT: 3, SILO: 4, SAM: 5, WARSHIP: 6, TRANSPORT: 7, TRADE: 8, SHELL: 9, SAMM: 10, ATOM: 11, HYDRO: 12, MIRV: 13, WARHEAD: 14 };
  G.UINFO = {
    1: { name: 'Stadt', time: 20, up: true, desc: 'Erhöht das Truppenlimit um 25K' },
    2: { name: 'Verteidigungsposten', time: 50, up: false, desc: 'Angreifer verlieren in der Nähe fünfmal mehr Truppen' },
    3: { name: 'Hafen', time: 20, up: true, desc: 'Schickt Handelsschiffe los und baut Kriegsschiffe' },
    4: { name: 'Raketensilo', time: 100, up: true, desc: 'Startet Atombomben, Wasserstoffbomben und MIRV' },
    5: { name: 'Flugabwehr', time: 300, up: true, desc: 'Fängt anfliegende Bomben in der Nähe ab' },
    6: { name: 'Kriegsschiff', desc: 'Versenkt Boote und kapert Handelsschiffe' },
    11: { name: 'Atombombe', desc: 'Zerstört ein kleines Gebiet' },
    12: { name: 'Wasserstoffbombe', desc: 'Zerstört ein grosses Gebiet' },
    13: { name: 'MIRV', desc: 'Trifft das ganze Reich eines Gegners, nicht abfangbar' }
  };
  const DX = G.DX8, DY = G.DY8;

  // ---------------------------------------------------------------- Seewege (gewichtetes A*)
  P._initPath = function () {
    const N = this.N;
    this.pg = new Float32Array(N); this.pfrom = new Int32Array(N); this.pst = new Int32Array(N);
    this.pid = 0; this.pheap = new G.Heap(4096); this.pathCache = new Map(); this.pathBudget = 3;
    const S = this.S;
    this.R.nukeSpeed = Math.max(2.5, 6 * S);
    this.R.capture = Math.max(5, Math.round(10 * S));
    this.R.mirvRange = 1500 * S;
    this.tradeCap = 140;
    this._initNav();
  };

  // Grobes Wegenetz: Die Karte wird in 5x5-Zellen geteilt. Jedes zusammenhängende Wasserstück
  // einer Zelle ist ein Knoten. Die Suche läuft erst über Knoten, dann fein im gefundenen Korridor.
  P._initNav = function () {
    const W = this.W, H = this.H, N = this.N, land = this.land, C = 5;
    const cw = Math.ceil(W / C), ch = Math.ceil(H / C);
    const node = new Int32Array(N).fill(-1), stack = new Int32Array(C * C);
    const nx = [], ny = [];
    let n = 0;
    for (let cy = 0; cy < ch; cy++) for (let cx = 0; cx < cw; cx++) {
      const x0 = cx * C, y0 = cy * C, x1 = Math.min(W, x0 + C), y1 = Math.min(H, y0 + C);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
        const s = y * W + x;
        if (land[s] || node[s] >= 0) continue;
        let sp = 0, sx = 0, sy = 0, c = 0;
        stack[sp++] = s; node[s] = n;
        while (sp) {
          const t = stack[--sp], tx = t % W, ty = (t / W) | 0;
          sx += tx; sy += ty; c++;
          if (tx > x0 && !land[t - 1] && node[t - 1] < 0) { node[t - 1] = n; stack[sp++] = t - 1; }
          if (tx < x1 - 1 && !land[t + 1] && node[t + 1] < 0) { node[t + 1] = n; stack[sp++] = t + 1; }
          if (ty > y0 && !land[t - W] && node[t - W] < 0) { node[t - W] = n; stack[sp++] = t - W; }
          if (ty < y1 - 1 && !land[t + W] && node[t + W] < 0) { node[t + W] = n; stack[sp++] = t + W; }
        }
        nx.push(sx / c); ny.push(sy / c); n++;
      }
    }
    const adj = new Array(n);
    for (let i = 0; i < n; i++) adj[i] = [];
    const link = function (a, b) {
      if (a === b) return;
      if (adj[a].indexOf(b) < 0) { adj[a].push(b); adj[b].push(a); }
    };
    for (let t = 0; t < N; t++) {
      if (land[t]) continue;
      if (t % W < W - 1 && !land[t + 1]) link(node[t], node[t + 1]);
      if (t < N - W && !land[t + W]) link(node[t], node[t + W]);
    }
    const off = new Int32Array(n + 1);
    for (let i = 0; i < n; i++) off[i + 1] = off[i] + adj[i].length;
    const edges = new Int32Array(off[n]);
    for (let i = 0; i < n; i++) edges.set(adj[i], off[i]);
    this.nav = {
      n: n, node: node, x: Float32Array.from(nx), y: Float32Array.from(ny), off: off, edges: edges,
      g: new Float32Array(n), from: new Int32Array(n), st: new Int32Array(n), allow: new Int32Array(n), id: 0, heap: new G.Heap(1024)
    };
  };

  // Knotenfolge von a nach b im groben Netz; markiert den erlaubten Korridor. Liefert die Marke oder 0.
  P._navCorridor = function (a, b) {
    const nv = this.nav, g = nv.g, from = nv.from, st = nv.st, heap = nv.heap, x = nv.x, y = nv.y, off = nv.off, ed = nv.edges;
    heap.clear();
    const open = (nv.id += 2), closed = open + 1, bx = x[b], by = y[b];
    g[a] = 0; from[a] = -1; st[a] = open; heap.push(0, a);
    let found = false;
    while (heap.n) {
      const t = heap.pop();
      if (st[t] === closed) continue;
      st[t] = closed;
      if (t === b) { found = true; break; }
      const gt = g[t], tx = x[t], ty = y[t];
      for (let i = off[t]; i < off[t + 1]; i++) {
        const u = ed[i];
        if (st[u] === closed) continue;
        const dx = x[u] - tx, dy = y[u] - ty, ng = gt + Math.sqrt(dx * dx + dy * dy);
        if (st[u] === open && ng >= g[u]) continue;
        g[u] = ng; from[u] = t; st[u] = open;
        const hx = x[u] - bx, hy = y[u] - by;
        heap.push(ng + 1.4 * Math.sqrt(hx * hx + hy * hy), u);
      }
    }
    if (!found) return 0;
    const allow = nv.allow;
    for (let t = b; t !== -1; t = from[t]) {
      allow[t] = open;
      for (let i = off[t]; i < off[t + 1]; i++) allow[ed[i]] = open;
    }
    return open;
  };

  P.findPath = function (src, dst) {
    const land = this.land, W = this.W, H = this.H, shore = this.shore;
    if (land[src] || land[dst] || this.wcomp[src] !== this.wcomp[dst]) return null;
    if (src === dst) return new Int32Array([src]);
    const nv = this.nav, node = nv.node, allow = nv.allow;
    const mark = this._navCorridor(node[src], node[dst]);
    if (!mark) return null;
    const g = this.pg, from = this.pfrom, st = this.pst, heap = this.pheap;
    heap.clear();
    const open = (this.pid += 2), closed = open + 1;
    const gx = dst % W, gy = (dst / W) | 0;
    g[src] = 0; from[src] = -1; st[src] = open; heap.push(0, src);
    let found = false;
    while (heap.n) {
      const t = heap.pop();
      if (st[t] === closed) continue;
      st[t] = closed;
      if (t === dst) { found = true; break; }
      const x = t % W, y = (t / W) | 0, gt = g[t];
      for (let k = 0; k < 8; k++) {
        const nx = x + DX[k], ny = y + DY[k];
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const u = ny * W + nx;
        if (land[u] || st[u] === closed || allow[node[u]] !== mark) continue;
        let c = 1;
        if (k >= 4) {
          if (land[y * W + nx] || land[ny * W + x]) continue;
          c = 1.4142;
        }
        if (shore[u] && u !== dst) c += 0.7;   // etwas Abstand zur Küste halten
        const ng = gt + c;
        if (st[u] === open && ng >= g[u]) continue;
        g[u] = ng; from[u] = t; st[u] = open;
        const ax = Math.abs(nx - gx), ay = Math.abs(ny - gy);
        heap.push(ng + 1.5 * (Math.max(ax, ay) + 0.4142 * Math.min(ax, ay)), u);
      }
    }
    if (!found) return null;
    let len = 0;
    for (let t = dst; t !== -1; t = from[t]) len++;
    const path = new Int32Array(len);
    for (let t = dst, i = len - 1; t !== -1; t = from[t]) path[i--] = t;
    return path;
  };

  P._path = function (src, dst) {
    if (this.pathBudget <= 0) return null;
    this.pathBudget--;
    return this.findPath(src, dst);
  };

  // Angrenzendes Wasserfeld mit dem grössten Gewässer
  P._waterNext = function (t) {
    const W = this.W, N = this.N, land = this.land, wc = this.wcomp, ws = this.map.wsize, x = t % W;
    let best = -1, bs = 0;
    const chk = function (n) { if (!land[n] && ws[wc[n]] > bs) { bs = ws[wc[n]]; best = n; } };
    if (x > 0) chk(t - 1);
    if (x < W - 1) chk(t + 1);
    if (t >= W) chk(t - W);
    if (t < N - W) chk(t + W);
    return best;
  };

  // ---------------------------------------------------------------- Verwaltung
  P.count = function (p, type) {
    let n = 0;
    for (const u of p.units) if (u.type === type) n += u.level || 1;
    return n;
  };

  P.cost = function (p, type) {
    if (p.type === HUMAN && this.opts.infiniteGold) return 0;
    const n = this.count(p, type);
    switch (type) {
      case U.CITY: case U.PORT: return Math.min(1e6, Math.pow(2, n) * 125000);
      case U.DEFENSE: return Math.min(250000, (n + 1) * 50000);
      case U.SILO: return 1e6;
      case U.SAM: return Math.min(3e6, (n + 1) * 1.5e6);
      case U.WARSHIP: return Math.min(1e6, (n + 1) * 250000);
      case U.ATOM: return 750000;
      case U.HYDRO: return 5e6;
      case U.MIRV: return 25e6;
    }
    return 0;
  };

  P._recalc = function (p) {
    let lv = 0;
    const defs = [];
    for (const u of p.units) {
      if (u.building > 0) continue;
      if (u.type === U.CITY) lv += u.level;
      else if (u.type === U.DEFENSE) defs.push(u);
    }
    p.cityLv = lv; p.defs = defs;
  };

  P._addUnit = function (u) {
    u.id = this.unitSeq++; u.alive = true;
    if (u.px === undefined) { u.px = u.x; u.py = u.y; }
    this.units.push(u); u.owner.units.push(u);
    if (u.type <= U.SAM) this.structAt.set(u.tile, u);
    return u;
  };

  P._defDirty = function (u, p) {
    const W = this.W, H = this.H, r = this.R.defense, o = this.owner;
    for (let y = Math.max(0, u.y - r); y <= Math.min(H - 1, u.y + r); y++)
      for (let x = Math.max(0, u.x - r); x <= Math.min(W - 1, u.x + r); x++) {
        const t = y * W + x;
        if (o[t] === p.id) this._dirty(t);
      }
  };

  P._killUnit = function (u) {
    if (!u.alive) return;
    u.alive = false; this.unitsDirty = true;
    const p = u.owner, i = p.units.indexOf(u);
    if (i >= 0) p.units.splice(i, 1);
    if (u.type <= U.SAM) {
      if (this.structAt.get(u.tile) === u) this.structAt.delete(u.tile);
      this._recalc(p);
      if (u.type === U.DEFENSE) this._defDirty(u, p);
    } else if (u.type === U.TRANSPORT) p.boats--;
    else if (u.type === U.TRADE) this.tradeShips--;
  };

  P._capture = function (u, np) {
    const old = u.owner;
    if (old === np) return;
    if (u.building > 0) { this._killUnit(u); return; }
    const i = old.units.indexOf(u);
    if (i >= 0) old.units.splice(i, 1);
    u.owner = np; np.units.push(u);
    this._recalc(old); this._recalc(np);
    if (u.type === U.DEFENSE) { this._defDirty(u, old); this._defDirty(u, np); }
    const nm = G.UINFO[u.type].name;
    if (old === this.human) this.note(np.name + ' hat dein Gebäude erobert: ' + nm, 'bad', np.id);
    else if (np === this.human) this.note(nm + ' von ' + old.name + ' erobert', 'good', old.id);
  };

  // ---------------------------------------------------------------- Bauen
  P._spaceFree = function (tile) {
    const W = this.W, x = tile % W, y = (tile / W) | 0, r2 = this.R.struct * this.R.struct;
    for (const u of this.structAt.values()) {
      const dx = u.x - x, dy = u.y - y;
      if (dx * dx + dy * dy < r2) return false;
    }
    return true;
  };

  P._portSpot = function (p, tile) {
    const W = this.W, H = this.H, o = this.owner, shore = this.shore, ws = this.map.wsize, wc = this.wcomp;
    const cx = tile % W, cy = (tile / W) | 0, r = this.R.port;
    let best = -1, bd = 1e9;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++)
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        const t = y * W + x;
        if (o[t] !== p.id || !shore[t]) continue;
        const d = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d >= bd) continue;
        const w = this._waterNext(t);
        if (w < 0 || ws[wc[w]] < 150 || !this._spaceFree(t)) continue;
        bd = d; best = t;
      }
    return best;
  };

  // Prüft, ob und wie p an dieser Stelle bauen kann
  P.plan = function (p, type, tile) {
    const res = { ok: false, why: '', cost: this.cost(p, type), tile: tile, type: type };
    if (!p.alive || this.phase !== 'play') { res.why = 'Noch nicht möglich'; return res; }
    const W = this.W, x = tile % W, y = (tile / W) | 0;
    if (type <= U.SAM) {
      if (this.owner[tile] !== p.id) { res.why = 'Nur auf eigenem Gebiet'; return res; }
      if (G.UINFO[type].up) {
        const r = Math.max(3, this.R.struct * 0.5);
        let bu = null, bd = r * r + 1;
        for (const u of p.units) {
          if (u.type !== type || u.building > 0) continue;
          const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
          if (d < bd) { bd = d; bu = u; }
        }
        if (bu) { res.up = bu; res.tile = bu.tile; }
      }
      if (!res.up) {
        if (type === U.PORT) {
          const t = this._portSpot(p, tile);
          if (t < 0) { res.why = 'Kein freies Ufer in der Nähe'; return res; }
          res.tile = t;
        } else if (!this._spaceFree(tile)) { res.why = 'Zu nah an einem anderen Gebäude'; return res; }
      }
    } else if (type === U.WARSHIP) {
      let w = tile;
      if (!p.units.some(function (u) { return u.type === U.PORT && !u.building; })) { res.why = 'Du brauchst zuerst einen Hafen'; return res; }
      if (this.land[w]) {
        w = -1;
        for (let r = 1; r <= 8 && w < 0; r++)
          for (let k = 0; k < 8 && w < 0; k++) {
            const xx = x + DX[k] * r, yy = y + DY[k] * r;
            if (xx >= 0 && yy >= 0 && xx < W && yy < this.H && !this.land[yy * W + xx]) w = yy * W + xx;
          }
        if (w < 0) { res.why = 'Tippe auf Wasser'; return res; }
      }
      let port = null, bd = 1e12, any = false;
      for (const u of p.units) {
        if (u.type !== U.PORT || u.building > 0) continue;
        any = true;
        if (this.wcomp[u.water] !== this.wcomp[w]) continue;
        const d = (u.x - w % W) * (u.x - w % W) + (u.y - ((w / W) | 0)) * (u.y - ((w / W) | 0));
        if (d < bd) { bd = d; port = u; }
      }
      if (!port) { res.why = any ? 'Kein Hafen an diesem Gewässer' : 'Du brauchst zuerst einen Hafen'; return res; }
      res.port = port; res.tile = w;
    } else {
      let silo = null, bd = 1e12, any = false;
      for (const u of p.units) {
        if (u.type !== U.SILO || u.building > 0) continue;
        any = true;
        let slot = -1;
        for (let i = 0; i < u.ready.length; i++) if (u.ready[i] <= this.ticks) { slot = i; break; }
        if (slot < 0) continue;
        const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (d < bd) { bd = d; silo = u; res.slot = slot; }
      }
      if (!silo) { res.why = any ? 'Das Silo lädt noch nach' : 'Du brauchst zuerst ein Raketensilo'; return res; }
      res.silo = silo;
      if (type === U.MIRV) {
        const tid = this.owner[tile];
        if (!tid || tid === p.id) { res.why = 'Tippe auf das Gebiet eines Gegners'; return res; }
        res.target = tid;
      }
    }
    if (p.gold < res.cost) { res.why = 'Zu wenig Gold'; return res; }
    res.ok = true;
    return res;
  };

  P.build = function (p, type, tile) {
    const pl = this.plan(p, type, tile);
    if (!pl.ok) return pl;
    p.gold -= pl.cost;
    const W = this.W;
    if (type <= U.SAM) {
      if (pl.up) {
        const u = pl.up;
        u.level++;
        if (u.ready) u.ready.push(0);
        this._recalc(p);
        pl.unit = u;
        return pl;
      }
      const t = pl.tile;
      const u = { type: type, owner: p, tile: t, x: t % W, y: (t / W) | 0, level: 1, building: this.opts.instantBuild ? 0 : G.UINFO[type].time };
      if (type === U.SILO || type === U.SAM) u.ready = [0];
      if (type === U.PORT) u.water = this._waterNext(t);
      this._addUnit(u);
      if (!u.building) { this._recalc(p); if (type === U.DEFENSE) this._defDirty(u, p); }
      pl.unit = u;
    } else if (type === U.WARSHIP) {
      const w = pl.port.water;
      pl.unit = this._addUnit({ type: type, owner: p, tile: w, x: w % W, y: (w / W) | 0, hp: 1000, center: pl.tile, path: null, pi: 0, cool: 0, target: null, prey: null, wait: 0 });
    } else {
      pl.unit = this._launch(p, type, pl);
    }
    return pl;
  };

  // ---------------------------------------------------------------- Boote
  P.boatPlan = function (p, target) {
    if (!this.land[target]) return null;
    const tid = this.owner[target];
    if (tid === p.id || (tid && p.allies.has(tid))) return null;
    const W = this.W, N = this.N, land = this.land, o = this.owner, shore = this.shore, wc = this.wcomp, ws = this.map.wsize;
    const comps = new Set();
    const wn = function (t, f) {
      const x = t % W;
      if (x > 0 && !land[t - 1]) f(t - 1);
      if (x < W - 1 && !land[t + 1]) f(t + 1);
      if (t >= W && !land[t - W]) f(t - W);
      if (t < N - W && !land[t + W]) f(t + W);
    };
    for (const t of p.border) if (shore[t]) wn(t, function (w) { if (ws[wc[w]] >= 30) comps.add(wc[w]); });
    if (!comps.size) return null;
    // Zielufer: vom angetippten Feld aus über das Gebiet desselben Besitzers suchen
    const q = this.q, st = this.stamp, sid = ++this.stampId, cx = target % W, cy = (target / W) | 0, lim = this.R.reach;
    let qh = 0, qt = 0, dst = -1, dw = -1;
    q[qt++] = target; st[target] = sid;
    while (qh < qt && qh < 8000 && dst < 0) {
      const c = q[qh++], x = c % W;
      if (shore[c]) wn(c, function (w) { if (dst < 0 && comps.has(wc[w])) { dst = c; dw = w; } });
      if (dst >= 0) break;
      for (let k = 0; k < 4; k++) {
        const n = k === 0 ? (x > 0 ? c - 1 : -1) : k === 1 ? (x < W - 1 ? c + 1 : -1) : k === 2 ? (c >= W ? c - W : -1) : (c < N - W ? c + W : -1);
        if (n < 0 || !land[n] || o[n] !== tid || st[n] === sid) continue;
        if (Math.abs((n % W) - cx) + Math.abs(((n / W) | 0) - cy) > lim) continue;
        st[n] = sid; q[qt++] = n;
      }
    }
    if (dst < 0) return null;
    const comp = wc[dw], dx0 = dst % W, dy0 = (dst / W) | 0;
    let src = -1, sw = -1, bd = 1e12;
    for (const t of p.border) {
      if (!shore[t]) continue;
      const d = ((t % W) - dx0) * ((t % W) - dx0) + (((t / W) | 0) - dy0) * (((t / W) | 0) - dy0);
      if (d >= bd) continue;
      wn(t, function (w) { if (wc[w] === comp && d < bd) { bd = d; src = t; sw = w; } });
    }
    if (src < 0) return null;
    return { src: src, sw: sw, dst: dst, dw: dw, tid: tid };
  };

  P.sendBoat = function (p, target, troops) {
    if (!p.alive || this.phase !== 'play') return { ok: false, why: 'Noch nicht möglich' };
    if (p.boats >= 3) return { ok: false, why: 'Höchstens 3 Boote gleichzeitig' };
    const pl = this.boatPlan(p, target);
    if (!pl) return { ok: false, why: 'Kein Seeweg dorthin' };
    troops = Math.min(troops, p.troops);
    if (troops < 1) return { ok: false, why: 'Keine Truppen frei' };
    const path = this.findPath(pl.sw, pl.dw);
    if (!path) return { ok: false, why: 'Kein Seeweg dorthin' };
    p.troops -= troops; p.boats++;
    const W = this.W;
    const u = this._addUnit({ type: U.TRANSPORT, owner: p, tile: pl.sw, x: pl.sw % W, y: (pl.sw / W) | 0, hp: 1, troops: troops, path: path, pi: 0, src: pl.src, dst: pl.dst, tid: pl.tid, back: false });
    if (pl.tid && this.players[pl.tid] === this.human) this.note(p.name + ' schickt ein Boot mit ' + G.fmtTroops(troops) + ' Truppen zu dir', 'bad', p.id);
    return { ok: true, unit: u };
  };

  // Boot umkehren lassen (Rückzug)
  P.recallBoat = function (u) {
    if (!u.alive || u.back) return;
    const rest = Array.from(u.path.subarray(0, u.pi + 1)).reverse();
    u.path = Int32Array.from(rest); u.pi = 0; u.back = true;
  };

  P._tickTransport = function (u) {
    const p = u.owner, W = this.W;
    if (!p.alive) { this._killUnit(u); return; }
    u.px = u.x; u.py = u.y;
    if (u.pi < u.path.length - 1) {
      const t = u.path[++u.pi];
      u.tile = t; u.x = t % W; u.y = (t / W) | 0;
      return;
    }
    // Ankunft
    this._killUnit(u);
    if (u.back) { p.troops += u.troops; return; }
    const cur = this.owner[u.dst];
    p.troops += u.troops;
    if (cur === p.id || (cur && p.allies.has(cur))) return;
    if (cur && this.ticks < this.playStart + 50) return;
    this.conquer(p, u.dst);
    this.attack(p, cur, u.troops, u.dst);
  };

  // ---------------------------------------------------------------- Handel
  P._maybeTrade = function (port) {
    if (this.tradeShips >= this.tradeCap) return;
    const p = port.owner, wc = this.wcomp, comp = wc[port.water];
    const cands = [];
    let n = 0;
    for (const u of this.structAt.values()) {
      if (u.type !== U.PORT || u.building > 0) continue;
      n++;
      const q = u.owner;
      if (q === p || !q.alive || wc[u.water] !== comp) continue;
      if (p.embargo.has(q.id) || q.embargo.has(p.id)) continue;
      cands.push(u);
    }
    if (!cands.length) return;
    if (!this.rng.chance(Math.min(50, Math.round(10 * Math.pow(n, 0.6))))) return;
    // Nahe und verbündete Häfen werden doppelt so oft gewählt
    const W = this.W;
    const ds = cands.map(function (u) { return Math.abs(u.x - port.x) + Math.abs(u.y - port.y); });
    const sorted = ds.slice().sort(function (a, b) { return a - b; });
    const med = sorted[sorted.length >> 1];
    let total = 0;
    const ws = cands.map(function (u, i) {
      let w = 1;
      if (ds[i] <= med) w *= 2;
      if (p.allies.has(u.owner.id)) w *= 2;
      total += w;
      return w;
    });
    let r = this.rng() * total, pick = 0;
    for (let i = 0; i < ws.length; i++) { r -= ws[i]; if (r <= 0) { pick = i; break; } }
    const dst = cands[pick];
    const key = port.id * 100000 + dst.id;
    let path = this.pathCache.get(key);
    if (!path) {
      path = this._path(port.water, dst.water);
      if (!path) return;
      if (this.pathCache.size > 600) this.pathCache.clear();
      this.pathCache.set(key, path);
    }
    const gold = Math.round(10000 + 150 * Math.pow(ds[pick] / this.S, 1.1));
    this.tradeShips++;
    this._addUnit({ type: U.TRADE, owner: p, tile: port.water, x: port.water % W, y: (port.water / W) | 0, hp: 1, path: path, pi: 0, srcOwner: p, dst: dst, gold: gold, captured: false });
  };

  P._tickTrade = function (u) {
    const W = this.W;
    if (!u.owner.alive || !u.dst.alive) { this._killUnit(u); return; }
    u.px = u.x; u.py = u.y;
    if (u.pi < u.path.length - 1) {
      const t = u.path[++u.pi];
      u.tile = t; u.x = t % W; u.y = (t / W) | 0;
      return;
    }
    this._killUnit(u);
    const a = u.owner, b = u.dst.owner, h = this.human;
    if (u.captured) {
      a.gold += u.gold;
      if (a === h) this.note('Gekapertes Handelsschiff eingelaufen: +' + G.fmtNum(u.gold) + ' Gold', 'good', 0);
      return;
    }
    if (a === b) { a.gold += u.gold; return; }
    if (a.embargo.has(b.id) || b.embargo.has(a.id)) return;
    a.gold += u.gold; b.gold += u.gold;
    if (a === h || b === h) { this.tradeSum = (this.tradeSum || 0) + u.gold; this.tradeN = (this.tradeN || 0) + 1; }
  };

  // ---------------------------------------------------------------- Kriegsschiffe
  P._hostile = function (p, q) { return p !== q && !p.allies.has(q.id); };

  P._tickWarship = function (u) {
    const p = u.owner, W = this.W, t = this.ticks, R = this.R;
    if (!p.alive) { this._killUnit(u); return; }
    if (u.hp < 1000) u.hp = Math.min(1000, u.hp + 1);
    u.px = u.x; u.py = u.y;
    if ((t + u.id) % 5 === 0) {
      // Ziele suchen
      let tgt = null, td = R.warTarget * R.warTarget, prey = null, pd = td;
      for (const v of this.units) {
        if (!v.alive || v.type < U.WARSHIP || v.type > U.TRADE || !this._hostile(p, v.owner)) continue;
        const d = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y);
        if (v.type === U.TRADE) {
          if (v.captured || this.wcomp[v.tile] !== this.wcomp[u.tile]) continue;
          const dq = v.dst.owner;
          if (dq === p || p.allies.has(dq.id)) continue;
          if (d < pd) { pd = d; prey = v; }
        } else {
          const dd = v.type === U.TRANSPORT ? d * 0.5 : d;   // Boote zuerst
          if (dd < td) { td = dd; tgt = v; }
        }
      }
      u.target = tgt;
      if (prey !== u.prey) { u.prey = prey; if (prey) u.path = null; }
      if (prey && pd <= R.capture * R.capture) this._captureTrade(u, prey);
    }
    if (u.target && u.target.alive && t >= u.cool) {
      u.cool = t + 20;
      this._addUnit({ type: U.SHELL, owner: p, tile: u.tile, x: u.x, y: u.y, target: u.target });
    }
    // Bewegung
    const steps = (u.prey && u.prey.alive) ? 2 : 1;
    for (let s = 0; s < steps; s++) {
      if (u.path && u.pi < u.path.length - 1) {
        const n = u.path[++u.pi];
        u.tile = n; u.x = n % W; u.y = (n / W) | 0;
        continue;
      }
      u.path = null;
      if (u.prey && u.prey.alive && !u.prey.captured) {
        if ((t + u.id) % 8 === 0) { u.path = this._path(u.tile, u.prey.tile); u.pi = 0; }
        break;
      }
      if (u.wait > 0) { u.wait--; break; }
      // neuer Patrouillenpunkt
      const cx = u.center % W, cy = (u.center / W) | 0, pr = R.warPatrol;
      for (let k = 0; k < 6; k++) {
        const x = cx + this.rng.int(-pr, pr + 1), y = cy + this.rng.int(-pr, pr + 1);
        if (x < 0 || y < 0 || x >= W || y >= this.H) continue;
        const g = y * W + x;
        if (this.land[g] || this.wcomp[g] !== this.wcomp[u.tile]) continue;
        const pth = this._path(u.tile, g);
        if (pth) { u.path = pth; u.pi = 0; }
        break;
      }
      u.wait = 15;
      break;
    }
  };

  P._captureTrade = function (w, v) {
    const p = w.owner, old = v.owner, h = this.human;
    // nächster eigener Hafen am selben Gewässer
    let port = null, bd = 1e12;
    for (const u of p.units) {
      if (u.type !== U.PORT || u.building > 0 || this.wcomp[u.water] !== this.wcomp[v.tile]) continue;
      const d = (u.x - v.x) * (u.x - v.x) + (u.y - v.y) * (u.y - v.y);
      if (d < bd) { bd = d; port = u; }
    }
    const i = old.units.indexOf(v);
    if (i >= 0) old.units.splice(i, 1);
    v.owner = p; p.units.push(v); v.captured = true;
    w.prey = null;
    if (old === h) this.note(p.name + ' hat dein Handelsschiff gekapert', 'bad', p.id);
    const path = port ? this.findPath(v.tile, port.water) : null;
    if (!path) {
      p.gold += v.gold;
      if (p === h) this.note('Handelsschiff von ' + old.name + ' gekapert: +' + G.fmtNum(v.gold) + ' Gold', 'good', old.id);
      this._killUnit(v);
      return;
    }
    if (p === h) this.note('Handelsschiff von ' + old.name + ' gekapert', 'good', old.id);
    v.dst = port; v.path = path; v.pi = 0;
  };

  P._tickShell = function (u) {
    const v = u.target;
    if (!v || !v.alive) { this._killUnit(u); return; }
    u.px = u.x; u.py = u.y;
    const dx = v.x - u.x, dy = v.y - u.y, d = Math.sqrt(dx * dx + dy * dy), sp = 4;
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    this._killUnit(u);
    v.hp -= 250;
    this.fx.push({ k: 'hit', x: v.x, y: v.y, t: this.ticks });
    if (v.hp > 0) return;
    const h = this.human;
    if (v.owner === h) this.note(v.type === U.TRANSPORT ? 'Dein Boot mit ' + G.fmtTroops(v.troops) + ' Truppen wurde von ' + u.owner.name + ' versenkt' : 'Dein Kriegsschiff wurde von ' + u.owner.name + ' versenkt', 'bad', u.owner.id);
    else if (u.owner === h) this.note((v.type === U.TRANSPORT ? 'Boot' : 'Kriegsschiff') + ' von ' + v.owner.name + ' versenkt', 'good', v.owner.id);
    this._killUnit(v);
  };

  // ---------------------------------------------------------------- Bomben
  P._launch = function (p, type, pl) {
    const silo = pl.silo, W = this.W, tx = pl.tile % W, ty = (pl.tile / W) | 0;
    silo.ready[pl.slot] = this.ticks + 75;
    const dx = tx - silo.x, dy = ty - silo.y, dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
    const u = this._addUnit({ type: type, owner: p, tile: silo.tile, x: silo.x, y: silo.y, sx: silo.x, sy: silo.y, tx: tx, ty: ty, dist: dist, prog: 0, speed: this.R.nukeSpeed, sam: false, targetId: pl.target || 0 });
    const R = this.R, nm = G.UINFO[type].name, h = this.human;
    if (type === U.MIRV) {
      const q = this.players[pl.target];
      if (p.allies.has(q.id)) this.breakAlliance(p, q);
      if (q.type === NATION) this._rel(q, p, -100);
      q.hitBy.set(p.id, this.ticks);
      if (q === h) this.note(p.name + ' hat ein MIRV auf dich abgefeuert!', 'nuke', p.id);
      else if (h && h.alive && p !== h) this.note(p.name + ' feuert ein MIRV auf ' + q.name, 'warn', p.id);
      return u;
    }
    // Wen trifft es? Stichprobe im Wirkungskreis
    const rout = type === U.HYDRO ? R.hydroOut : R.atomOut, o = this.owner, H = this.H, cnt = new Map();
    for (let y = Math.max(0, ty - rout); y <= Math.min(H - 1, ty + rout); y += 2)
      for (let x = Math.max(0, tx - rout); x <= Math.min(W - 1, tx + rout); x += 2) {
        if ((x - tx) * (x - tx) + (y - ty) * (y - ty) > rout * rout) continue;
        const id = o[y * W + x];
        if (id && id !== p.id) cnt.set(id, (cnt.get(id) || 0) + 1);
      }
    for (const e of cnt) {
      if (e[1] < 3) continue;
      const q = this.players[e[0]];
      if (p.allies.has(q.id)) this.breakAlliance(p, q);
      if (q.type === NATION) this._rel(q, p, -100);
      q.hitBy.set(p.id, this.ticks);
      if (q === h) this.note(p.name + ' hat eine ' + nm + ' auf dich abgefeuert!', 'nuke', p.id);
    }
    return u;
  };

  P._tickNuke = function (u) {
    u.px = u.x; u.py = u.y;
    u.prog += u.speed;
    const k = Math.min(1, u.prog / u.dist);
    u.x = u.sx + (u.tx - u.sx) * k; u.y = u.sy + (u.ty - u.sy) * k;
    if (k < 1) return;
    const R = this.R, tx = Math.round(u.tx), ty = Math.round(u.ty);
    this._killUnit(u);
    if (u.type === U.MIRV) { this._mirvSplit(u); return; }
    if (u.type === U.HYDRO) this._explode(tx, ty, R.hydroIn, R.hydroOut, u.owner, true);
    else if (u.type === U.ATOM) this._explode(tx, ty, R.atomIn, R.atomOut, u.owner, true);
    else this._explode(tx, ty, R.mirvIn, R.mirvOut, u.owner, false);
  };

  P._mirvSplit = function (u) {
    const q = this.players[u.targetId];
    this.fx.push({ k: 'hit', x: u.x, y: u.y, t: this.ticks });
    if (!q || !q.alive || q.tiles === 0) return;
    // Viele Sprengköpfe verteilen sich zufällig über das ganze Reich des Ziels
    const R = this.R, W = this.W, o = this.owner, r = this.rng;
    const max = Math.round(G.within(350 * this.S * this.S, 40, 350));
    const used = new Set(), bw = q.x1 - q.x0 + 1, bh = q.y1 - q.y0 + 1, range2 = R.mirvRange * R.mirvRange;
    let n = 0;
    for (let k = 0; k < max * 30 && n < max; k++) {
      const x = q.x0 + r.int(0, bw), y = q.y0 + r.int(0, bh), t = y * W + x;
      if (o[t] !== q.id || used.has(t)) continue;
      if ((x - u.tx) * (x - u.tx) + (y - u.ty) * (y - u.ty) > range2) continue;
      used.add(t);
      const dx = x - u.x, dy = y - u.y;
      this._addUnit({ type: U.WARHEAD, owner: u.owner, tile: 0, x: u.x, y: u.y, sx: u.x, sy: u.y, tx: x, ty: y, dist: Math.max(1, Math.sqrt(dx * dx + dy * dy)), prog: 0, speed: R.nukeSpeed * (0.6 + r() * 0.9), sam: true, targetId: 0 });
      n++;
    }
  };

  P._explode = function (cx, cy, rin, rout, by, big) {
    const W = this.W, H = this.H, o = this.owner, land = this.land, r = this.rng, in2 = rin * rin, out2 = rout * rout;
    const hit = new Set();
    for (let y = Math.max(0, cy - rout); y <= Math.min(H - 1, cy + rout); y++)
      for (let x = Math.max(0, cx - rout); x <= Math.min(W - 1, cx + rout); x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > out2 || (d2 > in2 && r() < 0.5)) continue;
        const t = y * W + x;
        if (!land[t]) continue;
        const id = o[t];
        if (id) {
          const q = this.players[id], n = Math.max(1, q.tiles);
          q.troops = Math.max(0, q.troops - (5 * q.troops) / n);
          for (const at of q.out) if (at.active) at.troops = Math.max(0, at.troops - (5 * at.troops) / n);
          this.relinquish(t);
          hit.add(q);
        }
        if (!this.fallout[t]) { this.fallout[t] = 1; this.falloutCount++; }
        this._dirty(t);
      }
    for (const v of this.units) {
      if (!v.alive || v.type >= U.SHELL) continue;
      if ((v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy) <= out2) {
        if (v.owner === this.human && v.type <= U.WARSHIP) this.note('Zerstört: ' + G.UINFO[v.type].name, 'bad', by.id);
        this._killUnit(v);
      }
    }
    this.fx.push({ k: 'boom', x: cx, y: cy, r: rout, t: this.ticks, big: !!big });
    for (const q of hit) if (q.alive && q.tiles === 0) this._kill(q, by);
  };

  P._tickSam = function (u) {
    const t = this.ticks, p = u.owner, r2 = this.R.sam * this.R.sam, h = this.human;
    for (let i = 0; i < u.ready.length; i++) {
      if (u.ready[i] > t) continue;
      let tgt = null, bd = r2;
      for (const v of this.units) {
        if (!v.alive || (v.type !== U.ATOM && v.type !== U.HYDRO) || v.sam || !this._hostile(p, v.owner)) continue;
        const d = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y);
        if (d <= bd) { bd = d; tgt = v; }
      }
      if (!tgt) return;
      u.ready[i] = t + 75;
      if (this.rng() < 0.75) {
        tgt.sam = true;
        this._addUnit({ type: U.SAMM, owner: p, tile: u.tile, x: u.x, y: u.y, target: tgt });
      } else if (p === h) this.note('Flugabwehr hat die Bombe von ' + tgt.owner.name + ' verfehlt', 'warn', tgt.owner.id);
    }
  };

  P._tickSamm = function (u) {
    const v = u.target;
    if (!v || !v.alive) { this._killUnit(u); return; }
    u.px = u.x; u.py = u.y;
    const dx = v.x - u.x, dy = v.y - u.y, d = Math.sqrt(dx * dx + dy * dy), sp = Math.max(4, this.R.nukeSpeed * 2.2);
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    const h = this.human, nm = G.UINFO[v.type].name;
    this.fx.push({ k: 'hit', x: v.x, y: v.y, t: this.ticks });
    if (u.owner === h) this.note('Flugabwehr hat die ' + nm + ' von ' + v.owner.name + ' abgefangen', 'good', v.owner.id);
    else if (v.owner === h) this.note('Deine ' + nm + ' wurde von ' + u.owner.name + ' abgefangen', 'bad', u.owner.id);
    this._killUnit(u); this._killUnit(v);
  };

  // ---------------------------------------------------------------- Takt
  P._tickUnits = function () {
    const us = this.units, t = this.ticks;
    this.pathBudget = 3;
    for (let i = 0; i < us.length; i++) {
      const u = us[i];
      if (!u.alive) continue;
      if (u.type <= U.SAM) {
        if (u.building > 0) {
          if (--u.building <= 0) {
            u.building = 0;
            this._recalc(u.owner);
            if (u.type === U.DEFENSE) this._defDirty(u, u.owner);
            if (u.owner === this.human) this.note(G.UINFO[u.type].name + ' fertig gebaut', 'info', 0);
          }
        } else if (u.type === U.PORT) {
          if ((t + u.id) % 10 === 0) this._maybeTrade(u);
        } else if (u.type === U.SAM) {
          if ((t + u.id) % 2 === 0) this._tickSam(u);
        }
        continue;
      }
      switch (u.type) {
        case U.WARSHIP: this._tickWarship(u); break;
        case U.TRANSPORT: this._tickTransport(u); break;
        case U.TRADE: this._tickTrade(u); break;
        case U.SHELL: this._tickShell(u); break;
        case U.SAMM: this._tickSamm(u); break;
        default: this._tickNuke(u);
      }
    }
    if (this.unitsDirty) {
      this.units = this.units.filter(function (u) { return u.alive; });
      this.unitsDirty = false;
    }
  };

  // Kriegsschiff zu einem neuen Einsatzgebiet schicken
  P.moveWarship = function (u, water) {
    if (!u.alive || this.land[water] || this.wcomp[water] !== this.wcomp[u.tile]) return false;
    const path = this.findPath(u.tile, water);
    if (!path) return false;
    u.center = water; u.path = path; u.pi = 0; u.prey = null; u.wait = 0;
    return true;
  };
})(typeof window !== 'undefined' ? window.G : globalThis.G);
