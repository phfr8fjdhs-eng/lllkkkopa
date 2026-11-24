(function (G) {
  'use strict';
  // «Änderungen» on screen: the list of every change (newest first, like the levels, but each one
  // opens at once), and while a scene runs the bar at the bottom with what changed and the way
  // to the previous and next one. The scenes themselves are in src/03e_neu.js; the tips and pins
  // of a scene are drawn by the campaign (src/07b_level.js), which hands its update over to here.
  const $ = function (id) { return document.getElementById(id); };
  const ui = function () { return G.ui; };
  const SEEN = 'grenzland.neu';
  let cur = 0, maps = {}, framed = false;
  const def = function (n) { return G.NEUES.find(function (L) { return L.n === n; }); };
  const mapOf = function (n) { return maps[n] || (maps[n] = G.levelMap(def(n))); };
  function seen() { try { return JSON.parse(localStorage.getItem(SEEN) || '[]'); } catch (e) { return []; } }
  function mark(n) {
    const s = seen();
    if (s.indexOf(n) >= 0) return;
    s.push(n);
    try { localStorage.setItem(SEEN, JSON.stringify(s)); } catch (e) { /* storage may be unavailable */ }
  }

  // ---------- the list ----------
  function open() {
    const u = ui(), s = seen();
    hide();
    let h = '<h2>Änderungen</h2><p>Tippe auf eine Änderung: Sie läuft sofort auf einer kleinen Karte, und du kannst mitspielen.</p>';
    let day = '';
    for (const L of G.NEUES) {
      if (L.date !== day) { day = L.date; h += '<div class="lvSec">' + u.esc(day) + '</div>'; }
      const nw = s.indexOf(L.n) < 0;
      h += '<button type="button" class="nwItem" data-act="nwGo:' + L.n + '"><b>' + u.esc(L.title) + (nw ? '<em>neu</em>' : '') + '</b><small>' + u.esc(L.text) + '</small></button>';
    }
    h += '<div class="lvFoot"><button class="linkb" data-act="nwBack" type="button">Zurück</button></div>';
    u.openModal(h, 'nwList');
    if (!u.game) { const v = u.view; v.setMap(mapOf(G.NEUES[0].n)); v.fit(true); }
  }

  // ---------- one scene ----------
  function start(n) {
    const L = def(n), u = ui(), c = u.cfg;
    if (!L) return;
    cur = n; framed = false;
    G.Feldzug.freshTips();
    mark(n);
    u.begin(mapOf(n), {
      seed: 2000 + n, level: n, difficulty: 1, bots: 0, nations: false, arsenal: !!L.arsenal,
      kampf: c.kampf === 'grenzen' ? 'grenzen' : 'grenzland', pfeile: c.pfeile !== false
    }, { name: c.name, color: u.COLORS[c.color] });
  }
  // From the campaign's update (G.Feldzug.hud), a few times a second while a scene runs.
  function hud(g) {
    const L = g.lv.def, bar = $('nwBar'), u = ui();
    if (!bar) return;
    bar.hidden = false;
    if (!framed && !$('ctrl').hidden) { framed = true; frame(); }
    const i = G.NEUES.indexOf(L), prev = G.NEUES[i + 1], next = G.NEUES[i - 1];
    const html = '<div class="nwHead"><small>' + u.esc(L.date) + ' · ' + (i + 1) + ' von ' + G.NEUES.length + '</small><b>' + u.esc(L.title) + '</b></div>' +
      '<p>' + u.esc(L.text) + '</p><div class="nwBtns">' +
      '<button type="button" data-nw="nwGo:' + (prev ? prev.n : 0) + '"' + (prev ? '' : ' disabled') + '>' + u.svg('chev', 14) + 'Ältere</button>' +
      '<button type="button" data-nw="nwGo:' + L.n + '">Nochmals</button>' +
      '<button type="button" data-nw="nwList">Liste</button>' +
      '<button type="button" data-nw="nwGo:' + (next ? next.n : 0) + '"' + (next ? '' : ' disabled') + '>Neuere' + u.svg('chev', 14) + '</button></div>';
    if (bar.dataset.html !== html) { bar.innerHTML = html; bar.dataset.html = html; }
  }
  // The whole little map in the part of the screen the panels leave free: to the right of the
  // bottom column on a wide screen, above it on a phone. Once, when the scene appears.
  function frame() {
    const v = ui().view, m = v && v.map, app = $('app').getBoundingClientRect(), b = $('bottom').getBoundingClientRect();
    if (!m) return;
    const top = 58, hot = $('hotbar'), hb = hot && !hot.hidden && hot.offsetWidth ? app.bottom - hot.getBoundingClientRect().top + 8 : 8;
    const rects = [
      { x: b.right - app.left + 8, y: top, w: app.right - b.right - 16, h: app.height - top - hb },
      { x: 8, y: top, w: app.width - 16, h: b.top - app.top - top - 8 }
    ];
    let best = null, bz = 0;
    for (const r of rects) { if (r.w < 120 || r.h < 120) continue; const z = Math.min(r.w / m.W, r.h / m.H); if (z > bz) { bz = z; best = r; } }
    if (!best) { v.fit(false); return; }
    const c = v.cam;
    c.z = bz * 0.96; v.fly = null;
    c.x = m.W / 2 - (best.x + best.w / 2 - v.cw / 2) / c.z;
    c.y = m.H / 2 - (best.y + best.h / 2 - v.ch / 2) / c.z;
    v.clampCam();
    // the view does not zoom out that far: keep the right edge of the map on screen (the panels
    // only cover the lower left)
    if (c.z > bz * 0.97 && best === rects[0]) c.x = Math.max(m.W / 2, m.W - (v.cw / 2 - 8) / c.z);
  }
  function hide() {
    const b = $('nwBar');
    if (b) { b.hidden = true; b.dataset.html = ''; }
  }

  // Buttons with data-act="nw…" in a window, and data-nw="nw…" in the bar, land here.
  function act(what) {
    const u = ui(), i = what.indexOf(':'), n = i > 0 ? +what.slice(i + 1) : 0, k = i > 0 ? what.slice(0, i) : what;
    if (k === 'nwBack') { u.showStart(); u.previewMap(u.cfg.map); return; }
    if (k === 'nwList') { u.quitGame(); return; }
    if (k === 'nwGo' && n) { hide(); start(n); return; }
    if (k === 'nwRetry') { hide(); start(cur); }
  }
  document.addEventListener('click', function (e) {
    const b = e.target.closest && e.target.closest('#nwBar [data-nw]');
    if (b && !b.disabled) act(b.dataset.nw);
  });

  G.Neuheiten = {
    open: open, start: start, hud: hud, hide: hide, act: act,
    // what the start screen shows under «Änderungen»
    summary: function () {
      const s = seen(), fresh = G.NEUES.filter(function (L) { return s.indexOf(L.n) < 0; }).length;
      return { count: G.NEUES.length, fresh: fresh, newest: G.NEUES[0] };
    }
  };
})(globalThis.G = globalThis.G || {});
