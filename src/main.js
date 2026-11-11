/* Grenzland – Ablauf: Startbildschirm, Eingabe, Spielschleife */
(function (G) {
  'use strict';
  const $ = function (id) { return document.getElementById(id); };
  const app = G.app = {
    game: null, ren: null, ui: null, speed: 1, userPaused: false, holds: new Set(), paused: false,
    spawnTicks: 150, settings: { direct: false, names: true, name: 'Spieler', color: 0 },
    sel: { map: 'welt', diff: 1, color: 0, botsTouched: false, mode: 'ffa' }
  };
  const MAPS = (G.MAPS || []).concat([{ id: 'zufall', name: 'Zufallskarte', land: 220000 }]);

  // ---------------------------------------------------------------- Einstellungen
  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('grenzland') || 'null');
      if (s && typeof s === 'object') Object.assign(app.settings, s);
    } catch (e) { /* ohne Speicher geht es auch */ }
    app.sel.color = (app.settings.color | 0) % G.HUMAN_COLORS.length;
  }
  app.saveSettings = function () {
    try { localStorage.setItem('grenzland', JSON.stringify(app.settings)); } catch (e) { /* egal */ }
  };

  // ---------------------------------------------------------------- Startbildschirm
  function defaultBots(def) { return Math.min(400, Math.max(20, Math.round(def.land / 17500) * 10)); }

  function radio(box, attr, value) {
    for (const el of box.children) el.setAttribute('aria-checked', String(el.dataset[attr] === String(value)));
  }

  function buildStart() {
    const sw = $('swatches');
    G.HUMAN_COLORS.forEach(function (c, i) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'sw'; b.dataset.c = i; b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', 'Farbe ' + (i + 1));
      b.style.background = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
      sw.appendChild(b);
    });
    sw.addEventListener('click', function (e) {
      const b = e.target.closest('.sw');
      if (!b) return;
      app.sel.color = +b.dataset.c; radio(sw, 'c', app.sel.color);
    });
    radio(sw, 'c', app.sel.color);

    const mb = $('maps');
    for (const m of MAPS) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'mapb'; b.dataset.m = m.id; b.setAttribute('role', 'radio');
      const th = document.createElement('div');
      th.className = 'th';
      if (m.thumb) th.style.backgroundImage = 'url(data:image/png;base64,' + m.thumb + ')'; else th.textContent = '?';
      const sp = document.createElement('span');
      sp.textContent = m.name;
      b.appendChild(th); b.appendChild(sp); mb.appendChild(b);
    }
    const setBots = function () {
      if (app.sel.botsTouched) return;
      const def = MAPS.find(function (m) { return m.id === app.sel.map; });
      $('inBots').value = app.sel.mode === 'duel' ? 0 : defaultBots(def); $('botsVal').textContent = $('inBots').value;
    };
    const md = $('mode');
    md.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      app.sel.mode = b.dataset.v; radio(md, 'v', app.sel.mode);
      $('optNations').disabled = app.sel.mode === 'duel';
      $('optNations').closest('.opt').style.opacity = app.sel.mode === 'duel' ? 0.45 : 1;
      setBots();
    });
    radio(md, 'v', app.sel.mode);
    mb.addEventListener('click', function (e) {
      const b = e.target.closest('.mapb');
      if (!b) return;
      app.sel.map = b.dataset.m; radio(mb, 'm', app.sel.map); setBots();
    });
    radio(mb, 'm', app.sel.map);

    const df = $('diff');
    G.DIFF.forEach(function (d, i) {
      const b = document.createElement('button');
      b.type = 'button'; b.dataset.d = i; b.textContent = d.name; b.setAttribute('role', 'radio');
      df.appendChild(b);
    });
    df.addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      app.sel.diff = +b.dataset.d; radio(df, 'd', app.sel.diff);
    });
    radio(df, 'd', app.sel.diff);

    $('inBots').addEventListener('input', function (e) { app.sel.botsTouched = true; $('botsVal').textContent = e.target.value; });
    setBots();
    $('inName').value = app.settings.name || 'Spieler';
    $('btnStart').addEventListener('click', startGame);
    $('btnHelp').addEventListener('click', function () { app.ui.openHelp(false); });
  }

  // Geländeklassen aus dem eingebetteten PNG lesen
  function decode(def) {
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement('canvas');
        c.width = def.W; c.height = def.H;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.imageSmoothingEnabled = false;
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, def.W, def.H).data, cls = new Uint8Array(def.W * def.H);
        for (let i = 0; i < cls.length; i++) { const v = d[i * 4]; cls[i] = v < 43 ? 0 : v < 128 ? 1 : v < 213 ? 2 : 3; }
        resolve(cls);
      };
      img.onerror = function () { reject(new Error('Karte konnte nicht geladen werden')); };
      img.src = 'data:image/png;base64,' + def.png;
    });
  }

  function nextFrame() { return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); }); }

  async function startGame() {
    if (app.starting) return;
    app.starting = true;
    const def = MAPS.find(function (m) { return m.id === app.sel.map; });
    $('loadText').textContent = 'Karte wird aufgebaut …';
    $('loading').hidden = false;
    try {
      await nextFrame();
      let mdef = def, cls;
      const seed = (Math.random() * 1e9) | 0;
      if (def.id === 'zufall') {
        const tall = window.innerHeight > window.innerWidth;
        mdef = { id: 'zufall', name: 'Zufallskarte', W: tall ? 640 : 920, H: tall ? 920 : 640, S: 0.54, nations: [], seed: seed };
        cls = G.randomClasses(mdef.W, mdef.H, seed);
      } else cls = await decode(def);
      const map = G.buildMap(mdef, cls);
      const name = ($('inName').value || '').trim() || 'Spieler';
      app.settings.name = name; app.settings.color = app.sel.color; app.saveSettings();
      const game = new G.Game(map, {
        seed: seed ^ 0x5bd1e995, difficulty: app.sel.diff, bots: +$('inBots').value, nations: $('optNations').checked,
        instantBuild: $('optInstant').checked, infiniteGold: $('optGold').checked, infiniteTroops: $('optTroops').checked,
        name: name, color: app.sel.color, duel: app.sel.mode === 'duel'
      });
      game.setup();
      app.game = game;
      app.ren = new G.Renderer($('cv'), game);
      app.ren.showNames = app.settings.names;
      app.speed = 1; app.userPaused = false; app.holds.clear(); app.paused = false; acc = 0;
      $('start').hidden = true;
      app.ui.start();
    } catch (err) {
      console.error(err);
      $('loadText').textContent = 'Das hat nicht geklappt: ' + (err && err.message ? err.message : err);
      await new Promise(function (r) { setTimeout(r, 2600); });
    }
    $('loading').hidden = true;
    app.starting = false;
  }

  // ---------------------------------------------------------------- Steuerung des Ablaufs
  function refreshPause() {
    app.paused = app.userPaused || app.holds.size > 0;
    if (app.ui) app.ui.setPaused(app.userPaused);
  }
  app.togglePause = function () { app.userPaused = !app.userPaused; refreshPause(); };
  app.hold = function (why, on) { if (on) app.holds.add(why); else app.holds.delete(why); refreshPause(); };
  app.cycleSpeed = function () { app.speed = app.speed === 1 ? 2 : app.speed === 2 ? 4 : 1; app.ui.setSpeed(app.speed); };

  app.beginPlay = function () {
    const g = app.game;
    if (!g || g.phase !== 'spawn' || !g.human.spawned) return;
    g.startPlay();
    const t = g.human.spawnTile;
    app.ren.center(t % g.W, (t / g.W) | 0, Math.max(app.ren.cam.z, 4));
    app.ui.update(performance.now());
    if ((app.settings.games | 0) < 3) {
      app.settings.games = (app.settings.games | 0) + 1; app.saveSettings();
      app.ui.addEvent('Tippe auf Land neben deinem Gebiet und dann auf Angriff. So breitest du dich aus.', 'info', 0, { ttl: 14000 });
    }
  };

  app.onDefeat = function (by) {
    const g = app.game, p = by ? g.players[by] : null;
    app.ui.closeRadial(); app.ui.closeSheet();
    app.ui.showEnd('defeat', p ? p.name : '');
  };
  app.onWin = function (id) {
    const g = app.game, p = g.players[id];
    app.ui.closeRadial(); app.ui.closeSheet();
    app.ui.showEnd(p === g.human ? 'win' : 'lose', p.name);
  };

  app.quit = function () {
    app.game = null; app.ren = null;
    $('hud').hidden = true; $('radial').hidden = true; $('sheet').hidden = true; $('toast').hidden = true;
    app.ui.rad = null; app.ui.sheet = null;
    const cv = $('cv'), ctx = cv.getContext('2d', { alpha: false });
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#15293a'; ctx.fillRect(0, 0, cv.width, cv.height);
    $('start').hidden = false;
  };

  // Schnellaktion ohne Menü: Angriff oder Boot
  app.primary = function (tile) {
    const g = app.game, h = g.human;
    if (!g.land[tile]) return false;
    const id = g.owner[tile];
    if (id === h.id || (id && h.allies.has(id))) return false;
    if (g.canAttackTile(h, tile)) { app.ui.doAttack(tile); return true; }
    if (g.boatPlan(h, tile)) { app.ui.doBoat(tile); return true; }
    return false;
  };

  // mode: 'touch', 'mouse' (Linksklick) oder 'menu' (Rechtsklick)
  app.tap = function (tile, px, py, mode) {
    const g = app.game, ui = app.ui;
    if (!g || tile < 0) return;
    const h = g.human;
    if (g.phase === 'spawn') {
      if (!g.spawnHuman(tile)) ui.toast(g.land[tile] ? 'Dieser Platz ist schon besetzt' : 'Wähle ein Feld an Land');
      else ui.update(performance.now());
      return;
    }
    if (!h.alive) { const id = g.owner[tile]; if (id) ui.openPlayer(id); return; }
    const direct = mode === 'mouse' || (mode === 'touch' && app.settings.direct);
    if (direct && app.primary(tile)) return;
    ui.openRadial(tile, px, py);
  };

  // ---------------------------------------------------------------- Eingabe
  function bindInput() {
    const cv = $('cv'), pts = new Map();
    let moved = 0, multi = false, pinch = 0, swallow = false;
    cv.addEventListener('pointerdown', function (e) {
      if (!app.ren) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* nicht schlimm */ }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 1) { moved = 0; multi = false; swallow = app.ui.closeRadial(); }
      else { multi = true; pinch = 0; }
    });
    cv.addEventListener('pointermove', function (e) {
      const p = pts.get(e.pointerId);
      if (!p || !app.ren) return;
      const dx = e.clientX - p.x, dy = e.clientY - p.y, ren = app.ren, cam = ren.cam;
      p.x = e.clientX; p.y = e.clientY;
      if (pts.size === 1) {
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 7) { cam.x -= dx / cam.z; cam.y -= dy / cam.z; ren.clamp(); }
      } else if (pts.size === 2) {
        const a = Array.from(pts.values());
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        cam.x -= dx / 2 / cam.z; cam.y -= dy / 2 / cam.z;
        if (pinch > 0 && d > 0) ren.zoomAt((a[0].x + a[1].x) / 2, (a[0].y + a[1].y) / 2, d / pinch);
        pinch = d;
      }
    });
    const up = function (e) {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size > 0) { pinch = 0; return; }
      if (e.type === 'pointerup' && !multi && moved <= 7 && !swallow && app.ren) {
        app.tap(app.ren.tileAt(e.clientX, e.clientY), e.clientX, e.clientY, e.pointerType === 'mouse' ? 'mouse' : 'touch');
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('wheel', function (e) {
      if (!app.ren) return;
      e.preventDefault();
      app.ui.closeRadial();
      app.ren.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0016));
    }, { passive: false });
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (!app.ren) return;
      app.ui.closeRadial();
      app.tap(app.ren.tileAt(e.clientX, e.clientY), e.clientX, e.clientY, 'menu');
    });
    window.addEventListener('keydown', function (e) {
      if (!app.game || (e.target && e.target.tagName === 'INPUT')) return;
      if (e.code === 'Space') { e.preventDefault(); app.togglePause(); }
      else if (e.key === 'Escape') { if (!app.ui.closeRadial()) app.ui.closeSheet(); }
      else if (e.key === '+' || e.key === '=') app.ren.zoomAt(app.ren.cw / 2, app.ren.ch / 2, 1.25);
      else if (e.key === '-') app.ren.zoomAt(app.ren.cw / 2, app.ren.ch / 2, 0.8);
      else if (e.key === 't' || e.key === 'z' || e.key === 'y') {
        // Angriffsstärke in 10er-Schritten: T senkt, Z/Y erhöht
        const el = $('ratio'), v = Math.max(1, Math.min(100, +el.value + (e.key === 't' ? -10 : 10)));
        el.value = v; app.ui.ratio = v / 100; app.ui._ratioLabel();
      }
    });
    window.addEventListener('resize', function () { if (app.ren) { app.ren.resize(); app.ren.clamp(); } });
    document.addEventListener('visibilitychange', function () { app.hold('hidden', document.hidden); });
  }

  // ---------------------------------------------------------------- Spielschleife
  let last = 0, acc = 0, lastUi = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const g = app.game;
    if (!g) { last = now; return; }
    const dt = Math.min(200, now - last);
    last = now;
    if (!app.paused) {
      acc += dt * app.speed;
      let n = 0;
      while (acc >= 100 && n < 6) {
        g.tick();
        if (g.phase === 'spawn' && g.ticks >= app.spawnTicks && g.human.spawned) app.beginPlay();
        acc -= 100; n++;
      }
      if (acc > 300) acc = 0;
    }
    app.ui.drain();
    if (!app.game) return;
    app.ren.flush();
    app.ren.render(app.paused ? 1 : Math.min(1, acc / 100), now);
    if (now - lastUi > 240) { lastUi = now; app.ui.update(now); }
  }

  loadSettings();
  app.ui = new G.UI(app);
  buildStart();
  bindInput();
  requestAnimationFrame(frame);
})(window.G);
