/* Grenzland – Bedienoberfläche: Rangliste, Steuerung, Meldungen, Menüs */
(function (G) {
  'use strict';
  const U = G.U, NATION = G.NATION, BOT = G.BOT;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  };
  const rgb = function (c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
  const pct = function (v) { v *= 100; return (v < 10 ? v.toFixed(1) : v.toFixed(0)) + ' %'; };
  const BUILD = [['Gebäude', [1, 2, 3, 4, 5]], ['Flotte', [6]], ['Bomben', [11, 12, 13]]];
  const BUILT_MSG = { 1: 'Stadt wird gebaut', 2: 'Verteidigungsposten wird gebaut', 3: 'Hafen wird gebaut', 4: 'Raketensilo wird gebaut', 5: 'Flugabwehr wird gebaut', 6: 'Kriegsschiff läuft aus', 11: 'Atombombe gestartet', 12: 'Wasserstoffbombe gestartet', 13: 'MIRV gestartet' };

  class UI {
    constructor(app) {
      this.app = app;
      this.ratio = 0.2;
      this.rad = null; this.sheet = null; this.sheetSig = ''; this.sheetAt = 0; this.radAt = 0;
      this.chipEls = new Map(); this.lbRows = []; this.lastLb = 0; this.toastT = 0; this.modalKind = '';
      $('btnPause').innerHTML = G.svg('pause');
      $('btnHome').innerHTML = G.svg('home');
      $('btnMenu').innerHTML = G.svg('menu');
      $('lbChev').innerHTML = G.svg('chev');
      const ic = { rbBuild: 'hammer', rbAlly: 'link', rbInfo: 'info', rbClose: 'close', rbBoat: 'boat' };
      for (const k in ic) $(k).firstElementChild.innerHTML = G.svg(ic[k]);
      this._bind();
    }

    get game() { return this.app.game; }

    _bind() {
      const app = this.app, self = this;
      $('ratio').addEventListener('input', function (e) { self.ratio = e.target.value / 100; self._ratioLabel(); });
      $('lbToggle').addEventListener('click', function () {
        const closed = $('lb').classList.toggle('closed');
        $('lbToggle').setAttribute('aria-expanded', String(!closed));
      });
      $('lbBody').addEventListener('click', function (e) {
        const r = e.target.closest('[data-pid]');
        if (r) self.focusPlayer(+r.dataset.pid, true);
      });
      $('btnPause').addEventListener('click', function () { app.togglePause(); });
      $('btnSpeed').addEventListener('click', function () { app.cycleSpeed(); });
      $('btnHome').addEventListener('click', function () { if (self.game) self.focusPlayer(self.game.human.id, true); });
      $('btnMenu').addEventListener('click', function () { self.openMenu(); });
      $('spawnGo').addEventListener('click', function () { app.beginPlay(); });
      $('chips').addEventListener('click', function (e) { self._chipClick(e); });
      $('events').addEventListener('click', function (e) { self._eventClick(e); });
      $('sheet').addEventListener('click', function (e) {
        // Der Fingertipp, der das Blatt geöffnet hat, darf es nicht gleich wieder schliessen
        if (e.target === $('sheet') && performance.now() - self.sheetAt > 350) self.closeSheet();
      });
      $('sheetCard').addEventListener('click', function (e) { self._sheetClick(e); });
      $('modalCard').addEventListener('click', function (e) { self._modalClick(e); });
      $('modalCard').addEventListener('change', function (e) { self._modalChange(e); });
      for (const id of ['rbBuild', 'rbAlly', 'rbInfo', 'rbClose', 'rbBoat', 'rbC']) {
        $(id).addEventListener('click', function () { self._radial(id); });
      }
    }

    // Spiel beginnt: Anzeige zurücksetzen
    start() {
      $('events').innerHTML = ''; $('chips').innerHTML = ''; $('lbBody').innerHTML = '';
      this.chipEls.clear(); this.lbRows = []; this.lastLb = 0;
      this.closeRadial(); this.closeSheet(); this.closeModal();
      $('hud').hidden = false;
      $('spawnBar').hidden = false;
      this.setPaused(false); this.setSpeed(1);
      this._ratioLabel();
      this.update(performance.now());
    }

    setPaused(p) { $('btnPause').innerHTML = G.svg(p ? 'play' : 'pause'); $('btnPause').classList.toggle('on', p); $('btnPause').setAttribute('aria-label', p ? 'Weiter' : 'Pause'); }
    setSpeed(s) { $('btnSpeed').textContent = s + '×'; $('btnSpeed').classList.toggle('on', s !== 1); }

    _ratioLabel() {
      const g = this.game, h = g && g.human;
      $('ratioVal').textContent = Math.round(this.ratio * 100) + ' %' + (h && h.alive ? ' · ' + G.fmtTroops(h.troops * this.ratio) : '');
    }

    // ------------------------------------------------------------ laufende Anzeige
    update(now) {
      const g = this.game;
      if (!g) return;
      const h = g.human, max = g.maxTroops(h);
      $('sTroops').textContent = G.fmtTroops(h.troops) + ' / ' + (max > 9e8 ? '∞' : G.fmtTroops(max));
      $('sTroopsSub').textContent = h.alive && g.phase === 'play' ? '+' + G.fmtNum(g.troopRate(h)) + '/s' : '';
      $('sGold').textContent = G.fmtNum(h.gold);
      $('sGoldSub').textContent = h.alive && g.phase === 'play' ? '+' + G.fmtNum(g.goldRate(h) * 10) + '/s' : '';
      this._ratioLabel();
      const secs = Math.floor(Math.max(0, g.phase === 'spawn' ? 0 : g.ticks - g.playStart) / 10);
      $('clock').textContent = Math.floor(secs / 60) + ':' + String(secs % 60).padStart(2, '0');
      if (g.phase === 'spawn') {
        const left = Math.max(0, this.app.spawnTicks - g.ticks);
        $('spawnBar').hidden = false;
        $('spawnFill').style.width = Math.min(100, (g.ticks / this.app.spawnTicks) * 100) + '%';
        $('spawnText').textContent = h.spawned
          ? 'Start in ' + Math.ceil(left / 10) + ' s. Du kannst den Platz noch wechseln.'
          : 'Tippe auf freies Land und wähle deinen Startpunkt. Mit zwei Fingern oder dem Mausrad zoomst du.';
        $('spawnGo').hidden = !h.spawned;
      } else if (!$('spawnBar').hidden) $('spawnBar').hidden = true;
      if (now - this.lastLb > 900) { this.lastLb = now; this._leaderboard(); }
      this._chips();
      // abgelaufene Anfragen entfernen
      const evs = $('events').children;
      for (let i = evs.length - 1; i >= 0; i--) {
        const u = evs[i].dataset.until;
        if (u && g.ticks > +u) evs[i].remove();
      }
      if (this.sheet) { if (this.sheet.kind === 'build') this._renderBuild(); else this._renderPlayer(); }
    }

    _leaderboard() {
      const g = this.game, h = g.human, ps = g.players, alive = [];
      for (let i = 1; i < ps.length; i++) if (ps[i].alive && ps[i].tiles > 0) alive.push(ps[i]);
      alive.sort(function (a, b) { return b.tiles - a.tiles; });
      this.app.ren.leader = alive.length && g.phase === 'play' ? alive[0].id : 0;
      $('lbCount').textContent = alive.length;
      const total = Math.max(1, g.map.landTiles - g.falloutCount);
      const n = window.innerHeight < 480 ? 3 : window.innerWidth >= 760 ? 8 : 5;
      const rows = alive.slice(0, n).map(function (p, i) { return { p: p, rank: i + 1 }; });
      if (h.alive && h.tiles > 0 && !rows.some(function (r) { return r.p === h; })) rows.push({ p: h, rank: alive.indexOf(h) + 1 });
      const body = $('lbBody');
      while (this.lbRows.length < rows.length) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'lb-row';
        b.innerHTML = '<span class="r"></span><span class="d"></span><span class="n"></span><span class="p"></span><span class="g"></span><span class="t"></span>';
        body.appendChild(b); this.lbRows.push(b);
      }
      while (this.lbRows.length > rows.length) body.removeChild(this.lbRows.pop());
      for (let i = 0; i < rows.length; i++) {
        const el = this.lbRows[i], c = el.children, p = rows[i].p;
        el.dataset.pid = p.id;
        el.className = 'lb-row' + (p === h ? ' me' : h.allies.has(p.id) ? ' ally' : '');
        c[0].textContent = rows[i].rank;
        c[1].style.background = rgb(p.color);
        c[2].textContent = p.name;
        c[3].textContent = pct(p.tiles / total);
        c[4].textContent = G.fmtNum(p.gold);
        c[5].textContent = G.fmtTroops(p.troops);
      }
    }

    _chips() {
      const g = this.game, h = g.human, want = [];
      if (h.alive && g.phase === 'play') {
        for (const at of h.out) {
          if (at.active) want.push({ k: 'o' + at.id, cls: 'out', icon: 'sword', name: at.t ? g.players[at.t].name : 'Freies Land', val: G.fmtTroops(at.troops), x: true });
        }
        for (const u of h.units) {
          if (u.type === U.TRANSPORT) want.push({ k: 'b' + u.id, cls: 'out', icon: 'boat', name: u.back ? 'Rückzug' : (u.tid ? g.players[u.tid].name : 'Freies Land'), val: G.fmtTroops(u.troops), x: !u.back });
        }
        for (const at of g.attacks) {
          if (at.active && at.t === h.id) want.push({ k: 'i' + at.id, cls: 'in', icon: 'sword', name: at.a.name, val: G.fmtTroops(at.troops), x: false });
        }
      }
      const box = $('chips'), seen = new Set();
      for (const w of want) {
        seen.add(w.k);
        let el = this.chipEls.get(w.k);
        if (!el) {
          el = document.createElement('div');
          el.className = 'chip ' + w.cls; el.dataset.k = w.k;
          el.innerHTML = G.svg(w.icon) + '<span class="nm"></span><span class="v"></span>' +
            (w.x ? '<button class="x" type="button" aria-label="Abbrechen">' + G.svg('close') + '</button>' : '');
          box.appendChild(el); this.chipEls.set(w.k, el);
        }
        const nm = el.children[1], v = el.children[2];
        if (nm.textContent !== w.name) nm.textContent = w.name;
        if (v.textContent !== w.val) v.textContent = w.val;
        if (!w.x && el.children[3]) el.children[3].remove();
      }
      for (const e of Array.from(this.chipEls)) {
        if (!seen.has(e[0])) { e[1].remove(); this.chipEls.delete(e[0]); }
      }
    }

    _chipClick(e) {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const g = this.game, h = g.human, k = chip.dataset.k, id = +k.slice(1);
      if (e.target.closest('.x')) {
        if (k[0] === 'o') {
          const at = h.out.find(function (a) { return a.id === id; });
          if (at && at.active) { g.endAttack(at, 0.25); this.toast('Rückzug: ein Viertel dieser Truppen geht verloren'); }
        } else if (k[0] === 'b') {
          const u = h.units.find(function (x) { return x.id === id; });
          if (u) { g.recallBoat(u); this.toast('Boot kehrt um'); }
        }
        this._chips();
        return;
      }
      if (k[0] === 'b') {
        const u = h.units.find(function (x) { return x.id === id; });
        if (u) this.app.ren.center(u.x, u.y);
      } else {
        const at = g.attacks.find(function (a) { return a.id === id; });
        if (at) { if (k[0] === 'i') this.focusPlayer(at.a.id); else if (at.t) this.focusPlayer(at.t); }
      }
    }

    // ------------------------------------------------------------ Meldungen
    drain() {
      const g = this.game;
      if (!g || !g.events.length) return;
      const list = g.events.slice();
      g.events.length = 0;
      for (const e of list) {
        if (e.k === 'msg') this.addEvent(e.text, e.cls, e.pid);
        else if (e.k === 'allyReq') this.addEvent(g.players[e.from].name + ' bietet dir eine Allianz an', 'good', e.from, { until: e.until, acts: [['Annehmen', 'ally-yes'], ['Ablehnen', 'ally-no']] });
        else if (e.k === 'renew') this.addEvent('Allianz mit ' + g.players[e.with].name + ' läuft in 30 Sekunden ab', 'warn', e.with, { until: e.until, acts: [['Verlängern', 'renew']] });
        else if (e.k === 'defeat') this.app.onDefeat(e.by);
        else if (e.k === 'win') { if (!(g.opts.duel && e.id !== g.human.id && !g.human.alive)) this.app.onWin(e.id); }
      }
    }

    addEvent(text, cls, pid, extra) {
      const box = $('events'), el = document.createElement('div'), self = this;
      el.className = 'ev ' + (cls || 'info');
      if (pid) el.dataset.pid = pid;
      el.textContent = text;
      if (extra && extra.acts) {
        const row = document.createElement('div');
        row.className = 'acts';
        for (const a of extra.acts) {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'btn small' + (a[1] === 'ally-no' ? ' ghost' : '');
          b.textContent = a[0]; b.dataset.act = a[1];
          row.appendChild(b);
        }
        el.appendChild(row);
        el.dataset.until = extra.until;
      } else {
        setTimeout(function () { self._dropEvent(el); }, extra && extra.ttl ? extra.ttl : cls === 'nuke' || cls === 'bad' ? 11000 : 7500);
      }
      box.appendChild(el);
      const max = window.innerHeight < 640 ? 3 : 4;
      while (box.children.length > max) box.removeChild(box.firstChild);
    }

    _dropEvent(el) {
      if (!el.isConnected) return;
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 500);
    }

    _eventClick(e) {
      const el = e.target.closest('.ev');
      if (!el) return;
      const g = this.game, h = g.human, pid = +el.dataset.pid, b = e.target.closest('[data-act]');
      if (b) {
        const p = g.players[pid];
        if (b.dataset.act === 'ally-yes') g.answerRequest(p, h, true);
        else if (b.dataset.act === 'ally-no') g.answerRequest(p, h, false);
        else if (b.dataset.act === 'renew') g.renewAlliance(h, p);
        el.remove();
        return;
      }
      if (pid) this.focusPlayer(pid);
    }

    toast(text) {
      const el = $('toast');
      el.textContent = text; el.hidden = false;
      clearTimeout(this.toastT);
      this.toastT = setTimeout(function () { el.hidden = true; }, 2400);
    }

    focusPlayer(id, zoom) {
      const g = this.game, p = g.players[id], ren = this.app.ren;
      if (!p || p.x1 < p.x0) return;
      const x = p.ns > 0 ? p.nx : (p.x0 + p.x1) / 2, y = p.ns > 0 ? p.ny : (p.y0 + p.y1) / 2;
      let z = 0;
      if (zoom) {
        const bw = p.x1 - p.x0 + 30, bh = p.y1 - p.y0 + 30;
        z = Math.max(1.4, Math.min(7, Math.min(ren.cw / bw, ren.ch / bh)));
      }
      ren.center(x, y, z);
    }

    // ------------------------------------------------------------ Kreismenü
    openRadial(tile, px, py) {
      const g = this.game, h = g.human, id = g.owner[tile], land = g.land[tile], p = id ? g.players[id] : null;
      const ctx = { tile: tile, id: id, act: 'none' };
      let c;
      if (!land) {
        const ships = h.units.some(function (u) { return u.type === U.WARSHIP; });
        c = { act: 'ship', icon: 'warship', label: ships ? 'Hierher' : 'Wasser', on: ships, sea: true };
      } else if (id === h.id) c = { act: 'build', icon: 'hammer', label: 'Bauen', on: true };
      else if (p && h.allies.has(id)) c = { act: 'info', icon: 'link', label: 'Verbündet', on: true };
      else if (g.canAttackTile(h, tile)) c = { act: 'attack', icon: 'sword', label: 'Angriff', on: true };
      else if (g.boatPlan(h, tile)) c = { act: 'boat', icon: 'boat', label: 'Boot', on: true, sea: true };
      else c = { act: 'none', icon: 'sword', label: 'Kein Weg', on: false };
      ctx.act = c.act;
      const cb = $('rbC');
      cb.firstElementChild.innerHTML = G.svg(c.icon);
      cb.lastElementChild.textContent = c.label;
      cb.disabled = !c.on;
      cb.classList.toggle('sea', !!c.sea && c.on);
      const foreign = land && id !== h.id && !(p && h.allies.has(id));
      $('rbBoat').disabled = !(foreign && (c.act === 'boat' || (c.act === 'attack' && !!g.boatPlan(h, tile))));
      $('rbInfo').disabled = !p;
      const canAlly = !!p && p !== h && !h.allies.has(id) && g.canRequest(h, p);
      $('rbAlly').hidden = !canAlly;
      const el = $('radial'), m = 124, vw = window.innerWidth, vh = window.innerHeight;
      el.style.left = (vw < 2 * m ? vw / 2 : Math.max(m, Math.min(vw - m, px))) + 'px';
      el.style.top = (vh < 2 * m ? vh / 2 : Math.max(m, Math.min(vh - m, py))) + 'px';
      el.hidden = false;
      this.rad = ctx; this.radAt = performance.now();
      this.app.ren.marker = tile;
    }

    closeRadial() {
      if (!this.rad) return false;
      this.rad = null;
      $('radial').hidden = true;
      if (this.app.ren) this.app.ren.marker = -1;
      return true;
    }

    _radial(btn) {
      const ctx = this.rad;
      if (!ctx) return;
      // Der Fingertipp, der das Menü geöffnet hat, darf nicht gleich einen Knopf auslösen
      if (performance.now() - this.radAt < 300) return;
      this.closeRadial();
      const g = this.game, h = g.human;
      if (btn === 'rbClose') return;
      if (btn === 'rbBuild') { this.openBuild(ctx.tile); return; }
      if (btn === 'rbInfo') { if (ctx.id) this.openPlayer(ctx.id); return; }
      if (btn === 'rbBoat') { this.doBoat(ctx.tile); return; }
      if (btn === 'rbAlly') {
        const p = g.players[ctx.id];
        if (p && g.requestAlliance(h, p)) this.toast('Allianz bei ' + p.name + ' angefragt');
        return;
      }
      switch (ctx.act) {
        case 'attack': this.doAttack(ctx.tile); break;
        case 'boat': this.doBoat(ctx.tile); break;
        case 'build': this.openBuild(ctx.tile); break;
        case 'info': this.openPlayer(ctx.id); break;
        case 'ship': this.doShip(ctx.tile); break;
      }
    }

    doAttack(tile) {
      const g = this.game, h = g.human, id = g.owner[tile], troops = h.troops * this.ratio;
      if (troops < 10) { this.toast('Keine Truppen frei'); return; }
      if (id && g.ticks < g.playStart + 50 && g.players[id].type !== BOT) { this.toast('Schonfrist: Nationen sind in den ersten 5 Sekunden geschützt'); return; }
      g.attack(h, id, troops);
    }

    doBoat(tile) {
      const g = this.game, h = g.human, r = g.sendBoat(h, tile, h.troops * this.ratio);
      this.toast(r.ok ? 'Boot läuft aus' : r.why);
    }

    doShip(tile) {
      const g = this.game, h = g.human, W = g.W, x = tile % W, y = (tile / W) | 0;
      let best = null, bd = 1e12;
      for (const u of h.units) {
        if (u.type !== U.WARSHIP || g.wcomp[u.tile] !== g.wcomp[tile]) continue;
        const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
        if (d < bd) { bd = d; best = u; }
      }
      this.toast(best && g.moveWarship(best, tile) ? 'Kriegsschiff nimmt Kurs' : 'Kein Kriegsschiff auf diesem Gewässer');
    }

    // ------------------------------------------------------------ Blätter
    _head(title, dot) {
      return '<div class="sh-head">' + (dot ? '<span class="dot" style="background:' + dot + '"></span>' : '') +
        '<h2>' + title + '</h2><button class="sh-x" type="button" data-act="close" aria-label="Schliessen">' + G.svg('close') + '</button></div>';
    }

    closeSheet() {
      if (!this.sheet) return;
      this.sheet = null; this.sheetSig = '';
      $('sheet').hidden = true;
    }

    openBuild(tile) {
      this.sheet = { kind: 'build', tile: tile }; this.sheetSig = ''; this.sheetAt = performance.now();
      this._renderBuild();
      $('sheet').hidden = false;
    }

    _renderBuild() {
      const g = this.game, h = g.human, tile = this.sheet.tile;
      let html = this._head('Bauen') + '<p class="sh-sub">Dein Gold: <b id="shGold"></b></p>', sig = '';
      for (const grp of BUILD) {
        html += '<div class="grp">' + grp[0] + '</div><div class="bgrid">';
        for (const type of grp[1]) {
          const pl = g.plan(h, type, tile), info = G.UINFO[type], n = g.count(h, type);
          html += '<button type="button" class="bitem' + (pl.ok ? '' : ' off') + '" data-build="' + type + '" title="' + esc(info.desc) + '">' +
            (n ? '<span class="cnt">×' + n + '</span>' : '') + G.svg(G.UICON[type]) +
            '<span class="nm">' + info.name + (pl.up ? ' ausbauen' : '') + '</span>' +
            '<span class="cost">' + (pl.cost ? G.fmtNum(pl.cost) : 'Gratis') + '</span>' +
            (pl.ok ? '' : '<span class="why">' + esc(pl.why) + '</span>') + '</button>';
          sig += type + ':' + (pl.ok ? 1 : 0) + pl.why + pl.cost + (pl.up ? 'u' : '') + n + '|';
        }
        html += '</div>';
      }
      if (sig !== this.sheetSig) { $('sheetCard').innerHTML = html; this.sheetSig = sig; }
      const el = $('shGold');
      if (el) el.textContent = G.fmtNum(h.gold);
    }

    openPlayer(id) {
      this.sheet = { kind: 'player', id: id, confirm: false }; this.sheetSig = ''; this.sheetAt = performance.now();
      this._renderPlayer();
      $('sheet').hidden = false;
    }

    _renderPlayer() {
      const g = this.game, h = g.human, s = this.sheet, p = g.players[s.id], me = p === h, ally = h.allies.has(p.id);
      const traitor = g.isTraitor(p), canReq = g.canRequest(h, p), emb = h.embargo.has(p.id);
      const pending = g.requests.some(function (r) { return r.from === h && r.to === p; });
      const sig = [p.alive, ally, traitor, canReq, emb, pending, h.alive, s.confirm, g.phase].join();
      if (sig !== this.sheetSig) {
        this.sheetSig = sig;
        let html = this._head((G.flagsOK && p.flag ? p.flag + ' ' : '') + esc(p.name), rgb(p.color)) + '<div class="tags">';
        html += '<span class="tag">' + (me ? 'Das bist du' : p.type === NATION ? 'Nation' : 'Stamm') + '</span>';
        if (!p.alive) html += '<span class="tag bad">Besiegt</span>';
        if (ally) html += '<span class="tag good">Verbündet</span>';
        if (traitor) html += '<span class="tag bad">Verräter</span>';
        if (emb) html += '<span class="tag">Handel gestoppt</span>';
        html += '</div><div class="pstats">' +
          '<div class="pstat"><span class="k">Truppen</span><b id="psT"></b></div>' +
          '<div class="pstat"><span class="k">Gold</span><b id="psG"></b></div>' +
          '<div class="pstat"><span class="k">Gebiet</span><b id="psA"></b></div>' +
          '<div class="pstat"><span class="k">Städte</span><b id="psC"></b></div>' +
          '<div class="pstat"><span class="k">Häfen</span><b id="psP"></b></div>' +
          '<div class="pstat"><span class="k">Bündnisse</span><b id="psL"></b></div></div>';
        if (!me && p.alive && h.alive && g.phase === 'play') {
          html += '<div class="pacts">';
          if (ally) {
            html += '<button class="btn" type="button" data-act="dt">' + G.svg('gift') + 'Truppen spenden</button>' +
              '<button class="btn" type="button" data-act="dg">' + G.svg('gift') + 'Gold spenden</button>' +
              '<button class="btn danger" type="button" data-act="break">' + (s.confirm ? 'Wirklich brechen?' : 'Allianz brechen') + '</button>';
          } else {
            html += '<button class="btn" type="button" data-act="ally"' + (canReq ? '' : ' disabled') + '>' + G.svg('link') + (pending ? 'Angefragt …' : 'Allianz anfragen') + '</button>';
          }
          html += '<button class="btn ghost" type="button" data-act="emb">' + (emb ? 'Handel erlauben' : 'Handel stoppen') + '</button>';
          html += '<button class="btn ghost" type="button" data-act="focus">' + G.svg('home') + 'Zum Gebiet</button></div>';
        } else if (p.alive) {
          html += '<div class="pacts"><button class="btn ghost" type="button" data-act="focus">' + G.svg('home') + 'Zum Gebiet</button></div>';
        }
        $('sheetCard').innerHTML = html;
      }
      const total = Math.max(1, g.map.landTiles - g.falloutCount);
      $('psT').textContent = G.fmtTroops(p.troops);
      $('psG').textContent = G.fmtNum(p.gold);
      $('psA').textContent = pct(p.tiles / total);
      $('psC').textContent = g.count(p, U.CITY);
      $('psP').textContent = g.count(p, U.PORT);
      $('psL').textContent = p.allies.size;
    }

    _sheetClick(e) {
      const g = this.game, h = g.human, s = this.sheet;
      if (!s) return;
      const bi = e.target.closest('[data-build]');
      if (bi) {
        const type = +bi.dataset.build, res = g.build(h, type, s.tile);
        if (!res.ok) { this.toast(res.why); return; }
        this.closeSheet();
        this.toast(res.up ? G.UINFO[type].name + ' ausgebaut auf Stufe ' + res.up.level : BUILT_MSG[type]);
        return;
      }
      const b = e.target.closest('[data-act]');
      if (!b) return;
      const act = b.dataset.act;
      if (act === 'close') { this.closeSheet(); return; }
      const p = g.players[s.id];
      if (act === 'focus') { this.closeSheet(); this.focusPlayer(p.id, true); }
      else if (act === 'ally') { if (g.requestAlliance(h, p)) this.toast('Allianz bei ' + p.name + ' angefragt'); }
      else if (act === 'break') {
        if (!s.confirm) { s.confirm = true; }
        else { g.breakAlliance(h, p); s.confirm = false; }
      } else if (act === 'dt') {
        const n = h.troops * this.ratio;
        this.toast(g.donate(h, p, n, 0) ? G.fmtTroops(n) + ' Truppen an ' + p.name + ' gespendet' : 'Keine Truppen frei');
      } else if (act === 'dg') {
        const n = h.gold * this.ratio;
        this.toast(g.donate(h, p, 0, n) ? G.fmtNum(n) + ' Gold an ' + p.name + ' gespendet' : 'Kein Gold vorhanden');
      } else if (act === 'emb') {
        if (h.embargo.has(p.id)) h.embargo.delete(p.id); else h.embargo.add(p.id);
      }
      if (this.sheet && this.sheet.kind === 'player') this._renderPlayer();
    }

    // ------------------------------------------------------------ Fenster: Menü, Hilfe, Ende
    _modal(kind, html) {
      this.modalKind = kind;
      $('modalCard').innerHTML = html;
      $('modal').hidden = false;
    }

    closeModal() {
      $('modal').hidden = true;
      this.modalKind = '';
    }

    openMenu() {
      const app = this.app;
      app.hold('menu', true);
      this._modal('menu',
        '<h2 class="m-title">Pause</h2>' +
        '<div class="opts" style="margin-bottom:14px">' +
        '<label class="opt"><input type="checkbox" id="setDirect"' + (app.settings.direct ? ' checked' : '') + '><span>Tippen greift direkt an</span></label>' +
        '<label class="opt"><input type="checkbox" id="setNames"' + (app.settings.names ? ' checked' : '') + '><span>Namen anzeigen</span></label>' +
        '</div><div class="m-acts">' +
        '<button class="btn big" type="button" data-m="resume">Weiterspielen</button>' +
        '<button class="btn ghost" type="button" data-m="help">So wird gespielt</button>' +
        '<button class="btn danger" type="button" data-m="quit1">Spiel beenden</button></div>');
    }

    openHelp(back) {
      const li = function (icon, head, text) { return '<li>' + G.svg(icon) + '<div><b>' + head + '</b><br><span>' + text + '</span></div></li>'; };
      this._modal(back ? 'help-menu' : 'help',
        '<h2 class="m-title">So wird gespielt</h2><ul class="help">' +
        li('home', 'Startpunkt wählen', 'Tippe am Anfang auf freies Land. Dort entsteht dein Gebiet.') +
        li('sword', 'Ausbreiten und angreifen', 'Tippe auf Land neben deinem Gebiet und dann auf Angriff. Der Regler unten bestimmt, wie viel Prozent deiner Truppen losziehen.') +
        li('shield', 'Truppen haushalten', 'Truppen wachsen von selbst, am schnellsten bei etwa 40 % des Limits. Berge und Hochland kosten beim Erobern mehr Truppen.') +
        li('boat', 'Übers Wasser', 'Liegt das Ziel hinter Wasser, schickt das Menü ein Boot. Höchstens drei Boote sind gleichzeitig unterwegs.') +
        li('hammer', 'Bauen', 'Tippe auf dein eigenes Gebiet. Städte erhöhen das Truppenlimit, Häfen bringen Gold durch Handel, Verteidigungsposten schützen die Grenze.') +
        li('link', 'Allianzen', 'Tippe auf einen Gegner und frage eine Allianz an. Sie hält 10 Minuten. Wer sie bricht, gilt 30 Sekunden als Verräter und verteidigt sich schlechter.') +
        li('atom', 'Bomben', 'Ein Raketensilo startet Atombomben, Wasserstoffbomben und MIRV. Eine Flugabwehr fängt Bomben in ihrer Nähe ab.') +
        li('crown', 'Sieg', 'Wer 80 % des Landes hält, gewinnt.') +
        '</ul><div class="m-acts"><button class="btn big" type="button" data-m="' + (back ? 'menu' : 'close') + '">' + (back ? 'Zurück' : 'Verstanden') + '</button></div>');
    }

    showEnd(kind, name) {
      const g = this.game, h = g.human;
      this.app.hold('end', true);
      const total = Math.max(1, g.map.landTiles - g.falloutCount);
      let title, text;
      const duel = g.opts.duel && g.rival;
      if (kind === 'win' && duel && !g.rival.alive) { title = 'Duell gewonnen'; text = 'Du hast ' + g.rival.name + ' besiegt.'; }
      else if (kind === 'win') { title = 'Du hast gewonnen'; text = 'Du hältst ' + pct(h.tiles / total) + ' des Landes. Die Karte gehört dir.'; }
      else if (kind === 'defeat' && duel) { title = 'Duell verloren'; text = g.rival.name + ' hat dich besiegt. Du kannst zuschauen oder neu beginnen.'; }
      else if (kind === 'defeat') { title = 'Du wurdest besiegt'; text = (name ? name + ' hat dein letztes Gebiet erobert. ' : 'Dein letztes Gebiet ist gefallen. ') + 'Du kannst zuschauen oder neu beginnen.'; }
      else { title = name + ' hat gewonnen'; text = name + ' hält mehr als 80 % des Landes.'; }
      this._modal('end', '<h2 class="m-title">' + esc(title) + '</h2><p class="m-text">' + esc(text) + '</p><div class="m-acts">' +
        '<button class="btn big" type="button" data-m="new">Neues Spiel</button>' +
        '<button class="btn ghost" type="button" data-m="watch">' + (kind === 'win' ? 'Weiterspielen' : 'Zuschauen') + '</button></div>');
    }

    _modalClick(e) {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      const m = b.dataset.m, app = this.app;
      if (m === 'resume') { this.closeModal(); app.hold('menu', false); }
      else if (m === 'quit1') { b.dataset.m = 'quit'; b.textContent = 'Wirklich beenden? Der Spielstand geht verloren.'; }
      else if (m === 'help') this.openHelp(true);
      else if (m === 'menu') this.openMenu();
      else if (m === 'close') this.closeModal();
      else if (m === 'quit' || m === 'new') { this.closeModal(); app.hold('menu', false); app.hold('end', false); app.quit(); }
      else if (m === 'watch') { this.closeModal(); app.hold('end', false); }
    }

    _modalChange(e) {
      const app = this.app;
      if (e.target.id === 'setDirect') app.settings.direct = e.target.checked;
      else if (e.target.id === 'setNames') { app.settings.names = e.target.checked; if (app.ren) app.ren.showNames = e.target.checked; }
      app.saveSettings();
    }
  }
  G.UI = UI;
})(window.G);
