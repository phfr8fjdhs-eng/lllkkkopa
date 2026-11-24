// The simulation in its own thread (doku/leistung.md, 25.11.2026).
//
// The game runs in a Web Worker; the page keeps a read-only copy of it, the mirror, that the
// drawing and the controls read as they read the game itself. After every step the worker sends
// what changed:
//   tiles    owner and fallout of every changed tile (the list the game keeps for painting anyway)
//   objects  the game, every player, unit, attack and rail: the fields that changed since the
//            last message. A plain value is compared as it is; a list, map, set or nested object
//            by a hash of its content, and sent whole when that changed.
//   queues   new messages (events) and effects (fx), handed over and emptied in the worker
// A reference to a player, unit, attack, rail or the game itself travels as its id and is turned
// back into the mirror's own object, so `u.owner === game.human` holds on the page as well.
// Objects of a class (heaps, path finders, the AI) stay in the worker.
//
// Nothing here changes the game: the worker reads it after a step, the page writes only the
// mirror. Orders go the other way as messages and are carried out with game.exec, between ticks,
// in the order they were sent, as they always were.
//
// Fields that do not go across, or go another way:
(function (G) {
  'use strict';
  // the game: tile arrays have their own channel, lists of objects too, the rest is the worker's
  // own working memory
  const SKIP_GAME = new Set(['map', 'sea', 'rng', 'owner', 'fallout', 'stamp', 'sid', 'q', 'dirty', 'dirtyN', 'dirtyFlag',
    'players', 'units', 'attacks', 'rails', 'events', 'fx', 'pathLeg', 'pathNear', 'pathCache', 'pathQ', 'pathJob', 'nearQ', 'nearJob',
    'postHeap', 'postList', 'pocketQ', 'railHeap', 'thrustHeap', 'deferList', 'cloakOk', 'opts', 'lv']);
  // a player: the border is sent for the person at this device only (the mirror works it out
  // for the others when asked); the posture of the others only as much as the shading needs
  const SKIP_PLAYER = new Set(['border', 'ai', 'post', 'pocketFrom', 'pocketSeen']);
  // attacks: only those on or by the person at this device (the page shows no others, and on
  // the Earth some 2500 of them change every tick)
  const SKIP_OTHER = new Set(Array.from(SKIP_PLAYER).concat(['out', 'inc']));
  const SKIP_ATTACK = new Set(['heap', 'front', 'taken']);
  const SKIP_UNIT = new Set([]);
  const SKIP_EDGE = new Set(['geo']);
  // cell fields the shading and the tooltips read (src/03b_posture.js postDens)
  const SLOW = 10;   // the posture of the others goes across every SLOW ticks

  // ---------- content hash: has a value changed since it was last sent? ----------
  const f64 = new Float64Array(1), i32 = new Int32Array(f64.buffer);
  const mix = function (h, x) { h = Math.imul(h ^ x, 0x01000193); return (h ^ (h >>> 15)) | 0; };
  const BIG = 4096;   // longer lists are compared by length and a few samples, and by who they are
  let nextId = 1;
  const oid = new WeakMap();
  const idOf = function (o) { let i = oid.get(o); if (!i) { i = nextId++; oid.set(o, i); } return i; };
  function num(h, v) {
    if ((v | 0) === v) return mix(h, v);
    f64[0] = v; return mix(mix(h, i32[0]), i32[1]);
  }
  function hash(v, h, d, out) {
    if (v === null || v === undefined) return mix(h, v === null ? 7 : 11);
    const t = typeof v;
    if (t === 'number') return num(h, v);
    if (t === 'boolean') return mix(h, v ? 13 : 17);
    if (t === 'string') { h = mix(h, v.length); for (let i = 0; i < v.length; i++) h = mix(h, v.charCodeAt(i)); return h; }
    if (t !== 'object') return h;
    const r = out && out.ref.get(v);
    if (r !== undefined) return mix(mix(h, 19), r.h);
    if (d > 5) return mix(h, idOf(v));
    if (ArrayBuffer.isView(v) || Array.isArray(v)) {
      const n = v.length;
      h = mix(h, n);
      if (n > BIG) {
        h = mix(h, idOf(v));
        for (let k = 0; k < 64; k++) { const x = v[(k * 7919) % n]; h = typeof x === 'number' ? num(h, x) : hash(x, h, d + 1, out); }
        return h;
      }
      if (ArrayBuffer.isView(v)) { for (let i = 0; i < n; i++) h = num(h, v[i]); return h; }
      for (let i = 0; i < n; i++) h = hash(v[i], h, d + 1, out);
      return h;
    }
    if (v instanceof Map) { h = mix(h, v.size); for (const e of v) { h = hash(e[0], h, d + 1, out); h = hash(e[1], h, d + 1, out); } return h; }
    if (v instanceof Set) { h = mix(h, v.size + 1e6); for (const e of v) h = hash(e, h, d + 1, out); return h; }
    const pr = Object.getPrototypeOf(v);
    if (pr !== Object.prototype && pr !== null) return h;
    for (const k in v) { const x = v[k]; if (typeof x === 'function') continue; h = hash(k, h, d + 1, out); h = hash(x, h, d + 1, out); }
    return h;
  }

  // ---------- the worker's side ----------
  function Out(game) {
    this.g = game;
    this.first = true;
    this.prev = new Map();     // object -> Map(field -> plain value or content hash)
    this.ref = new Map();      // object -> { r: reference as sent, h: its hash }
    this.lists = {};           // name -> hash of the id list last sent
    this.sentPath = new WeakMap();
  }
  // References: every player, unit, attack and rail, and the game, by id.
  Out.prototype.tables = function () {
    const g = this.g, ref = this.ref;
    ref.clear();
    const put = function (o, k, i) { if (o && !ref.has(o)) ref.set(o, { r: { $r: k, i: i }, s: '@' + k + i, h: hash(i, k.charCodeAt(0), 0, null) }); };
    put(g, 'g', 0);
    for (let i = 1; i < g.players.length; i++) put(g.players[i], 'p', i);
    const units = [], attacks = [], edges = [];
    const unit = function (u) { if (u && !ref.has(u)) { put(u, 'u', u.id); units.push(u); } };
    for (const u of g.units) unit(u);
    for (const u of g.nukes) unit(u);
    for (let i = 1; i < g.players.length; i++) for (const u of g.players[i].units) unit(u);
    const attack = function (a) { if (a && !ref.has(a)) { put(a, 'a', a.id); attacks.push(a); } };
    const me = g.human;
    if (me) { for (const a of me.out) attack(a); for (const a of me.inc) attack(a); }
    for (const e of g.rails) if (!ref.has(e)) { put(e, 'e', e.key); edges.push(e); }
    return { units: units, attacks: attacks, edges: edges };
  };
  // A value as it crosses over; NOPE for what stays in the worker (functions, objects of a class).
  const NOPE = {};
  Out.prototype.enc = function (v, d) {
    if (v === null || typeof v !== 'object') return typeof v === 'function' ? NOPE : v;
    const r = this.ref.get(v);
    if (r !== undefined) return r.r;
    if (d > 6) return NOPE;
    if (ArrayBuffer.isView(v)) return v.slice();
    if (Array.isArray(v)) { const o = new Array(v.length); for (let i = 0; i < v.length; i++) { const x = this.enc(v[i], d + 1); o[i] = x === NOPE ? null : x; } return o; }
    if (v instanceof Map) { const o = []; for (const e of v) { const a = this.enc(e[0], d + 1), b = this.enc(e[1], d + 1); if (a !== NOPE && b !== NOPE) o.push(a, b); } return { $M: o }; }
    if (v instanceof Set) { const o = []; for (const e of v) { const x = this.enc(e, d + 1); if (x !== NOPE) o.push(x); } return { $S: o }; }
    const pr = Object.getPrototypeOf(v);
    if (pr !== Object.prototype && pr !== null) return NOPE;
    const o = {};
    for (const k in v) { const x = this.enc(v[k], d + 1); if (x !== NOPE) o[k] = x; }
    return o;
  };
  // The fields of one object that changed: { field: value }, or null.
  Out.prototype.diff = function (o, skip) {
    let pv = this.prev.get(o);
    if (!pv) { pv = new Map(); this.prev.set(o, pv); }
    let ch = null;
    for (const k in o) {
      if (skip.has(k)) continue;
      const v = o[k];
      if (typeof v === 'function') continue;
      let key;
      if (v === null || typeof v !== 'object') key = v;
      else { const r = this.ref.get(v); key = r !== undefined ? r.s : '#' + hash(v, 0, 0, this); }
      if (pv.has(k) && pv.get(k) === key) continue;
      pv.set(k, key);
      const e = this.enc(v, 0);
      if (e === NOPE) continue;
      (ch || (ch = {}))[k] = e;
    }
    return ch;
  };
  // An id list: sent when it changed.
  Out.prototype.list = function (name, arr, idf) {
    let h = arr.length;
    for (let i = 0; i < arr.length; i++) h = mix(h, typeof idf(arr[i]) === 'number' ? idf(arr[i]) : idOf(arr[i]));
    if (this.lists[name] === h) return undefined;
    this.lists[name] = h;
    return arr.map(idf);
  };
  // the posture of a realm: every cell with its numbers for the person at this device (a link
  // to another cell goes as that cell's id), for the others only what the shading and the
  // tooltips need (cell, tiles in it, troops in it), every SLOW ticks
  Out.prototype.post = function (p, mine) {
    const post = p.post, T = this.g.ticks;
    if (!post) return undefined;
    if (!mine && !this.first && (T + p.id) % SLOW !== 0) return undefined;
    let h = num(num(post.cells.size, post.H), post.edits);
    if (mine) for (const c of post.cells.values()) for (const k in c) { const v = c[k]; if (typeof v === 'number' || typeof v === 'boolean') h = hash(v, h, 0, null); }
    else for (const c of post.cells.values()) h = num(num(num(h, c.id), c.n), c.u);
    const pv = this.prev.get(p);
    if (pv.get('post') === h) return undefined;
    pv.set('post', h);
    if (mine) {
      const cells = [];
      for (const c of post.cells.values()) {
        const o = {};
        for (const k in c) { const v = c[k]; o[k] = v && typeof v === 'object' ? (v.id !== undefined ? v.id : null) : v; }
        cells.push(o);
      }
      return { $P: 2, H: post.H, edits: post.edits, autoAt: post.autoAt, cells: cells };
    }
    const n = post.cells.size, id = new Int32Array(n), cn = new Float64Array(n), cu = new Float64Array(n);
    let i = 0;
    for (const c of post.cells.values()) { id[i] = c.id; cn[i] = c.n; cu[i] = c.u; i++; }
    return { $P: 1, H: post.H, edits: post.edits, id: id, n: cn, u: cu };
  };
  // A level: its definition is the same code on both sides and goes as its number; of its
  // helper Q only the plain numbers go (the page makes its own Q with the same functions).
  Out.prototype.level = function () {
    const lv = this.g.lv;
    if (!lv) return undefined;
    const q = {}, o = {};
    for (const k in lv.Q) { const v = lv.Q[k]; if (v === null || typeof v !== 'object' && typeof v !== 'function') q[k] = v; }
    for (const k in lv) if (k !== 'def' && k !== 'Q') o[k] = lv[k];
    const h = '#' + hash(o, hash(q, 0, 0, this), 0, this), pv = this.prev.get(this.g);
    if (pv.get('lv') === h) return undefined;
    pv.set('lv', h);
    const e = this.enc(o, 0);
    e.def = lv.def.n; e.Q = q;
    return e;
  };
  // Everything that changed since the last call, as one message, and the buffers to hand over.
  Out.prototype.step = function () {
    const g = this.g, T = this.tables(), msg = { ticks: g.ticks }, xfer = [];
    // tiles
    if (this.first) {
      msg.tiles = { all: true, owner: g.owner.slice(), fallout: g.fallout.slice() };
      xfer.push(msg.tiles.owner.buffer, msg.tiles.fallout.buffer);
      for (let i = 0; i < g.dirtyN; i++) g.dirtyFlag[g.dirty[i]] = 0;
      g.dirtyN = 0;
    } else if (g.dirtyN) {
      const n = g.dirtyN, d = g.dirty, t = d.slice(0, n), o = new Uint16Array(n), f = new Uint8Array(n);
      for (let i = 0; i < n; i++) { const k = t[i]; o[i] = g.owner[k]; f[i] = g.fallout[k]; g.dirtyFlag[k] = 0; }
      g.dirtyN = 0;
      msg.tiles = { t: t, owner: o, fallout: f };
      xfer.push(t.buffer, o.buffer, f.buffer);
    }
    if (this.first) msg.opts = this.enc(g.opts, 0);
    msg.game = this.diff(g, SKIP_GAME);
    const lv = this.level();
    if (lv !== undefined) msg.lv = lv;
    // players
    const me = g.human, pl = [];
    for (let i = 1; i < g.players.length; i++) {
      const mine = g.players[i] === me, p = g.players[i], ch = this.diff(p, mine ? SKIP_PLAYER : SKIP_OTHER);
      let c = ch;
      const post = this.post(p, mine);
      if (post !== undefined) (c || (c = {})).post = post;
      if (mine) {
        const pv = this.prev.get(p), key = '#' + hash(p.border, 0, 0, this);
        if (pv.get('border') !== key) { pv.set('border', key); (c || (c = {})).border = Int32Array.from(p.border); }
      }
      if (c) pl.push(i, c);
    }
    msg.np = g.players.length;
    if (pl.length) msg.players = pl;
    // units, attacks, rails
    const ud = [];
    for (const u of T.units) { const c = this.diff(u, SKIP_UNIT); if (c) ud.push(u.id, c); }
    if (ud.length) msg.units = ud;
    const ad = [];
    for (const a of T.attacks) {
      let c = this.diff(a, SKIP_ATTACK);
      if (me && (a.a === me || a.tid === me.id)) {
        const pv = this.prev.get(a), key = '#' + hash(a.front, 0, 0, this);
        if (pv.get('front') !== key) { pv.set('front', key); (c || (c = {})).front = { $S: Array.from(a.front) }; }
      }
      if (c) ad.push(a.id, c);
    }
    if (ad.length) msg.attacks = ad;
    const ed = [];
    for (const e of T.edges) { const c = this.diff(e, SKIP_EDGE); if (c) ed.push(e.key, c); }
    if (ed.length) msg.edges = ed;
    const id = function (o) { return o.id; };
    const lu = this.list('units', g.units, id), ln = this.list('nukes', g.nukes, id), la = this.list('attacks', T.attacks, id);
    const lr = this.list('rails', g.rails, function (e) { return e.key; });
    if (lu) msg.unitList = lu;
    if (ln) msg.nukeList = ln;
    if (la) msg.attackList = la;
    if (lr) msg.railList = lr;
    // the objects that are gone: their memory of what was sent goes too
    if (g.ticks % 50 === 0) for (const o of this.prev.keys()) if (!this.ref.has(o)) this.prev.delete(o);
    // queues
    if (g.events.length) { msg.events = this.enc(g.events, 0); g.events.length = 0; }
    if (g.fx.length) { msg.fx = this.enc(g.fx, 0); g.fx.length = 0; }
    this.first = false;
    return { msg: msg, xfer: xfer };
  };

  // ---------- the page's side: the mirror ----------
  // A game object without a simulation: the same prototype, so every question the controls ask
  // (buildCheck, cost, structNear ...) is answered as before, from the state of the last tick.
  function In(map) {
    const N = map.N, m = this.m = Object.create(G.Game.prototype);
    m.map = map; m.W = map.W; m.H = map.H; m.N = N; m.S = map.S;
    m.owner = new Uint16Array(N); m.fallout = new Uint8Array(N);
    m.dirty = new Int32Array(N); m.dirtyN = 0; m.dirtyFlag = new Uint8Array(N);
    m.players = [null]; m.units = []; m.nukes = []; m.attacks = []; m.rails = []; m.events = []; m.fx = [];
    m.mirror = true; m.cloakOk = false;
    // working memory of the few questions that search (boatPlan, portSite): made on first use
    let stamp = null, q = null;
    Object.defineProperty(m, 'stamp', { get: function () { return stamp || (stamp = new Int32Array(N)); }, configurable: true });
    Object.defineProperty(m, 'q', { get: function () { return q || (q = new Int32Array(N)); }, configurable: true });
    m.sid = 0;
    this.byU = new Map(); this.byA = new Map(); this.byE = new Map();
    this.Q = null;
  }
  In.prototype.player = function (i) {
    const m = this.m;
    while (m.players.length <= i) {
      const p = { id: m.players.length, out: [], inc: [] };
      borderOnAsk(m, p);
      m.players.push(p);
    }
    return m.players[i];
  };
  // the border of a realm that is not the own one, worked out from the tiles when asked
  function borderOnAsk(m, p) {
    let at = -1, set = null;
    Object.defineProperty(p, 'border', {
      configurable: true, enumerable: false,
      get: function () {
        if (set && at === m.ticks) return set;
        at = m.ticks; set = new Set();
        if (p.x1 < p.x0) return set;
        const W = m.W, H = m.H, own = m.owner, id = p.id;
        for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
          const t = y * W + x;
          if (own[t] !== id) continue;
          if ((x > 0 && own[t - 1] !== id) || (x < W - 1 && own[t + 1] !== id) || (y > 0 && own[t - W] !== id) || (y < H - 1 && own[t + W] !== id)) set.add(t);
        }
        return set;
      },
      set: function (v) { Object.defineProperty(p, 'border', { value: v, writable: true, configurable: true, enumerable: false }); }
    });
  }
  In.prototype.get = function (kind, i) {
    let map;
    if (kind === 'u') map = this.byU; else if (kind === 'a') map = this.byA; else if (kind === 'e') map = this.byE;
    else if (kind === 'p') return this.player(i);
    else return this.m;
    let o = map.get(i);
    if (!o) { o = {}; map.set(i, o); }
    return o;
  };
  In.prototype.dec = function (v) {
    if (v === null || typeof v !== 'object' || ArrayBuffer.isView(v)) return v;
    if (Array.isArray(v)) { const o = new Array(v.length); for (let i = 0; i < v.length; i++) o[i] = this.dec(v[i]); return o; }
    if (v.$r !== undefined) return this.get(v.$r, v.i);
    if (v.$M) { const o = new Map(), a = v.$M; for (let i = 0; i < a.length; i += 2) o.set(this.dec(a[i]), this.dec(a[i + 1])); return o; }
    if (v.$S) { const o = new Set(), a = v.$S; for (let i = 0; i < a.length; i++) o.add(this.dec(a[i])); return o; }
    const o = {};
    for (const k in v) o[k] = this.dec(v[k]);
    return o;
  };
  // fields into an object that stays the same object (the drawing keeps its notes on it)
  In.prototype.patch = function (o, ch) {
    for (const k in ch) {
      const v = ch[k], cur = o[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && !ArrayBuffer.isView(v) && v.$r === undefined && !v.$M && !v.$S &&
        cur && typeof cur === 'object' && Object.getPrototypeOf(cur) === Object.prototype) this.patch(cur, v);
      else o[k] = this.dec(v);
    }
  };
  In.prototype.post = function (p, v) {
    if (v.$P === 2) {
      const cells = new Map();
      for (const c of v.cells) cells.set(c.id, c);
      p.post = { cells: cells, H: v.H, edits: v.edits, autoAt: v.autoAt };
      return;
    }
    const cells = new Map(), n = v.id.length;
    for (let i = 0; i < n; i++) cells.set(v.id[i], { id: v.id[i], n: v.n[i], u: v.u[i], m: 1 });
    p.post = { cells: cells, H: v.H, edits: v.edits, autoAt: 0 };
  };
  In.prototype.apply = function (msg) {
    const m = this.m;
    m.ticks = msg.ticks;
    if (msg.opts) m.opts = this.dec(msg.opts);
    const tl = msg.tiles;
    if (tl && tl.all) { m.owner.set(tl.owner); m.fallout.set(tl.fallout); }
    else if (tl) {
      const t = tl.t, o = tl.owner, f = tl.fallout, own = m.owner, fo = m.fallout;
      for (let i = 0; i < t.length; i++) { const k = t[i]; own[k] = o[i]; fo[k] = f[i]; m.markDirty(k); }
    }
    for (let i = m.players.length; i < msg.np; i++) this.player(i);
    if (msg.players) {
      const a = msg.players;
      for (let i = 0; i < a.length; i += 2) {
        const p = this.player(a[i]), ch = a[i + 1];
        if (ch.post !== undefined) { this.post(p, ch.post); delete ch.post; }
        if (ch.border !== undefined) { p.border = new Set(ch.border); delete ch.border; }
        this.patch(p, ch);
      }
    }
    let unitsChanged = false;
    if (msg.units) { const a = msg.units; unitsChanged = true; for (let i = 0; i < a.length; i += 2) this.patch(this.get('u', a[i]), a[i + 1]); }
    if (msg.attacks) { const a = msg.attacks; for (let i = 0; i < a.length; i += 2) { const o = this.get('a', a[i]); if (!o.front) o.front = new Set(); this.patch(o, a[i + 1]); } }
    if (msg.edges) { const a = msg.edges; for (let i = 0; i < a.length; i += 2) this.patch(this.get('e', a[i]), a[i + 1]); }
    const keep = function (map, list) { const s = new Set(list); for (const k of map.keys()) if (!s.has(k)) map.delete(k); };
    if (msg.unitList) {
      unitsChanged = true;
      m.units = msg.unitList.map((i) => this.get('u', i));
      if (msg.nukeList) m.nukes = msg.nukeList.map((i) => this.get('u', i));
      const all = msg.unitList.slice();
      for (const u of m.nukes) all.push(u.id);
      for (let i = 1; i < m.players.length; i++) for (const u of m.players[i].units || []) all.push(u.id);
      keep(this.byU, all);
    } else if (msg.nukeList) m.nukes = msg.nukeList.map((i) => this.get('u', i));
    if (msg.attackList) {
      m.attacks = msg.attackList.map((i) => this.get('a', i));
      const all = msg.attackList.slice();
      for (let i = 1; i < m.players.length; i++) { const p = m.players[i]; for (const a of p.out || []) all.push(a.id); for (const a of p.inc || []) all.push(a.id); }
      keep(this.byA, all);
    }
    if (msg.railList) { m.rails = msg.railList.map((k) => this.get('e', k)); keep(this.byE, msg.railList); }
    if (msg.game) this.patch(m, msg.game);
    if (msg.lv) {
      const q = msg.lv.Q, n = msg.lv.def;
      delete msg.lv.Q; delete msg.lv.def;
      if (!m.lv) m.lv = {};
      this.patch(m.lv, msg.lv);
      m.lv.def = G.LEVELS.find(function (L) { return L.n === n; });
      if (!this.Q) this.Q = m.levelQ();
      Object.assign(this.Q, q);
      m.lv.Q = this.Q;
    }
    if (unitsChanged) m.cloakOk = false;
    if (msg.events) for (const e of this.dec(msg.events)) m.events.push(e);
    if (msg.fx) for (const f of this.dec(msg.fx)) m.fx.push(f);
  };

  // ---------- the map: built on the page (it needs the browser to read the pictures), copied over ----------
  G.mapPack = function (map) {
    const o = {};
    for (const k in map) {
      const v = map[k];
      if (typeof v === 'function' || k === 'sea') continue;
      if (v && typeof v === 'object' && !ArrayBuffer.isView(v) && !Array.isArray(v)) {
        const pr = Object.getPrototypeOf(v);
        if (pr !== Object.prototype && pr !== null && !(v instanceof Map) && !(v instanceof Set)) continue;
      }
      o[k] = v;
    }
    return o;
  };
  G.mapUnpack = function (o) { return G.addClimate(o, o.rowLat); };

  G.SyncOut = Out; G.SyncIn = In;

  // ---------- the worker ----------
  // Messages from the page, carried out in the order they come:
  //   init  { map, opts, people }      a new game; answers 'state' with everything
  //   step  { ticks: [orders, ...] }   one tick per entry, its orders [[player id, order], ...]
  //                                    first; answers 'state' with the changes, what each order
  //                                    of this device answered (acks) and the checksums
  //   exec  { id, c, seq }             one order at once (playing alone, also while paused)
  //   dump  {}                         for the tests: the whole game as the mirror should have it
  G.simWorker = function (scope) {
    let game = null, out = null, me = -1;
    const send = function (k, extra) {
      const r = out.step(), msg = r.msg;
      msg.k = k;
      if (extra) for (const x in extra) msg[x] = extra[x];
      scope.postMessage(msg, r.xfer);
    };
    scope.onmessage = function (ev) {
      const d = ev.data;
      try {
        if (d.k === 'init') {
          const map = G.mapUnpack(d.map);
          game = new G.Game(map, d.opts);
          game.setup(d.people);
          out = new Out(game);
          me = game.human ? game.human.id : -1;
          send('ready');
        } else if (d.k === 'step') {
          const acks = [], sums = [];
          for (const list of d.ticks) {
            for (const o of list) { const why = game.exec(o[0], o[1]); if (o[0] === me) acks.push(o[2] === undefined ? -1 : o[2], why || ''); }
            game.tick();
            if (d.sum && game.ticks % 100 === 0) sums.push(game.ticks, game.checksum());
          }
          send('state', { acks: acks, sums: sums, n: d.ticks.length });
        } else if (d.k === 'exec') {
          const why = game.exec(d.id, d.c);
          send('ack', { acks: [d.seq, why || ''] });
        } else if (d.k === 'dump') {
          scope.postMessage({ k: 'dump', dump: G.syncDump(game) });
        }
      } catch (e) {
        scope.postMessage({ k: 'error', message: String(e && e.stack || e) });
      }
    };
  };
  // A comparable picture of a game (worker or mirror) for the tests: what crosses over.
  G.syncDump = function (g) {
    const o = new Out(g);
    o.tables();
    const pick = function (x, skip) { const r = {}; for (const k in x) if (!skip.has(k) && o.enc(x[k], 0) !== NOPE) r[k] = '#' + hash(x[k], 0, 0, o); return r; };
    const ps = [];
    for (let i = 1; i < g.players.length; i++) ps.push(pick(g.players[i], g.players[i] === g.human ? SKIP_PLAYER : SKIP_OTHER));
    const me = g.human, atk = me ? me.out.concat(me.inc.filter(function (a) { return me.out.indexOf(a) < 0; })) : [];
    let own = 0;
    for (let i = 0; i < g.N; i++) own = mix(own, g.owner[i] * 256 + g.fallout[i]);
    return {
      ticks: g.ticks, owner: own, game: pick(g, new Set(Array.from(SKIP_GAME).concat(['mirror']))), players: ps,
      units: g.units.map(function (u) { return pick(u, SKIP_UNIT); }), attacks: atk.map(function (a) { return pick(a, SKIP_ATTACK); }),
      rails: g.rails.map(function (e) { return pick(e, SKIP_EDGE); })
    };
  };
  if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) G.simWorker(self);
})(globalThis.G = globalThis.G || {});
