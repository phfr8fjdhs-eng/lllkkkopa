(function (G) {
  'use strict';
  const within = G.within, fmt = G.fmt;
  const PT = G.PT = { HUMAN: 0, NATION: 1, BOT: 2 };
  const UT = G.UT = {
    CITY: 0, DEFENSE: 1, PORT: 2, SILO: 3, SAM: 4, FACTORY: 5, WARSHIP: 6, TRANSPORT: 7, TRADE: 8,
    TRAIN: 9, SHELL: 10, SAMM: 11, ATOM: 12, HYDRO: 13, MIRV: 14, WARHEAD: 15
  };
  G.UNAME = ['Stadt', 'Verteidigungs\u00ADposten', 'Hafen', 'Raketensilo', 'Flugabwehr', 'Fabrik', 'Kriegsschiff', 'Boot',
    'Handelsschiff', 'Zug', 'Granate', 'Abwehrrakete', 'Atombombe', 'Wasserstoff\u00ADbombe', 'MIRV', 'Sprengkopf'];
  G.DIFF_NAMES = ['Leicht', 'Mittel', 'Schwer', 'Unmöglich'];

  const NATION_START = [2500, 5000, 20000, 50000];
  const NATION_MAX = [0.5, 1, 1.5, 2];
  const NATION_GROW = [0.9, 1, 1.1, 1.2];
  const ALLIANCE_TICKS = 6000;      // ten minutes
  const TRAITOR_TICKS = 300;        // thirty seconds
  const WIN_SHARE = 0.8;

  const PRE = ['Nord', 'Süd', 'Ost', 'West', 'Alt', 'Neu', 'Hoch', 'Tief', 'Eisen', 'Gold', 'Silber', 'Stein', 'Wald',
    'See', 'Berg', 'Sturm', 'Feuer', 'Schatten', 'Licht', 'Rot', 'Grau', 'Wolf', 'Adler', 'Bären', 'Falken', 'Raben',
    'Löwen', 'Drachen', 'Hirsch', 'Salz', 'Moor', 'Dorn', 'Eichen', 'Birken', 'Nebel', 'Frost', 'Sonnen', 'Mond',
    'Stern', 'Kupfer', 'Sand', 'Klippen', 'Wiesen', 'Donner', 'Winter', 'Sommer', 'Herbst', 'Kiesel', 'Flut', 'Wind'];
  const SUF = ['mark', 'land', 'reich', 'bund', 'heim', 'burg', 'tal', 'wacht', 'feld', 'hain', 'furt', 'gard',
    'stein', 'au', 'horst', 'wall', 'hafen', 'berg', 'tor', 'grund', 'brück', 'weiler', 'stadt', 'eck'];
  const INVENTED = ['Aldoria', 'Brenmark', 'Calvenien', 'Dornreich', 'Elmstadt', 'Falkonia', 'Grauhaven', 'Hohenfels',
    'Ilmland', 'Jadeküste', 'Kronwald', 'Lindau', 'Morvanien', 'Nordheim', 'Ostara', 'Pellgard', 'Quellmark',
    'Rabenstein', 'Silvanien', 'Tessmark'];

  function Game(map, opts) {
    this.map = map; this.W = map.W; this.H = map.H; this.N = map.N; this.S = map.S;
    this.opts = Object.assign({
      seed: 1, difficulty: 1, bots: 100, nations: true, instantBuild: false,
      infiniteGold: false, infiniteTroops: false, spawnTicks: 150
    }, opts || {});
    this.rng = new G.RNG(this.opts.seed);
    const N = this.N, S = this.S;
    this.owner = new Uint16Array(N);
    this.fallout = new Uint8Array(N); this.falloutCount = 0;
    this.stamp = new Int32Array(N); this.sid = 0; this.q = new Int32Array(N);
    this.players = [null];
    this.ticks = 0; this.phase = 'spawn'; this.spawnEnd = this.opts.spawnTicks;
    this.playStart = 0; this.immuneUntil = 0;
    this.attacks = []; this.attackSeq = 0;
    this.units = []; this.nukes = []; this.structAt = new Map(); this.uid = 0;
    this.portList = null; this.tradeCount = 0;
    this.rails = []; this.railKeys = new Map(); this.railAdj = new Map(); this.railDirty = false; this.railAt = 0; this.railBad = new Set();
    this.requests = []; this.events = []; this.fx = [];
    this.human = null; this.winner = null; this.names = new Set();
    this.dirty = new Int32Array(N); this.dirtyN = 0; this.dirtyFlag = new Uint8Array(N);
    this.path = new G.Pathfinder(map); this.pathCache = new Map(); this.pathQ = []; this.pathJob = null;
    this.R = {
      spawn: 4,
      defense: Math.max(8, Math.round(30 * S)),
      structDist: Math.max(5, Math.round(15 * S)),
      atomIn: Math.max(5, Math.round(12 * S)), atomOut: Math.max(9, Math.round(30 * S)),
      hydroIn: Math.round(80 * S), hydroOut: Math.round(100 * S),
      headIn: Math.max(4, Math.round(12 * S)), headOut: Math.max(6, Math.round(18 * S)),
      sam: Math.round(75 * S), warTarget: Math.round(130 * S), warPatrol: Math.round(100 * S),
      mirvRange: Math.round(1500 * S), mirvCount: Math.max(12, Math.round(350 * S * S)),
      botDist: Math.max(10, Math.round(30 * S)), boatBox: Math.round(150 * S),
      tnSearch: Math.max(60, Math.round(200 * S)), portSearch: Math.max(14, Math.round(40 * S)),
      nukeSpeed: Math.max(2.5, 6 * S), rail: Math.max(30, Math.round(110 * S))
    };
  }

  // ---------- messages for the interface ----------
  Game.prototype.emit = function (e) {
    e.t = this.ticks; this.events.push(e);
    if (this.events.length > 400) this.events.splice(0, 200);
  };
  Game.prototype.say = function (text, cls) { this.emit({ k: 'msg', text: text, cls: cls || 'info' }); };

  // ---------- players ----------
  Game.prototype.addPlayer = function (info) {
    const id = this.players.length, o = this.opts;
    const p = {
      id: id, name: info.name, type: info.type, strength: info.strength || 1, flag: info.flag || '',
      troops: 0, gold: 0, tiles: 0, border: new Set(), alive: false, spawned: false, spawnTile: -1,
      x0: this.W, y0: this.H, x1: -1, y1: -1,
      units: [], cnt: new Int32Array(16), cityLv: 0, dposts: [], boats: 0,
      out: [], inc: [], allies: new Map(), embargo: new Set(), reqCd: new Map(),
      rel: info.type === PT.NATION ? new Map() : null,
      traitorUntil: -1, betrayals: 0, lastChange: 0, lastCluster: 0, ai: null,
      nameX: 0, nameY: 0, nameSize: 0, tradeGold: 0, conquests: 0, cc: null, ccAt: -1
    };
    let c = info.color;
    if (!c) {
      c = info.type === PT.NATION
        ? G.hsl((id * 137.508 + 40) % 360, 0.55 + (id % 3) * 0.07, 0.5 + (id % 4) * 0.035)
        : G.hsl((id * 137.508) % 360, 0.34 + (id % 3) * 0.05, 0.58 + (id % 4) * 0.03);
    }
    p.r = c[0]; p.g = c[1]; p.b = c[2];
    if (info.type === PT.BOT) p.troops = 10000;
    else if (info.type === PT.NATION) p.troops = NATION_START[o.difficulty] * p.strength;
    else p.troops = o.infiniteTroops ? 1e6 : 25000;
    this.players.push(p);
    return p;
  };

  Game.prototype.botName = function () {
    const r = this.rng;
    for (let i = 0; i < 40; i++) {
      const n = r.pick(PRE) + r.pick(SUF);
      if (!this.names.has(n)) { this.names.add(n); return n; }
    }
    return r.pick(PRE) + r.pick(SUF) + ' ' + (this.players.length);
  };

  Game.prototype.freeLandNear = function (x, y, rad) {
    const W = this.W, H = this.H, land = this.map.land, own = this.owner;
    for (let r = 0; r <= rad; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const t = yy * W + xx;
        if (land[t] && !own[t]) return t;
      }
    }
    return -1;
  };

  Game.prototype.setup = function (human) {
    const map = this.map, o = this.opts, rng = this.rng, W = this.W;
    if (human) this.human = this.addPlayer({ name: human.name, type: PT.HUMAN, color: human.color });
    const spots = [];
    const far = function (t, d) {
      const x = t % W, y = (t / W) | 0;
      for (let i = 0; i < spots.length; i++) {
        const dx = spots[i] % W - x, dy = ((spots[i] / W) | 0) - y;
        if (dx * dx + dy * dy < d * d) return false;
      }
      return true;
    };
    const randomLand = (d) => {
      for (let tries = 0; tries < 300; tries++) {
        const c = rng.int(0, this.N);
        if (map.land[c] && !this.owner[c] && far(c, d)) return c;
      }
      return -1;
    };
    if (o.nations) {
      let list = map.nations;
      if (!list.length) {
        list = [];
        const names = INVENTED.slice();
        for (let i = 0; i < 14 && names.length; i++) {
          const t = randomLand(Math.round(90 * this.S));
          if (t < 0) break;
          spots.push(t);
          list.push([names.splice(rng.int(0, names.length), 1)[0], t % W, (t / W) | 0, 1 + (i % 3 === 0 ? 1 : 0), '']);
        }
        spots.length = 0;
      }
      for (const n of list) {
        const t = this.freeLandNear(n[1], n[2], 10);
        if (t < 0) continue;
        const p = this.addPlayer({ name: n[0], type: PT.NATION, strength: n[3], flag: n[4] });
        this.names.add(n[0]);
        this.spawn(p, t); spots.push(t);
        p.ai = new G.AI(this, p);
      }
    }
    let minD = this.R.botDist;
    for (let i = 0; i < o.bots; i++) {
      let t = randomLand(minD);
      while (t < 0 && minD > 5) { minD = Math.max(5, minD * 0.8); t = randomLand(minD); }
      if (t < 0) break;
      const p = this.addPlayer({ name: this.botName(), type: PT.BOT });
      this.spawn(p, t); spots.push(t);
      p.ai = new G.AI(this, p);
    }
  };

  // ---------- numbers that drive the economy ----------
  Game.prototype.maxTroops = function (p) {
    if (p.type === PT.HUMAN && this.opts.infiniteTroops) return 1e9;
    const m = 2 * (Math.pow(p.tiles, 0.6) * 1000 + 50000) + p.cityLv * 250000;
    if (p.type === PT.BOT) return m / 3;
    if (p.type === PT.HUMAN) return m;
    return m * NATION_MAX[this.opts.difficulty];
  };
  Game.prototype.troopGrowth = function (p) {
    const max = this.maxTroops(p);
    let add = (10 + Math.pow(p.troops, 0.73) / 4) * (1 - p.troops / max);
    if (p.type === PT.BOT) add *= 0.6;
    else if (p.type === PT.NATION) add *= NATION_GROW[this.opts.difficulty];
    return Math.min(p.troops + add, max) - p.troops;
  };
  Game.prototype.goldRate = function (p) { return p.type === PT.BOT ? 50 : 100; };

  // ---------- territory ----------
  Game.prototype.markDirty = function (t) {
    if (!this.dirtyFlag[t]) { this.dirtyFlag[t] = 1; this.dirty[this.dirtyN++] = t; }
  };
  Game.prototype.fixBorder = function (t) {
    const own = this.owner, id = own[t];
    this.markDirty(t);
    if (!id) return;
    const W = this.W, x = t % W, y = (t - x) / W;
    const edge = (x > 0 && own[t - 1] !== id) || (x < W - 1 && own[t + 1] !== id) ||
      (y > 0 && own[t - W] !== id) || (y < this.H - 1 && own[t + W] !== id);
    const set = this.players[id].border;
    if (edge) set.add(t); else set.delete(t);
  };
  Game.prototype.fixAround = function (t) {
    const W = this.W, x = t % W, y = (t - x) / W;
    this.fixBorder(t);
    if (x > 0) this.fixBorder(t - 1);
    if (x < W - 1) this.fixBorder(t + 1);
    if (y > 0) this.fixBorder(t - W);
    if (y < this.H - 1) this.fixBorder(t + W);
  };
  Game.prototype.conquer = function (p, t) {
    const own = this.owner, prev = own[t], id = p.id;
    if (prev === id) return;
    if (prev) { const q = this.players[prev]; q.tiles--; q.border.delete(t); q.lastChange = this.ticks; }
    own[t] = id; p.tiles++; p.lastChange = this.ticks;
    if (this.fallout[t]) { this.fallout[t] = 0; this.falloutCount--; }
    const W = this.W, x = t % W, y = (t - x) / W;
    if (x < p.x0) p.x0 = x;
    if (x > p.x1) p.x1 = x;
    if (y < p.y0) p.y0 = y;
    if (y > p.y1) p.y1 = y;
    this.fixAround(t);
    if (this.structAt.size) { const u = this.structAt.get(t); if (u) this.captureUnit(u, p); }
  };
  Game.prototype.relinquish = function (t) {
    const own = this.owner, prev = own[t];
    if (!prev) return;
    const q = this.players[prev];
    q.tiles--; q.border.delete(t); q.lastChange = this.ticks; own[t] = 0;
    this.fixAround(t);
    if (this.structAt.size) { const u = this.structAt.get(t); if (u) this.removeUnit(u); }
  };
  Game.prototype.forTiles = function (p, fn) {
    const W = this.W, own = this.owner, id = p.id;
    const x0 = p.x0, x1 = p.x1, y0 = p.y0, y1 = p.y1;
    for (let y = y0; y <= y1; y++) {
      let t = y * W + x0;
      for (let x = x0; x <= x1; x++, t++) if (own[t] === id) fn(t);
    }
  };
  // Pull the bounding box in to the tiles that are really owned.
  Game.prototype.shrinkBox = function (p) {
    const W = this.W, own = this.owner, id = p.id;
    if (p.tiles <= 0) { p.x0 = W; p.y0 = this.H; p.x1 = -1; p.y1 = -1; return; }
    const rowHas = function (y) { for (let x = p.x0, t = y * W + p.x0; x <= p.x1; x++, t++) if (own[t] === id) return true; return false; };
    const colHas = function (x) { for (let y = p.y0, t = p.y0 * W + x; y <= p.y1; y++, t += W) if (own[t] === id) return true; return false; };
    while (p.y0 < p.y1 && !rowHas(p.y0)) p.y0++;
    while (p.y1 > p.y0 && !rowHas(p.y1)) p.y1--;
    while (p.x0 < p.x1 && !colHas(p.x0)) p.x0++;
    while (p.x1 > p.x0 && !colHas(p.x1)) p.x1--;
  };

  // ---------- spawning ----------
  Game.prototype.canSpawnAt = function (t) { return t >= 0 && this.map.land[t] === 1 && this.owner[t] === 0; };
  Game.prototype.spawn = function (p, t) {
    if (this.map.land[t] !== 1) return false;
    if (this.owner[t] !== 0 && this.owner[t] !== p.id) return false;
    if (p.tiles > 0) {
      this.forTiles(p, (q) => this.relinquish(q));
      p.x0 = this.W; p.y0 = this.H; p.x1 = -1; p.y1 = -1;
    }
    const W = this.W, H = this.H, land = this.map.land, own = this.owner;
    const cx = t % W, cy = (t / W) | 0, r = this.R.spawn;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const n = y * W + x;
      if (land[n] && !own[n]) this.conquer(p, n);
    }
    p.spawned = true; p.alive = p.tiles > 0; p.spawnTile = t;
    return p.alive;
  };

  // ---------- relations and alliances ----------
  Game.prototype.friendly = function (a, b) { return a === b || a.allies.has(b.id); };
  Game.prototype.isTraitor = function (p) { return p.traitorUntil > this.ticks; };
  Game.prototype.relate = function (p, other, delta) {
    if (!p.rel || p === other) return;
    p.rel.set(other.id, within((p.rel.get(other.id) || 0) + delta, -100, 100));
  };
  Game.prototype.relation = function (p, other) { return p.rel ? (p.rel.get(other.id) || 0) : 0; };
  Game.prototype.canTrade = function (a, b) { return !a.embargo.has(b.id) && !b.embargo.has(a.id); };

  Game.prototype.canRequestAlliance = function (a, b) {
    if (a === b || !a.alive || !b.alive || this.phase !== 'play') return false;
    if (a.allies.has(b.id)) return false;
    for (const r of this.requests) if ((r.from === a && r.to === b) || (r.from === b && r.to === a)) return false;
    return (a.reqCd.get(b.id) || 0) <= this.ticks;
  };
  Game.prototype.requestAlliance = function (a, b) {
    if (!this.canRequestAlliance(a, b)) return false;
    const r = { id: ++this.uid, from: a, to: b, until: this.ticks + 200, decideAt: this.ticks + this.rng.int(10, 30) };
    this.requests.push(r);
    a.reqCd.set(b.id, this.ticks + 300);
    if (b === this.human) this.emit({ k: 'allyReq', id: r.id, from: a.id, until: r.until });
    return true;
  };
  Game.prototype.answerRequest = function (id, accept) {
    const i = this.requests.findIndex(function (r) { return r.id === id; });
    if (i < 0) return;
    const r = this.requests[i];
    this.requests.splice(i, 1);
    if (accept && r.from.alive && r.to.alive) {
      this.makeAlliance(r.from, r.to);
    } else if (r.from === this.human) {
      this.say(r.to.name + ' lehnt deine Allianz ab', 'warn');
    }
  };
  Game.prototype.makeAlliance = function (a, b) {
    if (a.allies.has(b.id)) return;
    const al = { a: a, b: b, end: this.ticks + ALLIANCE_TICKS, prompted: false };
    a.allies.set(b.id, al); b.allies.set(a.id, al);
    for (const at of a.out.slice()) if (at.tid === b.id) this.endAttack(at, true);
    for (const at of b.out.slice()) if (at.tid === a.id) this.endAttack(at, true);
    this.relate(a, b, 100); this.relate(b, a, 100);
    if (a === this.human || b === this.human) {
      this.say('Allianz mit ' + (a === this.human ? b : a).name + ' geschlossen', 'good');
    }
  };
  Game.prototype.breakAlliance = function (a, b) {
    if (!a.allies.has(b.id)) return false;
    a.allies.delete(b.id); b.allies.delete(a.id);
    if (!this.isTraitor(b)) { a.traitorUntil = this.ticks + TRAITOR_TICKS; a.betrayals++; }
    this.relate(b, a, -100);
    for (let i = 1; i < this.players.length; i++) {
      const q = this.players[i];
      if (q !== a && q !== b && q.alive) this.relate(q, a, -40);
    }
    if (b.type !== PT.HUMAN) b.embargo.add(a.id);
    if (b === this.human) this.say(a.name + ' hat die Allianz mit dir gebrochen!', 'bad');
    else if (a === this.human) this.say('Du hast ' + b.name + ' verraten. 30 Sekunden lang bist du leichter anzugreifen.', 'warn');
    return true;
  };
  Game.prototype.renewAlliance = function (a, b) {
    const al = a.allies.get(b.id);
    if (!al) return false;
    const ok = b.type === PT.HUMAN || (b.ai && b.ai.decide(a, true));
    if (ok) { al.end = this.ticks + ALLIANCE_TICKS; al.prompted = false; }
    if (a === this.human) this.say(ok ? 'Allianz mit ' + b.name + ' verlängert' : b.name + ' will die Allianz nicht verlängern', ok ? 'good' : 'warn');
    return ok;
  };
  Game.prototype.donate = function (a, b, kind, amount) {
    if (!a.alive || !b.alive || !a.allies.has(b.id) || amount < 1) return false;
    if (kind === 'gold') { amount = Math.min(amount, a.gold); a.gold -= amount; b.gold += amount; }
    else { amount = Math.min(amount, a.troops); a.troops -= amount; b.troops += amount; }
    this.relate(b, a, 50);
    if (b === this.human) this.say(a.name + ' schickt dir ' + (kind === 'gold' ? fmt(amount) + ' Gold' : G.fmtTroops(amount) + ' Truppen'), 'good');
    return amount;
  };

  Game.prototype.tickDiplomacy = function () {
    const T = this.ticks, ps = this.players, h = this.human;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (p.rel) {
        for (const e of p.rel) {
          const v = e[1] > 0 ? e[1] - 0.5 : e[1] + 0.5;
          if (Math.abs(v) < 0.5) p.rel.delete(e[0]); else p.rel.set(e[0], v);
        }
      }
      for (const e of p.allies) {
        if (p.id > e[0]) continue;
        const al = e[1], q = ps[e[0]];
        if (T >= al.end) {
          p.allies.delete(q.id); q.allies.delete(p.id);
          if (p === h || q === h) this.say('Die Allianz mit ' + (p === h ? q : p).name + ' ist abgelaufen', 'warn');
        } else if (!al.prompted && al.end - T <= 300 && (p === h || q === h)) {
          al.prompted = true;
          this.emit({ k: 'renew', id: (p === h ? q : p).id, until: al.end });
        }
      }
    }
    for (const r of this.requests.slice()) {
      if (!r.from.alive || !r.to.alive) { this.answerRequest(r.id, false); continue; }
      if (r.to.type !== PT.HUMAN) {
        if (T >= r.decideAt) this.answerRequest(r.id, r.to.ai ? r.to.ai.decide(r.from, false) : false);
      } else if (T >= r.until) {
        this.answerRequest(r.id, false);
      }
    }
  };

  // ---------- neighbours ----------
  Game.prototype.neighbors = function (p) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H, id = p.id;
    const ids = new Set();
    let tn = false;
    for (const t of p.border) {
      const x = t % W, y = (t - x) / W;
      if (x > 0) { const n = t - 1, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (x < W - 1) { const n = t + 1, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (y > 0) { const n = t - W, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (y < H - 1) { const n = t + W, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
    }
    return { tn: tn, ids: ids };
  };
  Game.prototype.sharesBorder = function (p, tid) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H;
    for (const t of p.border) {
      const x = t % W, y = (t - x) / W;
      if (x > 0 && own[t - 1] === tid && land[t - 1]) return true;
      if (x < W - 1 && own[t + 1] === tid && land[t + 1]) return true;
      if (y > 0 && own[t - W] === tid && land[t - W]) return true;
      if (y < H - 1 && own[t + W] === tid && land[t + W]) return true;
    }
    return false;
  };
  // Is this free tile part of open land that touches the player's territory?
  Game.prototype.tnTouches = function (p, tile) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H, id = p.id, lim = this.R.tnSearch;
    const st = this.stamp, sid = ++this.sid, q = this.q;
    const tx = tile % W, ty = (tile / W) | 0;
    let qh = 0, qt = 0;
    q[qt++] = tile; st[tile] = sid;
    while (qh < qt) {
      const t = q[qh++], x = t % W, y = (t - x) / W;
      for (let k = 0; k < 4; k++) {
        let n;
        if (k === 0) { if (x === 0) continue; n = t - 1; }
        else if (k === 1) { if (x === W - 1) continue; n = t + 1; }
        else if (k === 2) { if (y === 0) continue; n = t - W; }
        else { if (y === H - 1) continue; n = t + W; }
        const o = own[n];
        if (o === id) return true;
        if (o === 0 && land[n] && st[n] !== sid) {
          const nx = n % W, ny = (n - nx) / W;
          if (Math.abs(nx - tx) + Math.abs(ny - ty) <= lim) { st[n] = sid; q[qt++] = n; }
        }
      }
    }
    return false;
  };

  // ---------- land attacks ----------
  function Attack(id, a, tid, troops, t) {
    this.id = id; this.a = a; this.tid = tid; this.troops = troops;
    this.heap = new G.Heap(128); this.front = new Set(); this.active = true; this.start = t;
  }

  Game.prototype.addFront = function (at, tile) {
    const own = this.owner, land = this.map.land, mg = this.map.mag, W = this.W, H = this.H;
    const tid = at.tid, aid = at.a.id, rng = this.rng, T = this.ticks;
    const x = tile % W, y = (tile - x) / W;
    for (let k = 0; k < 4; k++) {
      let n;
      if (k === 0) { if (x === 0) continue; n = tile - 1; }
      else if (k === 1) { if (x === W - 1) continue; n = tile + 1; }
      else if (k === 2) { if (y === 0) continue; n = tile - W; }
      else { if (y === H - 1) continue; n = tile + W; }
      if (!land[n] || own[n] !== tid) continue;
      at.front.add(n);
      const nx = n % W, ny = (n - nx) / W;
      let mine = 0;
      if (nx > 0 && own[n - 1] === aid) mine++;
      if (nx < W - 1 && own[n + 1] === aid) mine++;
      if (ny > 0 && own[n - W] === aid) mine++;
      if (ny < H - 1 && own[n + W] === aid) mine++;
      if (mine > 2) mine = 10;
      const m = mg[n], rough = m < 10 ? 1 : m < 20 ? 1.5 : 2;
      at.heap.push((rng.int(0, 7) + 10) * (1 - mine * 0.5 + rough / 2) + T, n);
    }
  };
  Game.prototype.refreshFront = function (at) {
    at.heap.clear(); at.front.clear();
    for (const b of at.a.border) this.addFront(at, b);
  };

  // Send troops against a player (tid) or against free land (tid 0). src is a landing tile, or -1.
  Game.prototype.attack = function (a, tid, troops, src) {
    if (!a.alive || this.phase !== 'play') return null;
    const t = tid ? this.players[tid] : null;
    if (t) {
      if (t === a || !t.alive || this.friendly(a, t)) return null;
      if (this.ticks < this.immuneUntil) return null;
    }
    troops = Math.min(troops, a.troops);
    if (troops < 1) return null;
    a.troops -= troops;
    if (t) {
      for (const inc of a.inc.slice()) {
        if (!inc.active || inc.a !== t) continue;
        if (inc.troops > troops) { inc.troops -= troops; return null; }
        troops -= inc.troops;
        this.endAttack(inc, false);
      }
      if (troops < 1) return null;
      this.relate(t, a, -80);
    }
    let at = null;
    for (const o of a.out) if (o.active && o.tid === tid) { at = o; break; }
    if (at) {
      at.troops += troops;
      if (src >= 0) this.addFront(at, src);
      return at;
    }
    at = new Attack(++this.attackSeq, a, tid, troops, this.ticks);
    a.out.push(at);
    if (t) {
      t.inc.push(at);
      if (t === this.human && this.ticks - (a.warnAt || -999) > 300) { a.warnAt = this.ticks; this.say(a.name + ' greift dich an', 'bad'); }
    }
    this.attacks.push(at);
    if (src >= 0) this.addFront(at, src); else this.refreshFront(at);
    return at;
  };

  Game.prototype.endAttack = function (at, refund) {
    if (!at.active) return;
    at.active = false;
    if (refund && at.a.alive && at.troops > 0) at.a.troops += at.troops;
    let i = at.a.out.indexOf(at);
    if (i >= 0) at.a.out.splice(i, 1);
    if (at.tid) {
      const t = this.players[at.tid];
      i = t.inc.indexOf(at);
      if (i >= 0) t.inc.splice(i, 1);
    }
  };
  // Calling troops back costs a quarter of them.
  Game.prototype.retreat = function (at) {
    if (!at.active) return;
    at.troops *= 0.75;
    this.endAttack(at, true);
  };

  Game.prototype.tickAttack = function (at) {
    const a = at.a, tid = at.tid, t = tid ? this.players[tid] : null;
    if (!a.alive) { this.endAttack(at, false); return; }
    if (t && (!t.alive || this.friendly(a, t))) { this.endAttack(at, true); return; }
    if (at.troops < 1) { this.endAttack(at, false); return; }
    const own = this.owner, map = this.map, mg = map.mag, W = this.W, H = this.H, aid = a.id;
    const n = at.front.size + this.rng.int(0, 5);
    let budget = t ? within((5 * at.troops / Math.max(1, t.troops)) * 2, 0.01, 0.5) * n * 3 : n * 2;
    const landTiles = map.landTiles;
    const lossMod = a.tiles > landTiles * 0.17 ? Math.sqrt(landTiles * 0.17 / a.tiles) : 1;
    const speedMod = a.tiles > landTiles * 0.13 ? Math.pow(landTiles * 0.13 / a.tiles, 0.6) : 1;
    const traitor = t && t.traitorUntil > this.ticks ? 0.5 : 1;
    const botMod = t && t.type === PT.BOT && a.type !== PT.BOT ? 0.8 : 1;
    const dp = t ? t.dposts : null, dr2 = this.R.defense * this.R.defense, fo = this.fallout;
    let guard = 0;
    while (budget > 0) {
      if (at.troops < 1) { this.endAttack(at, false); return; }
      if (at.heap.n === 0) {
        this.refreshFront(at);
        if (at.heap.n === 0) { this.endAttack(at, true); return; }
      }
      if (++guard > 100000) return;
      const tile = at.heap.pop();
      at.front.delete(tile);
      if (own[tile] !== tid) continue;
      const x = tile % W, y = (tile - x) / W;
      if (!((x > 0 && own[tile - 1] === aid) || (x < W - 1 && own[tile + 1] === aid) ||
            (y > 0 && own[tile - W] === aid) || (y < H - 1 && own[tile + W] === aid))) continue;
      this.addFront(at, tile);
      const m = mg[tile];
      let mag = m < 10 ? 80 : m < 20 ? 100 : 120, speed = m < 10 ? 16.5 : m < 20 ? 20 : 25;
      if (dp && dp.length) {
        for (let i = 0; i < dp.length; i++) {
          const dx = dp[i].x - x, dy = dp[i].y - y;
          if (dx * dx + dy * dy <= dr2) { mag *= 5; speed *= 5; break; }
        }
      }
      if (fo[tile]) { const f = 5 - 2 * this.falloutCount / landTiles; mag *= f; speed *= f; }
      let loss, used;
      if (t) {
        const tt = t.troops;
        loss = within(tt / at.troops, 0.6, 2) * mag * 0.8 * botMod * lossMod * traitor;
        used = within(tt / (5 * at.troops), 0.2, 1.5) * speed * speedMod;
        t.troops = Math.max(0, tt - tt / Math.max(1, t.tiles));
      } else {
        loss = a.type === PT.BOT ? mag / 10 : mag / 5;
        used = within(2000 * Math.max(10, speed) / at.troops, 5, 100);
      }
      budget -= used; at.troops -= loss;
      this.conquer(a, tile);
      if (t && t.tiles < 100) { this.finishOff(a, t); this.endAttack(at, true); return; }
    }
  };

  // A player reduced to a sliver of land is absorbed whole, gold included.
  Game.prototype.finishOff = function (a, t) {
    const gold = t.gold;
    t.gold = 0; a.gold += gold; a.conquests++;
    if (a === this.human) this.say(t.name + ' erobert, ' + fmt(gold) + ' Gold erbeutet', 'good');
    this.forTiles(t, (x) => this.conquer(a, x));
  };

  // ---------- cut-off pockets ----------
  Game.prototype.removeClusters = function (p) {
    const W = this.W, H = this.H, own = this.owner, id = p.id, st = this.stamp, sid = ++this.sid;
    const border = p.border, clusters = [];
    for (const start of border) {
      if (st[start] === sid) continue;
      const cl = [start];
      st[start] = sid;
      for (let i = 0; i < cl.length; i++) {
        const t = cl[i], x = t % W, y = (t - x) / W;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W || (!dx && !dy)) continue;
            const n = yy * W + xx;
            if (st[n] !== sid && own[n] === id && border.has(n)) { st[n] = sid; cl.push(n); }
          }
        }
      }
      clusters.push(cl);
    }
    if (!clusters.length) return;
    let mi = 0;
    for (let i = 1; i < clusters.length; i++) if (clusters[i].length > clusters[mi].length) mi = i;
    for (let i = 0; i < clusters.length; i++) {
      if (p.tiles <= 0) return;
      if (i === mi ? this.enclosed(p, clusters[i]) : this.surrounded(p, clusters[i])) this.capturePocket(p, clusters[i]);
    }
  };
  // Every neighbour of the main body belongs to one single other player.
  Game.prototype.enclosed = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id;
    let enemy = 0;
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
      for (let k = 0; k < 4; k++) {
        const o = own[k === 0 ? t - 1 : k === 1 ? t + 1 : k === 2 ? t - W : t + W];
        if (o === id) continue;
        if (!o) return false;
        if (enemy && o !== enemy) return false;
        enemy = o;
      }
    }
    return enemy > 0 && !this.friendly(p, this.players[enemy]);
  };
  // A detached piece that sits inland and inside the reach of the players around it.
  Game.prototype.surrounded = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id, shore = this.map.shore;
    let cx0 = W, cx1 = -1, cy0 = H, cy1 = -1, ex0 = W, ex1 = -1, ey0 = H, ey1 = -1;
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (shore[t] || x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
      if (x < cx0) cx0 = x;
      if (x > cx1) cx1 = x;
      if (y < cy0) cy0 = y;
      if (y > cy1) cy1 = y;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        const o = own[ny * W + nx];
        if (!o || o === id) continue;
        if (nx < ex0) ex0 = nx;
        if (nx > ex1) ex1 = nx;
        if (ny < ey0) ey0 = ny;
        if (ny > ey1) ey1 = ny;
      }
    }
    return ex1 >= 0 && ex0 <= cx0 && ey0 <= cy0 && ex1 >= cx1 && ey1 >= cy1;
  };
  Game.prototype.capturePocket = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id;
    const count = new Map();
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (own[t] !== id) return;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const o = own[ny * W + nx];
        if (o && o !== id) count.set(o, (count.get(o) || 0) + 1);
      }
    }
    let taker = null, best = 0;
    for (const e of count) {
      const q = this.players[e[0]];
      if (this.friendly(p, q)) continue;
      for (const at of q.out) if (at.active && at.tid === id && at.troops > best) { best = at.troops; taker = q; }
    }
    if (!taker) {
      best = 0;
      for (const e of count) {
        const q = this.players[e[0]];
        if (!this.friendly(p, q) && e[1] > best) { best = e[1]; taker = q; }
      }
    }
    if (!taker) return;
    const st = this.stamp, sid = ++this.sid, q = this.q;
    let qh = 0, qt = 0;
    q[qt++] = cl[0]; st[cl[0]] = sid;
    while (qh < qt) {
      const t = q[qh++], x = t % W, y = (t - x) / W;
      if (x > 0 && own[t - 1] === id && st[t - 1] !== sid) { st[t - 1] = sid; q[qt++] = t - 1; }
      if (x < W - 1 && own[t + 1] === id && st[t + 1] !== sid) { st[t + 1] = sid; q[qt++] = t + 1; }
      if (y > 0 && own[t - W] === id && st[t - W] !== sid) { st[t - W] = sid; q[qt++] = t - W; }
      if (y < H - 1 && own[t + W] === id && st[t + W] !== sid) { st[t + W] = sid; q[qt++] = t + W; }
    }
    if (qt === p.tiles) {
      const gold = p.gold;
      p.gold = 0; taker.gold += gold; taker.conquests++;
      if (taker === this.human) this.say(p.name + ' eingekreist und übernommen, ' + fmt(gold) + ' Gold erbeutet', 'good');
    }
    const list = q.slice(0, qt);
    for (let i = 0; i < list.length; i++) this.conquer(taker, list[i]);
  };

  // ---------- deaths and victory ----------
  Game.prototype.kill = function (p) {
    p.alive = false; p.troops = 0;
    for (const a of p.out.slice()) this.endAttack(a, false);
    for (const a of p.inc.slice()) this.endAttack(a, true);
    for (const u of p.units.slice()) if (u.type < UT.ATOM) this.removeUnit(u);
    for (const e of p.allies) this.players[e[0]].allies.delete(p.id);
    p.allies.clear(); p.border.clear();
    if (p === this.human) this.emit({ k: 'defeat' });
  };
  Game.prototype.reap = function () {
    const ps = this.players;
    for (let i = 1; i < ps.length; i++) if (ps[i].alive && ps[i].tiles <= 0) this.kill(ps[i]);
  };
  Game.prototype.checkWin = function () {
    const den = Math.max(1, this.map.landTiles - this.falloutCount), ps = this.players;
    let alive = 0, last = null;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      alive++; last = p;
      if (p.tiles / den >= WIN_SHARE) { this.winner = p; break; }
    }
    if (!this.winner && alive === 1 && ps.length > 2) this.winner = last;
    if (this.winner) this.emit({ k: 'win', id: this.winner.id });
  };

  // ---------- one step of the simulation (a tenth of a second) ----------
  Game.prototype.tick = function () {
    const T = ++this.ticks, ps = this.players, n = ps.length;
    if (this.phase === 'spawn') {
      if (T >= this.spawnEnd && (!this.human || this.human.spawned)) {
        this.phase = 'play'; this.playStart = T; this.immuneUntil = T + 50;
        this.emit({ k: 'start' });
      }
      return;
    }
    for (let i = 1; i < n; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      p.troops += this.troopGrowth(p);
      if (p.troops < 0) p.troops = 0;
      p.gold += this.goldRate(p);
    }
    if (this.human && this.opts.infiniteGold && this.human.alive) this.human.gold = 1e9;

    const at = this.attacks;
    for (let i = 0; i < at.length; i++) if (at[i].active) this.tickAttack(at[i]);
    if (T % 20 === 0) this.attacks = at.filter(function (a) { return a.active; });
    this.reap();

    this.pathStep();
    this.tickRail();
    const us = this.units;
    for (let i = 0; i < us.length; i++) if (us[i].active) this.tickUnit(us[i]);
    if (T % 10 === 0) {
      this.units = us.filter(function (u) { return u.active; });
      this.nukes = this.nukes.filter(function (u) { return u.active; });
    }

    for (let i = 1; i < n; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (p.ai) p.ai.tick();
      if ((T + i * 3) % 20 === 0 && p.lastChange >= p.lastCluster) { p.lastCluster = T; this.removeClusters(p); }
    }
    if (T % 10 === 0) this.tickDiplomacy();
    this.reap();
    if (T % 10 === 0 && !this.winner) this.checkWin();
  };

  // ---------- sea routes, worked on a little every step ----------
  Game.prototype.requestPath = function (src, dst, cb, urgent) {
    const job = { src: src, dst: dst, cb: cb };
    if (urgent) this.pathQ.unshift(job); else this.pathQ.push(job);
  };
  Game.prototype.pathStep = function () {
    const pf = this.path;
    let budget = 12000;
    while (budget > 0) {
      if (!this.pathJob) {
        const job = this.pathQ.shift();
        if (!job) return;
        if (!pf.start(job.src, job.dst)) {
          budget -= 50;
          job.cb(job.src === job.dst && job.src >= 0 && !this.map.land[job.src] ? new Int32Array([job.src]) : null);
          continue;
        }
        this.pathJob = job;
      }
      budget -= pf.run(budget);
      if (pf.state !== 0) {
        const job = this.pathJob;
        this.pathJob = null;
        job.cb(pf.state === 1 ? pf.result() : null);
      }
    }
  };

  // ---------- what the player can do at a tile ----------
  Game.prototype.actionsAt = function (p, tile) {
    const tid = this.owner[tile], land = this.map.land[tile] === 1;
    const res = {
      tile: tile, land: land, tid: tid, own: tid === p.id,
      target: tid && tid !== p.id ? this.players[tid] : null, canAttack: false, boat: null, why: ''
    };
    if (!p.alive || this.phase !== 'play') { res.why = 'Nicht möglich'; return res; }
    if (!land) { res.why = 'Wasser'; return res; }
    if (res.own) { res.why = 'Eigenes Gebiet'; return res; }
    const q = res.target;
    if (q && this.friendly(p, q)) { res.why = 'Verbündet'; return res; }
    if (q && this.ticks < this.immuneUntil) { res.why = 'Schonfrist: Spieler sind noch geschützt'; return res; }
    if (q ? this.sharesBorder(p, tid) : this.tnTouches(p, tile)) res.canAttack = true;
    if (p.boats < 3) res.boat = this.boatPlan(p, tile);
    if (!res.canAttack && !res.boat) res.why = p.boats >= 3 ? 'Höchstens 3 Boote gleichzeitig' : 'Von hier nicht erreichbar';
    return res;
  };
  // Attack over land if there is a shared border, otherwise by sea.
  Game.prototype.strike = function (p, tile, ratio) {
    const a = this.actionsAt(p, tile);
    if (a.canAttack) return this.attack(p, a.tid, p.troops * ratio, -1) ? '' : 'Zu wenig Truppen';
    if (a.boat) return this.sendBoat(p, a.boat, p.troops * ratio) ? '' : 'Boot kann nicht auslaufen';
    return a.why;
  };

  G.Game = Game;
})(globalThis.G = globalThis.G || {});
