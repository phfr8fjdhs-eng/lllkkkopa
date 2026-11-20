(function (G) {
  'use strict';
  // The campaign «Feldzug» on screen: the level map, the card of a level, the quest bar while
  // playing, the tips that point at the right button, and the card at the end. The levels
  // themselves and their quests are in src/03d_level.js; doku/feldzug.md describes them.
  const UT = G.UT;
  const $ = function (id) { return document.getElementById(id); };
  const KEY = 'grenzland.feldzug';
  // the skill levels that come next (doku/feldzug.md), shown locked until they exist
  const LATER = ['Blitzkrieg', 'Zwei Fronten', 'Inselhüpfen', 'Tarnung', 'Kalter Krieg', 'Kessel', 'Wirtschaftswunder', 'Atomwinter', 'Verrat', 'Imperium'];
  let best = {}, cur = 0, maps = {};
  let tipCur = -1, tipNext = 0, tipSince = 0, glow = null;

  function load() {
    try { const s = JSON.parse(localStorage.getItem(KEY) || '{}'); best = s.best || {}; } catch (e) { best = {}; }
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify({ best: best })); } catch (e) { /* storage may be unavailable */ }
  }
  const def = function (n) { return G.LEVELS.find(function (L) { return L.n === n; }); };
  const open1 = function (n) { return n === 1 || (best[n - 1] || 0) > 0; };
  const ui = function () { return G.ui; };
  function starRow(n, size, cls) {
    let s = '<span class="lvStars ' + (cls || '') + '">';
    for (let i = 1; i <= 3; i++) s += '<span class="' + (i <= n ? 'on' : '') + '">' + ui().svg('star', size) + '</span>';
    return s + '</span>';
  }
  function mapOf(n) { return maps[n] || (maps[n] = G.levelMap(def(n))); }

  // ---------- the level screen ----------
  // One page: the levels at the top, what the chosen one asks for below, and at the bottom
  // «Spiel starten» and «Zurück». A tap on a level only picks it.
  const NAMES = {};
  NAMES[UT.CITY] = 'Stadt'; NAMES[UT.FACTORY] = 'Fabrik'; NAMES[UT.PORT] = 'Hafen'; NAMES[UT.DEFENSE] = 'Verteidigungsposten'; NAMES[UT.SILO] = 'Raketensilo';
  NAMES[UT.SAM] = 'Flugabwehr'; NAMES[UT.WARSHIP] = 'Kriegsschiff'; NAMES[UT.ATOM] = 'Atombombe'; NAMES[UT.HYDRO] = 'Wasserstoffbombe'; NAMES[UT.CRUISE] = 'Marschflugkörper'; NAMES[UT.MIRV] = 'MIRV';
  // the first level not yet won (the one to play next), or 0 when all are won
  function nextLevel() { const L = G.LEVELS.find(function (x) { return !best[x.n]; }); return L ? L.n : 0; }
  function open(sel) {
    load();
    const u = ui();
    hide();
    if (!sel || !def(sel) || !open1(sel)) sel = nextLevel() || cur || 1;
    let total = 0;
    for (const L of G.LEVELS) total += best[L.n] || 0;
    let h = '<h2>Levels</h2><p>' + total + ' von ' + G.LEVELS.length * 3 + ' Sternen</p>';
    h += '<div class="lvSec">Lernen</div><div class="lvGrid" id="lvGrid">';
    for (const L of G.LEVELS) {
      const ok = open1(L.n);
      h += '<button type="button" class="lvSt" data-act="lvPick:' + L.n + '" aria-pressed="' + (L.n === sel) + '"' + (ok ? '' : ' disabled') + '>' +
        '<b>' + (ok ? L.n : u.svg('lock', 20)) + '</b><small>' + u.esc(L.name) + '</small>' + starRow(best[L.n] || 0, 11) + '</button>';
    }
    h += '</div><div class="lvSec">Können · kommt bald</div><div class="lvGrid">';
    LATER.forEach(function (name, i) {
      h += '<button type="button" class="lvSt soon" disabled><b>' + (i + 11) + '</b><small>' + u.esc(name) + '</small></button>';
    });
    const L = def(sel), b = best[sel] || 0;
    h += '</div><div class="lvInfo"><h3>Level ' + sel + ' · ' + u.esc(L.name) + '</h3><p>Du lernst: ' + u.esc(L.learn) + '</p>';
    h += '<div class="lvQuest">' + u.esc(L.quest.text) + (L.limit ? ' Zeit: ' + G.levelClock(L.limit) + '.' : '') + '</div>';
    h += '<ul class="lvGoals">' + L.starText.map(function (t, i) { return '<li class="' + (b > i ? 'on' : '') + '">' + u.svg('star', 14) + u.esc(t) + '</li>'; }).join('') + '</ul>';
    h += '<p>' + (L.allow.length ? 'Freigeschaltet: ' + L.allow.map(function (t) { return NAMES[t]; }).join(', ') + '.' : 'In diesem Level wird noch nichts gebaut.') + '</p></div>';
    h += '<div class="lvFoot"><div class="goes">' + u.goRow('lvGoBtn', 'play', b ? 'Nochmals spielen' : 'Spiel starten', 'Level ' + sel + ' · ' + u.esc(L.name), true) +
      '</div><button class="linkb" data-act="lvBack" type="button">Zurück</button></div>';
    u.openModal(h, 'lvMap');
    $('lvGoBtn').dataset.act = 'lvGo:' + sel;
    preview(sel);
  }
  function preview(n) {
    const u = ui();
    if (u.game) return;
    const v = u.view;
    v.setMap(mapOf(n)); v.fit(true);
  }

  // ---------- playing a level ----------
  function start(n) {
    const L = def(n), u = ui(), c = u.cfg;
    cur = n;
    tipCur = -1; tipNext = 0; tipSince = 0; hideTip();
    u.begin(mapOf(n), {
      seed: 1000 + n, level: n, difficulty: L.diff === undefined ? 1 : L.diff, bots: 0, nations: false, arsenal: false,
      pfeile: !!c.pfeile, netz: !!c.netz, punkt: !!c.punkt, aufstellung: c.aufstellung !== false
    }, { name: c.name, color: u.COLORS[c.color] });
    $('lvBar').hidden = false;
    hud();
  }
  // Called from the interface's own update, a few times a second.
  function hud() {
    const g = ui().game;
    if (!g || !g.lv) return;
    const lv = g.lv, L = lv.def, Q = lv.Q;
    $('lb').hidden = true;
    const bar = $('lvBar'), spawn = g.phase === 'spawn';
    bar.hidden = spawn;
    if (!spawn) {
      const r = lv.check || { prog: 0, line: '' };
      const left = L.limit ? ' · noch ' + G.levelClock(L.limit - Q.secs) : '';
      const html = '<small>Level ' + L.n + ' · ' + ui().esc(L.name) + left + '</small><b>' + ui().esc(L.quest.text) + '</b>' +
        '<div class="bar"><i style="width:' + (G.within(r.prog || 0, 0, 1) * 100).toFixed(1) + '%"></i></div><span>' + ui().esc(r.line || '') + '</span>';
      if (bar.dataset.html !== html) { bar.innerHTML = html; bar.dataset.html = html; }
    }
    tips(g);
  }

  // ---------- tips ----------
  function ready(t, Q) {
    try { return !t.when || !!t.when(Q); } catch (e) { return false; }
  }
  function tips(g) {
    const lv = g.lv, list = lv.def.tips || [], now = performance.now();
    if (lv.over) { hideTip(); return; }
    // a tip whose moment has passed (the start point is chosen, say) goes at once; a waiting one
    // takes over after a few seconds even if the last was not acknowledged
    const stale = tipCur >= 0 && !ready(list[tipCur], lv.Q);
    if (stale) hideTip();
    if (tipNext < list.length && ready(list[tipNext], lv.Q) && (tipCur < 0 || now - tipSince > 7000)) showTip(tipNext, list[tipNext]);
    else if (tipCur >= 0) place(list[tipCur]);
  }
  function showTip(i, t) {
    tipCur = i; tipNext = i + 1; tipSince = performance.now();
    const el = $('lvTip');
    el.innerHTML = '<div>' + t.text + '</div><button class="lvOk" type="button">Verstanden</button>';
    el.hidden = false;
    el.querySelector('.lvOk').addEventListener('click', hideTip);
    ui().snd('ui');
    place(t);
  }
  function hideTip() {
    tipCur = -1;
    const el = $('lvTip');
    if (el) el.hidden = true;
    if (glow) { glow.classList.remove('lvGlow'); glow = null; }
  }
  // Next to the element the tip is about (above it in the lower half of the screen, below it in
  // the upper half), or under the quest bar when there is nothing to point at.
  function place(t) {
    const el = $('lvTip'), app = $('app').getBoundingClientRect();
    let a = t.el ? document.querySelector(t.el) : null;
    let r = a ? a.getBoundingClientRect() : null;
    if (!r || !r.width || a.closest('[hidden]')) { a = null; r = null; }
    if (glow !== a) { if (glow) glow.classList.remove('lvGlow'); glow = a; if (a) a.classList.add('lvGlow'); }
    const w = el.offsetWidth, hgt = el.offsetHeight, W = app.width, H = app.height;
    el.classList.remove('up', 'down');
    let left, top;
    if (r) {
      const cx = r.left + r.width / 2 - app.left;
      left = G.within(cx - w / 2, 8, W - w - 8);
      if (r.top + r.height / 2 - app.top > H / 2) { top = r.top - app.top - hgt - 12; el.classList.add('down'); }
      else { top = r.bottom - app.top + 12; el.classList.add('up'); }
      el.style.setProperty('--ax', G.within(cx - left, 14, w - 14) + 'px');
    } else {
      const b = $('lvBar').hidden ? $('spawnBar') : $('lvBar'), br = b.getBoundingClientRect();
      left = G.within(br.left - app.left, 8, W - w - 8);
      top = br.bottom - app.top + 8;
    }
    el.style.left = Math.round(left) + 'px'; el.style.top = Math.round(Math.max(8, top)) + 'px';
  }

  // ---------- the end of a level ----------
  function end(e) {
    const u = ui(), g = u.game, L = g.lv.def;
    hideTip();
    u.setPaused(true);
    load();
    const before = best[L.n] || 0;
    if (e.win && e.stars > before) { best[L.n] = e.stars; save(); }
    u.snd(e.win ? 'win' : 'lose');
    let h;
    if (e.win) {
      h = '<h2>Level geschafft!</h2>' + starRow(e.stars, 40, 'lvBig') + '<p>' + u.esc(L.name) + ' in ' + G.levelClock(e.secs) + (e.stars > before && before ? ' · neuer Bestwert' : '') + '</p>';
      h += '<ul class="lvGoals">' + L.starText.map(function (t, i) { return '<li class="' + (e.stars > i ? 'on' : '') + '">' + u.svg('star', 14) + u.esc(t) + '</li>'; }).join('') + '</ul>';
      if (def(L.n + 1)) h += '<button class="btn" data-act="lvGo:' + (L.n + 1) + '" type="button">Weiter zu Level ' + (L.n + 1) + '</button>';
      else h += '<p>Das waren alle Lern-Levels. Die Levels, in denen nur noch Können zählt, kommen als Nächstes.</p>';
      h += '<button class="btn ghost" data-act="lvRetry" type="button">Nochmals spielen</button>';
    } else {
      h = '<h2>Nicht geschafft</h2><p>' + u.esc(e.why || 'Das Ziel ist nicht mehr zu erreichen.') + '</p>';
      h += '<button class="btn" data-act="lvRetry" type="button">Nochmals versuchen</button>';
    }
    h += '<button class="btn ghost" data-act="quit" type="button">Zu den Levels</button>';
    u.openModal(h, 'lvEnd');
  }

  function hide() {
    hideTip();
    const b = $('lvBar');
    if (b) { b.hidden = true; b.dataset.html = ''; }
  }

  // Buttons with data-act="lv…" in the window land here (see onModalAct in src/07_ui.js).
  function act(what) {
    const u = ui(), i = what.indexOf(':'), n = i > 0 ? +what.slice(i + 1) : 0, k = i > 0 ? what.slice(0, i) : what;
    if (k === 'lvBack') { u.showStart(); u.previewMap(u.cfg.map); return; }
    if (k === 'lvMap') { open(); return; }
    if (k === 'lvPick') { const sc = $('modalCard').scrollTop; open(n); $('modalCard').scrollTop = sc; return; }
    if (k === 'lvGo') { start(n); return; }
    if (k === 'lvRetry') { start(cur); return; }
  }

  G.Feldzug = {
    open: function () { open(cur); },
    // what the start screen shows under «Levels»: the next level, and the stars so far
    summary: function () {
      load();
      let stars = 0;
      for (const L of G.LEVELS) stars += best[L.n] || 0;
      const n = nextLevel();
      return { n: n, name: n ? def(n).name : '', stars: stars, max: G.LEVELS.length * 3 };
    },
    hud: hud, end: end, act: act, hide: hide, start: start
  };
})(globalThis.G = globalThis.G || {});
