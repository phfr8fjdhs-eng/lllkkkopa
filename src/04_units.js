(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const Game = G.Game, UT = G.UT, PT = G.PT, fmt = G.fmt;
  const BUILD_TICKS = [20, 50, 50, 100, 300, 20];   // city, defence post, port, silo, air defence, factory
  G.BUILD_TICKS = BUILD_TICKS;
  G.MAX_LEVEL = 5;
  G.CITY_MAX_LEVEL = 100;
  // Cities grow up to level 100, every other building up to level 5.
  G.maxLevel = function (type) { return type === UT.CITY ? G.CITY_MAX_LEVEL : G.MAX_LEVEL; };

  // Price of the next one of a kind. As in OpenFront every level of a building counts like a
  // building of its own, so an upgrade costs what the next new one would (cities: 125K, 250K,
  // 500K, then 1M each). `have` overrides how many the player is counted as owning.
  Game.prototype.cost = function (p, type, have) {
    if (p.type === PT.HUMAN && this.opts.infiniteGold) return 0;
    // ports and factories share one price ladder
    const c = (have === undefined ? p.cnt[type] : have) + (type === UT.PORT ? p.cnt[UT.FACTORY] : type === UT.FACTORY ? p.cnt[UT.PORT] : 0);
    switch (type) {
      case UT.CITY: case UT.PORT: case UT.FACTORY: return Math.min(1e6, Math.pow(2, c) * 125000);
      case UT.DEFENSE: return Math.min(250000, (c + 1) * 50000);
      case UT.SILO: return 1e6;
      case UT.SAM: return Math.min(3e6, (c + 1) * 1.5e6);
      case UT.WARSHIP: return Math.min(1e6, (c + 1) * 250000);
      case UT.ATOM: return 750000;
      case UT.CRUISE: return 350000;
      case UT.HYDRO: return 5e6;
      case UT.MIRV: return 25e6 + 15e6 * (this.mirvs || 0);   // every MIRV launched in this game makes the next one dearer
      case UT.LASER: return 600000;
    }
    return 0;
  };

  // ---------- bookkeeping ----------
  Game.prototype.newUnit = function (type, owner, tile) {
    const x = tile % this.W, y = (tile / this.W) | 0;
    return { id: ++this.uid, type: type, owner: owner, tile: tile, x: x, y: y, px: x, py: y, active: true, level: 1, built: true, hp: 0 };
  };
  Game.prototype.setPos = function (u, tile) { u.tile = tile; u.x = tile % this.W; u.y = (tile / this.W) | 0; };
  Game.prototype.addUnit = function (u) {
    this.units.push(u); u.owner.units.push(u); u.owner.cnt[u.type] += u.level;
    if (u.type <= UT.FACTORY) this.structAt.set(u.tile, u);
    else if (u.type === UT.TRANSPORT) u.owner.boats++;
    else if (u.type === UT.TRADE) this.tradeCount++;
    else if (u.type >= UT.ATOM) this.nukes.push(u);
    return u;
  };
  Game.prototype.removeUnit = function (u) {
    if (!u.active) return;
    u.active = false;
    const o = u.owner, i = o.units.indexOf(u);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[u.type] -= u.level;
    if (u.type <= UT.FACTORY) {
      this.structAt.delete(u.tile);
      if (u.built) {
        if (u.type === UT.CITY) o.cityLv -= u.level;
        else if (u.type === UT.DEFENSE) { this.refreshPosts(o); this.dirtyDisc(u.tile); }
        else if (u.type === UT.PORT) this.portList = null;
        if (G.isStation(u.type)) this.railDirty = true;
      }
    } else if (u.type === UT.TRANSPORT) o.boats--;
    else if (u.type === UT.TRADE) this.tradeCount--;
  };
  Game.prototype.captureUnit = function (u, np) {
    const o = u.owner;
    if (o === np) return;
    if (!u.built) { this.removeUnit(u); return; }
    const i = o.units.indexOf(u);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[u.type] -= u.level; np.cnt[u.type] += u.level;
    u.owner = np; np.units.push(u);
    if (u.type === UT.CITY) { o.cityLv -= u.level; np.cityLv += u.level; }
    else if (u.type === UT.DEFENSE) { this.refreshPosts(o); this.refreshPosts(np); this.dirtyDisc(u.tile); }
    else if (u.type === UT.PORT) this.portList = null;
    if (o === this.human) this.say(G.UNAME[u.type] + ' an ' + np.name + ' verloren', 'bad');
    else if (np === this.human) this.say(G.UNAME[u.type] + ' von ' + o.name + ' erobert', 'good');
  };
  Game.prototype.refreshPosts = function (p) {
    p.dposts = p.units.filter(function (u) { return u.type === UT.DEFENSE && u.built; });
  };
  Game.prototype.dirtyDisc = function (tile) {
    const W = this.W, H = this.H, r = this.R.defense, cx = tile % W, cy = (tile / W) | 0;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        if (this.owner[y * W + x]) this.markDirty(y * W + x);
      }
    }
  };
  Game.prototype.finishBuild = function (u) {
    u.built = true;
    const p = u.owner;
    if (u.type === UT.CITY) p.cityLv += u.level;
    else if (u.type === UT.DEFENSE) { this.refreshPosts(p); this.dirtyDisc(u.tile); }
    else if (u.type === UT.PORT) this.portList = null;
    else if (u.type === UT.FACTORY) u.nextTrain = this.ticks + 50;
    else u.ready = [0];
    if (G.isStation(u.type)) this.railDirty = true;
  };
  Game.prototype.structNear = function (t, d) {
    const W = this.W, x = t % W, y = (t / W) | 0, d2 = d * d;
    for (const u of this.structAt.values()) {
      const dx = u.x - x, dy = u.y - y;
      if (dx * dx + dy * dy < d2) return u;
    }
    return null;
  };
  Game.prototype.getPorts = function () {
    if (!this.portList) {
      this.portList = [];
      for (const u of this.structAt.values()) if (u.type === UT.PORT && u.built) this.portList.push(u);
    }
    return this.portList;
  };

  // ---------- where things may be built ----------
  Game.prototype.portWater = function (t) {
    const map = this.map, W = this.W, H = this.H, x = t % W, y = (t - x) / W;
    let best = -1, bs = 149;
    for (let k = 0; k < 4; k++) {
      let n;
      if (k === 0) { if (x === 0) continue; n = t - 1; }
      else if (k === 1) { if (x === W - 1) continue; n = t + 1; }
      else if (k === 2) { if (y === 0) continue; n = t - W; }
      else { if (y === H - 1) continue; n = t + W; }
      if (map.land[n]) continue;
      const s = map.wsize[map.wcomp[n]];
      if (s > bs) { bs = s; best = n; }
    }
    return best;
  };
  Game.prototype.portSite = function (p, tile) {
    const own = this.owner, map = this.map, W = this.W, H = this.H, id = p.id;
    if (own[tile] !== id) return -1;
    const st = this.stamp, sid = ++this.sid, q = this.q, lim = this.R.portSearch;
    const tx = tile % W, ty = (tile / W) | 0;
    let qh = 0, qt = 0;
    q[qt++] = tile; st[tile] = sid;
    while (qh < qt) {
      const t = q[qh++];
      if (map.shore[t] === 1 && this.portWater(t) >= 0 && !this.structNear(t, this.R.structDist)) return t;
      const x = t % W, y = (t - x) / W;
      for (let k = 0; k < 4; k++) {
        let n;
        if (k === 0) { if (x === 0) continue; n = t - 1; }
        else if (k === 1) { if (x === W - 1) continue; n = t + 1; }
        else if (k === 2) { if (y === 0) continue; n = t - W; }
        else { if (y === H - 1) continue; n = t + W; }
        if (own[n] !== id || st[n] === sid) continue;
        if (Math.abs(n % W - tx) + Math.abs(((n / W) | 0) - ty) > lim) continue;
        st[n] = sid; q[qt++] = n;
      }
    }
    return -1;
  };
  Game.prototype.waterNear = function (tile, rad) {
    const map = this.map, W = this.W, H = this.H, cx = tile % W, cy = (tile / W) | 0;
    for (let r = 0; r <= rad; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const t = y * W + x;
        if (!map.land[t] && map.wsize[map.wcomp[t]] >= 150) return t;
      }
    }
    return -1;
  };
  Game.prototype.readySilo = function (p, tile) {
    const W = this.W, tx = tile % W, ty = (tile / W) | 0, T = this.ticks;
    let best = null, bd = Infinity, any = false;
    for (const u of p.units) {
      if (u.type !== UT.SILO || !u.built) continue;
      any = true;
      let free = false;
      for (let i = 0; i < u.ready.length; i++) if (u.ready[i] <= T) free = true;
      if (!free) continue;
      const d = (u.x - tx) * (u.x - tx) + (u.y - ty) * (u.y - ty);
      if (d < bd) { bd = d; best = u; }
    }
    return { silo: best, any: any };
  };

  Game.prototype.buildCheck = function (p, type, tile) {
    const res = { ok: false, why: '', cost: this.cost(p, type), tile: tile, port: null, silo: null };
    const map = this.map, W = this.W;
    if (!p.alive || this.phase !== 'play') { res.why = 'Nicht möglich'; return res; }
    if (type <= UT.FACTORY) {
      if (this.owner[tile] !== p.id) { res.why = 'Nur auf eigenem Gebiet'; return res; }
      if (type === UT.PORT) {
        const t = this.portSite(p, tile);
        if (t < 0) { res.why = 'Keine freie Küste in der Nähe'; return res; }
        res.tile = t;
      } else if (this.structNear(tile, this.R.structDist)) { res.why = 'Zu nah an einem anderen Gebäude'; return res; }
    } else if (type === UT.WARSHIP) {
      const w = map.land[tile] ? this.waterNear(tile, 8) : (map.wsize[map.wcomp[tile]] >= 150 ? tile : -1);
      let best = null, bd = Infinity, any = false;
      for (const u of p.units) {
        if (u.type !== UT.PORT || !u.built) continue;
        any = true;
        if (w < 0 || map.wcomp[u.water] !== map.wcomp[w]) continue;
        const d = (u.x - w % W) * (u.x - w % W) + (u.y - ((w / W) | 0)) * (u.y - ((w / W) | 0));
        if (d < bd) { bd = d; best = u; }
      }
      if (!any) { res.why = 'Dafür brauchst du einen Hafen'; return res; }
      if (w < 0) { res.why = 'Tippe dafür auf Wasser'; return res; }
      if (!best) { res.why = 'Kein eigener Hafen an diesem Gewässer'; return res; }
      res.port = best; res.tile = w;
    } else if (type === UT.LASER) {
      // Arsenal mode only: fired from orbit, so it needs no silo, but the satellite has to recharge
      if (!this.opts.arsenal) { res.why = 'Nur im Arsenal-Modus'; return res; }
      if (this.ticks < this.immuneUntil) { res.why = 'Schonfrist läuft noch'; return res; }
      const wait = (p.laserAt || 0) - this.ticks;
      if (wait > 0) { res.why = 'Satellit lädt noch ' + Math.ceil(wait / 10) + ' s'; return res; }
      if (!map.land[tile]) { res.why = 'Ziel muss Land sein'; return res; }
    } else {
      const s = this.readySilo(p, tile);
      if (!s.silo) { res.why = s.any ? 'Silo lädt noch nach' : 'Dafür brauchst du ein Raketensilo'; return res; }
      if (this.ticks < this.immuneUntil) { res.why = 'Schonfrist läuft noch'; return res; }
      if (type === UT.MIRV) {
        const o = this.owner[tile];
        if (!o || o === p.id) { res.why = 'Ziel muss fremdes Gebiet sein'; return res; }
      }
      res.silo = s.silo;
    }
    if (p.gold < res.cost) { res.why = 'Zu wenig Gold'; return res; }
    res.ok = true;
    return res;
  };

  Game.prototype.build = function (p, type, tile) {
    const c = this.buildCheck(p, type, tile);
    if (!c.ok) return null;
    p.gold -= c.cost;
    let u;
    if (type <= UT.FACTORY) {
      u = this.newUnit(type, p, c.tile);
      u.built = false; u.buildStart = this.ticks;
      u.buildEnd = this.ticks + (this.opts.instantBuild ? 0 : BUILD_TICKS[type]);
      if (type === UT.PORT) u.water = this.portWater(c.tile);
      this.addUnit(u);
      if (this.opts.instantBuild) this.finishBuild(u);
    } else if (type === UT.WARSHIP) {
      u = this.newUnit(type, p, c.port.water);
      u.hp = 1000; u.patrol = c.tile; u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false;
      this.addUnit(u);
      this.sail(u, c.tile, p.type === PT.HUMAN);
    } else if (type === UT.LASER) {
      u = this.fireLaser(p, c.tile);
    } else {
      u = this.launch(p, type, c.silo, c.tile);
    }
    return u;
  };

  Game.prototype.canUpgrade = function (p, u) {
    return !!u && u.active && u.owner === p && u.built && u.type <= UT.FACTORY && u.level < G.maxLevel(u.type);
  };
  Game.prototype.upgrade = function (p, u) {
    if (!this.canUpgrade(p, u)) return false;
    const cost = this.cost(p, u.type);
    if (p.gold < cost) return false;
    p.gold -= cost; u.level++; p.cnt[u.type]++;
    if (u.type === UT.CITY) p.cityLv++;
    else if (u.type === UT.DEFENSE) this.dirtyDisc(u.tile);
    else if (u.ready) u.ready.push(0);
    return true;
  };

  // How many of `want` levels the player can pay for right now, and what they cost together.
  Game.prototype.upgradePlan = function (p, u, want) {
    const res = { n: 0, cost: 0 };
    if (!this.canUpgrade(p, u)) return res;
    const room = G.maxLevel(u.type) - u.level;
    for (let i = 0; i < want && i < room; i++) {
      const c = this.cost(p, u.type, p.cnt[u.type] + i);
      if (p.gold < res.cost + c) break;
      res.cost += c; res.n++;
    }
    return res;
  };
  // Several levels in one go; stops when the gold runs out. Returns how many were bought.
  Game.prototype.upgradeBy = function (p, u, want) {
    let n = 0;
    while (n < want && this.upgrade(p, u)) n++;
    return n;
  };

  // ---------- boats ----------
  Game.prototype.coastComps = function (p) {
    if (p.cc && p.ccAt === p.lastChange) return p.cc;
    const map = this.map, W = this.W, H = this.H, set = new Set();
    for (const t of p.border) {
      if (map.shore[t] !== 1) continue;
      const x = t % W, y = (t - x) / W;
      if (x > 0 && !map.land[t - 1]) set.add(map.wcomp[t - 1]);
      if (x < W - 1 && !map.land[t + 1]) set.add(map.wcomp[t + 1]);
      if (y > 0 && !map.land[t - W]) set.add(map.wcomp[t - W]);
      if (y < H - 1 && !map.land[t + W]) set.add(map.wcomp[t + W]);
    }
    p.cc = set; p.ccAt = p.lastChange;
    return set;
  };
  // Find where a boat would land near the tile and where it would set out from.
  Game.prototype.boatPlan = function (p, tile) {
    const map = this.map, land = map.land, shore = map.shore, wc = map.wcomp, own = this.owner, W = this.W, H = this.H;
    if (!land[tile]) return null;
    const tid = own[tile];
    if (tid === p.id) return null;
    if (tid && this.friendly(p, this.players[tid])) return null;
    const comps = this.coastComps(p);
    if (!comps.size) return null;
    const st = this.stamp, sid = ++this.sid, q = this.q;
    let qh = 0, qt = 0, dst = -1, dstWater = -1;
    q[qt++] = tile; st[tile] = sid;
    while (qh < qt && qh < 6000) {
      const t = q[qh++], x = t % W, y = (t - x) / W;
      for (let k = 0; k < 4; k++) {
        let n;
        if (k === 0) { if (x === 0) continue; n = t - 1; }
        else if (k === 1) { if (x === W - 1) continue; n = t + 1; }
        else if (k === 2) { if (y === 0) continue; n = t - W; }
        else { if (y === H - 1) continue; n = t + W; }
        if (!land[n]) { if (shore[t] === 1 && comps.has(wc[n])) { dst = t; dstWater = n; break; } }
        else if (own[n] === tid && st[n] !== sid) { st[n] = sid; q[qt++] = n; }
      }
      if (dst >= 0) break;
    }
    if (dst < 0) return null;
    const comp = wc[dstWater], dx0 = dst % W, dy0 = (dst / W) | 0;
    let src = -1, srcWater = -1, bd = Infinity;
    for (const b of p.border) {
      if (shore[b] !== 1) continue;
      const x = b % W, y = (b - x) / W, d = (x - dx0) * (x - dx0) + (y - dy0) * (y - dy0);
      if (d >= bd) continue;
      let w = -1;
      if (x > 0 && !land[b - 1] && wc[b - 1] === comp) w = b - 1;
      else if (x < W - 1 && !land[b + 1] && wc[b + 1] === comp) w = b + 1;
      else if (y > 0 && !land[b - W] && wc[b - W] === comp) w = b - W;
      else if (y < H - 1 && !land[b + W] && wc[b + W] === comp) w = b + W;
      if (w < 0) continue;
      bd = d; src = b; srcWater = w;
    }
    if (src < 0) return null;
    return { src: src, srcWater: srcWater, dst: dst, dstWater: dstWater, tid: tid };
  };
  Game.prototype.sendBoat = function (p, plan, troops) {
    if (!p.alive || p.boats >= 3 || this.phase !== 'play') return null;
    if (plan.tid && this.ticks < this.immuneUntil) return null;
    troops = Math.min(troops, p.troops);
    if (troops < 1) return null;
    p.troops -= troops;
    const u = this.newUnit(UT.TRANSPORT, p, plan.srcWater);
    u.troops = troops; u.path = null; u.pi = 0; u.dst = plan.dst; u.tid = plan.tid; u.retreat = false;
    this.addUnit(u);
    this.requestPath(plan.srcWater, plan.dstWater, (path) => {
      if (!u.active) return;
      if (path) { u.path = path; u.pi = 0; return; }
      if (p.alive) p.troops += u.troops;
      this.removeUnit(u);
    }, p.type === PT.HUMAN);
    const q = plan.tid ? this.players[plan.tid] : null;
    if (q) {
      this.relate(q, p, -40);
      if (q === this.human) this.say('Ein Boot von ' + p.name + ' hält auf deine Küste zu', 'bad');
    }
    return u;
  };
  Game.prototype.landBoat = function (u) {
    const p = u.owner, o = this.owner[u.dst];
    if (!p.alive) return;
    if (o === p.id) { p.troops += u.troops; return; }
    const q = o ? this.players[o] : null;
    if (q && this.friendly(p, q)) {
      p.troops += u.troops;
      if (p === this.human) this.say('Boot kehrt heim: ' + q.name + ' ist verbündet', 'info');
      return;
    }
    this.conquer(p, u.dst);
    p.troops += u.troops;
    this.attack(p, o, u.troops, u.dst);
  };
  Game.prototype.tickTransport = function (u) {
    const p = u.owner;
    if (!u.path) {
      if (u.retreat) { p.troops += u.troops; this.removeUnit(u); }
      return;
    }
    if (u.retreat) {
      if (u.pi > 0) { u.pi--; this.setPos(u, u.path[u.pi]); }
      else { p.troops += u.troops; this.removeUnit(u); }
      return;
    }
    if (u.pi < u.path.length - 1) { u.pi++; this.setPos(u, u.path[u.pi]); return; }
    this.removeUnit(u);
    this.landBoat(u);
  };

  // ---------- trade ----------
  G.TRADE_MAX = 300;   // merchant ships at sea at the same time
  Game.prototype.spawnTrade = function (u, dst, path) {
    if (!u.active || !dst.active || !u.owner.alive || !dst.owner.alive || u.owner === dst.owner) return;
    if (!this.canTrade(u.owner, dst.owner) || this.tradeCount >= G.TRADE_MAX) return;
    const ship = this.newUnit(UT.TRADE, u.owner, u.water);
    ship.path = path; ship.pi = 0; ship.dstPort = dst; ship.captured = false;
    // OpenFront's payout: short hops pay little, from about 300 tiles on a ship is worth its while
    const dist = (Math.abs(u.x - dst.x) + Math.abs(u.y - dst.y)) / this.S;
    ship.gold = Math.floor(75000 / (1 + Math.exp(-0.03 * (dist - 300))) + 50 * dist);
    this.addUnit(ship);
  };
  Game.prototype.tickPort = function (u) {
    if ((this.ticks + u.id) % 10 !== 0) return;
    if (this.tradeCount >= G.TRADE_MAX) return;
    const ports = this.getPorts(), rng = this.rng;
    // a port sends a ship about every `rate` seconds per level: twice as often as before, so the seas are busy
    const rate = Math.min(25, Math.round(5 * Math.pow(ports.length, 0.6)));
    let go = false;
    for (let i = 0; i < u.level && !go; i++) go = rng.chance(rate);
    if (!go) return;
    const p = u.owner, wc = this.map.wcomp, comp = wc[u.water], cand = [];
    for (const v of ports) {
      if (v.owner === p || !v.owner.alive || !this.canTrade(p, v.owner) || wc[v.water] !== comp) continue;
      cand.push(v);
    }
    if (!cand.length) return;
    cand.sort(function (a, b) {
      return (Math.abs(a.x - u.x) + Math.abs(a.y - u.y)) - (Math.abs(b.x - u.x) + Math.abs(b.y - u.y));
    });
    const pool = [];
    for (let i = 0; i < cand.length; i++) {
      pool.push(cand[i]);
      if (i < cand.length / 2) pool.push(cand[i]);
      if (p.allies.has(cand[i].owner.id)) pool.push(cand[i]);
    }
    const dst = rng.pick(pool), key = u.water * this.N + dst.water, cached = this.pathCache.get(key);
    if (cached) { this.spawnTrade(u, dst, cached); return; }
    if (cached === null || this.pathQ.length > 6) return;     // route still being worked out, or queue busy
    if (this.pathCache.size > 500) this.pathCache.clear();
    this.pathCache.set(key, null);
    this.requestPath(u.water, dst.water, (path) => {
      if (!path) { this.pathCache.delete(key); return; }
      this.pathCache.set(key, path);
      this.spawnTrade(u, dst, path);
    }, false);
  };
  Game.prototype.tickTrade = function (u) {
    const d = u.dstPort, p = u.owner;
    if (!d.active || !d.owner.alive || (!u.captured && !this.canTrade(p, d.owner))) { this.removeUnit(u); return; }
    if (!u.path) return;
    if (u.pi < u.path.length - 1) { u.pi++; this.setPos(u, u.path[u.pi]); return; }
    const q = d.owner, h = this.human;
    p.gold += u.gold;
    this.fx.push({ k: 'coin', x: d.x, y: d.y, t: this.ticks, mine: p === h || (q === h && !u.captured), amt: u.gold });
    if (this.fx.length > 300) this.fx.splice(0, 150);
    if (u.captured) {
      if (p === h) this.say('Gekapertes Handelsschiff bringt ' + fmt(u.gold) + ' Gold', 'good');
    } else if (q !== p) {
      q.gold += u.gold;
      if (h && (p === h || q === h)) h.tradeGold += u.gold;
    }
    this.removeUnit(u);
  };
  Game.prototype.captureTrade = function (w, ts) {
    const np = w.owner, o = ts.owner, h = this.human, wc = this.map.wcomp;
    const i = o.units.indexOf(ts);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[UT.TRADE]--; np.cnt[UT.TRADE]++;
    ts.owner = np; np.units.push(ts); ts.captured = true;
    let best = null, bd = Infinity;
    for (const v of np.units) {
      if (v.type !== UT.PORT || !v.built || wc[v.water] !== wc[ts.tile]) continue;
      const d = (v.x - ts.x) * (v.x - ts.x) + (v.y - ts.y) * (v.y - ts.y);
      if (d < bd) { bd = d; best = v; }
    }
    this.fx.push({ k: 'flag', x: ts.x, y: ts.y });
    if (np === h) this.say('Handelsschiff von ' + o.name + ' gekapert (' + fmt(ts.gold) + ' Gold an Bord)', 'good');
    else if (o === h) this.say(np.name + ' hat ein Handelsschiff von dir gekapert', 'warn');
    if (!best) { np.gold += ts.gold; this.removeUnit(ts); return; }
    ts.dstPort = best; ts.path = null; ts.pi = 0;
    this.requestPath(ts.tile, best.water, (path) => {
      if (!ts.active) return;
      if (path) { ts.path = path; ts.pi = 0; return; }
      if (np.alive) np.gold += ts.gold;
      this.removeUnit(ts);
    }, false);
  };

  // Give a warship a new course; it holds position until the route is known.
  Game.prototype.sail = function (u, tile, urgent) {
    if (u.wait) return;
    u.wait = true; u.path = null;
    this.requestPath(u.tile, tile, (path) => {
      u.wait = false;
      if (u.active && path) { u.path = path; u.pi = 0; }
    }, urgent);
  };

  // ---------- warships ----------
  Game.prototype.tickWarship = function (u) {
    const T = this.ticks, R = this.R, p = u.owner, W = this.W, map = this.map;
    // Repairs, as in OpenFront: a damaged ship mends slowly while a home port is within reach,
    // heads for the nearest one once it is below three quarters of its strength, and is patched up
    // fast when it lies at the quay (the faster, the higher the port's level).
    let dock = u.repair;
    if (dock && (!dock.active || dock.owner !== p || u.hp >= 1000)) dock = u.repair = null;
    if (u.hp < 1000) {
      if ((T + u.id) % 20 === 0) {
        let best = null, bd = Infinity;
        for (const v of p.units) {
          if (v.type !== UT.PORT || !v.built || map.wcomp[v.water] !== map.wcomp[u.tile]) continue;
          const d = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y);
          if (d < bd) { bd = d; best = v; }
        }
        u.home = best;
        if (!dock && best && u.hp < 750) {
          dock = u.repair = best;
          if (p === this.human) this.say('Kriegsschiff läuft zur Reparatur den Hafen an', 'warn');
        }
      }
      const hm = u.home && u.home.active && u.home.owner === p ? u.home : null;
      if (hm) {
        const d2 = (hm.x - u.x) * (hm.x - u.x) + (hm.y - u.y) * (hm.y - u.y), heal = 150 * this.S, quay = Math.max(4, 5 * this.S);
        if (d2 <= quay * quay) u.hp = Math.min(1000, u.hp + 1 + 5 * hm.level);
        else if (d2 <= heal * heal) u.hp = Math.min(1000, u.hp + 1);
      }
    }
    if ((T + u.id) % 5 === 0) {
      let best = null, bs = Infinity;
      const r2 = R.warTarget * R.warTarget;
      for (const v of this.units) {
        if (!v.active || v.owner === p) continue;
        const ty = v.type;
        if (ty !== UT.TRANSPORT && ty !== UT.WARSHIP && ty !== UT.TRADE) continue;
        if (v.safeUntil > T) continue;   // just changed hands: left alone for a moment
        if (this.friendly(v.owner, p)) continue;
        if (ty === UT.TRADE && (v.captured || this.friendly(v.dstPort.owner, p))) continue;
        const dx = v.x - u.x, dy = v.y - u.y, d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const s = d2 + (ty === UT.TRANSPORT ? 0 : ty === UT.WARSHIP ? 1e7 : 2e7);
        if (s < bs) { bs = s; best = v; }
      }
      u.target = best;
    }
    let tg = u.target;
    if (tg && !tg.active) tg = u.target = null;
    if (tg) {
      if (tg.type === UT.TRADE) {
        const dx = tg.x - u.x, dy = tg.y - u.y;
        if (dx * dx + dy * dy <= 49) { this.captureTrade(u, tg); tg = u.target = null; }
        else if ((T + u.id) % 10 === 0 && this.pathQ.length < 6) this.sail(u, tg.tile, false);
      } else if (T >= u.shotAt) {
        u.shotAt = T + 20;
        const s = this.newUnit(UT.SHELL, p, u.tile);
        s.target = tg;
        this.addUnit(s);
      }
    }
    if (u.path && u.pi < u.path.length - 1) { u.pi++; this.setPos(u, u.path[u.pi]); return; }
    if (dock) {
      // on the way to the quay, or lying there until the hull is whole again
      const d2 = (dock.x - u.x) * (dock.x - u.x) + (dock.y - u.y) * (dock.y - u.y);
      if (d2 > 16 && !u.wait && (T + u.id) % 15 === 0 && this.pathQ.length <= 6) this.sail(u, dock.water, false);
      return;
    }
    if (u.wait || (tg && tg.type === UT.TRADE) || (T + u.id) % 15 !== 0 || this.pathQ.length > 6) return;
    const cx = u.patrol % W, cy = (u.patrol / W) | 0, comp = map.wcomp[u.tile], pr = R.warPatrol;
    for (let i = 0; i < 8; i++) {
      const x = cx + this.rng.int(-pr, pr + 1), y = cy + this.rng.int(-pr, pr + 1);
      if (x < 0 || y < 0 || x >= W || y >= this.H) continue;
      const t = y * W + x;
      if (map.land[t] || map.wcomp[t] !== comp) continue;
      this.sail(u, t, false);
      break;
    }
  };
  Game.prototype.moveWarship = function (p, tile) {
    const map = this.map, W = this.W;
    const w = map.land[tile] ? this.waterNear(tile, 8) : tile;
    if (w < 0) return false;
    let best = null, bd = Infinity;
    for (const u of p.units) {
      if (u.type !== UT.WARSHIP || map.wcomp[u.tile] !== map.wcomp[w]) continue;
      const d = (u.x - w % W) * (u.x - w % W) + (u.y - ((w / W) | 0)) * (u.y - ((w / W) | 0));
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) return false;
    best.patrol = w; best.wait = false; best.repair = null;
    this.sail(best, w, true);
    return true;
  };
  Game.prototype.tickShell = function (u) {
    const tg = u.target;
    if (!tg || !tg.active) { this.removeUnit(u); return; }
    const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy), sp = 4;
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    this.removeUnit(u);
    const by = u.owner, h = this.human, was = tg.owner;
    if (was === by || this.friendly(was, by)) return;
    this.fx.push({ k: 'pop', x: tg.x, y: tg.y });
    if (tg.type === UT.WARSHIP) {
      tg.hp -= 250;
      if (tg.hp > 0) return;
      if (!by.alive || by.cnt[UT.WARSHIP] >= 8) { this.removeUnit(tg); return; }   // a full fleet sinks it instead
      // a beaten warship strikes its colours and sails on for the victor
      const i = was.units.indexOf(tg);
      if (i >= 0) was.units.splice(i, 1);
      was.cnt[UT.WARSHIP]--; by.cnt[UT.WARSHIP]++;
      tg.owner = by; by.units.push(tg);
      tg.hp = 400; tg.target = null; tg.repair = null; tg.home = null; tg.patrol = tg.tile; tg.shotAt = this.ticks + 30; tg.safeUntil = this.ticks + 150;
      this.fx.push({ k: 'flag', x: tg.x, y: tg.y });
      if (was === h) this.say(by.name + ' hat dein Kriegsschiff eingenommen', 'bad');
      else if (by === h) this.say('Kriegsschiff von ' + was.name + ' eingenommen', 'good');
      return;
    }
    // a troop boat is boarded: half of the troops on it change sides
    const got = by.alive ? tg.troops * 0.5 : 0;
    by.troops += got;
    this.removeUnit(tg);
    this.fx.push({ k: 'flag', x: tg.x, y: tg.y });
    if (was === h) this.say('Dein Boot wurde von ' + by.name + ' eingenommen', 'bad');
    else if (by === h) this.say('Boot von ' + was.name + ' eingenommen, ' + G.fmtTroops(got) + ' Truppen übernommen', 'good');
  };

  // ---------- missiles ----------
  Game.prototype.tilesInDisc = function (cx, cy, r) {
    const W = this.W, H = this.H, own = this.owner, hit = new Map(), r2 = r * r;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) > r2) continue;
        const o = own[y * W + x];
        if (o) hit.set(o, (hit.get(o) || 0) + 1);
      }
    }
    return hit;
  };
  Game.prototype.launch = function (p, type, silo, tile) {
    const T = this.ticks, W = this.W;
    for (let i = 0; i < silo.ready.length; i++) if (silo.ready[i] <= T) { silo.ready[i] = T + 90; break; }
    const u = this.newUnit(type, p, silo.tile);
    u.dst = tile; u.sx = u.x; u.sy = u.y; u.dx = tile % W; u.dy = (tile / W) | 0;
    u.dist = Math.max(1, Math.hypot(u.dx - u.sx, u.dy - u.sy));
    u.prog = 0; u.speed = this.R.nukeSpeed * (type === UT.CRUISE ? 1.6 : 1); u.tid = this.owner[tile]; u.sam = false; u.delay = 0;
    this.addUnit(u);
    this.fx.push({ k: 'launch', x: u.x, y: u.y, mine: p === this.human });
    const h = this.human;
    if (type === UT.MIRV) {
      this.mirvs = (this.mirvs || 0) + 1;
      const q = this.players[u.tid];
      if (q) {
        if (p.allies.has(q.id)) this.breakAlliance(p, q);
        this.relate(q, p, -100);
        if (q === h) this.say('MIRV von ' + p.name + ' im Anflug!', 'bad');
      }
      return u;
    }
    const hit = this.tilesInDisc(u.dx, u.dy, type === UT.HYDRO ? this.R.hydroOut : type === UT.CRUISE ? this.R.cruiseOut : this.R.atomOut);
    for (const e of hit) {
      const q = this.players[e[0]];
      if (q === p) continue;
      if (p.allies.has(q.id) && e[1] > 20) this.breakAlliance(p, q);
      this.relate(q, p, -100);
      if (q === h) this.say(G.UNAME[type] + ' von ' + p.name + ' im Anflug!', 'bad');
    }
    return u;
  };
  // The satellite beam of the Arsenal mode: it gathers over the target for three seconds, then strikes.
  // Nothing can intercept it. It burns a small hole and leaves no fallout.
  Game.prototype.fireLaser = function (p, tile) {
    p.laserAt = this.ticks + G.LASER_COOL;
    const u = this.newUnit(UT.LASER, p, tile);
    u.dst = tile; u.sx = u.x; u.sy = u.y; u.dx = u.x; u.dy = u.y; u.dist = 1; u.prog = 0; u.speed = 1;
    u.tid = this.owner[tile]; u.sam = false; u.delay = 0; u.fuse = 30;
    this.addUnit(u);
    this.fx.push({ k: 'launch', x: u.x, y: u.y, mine: p === this.human });
    const h = this.human, hit = this.tilesInDisc(u.dx, u.dy, this.R.laserOut);
    for (const e of hit) {
      const q = this.players[e[0]];
      if (q === p) continue;
      if (p.allies.has(q.id) && e[1] > 20) this.breakAlliance(p, q);
      this.relate(q, p, -100);
      if (q === h) this.say('Satellitenstrahl von ' + p.name + ' zielt auf dein Gebiet!', 'bad');
    }
    return u;
  };
  Game.prototype.tickNuke = function (u) {
    if (u.type === UT.LASER) {
      if (--u.fuse > 0) return;
      this.removeUnit(u); this.detonate(u);
      return;
    }
    if (u.delay > 0) { u.delay--; return; }
    u.prog += u.speed / u.dist;
    if (u.prog < 1) {
      u.x = u.sx + (u.dx - u.sx) * u.prog; u.y = u.sy + (u.dy - u.sy) * u.prog;
      return;
    }
    u.x = u.dx; u.y = u.dy;
    this.removeUnit(u);
    if (u.type === UT.MIRV) this.splitMirv(u); else this.detonate(u);
  };
  Game.prototype.detonate = function (u) {
    const R = this.R, type = u.type;
    const rin = type === UT.HYDRO ? R.hydroIn : type === UT.ATOM ? R.atomIn : type === UT.CRUISE ? R.cruiseIn : type === UT.LASER ? R.laserIn : R.headIn;
    const rout = type === UT.HYDRO ? R.hydroOut : type === UT.ATOM ? R.atomOut : type === UT.CRUISE ? R.cruiseOut : type === UT.LASER ? R.laserOut : R.headOut;
    const clean = type === UT.CRUISE || type === UT.LASER;   // cruise missile and satellite beam leave no fallout behind
    const W = this.W, H = this.H, own = this.owner, land = this.map.land, rng = this.rng, ps = this.players;
    const cx = u.dx, cy = u.dy, in2 = rin * rin, out2 = rout * rout;
    const before = new Map();
    for (let y = Math.max(0, cy - rout); y <= Math.min(H - 1, cy + rout); y++) {
      for (let x = Math.max(0, cx - rout); x <= Math.min(W - 1, cx + rout); x++) {
        const d2 = (x - cx) * (x - cx) + (y - cy) * (y - cy);
        if (d2 > out2 || (d2 > in2 && rng.next() < 0.5)) continue;
        const t = y * W + x;
        if (!land[t]) continue;
        const o = own[t];
        if (o) {
          const q = ps[o];
          if (!before.has(o)) before.set(o, q.troops);
          q.troops = Math.max(0, q.troops - 5 * q.troops / Math.max(1, q.tiles));
          this.relinquish(t);
        }
        if (!clean && !this.fallout[t]) { this.fallout[t] = 1; this.falloutCount++; this.markDirty(t); }
      }
    }
    const h = this.human;
    for (const e of before) {
      const q = ps[e[0]], f = e[1] > 0 ? q.troops / e[1] : 0;
      for (const at of q.out) at.troops *= f;
      for (const v of q.units) if (v.type === UT.TRANSPORT) v.troops *= f;
      if (q !== u.owner) this.relate(q, u.owner, -100);
      if (q === h && type !== UT.WARHEAD) this.say(G.UNAME[type] + ' von ' + u.owner.name + ' hat dein Gebiet getroffen', 'bad');
    }
    for (const v of this.units) {
      if (!v.active || v.type >= UT.SHELL) continue;
      if ((v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy) <= out2) this.removeUnit(v);
    }
    this.fx.push({ k: 'boom', x: cx, y: cy, r: rout, big: type === UT.HYDRO, head: type === UT.WARHEAD, beam: type === UT.LASER });
    if (this.fx.length > 300) this.fx.splice(0, 150);
  };
  Game.prototype.splitMirv = function (u) {
    const tp = this.players[u.tid];
    this.fx.push({ k: 'pop', x: u.dx, y: u.dy });
    if (!tp || !tp.alive) return;
    const R = this.R, W = this.W, rng = this.rng, own = this.owner;
    const sp2 = Math.pow(R.headOut * 1.4, 2), range2 = R.mirvRange * R.mirvRange;
    const picks = [];
    let tries = R.mirvCount * 30;
    while (picks.length < R.mirvCount && tries-- > 0) {
      const x = rng.int(tp.x0, tp.x1 + 1), y = rng.int(tp.y0, tp.y1 + 1);
      if (own[y * W + x] !== tp.id) continue;
      if ((x - u.dx) * (x - u.dx) + (y - u.dy) * (y - u.dy) > range2) continue;
      let ok = true;
      for (let i = 0; i < picks.length; i++) {
        const dx = picks[i] % W - x, dy = ((picks[i] / W) | 0) - y;
        if (dx * dx + dy * dy < sp2) { ok = false; break; }
      }
      if (ok) picks.push(y * W + x);
    }
    for (let i = 0; i < picks.length; i++) {
      const t = picks[i], w = this.newUnit(UT.WARHEAD, u.owner, u.dst);
      w.dst = t; w.sx = u.dx; w.sy = u.dy; w.dx = t % W; w.dy = (t / W) | 0;
      w.dist = Math.max(1, Math.hypot(w.dx - w.sx, w.dy - w.sy));
      w.prog = 0; w.speed = R.nukeSpeed * 1.6; w.tid = tp.id; w.sam = false; w.delay = rng.int(0, 12);
      this.addUnit(w);
    }
    if (tp === this.human) this.say('MIRV von ' + u.owner.name + ' teilt sich über deinem Gebiet', 'bad');
  };
  // Reach of an air defence: 70 tiles at level 1, growing with every level towards 150 (scaled to the map).
  Game.prototype.samRange = function (u) {
    return Math.round((150 - 480 / (u.level + 5)) * this.S);
  };
  Game.prototype.tickSam = function (u) {
    const T = this.ticks, sr = this.samRange(u), r2 = sr * sr;
    for (let s = 0; s < u.ready.length; s++) {
      if (u.ready[s] > T) continue;
      for (const n of this.nukes) {
        if (!n.active || (n.type > UT.HYDRO && n.type !== UT.CRUISE) || n.sam || n.delay > 0) continue;
        if (n.owner === u.owner || this.friendly(n.owner, u.owner)) continue;
        if ((n.x - u.x) * (n.x - u.x) + (n.y - u.y) * (n.y - u.y) > r2) continue;
        n.sam = true; u.ready[s] = T + 90;
        const m = this.newUnit(UT.SAMM, u.owner, u.tile);
        m.target = n;
        this.addUnit(m);
        break;
      }
    }
  };
  Game.prototype.tickSamMissile = function (u) {
    const n = u.target;
    if (!n.active) { this.removeUnit(u); return; }
    const dx = n.x - u.x, dy = n.y - u.y, d = Math.hypot(dx, dy), sp = Math.max(5, 14 * this.S);
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    this.removeUnit(u);
    if (this.rng.next() < (n.type === UT.CRUISE ? 0.3 : 0.75)) {   // cruise missiles fly low and are hard to hit
      this.removeUnit(n);
      this.fx.push({ k: 'pop', x: n.x, y: n.y });
      const h = this.human;
      if (u.owner === h) this.say(G.UNAME[n.type] + ' von ' + n.owner.name + ' abgefangen', 'good');
      else if (n.owner === h) this.say('Deine ' + G.UNAME[n.type] + ' wurde abgefangen', 'warn');
    } else {
      n.sam = false;
    }
  };

  // Air defences that could reach a bomb on its way from the silo to the target (for the aiming preview).
  Game.prototype.samsOnPath = function (p, sx, sy, dx, dy) {
    const out = [];
    for (const u of this.structAt.values()) {
      if (u.type !== UT.SAM || !u.built || u.owner === p || this.friendly(u.owner, p)) continue;
      const sr = this.samRange(u), r2 = sr * sr;
      for (let i = 0; i <= 40; i++) {
        const x = sx + (dx - sx) * i / 40, y = sy + (dy - sy) * i / 40;
        if ((x - u.x) * (x - u.x) + (y - u.y) * (y - u.y) <= r2) { out.push(u); break; }
      }
    }
    return out;
  };

  Game.prototype.tickUnit = function (u) {
    const ty = u.type;
    if (ty <= UT.FACTORY) {
      if (!u.built) { if (this.ticks >= u.buildEnd) this.finishBuild(u); return; }
      if (ty === UT.PORT) this.tickPort(u);
      else if (ty === UT.SAM) this.tickSam(u);
      return;
    }
    u.px = u.x; u.py = u.y;
    if (ty === UT.TRADE) this.tickTrade(u);
    else if (ty === UT.TRANSPORT) this.tickTransport(u);
    else if (ty === UT.TRAIN) this.tickTrain(u);
    else if (ty === UT.WARSHIP) this.tickWarship(u);
    else if (ty === UT.SHELL) this.tickShell(u);
    else if (ty === UT.SAMM) this.tickSamMissile(u);
    else this.tickNuke(u);
  };
})(globalThis.G = globalThis.G || {});
