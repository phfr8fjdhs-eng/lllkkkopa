(function (G) {
  'use strict';
  const UT = G.UT, PT = G.PT, fmt = G.fmt, fmtT = G.fmtTroops, ICON = G.ICON, within = G.within;
  const $ = function (id) { return document.getElementById(id); };
  const esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  function svg(name, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true"><path fill="currentColor" d="' + ICON[name] + '"/></svg>';
  }

  const COLORS = [[226, 68, 60], [42, 122, 226], [241, 160, 36], [150, 84, 214], [28, 170, 150], [232, 86, 160]];
  const BUILD = [
    { t: UT.CITY, icon: 'city', note: 'Truppen-Limit +25K' },
    { t: UT.PORT, icon: 'port', note: 'Handel und Kriegsschiffe' },
    { t: UT.DEFENSE, icon: 'defense', note: 'Grenze fünfmal zäher' },
    { t: UT.SILO, icon: 'silo', note: 'Startet Bomben' },
    { t: UT.SAM, icon: 'sam', note: 'Fängt Bomben ab' },
    { t: UT.WARSHIP, icon: 'warship', note: 'Versenkt Boote, kapert Handel' },
    { t: UT.ATOM, icon: 'atom', note: 'Kleiner Krater' },
    { t: UT.HYDRO, icon: 'hydro', note: 'Riesiger Krater' },
    { t: UT.MIRV, icon: 'mirv', note: 'Verwüstet ein ganzes Reich' }
  ];
  const TERRAIN = ['Ebene', 'Hochland', 'Gebirge'];

  let MAPS = [], maps = {}, game = null, view = null;
  let paused = false, speed = 1, acc = 0, last = 0, ratio = 0.2;
  let sel = null, radialAt = 0, modalKind = '', infoId = 0, lbOpen = false, lbAt = -99, liveAt = -99, tradeAt = 0;
  let toastTimer = 0, endShown = false, botsTouched = false;
  const chips = new Map(), asks = new Map();
  const cfg = { name: 'Spieler', color: 0, map: 'welt', diff: 1, bots: -1, nations: true, instant: false, gold: false, troops: false, tap: false };

  function loadCfg() {
    try {
      const s = JSON.parse(localStorage.getItem('grenzland.v1') || '{}');
      for (const k in cfg) if (typeof s[k] === typeof cfg[k]) cfg[k] = s[k];
    } catch (e) { /* storage may be unavailable */ }
    if (cfg.map !== 'zufall' && !MAPS.some(function (m) { return m.id === cfg.map; })) cfg.map = 'welt';
    botsTouched = cfg.bots >= 0;
  }
  function saveCfg() {
    try { localStorage.setItem('grenzland.v1', JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  }

  // ---------- maps ----------
  function loadMap(id) {
    if (maps[id]) return Promise.resolve(maps[id]);
    if (id === 'zufall') {
      const seed = (Math.random() * 2e9) | 0;
      maps.zufall = G.buildMap(960, 600, G.randomClassMap(960, 600, seed), seed, { id: 'zufall', name: 'Zufallskarte', nations: [] });
      return Promise.resolve(maps.zufall);
    }
    const def = MAPS.find(function (m) { return m.id === id; });
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement('canvas');
        c.width = def.w; c.height = def.h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, def.w, def.h).data, cls = new Uint8Array(def.w * def.h);
        for (let i = 0; i < cls.length; i++) cls[i] = Math.round(d[i * 4] / 85);
        maps[id] = G.buildMap(def.w, def.h, cls, 12345, { id: def.id, name: def.name, nations: def.nations });
        resolve(maps[id]);
      };
      img.onerror = function () { reject(new Error('Karte konnte nicht geladen werden')); };
      img.src = 'data:image/png;base64,' + def.png;
    });
  }
  function defaultBots(map) { return Math.min(400, Math.round(map.landTiles / 1500 / 10) * 10); }
  function previewMap(id) {
    loadMap(id).then(function (map) {
      if (game || cfg.map !== id) return;
      view.setMap(map); view.fit(true);
      if (!botsTouched) setBots(defaultBots(map));
    }).catch(function (e) { toast(e.message); });
  }
  function setBots(n) {
    cfg.bots = n;
    const s = $('fBots');
    if (s) { s.value = n; $('fBotsVal').textContent = n; }
  }

  // ---------- small helpers ----------
  function toast(text) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function openModal(html, kind) {
    $('modalCard').innerHTML = html;
    $('modalCard').scrollTop = 0;
    $('modal').hidden = false;
    modalKind = kind;
  }
  function closeModal() {
    $('modal').hidden = true;
    if (modalKind === 'menu' || modalKind === 'help') setPaused(false);
    modalKind = '';
  }
  function setPaused(v) {
    paused = v;
    $('bPause').innerHTML = svg(v ? 'play' : 'pause', 18);
    $('bPause').setAttribute('aria-label', v ? 'Weiter' : 'Pause');
  }
  function press(box, el) {
    for (const b of box.children) b.setAttribute('aria-pressed', b === el ? 'true' : 'false');
  }

  // ---------- start screen ----------
  function showStart() {
    const list = MAPS.map(function (m) { return { id: m.id, name: m.name }; }).concat([{ id: 'zufall', name: 'Zufallskarte' }]);
    const check = function (id, label, on) {
      return '<label class="check" for="' + id + '"><input id="' + id + '" type="checkbox"' + (on ? ' checked' : '') + '>' + label + '</label>';
    };
    let h = '<h1>Grenzland</h1><p>Erobere die Karte. Einzelspieler gegen Bots und Nationen.</p>';
    h += '<div class="field"><label for="fName">Dein Name</label><input id="fName" type="text" maxlength="18" autocomplete="off" value="' + esc(cfg.name) + '"></div>';
    h += '<div class="field"><div class="lab">Farbe</div><div class="swatches" id="fColor">' + COLORS.map(function (c, i) {
      return '<button type="button" class="sw" data-i="' + i + '" aria-label="Farbe ' + (i + 1) + '" aria-pressed="' + (i === cfg.color) + '" style="background:rgb(' + c.join(',') + ')"></button>';
    }).join('') + '</div></div>';
    h += '<div class="field"><div class="lab">Karte</div><div class="chips" id="fMap">' + list.map(function (m) {
      return '<button type="button" class="chipb" data-id="' + m.id + '" aria-pressed="' + (m.id === cfg.map) + '">' + esc(m.name) + '</button>';
    }).join('') + '</div></div>';
    h += '<div class="field"><div class="lab">Schwierigkeit</div><div class="seg" id="fDiff">' + G.DIFF_NAMES.map(function (n, i) {
      return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === cfg.diff) + '">' + n + '</button>';
    }).join('') + '</div></div>';
    h += '<div class="field"><label for="fBots">Bots <b id="fBotsVal">' + Math.max(0, cfg.bots) + '</b></label><input id="fBots" type="range" min="0" max="400" step="10" value="' + Math.max(0, cfg.bots) + '"></div>';
    h += '<div class="field"><div class="lab">Optionen</div><div class="checks">' + check('fNations', 'Nationen', cfg.nations) +
      check('fInstant', 'Sofort bauen', cfg.instant) + check('fGold', 'Unendlich Gold', cfg.gold) + check('fTroops', 'Unendlich Truppen', cfg.troops) + '</div></div>';
    h += '<button class="btn" id="fStart" type="button">Spiel starten</button>';
    h += '<button class="btn ghost" id="fHelp" type="button">So wird gespielt</button>';
    openModal(h, 'start');
    $('fColor').addEventListener('click', function (e) {
      const b = e.target.closest('.sw');
      if (b) { cfg.color = +b.dataset.i; press(this, b); }
    });
    $('fMap').addEventListener('click', function (e) {
      const b = e.target.closest('.chipb');
      if (!b) return;
      if (b.dataset.id === 'zufall') delete maps.zufall;
      cfg.map = b.dataset.id; press(this, b);
      previewMap(cfg.map);
    });
    $('fDiff').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) { cfg.diff = +b.dataset.i; press(this, b); }
    });
    $('fBots').addEventListener('input', function () { botsTouched = true; cfg.bots = +this.value; $('fBotsVal').textContent = this.value; });
    $('fStart').addEventListener('click', startGame);
    $('fHelp').addEventListener('click', function () { showHelp(true); });
  }

  function helpHtml() {
    return '<h2>So wird gespielt</h2><ul class="help">' +
      '<li><b>Start:</b> Tippe auf freies Land und wähle so deinen Startpunkt.</li>' +
      '<li><b>Ausbreiten:</b> Tippe auf Land neben deinem Gebiet und dann auf <b>Angriff</b>. Der Regler unten legt fest, wie viele Truppen du schickst.</li>' +
      '<li><b>Truppen:</b> Sie wachsen von selbst, am schnellsten bei gut 40 % des Limits. Mehr Land und Städte heben das Limit.</li>' +
      '<li><b>Gold:</b> Kommt laufend dazu, ausserdem durch Handel und Eroberungen. Damit baust du Städte, Häfen, Verteidigung und Raketen.</li>' +
      '<li><b>Übers Wasser:</b> Tippe auf ein fremdes Ufer und schicke ein <b>Boot</b>. Höchstens drei sind gleichzeitig unterwegs.</li>' +
      '<li><b>Allianzen:</b> Verbündete greifen sich zehn Minuten lang nicht an. Wer eine Allianz bricht, ist 30 Sekunden lang leichter zu erobern.</li>' +
      '<li><b>Einkreisen:</b> Wer ganz von einem Gegner umschlossen ist, wird sofort übernommen.</li>' +
      '<li><b>Sieg:</b> Wer 80 % des Landes hält, gewinnt.</li>' +
      '<li><b>Karte:</b> Ziehen verschiebt, zwei Finger oder das Mausrad zoomen. Mit der Maus greift ein Linksklick direkt an, der Rechtsklick öffnet das Menü.</li>' +
      '</ul>';
  }
  function showHelp(fromStart) {
    openModal(helpHtml() + '<button class="btn" data-act="' + (fromStart ? 'start' : 'resume') + '" type="button">' + (fromStart ? 'Zurück' : 'Weiterspielen') + '</button>', fromStart ? 'starthelp' : 'help');
  }

  function startGame() {
    cfg.name = ($('fName').value || '').trim() || 'Spieler';
    cfg.nations = $('fNations').checked; cfg.instant = $('fInstant').checked;
    cfg.gold = $('fGold').checked; cfg.troops = $('fTroops').checked;
    cfg.bots = +$('fBots').value;
    if (!botsTouched) { const keep = cfg.bots; cfg.bots = -1; saveCfg(); cfg.bots = keep; } else saveCfg();
    $('fStart').disabled = true; $('fStart').textContent = 'Karte wird vorbereitet';
    loadMap(cfg.map).then(function (map) {
      game = new G.Game(map, {
        seed: (Math.random() * 2e9) | 0, difficulty: cfg.diff, bots: cfg.bots, nations: cfg.nations,
        instantBuild: cfg.instant, infiniteGold: cfg.gold, infiniteTroops: cfg.troops, spawnTicks: 150
      });
      game.setup({ name: cfg.name, color: COLORS[cfg.color] });
      view.setMap(map); view.setGame(game); view.fit(false);
      view.cam.z = within(Math.max(view.cw / map.W, view.ch / map.H) * 0.5, view.cam.z, 4);
      $('modal').hidden = true; modalKind = '';
      $('hud').hidden = false; $('spawnBar').hidden = false; $('ctrl').hidden = true; $('lb').hidden = true;
      $('feedMsgs').innerHTML = ''; $('feedLive').innerHTML = ''; chips.clear(); asks.clear();
      $('lbRows').innerHTML = ''; $('clock').textContent = '0:00';
      speed = 1; $('bSpeed').textContent = '1×'; acc = 0; endShown = false; lbAt = liveAt = -99; tradeAt = 0;
      setPaused(false);
      view.placeNames();
      hudTick();
    }).catch(function (e) {
      toast(e.message);
      $('fStart').disabled = false; $('fStart').textContent = 'Spiel starten';
    });
  }
  function quitGame() {
    game = null; closeRadial(); $('sheet').hidden = true;
    $('hud').hidden = true;
    if (cfg.map === 'zufall') delete maps.zufall;
    showStart();
    previewMap(cfg.map);
  }

  // ---------- feed ----------
  function addMsg(text, cls) {
    const box = $('feedMsgs'), el = document.createElement('div');
    el.className = 'msg ' + (cls || 'info');
    el.textContent = text;
    box.appendChild(el);
    while (box.querySelectorAll('.msg:not(.ask)').length > 4) box.querySelector('.msg:not(.ask)').remove();
    setTimeout(function () { el.remove(); }, 7000);
  }
  function addAsk(key, text, yes, no, onYes, onNo) {
    if (asks.has(key)) return;
    const el = document.createElement('div');
    el.className = 'msg ask';
    el.innerHTML = '<span>' + esc(text) + '</span><div><button type="button" class="yes">' + yes + '</button>' + (no ? '<button type="button" class="no">' + no + '</button>' : '') + '</div>';
    el.querySelector('.yes').addEventListener('click', function () { dropAsk(key); onYes(); });
    if (no) el.querySelector('.no').addEventListener('click', function () { dropAsk(key); onNo(); });
    $('feedMsgs').appendChild(el);
    asks.set(key, el);
  }
  function dropAsk(key) {
    const el = asks.get(key);
    if (el) { el.remove(); asks.delete(key); }
  }
  function pump() {
    const ev = game.events, h = game.human;
    if (!ev.length) return;
    for (let i = 0; i < ev.length; i++) {
      const e = ev[i];
      if (e.k === 'msg') addMsg(e.text, e.cls);
      else if (e.k === 'allyReq') {
        const from = game.players[e.from], id = e.id;
        addAsk('q' + id, from.name + ' bietet dir eine Allianz an', 'Annehmen', 'Ablehnen',
          function () { game.answerRequest(id, true); }, function () { game.answerRequest(id, false); });
      } else if (e.k === 'renew') {
        const q = game.players[e.id];
        addAsk('r' + q.id, 'Die Allianz mit ' + q.name + ' läuft bald ab', 'Verlängern', 'Auslaufen lassen',
          function () { game.renewAlliance(h, q); }, function () { /* let it run out */ });
      } else if (e.k === 'start') {
        $('spawnBar').hidden = true; $('ctrl').hidden = false; $('lb').hidden = false;
        const W = game.W;
        view.flyTo(h.spawnTile % W, (h.spawnTile / W) | 0, within(Math.min(view.cw, view.ch) / 70, 2.2, 6));
        addMsg('Los geht es. Breite dich aus, bevor es andere tun.', 'good');
      } else if (e.k === 'defeat') showEnd('defeat', null);
      else if (e.k === 'win') showEnd(game.players[e.id] === h ? 'win' : 'other', game.players[e.id]);
    }
    ev.length = 0;
  }

  function live() {
    const h = game.human, seen = new Set(), box = $('feedLive');
    const put = function (key, cls, text, action) {
      seen.add(key);
      let el = chips.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'msg chip ' + cls;
        el.innerHTML = '<span></span>' + (action ? '<button type="button" aria-label="Zurückrufen">' + svg('close', 13) + '</button>' : '');
        if (action) el.lastChild.addEventListener('click', action);
        box.appendChild(el);
        chips.set(key, el);
      }
      if (el.firstChild.textContent !== text) el.firstChild.textContent = text;
    };
    if (h.alive) {
      for (const a of h.out) {
        put('o' + a.id, 'info', 'Angriff auf ' + (a.tid ? game.players[a.tid].name : 'freies Land') + ' · ' + fmtT(a.troops), function () { game.retreat(a); live(); });
      }
      const inc = h.inc.slice().sort(function (a, b) { return b.troops - a.troops; });
      for (let i = 0; i < inc.length && i < 3; i++) put('i' + inc[i].id, 'bad', inc[i].a.name + ' greift an · ' + fmtT(inc[i].troops), null);
      if (inc.length > 3) put('more', 'bad', '+' + (inc.length - 3) + ' weitere Angriffe', null);
      for (const u of h.units) {
        if (u.type !== UT.TRANSPORT) continue;
        put('b' + u.id, 'info', (u.retreat ? 'Boot kehrt um · ' : 'Boot unterwegs · ') + fmtT(u.troops), function () { u.retreat = true; });
      }
    }
    for (const e of chips) if (!seen.has(e[0])) { e[1].remove(); chips.delete(e[0]); }
    for (const e of asks) {
      const key = e[0];
      if (key[0] === 'q') {
        const id = +key.slice(1);
        if (!game.requests.some(function (r) { return r.id === id; })) dropAsk(key);
      } else {
        const al = h.allies.get(+key.slice(1));
        if (!al || !al.prompted) dropAsk(key);
      }
    }
  }

  function leaderboard() {
    const h = game.human, den = Math.max(1, game.map.landTiles - game.falloutCount);
    const ps = game.players.filter(function (p) { return p && p.alive; }).sort(function (a, b) { return b.tiles - a.tiles; });
    const n = lbOpen ? 10 : (view.cw < 700 ? 3 : 5);
    const row = function (p, i) {
      const s = p.tiles / den * 100;
      return '<button class="lbrow' + (p === h ? ' me' : '') + '" data-id="' + p.id + '" type="button"><i>' + (i + 1) + '</i><span><span class="dot" style="background:' + p.css + '"></span>' +
        esc(p.name) + '</span><b>' + s.toFixed(s >= 10 ? 0 : 1) + '%</b><b>' + fmtT(p.troops) + '</b></button>';
    };
    let html = '';
    for (let i = 0; i < n && i < ps.length; i++) html += row(ps[i], i);
    const hi = ps.indexOf(h);
    if (hi >= n) html += row(h, hi);
    $('lbRows').innerHTML = html;
    $('lbCount').textContent = ps.length + ' im Spiel';
  }

  function hudTick() {
    const h = game.human, T = game.ticks;
    if (game.phase === 'spawn') {
      const k = Math.min(1, T / game.spawnEnd);
      $('spawnFill').style.width = (k * 100).toFixed(1) + '%';
      $('spawnHint').textContent = h.spawned ? (k < 1 ? 'Tippe woanders, um den Start zu verlegen' : 'Gleich geht es los')
        : (k < 1 ? 'Tippe auf freies Land' : 'Tippe auf freies Land, dann geht es los');
      return;
    }
    $('clock').textContent = clock((T - game.playStart) / 10);
    if (h.alive) {
      $('sTroops').textContent = fmtT(h.troops);
      $('sTroopsSub').textContent = 'von ' + (game.opts.infiniteTroops ? '∞' : fmtT(game.maxTroops(h))) + ' · +' + fmtT(Math.max(0, game.troopGrowth(h)) * 10) + '/s';
      $('sGold').textContent = game.opts.infiniteGold ? '∞' : fmt(h.gold);
      $('sGoldSub').textContent = '+' + fmt(game.goldRate(h) * 10) + '/s';
      $('ratioTroops').textContent = fmtT(h.troops * ratio);
    }
    if (T - lbAt >= 10) { lbAt = T; leaderboard(); }
    if (T - liveAt >= 3) { liveAt = T; live(); }
    if (T - tradeAt >= 150) {
      tradeAt = T;
      if (h.tradeGold > 0) { addMsg('Handel bringt ' + fmt(h.tradeGold) + ' Gold', 'good'); h.tradeGold = 0; }
    }
    if (modalKind === 'info' && T % 5 === 0) renderInfo();
  }

  // ---------- end of game ----------
  function showEnd(kind, winner) {
    if (kind === 'other' && endShown === 'defeat' && !$('modal').hidden) { /* replace the defeat card */ }
    else if (endShown && kind !== 'other') return;
    endShown = kind;
    closeRadial(); $('sheet').hidden = true;
    const h = game.human, den = Math.max(1, game.map.landTiles - game.falloutCount);
    let s;
    if (kind === 'win') s = '<h2>Sieg!</h2><p>Du hältst ' + (h.tiles / den * 100).toFixed(0) + ' % des Landes. Die Karte gehört dir.</p>';
    else if (kind === 'defeat') s = '<h2>Niederlage</h2><p>Dein Gebiet wurde vollständig erobert.</p>';
    else s = '<h2>' + esc(winner.name) + ' gewinnt</h2><p>' + esc(winner.name) + ' hält ' + (winner.tiles / den * 100).toFixed(0) + ' % des Landes.</p>';
    s += '<div class="facts">' + fact('Spielzeit', clock((game.ticks - game.playStart) / 10)) + fact('Eroberte Gegner', h.conquests) + fact('Dein Gebiet', (h.tiles / den * 100).toFixed(1) + ' %') + '</div>';
    s += '<button class="btn" data-act="quit" type="button">Neues Spiel</button>';
    s += '<button class="btn ghost" data-act="close" type="button">' + (kind === 'win' ? 'Weiterspielen' : 'Zuschauen') + '</button>';
    openModal(s, 'end');
  }

  // ---------- player card ----------
  function fact(label, value) { return '<div><small>' + label + '</small><b>' + value + '</b></div>'; }
  function openInfo(id) { infoId = id; renderInfo(); }
  function renderInfo() {
    const p = game.players[infoId], h = game.human, T = game.ticks;
    const den = Math.max(1, game.map.landTiles - game.falloutCount), me = p === h, al = h.allies.get(p.id);
    let kind;
    if (!p.alive) kind = 'Besiegt';
    else if (me) kind = 'Das bist du';
    else if (p.type === PT.NATION) {
      const r = game.relation(p, h);
      kind = 'Nation · ' + (r < -50 ? 'feindlich' : r < 0 ? 'misstrauisch' : r < 50 ? 'neutral' : 'freundlich') + ' gesinnt';
    } else kind = 'Bot';
    let s = '<div class="who"><span class="dot big" style="background:' + p.css + '"></span><div><h2>' + (p.flag ? G.flagOf(p.flag) + ' ' : '') + esc(p.name) + '</h2><p>' + kind + '</p></div></div>';
    s += '<div class="facts">' + fact('Truppen', fmtT(p.troops)) + fact('Gold', me && game.opts.infiniteGold ? '∞' : fmt(p.gold)) + fact('Gebiet', (p.tiles / den * 100).toFixed(1) + ' %') + '</div>';
    s += '<div class="facts six">' + fact('Städte', p.cnt[UT.CITY]) + fact('Häfen', p.cnt[UT.PORT]) + fact('Posten', p.cnt[UT.DEFENSE]) +
      fact('Silos', p.cnt[UT.SILO]) + fact('Abwehr', p.cnt[UT.SAM]) + fact('Schiffe', p.cnt[UT.WARSHIP]) + '</div>';
    const notes = [];
    if (al) notes.push('Verbündet, noch ' + clock((al.end - T) / 10));
    if (p.traitorUntil > T) notes.push('Verräter, noch ' + Math.ceil((p.traitorUntil - T) / 10) + ' s leichter zu erobern');
    if (!me && h.embargo.has(p.id)) notes.push('Du handelst nicht mit diesem Spieler');
    if (!me && p.embargo.has(h.id)) notes.push('Dieser Spieler handelt nicht mit dir');
    if (notes.length) s += '<p class="notes">' + notes.join(' · ') + '</p>';
    if (!me && p.alive && h.alive && game.phase === 'play') {
      if (al) {
        s += '<div class="acts"><button class="btn ghost" data-act="troops" type="button">Truppen spenden (' + fmtT(h.troops * ratio) + ')</button>' +
          '<button class="btn ghost" data-act="gold" type="button">Gold spenden (' + fmt(Math.min(h.gold, 1e9) * 0.1) + ')</button></div>';
        s += '<button class="btn ghost" data-act="renew" type="button">Allianz verlängern</button>';
        s += '<button class="btn danger" data-act="break" type="button">Allianz brechen</button>';
      } else {
        s += '<button class="btn" data-act="ally" type="button"' + (game.canRequestAlliance(h, p) ? '' : ' disabled') + '>Allianz anfragen</button>';
      }
      s += '<button class="btn ghost" data-act="embargo" type="button">' + (h.embargo.has(p.id) ? 'Handel wieder erlauben' : 'Handel stoppen') + '</button>';
    }
    if (p.alive) s += '<button class="btn ghost" data-act="show" type="button">Auf der Karte zeigen</button>';
    s += '<button class="btn ghost" data-act="close" type="button">Schliessen</button>';
    const card = $('modalCard'), top = card.scrollTop;
    card.innerHTML = s;
    $('modal').hidden = false; modalKind = 'info';
    card.scrollTop = top;
  }

  function showMenu() {
    setPaused(true);
    openModal('<h2>Pause</h2><p>' + esc(game.map.name) + ' · ' + G.DIFF_NAMES[game.opts.difficulty] + '</p>' +
      '<button class="btn" data-act="resume" type="button">Weiterspielen</button>' +
      '<button class="btn ghost" data-act="help" type="button">So wird gespielt</button>' +
      '<label class="check wide" for="mTap"><input id="mTap" type="checkbox"' + (cfg.tap ? ' checked' : '') + '>Tippen greift direkt an, ohne Menü</label>' +
      '<button class="btn ghost" data-act="quit" type="button">Spiel beenden</button>', 'menu');
    $('mTap').addEventListener('change', function () { cfg.tap = this.checked; saveCfg(); });
  }

  function onModalAct(act) {
    const h = game ? game.human : null, p = game ? game.players[infoId] : null;
    if (act === 'start') { showStart(); return; }
    if (act === 'close' || act === 'resume') { closeModal(); return; }
    if (act === 'help') { showHelp(false); return; }
    if (act === 'quit') { quitGame(); return; }
    if (act === 'confirmBreak') { game.breakAlliance(h, p); closeModal(); return; }
    if (act === 'ally') { toast(game.requestAlliance(h, p) ? 'Anfrage an ' + p.name + ' gesendet' : 'Gerade nicht möglich'); renderInfo(); return; }
    if (act === 'break') {
      openModal('<h2>Allianz brechen?</h2><p>Du wirst zum Verräter: 30 Sekunden lang verlieren Angreifer gegen dich nur halb so viele Truppen, und andere Nationen trauen dir weniger.</p>' +
        '<button class="btn danger" data-act="confirmBreak" type="button">Allianz mit ' + esc(p.name) + ' brechen</button>' +
        '<button class="btn ghost" data-act="close" type="button">Abbrechen</button>', 'confirm');
      return;
    }
    if (act === 'troops') { if (game.donate(h, p, 'troops', h.troops * ratio)) toast('Truppen an ' + p.name + ' geschickt'); renderInfo(); return; }
    if (act === 'gold') { if (game.donate(h, p, 'gold', Math.floor(Math.min(h.gold, 1e9) * 0.1))) toast('Gold an ' + p.name + ' geschickt'); renderInfo(); return; }
    if (act === 'renew') { game.renewAlliance(h, p); dropAsk('r' + p.id); renderInfo(); return; }
    if (act === 'embargo') { if (h.embargo.has(p.id)) h.embargo.delete(p.id); else h.embargo.add(p.id); renderInfo(); return; }
    if (act === 'show') {
      closeModal();
      if (p.nameSize) view.flyTo(p.nameX, p.nameY, within(26 / Math.max(1, p.nameSize) * 1.2, view.cam.z * 0.6, 8));
    }
  }

  // ---------- circle menu ----------
  function closeRadial() {
    $('radial').hidden = true; sel = null;
    if (view) view.mark = -1;
  }
  function openRadial(tile, sx, sy) {
    const h = game.human;
    if (!h.alive) { if (game.owner[tile]) openInfo(game.owner[tile]); return; }
    const a = game.actionsAt(h, tile), R = $('radial');
    sel = a; view.mark = tile;
    R.style.left = within(sx, 118, Math.max(118, view.cw - 118)) + 'px';
    R.style.top = within(sy, 168, Math.max(168, view.ch - 215)) + 'px';
    let cap;
    if (!a.land) cap = 'Wasser';
    else if (a.own) cap = 'Dein Gebiet';
    else if (a.target) cap = a.target.name + ' · ' + fmtT(a.target.troops);
    else cap = (game.fallout[tile] ? 'Verstrahltes Land' : 'Freies Land') + ' · ' + TERRAIN[game.map.mag[tile] < 10 ? 0 : game.map.mag[tile] < 20 ? 1 : 2];
    $('rCap').textContent = cap;
    let mode = '';
    if (a.canAttack) mode = 'attack';
    else if (a.boat) mode = 'boat';
    else if (!a.land && h.cnt[UT.WARSHIP] > 0) mode = 'ship';
    const c = $('rC');
    c.dataset.mode = mode;
    c.classList.toggle('off', !mode);
    c.innerHTML = svg(mode === 'boat' ? 'boat' : mode === 'ship' ? 'warship' : 'sword', 26) + '<span>' + (mode === 'boat' ? 'Boot' : mode === 'ship' ? 'Schiff' : 'Angriff') + '</span>';
    $('rE').disabled = !a.boat;
    const q = a.target, allied = !!q && h.allies.has(q.id), w = $('rW');
    w.classList.toggle('danger', allied);
    w.lastChild.textContent = allied ? 'Brechen' : 'Allianz';
    w.disabled = !q || (!allied && !game.canRequestAlliance(h, q));
    R.hidden = false; radialAt = performance.now();
  }
  function radialAct(which) {
    if (!sel || performance.now() - radialAt < 260) return;
    const a = sel, h = game.human;
    if (which === 'C') {
      const mode = $('rC').dataset.mode;
      if (mode === 'attack') { if (!game.attack(h, a.tid, h.troops * ratio, -1)) toast('Zu wenig Truppen'); }
      else if (mode === 'boat') sendBoat(a);
      else if (mode === 'ship') toast(game.moveWarship(h, a.tile) ? 'Kriegsschiff nimmt Kurs' : 'Kein Schiff kann dorthin');
      else toast(a.why || 'Hier nicht möglich');
    } else if (which === 'E') sendBoat(a);
    else if (which === 'N') { closeRadial(); openBuild(a.tile); return; }
    else if (which === 'S') {
      if (a.target) openInfo(a.target.id);
      else if (a.own) openInfo(h.id);
      else toast($('rCap').textContent);
    } else if (which === 'W') {
      const q = a.target;
      if (h.allies.has(q.id)) { infoId = q.id; onModalAct('break'); }
      else toast(game.requestAlliance(h, q) ? 'Anfrage an ' + q.name + ' gesendet' : 'Gerade nicht möglich');
    }
    closeRadial();
  }
  function sendBoat(a) {
    const h = game.human;
    toast(game.sendBoat(h, a.boat, h.troops * ratio) ? 'Boot läuft aus' : 'Boot kann nicht auslaufen');
  }

  // ---------- build menu ----------
  let buildTile = -1;
  function openBuild(tile) {
    const h = game.human;
    buildTile = tile;
    let html = '';
    const near = game.owner[tile] === h.id ? game.structNear(tile, 4) : null;
    if (near && game.canUpgrade(h, near)) {
      const cost = game.cost(h, near.type);
      html += '<button class="item up" type="button" data-up="1"' + (h.gold >= cost ? '' : ' disabled') + '>' + svg(BUILD.find(function (b) { return b.t === near.type; }).icon, 26) +
        '<div><b>' + G.UNAME[near.type] + ' ausbauen</b><small>Stufe ' + near.level + ' auf ' + (near.level + 1) + (h.gold >= cost ? '' : ' · zu wenig Gold') + '</small></div><em>' + (cost ? fmt(cost) : 'gratis') + '</em></button>';
    }
    for (const b of BUILD) {
      const c = game.buildCheck(h, b.t, tile);
      html += '<button class="item" type="button" data-t="' + b.t + '"' + (c.ok ? '' : ' disabled') + '>' + svg(b.icon, 26) + '<b>' + G.UNAME[b.t] + '</b><em>' +
        (c.cost ? fmt(c.cost) : 'gratis') + '</em><small>' + (c.ok ? b.note : esc(c.why)) + '</small></button>';
    }
    $('sheetBody').innerHTML = html;
    $('sheet').hidden = false;
    view.mark = tile;
  }
  function closeBuild() { $('sheet').hidden = true; if (view) view.mark = -1; }
  function onBuild(e) {
    const b = e.target.closest('.item');
    if (!b || b.disabled) return;
    const h = game.human;
    if (b.dataset.up) {
      const u = game.structNear(buildTile, 4);
      toast(u && game.upgrade(h, u) ? G.UNAME[u.type] + ' ausgebaut' : 'Ausbau nicht möglich');
    } else {
      const t = +b.dataset.t, u = game.build(h, t, buildTile);
      if (!u) toast('Nicht möglich');
      else if (t >= UT.ATOM) toast(G.UNAME[t] + ' gestartet');
      else if (t === UT.WARSHIP) toast('Kriegsschiff läuft aus');
      else toast(G.UNAME[t] + (game.opts.instantBuild ? ' gebaut' : ' wird gebaut'));
    }
    closeBuild();
  }

  // ---------- taps on the map ----------
  function tap(sx, sy, direct) {
    if (!game) return;
    const tile = view.tileAt(sx, sy);
    if (tile < 0) return;
    const h = game.human;
    if (game.phase === 'spawn') {
      if (!game.canSpawnAt(tile) && game.owner[tile] !== h.id) { toast(game.map.land[tile] ? 'Hier ist schon jemand' : 'Wähle Land, kein Wasser'); return; }
      if (game.spawn(h, tile)) { view.flush(); view.placeName(h); hudTick(); }
      return;
    }
    if (direct && h.alive && game.owner[tile] !== h.id && game.map.land[tile]) {
      const why = game.strike(h, tile, ratio);
      if (why) toast(why);
      return;
    }
    openRadial(tile, sx, sy);
  }

  function bind() {
    const cv = $('cv'), ptr = new Map();
    let moved = false, downAt = 0, downX = 0, downY = 0, downType = '';
    const two = function () {
      const a = Array.from(ptr.values());
      return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.max(1, Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y)) };
    };
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      closeRadial();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) { moved = false; downAt = performance.now(); downX = e.clientX; downY = e.clientY; downType = e.pointerType; }
      else moved = true;
      view.fly = null;
    });
    cv.addEventListener('pointermove', function (e) {
      const p = ptr.get(e.pointerId);
      if (!p) return;
      if (ptr.size === 1) {
        if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 7) moved = true;
        if (moved) view.pan(e.clientX - p.x, e.clientY - p.y);
        p.x = e.clientX; p.y = e.clientY;
      } else if (ptr.size === 2) {
        const a = two();
        p.x = e.clientX; p.y = e.clientY;
        const b = two();
        view.pan(b.x - a.x, b.y - a.y);
        view.zoomAt(b.x, b.y, b.d / a.d);
      }
    });
    const up = function (e) {
      if (!ptr.has(e.pointerId)) return;
      ptr.delete(e.pointerId);
      if (ptr.size === 0 && !moved && e.type === 'pointerup' && performance.now() - downAt < 700) {
        const r = cv.getBoundingClientRect();
        tap(e.clientX - r.left, e.clientY - r.top, downType === 'mouse' || cfg.tap);
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (!game || game.phase !== 'play') return;
      const r = cv.getBoundingClientRect(), tile = view.tileAt(e.clientX - r.left, e.clientY - r.top);
      if (tile >= 0) openRadial(tile, e.clientX - r.left, e.clientY - r.top);
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.shiftKey) { setRatio(ratio * 100 + (e.deltaY < 0 ? 5 : -5)); return; }
      const r = cv.getBoundingClientRect();
      view.zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
    window.addEventListener('resize', function () { view.resize(); });
    document.addEventListener('visibilitychange', function () { last = performance.now(); });
    document.addEventListener('keydown', function (e) {
      if (e.target && e.target.tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        if (!$('radial').hidden) closeRadial();
        else if (!$('sheet').hidden) closeBuild();
        else if (!$('modal').hidden && modalKind !== 'start' && modalKind !== 'starthelp') closeModal();
      } else if (e.key === ' ' && game && $('modal').hidden) { e.preventDefault(); setPaused(!paused); }
    });

    $('rC').addEventListener('click', function () { radialAct('C'); });
    $('rN').addEventListener('click', function () { radialAct('N'); });
    $('rE').addEventListener('click', function () { radialAct('E'); });
    $('rS').addEventListener('click', function () { radialAct('S'); });
    $('rW').addEventListener('click', function () { radialAct('W'); });
    $('sheetBody').addEventListener('click', onBuild);
    $('sheetClose').addEventListener('click', closeBuild);
    $('sheet').addEventListener('click', function (e) { if (e.target === this) closeBuild(); });
    $('modal').addEventListener('click', function (e) {
      if (e.target === this && (modalKind === 'info' || modalKind === 'menu' || modalKind === 'help' || modalKind === 'confirm')) { closeModal(); return; }
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) onModalAct(b.dataset.act);
    });
    $('ratio').addEventListener('input', function () { setRatio(+this.value); });
    $('bPause').addEventListener('click', function () { setPaused(!paused); });
    $('bSpeed').addEventListener('click', function () {
      speed = speed === 1 ? 2 : speed === 2 ? 4 : 1;
      this.textContent = speed + '×';
    });
    $('bHome').addEventListener('click', function () {
      const h = game.human;
      if (h.alive && h.nameSize) view.flyTo(h.nameX, h.nameY, within(Math.min(view.cw, view.ch) / Math.max(30, (h.x1 - h.x0) * 1.5), 1.2, 7));
      else if (h.spawnTile >= 0) view.flyTo(h.spawnTile % game.W, (h.spawnTile / game.W) | 0, 4);
    });
    $('bMenu').addEventListener('click', showMenu);
    $('lbHead').addEventListener('click', function () {
      lbOpen = !lbOpen;
      this.setAttribute('aria-expanded', lbOpen ? 'true' : 'false');
      if (game) leaderboard();
    });
    $('lbRows').addEventListener('pointerdown', function (e) {
      const b = e.target.closest('.lbrow');
      if (b && game) openInfo(+b.dataset.id);
    });
  }
  function setRatio(pct) {
    pct = within(Math.round(pct), 1, 100);
    ratio = pct / 100;
    $('ratio').value = pct;
    $('ratioPct').textContent = pct + '%';
    if (game && game.human.alive) $('ratioTroops').textContent = fmtT(game.human.troops * ratio);
  }

  // ---------- main loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(200, now - last);
    last = now;
    let alpha = 1;
    if (game && !paused) {
      acc += dt * speed;
      let n = 0;
      while (acc >= 100 && n < 8) { game.tick(); acc -= 100; n++; }
      if (acc >= 100) acc = 0;
      if (n) { view.flush(); view.placeNames(); pump(); if (game) hudTick(); }
      alpha = acc / 100;
    }
    view.draw(alpha, now);
  }

  G.boot = function (defs) {
    MAPS = defs;
    view = new G.View($('cv'));
    $('bPause').innerHTML = svg('pause', 18);
    $('bHome').innerHTML = svg('home', 18);
    $('bMenu').innerHTML = svg('menu', 18);
    $('icTroops').innerHTML = svg('troops', 20);
    $('icGold').innerHTML = svg('gold', 20);
    $('rN').innerHTML = svg('hammer', 22) + '<span>Bauen</span>';
    $('rE').innerHTML = svg('boat', 22) + '<span>Boot</span>';
    $('rS').innerHTML = svg('info', 22) + '<span>Info</span>';
    $('rW').innerHTML = svg('ally', 22) + '<span>Allianz</span>';
    $('sheetClose').innerHTML = svg('close', 16);
    bind();
    loadCfg();
    setRatio(20);
    showStart();
    previewMap(cfg.map);
    last = performance.now();
    requestAnimationFrame(frame);
    G.debug = { get game() { return game; }, get view() { return view; }, tap: tap, cfg: cfg };
  };
})(globalThis.G = globalThis.G || {});
