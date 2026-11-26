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
    if (T % EVERY === 7) this.langBases();
    if (T % 10 === 3) this.langResearch();
    if (T % EVERY === 0) for (let i = 0; i < this.humans.length; i++) {
      const h = this.humans[i];
      // civil defence (research): threatened cities evacuate by themselves
      if (this.has(h, 'zivil') && this.nukes.length) for (const u of h.units) if (u.type === UT.CITY && u.built && !this.evacuated(u) && this.cityThreat(u)) u.evac = T;
      if (h.evacW || h.units.some(function (u) { return u.evac !== undefined; })) this.langEvacW(h);
    }
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
      const d = Math.max(Math.abs(Math.floor(u.x / CS) - cx), Math.abs(Math.floor(u.y / CS) - cy)), infra = this.has(p, 'infra');
      if (d > (infra ? 4 : 2)) continue;
      const w = (u.type === UT.CITY ? within(infra ? 0.5 * u.level : 0.4 + 0.15 * u.level, 0, 1) : 0.6) * (d <= (infra ? 2 : 1) ? 1 : 0.5);
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
    const avg = sum / n, line = L.wearOver * avg, per = post.H / p.tiles, rate = L.wear * EVERY / 600 * (this.has(p, 'tief') ? 0.5 : 1);
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
    if (u.cls === 2) return false;
    if (u.cls) return (type === UT.ATOM && this.has(u.owner, 'abm3')) || (type === UT.HYDRO && this.has(u.owner, 'abm4')) || (type === UT.WARHEAD && this.has(u.owner, 'abm5'));
    return type === UT.CRUISE || G.LANG_WEAPON(type);
  };
  // Shots per salvo: class 0 G.LANG.samShots per level, class 1 1 + floor(level / 4).
  Game.prototype.samShotsOf = function (u) {
    if (u.cls === 2) return 0;   // a radar only looks
    const o = u.owner;
    return u.cls ? 1 + Math.floor(u.level / 4) : (G.LANG.samShots + (this.has(o, 'abw2') ? 1 : 0) + (this.has(o, 'abw3a') ? 1 : 0)) * u.level;
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
    return Math.round(base / u.stackF * (this.has(u.owner, 'abw4') ? 0.7 : 1));
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
    if (u.shelter) f *= this.shelterF(p);
    const lost = f >= 1 ? L0 : Math.min(L0, Math.max(1, Math.round(L0 * f)));
    const L1 = L0 - lost, evac = this.evacuated(u);
    let dead = evac ? L.evacDie * this.cityPeople(p, L1 > 0 ? L1 : L0) : this.cityPeople(p, L0);
    if (!inner) dead *= 0.5;
    if (u.shelter) dead *= this.shelterF(p);
    dead = Math.min(dead, p.troops);
    p.troops -= dead;
    if (L1 <= 0) this.removeUnit(u);
    else { u.level = L1; p.cnt[UT.CITY] -= lost; p.cityLv -= lost; }
    if (p === this.human) this.say((L1 <= 0 ? 'Stadt zerstört' : 'Stadt verliert ' + lost + ' Stufe' + (lost === 1 ? '' : 'n')) + ', ' + G.fmtTroops(dead) + ' Tote' + (evac ? ' (evakuiert)' : ''), 'bad');
  };
  Game.prototype.shelterF = function (p) { return this.has(p, 'schutz2') ? G.LANG.shelter2 : G.LANG.shelter; };
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
    if (!this.has(p, 'schutz')) return 'Braucht Forschung: Schutzräume';
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
  Game.prototype.weaponReach = function (type, p) {
    const r = G.LANG.range[type];
    return r ? r / 5600 * Math.max(this.W, G.LANG.rangeW) * (p && G.LANG_WEAPON(type) || p && type === UT.CRUISE ? (this.has(p, 'rakR') ? 1.25 : 1) : 1) : Infinity;
  };
  // Why p may not fire this weapon now ('' if he may): nuclear weapons only late in the game.
  Game.prototype.weaponWhy = function (p, type) {
    const need = this.techFor(type, 0);
    if (need && p.type === PT.HUMAN && !this.has(p, need)) return 'Braucht Forschung: ' + G.TECH_BY[need].name;
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
  // Research on the speed of weapons: Tempo (conventional x1.3), Hyperschall (cruise and short-range x1.5).
  Game.prototype.weaponPace = function (p, type) {
    let k = 1;
    if ((G.LANG_WEAPON(type) || type === UT.CRUISE) && this.has(p, 'rakS')) k *= 1.3;
    if ((type === UT.CRUISE || type === UT.SRBM) && this.has(p, 'hyper')) k *= 1.5;
    return k;
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
    return this.structHitBy(v, null);
  };
  Game.prototype.structHitBy = function (v, by) {
    const o = v.owner, L0 = v.level;
    let f = by && this.has(by, 'rakA2') ? 0.5 : by && this.has(by, 'rakA1') ? 0.35 : G.LANG.share;
    if (v.shelter) f *= this.shelterF(o);
    const lost = L0 <= 1 ? 1 : Math.min(L0, Math.max(1, Math.round(L0 * f)));
    if (lost >= L0) { this.removeUnit(v); return; }
    v.level = L0 - lost; o.cnt[v.type] -= lost;
    if (v.type === UT.CITY) o.cityLv -= lost;
    else if (v.type === UT.DEFENSE) this.dirtyDisc(v.tile);
    if (v.ready) { if (v.type === UT.SAM) this.samSlots(v); else if (v.ready.length > v.level) v.ready.length = v.level; }
    if (o === this.human) this.say(G.UNAME[v.type].replace('\u00AD', '') + ' verliert ' + lost + ' Stufe' + (lost === 1 ? '' : 'n'), 'bad');
  };

  // ---------- Paket 3: reconnaissance, alliances, bases ----------
  // How long two realms have been allied, in ticks (-1: not allied).
  Game.prototype.allyAge = function (a, b) {
    const al = a.allies.get(b.id);
    return al ? this.ticks - (al.since || 0) : -1;
  };
  // What an alliance gives with time: the partner's sight after G.LANG.allySight, his radar and
  // bases in his land after G.LANG.allyRadar. A new alliance starts at nought.
  Game.prototype.allySees = function (a, b) { return this.allyAge(a, b) >= G.LANG.allySight; };
  Game.prototype.allyRadar = function (a, b) { return this.allyAge(a, b) >= G.LANG.allyRadar; };
  // Reach of a radar: (radarR[0] + radarR[1] x √level) x S tiles.
  Game.prototype.radarRange = function (u) { return Math.round((G.LANG.radarR[0] + G.LANG.radarR[1] * Math.sqrt(u.level)) * this.S * (this.has(u.owner, 'auf2') ? 1.5 : 1)); };
  // A spy (order spy): for G.LANG.spyTicks p sees q's troops, density and buildings.
  Game.prototype.sendSpy = function (p, q) {
    const better = this.has(p, 'spy2'), c = G.LANG.spyCost * (better ? 0.5 : 1);
    if (!q.alive) return 'Nicht möglich';
    if (p.gold < c && !this.opts.infiniteGold) return 'Zu wenig Gold';
    p.gold -= c;
    (p.spy || (p.spy = {}))[q.id] = this.ticks + G.LANG.spyTicks * (better ? 2 : 1);
    if (p === this.human) this.say('Spion in ' + q.name + ': ' + Math.round(G.LANG.spyTicks / 600) + ' Minuten lang siehst du dort alles', 'good');
    return '';
  };
  Game.prototype.spying = function (p, q) { return !!p.spy && p.spy[q.id] > this.ticks; };
  // Does p know q well: himself, an ally of long standing, or under a spy's eye.
  Game.prototype.knows = function (p, q) {
    return p === q || (!!p && !!q && (this.allySees(p, q) || this.spying(p, q)));
  };
  // A base: p may build a port, silo or radar in the land of an ally of G.LANG.allyRadar ticks who
  // lets him (a nation always does). The base is p's; it stands in the host's land.
  const BASE_TYPES = function (t) { return t === UT.PORT || t === UT.SILO || t === UT.SAM; };
  Game.prototype.baseHost = function (p, tile, type) {
    const o = this.owner[tile], q = o ? this.players[o] : null;
    if (!q || !BASE_TYPES(type) || !this.allyRadar(p, q)) return null;
    if (q.type === PT.HUMAN && !(q.hostOk && q.hostOk[p.id])) return null;
    return q;
  };
  Game.prototype.baseWhy = function (p, tile, type) {
    const q = this.players[this.owner[tile]];
    if (!BASE_TYPES(type)) return 'Als Stützpunkt nur Hafen, Silo oder Flugabwehr';
    if (!this.allyRadar(p, q)) return 'Stützpunkte erst nach ' + Math.round(G.LANG.allyRadar / 600) + ' Minuten Bündnis';
    return q.name + ' erlaubt keine Stützpunkte';
  };
  // Every 50 ticks: bases pay their rent; a base whose alliance has ended goes to the host after
  // G.LANG.baseLeave ticks.
  Game.prototype.langBases = function () {
    const T = this.ticks, L = G.LANG;
    for (const u of this.structAt.values()) {
      if (!u.base || !u.built) continue;
      const host = this.players[u.base], p = u.owner;
      if (!host || !host.alive || this.owner[u.tile] !== host.id) { delete u.base; delete u.baseEnd; continue; }
      if (!p.allies.has(host.id)) {
        if (u.baseEnd === undefined) { u.baseEnd = T + L.baseLeave; if (p === this.human) this.say('Bündnis mit ' + host.name + ' beendet: dein Stützpunkt geht in ' + Math.round(L.baseLeave / 10) + ' s an ' + host.name, 'warn'); }
        else if (T >= u.baseEnd) { delete u.base; delete u.baseEnd; this.captureUnit(u, host); }
        continue;
      }
      delete u.baseEnd;
      const pay = Math.min(p.gold, L.rent * 50);
      p.gold -= pay; host.gold += pay;
    }
  };

  // ---------- Paket 4: research ----------
  // Universities are an upgrade of a city (u.uni), at most G.LANG.uniMax, only in cities of level
  // uniLevel or more; they cost gold to build and keep, and every one brings research points (the
  // larger the city, the more) for the one thing it works on (u.res). Steps cost points, not gold.
  // Tiers 1 and 2 from the start, 3 from minute 15, 4 from 30, 5 from 45 (G.LANG.tierFrom). Steps
  // with the same `or` exclude each other for the whole game. Nations get every step of their
  // tier when it opens (the first of an `or`), so they keep working; they do not use the choice.
  //   id, branch, tier, name, what it does (said on screen), needs (ids), or (group)
  const T_ = function (id, br, tier, name, what, needs, or) { return { id: id, br: br, tier: tier, name: name, what: what, needs: needs || [], or: or || '' }; };
  G.TECH = [
    T_('blitz', 'Doktrin', 1, 'Blitzkrieg', 'Truppen marschieren schneller, Stösse starten mit mehr Schwung', [], 'doktrin'),
    T_('tief', 'Doktrin', 1, 'Tiefenverteidigung', 'Eingraben schneller, Verteidigungsposten stärker, halbe Abnutzung bei Überdichte', [], 'doktrin'),
    T_('auf1', 'Aufklärung', 1, 'Radarstation', 'Radar bauen (Taste X)'),
    T_('auf2', 'Aufklärung', 2, 'Grösserer Radarkreis', 'Radare sehen 1.5-mal so weit', ['auf1']),
    T_('spy2', 'Aufklärung', 2, 'Bessere Spione', 'Spione bleiben doppelt so lange, kosten die Hälfte'),
    T_('auf3', 'Aufklärung', 3, 'Tarnung erkennen', 'Im Kreis eigener Radare sind getarnte Gebäude sichtbar', ['auf2']),
    T_('auf4', 'Aufklärung', 4, 'Frühwarnradar', 'Bomben und Raketen siehst du im dreifachen Radarkreis', ['auf3']),
    T_('auf5', 'Aufklärung', 5, 'Satellit', 'Jeder Raketenstart auf der Welt ist zu sehen', ['auf4']),
    T_('abw1', 'Abwehr', 1, 'Flugabwehr', 'Kleine Flugabwehr und Raketenabwehr bauen'),
    T_('abw2', 'Abwehr', 2, 'Mehr Schüsse', 'Kleine Flugabwehr: 3 statt 2 Schüsse pro Stufe', ['abw1']),
    T_('schutz', 'Abwehr', 2, 'Schutzräume', 'Ausbau der Stadt: halber Schaden durch Bomben'),
    T_('abw3a', 'Abwehr', 3, 'Noch mehr Schüsse', 'Kleine Flugabwehr: ein Schuss mehr pro Stufe', ['abw2'], 'abw3'),
    T_('abw3b', 'Abwehr', 3, 'Mehr Reichweite', 'Flugabwehr reicht 1.3-mal so weit', ['abw2'], 'abw3'),
    T_('abm3', 'Abwehr', 3, 'Raketenabwehr gegen Atombomben', 'Die Raketenabwehr fängt Atombomben ab', ['abw1']),
    T_('schutz2', 'Abwehr', 3, 'Stärkere Schutzräume', 'Schutzräume lassen nur noch 30 % des Schadens durch', ['schutz']),
    T_('abw4', 'Abwehr', 4, 'Schneller nachladen', 'Flugabwehr lädt 30 % schneller nach', ['abw2']),
    T_('abm4', 'Abwehr', 4, 'Raketenabwehr gegen Wasserstoffbomben', 'Die Raketenabwehr fängt auch Wasserstoffbomben ab', ['abm3']),
    T_('zivil', 'Abwehr', 4, 'Zivilschutz', 'Bedrohte Städte evakuieren von selbst', ['schutz']),
    T_('abm5', 'Abwehr', 5, 'Raketenabwehr gegen MIRV', 'Die Raketenabwehr fängt einzelne MIRV-Sprengköpfe ab', ['abm4']),
    T_('rak1', 'Raketen', 1, 'Marschflugkörper', 'Marschflugkörper abfeuern'),
    T_('rak2', 'Raketen', 2, 'Streubombe', 'Streubombe gegen Truppen an der Front', ['rak1']),
    T_('rakR', 'Raketen', 2, 'Reichweite', 'Alle konventionellen Waffen reichen 1.25-mal so weit', ['rak1']),
    T_('rak3a', 'Raketen', 3, 'Bunkerbrecher', 'Zerstört Gebäude trotz Schutzräumen', ['rak2'], 'rak3'),
    T_('rak3b', 'Raketen', 3, 'Thermobare Bombe', 'Mittleres Gebiet, Truppen und Gebäude, ohne Verstrahlung', ['rak2'], 'rak3'),
    T_('rakA1', 'Raketen', 3, 'Sprengkraft', 'Marschflugkörper nimmt 35 % der Stufen', ['rak1']),
    T_('rak4', 'Raketen', 4, 'Kurzstreckenrakete', 'Schnell, schwer abzufangen, kurze Reichweite', ['rak2']),
    T_('rakA2', 'Raketen', 4, 'Mehr Sprengkraft', 'Marschflugkörper nimmt 50 % der Stufen', ['rakA1']),
    T_('rakS', 'Raketen', 4, 'Tempo', 'Konventionelle Waffen fliegen 1.3-mal so schnell', ['rakR']),
    T_('hyper', 'Raketen', 5, 'Hyperschall', 'Marschflugkörper und Kurzstreckenraketen: kaum abzufangen, kürzere Vorwarnzeit', ['rak4']),
    T_('atom', 'Atomwaffen', 4, 'Atombombe', 'Atombombe bauen (nicht verbesserbar)'),
    T_('hydro', 'Atomwaffen', 5, 'Wasserstoffbombe', 'Wasserstoffbombe bauen', ['atom']),
    T_('mirv', 'Atomwaffen', 5, 'MIRV', 'MIRV bauen (ab Minute 60)', ['hydro']),
    T_('heer1', 'Heer', 1, 'Eingraben', 'Eingegrabene Truppen verlieren noch weniger: Angreifer bis 4-mal so viele Verluste'),
    T_('infra', 'Heer', 2, 'Infrastruktur', 'Städte versorgen im doppelten Umkreis, eine Stadt ab Stufe 2 voll'),
    T_('heer2', 'Heer', 2, 'Schienen', 'Auf Schienen marschieren Truppen schneller', ['heer1']),
    T_('heer3a', 'Heer', 3, 'Warthog', 'Keile und Abschnitte verlieren 15 % weniger Truppen', ['heer2'], 'heer3'),
    T_('heer3b', 'Heer', 3, 'Apache', 'Feinde kommen hinter deiner Front 1.3-mal langsamer voran', ['heer2'], 'heer3'),
    T_('posten', 'Heer', 3, 'Stärkere Posten', 'Verteidigungsposten 1.3-mal so stark', ['heer1']),
    T_('heer4', 'Heer', 4, 'Panzerkeil', 'Deine Angriffe verlieren 30 % langsamer Schwung', ['heer2', 'blitz']),
    T_('heer5', 'Heer', 5, 'Stärkstes Eingraben', 'Eingegrabene Truppen: Angreifer bis 5-mal so viele Verluste', ['heer1', 'tief']),
    T_('pionier', 'Heer', 5, 'Pioniere', 'Gebirge, Wald und Flüsse bremsen deinen Angriff weniger', ['heer2'])
  ];
  const TECH = G.TECH_BY = {};
  for (const t of G.TECH) TECH[t.id] = t;
  // What a step costs in points, and from when its tier can be researched.
  Game.prototype.techCost = function (id) { return G.LANG.tierCost[TECH[id].tier - 1]; };
  Game.prototype.tierOpen = function (tier) { return this.ticks - this.playStart + this.langEarly >= G.LANG.tierFrom[tier - 1]; };
  // Has p researched id? Bots have nothing; nations everything of the tiers open (src: langNationTech).
  Game.prototype.has = function (p, id) { return !!p && !!p.tech && p.tech[id] === 1; };
  // Can p start on id now: open tier, what it needs done, not done, not shut out by an `or`.
  Game.prototype.techWhy = function (p, id) {
    const t = TECH[id];
    if (!t) return 'Gibt es nicht';
    if (this.has(p, id)) return 'Schon erforscht';
    if (p.tech && p.tech[id] === -1) return 'Durch eine andere Wahl ausgeschlossen';
    if (!this.tierOpen(t.tier)) return 'Stufe ' + t.tier + ' ab Minute ' + Math.round(G.LANG.tierFrom[t.tier - 1] / 600);
    for (const n of t.needs) if (!this.has(p, n)) return 'Braucht zuerst: ' + TECH[n].name;
    return '';
  };
  // A step is done: the others of its `or` are gone for this game.
  Game.prototype.techDone = function (p, id) {
    const t = TECH[id], tech = p.tech || (p.tech = {});
    tech[id] = 1;
    if (t.or) for (const o of G.TECH) if (o.or === t.or && o.id !== id && tech[o.id] !== 1) tech[o.id] = -1;
    for (const u of p.units) if (u.res && u.res.id === id) u.res = null;
    if (p === this.human) this.say('Erforscht: ' + t.name, 'good');
    if (t.id === 'auf2' || t.id === 'abw2' || t.id === 'abw3a') for (const u of p.units) if (u.type === UT.SAM) this.samSlots(u);
  };
  // Order: build a university in an own city.
  Game.prototype.buildUni = function (p, tile) {
    const u = this.structNear(tile, 4), L = G.LANG;
    if (!u || u.owner !== p || u.type !== UT.CITY || !u.built) return 'Keine eigene Stadt';
    if (u.uni) return 'Hat schon eine Uni';
    if (u.level < L.uniLevel) return 'Erst ab Stadtstufe ' + L.uniLevel;
    let n = 0;
    for (const v of p.units) if (v.uni) n++;
    if (n >= L.uniMax) return 'Höchstens ' + L.uniMax + ' Unis';
    if (p.gold < L.uniCost && !this.opts.infiniteGold) return 'Zu wenig Gold';
    p.gold -= L.uniCost; u.uni = 1; u.res = null;
    return '';
  };
  // Order: a university (the free one, or the one asked for) works on id.
  Game.prototype.research = function (p, id, tile) {
    const why = this.techWhy(p, id);
    if (why) return why;
    for (const v of p.units) if (v.res && v.res.id === id) return 'Wird schon erforscht';
    let uni = tile >= 0 ? this.structNear(tile, 4) : null;
    if (uni && (uni.owner !== p || !uni.uni)) uni = null;
    if (!uni) for (const v of p.units) if (v.uni && !v.res) { uni = v; break; }
    if (!uni) return 'Keine freie Uni';
    const kept = p.techPts && p.techPts[id] || 0;   // what a fallen university had done is kept
    uni.res = { id: id, pts: kept };
    return '';
  };
  // Points per tick of a university: uniRp x (1 + level / 10) of its city.
  Game.prototype.uniRate = function (u) { return G.LANG.uniRp * (1 + u.level / 10); };
  // Every 10 ticks: universities work and cost their upkeep; nations take what their time allows.
  Game.prototype.langResearch = function () {
    const L = G.LANG, ps = this.players;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (p.type === PT.NATION) { this.langNationTech(p); continue; }
      for (const u of p.units) {
        if (!u.uni || u.type !== UT.CITY) continue;
        const pay = Math.min(p.gold, L.uniUpkeep * 10);
        p.gold -= pay;
        if (!u.res || pay < L.uniUpkeep * 10) continue;   // without gold a university stands still
        u.res.pts += this.uniRate(u) * 10;
        (p.techPts || (p.techPts = {}))[u.res.id] = u.res.pts;
        if (u.res.pts >= this.techCost(u.res.id)) this.techDone(p, u.res.id);
      }
    }
  };
  Game.prototype.langNationTech = function (p) {
    for (const t of G.TECH) if (!this.techWhy(p, t.id) && !(t.or && G.TECH.some((o) => o.or === t.or && o.id !== t.id && this.has(p, o.id)))) { const tech = p.tech || (p.tech = {}); tech[t.id] = 1; if (t.or) for (const o of G.TECH) if (o.or === t.or && o.id !== t.id && tech[o.id] !== 1) tech[o.id] = -1; }
  };
  // What p researches right now (for the screen: neighbours, allies and spies see it).
  Game.prototype.researching = function (p) {
    const out = [];
    for (const u of p.units) if (u.res) out.push(TECH[u.res.id].name);
    return out;
  };
  // Giving and selling technology to an ally: the giver offers (price 0 = a gift), the taker accepts.
  Game.prototype.techOffer = function (p, q, id, price) {
    if (!this.has(p, id) || !p.allies.has(q.id)) return 'Nicht möglich';
    if (this.has(q, id) || (q.tech && q.tech[id] === -1)) return q.name + ' kann das nicht mehr erforschen';
    price = Math.max(0, Math.min(1e9, Math.round(+price || 0)));
    if (!price) { this.techDone(q, id); if (q === this.human) this.say(p.name + ' schenkt dir: ' + TECH[id].name, 'good'); return ''; }
    (q.techOffers || (q.techOffers = {}))[id] = { from: p.id, price: price, until: this.ticks + 1200 };
    if (q === this.human) this.say(p.name + ' bietet dir ' + TECH[id].name + ' für ' + G.fmt(price) + ' an (Forschung)', 'info');
    if (q.type === PT.NATION && q.gold >= price * 2) return this.techTake(q, p, id);
    return '';
  };
  Game.prototype.techTake = function (q, p, id) {
    const o = q.techOffers && q.techOffers[id];
    if (!o || o.from !== p.id || o.until < this.ticks || !p.allies.has(q.id)) return 'Kein Angebot';
    if (q.gold < o.price) return 'Zu wenig Gold';
    q.gold -= o.price; p.gold += o.price; delete q.techOffers[id];
    this.techDone(q, id);
    return '';
  };
  // The step a weapon or building needs (by UT, and class for the air defences).
  Game.prototype.techFor = function (type, cls) {
    switch (type) {
      case UT.CRUISE: return 'rak1'; case UT.CLUSTER: return 'rak2'; case UT.BUNKER: return 'rak3a'; case UT.THERMO: return 'rak3b';
      case UT.SRBM: return 'rak4'; case UT.ATOM: return 'atom'; case UT.HYDRO: return 'hydro'; case UT.MIRV: return 'mirv';
      case UT.SAM: return cls === 2 ? 'auf1' : 'abw1';
    }
    return '';
  };

  // ---------- digging in and defence posts ----------
  // A cell that loses nothing digs in: from 0 to 1 within G.LANG.digTicks. Every tile it loses
  // takes G.LANG.digDrop of it again. Fresh land starts at 0.
  Game.prototype.digOf = function (c, p) {
    if (!c || c.dig0 === undefined) return 0;
    return within((this.ticks - c.dig0) / (G.LANG.digTicks * (p && this.has(p, 'tief') ? 0.6 : 1)), 0, 1);
  };
  // How much more an attacker loses on fully dug-in ground of p: 1 + this.
  Game.prototype.digLossOf = function (p) { return G.LANG.digLoss + (this.has(p, 'heer1') ? 1 : 0) + (this.has(p, 'heer5') ? 1 : 0); };
  Game.prototype.digLose = function (c) {
    const e = this.digOf(c), L = G.LANG;
    c.dig0 = this.ticks - Math.max(0, e - L.digDrop) * L.digTicks;
  };
  // What a defence post does to a tile it covers: [factor on losses, factor on time].
  Game.prototype.postMag = function (level, p) { return this.lang ? (G.LANG.postLoss[0] + G.LANG.postLoss[1] * level) * (p && this.has(p, 'tief') ? 1.2 : 1) * (p && this.has(p, 'posten') ? 1.3 : 1) : 3 + 2 * level; };
  Game.prototype.postSpd = function (level) { return this.lang ? 1 + G.LANG.postTime * level : 1 + 2 * level; };

})(globalThis.G = globalThis.G || {});
