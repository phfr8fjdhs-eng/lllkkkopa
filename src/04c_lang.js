(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const Game = G.Game, PT = G.PT, UT = G.UT, within = G.within;

  // ---------- mode «Langes Spiel» (opts.lang, doku/langes-spiel.md) ----------
  // Rules that only exist in the mode. The numbers are in G.LANG (src/03_game.js). Everything here
  // runs only with this.lang; the classic game never calls it.
  //
  // Every 50 ticks (5 s), spread over the players by id:
  //   - which own cells are front (touch a realm one is not allied with), and how many troops of
  //     each neighbour stand in its cells along the common border (one pass over the border tiles)
  //   - the warning «Truppen sammeln sich an deiner Grenze (X)» when that number rises fast
  //   - wear on cells far denser than the own front (from minute 20)
  // Cost: the border tiles of the realms with a net, every 5 s; nothing grows with the whole map.
  const EVERY = 50;

  Game.prototype.langTick = function () {
    const T = this.ticks, ps = this.posted;
    if (this.phase !== 'play') return;
    if (this.armed && this.armed.length) this.langArmTick();
    if (this.salvoQ && this.salvoQ.length) this.langSalvoTick();
    if (T % EVERY === 0) for (let i = 0; i < this.humans.length; i++) { const h = this.humans[i]; if (h.evacW || h.units.some(function (u) { return u.evac !== undefined; })) this.langEvacW(h); }
    if (!ps) return;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (!p.post || !p.alive || (T + p.id * 13) % EVERY !== 0) continue;
      const seen = this.langFront(p);
      if (p.type === PT.HUMAN) this.langMass(p, seen);
      if (T - this.playStart >= this.wearFrom) this.langWear(p);
    }
  };

  // Front cells of p (kept in p.post.front, a Set of cell ids) and, per neighbour with a net,
  // the cells of that neighbour along the border. Returns Map(neighbour id -> Set of their cells).
  Game.prototype.langFront = function (p) {
    const own = this.owner, W = this.W, N = this.N, ps = this.players, pid = p.id;
    const front = p.post.front || (p.post.front = new Set());
    front.clear();
    const seen = new Map();
    for (const t of p.border) {
      const x = t % W;
      for (let k = 0; k < 4; k++) {
        const n = k === 0 ? (x > 0 ? t - 1 : -1) : k === 1 ? (x < W - 1 ? t + 1 : -1) : k === 2 ? t - W : t + W;
        if (n < 0 || n >= N) continue;
        const o = own[n];
        if (!o || o === pid) continue;
        const q = ps[o];
        if (q.type === PT.BOT || this.friendly(p, q)) continue;
        front.add(this.cellOf(t));
        if (!q.post) continue;
        let s = seen.get(o);
        if (!s) { s = new Set(); seen.set(o, s); }
        s.add(this.cellOf(n));
      }
    }
    return seen;
  };

  // The warning: how dense a neighbour stands along the common border (1 = his average), a
  // minute ago and now. It comes only for a big rise: the density grows by G.LANG.massRise (and
  // is above average by as much), and the troops there grow by G.LANG.massShare of one's own
  // army. Plain growth of the whole realm does not count, it lifts every cell alike. Then not
  // again for that neighbour for G.LANG.massQuiet ticks.
  Game.prototype.langMass = function (p, seen) {
    const L = G.LANG, T = this.ticks, ps = this.players;
    const mass = p.mass || (p.mass = {});
    const slots = Math.round(L.massSpan / EVERY);
    for (const e of seen) {
      const q = ps[e[0]];
      let sum = 0, n = 0;
      for (const id of e[1]) { const c = q.post.cells.get(id); if (c) { sum += this.postReal(q, c); n += c.n; } }
      const dens = n > 0 && q.tiles > 0 && q.troops > 0 ? sum / n / (q.troops / q.tiles) : 1;
      let m = mass[q.id];
      if (!m) { m = mass[q.id] = { d: [], t: [], quiet: 0 }; }
      m.d.push(Math.round(dens * 1000) / 1000); m.t.push(Math.round(sum));
      if (m.d.length > slots) { m.d.shift(); m.t.shift(); }
      if (m.d.length < 2 || T < m.quiet) continue;
      // against the thinnest moment of the last minute
      let lo = 0;
      for (let j = 1; j < m.d.length; j++) if (m.d[j] < m.d[lo]) lo = j;
      const k = 1 + L.massRise;
      if (dens >= k * m.d[lo] && dens >= k && sum - m.t[lo] >= L.massShare * p.troops) {
        m.quiet = T + L.massQuiet;
        if (p === this.human) this.say('Truppen sammeln sich an deiner Grenze (' + q.name + ')', 'warn');
        this.emit({ k: 'mass', p: p.id, q: q.id });
      }
    }
    // neighbours no longer at the border are forgotten
    for (const k in mass) if (!seen.has(+k)) delete mass[k];
  };

  // Supply of a cell, 0 to 1: a railway in or next to it, an own city or port nearby. Full
  // supply means no wear at all.
  Game.prototype.langSupply = function (p, id) {
    const L = G.LANG, CW = this.CW, cx = id % CW, cy = (id - cx) / CW;
    let v = 0;
    if (this.cellRail) v = within((1 - this.cellRail[id]) / (1 - L.rail[0]), 0, 1);
    if (v >= 1) return 1;
    const CS = G.POST.cell;
    for (const u of p.units) {
      if (!u.active || !u.built || (u.type !== UT.CITY && u.type !== UT.PORT)) continue;
      const d = Math.max(Math.abs(Math.floor(u.x / CS) - cx), Math.abs(Math.floor(u.y / CS) - cy));
      if (d > 2) continue;
      const w = (u.type === UT.CITY ? within(0.4 + 0.15 * u.level, 0, 1) : 0.6) * (d <= 1 ? 1 : 0.5);
      if (w > v) v = w;
      if (v >= 1) return 1;
    }
    return v;
  };

  // Wear: a front cell more than G.LANG.wearOver times as dense as the average of the own front
  // loses G.LANG.wear of what stands above that line per minute, less with supply.
  Game.prototype.langWear = function (p) {
    const L = G.LANG, post = p.post, front = post.front;
    if (!front || front.size < 2 || !(post.H > 0) || !(p.troops > 0) || p.tiles <= 0) return;
    let sum = 0, n = 0;
    for (const id of front) { const c = post.cells.get(id); if (c && c.n > 0) { sum += this.postDens(p, c); n++; } }
    if (n < 2) return;
    const avg = sum / n, line = L.wearOver * avg, per = post.H / p.tiles, rate = L.wear * EVERY / 600;
    let lost = 0;
    for (const id of front) {
      const c = post.cells.get(id);
      if (!c || c.n <= 0) continue;
      const top = line * per * c.n;
      if (c.u <= top) continue;
      const v = this.langSupply(p, id);
      if (v >= 1) continue;
      const uu = (c.u - top) * rate * (1 - v);
      c.u -= uu; lost += uu;
    }
    if (!(lost > 0)) return;
    const H0 = post.H;
    post.H = H0 - lost;
    p.troops = p.troops * post.H / H0;
    p.wearLost = (p.wearLost || 0) + p.troops * lost / Math.max(1, post.H);
    if (p === this.human && this.ticks >= (p.wearSaid || 0)) { p.wearSaid = this.ticks + 3000; this.say('Deine Truppen an der überdichten Front nutzen sich ab. Eine Stadt oder Schiene in der Nähe versorgt sie.', 'warn'); }
  };

  // ---------- two air defences ----------
  // Class 0 (air defence) shoots at cruise missiles and the conventional weapons of Paket 2 (the
  // short-range missile it picks up only inside a quarter of its reach; later also planes),
  // class 1 (missile defence) at atom and hydrogen bombs and MIRV warheads.
  Game.prototype.samCan = function (u, type) {
    return u.cls ? type === UT.ATOM || type === UT.HYDRO || type === UT.WARHEAD : type === UT.CRUISE || G.LANG_WEAPON(type);
  };
  // Shots per salvo: class 0 G.LANG.samShots per level, class 1 1 + floor(level / 4).
  Game.prototype.samShotsOf = function (u) {
    return u.cls ? 1 + Math.floor(u.level / 4) : G.LANG.samShots * u.level;
  };
  Game.prototype.samSlots = function (u) {
    const n = this.samShotsOf(u), r = u.ready || (u.ready = []);
    while (r.length < n) r.push(0);
    if (r.length > n) r.length = n;
  };
  // Reload in ticks, times the stacking: the oldest of the own launchers of a class standing within
  // reach of each other reloads at full speed, the next at half, the third at a quarter...
  Game.prototype.samReload = function (u) {
    const L = G.LANG, base = u.cls ? Math.round(L.abmReload * 8 / (u.level + 7)) : L.samReload;
    if (u.stackSig !== this.samSig) {
      u.stackSig = this.samSig;
      const r = this.samRange(u), r2 = r * r;
      let k = 0;
      for (const v of u.owner.units) {
        if (v === u || v.type !== UT.SAM || !v.built || !v.active || (v.cls || 0) !== (u.cls || 0) || v.id > u.id) continue;
        if ((v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y) <= r2) k++;
      }
      u.stackF = Math.pow(L.abmStack, k);
    }
    return Math.round(base / u.stackF);
  };

  // ---------- bombs on cities, evacuating, shelters ----------
  // The people of a city: its share of the troop limit, as full as the realm is.
  Game.prototype.cityPeople = function (p, level) {
    const max = this.maxTroops(p);
    return max > 0 ? 250000 * level * within(p.troops / max, 0, 1) : 0;
  };
  // Is city u evacuated (an order not older than G.LANG.evacHold)?
  Game.prototype.evacuated = function (u) { return u.evac !== undefined && this.ticks - u.evac <= G.LANG.evacHold; };
  // A bomb hits a city (inner ring or outer): it loses levels, its people die (fewer if evacuated).
  Game.prototype.cityHit = function (u, type, inner) {
    const L = G.LANG, p = u.owner, L0 = u.level;
    let f = L.cityHit[type] * (inner ? 1 : 0.5);
    if (u.shelter) f *= L.shelter;
    const lost = f >= 1 ? L0 : Math.min(L0, Math.max(1, Math.round(L0 * f)));
    const L1 = L0 - lost, evac = this.evacuated(u);
    let dead = evac ? L.evacDie * this.cityPeople(p, L1 > 0 ? L1 : L0) : this.cityPeople(p, L0);
    if (!inner) dead *= 0.5;
    if (u.shelter) dead *= L.shelter;
    dead = Math.min(dead, p.troops);
    p.troops -= dead;
    if (L1 <= 0) this.removeUnit(u);
    else { u.level = L1; p.cnt[UT.CITY] -= lost; p.cityLv -= lost; }
    if (p === this.human) this.say((L1 <= 0 ? 'Stadt zerstört' : 'Stadt verliert ' + lost + ' Stufe' + (lost === 1 ? '' : 'n')) + ', ' + G.fmtTroops(dead) + ' Tote' + (evac ? ' (evakuiert)' : ''), 'bad');
  };
  // How far a bomb's blast reaches (outer ring).
  Game.prototype.blastOut = function (type) {
    const R = this.R;
    return type === UT.HYDRO ? R.hydroOut : type === UT.ATOM ? R.atomOut : type === UT.MIRV ? R.mirvRange : R.headOut;
  };
  // Enemy bombs on their way to city u (atom, hydrogen, MIRV, warheads): the one due first, or null.
  Game.prototype.cityThreat = function (u) {
    let best = null, bt = 1e9;
    for (const n of this.nukes) {
      if (!n.active || (n.type !== UT.ATOM && n.type !== UT.HYDRO && n.type !== UT.MIRV && n.type !== UT.WARHEAD)) continue;
      if (n.owner === u.owner || this.friendly(n.owner, u.owner)) continue;
      const r = this.blastOut(n.type) + 2;
      if ((n.dx - u.x) * (n.dx - u.x) + (n.dy - u.y) * (n.dy - u.y) > r * r) continue;
      const eta = Math.ceil((1 - n.prog) * n.dist / Math.max(0.01, n.speed)) + (n.delay || 0);
      if (eta < bt) { bt = eta; best = n; }
    }
    return best ? { n: best, eta: bt } : null;
  };
  // Order: evacuate an own city with a bomb on its way.
  Game.prototype.evacuate = function (p, tile) {
    const u = this.structNear(tile, 4);
    if (!u || u.owner !== p || u.type !== UT.CITY || !u.built) return 'Keine eigene Stadt';
    if (this.evacuated(u)) return 'Die Stadt wird schon evakuiert';
    if (!this.cityThreat(u)) return 'Keine Bombe im Anflug';
    u.evac = this.ticks;
    this.langEvacW(p);
    return '';
  };
  // Order: shelters for an own city (an upgrade, no building of its own).
  Game.prototype.buildShelter = function (p, tile) {
    const u = this.structNear(tile, 4), c = G.LANG.shelterCost;
    if (!u || u.owner !== p || u.type !== UT.CITY || !u.built) return 'Keine eigene Stadt';
    if (u.shelter) return 'Hat schon Schutzräume';
    if (p.gold < c && !(p.type === PT.HUMAN && this.opts.infiniteGold)) return 'Zu wenig Gold';
    p.gold -= c; u.shelter = 1;
    return '';
  };
  // How much of the growth p's evacuated cities hold back: 0 for evacStop ticks, then back over
  // evacBack ticks. Worked out on an order and every 50 ticks (langTick), not every tick.
  Game.prototype.langEvacW = function (p) {
    const L = G.LANG, T = this.ticks, max = this.maxTroops(p);
    let w = 0, any = false;
    for (const u of p.units) {
      if (u.type !== UT.CITY || u.evac === undefined) continue;
      const k = T - u.evac, back = k <= L.evacStop ? 0 : (k - L.evacStop) / L.evacBack;
      if (back >= 1) { delete u.evac; continue; }
      any = true; w += 250000 * u.level * (1 - back);
    }
    p.evacW = any && max > 0 ? within(w / max, 0, 1) : 0;
  };

  // ---------- weapons (Paket 2) ----------
  const NUCLEAR = function (t) { return t === UT.ATOM || t === UT.HYDRO || t === UT.MIRV; };
  G.isNuclear = NUCLEAR;
  // Reach from the silo in tiles of this map: G.LANG.range is in tiles of the Earth (5600 wide),
  // scaled to the width of the map, but as if it were at least G.LANG.rangeW wide: on a small map
  // the weapons would otherwise reach only a few tiles.
  Game.prototype.weaponReach = function (type) {
    const r = G.LANG.range[type];
    return r ? r / 5600 * Math.max(this.W, G.LANG.rangeW) : Infinity;
  };
  // Why p may not fire this weapon now ('' if he may): nuclear weapons only late in the game.
  Game.prototype.weaponWhy = function (p, type) {
    const from = G.LANG.nukeFrom[type];
    if (from && this.ticks - this.playStart + this.langEarly < from) return G.UNAME[type].replace('\u00AD', '') + ' erst ab Minute ' + Math.round(from / 600);
    return '';
  };
  // A nuclear weapon is armed in the silo for G.LANG.arm ticks, then flies. Everybody sees it.
  Game.prototype.armSilo = function (p, type, silo, tile) {
    const T = this.ticks;
    for (let i = 0; i < silo.ready.length; i++) if (silo.ready[i] <= T) { silo.ready[i] = T + G.LANG.arm[type] + G.SILO_RELOAD; break; }
    silo.arm = { type: type, tile: tile, at: T + G.LANG.arm[type], from: T };
    (this.armed || (this.armed = [])).push(silo);
    const h = this.human;
    if (h && h !== p) this.say('Raketensilo von ' + p.name + ' macht eine ' + G.UNAME[type].replace('\u00AD', '') + ' scharf', 'bad');
    else if (h === p) this.say(G.UNAME[type].replace('\u00AD', '') + ' wird scharfgemacht: Start in ' + Math.round(G.LANG.arm[type] / 10) + ' s', 'warn');
    this.emit({ k: 'arm', p: p.id, s: silo.id });
    return silo;
  };
  Game.prototype.langArmTick = function () {
    const T = this.ticks, list = this.armed;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i], a = s.arm;
      if (!s.active || !a) { if (s.active) s.arm = null; list.splice(i, 1); continue; }
      if (T < a.at) continue;
      s.arm = null; list.splice(i, 1);
      if (s.owner.alive) this.launch(s.owner, a.type, s, a.tile);
    }
  };
  // Second strike: whoever a nuclear weapon hits fires what his silos are arming at once.
  Game.prototype.langNukeHit = function (type, cx, cy, r) {
    if (!(NUCLEAR(type) || type === UT.WARHEAD) || !this.armed || !this.armed.length) return;
    const own = this.owner, W = this.W, t = Math.round(cy) * W + Math.round(cx), o = own[t];
    if (!o) return;
    for (const s of this.armed) if (s.active && s.arm && s.owner.id === o) s.arm.at = Math.min(s.arm.at, this.ticks + 1);
  };
  // After a launch: a nuclear weapon makes an outcast of whoever fired it, a cruise missile makes
  // the next one dearer.
  Game.prototype.langLaunch = function (p, u) {
    const T = this.ticks, type = u.type;
    if (type === UT.CRUISE) { const l = p.cruiseT || (p.cruiseT = []); l.push(T); while (l.length && l[0] < T - G.LANG.cruiseCool) l.shift(); }
    if (!NUCLEAR(type)) return;
    p.outlawUntil = T + G.LANG.outlaw;
    for (const id of Array.from(p.allies.keys())) { const q = this.players[id]; if (q) this.breakAlliance(p, q); }
    this.say(p === this.human ? 'Du hast eine Atomwaffe eingesetzt: Bündnisse gebrochen, ' + Math.round(G.LANG.outlaw / 600) + ' Minuten kein Handel, alle kämpfen härter gegen dich' : p.name + ' hat eine Atomwaffe eingesetzt und ist geächtet', 'bad');
  };
  // A planned strike (command salvo): several targets, each with its weapon and silo, timed so that
  // all land at once. The one that takes longest (arming included) starts now, the others later.
  // Each start is checked and paid for when it comes, like a single order.
  Game.prototype.salvo = function (p, list) {
    if (!Array.isArray(list) || !list.length || list.length > 12) return 'Nicht möglich';
    const T = this.ticks, W = this.W, plan = [];
    let top = 0;
    for (const e of list) {
      const t = e && e.t | 0, u = e && e.u | 0;
      if (!(t >= 0 && t < this.N) || !(u >= UT.ATOM) || u === UT.LASER || u === UT.WARHEAD) return 'Nicht möglich';
      const c = this.buildCheck(p, u, t, 0, false, e.s | 0);
      if (!c.silo) return c.why || 'Nicht möglich';
      const d = Math.max(1, Math.hypot(t % W - c.silo.x, ((t / W) | 0) - c.silo.y));
      const sp = this.R.nukeSpeed * (u === UT.SRBM ? G.LANG.srbmSpeed : G.lowFly(u) ? 1.6 : 1);
      const need = Math.ceil(d / sp) + (G.LANG.arm[u] || 0);
      if (need > top) top = need;
      plan.push({ u: u, t: t, s: c.silo.id, need: need });
    }
    const q = this.salvoQ || (this.salvoQ = []);
    for (const e of plan) q.push({ p: p.id, u: e.u, t: e.t, s: e.s, at: T + top - e.need });
    return '';
  };
  Game.prototype.langSalvoTick = function () {
    const q = this.salvoQ, T = this.ticks;
    for (let i = 0; i < q.length; i++) {
      const e = q[i];
      if (e.at > T) continue;
      q.splice(i--, 1);
      const p = this.players[e.p];
      if (!p || !p.alive) continue;
      const done = this.build(p, e.u, e.t, 0, false, e.s);
      if (!done && p === this.human) this.say('Geplanter Schlag: ' + G.UNAME[e.u].replace('\u00AD', '') + ' konnte nicht starten', 'warn');
    }
  };
  Game.prototype.cruiseHeatOf = function (p) {
    const l = p.cruiseT;
    if (!l) return 0;
    let n = 0;
    for (let i = 0; i < l.length; i++) if (l[i] >= this.ticks - G.LANG.cruiseCool) n++;
    return n;
  };
  Game.prototype.outlawed = function (p) { return !!p && p.outlawUntil > this.ticks; };
  // A nuclear power: from minute 30 on, whoever has a silo (everyone sees it, it deters).
  Game.prototype.nuclearPower = function (p) {
    if (!this.lang || this.ticks - this.playStart + this.langEarly < G.LANG.nukeFrom[UT.ATOM]) return false;
    return p.cnt[UT.SILO] > 0;
  };
  // A cruise missile or short-range missile takes a share of a building's levels (at least one; a
  // building on level 1 falls). Shelters of a city halve it.
  Game.prototype.structHit = function (v) {
    const o = v.owner, L0 = v.level;
    let f = G.LANG.share;
    if (v.shelter) f *= G.LANG.shelter;
    const lost = L0 <= 1 ? 1 : Math.min(L0, Math.max(1, Math.round(L0 * f)));
    if (lost >= L0) { this.removeUnit(v); return; }
    v.level = L0 - lost; o.cnt[v.type] -= lost;
    if (v.type === UT.CITY) o.cityLv -= lost;
    else if (v.type === UT.DEFENSE) this.dirtyDisc(v.tile);
    if (v.ready) { if (v.type === UT.SAM) this.samSlots(v); else if (v.ready.length > v.level) v.ready.length = v.level; }
    if (o === this.human) this.say(G.UNAME[v.type].replace('\u00AD', '') + ' verliert ' + lost + ' Stufe' + (lost === 1 ? '' : 'n'), 'bad');
  };

  // ---------- digging in and defence posts ----------
  // A cell that loses nothing digs in: from 0 to 1 within G.LANG.digTicks. Every tile it loses
  // takes G.LANG.digDrop of it again. Fresh land starts at 0.
  Game.prototype.digOf = function (c) {
    if (!c || c.dig0 === undefined) return 0;
    return within((this.ticks - c.dig0) / G.LANG.digTicks, 0, 1);
  };
  Game.prototype.digLose = function (c) {
    const e = this.digOf(c), L = G.LANG;
    c.dig0 = this.ticks - Math.max(0, e - L.digDrop) * L.digTicks;
  };
  // What a defence post does to a tile it covers: [factor on losses, factor on time].
  Game.prototype.postMag = function (level) { return this.lang ? G.LANG.postLoss[0] + G.LANG.postLoss[1] * level : 3 + 2 * level; };
  Game.prototype.postSpd = function (level) { return this.lang ? 1 + G.LANG.postTime * level : 1 + 2 * level; };

})(globalThis.G = globalThis.G || {});
