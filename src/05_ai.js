(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const PT = G.PT, UT = G.UT;

  // Computer opponents. Bots only spread a little and are there to be conquered; nations build, sail, ally and bomb.
  function AI(g, p) {
    const r = g.rng;
    this.g = g; this.p = p;
    this.rate = p.type === PT.BOT ? r.int(42, 78) : r.int(40, 80); this.off = r.int(0, this.rate);
    if (p.type === PT.BOT) { this.trigger = r.int(60, 90) / 100; this.reserve = r.int(30, 60) / 100; }
    else { this.trigger = r.int(50, 60) / 100; this.reserve = r.int(30, 40) / 100; }
    this.expand = r.int(10, 20) / 100;
    this.enemy = null;
  }

  AI.prototype.tick = function () {
    if ((this.g.ticks + this.off) % this.rate !== 0) return;
    if (this.p.type === PT.BOT) this.bot(); else this.nation();
  };

  // Keep a reserve at home and send everything above it.
  AI.prototype.send = function (target) {
    const g = this.g, p = this.p;
    const troops = p.troops - g.maxTroops(p) * (target ? this.reserve : this.expand);
    if (troops < 1) return false;
    return !!g.attack(p, target ? target.id : 0, troops, -1);
  };

  // Bots are easy prey and build nothing. They take free land at a steady pace until they have a
  // small realm of their own. The only one they ever attack is a neighbour with far fewer troops
  // than they have themselves, and then only with a small party, so the attack creeps forward.
  AI.prototype.bot = function () {
    const g = this.g, p = this.p;
    if (!this.cap) {
      const share = g.map.landTiles / Math.max(50, g.players.length - 1);
      this.cap = G.within(share * 0.5, 150, 2500) * (0.6 + this.expand * 4);
    }
    const nb = g.neighbors(p);
    if (p.tiles < this.cap && nb.tn) {
      // never more than the land still missing needs (a free tile costs about ten troops)
      const troops = Math.min((p.troops - g.maxTroops(p) * this.reserve) * 0.3, (this.cap - p.tiles) * 10, 4800);
      if (troops >= 1) g.attack(p, 0, troops, -1);
    }
    if (g.ticks < g.immuneUntil) return;
    for (const id of nb.ids) {
      const q = g.players[id];
      if (!q || !q.alive || q.type === PT.BOT || g.friendly(p, q)) continue;
      if (q.troops * 3 >= p.troops) continue;
      // one small party at a time: nothing is added while the last one is still on its way
      let busy = false;
      for (const at of p.out) if (at.active && at.tid === id) { busy = true; break; }
      if (!busy) g.attack(p, id, p.troops / 100, -1);
      break;
    }
  };

  AI.prototype.nation = function () {
    const g = this.g, p = this.p, r = g.rng;
    this.embargoes();
    this.construct();
    this.nuke();
    const nb = g.neighbors(p);
    if (nb.tn) { this.send(null); if (r.chance(2)) return; }
    const list = [];
    for (const id of nb.ids) { const q = g.players[id]; if (q.alive) list.push(q); }
    if (!list.length) { this.overseas(); return; }
    if (r.chance(18)) { this.boat(); return; }
    if (r.chance(20)) {
      const q = r.pick(list);
      if (!g.friendly(p, q) && g.relation(p, q) >= 0 && !g.isTraitor(q) && g.requestAlliance(p, q)) return;
    }
    const target = this.choose(list);
    if (!target) { this.overseas(); return; }
    if (g.opts.arsenal) this.beam(target);
    if (p.troops / g.maxTroops(p) >= this.trigger) this.send(target);
  };

  AI.prototype.choose = function (list) {
    const g = this.g, p = this.p, r = g.rng, d = g.opts.difficulty;
    const foes = list.filter(function (q) { return !g.friendly(p, q); });
    // strike back at the heaviest attack against us
    let top = null, best = p.troops * 0.05;
    for (const a of p.inc) if (a.active && a.troops > best && foes.indexOf(a.a) >= 0) { best = a.troops; top = a.a; }
    if (top) return top;
    // stand by an ally who is being attacked by one of our neighbours
    for (const e of p.allies) {
      for (const a of g.players[e[0]].inc) if (a.active && foes.indexOf(a.a) >= 0 && r.chance(2)) return a.a;
    }
    // easy prey first: the most thinly held bot next door
    let bot = null, dens = Infinity;
    for (const q of foes) {
      if (q.type !== PT.BOT) continue;
      const v = q.troops / Math.max(1, q.tiles);
      if (v < dens) { dens = v; bot = q; }
    }
    if (bot) return bot;
    let hated = null, hv = -50;
    for (const q of foes) { const v = g.relation(p, q); if (v < hv) { hv = v; hated = q; } }
    if (hated) return hated;
    // otherwise the weakest neighbour or a random one; an ally is only attacked after a rare betrayal
    const byTroops = function (a, b) { return a.troops - b.troops; };
    list.sort(byTroops); foes.sort(byTroops);
    let q = r.chance(2) ? list[0] : r.pick(list);
    if (g.friendly(p, q)) {
      const careful = q.type === PT.HUMAN && d < 2 && !g.isTraitor(q);
      if (r.chance(careful ? 200 : 50)) { g.breakAlliance(p, q); return q; }
      if (!foes.length) return null;
      q = r.chance(2) ? foes[0] : r.pick(foes);
    }
    // on the lower levels nations mostly leave the human alone unless provoked
    if (q.type === PT.HUMAN && !g.isTraitor(q) && d < 2 && !r.chance(d === 0 ? 8 : 4)) {
      const others = foes.filter(function (o) { return o.type !== PT.HUMAN; });
      q = others.length ? r.pick(others) : null;
    }
    return q;
  };

  AI.prototype.embargoes = function () {
    const g = this.g, p = this.p;
    for (const e of p.rel) if (e[1] < -50) p.embargo.add(e[0]);
    for (const id of p.embargo) if (g.relation(p, g.players[id]) > -20) p.embargo.delete(id);
  };

  // ---------- picking tiles ----------
  AI.prototype.tileOf = function (q, inner) {
    const g = this.g, r = g.rng, W = g.W;
    if (q.x1 < q.x0) return -1;
    for (let i = 0; i < 40; i++) {
      const t = r.int(q.y0, q.y1 + 1) * W + r.int(q.x0, q.x1 + 1);
      if (g.owner[t] === q.id && (!inner || !q.border.has(t))) return t;
    }
    return -1;
  };
  AI.prototype.coastTile = function () {
    const g = this.g, r = g.rng, shore = g.map.shore;
    let pick = -1, n = 0;
    for (const t of this.p.border) {
      if (shore[t] !== 1 || g.portWater(t) < 0) continue;
      n++;
      if (r.next() * n < 1) pick = t;
    }
    return pick;
  };
  AI.prototype.frontTile = function (enemy) {
    const g = this.g, r = g.rng, own = g.owner, W = g.W, H = g.H, id = enemy.id;
    let pick = -1, n = 0;
    for (const t of this.p.border) {
      const x = t % W, y = (t - x) / W;
      if (!((x > 0 && own[t - 1] === id) || (x < W - 1 && own[t + 1] === id) ||
            (y > 0 && own[t - W] === id) || (y < H - 1 && own[t + W] === id))) continue;
      n++;
      if (r.next() * n < 1) pick = t;
    }
    return pick;
  };
  AI.prototype.nearOwn = function (t, rad) {
    const g = this.g, p = this.p, W = g.W, H = g.H, x0 = t % W, y0 = (t / W) | 0;
    for (let ring = 0; ring <= 2; ring++) {
      const rr = rad * ring / 2;
      for (let k = 0; k < 12; k++) {
        const x = Math.round(x0 + Math.cos(k * 0.5236) * rr), y = Math.round(y0 + Math.sin(k * 0.5236) * rr);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        const o = g.owner[y * W + x];
        if (o && (o === p.id || p.allies.has(o))) return true;
        if (!ring) break;
      }
    }
    return false;
  };

  // An own tile at a comfortable rail distance from the given one.
  AI.prototype.tileNear = function (tile) {
    const g = this.g, p = this.p, W = g.W, H = g.H, r = g.rng, d = g.R.structDist;
    const cx = tile % W, cy = (tile / W) | 0;
    for (let i = 0; i < 30; i++) {
      const a = r.next() * 6.2832, k = d * (1.3 + r.next() * 2);
      const x = Math.round(cx + Math.cos(a) * k), y = Math.round(cy + Math.sin(a) * k);
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const t = y * W + x;
      if (g.owner[t] === p.id && !p.border.has(t) && !g.structNear(t, d)) return t;
    }
    return -1;
  };

  // ---------- building ----------
  AI.prototype.construct = function () {
    const g = this.g, p = this.p, r = g.rng, c = p.cnt, d = g.opts.difficulty;
    const can = function (t, margin) { return p.gold >= g.cost(p, t) * (margin || 1); };
    if (g.res && g.digAuto(p)) return;              // version «Rohstoffe»: a nation works its deposits too
    if (c[UT.PORT] < 1 && can(UT.PORT)) {
      const t = this.coastTile();
      if (t >= 0 && g.build(p, UT.PORT, t)) return;
    }
    if (c[UT.CITY] < [2, 4, 8, 12][d] && can(UT.CITY)) {
      const t = this.tileOf(p, true);
      if (t >= 0 && g.build(p, UT.CITY, t)) return;
    }
    if (c[UT.CITY] >= 1 && c[UT.FACTORY] < [1, 2, 3, 4][d] && c[UT.FACTORY] <= c[UT.CITY] && can(UT.FACTORY, 1.3)) {
      const cities = p.units.filter(function (u) { return u.built && G.isStation(u.type); });
      const t = cities.length ? this.tileNear(r.pick(cities).tile) : -1;
      if (t >= 0 && g.build(p, UT.FACTORY, t)) return;
    }
    if (c[UT.PORT] >= 1 && c[UT.WARSHIP] < Math.min(3, c[UT.PORT]) && can(UT.WARSHIP, 1.5) && r.chance(3)) {
      const ports = p.units.filter(function (u) { return u.type === UT.PORT && u.built; });
      if (ports.length && g.build(p, UT.WARSHIP, r.pick(ports).water)) return;
    }
    // every nation gets a silo, richer ones more of them and with more missiles per load
    if (c[UT.SILO] < 1 + (d >= 2 ? 1 : 0) && can(UT.SILO, 1.2)) {
      const t = this.tileOf(p, true);
      if (t >= 0 && g.build(p, UT.SILO, t)) return;
    }
    if (c[UT.SILO] >= 1 && p.gold >= 4e6 && c[UT.SILO] < 2 + 2 * d) {
      const silo = p.units.find(function (u) { return u.type === UT.SILO && u.built && g.canUpgrade(p, u); });
      if (silo && g.upgrade(p, silo)) return;
    }
    if (d >= 1 && c[UT.SAM] < 1 && c[UT.CITY] > 0 && can(UT.SAM, 1.2)) {
      const t = this.tileOf(p, true);
      if (t >= 0 && g.build(p, UT.SAM, t)) return;
    }
    if (c[UT.PORT] >= 1 && c[UT.PORT] < 2 + d && c[UT.CITY] >= 2 && can(UT.PORT, 2) && r.chance(4)) {
      const t = this.coastTile();
      if (t >= 0 && g.build(p, UT.PORT, t)) return;
    }
    if (c[UT.DEFENSE] < 3 && can(UT.DEFENSE)) {
      let worst = null;
      for (const a of p.inc) if (a.active && a.troops > p.troops * 0.25 && (!worst || a.troops > worst.troops)) worst = a;
      if (worst) {
        const t = this.frontTile(worst.a);
        if (t >= 0) g.build(p, UT.DEFENSE, t);
      }
    }
  };

  // ---------- going to sea ----------
  AI.prototype.boat = function () {
    const g = this.g, p = this.p, r = g.rng, map = g.map, W = g.W, H = g.H, d = g.opts.difficulty;
    if (p.boats >= 2) return false;
    const s = this.coastTile();
    if (s < 0) return false;
    const sx = s % W, sy = (s / W) | 0, reach = g.R.boatBox * 1.5;
    for (let i = 0; i < 14; i++) {
      const ang = r.next() * 6.2832, cx = Math.cos(ang), cy = Math.sin(ang);
      let sea = false;
      for (let k = 2; k < reach; k++) {
        const x = Math.round(sx + cx * k), y = Math.round(sy + cy * k);
        if (x < 0 || y < 0 || x >= W || y >= H) break;
        const t = y * W + x, o = g.owner[t];
        if (!map.land[t]) { sea = true; continue; }
        if (!sea) { if (o === p.id) continue; break; }
        if (o === p.id) break;
        if (o) {
          const q = g.players[o];
          if (g.friendly(p, q)) break;
          if (q.type !== PT.BOT && d < 2 && g.relation(p, q) > -50) break;
        }
        const plan = g.boatPlan(p, t);
        if (plan && g.sendBoat(p, plan, p.troops / 5)) return true;
        break;
      }
    }
    return false;
  };

  // ---------- missiles ----------
  // Arsenal mode: now and then burn out one of the target's buildings from orbit.
  AI.prototype.beam = function (q) {
    const g = this.g, p = this.p, r = g.rng;
    if (g.opts.difficulty < 1 || q.type === PT.BOT || g.friendly(p, q) || g.ticks < g.immuneUntil) return;
    if ((p.laserAt || 0) > g.ticks || p.gold < 900000 || !r.chance(3)) return;
    const cands = [];
    for (const u of q.units) if (u.type <= UT.FACTORY && !this.nearOwn(u.tile, g.R.laserOut + 3)) cands.push(u.tile);
    if (cands.length) g.build(p, UT.LASER, r.pick(cands));
  };
  // Whom to bomb: anybody who is not a bot or a friend, wherever they live (a bomb has no range).
  // The more a nation dislikes someone, and the bigger and more human they are, the likelier the choice.
  AI.prototype.nukeTarget = function () {
    const g = this.g, p = this.p, r = g.rng;
    let best = null, bs = -Infinity;
    for (let i = 1; i < g.players.length; i++) {
      const o = g.players[i];
      if (!o || o === p || !o.alive || o.type === PT.BOT || g.friendly(p, o)) continue;
      const s = -g.relation(p, o) + o.tiles / Math.max(1, g.map.landTiles) * 150 + (o.type === PT.HUMAN ? 25 : 0) + r.next() * 40;
      if (s > bs) { bs = s; best = o; }
    }
    return best;
  };
  // Called every turn of a nation: pick a target and fire as often as the silos allow.
  AI.prototype.nuke = function () {
    const g = this.g, p = this.p, r = g.rng;
    if (p.cnt[UT.SILO] < 1 || g.ticks < g.immuneUntil || g.ticks - g.playStart < G.NUKE_PEACE) return;
    if (g.opts.difficulty === 0 && !r.chance(3)) return;   // the easiest nations fire less often
    const q = this.nukeTarget();
    if (!q) return;
    for (let i = 0; i < 4; i++) if (!this.strikeFromAir(q)) break;
  };
  // Returns true when a missile was launched.
  AI.prototype.strikeFromAir = function (q) {
    const g = this.g, p = this.p, r = g.rng, d = g.opts.difficulty, W = g.W;
    if (q.type === PT.BOT || p.cnt[UT.SILO] < 1 || g.friendly(p, q) || g.ticks < g.immuneUntil) return false;
    // knock out an air defence first, so the big bombs get through
    if (q.cnt[UT.SAM] > 0 && p.gold >= 1.5e6 && r.chance(2)) {
      const s = q.units.find(function (u) { return u.type === UT.SAM && u.built; });
      if (s && g.build(p, UT.CRUISE, s.tile)) return true;
    }
    let type = -1;
    if (d >= 2 && p.gold >= 26e6 && q.tiles > g.map.landTiles * 0.12) type = UT.MIRV;
    else if (d >= 2 && p.gold >= 6e6 && q.tiles > 3000) type = UT.HYDRO;
    else if (p.gold >= 1e6) type = UT.ATOM;
    if (type < 0) return false;
    const rad = type === UT.HYDRO ? g.R.hydroOut : g.R.atomOut;
    const cands = [];
    for (const u of q.units) if (u.type <= UT.FACTORY) cands.push(u.tile);
    for (let i = 0; i < 8; i++) { const t = this.tileOf(q, false); if (t >= 0) cands.push(t); }
    let best = -1, bs = -1;
    for (const t of cands) {
      if (type !== UT.MIRV && this.nearOwn(t, rad + 3)) continue;
      const x = t % W, y = (t / W) | 0;
      let s = r.next();
      for (const u of q.units) {
        if (u.type > UT.FACTORY) continue;
        if ((u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= rad * rad) s += 1;
      }
      if (s > bs) { bs = s; best = t; }
    }
    return best >= 0 && !!g.build(p, type, best);
  };
  // Nobody left to fight over land: pick a rival across the water, bomb it and land troops there.
  AI.prototype.rival = function () {
    const g = this.g, p = this.p, d = g.opts.difficulty;
    let q = null, hv = -50;
    for (const e of p.rel) {
      const o = g.players[e[0]];
      if (o && o.alive && !g.friendly(p, o) && e[1] < hv) { hv = e[1]; q = o; }
    }
    if (q) return q;
    for (let i = 1; i < g.players.length; i++) {
      const o = g.players[i];
      if (!o.alive || o === p || g.friendly(p, o)) continue;
      if (o.type === PT.HUMAN && d < 2 && !g.isTraitor(o)) continue;
      if (!q || o.tiles > q.tiles) q = o;
    }
    return q;
  };
  AI.prototype.overseas = function () {
    const g = this.g, p = this.p, r = g.rng;
    const q = this.rival();
    if (!q) { if (r.chance(4)) this.boat(); return; }
    if (p.boats >= 2 || !r.chance(2) || p.troops / g.maxTroops(p) < this.trigger * 0.8) return;
    for (let i = 0; i < 12; i++) {
      const t = this.tileOf(q, false);
      if (t < 0) break;
      const plan = g.boatPlan(p, t);
      if (plan) { g.sendBoat(p, plan, p.troops / 4); return; }
    }
    if (r.chance(3)) this.boat();
  };

  // Answer to an alliance request (or to a request to renew one).
  AI.prototype.decide = function (from, renew) {
    const g = this.g, p = this.p;
    if (g.isTraitor(from)) return false;
    if (p.type === PT.BOT) return true;
    if (g.relation(p, from) < 0) return false;
    for (const a of from.out) if (a.active && a.tid === p.id) return false;
    if (renew) return true;
    if (from.troops > p.troops * 3) return true;
    if (from.type === PT.HUMAN) return from.allies.size < 4;
    // computer players keep few alliances among themselves and do not ally with easy prey
    return from.allies.size < 2 && p.allies.size < 2 && from.troops > p.troops * 0.5;
  };

  G.AI = AI;
})(globalThis.G = globalThis.G || {});
