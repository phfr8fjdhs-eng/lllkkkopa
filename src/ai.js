/* Grenzland – Computergegner: Bots (Stämme) und Nationen */
(function (G) {
  'use strict';
  const HUMAN = G.HUMAN, NATION = G.NATION, BOT = G.BOT, U = G.U, P = G.Game.prototype;

  P._initAI = function (p) {
    const r = this.rng;
    p.ai = {
      rate: r.int(40, 80), next: r.int(0, 80),
      trigger: r.int(60, 90) / 100, reserve: r.int(30, 60) / 100, expand: r.int(10, 20) / 100,
      enemy: 0, enemyAt: 0
    };
    if (p.type === NATION) { p.ai.trigger = r.int(50, 70) / 100; p.ai.reserve = r.int(30, 45) / 100; }
  };

  P._tickAI = function () {
    const t = this.ticks, ps = this.players;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.ai || !p.alive || t - this.playStart < p.ai.next) continue;
      p.ai.next = t - this.playStart + p.ai.rate;
      if (p.type === BOT) this._botTurn(p); else this._nationTurn(p);
    }
  };

  // Nimmt die KI eine Allianzanfrage an?
  P._aiAccepts = function (to, from) {
    if (this.isTraitor(from)) return false;
    if (to.type === BOT) return true;
    const rel = to.rel.get(from.id) || 0;
    if (rel < -30) return false;
    if (from.troops > to.troops * 3) return true;
    if (from.allies.size >= 3) return false;
    for (const at of from.out) if (at.active && at.t === to.id) return false;
    if (from.betrayals >= 2) return this.rng.chance(3);
    return true;
  };

  P._aiSend = function (p, tid, reserve) {
    const troops = p.troops - this.maxTroops(p) * reserve;
    if (troops < 100) return false;
    return !!this.attack(p, tid, troops);
  };

  P._botTurn = function (p) {
    const nb = this.neighbors(p), ai = p.ai, r = this.rng;
    if (nb.has(0)) { this._aiSend(p, 0, ai.expand); return; }
    const cands = [];
    let traitor = null;
    for (const id of nb.keys()) {
      const q = this.players[id];
      if (!q.alive || p.allies.has(id)) continue;
      cands.push(q);
      if (this.isTraitor(q)) traitor = q;
    }
    if (!cands.length) return;
    if (p.troops < this.maxTroops(p) * ai.trigger) return;
    let tgt = traitor;
    if (!tgt) {
      if (ai.enemy) {
        const e = this.players[ai.enemy];
        if (e && e.alive && !p.allies.has(e.id) && nb.has(e.id) && this.ticks - ai.enemyAt < 400) tgt = e;
      }
      if (!tgt) {
        tgt = r.pick(cands);
        if (tgt.type === NATION && r.chance(2)) tgt = r.pick(cands);
        ai.enemy = tgt.id; ai.enemyAt = this.ticks;
      }
    }
    this._aiSend(p, tgt.id, ai.reserve);
  };

  // Zufälliges eigenes Feld, bevorzugt im Inneren
  P._aiTile = function (p, inner) {
    const W = this.W, o = this.owner, r = this.rng, bw = p.x1 - p.x0 + 1, bh = p.y1 - p.y0 + 1;
    if (bw <= 0) return -1;
    let any = -1;
    for (let k = 0; k < 40; k++) {
      const t = (p.y0 + r.int(0, bh)) * W + p.x0 + r.int(0, bw);
      if (o[t] !== p.id) continue;
      if (!inner || !p.border.has(t)) return t;
      any = t;
    }
    return any;
  };

  P._aiBuild = function (p) {
    const gold = p.gold, diff = this.opts.difficulty, r = this.rng;
    if (gold < 50000) return;
    let ports = 0, cities = 0, silos = 0, sams = 0, ships = 0, defs = 0, port = null;
    for (const u of p.units) {
      if (u.type === U.PORT) { ports++; if (!u.building) port = u; }
      else if (u.type === U.CITY) cities += u.level;
      else if (u.type === U.SILO) silos++;
      else if (u.type === U.SAM) sams++;
      else if (u.type === U.WARSHIP) ships++;
      else if (u.type === U.DEFENSE) defs++;
    }
    const tryAt = (type, tile) => tile >= 0 && this.build(p, type, tile).ok;
    const shoreTile = () => {
      let n = 0, pick = -1;
      for (const t of p.border) {
        if (!this.shore[t]) continue;
        n++;
        if (r() * n < 1) pick = t;
        if (n > 400) break;
      }
      return pick;
    };
    if (ports < 1 && gold >= this.cost(p, U.PORT)) { if (tryAt(U.PORT, shoreTile())) return; }
    const cityGoal = Math.min(24, 2 + diff * 2 + Math.floor(p.tiles / 3000));
    if (cities < cityGoal && gold >= this.cost(p, U.CITY)) { if (tryAt(U.CITY, this._aiTile(p, true))) return; }
    // Unter Beschuss: Grenze befestigen
    if (defs < 4 && gold >= this.cost(p, U.DEFENSE)) {
      let foe = 0;
      for (const e of p.hitBy) if (this.ticks - e[1] < 250) foe = e[0];
      if (foe && this.players[foe].alive && this.players[foe].type !== BOT) {
        const o = this.owner, W = this.W, N = this.N;
        for (const t of p.border) {
          const x = t % W;
          if ((x > 0 && o[t - 1] === foe) || (x < W - 1 && o[t + 1] === foe) || (t >= W && o[t - W] === foe) || (t < N - W && o[t + W] === foe)) {
            if (tryAt(U.DEFENSE, t)) return;
            break;
          }
        }
      }
    }
    if (port && ships < Math.min(3, ports) && gold >= this.cost(p, U.WARSHIP) && r.chance(3)) {
      if (tryAt(U.WARSHIP, port.water)) return;
    }
    if (diff >= 1 && silos < 1 && cities >= 2 && gold >= 1e6) { if (tryAt(U.SILO, this._aiTile(p, true))) return; }
    if (diff >= 1 && sams < 1 + (diff >= 3 ? 1 : 0) && cities >= 3 && gold >= this.cost(p, U.SAM) * 1.2) {
      if (tryAt(U.SAM, this._aiTile(p, true))) return;
    }
    if (ports >= 1 && ports < 3 && cities >= 3 && gold >= this.cost(p, U.PORT) * 1.5 && r.chance(4)) { tryAt(U.PORT, shoreTile()); }
  };

  P._aiEnemy = function (p, ids) {
    const ai = p.ai, t = this.ticks, r = this.rng, diff = this.opts.difficulty, ps = this.players;
    if (ai.enemy) {
      const e = ps[ai.enemy];
      if (!e || !e.alive || p.allies.has(e.id) || t - ai.enemyAt > 600) ai.enemy = 0;
    }
    if (!ai.enemy) {
      if (p.troops < this.maxTroops(p) * ai.trigger) return null;
      const cand = [];
      for (const id of ids) { const q = ps[id]; if (q.alive && !p.allies.has(id)) cand.push(q); }
      let pick = null;
      // 1. Verräter, 2. schwächster Bot, 3. Angreifer, 4. Feind eines Verbündeten, 5. Verhasste, 6. Schwächster
      for (const q of cand) if (this.isTraitor(q)) pick = q;
      if (!pick) {
        let bd = Infinity;
        for (const q of cand) {
          if (q.type !== BOT) continue;
          const d = q.troops / Math.max(1, q.tiles);
          if (d < bd) { bd = d; pick = q; }
        }
      }
      if (!pick) {
        let bt = 0;
        for (const at of this.attacks) if (at.active && at.t === p.id && at.troops > bt && !p.allies.has(at.a.id)) { bt = at.troops; pick = at.a; }
      }
      if (!pick && p.allies.size) {
        for (const at of this.attacks) {
          if (at.active && at.t && p.allies.has(at.t) && at.a !== p && !p.allies.has(at.a.id) && ids.indexOf(at.a.id) >= 0) { pick = at.a; break; }
        }
      }
      if (!pick) {
        let worst = -50;
        for (const q of cand) { const v = p.rel.get(q.id) || 0; if (v < worst) { worst = v; pick = q; } }
      }
      if (!pick && cand.length) {
        cand.sort(function (a, b) { return a.troops - b.troops; });
        let q = r.chance(2) ? cand[0] : r.pick(cand);
        if (q.type === HUMAN && diff < 2 && !r.chance(4)) q = null;          // auf Leicht und Mittel den Menschen schonen
        if (q && q.troops > p.troops * 3) q = null;                           // nicht in Übermacht laufen
        pick = q;
      }
      if (!pick && !cand.length && ids.length && r.chance(40)) {
        // Nur noch Verbündete als Nachbarn: selten ein Verrat an einem deutlich Schwächeren
        const q = ps[r.pick(ids)];
        if (q.alive && p.allies.has(q.id) && p.troops > q.troops * 2.5) { this.breakAlliance(p, q); pick = q; }
      }
      if (pick) { ai.enemy = pick.id; ai.enemyAt = t; }
    }
    return ai.enemy ? ps[ai.enemy] : null;
  };

  P._aiNuke = function (p, enemy) {
    const diff = this.opts.difficulty;
    if (diff < 1 || enemy.type === BOT || p.gold < 1e6) return;
    let type = U.ATOM;
    if (diff >= 2 && p.gold >= 26e6 && enemy.tiles > 3000) type = U.MIRV;
    else if (diff >= 2 && p.gold >= 6e6 && enemy.tiles > 2500) type = U.HYDRO;
    const R = this.R, W = this.W, H = this.H, o = this.owner, r = this.rng;
    const rad = type === U.HYDRO ? R.hydroOut : R.atomOut;
    let best = -1, bs = -1;
    for (let k = 0; k < 14; k++) {
      const t = this._aiTile(enemy, false);
      if (t < 0) continue;
      const x = t % W, y = (t / W) | 0;
      // eigene und verbündete Felder am Rand des Wirkungskreises vermeiden
      let bad = false;
      for (let a = 0; a < 8 && !bad; a++) {
        const xx = Math.round(x + Math.cos(a * 0.785) * rad), yy = Math.round(y + Math.sin(a * 0.785) * rad);
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const id = o[yy * W + xx];
        if (id === p.id || (id && p.allies.has(id))) bad = true;
      }
      if (bad) continue;
      let s = r();
      for (const u of enemy.units) {
        if (u.type > U.SAM) continue;
        const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (d <= rad * rad) s += u.type === U.CITY ? 3 * u.level : 2;
      }
      if (s > bs) { bs = s; best = t; }
    }
    if (best < 0) return;
    if (type === U.ATOM && bs < 2 && !r.chance(3)) return;   // Atombomben lohnen sich nur auf Gebäude
    this.build(p, type, best);
  };

  // Boot zu fremdem Land: herrenlos oder Gebiet eines nicht zu starken Gegners.
  // far = ohne Landnachbarn wird auf der ganzen Karte gesucht.
  P._aiBoat = function (p, far) {
    if (p.boats >= 3 || p.troops < 20000) return false;
    const W = this.W, H = this.H, r = this.rng, o = this.owner, land = this.land, m = this.map;
    const reach = Math.round(150 * this.S), diff = this.opts.difficulty;
    let x0 = 0, x1 = W - 1, y0 = 0, y1 = H - 1;
    if (!far) { x0 = Math.max(0, p.x0 - reach); x1 = Math.min(W - 1, p.x1 + reach); y0 = Math.max(0, p.y0 - reach); y1 = Math.min(H - 1, p.y1 + reach); }
    let tries = 0;
    for (let k = 0; k < 60 && tries < 2; k++) {
      const x = r.int(x0, x1 + 1), y = r.int(y0, y1 + 1), t = y * W + x;
      if (!land[t] || o[t] === p.id || m.lsize[m.lcomp[t]] < 60) continue;
      const id = o[t];
      if (id) {
        const q = this.players[id];
        if (p.allies.has(id) || q.troops > p.troops * 2) continue;
        if (q.type === HUMAN && diff === 0 && !r.chance(3)) continue;
        if (this.sharesBorder(p, id)) continue;
      } else if (this.canAttackTile(p, t)) continue;
      tries++;
      if (this.sendBoat(p, t, p.troops / (far ? 3 : 5)).ok) return true;
    }
    return false;
  };

  P._aiBoatAt = function (p, enemy) {
    if (p.boats >= 3 || p.troops < 20000) return;
    const t = this._aiTile(enemy, false);
    if (t >= 0) this.sendBoat(p, t, p.troops / 4);
  };

  // Fernangriff mit Bomben: auf den aktuellen Feind oder auf einen Spieler, der zu mächtig wird
  P._aiStrategic = function (p) {
    const diff = this.opts.difficulty, r = this.rng, ps = this.players;
    if (diff < 1 || p.gold < 1e6) return;
    if (diff === 1 && !r.chance(3)) return;
    let silo = false;
    for (const u of p.units) if (u.type === U.SILO && !u.building) { silo = true; break; }
    if (!silo) return;
    let tgt = null;
    const e = p.ai.enemy ? ps[p.ai.enemy] : null;
    if (e && e.alive && e.type !== BOT && !p.allies.has(e.id)) tgt = e;
    if (!tgt) {
      // Wer zuletzt angegriffen hat oder wer mehr als ein Viertel des Landes hält
      const total = Math.max(1, this.map.landTiles - this.falloutCount);
      let best = 0;
      for (let i = 1; i < ps.length; i++) {
        const q = ps[i];
        if (!q.alive || q === p || q.type === BOT || p.allies.has(q.id)) continue;
        const share = q.tiles / total, hit = this.ticks - (p.hitBy.get(q.id) || -1e9) < 900;
        const score = (hit ? 1 : 0) + (share > 0.25 ? share * 4 : 0);
        if (score > best) { best = score; tgt = q; }
      }
    }
    if (tgt) this._aiNuke(p, tgt);
  };

  P._nationTurn = function (p) {
    const ai = p.ai, r = this.rng;
    this._aiBuild(p);
    // Beziehungen klingen langsam ab
    for (const e of p.rel) {
      if (e[1] < 0) p.rel.set(e[0], Math.min(0, e[1] + 2));
      else if (e[1] > 0) p.rel.set(e[0], Math.max(0, e[1] - 1));
    }
    const nb = this.neighbors(p);
    if (nb.has(0)) {
      this._aiSend(p, 0, ai.expand);
      // Wer angegriffen wird, wehrt sich trotzdem
      let attacked = false;
      for (const at of this.attacks) if (at.active && at.t === p.id) { attacked = true; break; }
      if (!attacked) return;
    }
    this._aiStrategic(p);
    const ids = [];
    for (const id of nb.keys()) if (id && this.players[id].alive) ids.push(id);
    const full = p.troops >= this.maxTroops(p) * ai.trigger;
    if (!ids.length) { if (full || r.chance(3)) this._aiBoat(p, true); return; }
    if (r.chance(16)) { this._aiBoat(p, false); return; }
    if (r.chance(20) && p.allies.size < 3) {
      const q = this.players[r.pick(ids)];
      if (q.type !== BOT && (p.rel.get(q.id) || 0) >= 0 && this.canRequest(p, q)) { this.requestAlliance(p, q); return; }
    }
    const enemy = this._aiEnemy(p, ids);
    if (!enemy) {
      // Kein Gegner an Land, aber volle Kasernen: übers Meer ausgreifen
      if (full && r.chance(4)) this._aiBoat(p, true);
      return;
    }
    if (this.sharesBorder(p, enemy.id)) this._aiSend(p, enemy.id, ai.reserve);
    else if (r.chance(3)) this._aiBoatAt(p, enemy);
  };
})(typeof window !== 'undefined' ? window.G : globalThis.G);
