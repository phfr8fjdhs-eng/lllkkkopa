(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const Game = G.Game, UT = G.UT, PT = G.PT, fmt = G.fmt;
  const BUILD_TICKS = [20, 50, 50, 100, 300, 20, 60];   // city, defence post, port, silo, air defence, factory, cloaking tower
  G.BUILD_TICKS = BUILD_TICKS;
  G.WARSHIP_CAPTURE = false;
  // Classes of warship (23.11.2026; `u.cls`). range in OpenFront's tiles (x S), rate in ticks
  // between two shots, land: how many tiles of land in a row it sees across (islands, a thin
  // coast), capture: whether it takes merchants. Costs are the warship's times `cost`.
  //   destroyer   small and quick: small shells at short range in clear sight, takes merchants,
  //               fends off troop boats bound for you or an ally
  //   battleship  large and slow, more hull: missiles at long range, sees over islands and thin
  //               coasts, sinks other warships first, takes no merchants
  // upkeep: gold per tick while at sea (a ship laid up in a port costs nothing); patrol: share of
  // its speed on patrol; deep: how far from land (OpenFront's tiles) it patrols at the least.
  G.SHIP_CLASS = [
    { name: 'Zerstörer', hp: 1000, speed: 1, range: 70, dmg: 250, rate: 20, land: 0, capture: true, cost: 1, upkeep: 20, patrol: 1, deep: 7 },
    { name: 'Schlachtschiff', hp: 2500, speed: 0.6, range: 140, dmg: 450, rate: 35, land: 3, capture: false, cost: 2.5, upkeep: 60, patrol: 0.6, deep: 18 },
    // «Langes Spiel» only (Paket 6, src/04c_lang.js): the submarine is unseen until it fires or a
    // destroyer with sonar is near; it sinks warships and merchants. The carrier is a floating
    // airfield and has no guns of its own.
    { name: 'U-Boot', hp: 600, speed: 0.8, range: 60, dmg: 400, rate: 40, land: 0, capture: false, cost: 2, upkeep: 30, patrol: 0.8, deep: 7, sub: true },
    { name: 'Flugzeugträger', hp: 3000, speed: 0.5, range: 0, dmg: 0, rate: 999, land: 0, capture: false, cost: 5, upkeep: 100, patrol: 0.5, deep: 18, carrier: true },
    // the escort's two: the defence ship shoots down missiles and planes near the fleet, the radar
    // ship lifts the fog around it; neither has guns
    { name: 'Abwehrschiff', hp: 1500, speed: 0.7, range: 0, dmg: 0, rate: 999, land: 0, capture: false, cost: 2.5, upkeep: 50, patrol: 0.7, deep: 7, flak: true },
    { name: 'Radarschiff', hp: 1200, speed: 0.8, range: 0, dmg: 0, rate: 999, land: 0, capture: false, cost: 2, upkeep: 40, patrol: 0.8, deep: 7, radar: true }
  ];
  // A port's store of laid-up warships, by class (port.store); `fresh` asks for a new one anyway.
  Game.prototype.storeOf = function (p, cls, w) {
    const map = this.map, W = this.W;
    let best = null, bd = Infinity;
    for (const u of p.units) {
      if (u.type !== UT.PORT || !u.built || !u.store || !(u.store[cls] > 0) || (w >= 0 && map.wcomp[u.water] !== map.wcomp[w])) continue;
      const d = w >= 0 ? (u.x - w % W) * (u.x - w % W) + (u.y - ((w / W) | 0)) * (u.y - ((w / W) | 0)) : 0;
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  };
  Game.prototype.stored = function (p, cls) {
    let n = 0;
    for (const u of p.units) if (u.type === UT.PORT && u.store) n += u.store[cls] || 0;
    return n;
  };
  G.MAX_LEVEL = 100;
  G.SILO_RELOAD = 270;   // ticks a silo slot needs to reload after a launch (27 s, 3x OpenFront's 9 s)
  // Every building but the cloaking tower can be upgraded up to level 100.
  G.maxLevel = function (type) { return type === UT.CLOAK ? 1 : G.MAX_LEVEL; };   // the cloaking tower has no levels: its reach stays small

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
      case UT.SILO: return 3e6;   // 3x OpenFront (1M), deliberate
      case UT.SAM: return Math.min(3e6, (c + 1) * 1.5e6);
      case UT.CLOAK: return Math.min(500000, 150000 + c * 100000);   // Arsenal mode only, ours
      case UT.WARSHIP: return Math.min(1e6, (c + 1) * 250000);
      case UT.ATOM: return 750000 * (this.lang ? G.LANG.nukeCost[UT.ATOM] : 1);
      case UT.CRUISE: return this.lang ? Math.round(350000 * (1 + G.LANG.cruiseHeat * this.cruiseHeatOf(p))) : 350000;
      case UT.HYDRO: return 5e6 * (this.lang ? G.LANG.nukeCost[UT.HYDRO] : 1);
      case UT.MIRV: return (25e6 + 15e6 * (this.mirvs || 0)) * (this.lang ? G.LANG.nukeCost[UT.MIRV] : 1);   // every MIRV launched in this game makes the next one dearer
      case UT.LASER: return 600000;
      case UT.CLUSTER: case UT.BUNKER: case UT.THERMO: case UT.SRBM: return G.LANG.price[type];
      case UT.BOMBER: case UT.STEALTH: case UT.RECON: return G.LANG.planeCost[type];
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
    if (u.type <= UT.CLOAK) this.cloakOk = false;
    if (u.type <= UT.CLOAK) this.structAt.set(u.tile, u);
    else if (u.type === UT.TRANSPORT) u.owner.boats++;
    else if (u.type === UT.TRADE) this.tradeCount++;
    else if (u.type >= UT.ATOM && u.type !== UT.MINE) this.nukes.push(u);
    return u;
  };
  Game.prototype.removeUnit = function (u) {
    if (!u.active) return;
    u.active = false;
    const o = u.owner, i = o.units.indexOf(u);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[u.type] -= u.level;
    if (u.type <= UT.CLOAK) {
      this.structAt.delete(u.tile); this.cloakOk = false;
      if (u.type === UT.SAM && this.lang) this.samSig = (this.samSig | 0) + 1;
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
    this.cloakOk = false;
    if (!u.built) { this.removeUnit(u); return; }
    // A defence post falls with the ground it stands on: as in OpenFront it is torn down, not
    // taken over (every other building changes hands).
    if (u.type === UT.DEFENSE) {
      this.removeUnit(u);
      if (o === this.human) this.say(G.UNAME[u.type] + ' von ' + np.name + ' zerstört', 'bad');
      return;
    }
    const i = o.units.indexOf(u);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[u.type] -= u.level; np.cnt[u.type] += u.level;
    u.owner = np; np.units.push(u);
    if (u.uni) { delete u.uni; u.res = null; }   // «Langes Spiel»: a fallen city loses its university; what was learnt stays
    if (u.type === UT.SAM && this.lang) this.samSig = (this.samSig | 0) + 1;
    if (u.type === UT.CITY) { o.cityLv -= u.level; np.cityLv += u.level; }
    else if (u.type === UT.DEFENSE) { this.refreshPosts(o); this.refreshPosts(np); this.dirtyDisc(u.tile); }
    else if (u.type === UT.PORT) this.portList = null;
    // only losses are reported; what you take you see on the map (24.11.2026: «Stadt von … erobert»
    // at the bottom right after every city, said nothing new)
    if (o === this.human) this.say(G.UNAME[u.type] + ' an ' + np.name + ' verloren', 'bad');
  };
  // ---------- cloaking tower (Arsenal mode) ----------
  G.CLOAK_COVER = 3;   // buildings a cloaking tower hides besides itself
  // A finished cloaking tower hides itself and up to G.CLOAK_COVER of its owner's nearest buildings
  // within R.cloak from everyone but the owner and the owner's allies. A hidden building shows up for a player once
  // that player holds land within R.reveal of it. Derived from the state alone, so the same on
  // every device; bots and nations only aim at what they can see.
  Game.prototype.cloakScan = function () {
    if (this.cloakOk) return;   // reset whenever a building comes, goes, changes hands or is finished
    this.cloakOk = true;
    const r2 = this.R.cloak * this.R.cloak;
    for (const u of this.structAt.values()) u.cloak = false;
    for (const c of this.structAt.values()) {
      if (c.type !== UT.CLOAK || !c.built) continue;
      // itself and the G.CLOAK_COVER nearest of its owner's buildings in reach (ties: older first)
      c.cloak = true;
      const near = [];
      for (const u of c.owner.units) {
        if (u === c || !G.isStruct(u.type)) continue;
        const dx = u.x - c.x, dy = u.y - c.y, d2 = dx * dx + dy * dy;
        if (d2 <= r2) near.push({ u: u, d2: d2 });
      }
      near.sort(function (a, b) { return a.d2 - b.d2 || a.u.id - b.u.id; });
      for (let i = 0; i < near.length && i < G.CLOAK_COVER; i++) near[i].u.cloak = true;
    }
  };
  // Does player p hold land within r tiles of (cx, cy)?
  Game.prototype.holdsNear = function (p, cx, cy, r) {
    const W = this.W, H = this.H, own = this.owner, id = p.id, r2 = r * r;
    if (cx + r < p.x0 || cx - r > p.x1 || cy + r < p.y0 || cy - r > p.y1) return false;
    for (let y = Math.max(0, cy - r, p.y0); y <= Math.min(H - 1, cy + r, p.y1); y++) {
      const dy = (y - cy) * (y - cy);
      for (let x = Math.max(0, cx - r, p.x0); x <= Math.min(W - 1, cx + r, p.x1); x++) {
        if ((x - cx) * (x - cx) + dy <= r2 && own[y * W + x] === id) return true;
      }
    }
    return false;
  };
  // Is building u hidden from player p?
  Game.prototype.hiddenFrom = function (u, p) {
    if (!p || u.owner === p || !G.isStruct(u.type)) return false;
    this.cloakScan();
    if (!u.cloak || this.friendly(u.owner, p)) return false;
    return !this.holdsNear(p, u.x, u.y, this.R.reveal);
  };

  // How many levels of a kind of building player `viewer` can see at player q.
  Game.prototype.seenCount = function (viewer, q, type) {
    if (!viewer || this.friendly(q, viewer)) return q.cnt[type];
    let n = 0;
    for (const u of q.units) if (u.type === type && !this.hiddenFrom(u, viewer)) n += u.level;
    return n;
  };
  Game.prototype.refreshPosts = function (p) {
    p.dposts = p.units.filter(function (u) { return u.type === UT.DEFENSE && u.built; });
  };
  Game.prototype.dirtyDisc = function (tile) {
    const W = this.W, H = this.H, r = this.R.defense, cx = tile % W, cy = (tile / W) | 0;
    for (let y = Math.max(0, cy - r); y <= Math.min(H - 1, cy + r); y++) {
      for (let x = Math.max(0, cx - r); x <= Math.min(W - 1, cx + r); x++) {
        const k = y * W + x;
        if (this.owner[k] && !this.dirtyFlag[k]) { this.markDirty(k); this.dirtyFlag[k] = 3; }   // 3: only to paint (src/05b_sync.js)
      }
    }
  };
  Game.prototype.finishBuild = function (u) {
    this.cloakOk = false;
    u.built = true;
    const p = u.owner;
    if (u.type === UT.CITY) p.cityLv += u.level;
    else if (u.type === UT.DEFENSE) { this.refreshPosts(p); this.dirtyDisc(u.tile); }
    else if (u.type === UT.PORT) this.portList = null;
    else if (u.type === UT.FACTORY) u.nextTrain = this.ticks + 50;
    else u.ready = [0];
    if (u.type === UT.SAM && this.lang) { this.samSig = (this.samSig | 0) + 1; this.samSlots(u); }
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
  // Switch `bahn`: factories are hubs and stand well apart (G.BAHN.factoryGap times the usual room).
  Game.prototype.factoryNear = function (t) {
    const W = this.W, x = t % W, y = (t / W) | 0, d = this.R.structDist * G.BAHN.factoryGap, d2 = d * d;
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY) continue;
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
    const lim = this.R.portSearch, st = this.stamp, sid = this.nextSid(), q = this.qFor(2 * lim * (lim + 1) + 1);   // at most the diamond of radius lim
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
  // The silo to fire from: the nearest with a loaded slot. «Langes Spiel»: only within the weapon's
  // reach (type), and the one the player picked (pick, a unit id) if it can.
  Game.prototype.readySilo = function (p, tile, type, pick) {
    const W = this.W, tx = tile % W, ty = (tile / W) | 0, T = this.ticks;
    const reach = this.lang && type !== undefined ? this.weaponReach(type, p) : Infinity, r2 = reach * reach;
    let best = null, bd = Infinity, any = false, far = false;
    for (const u of p.units) {
      if (u.type === UT.WARSHIP ? !(this.lang && u.cls === 2 && u.ready && this.subCan(p, type)) : (u.type !== UT.SILO || !u.built || u.cls)) continue;   // an airfield (class 1) is no silo; «Langes Spiel»: a missile submarine is one
      any = true;
      let free = !u.arm;
      if (free) { free = false; for (let i = 0; i < u.ready.length; i++) if (u.ready[i] <= T) free = true; }
      if (!free) continue;
      const d = (u.x - tx) * (u.x - tx) + (u.y - ty) * (u.y - ty);
      if (d > r2) { far = true; continue; }
      if (pick && u.id === pick) { best = u; bd = -1; continue; }
      if (d < bd) { bd = d; best = u; }
    }
    return { silo: best, any: any, far: far && !best };
  };

  Game.prototype.buildCheck = function (p, type, tile, cls, fresh, pick) {
    const res = { ok: false, why: '', cost: this.cost(p, type), tile: tile, port: null, silo: null, stored: false };
    if (type === UT.WARSHIP && cls) res.cost = Math.round(res.cost * G.SHIP_CLASS[cls].cost);
    if (type === UT.WARSHIP && this.lang) res.cost = Math.round(res.cost * G.LANG.shipCost[cls || 0]);   // «Langes Spiel»: ships dearer
    if (type === UT.SILO && cls && this.lang) res.cost = p.type === PT.HUMAN && this.opts.infiniteGold ? 0 : G.LANG.fieldCost;
    if (type === UT.SAM && cls && this.lang) res.cost = cls === 2 ? (p.type === PT.HUMAN && this.opts.infiniteGold ? 0 : G.LANG.radarCost) : Math.round(res.cost * G.LANG.abmCost);
    const map = this.map, W = this.W;
    if (!p.alive || this.phase !== 'play') { res.why = 'Nicht möglich'; return res; }
    if (type <= UT.CLOAK) {
      if (type === UT.CLOAK && !this.opts.arsenal) { res.why = 'Nur im Arsenal-Modus'; return res; }
      // «Langes Spiel»: a base in an ally's land (src/04c_lang.js, baseHost)
      const host = this.owner[tile] !== p.id && this.lang ? this.baseHost(p, tile, type) : null;
      if (this.lang && p.type === PT.HUMAN && type === UT.SILO && cls && !this.has(p, 'luft1')) { res.why = 'Braucht Forschung: Flugplatz'; return res; }
      if (this.lang && p.type === PT.HUMAN && type === UT.SAM && this.techFor(UT.SAM, cls) && !this.has(p, this.techFor(UT.SAM, cls))) {   // air defences need none (28.11.2026), the radar does
 res.why = 'Braucht Forschung: ' + G.TECH_BY[this.techFor(UT.SAM, cls)].name; return res; }
      if (this.owner[tile] !== p.id && !host) { res.why = this.lang && this.owner[tile] && p.allies.has(this.owner[tile]) ? this.baseWhy(p, tile, type) : 'Nur auf eigenem Gebiet'; return res; }
      res.base = host;
      if (type === UT.PORT) {
        const t = this.portSite(host || p, tile);
        if (t < 0) { res.why = 'Keine freie Küste in der Nähe'; return res; }
        res.tile = t;
      } else if (this.structNear(tile, this.R.structDist)) { res.why = 'Zu nah an einem anderen Gebäude'; return res; }
      else if (type === UT.FACTORY && this.bahn && this.factoryNear(tile)) { res.why = 'Zu nah an einer anderen Fabrik'; return res; }
    } else if (type === UT.MINE) {
      res.why = this.lang ? this.mineWhy(p, tile, res) : 'Nicht möglich';
      if (!res.why) res.ok = p.gold >= res.cost || !!(res.why = 'Zu wenig Gold');
      return res;
    } else if (type === UT.WARSHIP) {
      if (cls >= 2 && (!this.lang || (p.type === PT.HUMAN && !this.has(p, G.SHIP_TECH[cls])))) { res.why = this.lang ? 'Braucht Forschung: ' + G.TECH_BY[G.SHIP_TECH[cls]].name : 'Nicht möglich'; return res; }
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
      // one laid up in a port on this water sails out first, for nothing (unless a new one is wanted)
      const st = fresh ? null : this.storeOf(p, cls || 0, w);
      if (st) { res.port = st; res.cost = 0; res.stored = true; }
    } else if (type === UT.LASER) {
      // Arsenal mode only: fired from orbit, so it needs no silo, but the satellite has to recharge
      if (!this.opts.arsenal) { res.why = 'Nur im Arsenal-Modus'; return res; }
      if (this.ticks < this.immuneUntil) { res.why = 'Schonfrist läuft noch'; return res; }
      const wait = (p.laserAt || 0) - this.ticks;
      if (wait > 0) { res.why = 'Satellit lädt noch ' + Math.ceil(wait / 10) + ' s'; return res; }
      if (!map.land[tile]) { res.why = 'Ziel muss Land sein'; return res; }
    } else {
      if (this.lang) { const why = this.weaponWhy(p, type); if (why) { res.why = why; return res; } }
      if (this.lang && G.isPlane(type)) { this.planeCheck(p, type, tile, pick, res); return res; }   // planes start from an airfield (src/04c_lang.js)
      const s = this.readySilo(p, tile, type, pick);
      if (!s.silo) { const sub = this.lang && this.subCan(p, type); res.why = s.far ? (sub ? 'Kein Silo oder U-Boot in Reichweite' : 'Kein Silo in Reichweite') : s.any ? (sub ? 'Silo oder U-Boot lädt noch nach' : 'Silo lädt noch nach') : 'Dafür brauchst du ein Raketensilo' + (sub ? ' oder ein U-Boot' : ''); return res; }
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

  Game.prototype.build = function (p, type, tile, cls, fresh, pick) {
    cls = (type === UT.WARSHIP && (cls === 1 || (this.lang && cls >= 2 && cls <= 5))) || (type === UT.SAM && this.lang && (cls === 1 || cls === 2)) || (type === UT.SILO && this.lang && cls === 1) || (type === UT.BOMBER && this.lang && cls === 1) ? cls : 0;
    const c = this.buildCheck(p, type, tile, cls, fresh, pick);
    if (!c.ok) return null;
    p.gold -= c.cost;
    let u;
    if (type <= UT.CLOAK) {
      u = this.newUnit(type, p, c.tile);
      u.built = false; u.buildStart = this.ticks;
      u.buildEnd = this.ticks + (this.opts.instantBuild ? 0 : Math.round(BUILD_TICKS[type] * (this.lang && type === UT.SAM && cls !== 2 && this.has(p, 'abw1') ? 0.5 : 1)));   // «Langes Spiel»: research Flugabwehr builds air defences in half the time
      if (type === UT.PORT) u.water = this.portWater(c.tile);
      if (type === UT.SAM && this.lang) u.cls = cls;   // «Langes Spiel»: 0 air defence, 1 missile defence, 2 radar
      if (type === UT.SILO && this.lang && cls) u.cls = cls;   // «Langes Spiel»: 1 airfield
      if (c.base) { u.base = c.base.id; if (p === this.human || c.base === this.human) this.say('Stützpunkt im Land von ' + c.base.name + ' wird gebaut', 'info'); }
      this.addUnit(u);
      if (this.opts.instantBuild) this.finishBuild(u);
    } else if (type === UT.WARSHIP) {
      u = this.newUnit(type, p, c.port.water);
      if (c.stored) c.port.store[cls]--;
      u.cls = cls; u.hp = G.SHIP_CLASS[cls].hp; u.patrol = this.deepNear(c.tile, cls); u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false;
      if (this.lang) this.langShip(u);   // Paket 6: heavier ships, the carrier's flight deck
      this.addUnit(u);
      this.sail(u, c.tile, p.type === PT.HUMAN, 'order');
      if (this.lang && cls === 3 && this.has(p, 'geleit')) this.escort(p, u, c);
    } else if (type === UT.LASER) {
      u = this.fireLaser(p, c.tile);
    } else if (type === UT.MINE) {
      u = this.newUnit(type, p, c.tile); this.addUnit(u);
    } else if (this.lang && G.isPlane(type)) {
      u = this.launchPlane(p, type, c.silo, c.tile, cls);
    } else if (this.lang && G.LANG.arm[type]) {
      u = this.armSilo(p, type, c.silo, c.tile);   // «Langes Spiel»: the silo arms it first, seen by all
    } else {
      u = this.launch(p, type, c.silo, c.tile);
    }
    return u;
  };

  Game.prototype.canUpgrade = function (p, u) {
    return !!u && u.active && u.owner === p && u.built && u.type <= UT.CLOAK && u.level < G.maxLevel(u.type);
  };
  Game.prototype.upgrade = function (p, u) {
    if (!this.canUpgrade(p, u)) return false;
    const cost = this.cost(p, u.type);
    if (p.gold < cost) return false;
    p.gold -= cost; u.level++; p.cnt[u.type]++;
    if (u.type === UT.CITY) p.cityLv++;
    else if (u.type === UT.DEFENSE) this.dirtyDisc(u.tile);
    else if (u.ready) { u.ready.push(0); if (u.type === UT.SAM && this.lang) this.samSlots(u); }
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
    const st = this.stamp, sid = this.nextSid(), q = this.qFor(4 * 6000 + 1);   // at most 6000 tiles looked at, 4 new ones each
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
      if (this.lang) this.declareWar(p, q);
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
      if (u.pi > 0) { for (let n = this.stride(u); n > 0 && u.pi > 0; n--) { u.pi--; this.setPos(u, u.path[u.pi]); } }
      else { p.troops += u.troops; this.removeUnit(u); }
      return;
    }
    if (u.pi < u.path.length - 1) { for (let n = this.stride(u); n > 0 && u.pi < u.path.length - 1; n--) { u.pi++; this.setPos(u, u.path[u.pi]); } return; }
    this.removeUnit(u);
    if (this.lang && this.has(p, 'marinf')) u.troops *= G.LANG.marines;   // «Langes Spiel»: research Marineinfanterie
    this.landBoat(u);
  };

  // ---------- trade ----------
  G.TRADE_MAX = 300;   // merchant ships at sea at the same time
  // Switch `hafen`: ports by level, three classes of merchant (23.11.2026; the payout for the way is
  // OpenFront's, see spawnTrade). Per class:
  //   range  how far it trades at most, in OpenFront's tiles (straight line), the same at any level:
  //          the container ship's 1400 is the most there is
  //   speed  share of the usual pace at sea
  //   gold   payout for the way times this
  //   hits   how many times a warship must hit it before it can be taken (one hit a second)
  //   from   the smallest port level that sends it
  // Which class sails is decided by the way (tickPort): the smallest class that reaches the port it
  // trades with, so short hops always go by freighter and only far ones by container ship.
  // A freighter is small, quick and earns little on its short hops; a bulk carrier goes further;
  // the container ship is the late game: slow, hard to take, far and rich.
  //   loot      share of the cargo a captured ship still carries
  //   trainShip every that many trains that reach a port it sends an extra ship with their goods
  // A port of level L sends ships sqrt(L) times as often as one of level 1.
  G.HAFEN = {
    ships: [
      { name: 'Frachter', range: 350, speed: 1, gold: 1, hits: 1, from: 1 },
      { name: 'Massengutfrachter', range: 700, speed: 0.8, gold: 1.6, hits: 5, from: 3 },
      { name: 'Containerschiff', range: 1400, speed: 0.6, gold: 2.5, hits: 12, from: 8 }
    ],
    loot: 0.5, trainShip: 2
  };
  Game.prototype.portRange = function (lv, kind) { return G.HAFEN.ships[kind || 0].range; };
  // The largest class a port of level lv can send: 0 freighter, 1 bulk carrier, 2 container ship.
  Game.prototype.shipTop = function (lv) {
    const S = G.HAFEN.ships;
    let k = 0;
    while (k + 1 < S.length && lv >= S[k + 1].from) k++;
    return k;
  };
  // The class for a way of d tiles (OpenFront's): the smallest that reaches, at most `top`.
  Game.prototype.shipFor = function (d, top) {
    const S = G.HAFEN.ships;
    let k = 0;
    while (k < top && d > S[k].range) k++;
    return k;
  };
  // Goods brought to a port by train (from 04b_rail.js): every G.HAFEN.trainShip trains it sends an
  // extra ship that carries their worth on top.
  Game.prototype.portCargo = function (st, pay) {
    st.load = (st.load || 0) + 1; st.cargo = (st.cargo || 0) + pay;
  };
  Game.prototype.spawnTrade = function (u, dst, path, kind, extra) {
    if (!u.active || !dst.active || !u.owner.alive || !dst.owner.alive || u.owner === dst.owner) return;
    if (!this.canTrade(u.owner, dst.owner) || this.tradeCount >= G.TRADE_MAX) return;
    const ship = this.newUnit(UT.TRADE, u.owner, u.water);
    ship.path = path; ship.pi = 0; ship.dstPort = dst; ship.captured = false;
    // OpenFront's payout: short hops pay little, from about 300 tiles on a ship is worth its while
    const dist = (Math.abs(u.x - dst.x) + Math.abs(u.y - dst.y)) / this.S;
    ship.gold = Math.floor((75000 / (1 + Math.exp(-0.03 * (dist - 300))) + 50 * dist) * (this.lang ? G.LANG.tradeGold : 1));
    ship.kind = kind || 0; ship.hits = 1;
    if (this.hafen) { const k = G.HAFEN.ships[ship.kind]; ship.gold = Math.floor(ship.gold * k.gold); ship.hits = k.hits; }
    if (extra) ship.gold += Math.floor(extra);
    this.addUnit(ship);
  };
  Game.prototype.tickPort = function (u) {
    if ((this.ticks + u.id) % 10 !== 0) return;
    if (this.tradeCount >= G.TRADE_MAX) return;
    const ports = this.getPorts(), rng = this.rng;
    // a port sends a ship about every `rate` seconds per level: twice as often as before, so the seas are busy
    const rate = Math.min(25, Math.round(5 * Math.pow(ports.length, 0.6)));
    let go = false, kind = 0, extra = 0;
    if (this.hafen) {
      // by level: sqrt(level) times as often, now and then a larger ship; goods that came by train
      // send one more
      if ((u.load || 0) >= G.HAFEN.trainShip) { go = true; extra = (u.cargo || 0) * 0.5; u.load -= G.HAFEN.trainShip; u.cargo = 0; }
      else go = rng.next() * rate < Math.sqrt(Math.max(1, u.level));
      if (go) kind = this.shipTop(u.level);      // what it could send; the way decides below
    } else for (let i = 0; i < u.level && !go; i++) go = rng.chance(rate);
    if (!go) return;
    const p = u.owner, wc = this.map.wcomp, comp = wc[u.water], cand = [];
    const reach = this.hafen ? this.portRange(u.level, kind) * this.S * this.reach : 0, r2 = reach * reach;
    for (const v of ports) {
      if (v.owner === p || !v.owner.alive || !this.canTrade(p, v.owner) || wc[v.water] !== comp) continue;
      if (reach && (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y) > r2) continue;   // out of this port's reach
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
    if (this.hafen) kind = this.shipFor(Math.sqrt((dst.x - u.x) * (dst.x - u.x) + (dst.y - u.y) * (dst.y - u.y)) / (this.S * this.reach), kind);
    if (cached) { this.spawnTrade(u, dst, cached, kind, extra); return; }
    if (cached === null || this.pathQ.length > 6) return;     // route still being worked out, or queue busy
    if (this.pathCache.size > 500) this.pathCache.clear();
    this.pathCache.set(key, null);
    this.requestPath(u.water, dst.water, (path) => {
      if (!path) { this.pathCache.delete(key); return; }
      this.pathCache.set(key, path);
      this.spawnTrade(u, dst, path, kind, extra);
    }, false);
  };
  Game.prototype.tickTrade = function (u) {
    const p = u.owner;
    let d = u.dstPort;
    if (u.captured) {
      // a captured ship heads for a port of its new owner; if that one is gone or has changed hands,
      // it turns for the next one (or, with none left, its gold is paid out where it is)
      if ((!d.active || d.owner !== p) && !u.wait) { this.tradeHome(u); if (!u.active) return; d = u.dstPort; }
    } else if (!d.active || !d.owner.alive || !this.canTrade(p, d.owner)) { this.removeUnit(u); return; }
    if (!u.path) return;
    const sp = this.hafen ? G.HAFEN.ships[u.kind || 0].speed : 1;      // larger merchants are slower
    if (u.pi < u.path.length - 1) { for (let n = this.stride(u, this.pace * sp); n > 0 && u.pi < u.path.length - 1; n--) { u.pi++; this.setPos(u, u.path[u.pi]); } return; }
    if (u.wait || (u.captured && (!d.active || d.owner !== p))) return;   // its new course is still being worked out
    const q = d.owner, h = this.human;
    p.gold += u.gold;
    this.tradePaid = (this.tradePaid || 0) + u.gold;
    this.fx.push({ k: 'coin', x: d.x, y: d.y, t: this.ticks, mine: p === h || (q === h && !u.captured), amt: u.gold });
    if (this.fx.length > 300) this.fx.splice(0, 150);
    if (u.captured) {
      if (p === h) this.say('Gekapertes Handelsschiff bringt ' + fmt(u.gold) + ' Gold', 'good');
    } else if (q !== p) {
      q.gold += u.gold;
      if (h && (p === h || q === h)) { h.tradeGold += u.gold; h.shipTotal = (h.shipTotal || 0) + u.gold; }
    }
    this.removeUnit(u);
  };
  // The nearest built port of p on the same water as `tile`, or null.
  Game.prototype.portNear = function (p, tile) {
    const wc = this.map.wcomp, c = wc[tile], W = this.W, x = tile % W, y = (tile - x) / W;
    let best = null, bd = Infinity;
    for (const v of p.units) {
      if (v.type !== UT.PORT || !v.built || !v.active || wc[v.water] !== c) continue;
      const d = (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y);
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  };
  // Send a captured merchant to the nearest port of its owner. Like `sail`, the ship keeps going
  // while the route is worked out, and the new route is spliced on a few tiles ahead, so it does
  // not jump back to its tile and swing round. Without a port its gold is paid out at once.
  Game.prototype.tradeHome = function (ts) {
    const p = ts.owner, best = this.portNear(p, ts.tile);
    if (!best) { if (p.alive) p.gold += ts.gold; this.removeUnit(ts); return; }
    ts.dstPort = best;
    // join six tiles ahead: the picture smooths the ship's place over 3.5 tiles either way along its
    // route, so a join any nearer would show as a jump the moment the new route is put on
    const old = ts.path, lead = old && ts.pi < old.length - 1 ? Math.min(old.length - 1, ts.pi + 6) : -1;
    const from = lead >= 0 ? old[lead] : ts.tile, id = ts.req = (ts.req || 0) + 1;
    ts.wait = true;
    if (lead < 0) ts.path = null;
    this.requestPath(from, best.water, (path) => {
      if (!ts.active || ts.req !== id) return;
      ts.wait = false;
      if (!path) { if (ts.owner.alive) ts.owner.gold += ts.gold; this.removeUnit(ts); return; }
      if (lead >= 0 && ts.path === old && ts.pi <= lead) {
        const back = Math.max(0, ts.pi - 5), keep = lead - back, j = new Int32Array(keep + path.length);
        for (let i = 0; i < keep; i++) j[i] = old[back + i];
        j.set(path, keep);
        ts.path = j; ts.pi = ts.pi - back;
      } else if (path[0] === ts.tile) { ts.path = path; ts.pi = 0; }
      else this.tradeHome(ts);   // sailed past the join before the route was ready: ask again from here
    }, false);
  };
  Game.prototype.captureTrade = function (w, ts) {
    const np = w.owner, o = ts.owner, h = this.human;
    const i = o.units.indexOf(ts);
    if (i >= 0) o.units.splice(i, 1);
    o.cnt[UT.TRADE]--; np.cnt[UT.TRADE]++;
    ts.owner = np; np.units.push(ts); ts.captured = true;
    if (this.hafen) ts.gold = Math.floor(ts.gold * G.HAFEN.loot);      // part of the cargo is lost in the fight
    this.fx.push({ k: 'flag', x: ts.x, y: ts.y });
    if (np === h) this.say('Handelsschiff von ' + o.name + ' gekapert (' + fmt(ts.gold) + ' Gold an Bord)', 'good');
    else if (o === h) this.say(np.name + ' hat ein Handelsschiff von dir gekapert', 'warn');
    ts.wait = false;
    this.tradeHome(ts);
  };

  // Whether a ship at (ax, ay) sees (bx, by): along the straight line no more than `land` tiles of
  // land in a row (0: clear water all the way).
  Game.prototype.seaSight = function (ax, ay, bx, by, land) {
    const W = this.W, L = this.map.land, n = Math.ceil(Math.max(Math.abs(bx - ax), Math.abs(by - ay)));
    let run = 0;
    for (let i = 1; i < n; i++) {
      const x = Math.round(ax + (bx - ax) * i / n), y = Math.round(ay + (by - ay) * i / n);
      if (L[y * W + x]) { if (++run > land) return false; } else run = 0;
    }
    return true;
  };
  // ---------- the ships on the sea, by area ----------
  // Each warship looks for a target every five ticks. Going through every unit for that made the
  // cost grow with warships x units: 5000 ships took about 100 ms a tick (24.11.2026, test/stress.js).
  // Now the ships (troop boats, warships, merchants) are sorted once a tick into cells of SEA_CELL
  // tiles, and a warship only looks at the cells within its range. The grid is built when the
  // first warship asks in a tick. Ships keep moving during the tick, so the search reaches one
  // cell further than the range, and then keeps only the ships within the range at their current
  // position (since 27.11.2026; before, every ship of those cells went back, four in five of them
  // out of range, and was sorted). Every caller drops a ship further away than that anyway.
  // Ships added later in the tick are appended. The answer is in the order of this.units,
  // exactly as the old loop went, so the simulation gives the same numbers.
  const SEA_CELL = 32;
  Game.prototype.seaGrid = function () {
    const us = this.units, n = us.length, cw = (this.W + SEA_CELL - 1) >> 5, chh = (this.H + SEA_CELL - 1) >> 5, nc = cw * chh;
    let sg = this.sg;
    if (!sg || sg.nc !== nc) sg = this.sg = { nc: nc, cw: cw, ch: chh, start: new Int32Array(nc + 1), fill: new Int32Array(nc), items: new Int32Array(64), T: -1, arr: null, n: 0 };
    const start = sg.start, fill = sg.fill;
    start.fill(0);
    let m = 0;
    for (let i = 0; i < n; i++) {
      const v = us[i], ty = v.type;
      if (!v.active || (ty !== UT.TRANSPORT && ty !== UT.WARSHIP && ty !== UT.TRADE)) continue;
      start[(v.y >> 5) * cw + (v.x >> 5) + 1]++; m++;
    }
    for (let c = 0; c < nc; c++) start[c + 1] += start[c];
    if (sg.items.length < m) sg.items = new Int32Array(m * 2);
    fill.set(start.subarray(0, nc));
    const items = sg.items;
    for (let i = 0; i < n; i++) {
      const v = us[i], ty = v.type;
      if (!v.active || (ty !== UT.TRANSPORT && ty !== UT.WARSHIP && ty !== UT.TRADE)) continue;
      items[fill[(v.y >> 5) * cw + (v.x >> 5)]++] = i;
    }
    sg.T = this.ticks; sg.arr = us; sg.n = n;
    return sg;
  };
  const NEAR = [];
  Game.prototype.seaNear = function (x, y, r) {
    let sg = this.sg;
    if (!sg || sg.T !== this.ticks || sg.arr !== this.units) sg = this.seaGrid();
    const us = this.units, items = sg.items, start = sg.start, idx = [], r2 = r * r;
    const R = r + SEA_CELL;
    const cx0 = Math.max(0, (x - R) >> 5), cx1 = Math.min(sg.cw - 1, (x + R) >> 5);
    const cy0 = Math.max(0, (y - R) >> 5), cy1 = Math.min(sg.ch - 1, (y + R) >> 5);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = cy * sg.cw + cx;
      for (let k = start[c]; k < start[c + 1]; k++) {
        const v = us[items[k]], dx = v.x - x, dy = v.y - y;
        if (dx * dx + dy * dy <= r2) idx.push(items[k]);
      }
    }
    idx.sort(function (a, b) { return a - b; });
    NEAR.length = 0;
    for (let k = 0; k < idx.length; k++) NEAR.push(us[idx[k]]);
    // ships that came to sea after the grid was built in this tick
    for (let i = sg.n; i < us.length; i++) {
      const v = us[i], ty = v.type;
      if (v.active && (ty === UT.TRANSPORT || ty === UT.WARSHIP || ty === UT.TRADE) && (v.x - x) * (v.x - x) + (v.y - y) * (v.y - y) <= r2) NEAR.push(v);
    }
    return NEAR;
  };

  // Give a warship a new course; it holds position until the route is known.
  // How many tiles a ship or train moves this tick. The pace is a fraction of a tile per tick
  // (see G.PACE); the rest is carried in `u.mv`, which the picture also uses to glide between tiles.
  Game.prototype.stride = function (u, rate) {
    // `sr`: the rate of this tick, for the picture only (it glides at the same speed between ticks)
    u.mv = (u.mv || 0) + (rate || this.pace); u.st = this.ticks; u.sr = rate || this.pace;
    let n = 0;
    while (u.mv >= 1) { u.mv -= 1; n++; }
    return n;
  };
  // Send a ship to a tile. The ship keeps sailing while the route is worked out: the new route
  // starts a few tiles ahead on the old one and is spliced on there, so a change of course never
  // makes it stop dead. A newer order replaces an older one that is still being worked out.
  Game.prototype.sail = function (u, tile, urgent, leg) {
    if (u.wait) return;
    const old = u.path, lead = old && u.pi < old.length - 1 ? Math.min(old.length - 1, u.pi + 3) : -1;
    const from = lead >= 0 ? old[lead] : u.tile, id = u.req = (u.req || 0) + 1;
    u.wait = true; u.leg = leg || 'order';
    if (lead < 0) u.path = null;
    this.requestPath(from, tile, (path) => {
      if (!u.active || u.req !== id) return;
      u.wait = false;
      if (!path) { if (u.path === old && lead < 0) u.path = null; return; }
      if (lead >= 0 && u.path === old && u.pi <= lead) {
        // keep a few tiles of wake behind the ship so the picture does not twitch at the join
        const back = Math.max(0, u.pi - 5), keep = lead - back, j = new Int32Array(keep + path.length);
        for (let i = 0; i < keep; i++) j[i] = old[back + i];
        j.set(path, keep);
        u.path = j; u.pi = u.pi - back;
      } else if (path[0] === u.tile) { u.path = path; u.pi = 0; }
      else u.path = null;   // sailed past the join before the route was ready: ask again from here
    }, urgent, u.type === UT.WARSHIP, u.type === UT.WARSHIP);
  };
  Game.prototype.tickWarship = function (u) {
    const T = this.ticks, R = this.R, p = u.owner, W = this.W, map = this.map;
    // Repairs, as in OpenFront: a damaged ship mends slowly while a home port is within reach,
    // heads for the nearest one once it is below three quarters of its strength, and is patched up
    // fast when it lies at the quay (the faster, the higher the port's level).
    let dock = u.repair;
    const C = G.SHIP_CLASS[u.cls || 0], full = this.lang ? this.shipFull(u) : C.hp, spd = this.lang ? this.shipSpeed(u) : C.speed;
    if (C.carrier) this.tickField(u);   // «Langes Spiel»: a carrier sends planes like an airfield
    else if (this.lang && (!u.cls || C.flak)) this.shipFlak(u);
    // upkeep while at sea; without the gold for it the ship makes for port and is laid up there
    if (!(p.type === PT.HUMAN && this.opts.infiniteGold)) {
      p.gold -= this.lang ? C.upkeep * G.LANG.shipUpkeep : C.upkeep;
      if (p.gold < 0) { p.gold = 0; if (!u.storing && this.dockWarship(p, u.id) && p === this.human) this.say('Kein Gold für den Unterhalt: ' + C.name + ' läuft in den Hafen ein', 'warn'); }
    }
    if (u.storing) {
      // called home: straight to the port, no fighting on the way, laid up on arrival (whole again)
      const sp = u.storing;
      if (!sp.active || sp.owner !== p || !sp.built) { u.storing = null; }
      else {
        const d2 = (sp.x - u.x) * (sp.x - u.x) + (sp.y - u.y) * (sp.y - u.y);
        if (d2 <= 25) {
          sp.store = sp.store || [0, 0]; sp.store[u.cls || 0] = (sp.store[u.cls || 0] || 0) + 1;
          if (p === this.human) this.say(C.name + ' liegt im Hafen (auf Lager: ' + sp.store[u.cls || 0] + ')', 'info');
          this.removeUnit(u);
          return;
        }
        if (u.path && u.pi < u.path.length - 1) for (let n = this.stride(u, this.pace * spd); n > 0 && u.pi < u.path.length - 1; n--) { u.pi++; this.setPos(u, u.path[u.pi]); }
        else if (!u.wait && this.nearQ.length <= 12) this.sail(u, sp.water, true, 'dock');
        return;
      }
    }
    if (dock && (!dock.active || dock.owner !== p || u.hp >= full)) dock = u.repair = null;
    if (u.hp < full) {
      // looked at every two seconds; a ship that is badly hit and not yet bound for a port looks at once
      if ((T + u.id) % 20 === 0 || (!dock && u.hp < full * 0.75 && (T + u.id) % 3 === 0)) {
        let best = null, bd = Infinity;
        for (const v of p.units) {
          if (v.type !== UT.PORT || !v.built || map.wcomp[v.water] !== map.wcomp[u.tile]) continue;
          const d = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y);
          if (d < bd) { bd = d; best = v; }
        }
        u.home = best;
        if (!dock && best && u.hp < full * 0.75) {
          dock = u.repair = best;
          u.target = null; u.hunt = null;      // repairs come before prizes: the chase is broken off
          if (p === this.human) this.say('Kriegsschiff läuft zur Reparatur den Hafen an', 'warn');
        }
      }
      const hm = u.home && u.home.active && u.home.owner === p ? u.home : null;
      if (hm) {
        const d2 = (hm.x - u.x) * (hm.x - u.x) + (hm.y - u.y) * (hm.y - u.y), heal = 150 * this.S * this.reach, quay = Math.max(4, 5 * this.S);
        if (d2 <= quay * quay) u.hp = Math.min(full, u.hp + 1 + 5 * hm.level);
        else if (d2 <= heal * heal) u.hp = Math.min(full, u.hp + 1);
      }
    }
    // At the quay a ship is out of the fight, as in OpenFront: it neither shoots nor is shot at
    // until the hull is whole again (before, ships were kept at the quay for minutes under fire).
    u.docked = !!dock && (dock.x - u.x) * (dock.x - u.x) + (dock.y - u.y) * (dock.y - u.y) <= 16;
    if (u.docked) { u.target = null; u.hunt = null; return; }
    // Who to go for: troop boats first, then warships, then merchants. A troop boat only when it is
    // bound for us or an ally (until 23.11.2026 any boat of anybody not allied, in a radius of 130
    // instead of 70: warships shot up every landing nearby and were far too strong). A merchant
    // only counts while it is inside the patrol area, so the ship is not lured away from its post.
    if ((T + u.id) % 5 === 0 && C.range) {
      let best = null, bs = Infinity, home;
      const rr = C.range * this.S * this.reach * (this.lang && u.cls === 1 && this.has(p, 'bs3') ? 1.3 : 1), r2 = rr * rr, p2 = R.warPatrol * R.warPatrol, pcx = u.patrol % W, pcy = (u.patrol / W) | 0;
      // only the ships near this one (a grid of the sea, see seaNear), in the order of
      // this.units as before, so every device still picks the same target
      for (const v of this.seaNear(u.x, u.y, rr)) {
        if (!v.active || v.owner === p) continue;
        const ty = v.type;
        if (v.safeUntil > T || v.docked) continue;   // just changed hands, or under repair at the quay
        if (!this.hostile(v.owner, p)) continue;   // «Langes Spiel»: only at war (src/04c_lang.js)
        if (ty === UT.WARSHIP && v.cls === 2 && !this.subSeen(v, p)) continue;   // «Langes Spiel»: a submarine nobody has found
        if (ty === UT.TRANSPORT) { const q = v.tid ? this.players[v.tid] : null; if (!q || (q !== p && !this.friendly(p, q))) continue; }
        if (ty === UT.TRADE) {
          if (!C.capture && !C.sub) continue;             // a battleship takes no merchants (a submarine sinks them)
          // only worth chasing with a port of one's own on this water to bring it into
          if (v.captured || !v.path || this.friendly(v.dstPort.owner, p) || map.wcomp[v.tile] !== map.wcomp[u.tile]) continue;
          if (!C.sub && home === undefined) home = this.portNear(p, u.tile);
          if (!C.sub && !home) continue;
          if ((v.x - pcx) * (v.x - pcx) + (v.y - pcy) * (v.y - pcy) > p2) continue;
        }
        const dx = v.x - u.x, dy = v.y - u.y, d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        if (ty !== UT.TRADE && !this.seaSight(u.x, u.y, v.x, v.y, C.land)) continue;   // a shot needs sight
        // a destroyer goes for troop boats first, a battleship for warships
        const s = d2 + (C.sub ? (ty === UT.WARSHIP ? 0 : ty === UT.TRADE ? 1e7 : 2e7) : u.cls ? (ty === UT.WARSHIP ? 0 : 1e7) : (ty === UT.TRANSPORT ? 0 : ty === UT.WARSHIP ? 1e7 : 2e7));
        if (s < bs) { bs = s; best = v; }
      }
      u.target = best;
    }
    let tg = u.target;
    if (tg && (!tg.active || tg.owner === p || tg.docked || (tg.type === UT.TRADE && tg.captured))) tg = u.target = null;
    const hunt = !dock && !!tg && tg.type === UT.TRADE && !C.sub;
    if (tg && (tg.type !== UT.TRADE || C.sub) && T >= u.shotAt) {
      u.shotAt = T + C.rate;
      if (C.sub) u.shown = T + G.LANG.subShow;   // a torpedo gives the submarine away
      const s = this.newUnit(UT.SHELL, p, u.tile);
      s.target = tg; s.sx = u.x; s.sy = u.y; s.ship = u;          // `ship` only tells the picture where the gun is
      s.dmg = C.dmg * (this.lang && ((u.cls === 1 && this.has(p, 'bs4')) || (C.sub && this.has(p, 'ub4'))) ? (C.sub ? 1.5 : 1.3) : 1); s.missile = u.cls === 1;
      this.addUnit(s);
      this.fx.push({ k: 'muzzle', x: u.x, y: u.y, tx: tg.x, ty: tg.y, ship: u });
      if (this.fx.length > 300) this.fx.splice(0, 150);
    }
    if (hunt) {
      const dx = tg.x - u.x, dy = tg.y - u.y;
      if (dx * dx + dy * dy <= 49) {
        // a large ship has to be hit a few times first (one hit a second alongside)
        if ((tg.hits || 1) > 1) { if ((T + u.id) % 10 === 0) { tg.hits--; this.fx.push({ k: 'pop', x: tg.x, y: tg.y, hit: true }); } }
        else { this.captureTrade(u, tg); tg = u.target = null; u.hunt = null; }
      }
      else if (!u.wait && this.nearQ.length < 12 && (u.hunt !== tg || (T + u.id) % 10 === 0)) {
        // Cut it off instead of trailing behind: aim for the first tile of the merchant's own
        // route that this ship (twice as fast on the chase) reaches no later than the merchant.
        const tp = tg.path, sp = this.pace;
        let aim = tg.tile;
        for (let k = 4; tp && tg.pi + k < tp.length; k += 4) {
          const t = tp[tg.pi + k], ax = t % W - u.x, ay = ((t / W) | 0) - u.y;
          aim = t;
          if (Math.sqrt(ax * ax + ay * ay) / (2 * sp) <= k / sp) break;
        }
        u.hunt = tg;
        this.sail(u, aim, false, 'hunt');
      }
    } else u.hunt = null;

    // Under way. On the chase a warship makes twice its cruising speed (as in OpenFront).
    if (u.path && u.pi < u.path.length - 1) {
      for (let n = this.stride(u, (hunt ? 2 : 1) * this.pace * spd * (u.leg === 'patrol' ? C.patrol : 1)); n > 0 && u.pi < u.path.length - 1; n--) { u.pi++; this.setPos(u, u.path[u.pi]); }
    }
    if (u.wait || hunt) return;
    const left = u.path ? u.path.length - 1 - u.pi : 0;
    if (dock) {
      // to the quay, and there until the hull is whole again
      const d2 = (dock.x - u.x) * (dock.x - u.x) + (dock.y - u.y) * (dock.y - u.y);
      if (d2 > 16 && (u.leg !== 'dock' || left === 0) && this.nearQ.length <= 12) this.sail(u, dock.water, false, 'dock');
      return;
    }
    // On patrol the next leg is asked for a few tiles before the end of this one, so the ship
    // never lies still between two legs.
    if (left > 4 && u.leg !== 'dock') return;
    if (this.nearQ.length > 12) return;
    const t = this.patrolPoint(u);
    if (t >= 0) this.sail(u, t, false, 'patrol');
  };

  // The next point of a patrol. The ship sails a beat round the place it was sent to: each leg
  // carries it about a third of the way round a ring of half the patrol range, at a varying
  // distance from the middle, so over time it sweeps the whole area instead of darting about at
  // random. Points close to the coast are passed over (it is a sea patrol, not a coast guard
  // cutter); only if there is no open water at all does it settle for less.
  Game.prototype.patrolPoint = function (u) {
    const map = this.map, W = this.W, H = this.H, rng = this.rng, off = map.mag;   // for water: distance to land
    const cx = u.patrol % W, cy = (u.patrol / W) | 0, comp = map.wcomp[u.tile], pr = this.R.warPatrol * 0.5;
    const clear = Math.max(3, Math.round(G.SHIP_CLASS[u.cls || 0].deep * this.S));
    if (u.beat === undefined) { u.beat = rng.next() * 2 * Math.PI; u.turn = rng.next() < 0.5 ? 1 : -1; }
    let best = -1, bs = -1;
    const tries = u.cls ? 40 : 14;
    for (let i = 0; i < tries; i++) {
      // the first tries follow the beat; later ones look anywhere in the area
      const ang = i < 8 ? u.beat + u.turn * (1.7 + 0.25 * i + 0.6 * rng.next()) : rng.next() * 2 * Math.PI;
      const rad = pr * (i < 8 ? 0.55 + 0.45 * rng.next() : rng.next());
      const x = Math.round(cx + Math.cos(ang) * rad), y = Math.round(cy + Math.sin(ang) * rad);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const t = y * W + x;
      if (map.land[t] || map.wcomp[t] !== comp) continue;
      if (off[t] >= clear) { u.beat = ang; return t; }
      if (off[t] > bs) { bs = off[t]; best = t; }
    }
    // a battleship keeps to deep water: with no deep point found it heads back to the middle of its
    // patrol (deepNear made that deep)
    if (u.cls && map.mag[u.patrol] >= clear) return u.patrol;
    if (best >= 0) { const bx = best % W - cx, by = ((best / W) | 0) - cy; if (bx || by) u.beat += u.turn * 2; }
    return best;
  };
  // The open water nearest to tile w that is at least the class's depth from land (for a
  // battleship: its patrol keeps to deep water; it can still be sent anywhere). w if there is none.
  Game.prototype.deepNear = function (w, cls) {
    const map = this.map, W = this.W, H = this.H, off = map.mag, need = Math.max(3, Math.round(G.SHIP_CLASS[cls || 0].deep * this.S));
    if (!cls || off[w] >= need) return w;
    const cx = w % W, cy = (w / W) | 0, comp = map.wcomp[w], R = Math.round(this.R.warPatrol * 1.5);
    for (let r = 2; r <= R; r += 2) for (let k = 0; k < 24; k++) {
      const a = k * 0.2618, x = Math.round(cx + Math.cos(a) * r), y = Math.round(cy + Math.sin(a) * r);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const t = y * W + x;
      if (!map.land[t] && map.wcomp[t] === comp && off[t] >= need) return t;
    }
    return w;
  };
  // Call a warship home: it sails to the port (the one given, else the nearest of its owner on its
  // water) and is laid up there in the port's store. False without a port to go to.
  Game.prototype.dockWarship = function (p, id, portTile) {
    const u = p.units.find(function (v) { return v.id === id && v.type === UT.WARSHIP && v.active; });
    if (!u) return false;
    const map = this.map;
    let port = portTile >= 0 ? this.structNear(portTile, 4) : null;
    if (!port || port.type !== UT.PORT || port.owner !== p || !port.built || map.wcomp[port.water] !== map.wcomp[u.tile]) port = this.portNear(p, u.tile);
    if (!port) return false;
    u.storing = port; u.repair = null; u.target = null; u.hunt = null; u.wait = false;
    this.sail(u, port.water, true, 'dock');
    return true;
  };
  // Send a warship to a tile: the one with id `id`, or else the nearest that can get there.
  Game.prototype.moveWarship = function (p, tile, id) {
    const map = this.map, W = this.W;
    const w = map.land[tile] ? this.waterNear(tile, 8) : tile;
    if (w < 0) return false;
    let best = null, bd = Infinity;
    for (const u of p.units) {
      if (u.type !== UT.WARSHIP || map.wcomp[u.tile] !== map.wcomp[w]) continue;
      if (id >= 0 && u.id !== id) continue;
      const d = (u.x - w % W) * (u.x - w % W) + (u.y - ((w / W) | 0)) * (u.y - ((w / W) | 0)) + (u.repair ? 1e9 : 0);   // a ship under repair is the last to be sent
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) return false;
    best.patrol = this.deepNear(w, best.cls); best.wait = false; best.repair = null; best.beat = undefined; best.hunt = null; best.target = null; best.storing = null;
    this.sail(best, w, true, 'order');
    return true;
  };
  Game.prototype.tickShell = function (u) {
    const tg = u.target;
    if (!tg || !tg.active) { this.removeUnit(u); return; }
    const dx = tg.x - u.x, dy = tg.y - u.y, d = Math.hypot(dx, dy), sp = Math.max(2, (u.missile ? 2.5 : 4) * this.pace0);
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    this.removeUnit(u);
    const by = u.owner, h = this.human, was = tg.owner;
    if (was === by || this.friendly(was, by)) return;
    this.fx.push({ k: 'pop', x: tg.x, y: tg.y, hit: true });
    if (tg.type === UT.WARSHIP) {
      tg.hp -= u.dmg || 250;
      if (tg.hp > 0) return;
      // a beaten warship blows up and sinks (set G.WARSHIP_CAPTURE = true for the old behaviour: the victor takes it over)
      if (!G.WARSHIP_CAPTURE || !by.alive || by.cnt[UT.WARSHIP] >= 8) {
        this.fx.push({ k: 'shipboom', x: tg.x, y: tg.y, a: tg.ang || 0 });
        this.removeUnit(tg);
        if (was === h) this.say('Dein Kriegsschiff wurde von ' + by.name + ' versenkt', 'bad');
        else if (by === h) this.say('Kriegsschiff von ' + was.name + ' versenkt', 'good');
        return;
      }
      // a beaten warship strikes its colours and sails on for the victor
      const i = was.units.indexOf(tg);
      if (i >= 0) was.units.splice(i, 1);
      was.cnt[UT.WARSHIP]--; by.cnt[UT.WARSHIP]++;
      tg.owner = by; by.units.push(tg);
      tg.hp = 400; tg.target = null; tg.repair = null; tg.home = null; tg.patrol = tg.tile; tg.shotAt = this.ticks + 30; tg.safeUntil = this.ticks + 150;
      tg.path = null; tg.wait = false; tg.req = (tg.req || 0) + 1; tg.beat = undefined; tg.hunt = null;
      this.fx.push({ k: 'flag', x: tg.x, y: tg.y });
      if (was === h) this.say(by.name + ' hat dein Kriegsschiff eingenommen', 'bad');
      else if (by === h) this.say('Kriegsschiff von ' + was.name + ' eingenommen', 'good');
      return;
    }
    if (tg.type === UT.TRADE) {
      // «Langes Spiel»: a submarine's torpedo sinks a merchant with its cargo
      this.fx.push({ k: 'shipboom', x: tg.x, y: tg.y, a: tg.ang || 0 });
      this.removeUnit(tg);
      if (was === h) this.say('Dein Handelsschiff wurde von einem U-Boot von ' + by.name + ' versenkt', 'bad');
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
    for (let i = 0; i < silo.ready.length; i++) if (silo.ready[i] <= T) { silo.ready[i] = T + G.SILO_RELOAD; break; }
    if (this.lang) { silo.firedAt = T; if (silo.type === UT.WARSHIP) silo.shown = T + G.LANG.subShow; }   // «Langes Spiel»: a silo or submarine that fires gives itself away
    const u = this.newUnit(type, p, silo.tile);
    u.dst = tile; u.sx = u.x; u.sy = u.y; u.dx = tile % W; u.dy = (tile / W) | 0;
    u.dist = Math.max(1, Math.hypot(u.dx - u.sx, u.dy - u.sy));
    u.prog = 0; u.speed = this.R.nukeSpeed * (type === UT.SRBM ? G.LANG.srbmSpeed : G.lowFly(type) ? 1.6 : 1) * (this.lang ? this.weaponPace(p, type) : 1); u.tid = this.owner[tile]; u.sam = false; u.delay = 0;
    this.addUnit(u);
    this.fx.push({ k: 'launch', x: u.x, y: u.y, mine: p === this.human });
    if (this.lang) this.langLaunch(p, u);   // outcast after a nuclear weapon, the price of cruise missiles (src/04c_lang.js)
    const h = this.human;
    if (type === UT.MIRV) {
      this.mirvs = (this.mirvs || 0) + 1;
      const q = this.players[u.tid];
      if (q) {
        if (p.allies.has(q.id)) this.breakAlliance(p, q);
        this.relate(q, p, -100);
        if (this.lang) this.declareWar(p, q);
        if (q === h) this.say('MIRV von ' + p.name + ' im Anflug!', 'bad');
      }
      return u;
    }
    const hit = this.tilesInDisc(u.dx, u.dy, G.blastR(this.R, type)[1]);
    for (const e of hit) {
      const q = this.players[e[0]];
      if (q === p) continue;
      if (p.allies.has(q.id) && e[1] > 20) this.breakAlliance(p, q);
      if (this.lang) this.declareWar(p, q);
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
      if (this.lang) this.declareWar(p, q);
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
    const br = G.blastR(R, type), rin = br[0], rout = br[1];
    const clean = type === UT.CRUISE || type === UT.LASER || G.LANG_WEAPON(type);   // cruise missile, satellite beam and the conventional weapons of «Langes Spiel» leave no fallout behind
    const crater = type !== UT.CLUSTER && type !== UT.BUNKER;   // the cluster bomb kills troops only, the bunker buster takes buildings only
    const W = this.W, H = this.H, own = this.owner, land = this.map.land, rng = this.rng, ps = this.players;
    const cx = u.dx, cy = u.dy, in2 = rin * rin, out2 = rout * rout;
    const before = new Map();
    // troops lost per hit tile, in tiles' worth of the average (OpenFront: 5; ours 3, see
    // doku/openfront-abgleich.md)
    const kill = (type === UT.WARHEAD ? G.WARHEAD_KILL : G.NUKE_KILL) * (type === UT.BUNKER ? 0.3 : 1);
    // «Langes Spiel» (src/04c_lang.js): a city loses levels and people instead of falling at once;
    // the tile of a city still standing is not torn from its owner
    const cityRule = this.lang && G.LANG.cityHit[type] !== undefined;
    const levelRule = this.lang && (type === UT.CRUISE || type === UT.SRBM);   // a share of the levels
    let keep = null;
    if (cityRule || levelRule) {
      for (const v of this.units) {
        if (!v.active || !v.built || (levelRule ? v.type > UT.CLOAK : v.type !== UT.CITY)) continue;
        const vd2 = (v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy);
        if (vd2 > out2) continue;
        if (levelRule) this.structHitBy(v, u.owner); else this.cityHit(v, type, vd2 <= in2);
        if (v.active) (keep || (keep = new Set())).add(v.tile);
      }
    }
    if (this.lang) this.langNukeHit(type, cx, cy, rout);   // second strike: arming silos of those hit fire at once
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
          q.troops = Math.max(0, q.troops - kill * q.troops / Math.max(1, q.tiles));
          if (crater && (!keep || !keep.has(t))) this.relinquish(t);
        }
        if (!clean && !this.fallout[t]) { this.fallout[t] = 1; this.falloutCount++; this.markDirty(t); this.dirtyFlag[t] = 2; }
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
      const vd2 = (v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy);
      if (keep && keep.has(v.tile) && v.type <= UT.CLOAK) continue;   // hit above, still standing
      if (type === UT.CLUSTER && v.type <= UT.CLOAK) continue;      // a cluster bomb leaves buildings standing
      if (vd2 <= out2) {
        if (v.type === UT.WARSHIP) this.fx.push({ k: 'shipboom', x: v.x, y: v.y, a: 0 });
        this.removeUnit(v);
      }
    }
    this.fx.push({ k: 'boom', x: cx, y: cy, r: rout, big: type === UT.HYDRO, head: type === UT.WARHEAD, beam: type === UT.LASER, t: type });   // t: the picture of the blast (src/06_view.js)
    if (this.fx.length > 300) this.fx.splice(0, 150);
  };
  Game.prototype.splitMirv = function (u) {
    const tp = this.players[u.tid];
    this.fx.push({ k: 'pop', x: u.dx, y: u.dy });
    if (!tp || !tp.alive) return;
    const R = this.R, W = this.W, rng = this.rng, own = this.owner;
    const sp2 = Math.pow(R.headOut * 1.8, 2), range2 = R.mirvRange * R.mirvRange;
    // Deliberately weaker than OpenFront: the warheads only cover about a third of the target's
    // land (a third since 19.11.2026; each warhead lays waste to roughly its inner circle plus half its outer ring), so a
    // MIRV hurts badly but does not wipe a whole empire off the map.
    const per = Math.PI * (R.headIn * R.headIn + 0.5 * (R.headOut * R.headOut - R.headIn * R.headIn));
    const want = Math.min(R.mirvCount, Math.max(6, Math.ceil(G.MIRV_COVER * tp.tiles / per)));
    const picks = [];
    let tries = want * 30;
    while (picks.length < want && tries-- > 0) {
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
    return Math.round((150 - 480 / (u.level + 5)) * this.S * this.reach * (this.lang && this.has(u.owner, 'abw3b') ? 1.3 : 1));
  };
  Game.prototype.sammSpeed = function () { return Math.max(5, 14 * this.S) * (this.lang ? G.LANG.air : 1); };
  // What an air defence may shoot at. The MIRV itself flies too high; its warheads do not, and
  // the satellite beam comes straight down from orbit (as in OpenFront).
  // Inner and outer ring of a blast.
  G.blastR = function (R, type) {
    switch (type) {
      case UT.HYDRO: return [R.hydroIn, R.hydroOut];
      case UT.ATOM: return [R.atomIn, R.atomOut];
      case UT.CRUISE: case UT.SRBM: return [R.cruiseIn, R.cruiseOut];
      case UT.LASER: return [R.laserIn, R.laserOut];
      case UT.CLUSTER: return [R.clusterIn, R.clusterOut];
      case UT.BUNKER: return [R.bunkerIn, R.bunkerOut];
      case UT.THERMO: return [R.thermoIn, R.thermoOut];
    }
    return [R.headIn, R.headOut];
  };
  G.canIntercept = function (type) {
    return type === UT.ATOM || type === UT.HYDRO || type === UT.WARHEAD || type === UT.CRUISE;
  };
  // Where a bomb stands `k` ticks from now. It flies a straight line at a constant speed, so this
  // is exact rather than a guess.
  Game.prototype.nukeAt = function (n, k, out) {
    const moved = Math.max(0, k - (n.delay || 0));
    const pr = Math.min(1, n.prog + moved * n.speed / n.dist);
    out.x = n.sx + (n.dx - n.sx) * pr;
    out.y = n.sy + (n.dy - n.sy) * pr;
    out.prog = pr;
    return out;
  };
  // Is this the tick to shoot at that bomb? Like OpenFront the launcher works the whole flight
  // path out ahead of time: it looks for a point of the path that lies inside its reach and that
  // an interceptor fired now would arrive at exactly when the bomb does. So it neither waits
  // until the bomb is overhead and is then too late, nor fires so early that it meets the bomb
  // far outside the area it is supposed to protect.
  const SOLVE = { x: 0, y: 0, prog: 0 };
  Game.prototype.samSolve = function (u, n, sr) {
    const sp = this.sammSpeed(), r2 = sr * sr;
    const steps = Math.ceil((1 - n.prog) * n.dist / n.speed) + (n.delay || 0);
    for (let k = 0; k <= steps; k++) {
      const p = this.nukeAt(n, k, SOLVE);
      const dx = p.x - u.x, dy = p.y - u.y, d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;                           // outside the launcher's reach: not its business
      const fly = Math.ceil(Math.sqrt(d2) / sp);       // ticks the interceptor needs to get there
      if (fly <= k && k - fly <= 1) return true;       // meets the bomb there: shoot now
    }
    return false;
  };
  // A cruise missile hugs the ground, so a launcher only picks it up inside half its reach.
  // That is what makes it worth its lower price: it slips past a thin line of launchers, but a
  // launcher standing near the target still stops it for certain.
  G.CRUISE_RANGE = 0.5;
  // Weapons that fly low (a launcher picks them up inside half its reach), and the share of its reach
  // at which a launcher picks up a weapon. The short-range missile of «Langes Spiel» comes down so
  // fast that a launcher has only a quarter of its reach for it.
  G.lowFly = function (type) { return type === UT.CRUISE || type === UT.CLUSTER || type === UT.BUNKER || type === UT.THERMO; };
  G.seenAt = function (type) { return type === UT.SRBM ? G.LANG.srbmSeen : type === UT.STEALTH ? G.LANG.stealthSeen : G.lowFly(type) ? G.CRUISE_RANGE : 1; };
  Game.prototype.tickSam = function (u) {
    if (!this.nukes.length) return;
    const T = this.ticks, sr = this.samRange(u);
    for (let s = 0; s < u.ready.length; s++) {
      if (u.ready[s] > T) continue;
      for (const n of this.nukes) {
        if (!n.active || n.sam || !(this.lang ? this.samCan(u, n.type) : G.canIntercept(n.type))) continue;
        if (n.owner === u.owner || (G.isPlane(n.type) ? !this.hostile(n.owner, u.owner) : this.friendly(n.owner, u.owner))) continue;   // «Langes Spiel»: planes only at war
        if (n.type === UT.STEALTH && !this.stealthLocked(u, n, sr)) continue;   // «Langes Spiel»: it has to be held a while first
        if (!this.samSolve(u, n, sr * G.seenAt(n.type) * (this.lang && (n.type === UT.CRUISE || n.type === UT.SRBM) && this.has(n.owner, 'hyper') ? 0.5 : 1))) continue;
        n.sam = true; u.ready[s] = T + (this.lang ? this.samReload(u) : 90);
        const m = this.newUnit(UT.SAMM, u.owner, u.tile);
        m.target = n; m.src = u;
        this.addUnit(m);
        if (this.lang) this.fx.push({ k: 'tracer', x: u.x, y: u.y, tx: n.x, ty: n.y });   // «Langes Spiel»: who fires is seen
        break;
      }
    }
  };
  Game.prototype.tickSamMissile = function (u) {
    const n = u.target;
    // Target gone, or the launcher that fired it was destroyed: the interceptor is spent.
    if (!n.active || (u.src && !u.src.active)) {
      if (n.active) n.sam = false;
      this.removeUnit(u);
      return;
    }
    const dx = n.x - u.x, dy = n.y - u.y, d = Math.hypot(dx, dy), sp = this.sammSpeed();
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    // Contact. An interceptor that reaches its target always kills it, as in OpenFront. («Langes
    // Spiel»: a stealth bomber takes more than one.)
    this.removeUnit(u);
    if (n.hp > 1) { n.hp--; n.sam = false; return; }
    this.removeUnit(n);
    // `air`: how high the picture shows the bomb at this point of its arc, so the flash is drawn there
    this.fx.push({ k: 'pop', x: n.x, y: n.y, air: Math.min(n.dist * 0.28, 70) * (n.type === UT.CRUISE ? 0.12 : 1) * Math.sin(Math.PI * Math.min(1, n.prog)) });
    const h = this.human;
    if (this.lang) { this.fx.push({ k: 'tracer', x: u.src ? u.src.x : u.x, y: u.src ? u.src.y : u.y, tx: n.x, ty: n.y }); this.shotDown(n, u.src || u, u.owner); return; }   // who shot (src/04c_lang.js)
    if (u.owner === h) this.say(G.UNAME[n.type] + ' von ' + n.owner.name + ' abgefangen', 'good');
    else if (n.owner === h) this.say('Deine ' + G.UNAME[n.type] + ' wurde abgefangen', 'warn');
  };

  // Air defences that could reach a bomb on its way from the silo to the target (for the aiming
  // preview). `type` is the bomb being aimed, so the preview uses the same reach the launcher
  // will really use.
  Game.prototype.samsOnPath = function (p, sx, sy, dx, dy, type) {
    const out = [];
    if (type !== undefined && !G.canIntercept(type) && !(this.lang && G.LANG_WEAPON(type))) return out;
    const f = type === undefined ? 1 : G.seenAt(type);
    for (const u of this.structAt.values()) {
      if (u.type === UT.SAM && this.lang && type !== undefined && !this.samCan(u, type)) continue;
      if (u.type !== UT.SAM || !u.built || u.owner === p || this.friendly(u.owner, p) || this.hiddenFrom(u, p)) continue;   // a hidden one is a surprise
      const sr = this.samRange(u) * f, r2 = sr * sr;
      for (let i = 0; i <= 40; i++) {
        const x = sx + (dx - sx) * i / 40, y = sy + (dy - sy) * i / 40;
        if ((x - u.x) * (x - u.x) + (y - u.y) * (y - u.y) <= r2) { out.push(u); break; }
      }
    }
    return out;
  };

  Game.prototype.tickUnit = function (u) {
    const ty = u.type;
    if (ty <= UT.CLOAK) {
      if (!u.built) { if (this.ticks >= u.buildEnd) this.finishBuild(u); return; }
      if (ty === UT.PORT) this.tickPort(u);
      else if (ty === UT.SAM) this.tickSam(u);
      else if (ty === UT.SILO && u.cls === 1 && this.lang) this.tickField(u);
      return;
    }
    u.px = u.x; u.py = u.y;
    if (ty === UT.TRADE) this.tickTrade(u);
    else if (ty === UT.TRANSPORT) this.tickTransport(u);
    else if (ty === UT.TRAIN) this.tickTrain(u);
    else if (ty === UT.WARSHIP) this.tickWarship(u);
    else if (ty === UT.SHELL) this.tickShell(u);
    else if (ty === UT.SAMM) this.tickSamMissile(u);
    else if (ty >= UT.BOMBER && ty <= UT.FIGHTER) this.tickPlane(u);
    else if (ty === UT.MINE) this.tickMine(u);
    else this.tickNuke(u);
  };
})(globalThis.G = globalThis.G || {});
