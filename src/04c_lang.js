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
    if (type === UT.FIGHTER) return false;
    // planes (27.11.2026): only the missile defence from a higher level, the stealth bomber from a
    // higher one still and with research; the small air defence leaves them alone, else planes are useless
    if (type === UT.STEALTH) return u.cls === 1 && u.level >= G.LANG.abmStealth && this.has(u.owner, 'abw5');
    if (type === UT.BOMBER || type === UT.RECON) return u.cls === 1 && u.level >= G.LANG.abmPlane;
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
    const from = G.LANG.nukeFrom[type === UT.STEALTH ? UT.ATOM : type];
    if (from && this.ticks - this.playStart + this.langEarly < from) return G.UNAME[type].replace('\u00AD', '') + ' erst ab Minute ' + Math.round(from / 600);
    return '';
  };
  // A nuclear weapon is armed in the silo for G.LANG.arm ticks, then flies. Everybody sees it.
  // Paket 7, arms industry: the weapon is made in the nearest own factory (fab) and goes to the
  // silo; every further factory level makes it armFab faster (to armFabMin of the time), with no
  // factory it takes armNoFab times as long. If that factory is lost while it works, the weapon
  // is armLost of its time later.
  Game.prototype.armFactory = function (p, silo) {
    let f = null, bd = Infinity, lv = 0;
    for (const u of p.units) {
      if (u.type !== UT.FACTORY || !u.built) continue;
      lv += u.level;
      const d = (u.x - silo.x) * (u.x - silo.x) + (u.y - silo.y) * (u.y - silo.y);
      if (d < bd) { bd = d; f = u; }
    }
    const L = G.LANG;
    return { f: f, k: f ? Math.max(L.armFabMin, 1 / (1 + L.armFab * (lv - 1))) : L.armNoFab };
  };
  Game.prototype.armSilo = function (p, type, silo, tile) {
    const T = this.ticks, af = this.armFactory(p, silo), dur = Math.round(G.LANG.arm[type] * af.k);
    for (let i = 0; i < silo.ready.length; i++) if (silo.ready[i] <= T) { silo.ready[i] = T + dur + G.SILO_RELOAD; break; }
    silo.arm = { type: type, tile: tile, at: T + dur, from: T, fab: af.f, len: dur };
    (this.armed || (this.armed = [])).push(silo);
    const h = this.human;
    if (h && h !== p) this.say('Raketensilo von ' + p.name + ' macht eine ' + G.UNAME[type].replace('\u00AD', '') + ' scharf', 'bad');
    else if (h === p) this.say(G.UNAME[type].replace('\u00AD', '') + ' wird ' + (af.f ? 'in der Fabrik gebaut' : 'ohne Fabrik gebaut (langsam)') + ': Start in ' + Math.round(dur / 10) + ' s', 'warn');
    this.emit({ k: 'arm', p: p.id, s: silo.id });
    return silo;
  };
  Game.prototype.langArmTick = function () {
    const T = this.ticks, list = this.armed;
    for (let i = list.length - 1; i >= 0; i--) {
      const s = list[i], a = s.arm;
      if (!s.active || !a) { if (s.active) s.arm = null; list.splice(i, 1); continue; }
      if (a.fab && (!a.fab.active || a.fab.owner !== s.owner)) {
        // the factory that made it is gone: the work is set back
        const late = Math.round(a.len * G.LANG.armLost);
        a.fab = null; a.at += late;
        for (let k = 0; k < s.ready.length; k++) if (s.ready[k] > T) s.ready[k] += late;
        if (s.owner === this.human) this.say('Rüstungsfabrik verloren: ' + G.UNAME[a.type].replace('\u00AD', '') + ' kommt ' + Math.round(late / 10) + ' s später', 'bad');
      }
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
    if (!NUCLEAR(type) && !(type === UT.STEALTH && u.pay)) return;
    p.outlawUntil = T + G.LANG.outlaw;
    for (const id of Array.from(p.allies.keys())) { const q = this.players[id]; if (q) this.breakAlliance(p, q); }
    this.say(p === this.human ? 'Du hast eine Atomwaffe eingesetzt: Bündnisse gebrochen, ' + Math.round(G.LANG.outlaw / 600) + ' Minuten kein Handel, alle kämpfen härter gegen dich' : p.name + ' hat eine Atomwaffe eingesetzt und ist geächtet', 'bad');
  };
  // A planned strike (command salvo): several targets, each with its weapon and launcher (silo,
  // submarine or airfield), timed so that all land at once. The one that takes longest (arming
  // included) starts now, the others later. Each start is checked and paid for when it comes, like
  // a single order.
  // A launcher has as many slots as levels (a submarine one tube): one used twice has to reload in
  // between, so a target that cannot start in time starts as soon as the slot is free and lands
  // `late` ticks after the others (salvoPlan; the interface shows it while planning).
  Game.prototype.salvoPlan = function (p, list) {
    if (!Array.isArray(list) || !list.length || list.length > 12) return { why: 'Nicht möglich' };
    const T = this.ticks, W = this.W, plan = [];
    let top = 0;
    for (const e of list) {
      const t = e && e.t | 0, u = e && e.u | 0, c1 = e && e.c === 1 ? 1 : 0;
      if (!(t >= 0 && t < this.N) || !(u >= UT.ATOM) || u === UT.LASER || u === UT.WARHEAD || u === UT.FIGHTER) return { why: 'Nicht möglich' };
      const c = this.buildCheck(p, u, t, c1, false, e.s | 0);
      if (!c.silo) return { why: c.why || 'Nicht möglich' };
      const L = c.silo, d = Math.max(1, Math.hypot(t % W - L.x, ((t / W) | 0) - L.y));
      const plane = G.isPlane(u);
      const sp = plane ? this.R.nukeSpeed * G.LANG.planeSpeed[u] : this.R.nukeSpeed * (u === UT.SRBM ? G.LANG.srbmSpeed : G.lowFly(u) ? 1.6 : 1) * this.weaponPace(p, u);
      const arm = G.LANG.arm[u] ? Math.round(G.LANG.arm[u] * this.armFactory(p, L).k) : 0;
      const need = Math.ceil(d / sp) + arm;
      // how long the slot stays taken: the flight there and back for a plane, else arming and reloading
      const busy = plane ? Math.ceil(2 * d / sp) + G.LANG.planeRest : arm + G.SILO_RELOAD;
      if (need > top) top = need;
      plan.push({ u: u, t: t, s: L.id, c: c1, need: need, busy: busy, at: 0, late: 0, L: L });
    }
    // per launcher, in the order the starts are wanted: the slot free first
    const free = new Map();
    const order = plan.slice().sort(function (a, b) { return (b.need - a.need) || (a.t - b.t); });
    for (const e of order) {
      let f = free.get(e.s);
      if (!f) { f = e.L.ready.map(function (r) { return Math.max(T, r); }); if (e.L.arm) for (let i = 0; i < f.length; i++) f[i] = Math.max(f[i], e.L.arm.at); free.set(e.s, f); }
      let k = 0;
      for (let i = 1; i < f.length; i++) if (f[i] < f[k]) k = i;
      const want = T + top - e.need, at = Math.max(want, f[k]);
      e.at = at; e.late = at - want; f[k] = at + e.busy;
    }
    for (const e of plan) delete e.L;
    return { why: '', plan: plan };
  };
  Game.prototype.salvo = function (p, list) {
    const r = this.salvoPlan(p, list);
    if (r.why) return r.why;
    const q = this.salvoQ || (this.salvoQ = []);
    for (const e of r.plan) q.push({ p: p.id, u: e.u, t: e.t, s: e.s, c: e.c, at: e.at, wait: e.at + 600, late: e.late });
    if (p === this.human) { const late = r.plan.filter(function (e) { return e.late > 0; }).length; if (late) this.say(late + ' Ziel' + (late === 1 ? '' : 'e') + ' später: derselbe Abschussort muss nachladen', 'warn'); }
    return '';
  };
  // Is this launcher (by id) of p ready to fire now? (true if it is gone: then the nearest one fires)
  Game.prototype.launcherFree = function (p, id) {
    let L = null;
    for (const u of p.units) if (u.id === id) { L = u; break; }
    if (!L || !L.active || !L.ready || L.arm) return !L || !L.active || !L.ready;
    for (let i = 0; i < L.ready.length; i++) if (L.ready[i] <= this.ticks) return true;
    return false;
  };
  Game.prototype.langSalvoTick = function () {
    const q = this.salvoQ, T = this.ticks;
    for (let i = 0; i < q.length; i++) {
      const e = q[i];
      if (e.at > T) continue;
      const p = this.players[e.p];
      // the launcher it was planned from fires it, once it is free (a submarine has one tube)
      if (p && p.alive && e.s && T < (e.wait || 0) && !this.launcherFree(p, e.s)) continue;
      q.splice(i--, 1);
      if (!p || !p.alive) continue;
      const done = this.build(p, e.u, e.t, e.c || 0, false, e.s);
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
    for (const u of p.units) if (u.type === UT.SILO && !u.cls) return true;
    return false;
  };
  // A cruise missile or short-range missile takes a share of a building's levels (at least one; a
  // building on level 1 falls). Shelters of a city halve it.
  Game.prototype.structHit = function (v) {
    const o = v.owner, L0 = v.level;
    return this.structHitBy(v, null);
  };
  Game.prototype.structHitBy = function (v, by, share) {
    const o = v.owner, L0 = v.level;
    let f = share || (by && this.has(by, 'rakA2') ? 0.5 : by && this.has(by, 'rakA1') ? 0.35 : G.LANG.share);
    if (v.shelter) f *= this.shelterF(o);
    const lost = L0 <= 1 ? 1 : Math.min(L0, Math.max(1, Math.round(L0 * f)));
    if (lost >= L0) { this.removeUnit(v); return; }
    v.level = L0 - lost; o.cnt[v.type] -= lost;
    if (v.type === UT.CITY) o.cityLv -= lost;
    else if (v.type === UT.DEFENSE) this.dirtyDisc(v.tile);
    if (v.ready) { if (v.type === UT.SAM) this.samSlots(v); else if (v.ready.length > v.level) v.ready.length = v.level; }
    if (o === this.human) this.say(G.UNAME[v.type].replace('\u00AD', '') + ' verliert ' + lost + ' Stufe' + (lost === 1 ? '' : 'n'), 'bad');
  };

  // ---------- war (27.11.2026) ----------
  // In the mode two realms are at war once one of them has attacked the other: on the ground, by
  // boat, with a bomb, missile or bomber (a recon flight and a spy are no attack). Both sides alike,
  // p.war[q.id] = the tick of the last blow. Only at war do warships, submarines, mines, fighters
  // and air defence against planes go for each other by themselves. Bots need no war, allies never
  // are at war. Outside the mode everybody who is not a friend is fair game, as before.
  Game.prototype.atWar = function (a, b) { return !!a && !!b && !!a.war && a.war[b.id] !== undefined; };
  Game.prototype.hostile = function (a, b) {
    if (a === b || this.friendly(a, b)) return false;
    if (!this.lang || a.type === PT.BOT || b.type === PT.BOT) return true;
    return this.atWar(a, b);
  };
  Game.prototype.declareWar = function (a, b, quiet) {
    if (!this.lang || !a || !b || a === b || a.type === PT.BOT || b.type === PT.BOT || this.friendly(a, b)) return;
    const fresh = !this.atWar(a, b), T = this.ticks;
    (a.war || (a.war = {}))[b.id] = T; (b.war || (b.war = {}))[a.id] = T;
    if (a.peace) delete a.peace[b.id];
    if (b.peace) delete b.peace[a.id];
    if (a.truce) delete a.truce[b.id];
    if (!fresh || quiet) return;
    const h = this.human;
    if (b === h) this.say(a.name + ' ist jetzt im Krieg mit dir', 'bad');
    else if (a === h) this.say('Du bist jetzt im Krieg mit ' + b.name, 'warn');
  };
  // A nation leaves a realm alone for a while after making peace with it.
  Game.prototype.truce = function (p, q) { return this.lang && !!p.truce && p.truce[q.id] > this.ticks; };
  Game.prototype.makePeace = function (a, b) {
    if (a.war) delete a.war[b.id];
    if (b.war) delete b.war[a.id];
    if (a.peace) delete a.peace[b.id];
    if (b.peace) delete b.peace[a.id];
    const until = this.ticks + G.LANG.truce;
    (a.truce || (a.truce = {}))[b.id] = until; (b.truce || (b.truce = {}))[a.id] = until;
    for (const at of a.out.slice()) if (at.tid === b.id) this.endAttack(at, true);
    for (const at of b.out.slice()) if (at.tid === a.id) this.endAttack(at, true);
    const h = this.human;
    if (a === h || b === h) this.say('Frieden mit ' + (a === h ? b : a).name, 'good');
  };
  // Order peace: p offers q peace, or takes the offer q made. A nation takes it once
  // G.LANG.peaceWait ticks have passed since the last blow between the two.
  Game.prototype.offerPeace = function (p, q) {
    const T = this.ticks, L = G.LANG;
    if (!this.atWar(p, q)) return 'Nicht im Krieg';
    if (q.peace && q.peace[p.id] > T) { this.makePeace(p, q); return ''; }
    if (q.type !== PT.HUMAN) {
      if (T - p.war[q.id] >= L.peaceWait) this.makePeace(p, q);
      else if (p === this.human) this.say(q.name + ' will noch keinen Frieden (frühestens in ' + Math.ceil((p.war[q.id] + L.peaceWait - T) / 10) + ' s)', 'warn');
      return '';
    }
    (p.peace || (p.peace = {}))[q.id] = T + L.peaceAsk;
    if (q === this.human) this.emit({ k: 'peaceReq', from: p.id, until: T + L.peaceAsk });
    if (p === this.human) this.say('Frieden angeboten: ' + q.name + ' kann ' + Math.round(L.peaceAsk / 600) + ' Minuten lang annehmen', 'info');
    return '';
  };
  // Whom p is at war with (living realms), for the info and the leaderboard.
  Game.prototype.warsOf = function (p) {
    const out = [];
    if (!p.war) return out;
    for (const id in p.war) { const q = this.players[+id]; if (q && q.alive) out.push(q); }
    return out;
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
    if (q === this.human) this.say(p.name + ' spioniert dich aus', 'warn');   // no war: what to do about it is up to you
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
    T_('abw1', 'Abwehr', 1, 'Flugabwehr', 'Kleine Flugabwehr (gegen Marschflugkörper) und Raketenabwehr (gegen Atomwaffen, ab Stufe 3 auch Flugzeuge) bauen'),
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
    T_('heer3a', 'Heer', 3, 'Warthog', 'Angriffe in Reichweite eines eigenen Flugplatzes verlieren 15 % weniger Truppen', ['heer2'], 'heer3'),
    T_('heer3b', 'Heer', 3, 'Apache', 'Feinde kommen hinter deiner Front 1.3-mal langsamer voran', ['heer2'], 'heer3'),
    T_('posten', 'Heer', 3, 'Stärkere Posten', 'Verteidigungsposten 1.3-mal so stark', ['heer1']),
    T_('heer4', 'Heer', 4, 'Panzerkeil', 'Deine Angriffe verlieren 30 % langsamer Schwung', ['heer2', 'blitz']),
    T_('heer5', 'Heer', 5, 'Stärkstes Eingraben', 'Eingegrabene Truppen: Angreifer bis 5-mal so viele Verluste', ['heer1', 'tief']),
    T_('pionier', 'Heer', 5, 'Pioniere', 'Gebirge, Wald und Flüsse bremsen deinen Angriff weniger', ['heer2']),
    T_('abw5', 'Abwehr', 5, 'Gegen Tarnbomber', 'Raketenabwehr ab Stufe 5 trifft Tarnbomber (wenn sie ihn 3 s erfasst)', ['abw4']),
    T_('reco', 'Aufklärung', 2, 'Aufklärungsflugzeug', 'Deckt vom Flugplatz aus kurz ein Gebiet auf', ['luft1']),
    T_('luft1', 'Luftwaffe', 1, 'Flugplatz', 'Flugplatz bauen (Taste 9); ohne ihn keine Luftwaffe'),
    T_('luft2', 'Luftwaffe', 2, 'Abfangjäger', 'Flugplätze schicken Jäger gegen Bomber und Marschflugkörper in ihrer Reichweite', ['luft1']),
    T_('luft3', 'Luftwaffe', 3, 'Luftbetankung', 'Flugplätze reichen 1.5-mal so weit', ['luft2']),
    T_('luftbr', 'Luftwaffe', 3, 'Luftbrücke', 'Ein Kessel in Reichweite eines eigenen Flugplatzes hungert nicht', ['luft1']),
    T_('luft4', 'Luftwaffe', 4, 'Bomber', 'Bomber werfen Streubomben auf die Front', ['luft2']),
    T_('luft5', 'Luftwaffe', 5, 'Tarnbomber', 'Tarnbomber mit Atombombe (mit Wasserstoffbombe, wenn erforscht), kaum zu erfassen', ['luft4', 'atom']),
    // Paket 6: the navy (destroyer, battleship and submarine lines, mines, the carrier)
    T_('mar2', 'Marine', 2, 'Schnelle Zerstörer', 'Zerstörer fahren 1.25-mal so schnell'),
    T_('sonar', 'Marine', 3, 'Sonar', 'Zerstörer finden U-Boote und Seeminen in ihrer Nähe', ['mar2']),
    T_('mar4', 'Marine', 4, 'Flugabwehr an Bord', 'Zerstörer schiessen Bomber und Marschflugkörper in der Nähe ab', ['sonar']),
    T_('bs2', 'Marine', 2, 'Panzerung', 'Schlachtschiffe halten 1.3-mal so viel aus'),
    T_('bs3', 'Marine', 3, 'Weitreichende Geschütze', 'Schlachtschiffe schiessen 1.3-mal so weit', ['bs2']),
    T_('bs4', 'Marine', 4, 'Schwere Granaten', 'Schlachtschiffe treffen 1.3-mal so hart', ['bs3']),
    T_('ub1', 'Marine', 1, 'U-Boot', 'U-Boote bauen: unsichtbar, bis sie feuern oder ein Sonar sie findet'),
    T_('mine', 'Marine', 2, 'Seeminen', 'Seeminen legen: unsichtbar, versenken Boote und Handelsschiffe, beschädigen Kriegsschiffe', ['ub1']),
    T_('ub2', 'Marine', 3, 'Leise U-Boote', 'Sonar findet deine U-Boote erst auf 60 % der Entfernung', ['ub1']),
    T_('ub4', 'Marine', 4, 'Stärkere Torpedos', 'U-Boote treffen 1.5-mal so hart', ['ub2']),
    T_('traeger', 'Marine', 4, 'Flugzeugträger', 'Flugzeugträger: ein Flugplatz auf See', ['luft1', 'mar2']),
    T_('geleit', 'Marine', 5, 'Geleitschutz', 'Zu jedem Flugzeugträger fährt ein Zerstörer mit', ['traeger']),
    T_('rads', 'Marine', 2, 'Radarschiff', 'Radarschiff bauen: hebt den Nebel um sich auf, auch über dem Meer', ['auf1']),
    T_('abws', 'Marine', 3, 'Abwehrschiff', 'Abwehrschiff bauen: schiesst Marschflugkörper, Raketen und Flugzeuge in der Nähe ab', ['mar2']),
    T_('marinf', 'Marine', 3, 'Marineinfanterie', 'Deine Boote landen mit 1.25-mal so vielen Truppen', ['mar2']),
    T_('ub3', 'Marine', 4, 'Raketen-U-Boot', 'Das U-Boot feuert selbst Marschflugkörper, mit Atombombe oder Wasserstoffbombe erforscht auch diese', ['ub2', 'rak1'])
  ];
  G.SHIP_TECH = [0, 0, 'ub1', 'traeger', 'abws', 'rads'];
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
      case UT.BOMBER: return 'luft4'; case UT.STEALTH: return 'luft5'; case UT.RECON: return 'reco'; case UT.MINE: return 'mine';
    }
    return '';
  };

  // ---------- Paket 5: the air force ----------
  // An airfield is a silo of class 1 (u.cls = 1): it fires nothing, it sends planes, one sortie per
  // level at a time (its slots). Planes fly straight there and back on their own; nobody steers them.
  //   bomber   drops a cluster bomb at the target (research Bomber)
  //   stealth  carries an atom bomb (a hydrogen bomb with that research), hard to pick up
  //   recon    shows reconR tiles around its target for reconTicks (research Aufklärungsflugzeug)
  //   fighter  starts by itself against enemy bombers and cruise missiles in reach (Abfangjäger)
  // An airfield, or a carrier at sea (Paket 6), that can send planes.
  G.isField = function (u) { return u.active && ((u.type === UT.SILO && u.cls === 1 && u.built) || (u.type === UT.WARSHIP && u.cls === 3 && !!u.ready)); };
  Game.prototype.airRange = function (u) {
    return (u.type === UT.WARSHIP ? 0.6 : 1) * G.LANG.airR / 5600 * Math.max(this.W, G.LANG.rangeW) * (1 + 0.05 * (u.level - 1)) * (this.has(u.owner, 'luft3') ? 1.5 : 1);
  };
  Game.prototype.planeReach = function (u, type) { return this.airRange(u) * (type === UT.STEALTH ? 2 : 1); };
  Game.prototype.planeCheck = function (p, type, tile, pick, res) {
    const W = this.W, tx = tile % W, ty = (tile / W) | 0, T = this.ticks;
    let best = null, bd = Infinity, any = false, far = false;
    for (const u of p.units) {
      if (!G.isField(u)) continue;
      any = true;
      let free = false;
      for (let i = 0; i < u.ready.length; i++) if (u.ready[i] <= T) free = true;
      if (!free) continue;
      const d = (u.x - tx) * (u.x - tx) + (u.y - ty) * (u.y - ty), r = this.planeReach(u, type);
      if (d > r * r) { far = true; continue; }
      if (pick && u.id === pick) { best = u; bd = -1; continue; }
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) { res.why = far ? 'Kein Flugplatz in Reichweite' : any ? 'Flugplatz noch nicht bereit' : 'Dafür brauchst du einen Flugplatz'; return; }
    if (this.ticks < this.immuneUntil) { res.why = 'Schonfrist läuft noch'; return; }
    res.silo = best;
    if (type === UT.STEALTH) res.cost += this.cost(p, this.has(p, 'hydro') ? UT.HYDRO : UT.ATOM);
    if (p.gold < res.cost) { res.why = 'Zu wenig Gold'; return; }
    res.ok = true;
  };
  Game.prototype.newPlane = function (p, type, field, tx, ty) {
    const u = this.newUnit(type, p, field.tile);
    u.sx = u.x; u.sy = u.y; u.dx = tx; u.dy = ty; u.dist = Math.max(1, Math.hypot(tx - u.sx, ty - u.sy));
    u.prog = 0; u.speed = this.R.nukeSpeed * G.LANG.planeSpeed[type]; u.tid = this.owner[ty * this.W + tx]; u.sam = false; u.delay = 0;
    u.home = field.id; u.leg = 0; u.hp = type === UT.STEALTH ? G.LANG.stealthHp : 0;
    return u;
  };
  Game.prototype.launchPlane = function (p, type, field, tile, cls) {
    const T = this.ticks, W = this.W, tx = tile % W, ty = (tile / W) | 0;
    const u = this.newPlane(p, type, field, tx, ty);
    if (type === UT.BOMBER && cls === 1) u.load = 1;   // explosive bombs instead of the cluster bomb
    if (type === UT.STEALTH) u.pay = this.has(p, 'hydro') ? UT.HYDRO : UT.ATOM;
    for (let i = 0; i < field.ready.length; i++) if (field.ready[i] <= T) { field.ready[i] = T + Math.ceil(2 * u.dist / u.speed) + G.LANG.planeRest; break; }
    this.addUnit(u);
    this.langLaunch(p, u);
    const q = this.players[u.tid];
    if (type !== UT.RECON) this.declareWar(p, q);   // a recon flight is no attack, like a spy
    if (q && q !== p && type === UT.BOMBER && q === this.human) this.say('Bomber von ' + p.name + ' im Anflug', 'bad');
    return u;
  };
  // A plane: out to the target, do its job there, back home; it lands and is gone.
  Game.prototype.tickPlane = function (u) {
    if (u.type === UT.FIGHTER && u.leg === 0) { this.tickFighter(u); return; }
    u.prog += u.speed / u.dist;
    if (u.prog < 1) { u.x = u.sx + (u.dx - u.sx) * u.prog; u.y = u.sy + (u.dy - u.sy) * u.prog; return; }
    u.x = u.dx; u.y = u.dy;
    if (u.leg === 1) { this.removeUnit(u); return; }
    // over the target
    if (u.type === UT.BOMBER && u.load) this.bombHit(u);
    else if (u.type === UT.BOMBER) this.detonate({ type: UT.CLUSTER, dx: u.dx, dy: u.dy, owner: u.owner, x: u.dx, y: u.dy });
    else if (u.type === UT.STEALTH && u.pay) { this.detonate({ type: u.pay, dx: u.dx, dy: u.dy, owner: u.owner, x: u.dx, y: u.dy }); u.pay = 0; }
    else if (u.type === UT.RECON) { const l = u.owner.recon || (u.owner.recon = []); for (let i = l.length - 1; i >= 0; i--) if (l[i].until <= this.ticks) l.splice(i, 1); l.push({ x: u.dx, y: u.dy, until: this.ticks + G.LANG.reconTicks }); }
    this.planeHome(u);
  };
  // Explosive bombs (27.11.2026): every building in the area of a cluster bomb loses
  // G.LANG.bombShare of its levels, as from a cruise missile (level 1 falls, shelters halve it).
  // No troops die, no land changes hands.
  Game.prototype.bombHit = function (u) {
    const cx = u.dx, cy = u.dy, r = this.R.clusterOut, r2 = r * r, hit = [];
    for (const v of this.units) {
      if (!v.active || !v.built || v.type > UT.CLOAK || v.owner === u.owner || this.friendly(v.owner, u.owner)) continue;
      if ((v.x - cx) * (v.x - cx) + (v.y - cy) * (v.y - cy) <= r2) hit.push(v);
    }
    for (const v of hit) this.structHitBy(v, u.owner, G.LANG.bombShare);
    this.fx.push({ k: 'boom', x: cx, y: cy, r: this.R.clusterIn, bombs: true });
    if (u.owner === this.human) this.say('Sprengbomben: ' + (hit.length ? hit.length + ' Gebäude getroffen' : 'kein Gebäude getroffen'), hit.length ? 'good' : 'info');
  };
  Game.prototype.planeHome = function (u) {
    let f = null;
    for (const v of u.owner.units) if (v.id === u.home && v.active) { f = v; break; }
    if (!f) { this.removeUnit(u); return; }
    u.leg = 1; u.sx = u.x; u.sy = u.y; u.dx = f.x; u.dy = f.y; u.prog = 0; u.dist = Math.max(1, Math.hypot(u.dx - u.sx, u.dy - u.sy)); u.sam = false;
  };
  // An airfield with fighters looks every 5 ticks for enemy bombers and cruise missiles in its reach.
  Game.prototype.tickField = function (f) {
    if ((this.ticks + f.id) % 5 !== 0 || !this.nukes.length || !this.has(f.owner, 'luft2')) return;
    const T = this.ticks, r = this.airRange(f), r2 = r * r;
    let slot = -1;
    for (let i = 0; i < f.ready.length; i++) if (f.ready[i] <= T) { slot = i; break; }
    if (slot < 0) return;
    for (const n of this.nukes) {
      if (!n.active || n.sam || (n.type !== UT.BOMBER && n.type !== UT.CRUISE && !G.lowFly(n.type))) continue;
      if (!this.hostile(n.owner, f.owner)) continue;   // fighters only go up at war
      if ((n.x - f.x) * (n.x - f.x) + (n.y - f.y) * (n.y - f.y) > r2) continue;
      const j = this.newPlane(f.owner, UT.FIGHTER, f, Math.round(n.x), Math.round(n.y));
      j.target = n; n.sam = true;
      f.ready[slot] = T + G.LANG.fighterRest;
      this.addUnit(j);
      return;
    }
  };
  Game.prototype.tickFighter = function (u) {
    const n = u.target;
    if (!n || !n.active) { this.planeHome(u); return; }
    const dx = n.x - u.x, dy = n.y - u.y, d = Math.hypot(dx, dy), sp = u.speed;
    if (d > sp) { u.x += dx / d * sp; u.y += dy / d * sp; return; }
    if (n.hp > 1) { n.hp--; n.sam = false; } else this.removeUnit(n);
    this.fx.push({ k: 'pop', x: n.x, y: n.y, air: 0 });
    if (u.owner === this.human) this.say('Abfangjäger hat ' + G.UNAME[n.type].replace('\u00AD', '') + ' von ' + n.owner.name + ' abgeschossen', 'good');
    else if (n.owner === this.human) this.say('Dein ' + G.UNAME[n.type].replace('\u00AD', '') + ' wurde von einem Jäger abgeschossen', 'warn');
    this.planeHome(u);
  };
  // A launcher has to hold a stealth bomber inside a quarter of its reach for stealthLock ticks.
  Game.prototype.stealthLocked = function (u, n, sr) {
    const r = sr * G.LANG.stealthSeen, inside = (n.x - u.x) * (n.x - u.x) + (n.y - u.y) * (n.y - u.y) <= r * r;
    if (!inside) { if (u.lockId === n.id) u.lockId = 0; return false; }
    if (u.lockId !== n.id) { u.lockId = n.id; u.lockAt = this.ticks; return false; }
    return this.ticks - u.lockAt >= G.LANG.stealthLock;
  };
  // Research Luftbrücke: a cell within reach of an own airfield.
  Game.prototype.airlift = function (p, id) {
    const CS = G.POST.cell, CW = this.CW, x = (id % CW + 0.5) * CS, y = (Math.floor(id / CW) + 0.5) * CS;
    for (const u of p.units) if (G.isField(u)) { const r = this.airRange(u); if ((u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= r * r) return true; }
    return false;
  };
  // Research Warthog: an attack is stronger within reach of an own airfield.
  Game.prototype.airCover = function (p, tile) {
    const W = this.W, x = tile % W, y = (tile - x) / W;
    for (const u of p.units) if (G.isField(u)) { const r = this.airRange(u); if ((u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= r * r) return true; }
    return false;
  };

  // ---------- Paket 6: the navy ----------
  // Warships are heavier (shipHp) and dearer to keep (shipUpkeep); merchants pay tradeGold times
  // as much. A submarine (class 2) cannot be targeted until it has fired (for subShow ticks) or an
  // enemy destroyer with sonar is within sonarR of it. A carrier (class 3) sends planes like an
  // airfield, with carrierSlots sorties. Sea mines lie unseen on the water.
  Game.prototype.shipFull = function (u) {
    const c = u.cls || 0, p = u.owner;
    return G.SHIP_CLASS[c].hp * G.LANG.shipHp * (c === 1 && this.has(p, 'bs2') ? 1.3 : 1) * (c === 3 ? G.LANG.carrierHp : 1);
  };
  Game.prototype.shipSpeed = function (u) { return G.SHIP_CLASS[u.cls || 0].speed * (!u.cls && this.has(u.owner, 'mar2') ? 1.25 : 1); };
  Game.prototype.langShip = function (u) {
    u.hp = this.shipFull(u);
    if (u.cls === 3) { u.ready = []; for (let i = 0; i < G.LANG.carrierSlots; i++) u.ready.push(0); }
    if (u.cls === 2) u.ready = [0];   // a launch tube, used with research Marschflugkörper-U-Boot
  };
  // What a submarine of p may fire (one kind of submarine, built in a port): with research
  // Raketen-U-Boot cruise missiles, and the atom or hydrogen bomb once that is researched too.
  Game.prototype.subCan = function (p, type) {
    if (type === undefined) return this.has(p, 'ub3');
    if (type === UT.CRUISE) return this.has(p, 'ub3');
    if (type === UT.ATOM) return this.has(p, 'ub3') && this.has(p, 'atom');
    if (type === UT.HYDRO) return this.has(p, 'ub3') && this.has(p, 'hydro');
    return false;
  };
  // Research Geleitschutz: a destroyer sails with every new carrier and keeps to its waters.
  Game.prototype.escort = function (p, carrier, c) {
    const e = this.newUnit(UT.WARSHIP, p, c.port.water);
    e.cls = 0; e.patrol = carrier.patrol; e.shotAt = 0; e.target = null; e.path = null; e.pi = 0; e.wait = false;
    this.langShip(e);
    this.addUnit(e);
    this.sail(e, c.tile, false, 'order');
  };
  // Has player p a sonar destroyer within r of (x, y)? (Over p's own units, not seaNear: this is
  // asked from inside loops over seaNear's shared list.)
  Game.prototype.sonarNear = function (p, x, y, r) {
    if (!p || !this.has(p, 'sonar')) return false;
    const r2 = r * r;
    for (const w of p.units) if (w.type === UT.WARSHIP && !w.cls && (w.x - x) * (w.x - x) + (w.y - y) * (w.y - y) <= r2) return true;
    return false;
  };
  Game.prototype.subSeen = function (v, p) {
    if (!this.lang || v.cls !== 2 || !p || p === v.owner || this.friendly(p, v.owner) || v.shown > this.ticks) return true;
    return this.sonarNear(p, v.x, v.y, G.LANG.sonarR * this.S * this.reach * (this.has(v.owner, 'ub2') ? G.LANG.subQuiet : 1));
  };
  Game.prototype.mineSeen = function (v, p) {
    return !p || p === v.owner || this.friendly(p, v.owner) || this.sonarNear(p, v.x, v.y, G.LANG.mineClear * this.S);
  };
  // Why p cannot lay a mine at tile ('' if it can): open water, an own port on it in reach.
  Game.prototype.mineWhy = function (p, tile, res) {
    const map = this.map, W = this.W, L = G.LANG;
    res.cost = p.type === PT.HUMAN && this.opts.infiniteGold ? 0 : L.mineCost;
    if (p.type === PT.HUMAN && !this.has(p, 'mine')) return 'Braucht Forschung: Seeminen';
    if (map.land[tile]) return 'Tippe dafür auf Wasser';
    if ((p.cnt[UT.MINE] | 0) >= L.mineMax) return 'Höchstens ' + L.mineMax + ' Seeminen';
    const x = tile % W, y = (tile / W) | 0, r = L.mineR * this.S * this.reach;
    for (const u of p.units) if (u.type === UT.PORT && u.built && map.wcomp[u.water] === map.wcomp[tile] && (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= r * r) return '';
    return 'Kein eigener Hafen in der Nähe';
  };
  // A mine looks every 3 ticks: an enemy ship on top of it sets it off; an enemy destroyer with
  // sonar close by clears it.
  Game.prototype.tickMine = function (u) {
    if ((this.ticks + u.id) % 3) return;
    const L = G.LANG, p = u.owner, hit = Math.max(2, L.mineHit * this.S), clr = L.mineClear * this.S, h = this.human;
    for (const v of this.seaNear(u.x, u.y, Math.max(hit, clr))) {
      if (!v.active || !this.hostile(v.owner, p)) continue;   // a mine goes off only under an enemy at war
      const d2 = (v.x - u.x) * (v.x - u.x) + (v.y - u.y) * (v.y - u.y);
      if (v.type === UT.WARSHIP && !v.cls && d2 <= clr * clr && this.has(v.owner, 'sonar')) {
        this.removeUnit(u);
        if (v.owner === h) this.say('Seemine von ' + p.name + ' geräumt', 'good');
        return;
      }
      if (d2 > hit * hit) continue;
      this.fx.push({ k: 'shipboom', x: v.x, y: v.y, a: v.ang || 0 });
      if (v.type === UT.WARSHIP) { v.hp -= L.mineDmg; if (v.hp <= 0) this.removeUnit(v); }
      else this.removeUnit(v);
      if (v.owner === h) this.say('Dein Schiff ist auf eine Seemine von ' + p.name + ' gelaufen', 'bad');
      else if (p === h) this.say('Schiff von ' + v.owner.name + ' auf deine Seemine gelaufen', 'good');
      this.removeUnit(u);
      return;
    }
  };
  // Research Flugabwehr an Bord: a destroyer shoots a bomber or cruise missile in its gun range.
  // The defence ship (class 4) does the same further out and also takes short-range missiles and recon planes.
  Game.prototype.shipFlak = function (u) {
    const big = u.cls === 4;
    if (!this.nukes.length || (this.ticks + u.id) % (big ? G.LANG.flakEvery : 10) || (!big && !this.has(u.owner, 'mar4'))) return;
    const r = (big ? G.LANG.flakR : G.SHIP_CLASS[0].range) * this.S * this.reach, r2 = r * r;
    for (const n of this.nukes) {
      if (!n.active || n.sam || (n.type !== UT.BOMBER && n.type !== UT.CRUISE && !G.lowFly(n.type) && !(big && (n.type === UT.SRBM || n.type === UT.RECON)))) continue;
      if (n.owner === u.owner || (G.isPlane(n.type) ? !this.hostile(n.owner, u.owner) : this.friendly(n.owner, u.owner))) continue;   // planes only at war
      if ((n.x - u.x) * (n.x - u.x) + (n.y - u.y) * (n.y - u.y) > r2) continue;
      this.fx.push({ k: 'pop', x: n.x, y: n.y, air: 0 });
      if (n.owner === this.human) this.say('Dein ' + G.UNAME[n.type].replace('\u00AD', '') + ' wurde über dem Meer abgeschossen', 'warn');
      this.removeUnit(n);
      return;
    }
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
