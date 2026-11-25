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
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="' + ICON[name] + '"/></svg>';
  }

  const COLORS = [[208, 92, 84], [84, 128, 200], [216, 164, 80], [146, 112, 196], [70, 160, 148], [206, 112, 160]];   // matt, but a touch stronger than the nations' palette
  // The keys are OpenFront's defaults (1 city, 2 factory, 3 port ... 0 MIRV); the two weapons OpenFront
  // does not have sit on free letters. They build at the mouse pointer.
  const BUILD = [
    { t: UT.CITY, icon: 'city', note: 'Truppen-Limit +25K', key: '1' },
    { t: UT.FACTORY, icon: 'factory', note: 'Gleise und Züge bringen Gold', key: '2' },
    { t: UT.PORT, icon: 'port', note: 'Handel und Kriegsschiffe', key: '3' },
    { t: UT.DEFENSE, icon: 'defense', note: 'Grenze fünfmal zäher', key: '4' },
    { t: UT.SILO, icon: 'silo', note: 'Startet Bomben', key: '5' },
    { t: UT.SAM, icon: 'sam', note: 'Fängt Bomben ab', key: '6' },
    // the digits for what both modes have, the specials to the right (MIRV, and the Arsenal's two)
    { t: UT.WARSHIP, icon: 'warship', note: 'Schnell, kapert Handelsschiffe, wehrt Boote ab', key: '7' },
    { t: 7.5, icon: 'battleship', note: 'Gross, Raketen, sieht über Inseln, versenkt Schiffe', key: '8' },
    { t: UT.CRUISE, icon: 'cruise', note: 'Trifft genau, keine Verstrahlung', key: '9' },
    { t: UT.ATOM, icon: 'atom', note: 'Kleiner Krater', key: '0' },
    { t: UT.HYDRO, icon: 'hydro', note: 'Riesiger Krater', key: 'h' },
    { t: UT.MIRV, icon: 'mirv', note: 'Verwüstet ein ganzes Reich', key: 'm' },
    { t: UT.LASER, icon: 'laser', note: 'Aus dem All, nicht abfangbar', key: 'z' },
    { t: UT.CLOAK, icon: 'cloak', note: 'Versteckt Gebäude ganz in der Nähe', key: 'x' }
  ];
  const TERRAIN = ['Ebene', 'Hochland', 'Gebirge'];
  // What the ground under a tile is called: its cover on the Earth, with height and river, and
  // what it does to an attack on a realm there (as tickAttack has it), so risky ground is learnt.
  function groundName(tile) {
    const m = game.map, mg = m.mag[tile], lvl = mg < 10 ? 0 : mg < 20 ? 1 : 2, TR = G.TERRAIN;
    let loss = [1, 1.25, 1.5][lvl] * G.groundLoss(m, tile), time = [1, 1.2121, 1.5152][lvl] * G.groundSpeed(m, tile);
    let n = TERRAIN[lvl];
    if (m.cover) {
      n = G.COVER_NAME[m.cover[tile]] + (lvl ? ', ' + TERRAIN[lvl] : '');
      if (m.feat[tile] & 2) { n += ', grosser Fluss'; loss *= TR.greatLoss; time *= TR.greatSpeed; }
      else if (m.feat[tile] & 1) { n += ', Fluss'; loss *= TR.riverLoss; time *= TR.riverSpeed; }
    }
    const x = function (v) { return (Math.round(v * 10) / 10).toLocaleString('de-CH'); };
    return n + (loss > 1.04 || time > 1.04 ? ' · Angriff ' + x(loss) + '× Verluste, ' + x(time) + '× langsamer' : ' · Angriff normal');
  }
  const snd = function (name, gap) { G.Audio.play(name, gap); };
  const plain = function (t) { return G.UNAME[t].replace('\u00AD', ''); };
  // what only the Arsenal mode has
  const armory = function (t) { return t === UT.LASER || t === UT.CLOAK; };
  // what can be built in this game: the Arsenal's two only in that mode, in a level only what it unlocks
  const offered = function (t) { t = real(t).u; return (!armory(t) || game.opts.arsenal) && (!game.lv || game.levelAllows(t)); };
  // The battleship is warship class 1 in the game; the interface gives it a number of its own (BS,
  // between warship 7 and boat 8, so every test for 'a ship, not a bomb' holds) and turns it back
  // into the warship and its class wherever it talks to the game.
  const BS = 7.5;
  function real(t) { return t === BS ? { u: UT.WARSHIP, cls: 1 } : { u: t, cls: 0 }; }
  function costOf(h, t) { const r = real(t), c = game.cost(h, r.u); return r.cls ? Math.round(c * G.SHIP_CLASS[1].cost) : c; }
  function shipsOf(h, cls) { let n = 0; for (const u of h.units) if (u.type === UT.WARSHIP && (u.cls || 0) === cls) n++; return n; }
  // how many of a kind of building you can see at player q (a cloaking tower hides some)
  const seen = function (q, t) { return game.seenCount(game.human, q, t); };
  const coin = function (n) { return '<span class="price">' + svg('gold', 13) + (n ? fmt(n) : 'gratis') + '</span>'; };
  // What a building does at a given level, for the upgrade card.
  function levelText(type, lv) {
    if (type === UT.CITY) return 'Truppen-Limit +' + 25 * lv + 'K';
    if (type === UT.PORT) return lv === 1 ? 'Schickt Handelsschiffe' : 'Schickt ' + lv + '-mal so oft Handelsschiffe';
    if (type === UT.SILO) return lv === 1 ? '1 Rakete pro Ladung' : lv + ' Raketen pro Ladung';
    if (type === UT.SAM) return (lv === 1 ? '1 Abwehrrakete' : lv + ' Abwehrraketen') + ' pro Ladung, Reichweite ' + Math.round(150 - 480 / (lv + 5));
    if (type === UT.DEFENSE) return 'Grenze ' + (3 + 2 * lv) + '-mal zäher';
    if (type === UT.CLOAK) return 'Versteckt deine Gebäude ganz in der Nähe vor den anderen, bis sie nahe herankommen';
    return lv === 1 ? 'Schickt Züge los' : 'Züge fahren ' + ((1 + lv) / 2).toLocaleString('de-CH') + '-mal so oft';
  }

  let MAPS = [], maps = {}, game = null, view = null, pending = [];
  // where the game runs (src/08b_host.js): `game` is what host.game shows, the game itself or its mirror
  let host = null, stateAt = 0;
  let paused = false, speed = 1, acc = 0, last = 0, ratio = 0.2;
  // Aufstellung: the editing mode of the net (see 03b_posture.js)
  let trainSeen = 0, shipSeen = 0, incAt = -99;
  const incLog = [];          // [tick, gold from trains so far, gold from ships so far], one entry every five seconds
  let netOn = false, netLess = false, stroke = null, netTimer = 0, lastTile = -1, commitAt = -99;
  // Quick brush (24.11.2026), without the panel and without «Fertig»: the buttons + and - beside
  // the map (one stroke, lifting the finger ends it; held long, they stay on), the key V held
  // (Shift + V thins out; letting go ends it) and a double tap held on own land (thickens).
  // quick: null or { src: 'btn' | 'key' | 'tap', less, sticky }
  let quick = null, lastTapAt = -1e9, lastTapX = 0, lastTapY = 0;
  const netQueue = new Map();
  let sel = null, radialAt = 0, modalKind = '', infoId = 0, lbOpen = false, lbAt = -99, liveAt = -99, tradeAt = 0;
  let toastTimer = 0, endShown = false, botsTouched = false;
  let mp = null, turnLeft = 0, aim = null, joinCode = '', lobbyNote = '', goldTimer = 0;
  const chips = new Map(), asks = new Map();
  const cfg = { name: 'Spieler', color: 0, map: 'erde', diff: 1, bots: -1, nations: true, instant: false, gold: false, troops: false, tap: false, music: true, sfx: true, mode: 'klassisch', thrust: 0, botsV3: true, pfeile: true, kampf: 'grenzland', bahn: true, hafen: true };
  // Two ways of fighting to compare (doku/kampfsysteme.md), and a few switches for both.
  const KAMPF = [['grenzland', 'Grenzland', 'Netz als passive Verteidigung: wo mehr Truppen stehen, geht ein Angriff langsamer, dort fallen aber auch mehr (dunkleres Land). Kessel halten 30 s. Keil und Abschnitt verlieren mit der Tiefe Schwung; Aufmarsch, Erholung und Schiene geben mehr.'],
    ['grenzen', 'Feste Grenzen', 'Kein Netz, deine Truppen stehen gleichmässig. Kein Schwung. Dazu der Richtungsangriff. Kessel fallen sofort.']];
  // the options of the game that the start screen decides
  function playOpts(c) {
    // planned arrows, rail deliveries and ports by level are always on (24.11.2026), no switch any more
    return { kampf: c.kampf === 'grenzen' ? 'grenzen' : 'grenzland', pfeile: true, bahn: true, hafen: true };
  }
  let plans = [];          // version «Pfeile»: arrows planned, not launched yet
  const MODES = [['klassisch', 'Klassisch', 'Das Spiel wie gewohnt.'], ['arsenal', 'Arsenal', 'Zusätzlich: der Satellitenstrahl. Er kommt aus dem All, braucht kein Silo und lässt sich nicht abfangen. Und der Tarnturm: Er versteckt deine Gebäude ganz in seiner Nähe, bis die anderen nahe herankommen. Auch die Nationen setzen beides ein.']];
  let hoverX = -1, hoverY = -1;
  const RES = G.VARIANT === 'rohstoffe';   // this page is the game version «Rohstoffe» (src/03c_res.js)
  let ghost = null, ghostKey = '', shiftHeld = false;   // the thing a build key is about to place
  const special = function (id) { return G.SPECIAL_MAPS.find(function (m) { return m.id === id; }); };

  let s0 = {};
  function loadCfg() {
    try {
      const s = JSON.parse(localStorage.getItem('grenzland.v1') || '{}');
      s0 = s;
      for (const k in cfg) if (typeof s[k] === typeof cfg[k]) cfg[k] = s[k];
    } catch (e) { /* storage may be unavailable */ }
    // ?karte=welt in the address picks the map (the tests use it to stay off the big one)
    try { const k = new URLSearchParams(location.search).get('karte'); if (k) cfg.map = k; } catch (e) { /* no address to read */ }
    if (cfg.map !== 'zufall' && !special(cfg.map) && !MAPS.some(function (m) { return m.id === cfg.map; })) cfg.map = MAPS[0].id;
    G.Audio.on.music = cfg.music; G.Audio.on.sfx = cfg.sfx;
    if (cfg.mode !== 'arsenal') cfg.mode = 'klassisch';
    botsTouched = cfg.bots >= 0;
    if (!s0.botsV3) { cfg.bots = -1; botsTouched = false; }   // the default rose: forget a count stored under the old one
  }
  function saveCfg() {
    try { localStorage.setItem('grenzland.v1', JSON.stringify(cfg)); } catch (e) { /* ignore */ }
  }

  // ---------- maps ----------
  function loadMap(id, seed) {
    if (id === 'zufall' && seed !== undefined && maps.zufall && maps.zufall.seed !== seed) delete maps.zufall;
    if (maps[id]) return Promise.resolve(maps[id]);
    if (id === 'zufall') {
      if (seed === undefined) seed = (Math.random() * 2e9) | 0;
      maps.zufall = G.buildMap(960, 600, G.randomClassMap(960, 600, seed), seed, { id: 'zufall', name: 'Zufallskarte', nations: [] });
      maps.zufall.seed = seed;
      return Promise.resolve(maps.zufall);
    }
    if (special(id)) {
      // built a moment later, so the tap on the card shows at once
      return new Promise(function (resolve) {
        setTimeout(function () { maps[id] = maps[id] || G.specialMap(special(id)); resolve(maps[id]); }, 30);
      });
    }
    const def = MAPS.find(function (m) { return m.id === id; });
    if (!def) return Promise.reject(new Error('Diese Karte gibt es hier nicht'));
    if (def.v === 2) {
      // The Earth: three pictures (cover and rivers, crossing cost, height), read one after the
      // other so that only one of them is unpacked in memory at a time.
      const layer = function (b64, w, h) {
        return new Promise(function (resolve, reject) {
          const img = new Image();
          img.onload = function () {
            const c = document.createElement('canvas');
            c.width = w; c.height = h;
            const x = c.getContext('2d', { willReadFrequently: true });
            x.drawImage(img, 0, 0);
            const d = x.getImageData(0, 0, w, h).data, out = new Uint8Array(w * h);
            for (let i = 0; i < out.length; i++) out[i] = d[i * 4];
            c.width = c.height = 1;
            resolve(out);
          };
          img.onerror = function () { reject(new Error('Karte konnte nicht geladen werden')); };
          img.src = 'data:image/png;base64,' + b64;
        });
      };
      let cls, cost;
      return layer(def.png, def.w, def.h).then(function (a) { cls = a; return layer(def.mag, def.w, def.h); })
        .then(function (a) { cost = a; return layer(def.hgt, def.w >> 1, def.h >> 1); })
        .then(function (hgt) {
          const map = G.buildWorld(def, cls, cost, hgt);
          // version «Rohstoffe»: the build adds a fourth picture, the country of every piece of land
          if (!def.ctry || !G.attachCountries) { maps[id] = map; return map; }
          return layer(def.ctry.png, def.ctry.w, def.ctry.h).then(function (cells) { G.attachCountries(map, def.ctry, cells); maps[id] = map; return map; });
        });
    }
    return new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () {
        const c = document.createElement('canvas');
        c.width = def.w; c.height = def.h;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, def.w, def.h).data, cls = new Uint8Array(def.w * def.h);
        for (let i = 0; i < cls.length; i++) cls[i] = Math.round(d[i * 4] / 85);
        maps[id] = G.buildMap(def.w, def.h, cls, 12345, { id: def.id, name: def.name, nations: def.nations, lat: def.lat, lon: def.lon });
        resolve(maps[id]);
      };
      img.onerror = function () { reject(new Error('Karte konnte nicht geladen werden')); };
      img.src = 'data:image/png;base64,' + def.png;
    });
  }
  // About half as many bots again as before (15.11.2026): more small prey early on.
  // One bot for every 850 tiles of land (22.11.2026: 630 made the big Earth lag), at most 600.
  function defaultBots(map) { return Math.min(600, Math.round(map.landTiles / 850 / 10) * 10); }
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
  function toast(text, ms) {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, ms || 2200);
  }
  // ---------- full screen ----------
  // The browser's Fullscreen API where there is one (Android, desktop, iPad). Safari on the iPhone
  // has none for a page: there the game runs without bars once it is added to the home screen.
  const fsEl = function () { return document.fullscreenElement || document.webkitFullscreenElement || null; };
  const fsCan = function () { const d = document.documentElement; return !!(d.requestFullscreen || d.webkitRequestFullscreen); };
  const fsApp = function () { return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone), (display-mode: fullscreen)').matches)); };
  function fsEnter() {
    const d = document.documentElement;
    try {
      const r = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : d.webkitRequestFullscreen();
      if (r && r.catch) r.catch(function () { /* refused, e.g. without a tap */ });
    } catch (e) { /* refused */ }
  }
  function fsExit() {
    try {
      const r = document.exitFullscreen ? document.exitFullscreen() : document.webkitExitFullscreen && document.webkitExitFullscreen();
      if (r && r.catch) r.catch(function () {});
    } catch (e) { /* not in full screen */ }
  }
  function fsToggle() {
    if (fsEl()) { fsExit(); return; }
    if (fsCan()) { fsEnter(); return; }
    toast('Auf dem iPhone: unten auf «Teilen» tippen, dann «Zum Home-Bildschirm». Von dort startet Grenzland ohne Leisten.', 6500);
  }
  function fsShow() {
    const b = $('bFull'), on = !!fsEl();
    b.hidden = fsApp();
    b.innerHTML = svg(on ? 'fullx' : 'full', 18);
    b.setAttribute('aria-label', on ? 'Vollbild verlassen' : 'Vollbild');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  function clock(sec) {
    sec = Math.max(0, Math.floor(sec));
    return Math.floor(sec / 60) + ':' + String(sec % 60).padStart(2, '0');
  }
  function openModal(html, kind) {
    if (kind !== 'res') $('modalCard').classList.remove('resCard');
    $('modalCard').innerHTML = html; $('modalCard').dataset.html = kind === 'res' ? html : '';
    $('modalCard').scrollTop = 0;
    $('modal').hidden = false;
    modalKind = kind;
  }
  function closeModal() {
    $('modal').hidden = true;
    $('modalCard').classList.remove('resCard'); $('modalCard').dataset.html = '';
    if ((modalKind === 'menu' || modalKind === 'help') && !mp) setPaused(false);
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
    const mapCard = function (id, name, note) {
      return '<button type="button" class="mapc" data-id="' + id + '" aria-pressed="' + (id === cfg.map) + '"><canvas width="132" height="84" data-thumb="' + id + '"></canvas><b>' + esc(name) + '</b><small>' + esc(note) + '</small></button>';
    };
    const check = function (id, label, on) {
      return '<label class="check" for="' + id + '"><input id="' + id + '" type="checkbox"' + (on ? ' checked' : '') + '>' + label + '</label>';
    };
    let h = '<h1>Grenzland <small>' + (RES ? 'Rohstoffe' : 'Version 2.1') + '</small></h1>';
    h += joinCode ? '<p>Du wurdest in den Raum <b class="code">' + esc(joinCode) + '</b> eingeladen. Wähle Name und Farbe.</p>' : (RES ? '<p>Jedes Land hat Rohstoffe zum Abbauen und eine eigene Ware für Fabriken. Zoome in ein Land oder klicke es an, um zu sehen, was es dort gibt. Gilt auf der Karte «Erde».</p>' : '<p>Erobere die Karte, allein oder mit Freunden.</p>');
    h += '<div class="field"><label for="fName">Dein Name</label><input id="fName" type="text" maxlength="18" autocomplete="off" value="' + esc(cfg.name) + '"></div>';
    h += '<div class="field"><div class="lab">Farbe</div><div class="swatches" id="fColor">' + COLORS.map(function (c, i) {
      return '<button type="button" class="sw" data-i="' + i + '" aria-label="Farbe ' + (i + 1) + '" aria-pressed="' + (i === cfg.color) + '" style="background:rgb(' + c.join(',') + ')"></button>';
    }).join('') + '</div></div>';
    if (joinCode) {
      h += '<div class="goes">' + goRow('fJoin', 'people', 'Beitreten', 'Raum ' + esc(joinCode), true) + goRow('fSolo', 'sword', 'Lieber allein spielen', 'Eigene Karte und Regeln wählen', false) + '</div>';
    } else {
      h += '<div class="field" id="fMap"><div class="lab">Karte · Erde</div><div class="maprow">' + MAPS.map(function (m) {
        return mapCard(m.id, m.name, m.v === 2 ? 'Die grosse Karte · ' + m.nations.length + ' Nationen' : m.nations.length + ' Nationen');
      }).join('') + '</div><div class="lab lab2">Spezialkarten</div><div class="maprow">' + G.SPECIAL_MAPS.map(function (m) {
        return mapCard(m.id, m.name, m.note);
      }).join('') + mapCard('zufall', 'Zufall', 'Jedes Mal eine neue Welt') + '</div></div>';
      // the makers of the data the Earth is built from ask to be named
      h += '<p class="credit">Kartendaten der Erde: Natural Earth · Global Map (Höhe, Bodenbedeckung, Wald) © Geospatial Information Authority of Japan, Chiba University and Collaborating Organizations</p>';
      h += '<div class="field"><div class="lab">Spielmodus</div><div class="seg" id="fMode">' + MODES.map(function (m) {
        return '<button type="button" data-id="' + m[0] + '" aria-pressed="' + (m[0] === cfg.mode) + '">' + m[1] + '</button>';
      }).join('') + '</div><p class="hint" id="fModeNote">' + MODES.find(function (m) { return m[0] === cfg.mode; })[2] + '</p></div>';
      const kNow = cfg.kampf === 'grenzen' ? 'grenzen' : 'grenzland';
      h += '<div class="field"><div class="lab">Kampfsystem</div><div class="seg" id="fKampf">' + KAMPF.map(function (k) {
        return '<button type="button" data-id="' + k[0] + '" aria-pressed="' + (k[0] === kNow) + '">' + k[1] + '</button>';
      }).join('') + '</div><p class="hint" id="fKampfNote">' + KAMPF.find(function (k) { return k[0] === kNow; })[2] + '</p></div>';
      h += '<div class="field"><div class="lab">Schwierigkeit</div><div class="seg" id="fDiff">' + G.DIFF_NAMES.map(function (n, i) {
        return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === cfg.diff) + '">' + n + '</button>';
      }).join('') + '</div></div>';
      h += '<div class="field"><label for="fBots">Bots <b id="fBotsVal">' + Math.max(0, cfg.bots) + '</b></label><input id="fBots" type="range" min="0" max="600" step="10" value="' + Math.max(0, cfg.bots) + '"></div>';
      h += '<div class="field"><div class="lab">Optionen</div><div class="checks">' + check('fNations', 'Nationen', cfg.nations) +
        check('fInstant', 'Sofort bauen', cfg.instant) + check('fGold', 'Unendlich Gold', cfg.gold) + check('fTroops', 'Unendlich Truppen', cfg.troops) + '</div></div>';
      // three ways to play, as rows: the free game (with the settings above), the levels, a room for friends
      const lv = !RES && G.Feldzug ? G.Feldzug.summary() : null;
      const mapName = (function () { const m = MAPS.find(function (x) { return x.id === cfg.map; }) || special(cfg.map); return m ? m.name : 'Zufallskarte'; })();
      h += '<div class="goes">' + goRow('fStart', 'sword', 'Spiel starten', esc(mapName) + ' · ' + G.DIFF_NAMES[cfg.diff] + (cfg.mode === 'arsenal' ? ' · Arsenal' : ''), true);
      if (lv) h += goRow('fCamp', 'flag', 'Levels', lv.n ? 'Level ' + lv.n + ' · ' + esc(lv.name) + ' · ' + lv.stars + ' von ' + lv.max + ' Sternen' : 'Alle Lern-Levels geschafft · ' + lv.stars + ' von ' + lv.max + ' Sternen', false);
      const nw = !RES && G.Neuheiten ? G.Neuheiten.summary() : null;
      if (nw) h += goRow('fNews', 'star', 'Änderungen', (nw.fresh ? nw.fresh + ' neu' : nw.count + ' Änderungen') + ' · zuletzt: ' + esc(nw.newest.title), false);
      h += goRow('fHost', 'people', 'Mit Freunden spielen', 'Raum öffnen und Link teilen', false) + '</div>';
    }
    h += '<button class="linkb" id="fHelp" type="button">So wird gespielt</button>';
    openModal(h, 'start');
    $('fColor').addEventListener('click', function (e) {
      const b = e.target.closest('.sw');
      if (b) { cfg.color = +b.dataset.i; press(this, b); }
    });
    $('fHelp').addEventListener('click', function () { readForm(); showHelp(true); });
    if (joinCode) {
      $('fJoin').addEventListener('click', function () { readForm(); openRoom(false); });
      $('fSolo').addEventListener('click', function () { readForm(); joinCode = ''; showStart(); });
      return;
    }
    $('fMap').addEventListener('click', function (e) {
      const b = e.target.closest('.mapc');
      if (!b) return;
      if (b.dataset.id === 'zufall') delete maps.zufall;
      cfg.map = b.dataset.id; goSub();
      for (const c of this.querySelectorAll('.mapc')) c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      previewMap(cfg.map);
    });
    drawThumbs();
    const cur = $('fMap').querySelector('.mapc[aria-pressed=true]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('fMode').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      cfg.mode = b.dataset.id; press(this, b); goSub();
      $('fModeNote').textContent = MODES.find(function (m) { return m[0] === cfg.mode; })[2];
    });
    $('fKampf').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      cfg.kampf = b.dataset.id; press(this, b); saveCfg();
      $('fKampfNote').textContent = KAMPF.find(function (k) { return k[0] === cfg.kampf; })[2];
    });
    $('fDiff').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) { cfg.diff = +b.dataset.i; press(this, b); } goSub();
    });
    $('fBots').addEventListener('input', function () { botsTouched = true; cfg.bots = +this.value; $('fBotsVal').textContent = this.value; });
    $('fStart').addEventListener('click', function () {
      if (!fsEl() && fsCan() && !fsApp() && window.matchMedia && window.matchMedia('(pointer: coarse)').matches) fsEnter();
      startGame();
    });
    $('fHost').addEventListener('click', function () { readForm(); openRoom(true); });
    function goSub() {
      const m = MAPS.find(function (x) { return x.id === cfg.map; }) || special(cfg.map);
      $('fStart').querySelector('small').textContent = (m ? m.name : 'Zufallskarte') + ' · ' + G.DIFF_NAMES[cfg.diff] + (cfg.mode === 'arsenal' ? ' · Arsenal' : '');
    }
    if ($('fCamp')) $('fCamp').addEventListener('click', function () { readForm(); G.Feldzug.open(); });
    if ($('fNews')) $('fNews').addEventListener('click', function () { readForm(); G.Neuheiten.open(); });
  }
  // A way to start, as a row with an icon, a title and a line under it (the start screen and the level screen)
  function goRow(id, icon, title, sub, main) {
    return '<button type="button" class="go' + (main ? ' main' : '') + '" id="' + id + '"><span class="gi">' + svg(icon, 22) + '</span>' +
      '<span class="gt"><b>' + title + '</b><small>' + sub + '</small></span><span class="gc">' + svg('chev', 18) + '</span></button>';
  }
  function readForm() {
    cfg.name = ($('fName').value || '').trim() || 'Spieler';
    if ($('fNations')) {
      cfg.nations = $('fNations').checked; cfg.instant = $('fInstant').checked;
      cfg.gold = $('fGold').checked; cfg.troops = $('fTroops').checked;
      cfg.bots = +$('fBots').value;
    }
    if (!botsTouched) { const keep = cfg.bots; cfg.bots = -1; saveCfg(); cfg.bots = keep; } else saveCfg();
  }

  // ---------- playing together: the room before the game ----------
  function myId() {
    let id = '';
    try { id = sessionStorage.getItem('grenzland.id') || ''; } catch (e) { /* storage may be unavailable */ }
    if (!id) { id = Math.random().toString(36).slice(2, 12); try { sessionStorage.setItem('grenzland.id', id); } catch (e) { /* ignore */ } }
    return id;
  }
  function roomLink() {
    const u = new URL(location.href);
    u.search = ''; u.hash = '';
    u.searchParams.set('raum', mp.code);
    const r = new URLSearchParams(location.search).get('relay');
    if (r) u.searchParams.set('relay', r);
    return u.toString();
  }
  function openRoom(host) {
    lobbyNote = '';
    const me = { id: myId(), name: cfg.name, color: cfg.color };
    mp = new G.Session(host, me, {
      lobby: function () { if (modalKind === 'lobby') renderLobby(); },
      status: function (text, fatal) {
        lobbyNote = text;
        if (modalKind === 'lobby') renderLobby(); else if (text && game) addMsg(text, fatal ? 'bad' : 'warn');
      },
      start: startMp,
      desync: function () { if (game) addMsg('Die Spielstände der Geräte weichen voneinander ab. Am besten startet ihr eine neue Runde.', 'bad'); },
      lost: function (text) { if (game) quitGame(); else { leaveRoom(); showStart(); previewMap(cfg.map); } toast(text); },
      paused: function (v) { setPaused(v); if (game) addMsg(v ? 'Der Gastgeber hat pausiert' : 'Weiter geht es', 'info'); }
    });
    openModal('', 'lobby');
    renderLobby();
    if (host) mp.create(); else mp.join(joinCode);
  }
  function leaveRoom() {
    if (mp) { mp.close(); mp = null; }
    turnLeft = 0;
    $('bSpeed').hidden = false; $('bPause').hidden = false;
  }
  function renderLobby() {
    if (!mp) return;
    let h = '<h2>' + (mp.code && (mp.host ? mp.up : true) ? 'Raum <span class="code">' + esc(mp.code) + '</span>' : 'Raum wird geöffnet') + '</h2>';
    if (mp.host && mp.up) {
      h += '<p>Schick diesen Link an deine Mitspieler. Wer ihn öffnet, landet in diesem Raum.</p>';
      h += '<div class="linkrow"><input id="lLink" type="text" readonly value="' + esc(roomLink()) + '"><button class="tb" id="lCopy" type="button" aria-label="Link kopieren">' + svg('copy', 18) + '</button></div>';
      if (navigator.share) h += '<button class="btn ghost" id="lShare" type="button">Link teilen</button>';
    } else if (!mp.host) h += '<p>Der Gastgeber startet das Spiel, sobald alle da sind.</p>';
    if (lobbyNote) h += '<p class="notes">' + esc(lobbyNote) + '</p>';
    if (mp.players.length) {
      h += '<div class="lab top">Im Raum · ' + mp.players.length + '</div><div class="plist">' + mp.players.map(function (p, i) {
        return '<div><span class="dot" style="background:rgb(' + COLORS[p.color % 6].join(',') + ')"></span>' + esc(p.name) +
          (i === 0 ? '<i>Gastgeber</i>' : '') + (p.id === mp.me.id ? '<i>du</i>' : '') + '</div>';
      }).join('') + '</div>';
    }
    if (mp.host) {
      const m = MAPS.find(function (x) { return x.id === cfg.map; });
      h += '<p>' + esc(m ? m.name : 'Zufallskarte') + ' · ' + G.DIFF_NAMES[cfg.diff] + ' · ' + Math.max(0, cfg.bots) + ' Bots' + (cfg.nations ? ' · Nationen' : '') + '</p>';
      h += '<button class="btn" id="lStart" type="button"' + (mp.up ? '' : ' disabled') + '>' + (mp.players.length > 1 ? 'Spiel starten' : 'Allein starten') + '</button>';
    }
    h += '<button class="btn ghost" id="lLeave" type="button">' + (mp.host ? 'Raum schliessen' : 'Verlassen') + '</button>';
    $('modalCard').innerHTML = h;
    $('lLeave').addEventListener('click', function () { leaveRoom(); showStart(); });
    if ($('lCopy')) $('lCopy').addEventListener('click', function () {
      const el = $('lLink');
      el.select();
      const done = function () { toast('Link kopiert'); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(el.value).then(done, function () { toast('Halte den Link gedrückt, um ihn zu kopieren'); });
      else { try { document.execCommand('copy'); done(); } catch (e) { toast('Halte den Link gedrückt, um ihn zu kopieren'); } }
    });
    if ($('lShare')) $('lShare').addEventListener('click', function () {
      navigator.share({ title: 'Grenzland', text: 'Spiel mit mir Grenzland', url: roomLink() }).catch(function () { /* closed */ });
    });
    if ($('lStart')) $('lStart').addEventListener('click', function () {
      this.disabled = true;
      mp.begin({
        seed: (Math.random() * 2e9) | 0, map: cfg.map, mapSeed: (Math.random() * 2e9) | 0,
        diff: cfg.diff, bots: Math.max(0, cfg.bots), nations: cfg.nations, arsenal: cfg.mode === 'arsenal', res: RES, opts: playOpts(cfg)
      });
    });
  }
  function startMp(m) {
    const me = mp.index();
    turnLeft = 0;
    loadMap(m.map, m.mapSeed).then(function (map) {
      begin(map, {
        seed: m.seed, difficulty: m.diff, bots: m.bots, nations: m.nations, arsenal: !!m.arsenal, res: !!m.res, kampf: m.opts ? m.opts.kampf : 'grenzland', pfeile: true, bahn: true, hafen: true, spawnTicks: 300, autoSpawn: true, me: me
      }, m.players.map(function (p) { return { name: p.name, color: COLORS[p.color % 6] }; }));
      $('bSpeed').hidden = true; $('bPause').hidden = !mp.host;
      addMsg(m.players.length > 1 ? m.players.length + ' Spieler sind dabei. Wählt eure Startpunkte.' : 'Du bist allein im Raum.', 'info');
    }).catch(function (e) { toast(e.message); });
  }

  // Small pictures of every map for the picker.
  const THUMB = [[38, 88, 140], [150, 200, 116], [196, 184, 138], [228, 230, 236]];
  function paintThumb(cv, cls, w, h) {
    const x = cv.getContext('2d'), tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tx = tmp.getContext('2d'), img = tx.createImageData(w, h), d = img.data;
    for (let i = 0; i < w * h; i++) {
      const c = THUMB[cls[i]];
      d[i * 4] = c[0]; d[i * 4 + 1] = c[1]; d[i * 4 + 2] = c[2]; d[i * 4 + 3] = 255;
    }
    tx.putImageData(img, 0, 0);
    x.fillStyle = 'rgb(38,88,140)'; x.fillRect(0, 0, cv.width, cv.height);
    const k = Math.min(cv.width / w, cv.height / h);
    x.imageSmoothingEnabled = true;
    x.drawImage(tmp, (cv.width - w * k) / 2, (cv.height - h * k) / 2, w * k, h * k);
  }
  function drawThumbs() {
    for (const cv of document.querySelectorAll('canvas[data-thumb]')) {
      const id = cv.dataset.thumb, sp = special(id);
      if (id === 'zufall') {
        const x = cv.getContext('2d');
        x.fillStyle = 'rgb(38,88,140)'; x.fillRect(0, 0, cv.width, cv.height);
        x.fillStyle = '#f4b740'; x.font = '700 54px ' + getComputedStyle(document.body).fontFamily;
        x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('?', cv.width / 2, cv.height / 2 + 3);
      } else if (sp) {
        const w = Math.round(sp.w / 6), h = Math.round(sp.h / 6);
        paintThumb(cv, G.randomClassMap(w, h, sp.seed, sp.kind, sp.w), w, h);
      } else if (MAPS.find(function (m) { return m.id === id; }).thumb) {
        // the Earth brings its own little picture
        const def = MAPS.find(function (m) { return m.id === id; }), img = new Image(), x = cv.getContext('2d');
        img.onload = function () {
          x.fillStyle = 'rgb(38,88,146)'; x.fillRect(0, 0, cv.width, cv.height);
          const k = Math.min(cv.width / img.width, cv.height / img.height);
          x.imageSmoothingEnabled = true;
          x.drawImage(img, (cv.width - img.width * k) / 2, (cv.height - img.height * k) / 2, img.width * k, img.height * k);
        };
        img.src = 'data:image/png;base64,' + def.thumb;
      } else {
        const def = MAPS.find(function (m) { return m.id === id; }), img = new Image();
        img.onload = function () {
          const w = Math.round(def.w / 6), h = Math.round(def.h / 6), c = document.createElement('canvas');
          c.width = w; c.height = h;
          const x = c.getContext('2d', { willReadFrequently: true });
          x.drawImage(img, 0, 0, w, h);
          const d = x.getImageData(0, 0, w, h).data, cls = new Uint8Array(w * h);
          for (let i = 0; i < cls.length; i++) cls[i] = Math.round(d[i * 4] / 85);
          paintThumb(cv, cls, w, h);
        };
        img.src = 'data:image/png;base64,' + def.png;
      }
    }
  }

  function helpHtml() {
    return '<h2>So wird gespielt</h2><ul class="help">' +
      '<li><b>Start:</b> Tippe auf freies Land. Damit wählst du deinen Startpunkt, und das Spiel beginnt sofort.</li>' +
      '<li><b>Angreifen:</b> Tippe auf Land oder auf einen Gegner neben deinem Gebiet und dann auf <b>Angreifen</b>. Der Regler unten legt fest, wie viele Truppen du schickst.</li>' +
      '<li><b>Truppen:</b> Sie wachsen von selbst, am schnellsten bei gut 40 % des Limits. Mehr Land und Städte heben das Limit.</li>' +
      '<li><b>Gold:</b> Kommt laufend dazu, ausserdem durch Handel und Eroberungen. Damit baust du Städte, Häfen, Fabriken, Verteidigung und Raketen.</li>' +
      '<li><b>Fabriken:</b> Eine Fabrik verbindet sich per Gleis mit Städten, Häfen und Fabriken in der Nähe. Jeder Zug bringt an jedem Bahnhof Gold, bei Handelspartnern sogar mehr.</li>' +
      '<li><b>Übers Wasser:</b> Tippe auf ein fremdes Ufer und schicke ein <b>Boot</b>. Höchstens drei sind gleichzeitig unterwegs.</li>' +
      '<li><b>Allianzen:</b> Verbündete greifen sich zehn Minuten lang nicht an. Wer eine Allianz bricht, ist 30 Sekunden lang leichter zu erobern.</li>' +
      '<li><b>Einkreisen:</b> Wer ganz von einem Gegner umschlossen ist, wird sofort übernommen.</li>' +
      '<li><b>Sieg:</b> Wer 80 % des Landes hält, gewinnt.</li>' +
      '<li><b>Bots:</b> Kleine Reiche mit langen Namen. Ihr Land ist grau. Sie bauen nichts, nehmen sich ein Stück freies Land und wehren sich kaum. Angreifen tun sie nur, wer viel weniger Truppen hat als sie selbst, und auch dann nur langsam. Wer eines erobert, bekommt sein Gold und eine Prämie.</li>' +
      '<li><b>Ausbauen:</b> Tippe auf ein eigenes Gebäude und dann auf <b>Ausbau</b>. Jede Stufe macht es stärker, bis Stufe 5.</li>' +
      '<li><b>Bomben:</b> Wähle im Baumenü eine Bombe. Die Karte zeigt dann die Flugbahn, den Einschlag, den Radius und die Reichweite jeder Flugabwehr. Erst <b>Abfeuern</b> startet sie.</li>' +
      '<li><b>Marschflugkörper:</b> Günstig, schnell und genau. Er zerstört Gebäude in einem kleinen Umkreis, hinterlässt kein verstrahltes Land und wird nur selten abgefangen. Gut, um zuerst die Flugabwehr auszuschalten.</li>' +
      '<li><b>Mit Freunden:</b> <b>Mit Freunden spielen</b> öffnet einen Raum. Schick den Link weiter, dann spielt ihr auf derselben Karte.</li>' +
      '<li><b>Schiffe:</b> Handelsschiffe fahren Gold von Hafen zu Hafen, beide Häfen verdienen daran. Ein <b>Kriegsschiff</b> nimmt fremde Schiffe ein, mit deren Besitzer du keine Allianz hast: Handelsschiffe samt Gold, Boote samt der Hälfte der Truppen, und besiegte Kriegsschiffe wechseln die Seite. Ein beschädigtes Kriegsschiff erholt sich langsam, solange ein eigener Hafen in der Nähe ist; unter 75 % fährt es von selbst zum nächsten eigenen Hafen und wird dort schnell repariert (je höher die Hafenstufe, desto schneller).</li>' +
      '<li><b>Züge:</b> Pro Bahnhof gibt es 10K Gold, bei Handelspartnern 25K für beide, bei Verbündeten 35K für beide. Ab dem zehnten Bahnhof einer Fahrt sinkt der Betrag um 5K pro Halt, aber nie unter 5K.</li>' +
      '<li><b>Spielmodus Arsenal:</b> Zusätzlich gibt es den <b>Satellitenstrahl</b> (600K Gold). Er braucht kein Silo, trifft drei Sekunden nach dem Abfeuern, kann nicht abgefangen werden und hinterlässt keine Verstrahlung. Danach lädt der Satellit 45 Sekunden nach. Und den <b>Tarnturm</b> (ab 150K, Taste X): Er versteckt sich selbst und deine Gebäude ganz in seiner Nähe, meist nur zwei oder drei. Die anderen sehen sie erst, wenn ihr Land nahe herankommt; Verbündete sehen sie immer. Bei dir erscheinen versteckte Gebäude blasser.</li>' +
      '<li><b>Ausbauen:</b> Tippe auf eines deiner Gebäude, dann öffnet sich gleich die Ausbaukarte mit drei Knöpfen: eine Stufe, fünf Stufen oder so viele, wie dein Gold reicht. Alle Gebäude gehen bis Stufe 100. Jede Stufe kostet so viel wie ein weiteres Gebäude derselben Art (Stadt: 125K, 250K, 500K, danach je 1M) und bringt bei Städten +25K Truppen-Limit. </li>' +
      '<li><b>Eroberung:</b> Wer ein Reich ganz einnimmt, bekommt dessen Gold (bei Mitspielern die Hälfte) und dazu eine Prämie nach Landgrösse: 60 Gold für jedes Feld, das das Reich zu seiner grössten Zeit hatte. Bots bringen zusätzlich 25K. Die Summe steht in der Spieler-Info.</li>' +
      '<li><b>Maus:</b> Ein Klick auf fremdes oder freies Land greift an (die ganze Front, mit dem Anteil vom Regler), ein Klick auf ein eigenes Gebäude öffnet seine Karte. Ziehen verschiebt die Karte, der Rechtsklick öffnet das Kreismenü. Fährst du über ein fremdes Reich, steht oben, was es hat. Dunkleres Land: dort stehen mehr Truppen.</li>' +
      '<li><b>Tippen (Handy):</b> Ein Tipp auf freies Land oder auf einen Bot greift sofort an. Bei Nationen und Mitspielern öffnet sich das Menü, dort musst du auf Angreifen tippen. Läuft dein Angriff auf sie schon, schickt jeder weitere Tipp auf ihr Land sofort mehr Truppen. Lange drücken öffnet das Menü überall.</li>' +
      '<li><b>Karte:</b> Ziehen verschiebt, zwei Finger oder das Mausrad zoomen.</li>' +
      '</ul><h2 class="h3">Tastenkürzel</h2><p>Die Belegung ist die von OpenFront.</p><div class="keys">' +
      BUILD.map(function (b) { return '<span><kbd>' + b.key.toUpperCase() + '</kbd>' + plain(b.t) + (armory(b.t) ? ' (Arsenal)' : '') + '</span>'; }).join('') +
      '<span><kbd>G</kbd>Angreifen</span><span><kbd>B</kbd>Boot schicken</span><span><kbd>T</kbd><kbd>Y</kbd>Truppenanteil −/+ 10 %</span><span>Rechts ziehen: Stoss vom Start zum Ziel</span><span><kbd>F</kbd>Keil oder Abschnitt</span><span>Mausrad beim Ziehen: Truppenanteil</span><span>Klick auf einen Pfeil: verstärken oder zurückziehen</span>' +
      '<span><kbd>K</kbd>Allianz anfragen</span><span><kbd>L</kbd>Allianz brechen</span><span><kbd>I</kbd>Spieler-Info</span>' +
      '<span><kbd>Q</kbd><kbd>E</kbd>Zoom −/+</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>Karte schieben</span><span><kbd>C</kbd>Zum eigenen Gebiet</span>' +
      '<span><kbd>P</kbd>Pause</span><span><kbd>,</kbd><kbd>.</kbd>Tempo −/+</span><span><kbd>Strg</kbd>+ Klick: Baumenü</span><span>Klick: Angreifen</span><span>Rechtsklick: Kreismenü</span><span><kbd>N</kbd>Aufstellung</span><span><kbd>V</kbd> halten: verdichten</span><span><kbd>Shift</kbd>+<kbd>V</kbd> halten: ausdünnen</span><span><kbd>Shift</kbd>+ Mausrad: Truppenanteil</span>' +
      '<span><kbd>Esc</kbd>Schliessen</span></div><p>Eine Bau-Taste zeigt das Gebäude oder die Bombe zuerst am Mauszeiger: in deiner Farbe, wenn es dort geht, rot, wenn nicht. Fehlt nur das Gold, bleibt der Preis stehen und wird rot; sonst steht der Grund dabei. Bei Bomben siehst du schon beim Zielen die Flugbahn vom Silo (rot, wo gegnerische Flugabwehr sie erreicht), den Sprengradius und die Reichweite jeder Flugabwehr: die gegnerische violett, deine eigene grün. Fliegt eine Bombe auf dein Land zu, wird die Reichweite deiner eigenen Flugabwehr ebenfalls eingeblendet. Ein Klick setzt es, mit gedrückter <kbd>Shift</kbd>-Taste mehrere hintereinander. Klickst du damit auf ein eigenes Gebäude derselben Art, wird es um eine Stufe ausgebaut; dieselbe Taste, <kbd>Esc</kbd> oder ein Rechtsklick legt es wieder weg.</p><p>Zusätzlich, weil es das in OpenFront nicht gibt: <kbd>U</kbd> baut das Gebäude unter dem Mauszeiger aus, <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>6</kbd> das nächste Gebäude dieser Art, <kbd>Enter</kbd> feuert im Zielmodus des Baumenüs die Bombe ab, <kbd>O</kbd> schaltet den Ton, die Leertaste pausiert ebenfalls.</p><p>' +
      'Befehle gelten für die Stelle unter dem Mauszeiger.</p>';
  }
  function showHelp(fromStart) {
    openModal(helpHtml() + '<button class="btn" data-act="' + (fromStart ? 'start' : 'resume') + '" type="button">' + (fromStart ? 'Zurück' : 'Weiterspielen') + '</button>', fromStart ? 'starthelp' : 'help');
  }

  function startGame() {
    readForm();
    $('fStart').disabled = true; $('fStart').querySelector('small').textContent = 'Karte wird vorbereitet';
    loadMap(cfg.map).then(function (map) {
      begin(map, {
        seed: (Math.random() * 2e9) | 0, difficulty: cfg.diff, bots: cfg.bots, nations: cfg.nations, arsenal: cfg.mode === 'arsenal', res: RES, kampf: playOpts(cfg).kampf, pfeile: playOpts(cfg).pfeile, bahn: playOpts(cfg).bahn, hafen: playOpts(cfg).hafen,
        instantBuild: cfg.instant, infiniteGold: cfg.gold, infiniteTroops: cfg.troops
      }, { name: cfg.name, color: COLORS[cfg.color] });
    }).catch(function (e) {
      toast(e.message);
      $('fStart').disabled = false; $('fStart').querySelector('small').textContent = 'Nochmals versuchen';
    });
  }
  // A new game: made by the host (in the worker it takes a moment), then shown.
  function begin(map, opts, people) {
    if (host) host.stop();
    game = null;
    const h = host = G.Host(map, opts, people, function (why) {
      if (host !== h) return;
      toast('Das Spiel ist abgebrochen: ' + String(why).split('\n')[0]);
      quitGame();
    });
    h.onState = afterSteps;
    h.ready(function () { if (host === h) shown(map, opts); });
  }
  function shown(map, opts) {
    game = host.game;
    view.setMap(map); view.setGame(game); view.fit(false); view.reachKind = -1; view.hoverUnit = null;
    landC = 0; view.resSel = 0; view.resSigns = true; renderLand();
    if (!RES && opts.res) setTimeout(function () { addMsg('Dieser Raum spielt die Version «Rohstoffe». Öffne den Einladungslink, sonst läuft dein Spiel auseinander.', 'bad'); }, 50);
    $('statGold').classList.toggle('res', game.res);
    if (RES && !game.res) setTimeout(function () { addMsg(opts.res ? 'Rohstoffe gibt es nur auf der Karte «Erde». Diese Runde läuft klassisch.' : 'Dieser Raum spielt ohne Rohstoffe.', 'info'); }, 50);
    view.cam.z = within(Math.max(view.cw / map.W, view.ch / map.H) * 0.5, view.cam.z, 4);
    $('modal').hidden = true; modalKind = '';
    $('hud').hidden = false; $('spawnBar').hidden = false; $('ctrl').hidden = true; $('lb').hidden = true; $('aimBar').hidden = true;
    netOn = false; stroke = null; netQueue.clear(); lastTile = -1; commitAt = -99; view.net.on = false; view.net.edit.clear(); view.net.w = 0; view.net.at = -1e9;
    $('peek').hidden = true; trainSeen = 0; shipSeen = 0; incAt = -99; incLog.length = 0; $('incLine').hidden = true; $('incLine').dataset.html = '';
    $('bNet').hidden = true; $('bNet').setAttribute('aria-pressed', 'false'); $('netBar').hidden = true; $('commit').textContent = ''; quick = null; $('brushBtns').hidden = true; syncBrushBtns(); showKeys(false);
    $('bRes').hidden = true;
    plans.length = 0; syncPlans();
    $('mPunkt').hidden = !game.punkt; setThrust(cfg.thrust);
    $('feedMsgs').innerHTML = ''; $('feedLive').innerHTML = ''; $('news').innerHTML = ''; chips.clear(); asks.clear();
    $('lbRows').innerHTML = ''; $('clock').textContent = '0:00';
    speed = 1; $('bSpeed').textContent = '1×'; acc = 0; stateAt = performance.now(); endShown = false; lbAt = liveAt = -99; tradeAt = 0; aim = null;
    setPaused(false);
    view.placeNames();
    hudTick();
  }
  // Every order of the player goes through here: carried out at once when playing alone (in the
  // worker: as soon as it gets there, its answer comes back), sent to the host of the room when
  // playing together.
  function act(c) {
    if (!game) return;
    if (mp) { mp.send(c); return; }
    const h = host;
    host.exec(game.human.id, c, function (why) { if (host === h && game) done(c, why); });
  }
  function done(c, why) {
    if (c.k === 'mesh' || c.k === 'even') return;
    if (why) { toast(why); snd('deny'); return; }
    if (c.k === 'strike') snd(c.sea ? 'boat' : 'attack');
    else if (c.k === 'build') { if (c.u === UT.WARSHIP) snd('ship'); else if (c.u < UT.ATOM) snd('build'); }
    else if (c.k === 'up') snd('upgrade');
    else if (c.k === 'dig') snd(game.dg && game.dg.lv[c.d] > 1 ? 'upgrade' : 'build');
    else if (c.k === 'ship') snd('ship');
    else if (c.k === 'spawn') snd('tap');
    if (c.k === 'spawn') { view.flush(); view.placeName(game.human); hudTick(); }
    else if (c.say) toast(c.say);
    if (modalKind === 'info') renderInfo();
  }
  // The orders of one turn of the room, as entries for host.step; the own ones get their answer.
  function turnOrders(list) {
    const me = game.human ? game.human.id : 0, h = host, out = [];
    for (let i = 0; i < list.length; i++) {
      const id = list[i][0] | 0, c = list[i][1];
      out.push(id === me ? host.order(id, c, function (why) { if (host === h && game) done(c, why); }) : [id, c]);
    }
    return out;
  }
  function quitGame() {
    const wasLevel = !!(game && game.lv), wasShow = wasLevel && !!game.lv.def.show;
    if (host) { host.stop(); host = null; }
    game = null; closeRadial(); $('sheet').hidden = true; if (view) view.selUnit = null; stopAim();
    $('hud').hidden = true;
    leaveRoom();
    if (cfg.map === 'zufall') delete maps.zufall;
    G.Feldzug.hide(); G.Neuheiten.hide();
    if (wasShow) { G.Neuheiten.open(); return; }
    if (wasLevel) { G.Feldzug.open(); return; }
    showStart();
    previewMap(cfg.map);
  }

  // ---------- feed ----------
  // Messages: at most three at the bottom right, gone after 6 s; the same message again counts up
  // on the one already there instead of stacking (until 23.11.2026 up to four on the left, among
  // the attacks, each repeat a new line).
  function addMsg(text, cls) {
    const box = $('news');
    for (const el of box.children) {
      if (el.dataset.text !== text) continue;
      el.dataset.n = (+el.dataset.n || 1) + 1;
      el.lastChild.textContent = '×' + el.dataset.n;
      clearTimeout(el.timer); el.timer = setTimeout(function () { el.remove(); }, 6000);
      return;
    }
    const el = document.createElement('div');
    el.className = 'msg ' + (cls || 'info');
    el.dataset.text = text;
    el.appendChild(document.createTextNode(text)); el.appendChild(document.createElement('b'));
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    el.timer = setTimeout(function () { el.remove(); }, 6000);
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
      if (e.k === 'msg') {
        addMsg(e.text, e.cls);
        if (e.cls === 'bad') snd('bad', 0.6); else if (e.cls === 'warn') snd('warn', 0.6); else if (e.cls === 'good') snd(/Allianz/.test(e.text) ? 'ally' : 'good', 0.4);
      }
      else if (e.k === 'allyReq') {
        const from = game.players[e.from], id = e.id;
        addAsk('q' + id, from.name + ' bietet dir eine Allianz an', 'Annehmen', 'Ablehnen',
          function () { act({ k: 'ans', id: id, y: 1 }); }, function () { act({ k: 'ans', id: id, y: 0 }); });
      } else if (e.k === 'renew') {
        const q = game.players[e.id];
        addAsk('r' + q.id, 'Die Allianz mit ' + q.name + ' läuft bald ab', 'Verlängern', 'Auslaufen lassen',
          function () { act({ k: 'renew', p: q.id }); }, function () { /* let it run out */ });
      } else if (e.k === 'start') {
        $('spawnBar').hidden = true; $('ctrl').hidden = false; $('lb').hidden = false; $('bNet').hidden = !h.post || !game.netz; $('brushBtns').hidden = !h.post || !game.netz; $('bRes').hidden = !game.res;
        if (game.pfeile && !game.lv) addMsg('Pfeile mit der rechten Maustaste planen, dann «Angreifen».', 'info');
        const W = game.W;
        view.flyTo(h.spawnTile % W, (h.spawnTile / W) | 0, within(Math.min(view.cw, view.ch) / 70, 2.2, 6));
        if (!game.lv) addMsg('Los geht es. Breite dich aus, bevor es andere tun.', 'good');   // a level shows its own tips
        snd('start');
      } else if (e.k === 'raid') {
        // under attack: the edge of the screen flashes red three times
        const al = $('alarm');
        al.classList.remove('on'); void al.offsetWidth; al.classList.add('on');
        snd('alarm', 0.5);
      } else if (e.k === 'dep') {
        const d = game.map.deposits[e.d], say = G.RAW[d.raw][0] + ' in ' + game.map.countries[d.c].name;
        if (e.won) {
          const dk = G.digOf(d.raw), dl = game.dg ? game.dg.lv[e.d] : 0;
          addMsg('Vorkommen erobert: ' + say + (dl ? ' mit ' + dk[0] + ' (Stufe ' + dl + ')' : ', dort fehlt noch: ' + dk[0]), 'good'); snd('good', 0.4);
        }
        else addMsg('Vorkommen verloren: ' + say, 'warn');
      } else if (e.k === 'loot') {
        if (e.by === h.id && e.gold > 0) { view.floatText(e.x, e.y, '+ ' + fmt(e.gold)); goldPop(e.gold); }
      } else if (e.k === 'quest') { setNet(false); stopAim(); G.Feldzug.end(e); }
      else if (e.k === 'defeat' && game.lv) { setNet(false); }   // a level reports its end itself ('quest')
      else if (e.k === 'defeat') { setNet(false); plans.length = 0; syncPlans(); $('bNet').hidden = true; showEnd('defeat', null); }
      else if (e.k === 'win') showEnd(game.players[e.id] === h ? 'win' : 'other', game.players[e.id]);
    }
    ev.length = 0;
  }

  // Show a sum of gold that just came in, right next to the gold counter.
  function goldPop(n) {
    const el = $('goldPop');
    el.textContent = '+' + fmt(n);
    el.classList.remove('go'); void el.offsetWidth; el.classList.add('go');
    $('statGold').classList.add('flash');
    clearTimeout(goldTimer);
    goldTimer = setTimeout(function () { $('statGold').classList.remove('flash'); }, 1300);
  }

  function live() {
    const h = game.human, seen = new Set(), box = $('feedLive');
    const put = function (key, cls, text, action) {
      seen.add(key);
      let el = chips.get(key);
      if (!el) {
        el = document.createElement('div');
        el.className = 'msg chip ' + cls;
        el.innerHTML = '<span></span>' + (action ? '<button type="button" aria-label="' + (cls === 'bad' ? 'Gegenangriff' : 'Zurückrufen') + '">' + svg(cls === 'bad' ? 'sword' : 'close', 13) + '</button>' : '');
        if (action) el.lastChild.addEventListener('click', action);
        box.appendChild(el);
        chips.set(key, el);
      }
      if (el.firstChild.textContent !== text) el.firstChild.textContent = text;
    };
    if (h.alive) {
      for (const a of h.out) {
        put('o' + a.id, 'info', 'Angriff auf ' + (a.tid ? game.players[a.tid].name : 'freies Land') + ' · ' + fmtT(a.troops) + (a.want >= 1 ? ' · +' + fmtT(a.want) + ' unterwegs' : ''), function () { act({ k: 'ret', a: a.id }); });
      }
      const inc = h.inc.slice().sort(function (a, b) { return b.troops - a.troops; });
      // incoming attacks, the largest first, each with a button to strike back at once (as OpenFront)
      for (let i = 0; i < inc.length && i < 3; i++) {
        const q = inc[i].a;
        put('i' + inc[i].id, 'bad', q.name + ' greift an · ' + fmtT(inc[i].troops) + (inc[i].sum > inc[i].troops * 1.2 ? ' (von ' + fmtT(inc[i].sum) + ')' : ''), q.type === PT.BOT ? null : function () {
          let t = -1;
          for (const b of h.border) { const W = game.W; for (const n of [b - 1, b + 1, b - W, b + W]) if (n >= 0 && n < game.N && game.owner[n] === q.id) { t = n; break; } if (t >= 0) break; }
          if (t >= 0) strikeAt(t);
        });
      }
      if (inc.length > 3) put('more', 'bad', '+' + (inc.length - 3) + ' weitere Angriffe', null);
      for (const u of h.units) {
        if (u.type !== UT.TRANSPORT) continue;
        put('b' + u.id, 'info', (u.retreat ? 'Boot kehrt um · ' : 'Boot unterwegs · ') + fmtT(u.troops), function () { act({ k: 'bret', u: u.id }); });
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

  // The build bar at the bottom of a desktop screen, as in OpenFront: every building and weapon with
  // its key, how many you own and its price (red while you cannot pay). A click picks it up.
  let hotSig = '';
  function renderHotbar() {
    const el = $('hotbar'), h = game.human;
    if (!h.alive || game.phase !== 'play' || (game.lv && !game.lv.def.allow.length)) { el.hidden = true; return; }
    el.hidden = false;
    const rich = game.opts.infiniteGold;
    const cells = BUILD.filter(function (b) { return offered(b.t); }).map(function (b) {
      const cost = costOf(h, b.t), wait = b.t === UT.LASER ? Math.ceil(((h.laserAt || 0) - game.ticks) / 10) : 0;
      const have = b.t === UT.WARSHIP || b.t === BS ? shipsOf(h, real(b.t).cls) : b.t <= UT.CLOAK ? h.units.filter(function (u) { return u.type === b.t; }).length : 0;
      return { b: b, cost: wait > 0 ? wait + ' s' : fmt(cost), poor: wait > 0 || (!rich && h.gold < cost), have: have, on: !!ghost && ghost.t === b.t };
    });
    const sig = cells.map(function (c) { return c.cost + (c.poor ? '!' : '') + c.have + (c.on ? '*' : ''); }).join('|');
    if (sig === hotSig) return;
    hotSig = sig;
    el.innerHTML = cells.map(function (c) {
      return '<button type="button" class="hk' + (c.poor ? ' poor' : '') + '" data-t="' + c.b.t + '" aria-pressed="' + c.on + '" title="' + plain(c.b.t) + ': ' + esc(c.b.note) + '">' +
        '<kbd>' + c.b.key.toUpperCase() + '</kbd>' + (c.have ? '<i class="own">' + c.have + '</i>' : '') + svg(c.b.icon, 22) + '<span>' + c.cost + '</span></button>';
    }).join('');
  }

  function hudTick() {
    if (plans.length) syncPlans();
    const h = game.human, T = game.ticks;
    if (game.phase === 'spawn') {
      if (mp) {
        let n = 0;
        for (const q of game.humans) if (q.spawned) n++;
        $('spawnBarLine').hidden = false;
        $('spawnFill').style.width = (Math.min(1, T / game.spawnEnd) * 100).toFixed(1) + '%';
        $('spawnHint').textContent = h.spawned ? 'Warte auf die anderen · ' + n + ' von ' + game.humans.length + ' bereit'
          : 'Tippe auf freies Land · noch ' + Math.max(0, Math.ceil((game.spawnEnd - T) / 10)) + ' s';
      } else {
        $('spawnBarLine').hidden = true;
        $('spawnHint').textContent = game.lv ? 'Tippe auf einen Ort' : 'Tippe auf freies Land, dann geht es sofort los';
      }
      if (game.lv) G.Feldzug.hud();
      return;
    }
    $('clock').textContent = clock((T - game.playStart) / 10);
    renderHotbar();
    if (h.alive) {
      $('sTroops').textContent = fmtT(h.troops);
      $('sTroopsSub').textContent = '+' + fmtT(Math.max(0, game.troopGrowth(h)) * 10) + '/s';
      // the bar: what stands at home, what is out in attacks, against the most you can hold
      const max = game.opts.infiniteTroops ? h.troops : Math.max(1, game.maxTroops(h));
      let out = 0;
      for (const a of h.out) if (a.active) out += a.troops + (a.want || 0);
      for (const u of h.units) if (u.type === UT.TRANSPORT) out += u.troops;
      const home = Math.min(1, h.troops / max), away = Math.min(1 - home, out / max);
      $('popHome').style.transform = 'scaleX(' + home.toFixed(4) + ')';
      $('popOut').style.transform = 'translateX(' + (home * 100).toFixed(2) + '%) scaleX(' + away.toFixed(4) + ')';
      $('popBar').classList.toggle('full', home > 0.985);
      $('popTxt').textContent = fmtT(h.troops) + (out >= 1 ? ' + ' + fmtT(out) : '') + ' / ' + (game.opts.infiniteTroops ? '∞' : fmtT(max));
      $('sGold').textContent = game.opts.infiniteGold ? '∞' : fmt(h.gold);
      $('sGoldSub').textContent = '+' + fmt(game.goldRate(h) * 10) + '/s';
      $('ratioTroops').textContent = fmtT(h.troops * ratio);
      if (T - commitAt >= 3) { commitAt = T; showCommit(); showPeek(); if (game.res) renderLand(); }
      if (T - incAt >= 50) { incAt = T; showIncome(); }
    }
    if (T - lbAt >= 10) { lbAt = T; leaderboard(); }
    if (T - liveAt >= 3) { liveAt = T; live(); }
    if (T - tradeAt >= 150) {
      tradeAt = T;
      // sea trade and railways are reported apart, so one can see what a port and what a factory earns
      const sg = (h.shipTotal || 0) - shipSeen;
      if (sg > 0) { addMsg('Seehandel bringt ' + fmt(sg) + ' Gold', 'good'); shipSeen = h.shipTotal || 0; }
      const tg = (h.trainTotal || 0) - trainSeen;
      if (tg > 0) { addMsg('Züge bringen ' + fmt(tg) + ' Gold', 'good'); trainSeen = h.trainTotal || 0; }
    }
    if (modalKind === 'info' && T % 5 === 0) renderInfo();
    if (modalKind === 'res' && T % 3 === 0) renderRes();
    if (aim && T % 3 === 0) refreshAim();
    if (game.lv) G.Feldzug.hud();
  }

  // ---------- end of game ----------
  function showEnd(kind, winner) {
    if (kind === 'other' && endShown === 'defeat' && !$('modal').hidden) { /* replace the defeat card */ }
    else if (endShown && kind !== 'other') return;
    endShown = kind;
    snd(kind === 'win' ? 'win' : 'lose');
    closeRadial(); $('sheet').hidden = true; if (view) view.selUnit = null;
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
    } else kind = p.type === PT.HUMAN ? 'Mitspieler' : 'Bot · baut nichts, greift nur viel Schwächere langsam an';
    let s = '<div class="who"><span class="dot big" style="background:' + p.css + '"></span><div><h2>' + (p.flag ? G.flagOf(p.flag) + ' ' : '') + esc(p.name) + '</h2><p>' + kind + '</p></div></div>';
    s += '<div class="facts">' + fact('Truppen', fmtT(p.troops)) + fact('Gold', me && game.opts.infiniteGold ? '∞' : fmt(p.gold)) + fact('Gebiet', (p.tiles / den * 100).toFixed(1) + ' %') + '</div>';
    if (!me && p.alive) s += '<p class="notes">Eroberung bringt ' + fmt(game.lootValue(p)) + ' Gold (sein Gold und die Prämie für ' + G.fmt(Math.max(p.peak, p.tiles)) + ' Felder).</p>';
    s += '<div class="facts six">' + fact('Städte', seen(p, UT.CITY)) + fact('Häfen', seen(p, UT.PORT)) + fact('Fabriken', seen(p, UT.FACTORY)) +
      fact('Posten', seen(p, UT.DEFENSE)) + fact('Silos', seen(p, UT.SILO)) + fact('Abwehr', seen(p, UT.SAM)) + '</div>';
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
    if (!mp) setPaused(true);
    openModal('<h2>' + (mp ? 'Menü' : 'Pause') + '</h2><p>' + (game.lv ? (game.lv.def.show ? 'Änderung · ' + esc(game.lv.def.title) : 'Level ' + game.lv.def.n + ' · ' + esc(game.lv.def.name)) : esc(game.map.name) + ' · ' + G.DIFF_NAMES[game.opts.difficulty] + (game.opts.arsenal ? ' · Arsenal' : '')) + '</p>' +
      '<button class="btn" data-act="resume" type="button">Weiterspielen</button>' +
      '<button class="btn ghost" data-act="help" type="button">So wird gespielt</button>' +
      '<label class="check wide" for="mMusic"><input id="mMusic" type="checkbox"' + (cfg.music ? ' checked' : '') + '>Musik</label>' +
      '<label class="check" for="mSfx"><input id="mSfx" type="checkbox"' + (cfg.sfx ? ' checked' : '') + '>Töne bei Aktionen</label>' +
      (game.lv && game.lv.def.show ? '<button class="btn ghost" data-act="nwRetry" type="button">Nochmals von vorn</button><button class="btn ghost" data-act="quit" type="button">Zur Liste der Änderungen</button>'
        : game.lv ? '<button class="btn ghost" data-act="lvRetry" type="button">Level neu starten</button><button class="btn ghost" data-act="quit" type="button">Zu den Levels</button>'
        : '<button class="btn ghost" data-act="quit" type="button">Spiel beenden</button>'), 'menu');
    $('mMusic').addEventListener('change', function () { setSound('music', this.checked); });
    $('mSfx').addEventListener('change', function () { setSound('sfx', this.checked); });
  }
  function setSound(kind, v) {
    cfg[kind] = v; saveCfg();
    G.Audio.set(kind, v);
    const any = cfg.music || cfg.sfx;
    $('bSound').innerHTML = svg(any ? 'sound' : 'mute', 18);
    $('bSound').setAttribute('aria-label', any ? 'Ton aus' : 'Ton an');
    $('bSound').setAttribute('aria-pressed', any ? 'true' : 'false');
  }

  function onModalAct(what) {
    const h = game ? game.human : null, p = game ? game.players[infoId] : null;
    if (what === 'start') { showStart(); return; }
    if (what === 'close' || what === 'resume') { closeModal(); return; }
    if (what === 'help') { showHelp(false); return; }
    if (what === 'quit') { quitGame(); return; }
    if (what.indexOf('lv') === 0) { G.Feldzug.act(what); return; }
    if (what.indexOf('nw') === 0) { G.Neuheiten.act(what); return; }
    if (what === 'confirmBreak') { act({ k: 'break', p: p.id }); closeModal(); return; }
    if (what === 'ally') { act({ k: 'ally', p: p.id, say: 'Anfrage an ' + p.name + ' gesendet' }); return; }
    if (what === 'break') {
      openModal('<h2>Allianz brechen?</h2><p>Du wirst zum Verräter: 30 Sekunden lang verlieren Angreifer gegen dich nur halb so viele Truppen, und andere Nationen trauen dir weniger.</p>' +
        '<button class="btn danger" data-act="confirmBreak" type="button">Allianz mit ' + esc(p.name) + ' brechen</button>' +
        '<button class="btn ghost" data-act="close" type="button">Abbrechen</button>', 'confirm');
      return;
    }
    if (what === 'troops') { act({ k: 'don', p: p.id, g: 'troops', r: ratio, say: 'Truppen an ' + p.name + ' geschickt' }); return; }
    if (what === 'gold') { act({ k: 'don', p: p.id, g: 'gold', say: 'Gold an ' + p.name + ' geschickt' }); return; }
    if (what === 'renew') { act({ k: 'renew', p: p.id }); dropAsk('r' + p.id); return; }
    if (what === 'embargo') { act({ k: 'emb', p: p.id, on: h.embargo.has(p.id) ? 0 : 1 }); return; }
    if (what === 'show') {
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
    R.style.top = within(sy, 172, Math.max(172, view.ch - 230)) + 'px';
    let cap;
    if (!a.land) cap = 'Wasser';
    else if (a.own) cap = 'Dein Gebiet';
    else if (a.target) cap = a.target.name + ' · ' + fmtT(a.target.troops);
    else cap = (game.fallout[tile] ? 'Verstrahltes Land' : 'Freies Land') + ' · ' + groundName(tile);
    if (a.land && a.target && game.map.cover) cap += ' · ' + groundName(tile);
    $('rCap').textContent = cap;
    let mode = '';
    if (a.canAttack) mode = 'attack';
    else if (a.boat) mode = 'boat';
    else if (!a.land && h.cnt[UT.WARSHIP] > 0) mode = 'ship';
    const c = $('rC');
    c.dataset.mode = mode;
    c.classList.toggle('off', !mode);
    c.innerHTML = svg(mode === 'boat' ? 'boat' : mode === 'ship' ? 'warship' : 'sword', 28) + '<span>' + (mode === 'boat' ? 'Boot' : mode === 'ship' ? 'Schiff' : 'Angreifen') + '</span>';
    const near = a.own ? game.structNear(tile, 4) : null, canUp = !!near && near.owner === h && near.built;
    $('rN').firstChild.innerHTML = svg(canUp ? 'up' : 'hammer', 22) + '<span>' + (canUp ? 'Ausbau' : 'Bauen') + '</span>';
    if (canUp) cap = G.UNAME[near.type].replace('\u00AD', '') + ' · Stufe ' + near.level;
    $('rCap').textContent = cap;
    $('rE').disabled = !a.boat;
    const q = a.target, allied = !!q && h.allies.has(q.id), w = $('rW');
    w.classList.toggle('danger', allied);
    w.firstChild.lastChild.textContent = allied ? 'Brechen' : 'Allianz';
    w.disabled = !q || (!allied && !game.canRequestAlliance(h, q));
    R.hidden = false; radialAt = performance.now();
  }
  function radialAct(which) {
    if (!sel || performance.now() - radialAt < 260) return;
    const a = sel, h = game.human;
    if (which === 'C') {
      const mode = $('rC').dataset.mode;
      if (mode === 'attack') strikeAt(a.tile);
      else if (mode === 'boat') sendBoat(a);
      else if (mode === 'ship') act({ k: 'ship', t: a.tile, say: 'Kriegsschiff nimmt Kurs' });
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
      else act({ k: 'ally', p: q.id, say: 'Anfrage an ' + q.name + ' gesendet' });
    }
    closeRadial();
  }
  function sendBoat(a) {
    act({ k: 'strike', t: a.tile, r: ratio, sea: 1, say: 'Boot läuft aus' });
  }

  // ---------- build menu ----------
  let buildTile = -1;
  function openBuild(tile) {
    const h = game.human;
    buildTile = tile;
    let html = '';
    const near = game.owner[tile] === h.id ? game.structNear(tile, 4) : null;
    if (near && near.owner === h && near.built) {
      const top = G.maxLevel(near.type), max = near.level >= top, room = top - near.level;
      const one = game.cost(h, near.type), rich = game.opts.infiniteGold;
      let bar;
      if (top > 10) bar = '<div class="lvbar" aria-label="Stufe ' + near.level + ' von ' + top + '"><i style="width:' + (100 * near.level / top) + '%"></i></div>';
      else {
        bar = '<div class="pips" aria-label="Stufe ' + near.level + ' von ' + top + '">';
        for (let i = 1; i <= top; i++) bar += '<i' + (i <= near.level ? ' class="on"' : '') + '></i>';
        bar += '</div>';
      }
      // three ways to buy: one level, five levels, or as many as the gold allows
      let btns = '';
      if (!max) {
        const five = Math.min(5, room), all = game.upgradePlan(h, near, room);
        let cost5 = 0;
        for (let i = 0; i < five; i++) cost5 += game.cost(h, near.type, h.cnt[near.type] + i);
        const btn = function (n, label, cost, ok) {
          return '<button class="upbtn" type="button" data-up="' + n + '"' + (ok ? '' : ' disabled') + '><span>' + label + '</span>' + coin(cost) + '</button>';
        };
        btns = '<div class="uprow">' + btn(1, '+1 Stufe', one, rich || h.gold >= one);
        if (room > 1) {
          btns += btn(five, '+' + five + ' Stufen', cost5, rich || h.gold >= cost5);
          btns += btn(all.n || 1, all.n > 1 ? 'Max: +' + all.n : 'Max', all.n ? all.cost : one, all.n > 0);
        }
        btns += '</div>';
      }
      html += '<div class="scard"><div class="shead"><span class="ic big">' + svg(BUILD.find(function (b) { return b.t === near.type; }).icon, 30) + '</span>' +
        '<div class="sinfo"><b>' + G.UNAME[near.type] + ' · Stufe ' + near.level + (top > 10 ? ' von ' + top : '') + '</b>' + bar +
        '<small>Jetzt: ' + levelText(near.type, near.level) + '</small>' +
        (max ? '<small>' + (top === 1 ? 'Hat keine Stufen' : 'Höchste Stufe erreicht') + '</small>' : '<small class="next">Stufe ' + (near.level + 1) + ': ' + levelText(near.type, near.level + 1) + '</small>') + '</div></div>' + btns + '</div>';
    }
    const cell = function (b) {
      const nuke = b.t >= UT.ATOM;
      let ok, note, cost = costOf(h, b.t);
      if (b.t === UT.LASER) {
        const wait = (h.laserAt || 0) - game.ticks;
        ok = wait <= 0 && h.gold >= cost && game.ticks >= game.immuneUntil;
        note = wait > 0 ? 'Lädt noch ' + Math.ceil(wait / 10) + ' s' : game.ticks < game.immuneUntil ? 'Schonfrist läuft noch' : h.gold < cost ? 'Zu wenig Gold' : b.note;
      } else if (nuke) {
        const s = game.readySilo(h, tile);
        ok = s.any && h.gold >= cost;
        note = !s.any ? 'Dafür brauchst du ein Raketensilo' : h.gold < cost ? 'Zu wenig Gold' : 'Ziel wählen und abfeuern';
      } else {
        const c = game.buildCheck(h, real(b.t).u, tile, real(b.t).cls);
        ok = c.ok; note = c.ok ? b.note : c.why; cost = c.cost;
      }
      const have = b.t === UT.WARSHIP || b.t === BS ? shipsOf(h, real(b.t).cls) : b.t < UT.ATOM ? h.cnt[b.t] : 0;
      // a warship laid up in a port sails out first; a second button builds a new one all the same
      const lager = b.t === UT.WARSHIP || b.t === BS ? game.stored(h, real(b.t).cls) : 0;
      if (lager && ok) note = 'Aus dem Lager (' + lager + ' im Hafen), gratis';
      const extra = lager ? '<button class="item" type="button" data-t="' + b.t + '" data-fresh="1"><span class="ic">' + svg(b.icon, 24) + '</span><b>Neu bauen</b><small>' + esc(b.note) + '</small>' + coin(costOf(h, b.t)) + '</button>' : '';
      return extra + '<button class="item' + (nuke ? ' nuke' : '') + (!game.opts.infiniteGold && h.gold < cost ? ' poor' : '') + '" type="button" data-t="' + b.t + '"' + (ok ? '' : ' disabled') + '><kbd>' + b.key.toUpperCase() + '</kbd>' + (have ? '<i class="own">' + have + '</i>' : '') +
        '<span class="ic">' + svg(b.icon, 24) + '</span><b>' + G.UNAME[b.t] + '</b><small>' + esc(note) + '</small>' + coin(cost) + '</button>';
    };
    html += '<h3>Gebäude</h3><div class="grid">' + BUILD.filter(function (b) { return b.t <= UT.CLOAK && offered(b.t); }).map(cell).join('') + '</div>';
    html += '<h3>Flotte und Raketen</h3><div class="grid">' + BUILD.filter(function (b) { return b.t > UT.CLOAK && offered(b.t); }).map(cell).join('') + '</div>';
    $('sheetBody').innerHTML = html;
    $('purse').innerHTML = svg('gold', 15) + (game.opts.infiniteGold ? '∞' : fmt(h.gold));
    $('sheet').hidden = false; sheetAt = performance.now();
    view.mark = tile;
    view.selUnit = near && near.owner === h && near.built ? near : null;     // its reach as a circle (drawReach)
    snd('open');
  }
  // Build at a tile, or start aiming a bomb at it. Used by the menu and by the keys.
  function doBuild(t, tile, fresh) {
    if (armory(t) && !game.opts.arsenal) { toast('Den ' + plain(t) + ' gibt es nur im Arsenal-Modus'); snd('deny'); return; }
    if (!offered(t)) { toast(plain(t) + ': in diesem Level noch gesperrt'); snd('deny'); return; }
    if (t === UT.LASER) { startAim(t, tile); return; }
    if (t >= UT.ATOM) {
      const h = game.human, s = game.readySilo(h, tile);
      if (!s.any) { toast('Dafür brauchst du ein Raketensilo'); snd('deny'); return; }
      startAim(t, tile);
      return;
    }
    const r = real(t);
    act({ k: 'build', u: r.u, cls: r.cls, t: tile, fresh: fresh ? 1 : 0, say: r.u === UT.WARSHIP ? plain(t) + (fresh || !game.stored(game.human, r.cls) ? ' läuft aus' : ' läuft aus dem Lager aus') : plain(t) + (game.opts.instantBuild ? ' gebaut' : ' wird gebaut') });
  }
  function doUpgrade(tile, n) {
    const u = game.structNear(tile, 4);
    act({ k: 'up', t: tile, n: n || 1, say: (u ? plain(u.type) : 'Gebäude') + ' ausgebaut' });
  }
  // The mouse over an own air defence or factory (25.11.2026): the view then rings every one of
  // that kind (View.drawReach). Only the own buildings are searched, and only when the mouse moves.
  function hoverUnit() {
    if (!view) return;
    let best = null;
    if (game && game.human && game.phase === 'play' && !netOn) {
      const t = view.tileAt(hoverX, hoverY), h = game.human;
      if (t >= 0) {
        const W = game.W, x = t % W, y = (t / W) | 0, r = Math.max(2, 16 / view.cam.z);
        let bd = r * r;
        for (const u of h.units) {
          if (!u.built || (u.type !== UT.SAM && u.type !== UT.FACTORY)) continue;
          const d = (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y);
          if (d <= bd) { bd = d; best = u; }
        }
      }
    }
    view.hoverUnit = best;
  }
  function upgradeKind(t) {
    const h = game.human, W = game.W;
    const at = hoverX >= 0 ? view.tileAt(hoverX, hoverY) : -1;
    const px = at >= 0 ? at % W : h.nameX, py = at >= 0 ? (at / W) | 0 : h.nameY;
    let best = null, bd = Infinity;
    for (const u of h.units) {
      if (u.type !== t || !game.canUpgrade(h, u)) continue;
      const d = (u.x - px) * (u.x - px) + (u.y - py) * (u.y - py);
      if (d < bd) { bd = d; best = u; }
    }
    if (!best) { toast(h.cnt[t] ? plain(t) + ': alle schon auf der höchsten Stufe' : 'Du hast noch kein Gebäude dieser Art'); snd('deny'); return; }
    act({ k: 'up', t: best.tile, say: plain(t) + ' ausgebaut auf Stufe ' + (best.level + 1) });
    view.mark = best.tile;
    setTimeout(function () { if (view && view.mark === best.tile && $('sheet').hidden) view.mark = -1; }, 900);
  }
  // The tap that opens the card must not also press a button of it: on a phone the browser sends a click
  // to whatever lies under the finger after the touch, and that is the card by then.
  let sheetAt = 0;
  function closeBuild() { $('sheet').hidden = true; if (view) { view.mark = -1; view.selUnit = null; } }
  function onBuild(e) {
    if (performance.now() - sheetAt < 350) return;
    const b = e.target.closest('[data-t],[data-up]');
    if (!b || b.disabled) return;
    if (b.dataset.up) doUpgrade(buildTile, +b.dataset.up);
    else {
      const t = +b.dataset.t;
      if (t >= UT.ATOM) closeBuild();
      doBuild(t, buildTile, !!b.dataset.fresh);
      if (t >= UT.ATOM) return;
    }
    closeBuild();
  }

  // ---------- aiming a bomb ----------
  // The map shows the flight path, the blast and every air defence in reach; a tap moves the target.
  function startAim(type, tile) {
    closeRadial(); setNet(false);
    aim = { type: type, tile: tile };
    $('ctrl').hidden = true; $('aimBar').hidden = false;
    $('aimIc').innerHTML = svg(BUILD.find(function (b) { return b.t === type; }).icon, 26);
    $('aimName').textContent = G.UNAME[type].replace('­', '');
    refreshAim();
  }
  function stopAim() {
    if (!aim) return;
    aim = null;
    if (view) view.aim = null;
    $('aimBar').hidden = true;
    if (game && game.phase === 'play') $('ctrl').hidden = false;
  }
  function refreshAim() {
    const h = game.human;
    if (!h.alive) { stopAim(); return; }
    const c = game.buildCheck(h, aim.type, aim.tile), W = game.W;
    const silo = aim.type === UT.LASER ? null : c.silo || game.readySilo(h, aim.tile).silo || h.units.find(function (u) { return u.type === UT.SILO && u.built; }) || null;
    view.aim = { type: aim.type, tile: aim.tile, silo: silo, ok: c.ok };
    let text, warn = false;
    if (!c.ok) { text = c.why; warn = true; }
    else {
      const sams = aim.type === UT.MIRV || !silo ? [] : game.samsOnPath(h, silo.x, silo.y, aim.tile % W, (aim.tile / W) | 0, aim.type);
      if (sams.length && aim.type === UT.CRUISE) { warn = true; text = (sams.length === 1 ? 'Eine Flugabwehr steht' : sams.length + ' Flugabwehren stehen') + ' nah genug am Weg. Marschflugkörper fliegen tief, aber so nah werden sie abgefangen.'; }
      else if (sams.length) { warn = true; text = (sams.length === 1 ? 'Eine Flugabwehr liegt' : sams.length + ' Flugabwehren liegen') + ' auf dem Weg. Die Bombe wird abgefangen.'; }
      else if (aim.type === UT.LASER) text = 'Kommt aus dem All: keine Flugabwehr hält ihn auf. Tippe auf die Karte, um das Ziel zu verschieben.';
      else text = 'Tippe auf die Karte, um das Ziel zu verschieben.';
    }
    $('aimInfo').textContent = text;
    $('aimInfo').classList.toggle('warn', warn);
    $('aimGo').disabled = !c.ok;
    $('aimCost').innerHTML = coin(c.cost);
  }
  function fireAim() {
    if (!aim) return;
    act({ k: 'build', u: aim.type, t: aim.tile, say: G.UNAME[aim.type].replace('­', '') + ' gestartet' });
    stopAim();
  }

  // ---------- taps on the map ----------
  // A tap on free land or on a bot attacks at once. Against nations and other players the menu
  // opens and the attack has to be chosen there. A long press opens the menu everywhere.
  // A build key shows what it would place under the mouse pointer; the next click places it.
  // What a factory at this spot would be worth: the stations it would tie in, and roughly what
  // its trains earn a minute (a train every 23 seconds, 10K at each of up to four stops).
  function railHint(tile, type) {
    if (game.bahn) {
      // deliveries: a city or port shows whether it joins the network, a factory what it brings
      const r = game.railGuess(game.human, type === undefined ? UT.FACTORY : type, tile);
      if (type === UT.CITY || type === UT.PORT) return r.factories.length ? ' · verbunden, ca. +' + fmt(Math.round(r.perMin)) + '/min' : ' · nicht verbunden (keine Fabrik in Reichweite)';
      return r.stations ? ' · ' + r.stations + (r.stations === 1 ? ' Stadt oder Hafen' : ' Städte und Häfen') + ', ca. +' + fmt(Math.round(r.perMin)) + '/min' : ' · keine Stadt in Reichweite';
    }
    const h = game.human, W = game.W, x = tile % W, y = (tile / W) | 0, rr = game.R.rail * game.R.rail;
    let n = 0;
    for (const u of h.units) if (u.built && G.isStation(u.type) && (u.x - x) * (u.x - x) + (u.y - y) * (u.y - y) <= rr) n++;
    if (!n) return ' · keine Station in Reichweite';
    return ' · ' + n + (n === 1 ? ' Station' : ' Stationen') + ', ca. +' + fmt(Math.round(2.6 * Math.min(4, n) * 10000)) + '/min';
  }
  function setGhost(t) {
    ghost = t === null ? null : { t: t };
    ghostKey = '';
    if (view) view.ghost = null;
    document.body.classList.toggle('placing', !!ghost);
    if (game && game.phase === 'play') renderHotbar();
  }
  function refreshGhost() {
    if (!ghost) return;
    if (!game || game.phase !== 'play' || !game.human.alive || aim || !$('modal').hidden) { setGhost(null); return; }
    const tile = hoverX >= 0 ? view.tileAt(hoverX, hoverY) : -1;
    const key = tile + ':' + ((game.ticks / 3) | 0);
    if (key === ghostKey) return;
    ghostKey = key;
    if (tile < 0) { view.ghost = null; return; }
    const h = game.human, icon = BUILD.find(function (b) { return b.t === ghost.t; }).icon;
    const up = ghostUpgrade(tile);
    if (up) {
      // over one of your own buildings of this kind the click upgrades it
      const top = up.level >= G.maxLevel(up.type), cost = game.cost(h, up.type), poor = !game.opts.infiniteGold && h.gold < cost;
      view.ghost = { type: ghost.t, icon: 'up', tile: up.tile, ok: !top && !poor,
        text: top ? 'Höchste Stufe erreicht' : 'Ausbauen auf Stufe ' + (up.level + 1) + ' · ' + G.fmt(cost) };   // too little gold: same text, shown in red
      return;
    }
    const c = game.buildCheck(h, real(ghost.t).u, tile, real(ghost.t).cls);
    // for a bomb: the silo it would start from (or, while all are reloading, any silo), so the flight path can be shown
    const silo = ghost.t >= UT.ATOM && ghost.t !== UT.LASER ? c.silo || game.readySilo(h, tile).silo || h.units.find(function (u) { return u.type === UT.SILO && u.built; }) || null : null;
    view.ghost = { type: ghost.t, icon: icon, tile: tile, ok: c.ok, silo: silo,
      text: c.ok && c.stored ? plain(ghost.t) + ' · aus dem Lager, gratis' : c.ok || c.why === 'Zu wenig Gold' ? plain(ghost.t) + ' · ' + G.fmt(costOf(h, ghost.t)) + (ghost.t === UT.FACTORY || (game.bahn && (ghost.t === UT.CITY || ghost.t === UT.PORT)) ? railHint(tile, ghost.t) : '') : c.why || 'Hier nicht möglich' };   // too little gold: the price stays, in red
  }
  // The player's own finished building of the kind being placed, if the pointer is on it.
  function ghostUpgrade(tile) {
    if (!ghost || ghost.t > UT.CLOAK) return null;
    const u = game.structNear(tile, 3);
    return u && u.owner === game.human && u.built && u.type === ghost.t ? u : null;
  }
  function placeGhost(tile) {
    const h = game.human, t = ghost.t, up = ghostUpgrade(tile);
    if (up) {
      act({ k: 'up', t: up.tile, n: 1, say: plain(t) + ' ausgebaut auf Stufe ' + (up.level + 1) });
      ghostKey = '';
      if (!shiftHeld) setGhost(null);
      return;
    }
    const c = game.buildCheck(h, real(t).u, tile, real(t).cls);
    if (!c.ok) { toast(plain(t) + ': ' + (c.why || 'Hier nicht möglich')); snd('deny'); return; }
    if (t >= UT.ATOM) act({ k: 'build', u: t, t: tile, say: plain(t) + ' gestartet' });
    else doBuild(t, tile);
    if (!shiftHeld) setGhost(null);   // hold Shift to place several in a row
  }

  // ---------- Aufstellung ----------
  // An order to attack over land: says beforehand how much is at hand and how much has to march.
  // ---------- attack modes ----------
  // 0 the whole front, 1 a section, 2 a wedge. With a mouse the whole front is a double click and
  // a section or a wedge is drawn with the right button (the switch picks which of the two); on a
  // touch screen the switch picks what a tap does.
  const THRUST_NAME = ['Ganze Front', 'Abschnitt', 'Keil', 'Richtung'];
  const finePointer = function () { return !!(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches); };
  function dragWidth() { return cfg.thrust === 1 ? 1 : cfg.thrust === 3 && game && game.punkt ? 3 : 2; }
  function setThrust(w) {
    cfg.thrust = within(w | 0, 0, 3); if (cfg.thrust === 3 && !(game && game.punkt)) cfg.thrust = 2; saveCfg();
    const fine = finePointer(), on = fine ? dragWidth() : cfg.thrust;
    document.querySelectorAll('#modes button').forEach(function (b) { const k = +b.dataset.w; b.classList.toggle('on', k === on); b.setAttribute('aria-pressed', k === on ? 'true' : 'false'); });
    planKey = ''; planInfo = null; if (view) view.plan = null;
  }
  // The preview of a thrust: its way as an arrow, with a band as wide as the lane, coloured by
  // whether the troops set on the slider will get there. With a mouse it follows a drag with the
  // right button (`rdrag`: where it began, where it is now).
  let planKey = '', planAt = 0, planInfo = null, rdrag = null, rdragEnd = 0, rdragDrew = false;
  function updatePlan(now) {
    const h = game && game.human;
    let tile = -1, start = -1, mode = 0;
    if (h && h.alive && game.phase === 'play' && !netOn && !aim && !ghost && $('modal').hidden && rdrag && rdrag.started) {
      tile = view.tileAt(rdrag.x, rdrag.y); start = rdrag.tile; mode = dragWidth();
    }
    const a = tile >= 0 && game.map.land[tile] && game.owner[tile] !== h.id ? game.actionsAt(h, tile) : null;
    if (!a || !a.canAttack) {
      // an island of theirs that we do not border: letting go there sends a boat
      if (a && a.boat && rdrag && rdrag.started) {
        if (!planInfo || !planInfo.boat) { view.plan = null; planInfo = { why: 'Insel: Loslassen schickt ein Boot', boat: true }; planKey = ''; showCommit(); }
        return;
      }
      if (planInfo || view.plan) { view.plan = null; planInfo = rdrag && rdrag.started ? { why: tile >= 0 && game.owner[tile] === h.id ? 'Ziehe ins Land eines Gegners' : (a && a.why) || 'Hier nicht möglich' } : null; planKey = ''; showCommit(); }
      return;
    }
    const key = tile + ':' + start + ':' + mode + ':' + Math.round(ratio * 100);
    if ((key === planKey && now - planAt < 1500) || now - planAt < 70) return;
    planKey = key; planAt = now;
    const width = game.thrustWidth(mode);
    if (mode === 3) {
      const dir = game.dirFrom(h, tile);
      if (!dir) { view.plan = null; planInfo = { why: 'Zu weit von deiner Grenze' }; showCommit(); return; }
      if (game.thrustCount(h) + (game.pfeile ? plans.length : 0) >= G.THRUST.max) { view.plan = null; planInfo = { why: 'Höchstens ' + G.THRUST.max + ' Stösse gleichzeitig' }; showCommit(); return; }
      const troops = h.troops * ratio / (game.pfeile ? plans.length + 1 : 1);
      view.plan = { band: dir, troops: troops, col: 'rgb(244,183,64)', label: 'Richtung · ' + fmtT(troops) };
      planInfo = { mode: 3, verdict: 1, text: 'nur dieser Teil der Front', ci: null, band: dir, tid: a.tid, width: 0 };
      showCommit(); return;
    }
    if (game.pfeile && game.thrustCount(h) + plans.length >= G.THRUST.max) { view.plan = null; planInfo = { why: 'Höchstens ' + G.THRUST.max + ' Pfeile gleichzeitig' }; showCommit(); return; }
    if (game.thrustCount(h) >= G.THRUST.max && !h.out.some(function (o) { return o.active && o.goal >= 0 && o.tid === a.tid && o.width === width && Math.hypot(o.goal % game.W - tile % game.W, ((o.goal / game.W) | 0) - ((tile / game.W) | 0)) <= width; })) {
      view.plan = null; planInfo = { why: 'Höchstens ' + G.THRUST.max + ' Stösse gleichzeitig' }; showCommit(); return;
    }
    const r = game.thrustRoute(h, a.tid, tile, width, start);
    if (!r) { view.plan = null; planInfo = { why: 'Kein Weg dorthin' }; showCommit(); return; }
    const troops = h.troops * ratio / (game.pfeile ? plans.length + 1 : 1), est = game.thrustEstimate(h, r, troops);
    // green: arrives with a quarter or more to spare; yellow: arrives, or very nearly; red: stops short
    const verdict = est.reach >= 1 && est.left >= troops * 0.25 ? 0 : est.reach >= 0.9 ? 1 : 2;
    const verdictText = ['reicht bis zum Ziel', 'knapp', (est.stalled ? 'Schwung reicht etwa ' : 'reicht etwa ') + Math.max(5, Math.round(est.reach * 20) * 5) + ' % des Wegs'][verdict];
    view.plan = { path: r.path, width: width, troops: troops, col: ['rgb(99,211,145)', 'rgb(244,183,64)', 'rgb(255,107,94)'][verdict], label: THRUST_NAME[mode] + ' · ' + fmtT(troops) + (est.mom > 0 ? ' · Schwung ' + Math.round(est.mom * 100) + ' %' : '') + ' · ' + verdictText };
    planInfo = { mode: mode, verdict: verdict, text: verdictText, ci: null, path: r.path, tid: a.tid, width: width };
    showCommit();
  }
  // The card for a thrust under way: reinforce it with the share on the slider, or call it back.
  let cardId = -1;
  function openThrustCard(id, sx, sy) {
    const at = game.human.out.find(function (o) { return o.active && o.id === id; });
    if (!at) return;
    cardId = id;
    const el = $('thrustCard');
    el.innerHTML = '<b>' + THRUST_NAME[at.spot >= 0 ? 3 : at.width === game.thrustWidth(1) ? 1 : 2] + ' · ' + fmtT(at.troops + (at.want || 0)) + (at.mom !== undefined ? ' · Schwung ' + Math.max(0, Math.round(at.mom * 100)) + ' %' : '') + '</b>' +
      '<button type="button" data-act="feed">' + svg('up', 14) + 'Verstärken +' + fmtT(game.human.troops * ratio) + '</button>' +
      '<button type="button" data-act="ret" class="ghost">' + svg('close', 13) + 'Zurückziehen</button>';
    el.hidden = false;
    const r = $('cv').getBoundingClientRect(), w = el.offsetWidth, hh = el.offsetHeight;
    el.style.left = within(sx + 12, 6, r.width - w - 6) + 'px'; el.style.top = within(sy - hh / 2, 6, r.height - hh - 6) + 'px';
  }
  function closeThrustCard() { cardId = -1; const el = $('thrustCard'); if (el) el.hidden = true; }
  function commitText(tile) {
    const h = game.human;
    if (tile < 0 || game.owner[tile] === h.id || !game.map.land[tile]) return '';
    if (planInfo) {
      if (planInfo.why) return planInfo.why;
      let t = THRUST_NAME[planInfo.mode] + ' · ' + planInfo.text;
      const i = planInfo.ci;
      if (i && i.later >= 1) t += ' · ' + fmtT(i.now) + ' sofort, ' + fmtT(i.later) + ' unterwegs (ca. ' + Math.max(1, Math.round(i.eta)) + ' s)';
      return t;
    }
    // the whole front: a warning when what goes against the other (this click and what already
    // runs against him) is small against his whole army; then every tile costs up to twice as much
    // (OpenFront: within(army / attack, 0.6, 2), tileLoss)
    const o = game.owner[tile], q = o ? game.players[o] : null;
    if (q && q.alive && q.type !== PT.BOT && !game.friendly(h, q)) {
      let sent = h.troops * ratio;
      for (const a of h.out) if (a.active && a.tid === q.id) sent += a.troops;
      const k = q.troops / Math.max(1, sent);
      if (k > 1.2) return 'Ganze Front · ' + fmtT(sent) + ' gegen ' + fmtT(q.troops) + ': jedes Feld kostet ' + (k >= 2 ? 'doppelt' : 'deutlich mehr') + ', schicke mehr';
      if (k > 0.8) return 'Ganze Front · ' + fmtT(sent) + ' gegen ' + fmtT(q.troops) + ': ausgeglichen, teuer';
    }
    return '';
  }
  function showCommit() {
    const el = $('commit');
    if (!el) return;
    const tile = rdrag && rdrag.started ? view.tileAt(rdrag.x, rdrag.y) : hoverX >= 0 ? view.tileAt(hoverX, hoverY) : lastTile;
    const s = netOn || aim ? '' : commitText(tile);
    if (el.textContent !== s) el.textContent = s;
  }
  // The mouse over another realm: a strip at the top says who it is and what it has.
  const PEEK = [[UT.CITY, 'city'], [UT.PORT, 'port'], [UT.FACTORY, 'factory'], [UT.DEFENSE, 'defense'], [UT.SAM, 'sam'], [UT.SILO, 'silo'], [UT.WARSHIP, 'warship']];
  function showPeek() {
    const el = $('peek');
    if (!el) return;
    let q = null;
    const h = game.human;
    if (hoverX >= 0 && game.phase === 'play' && $('modal').hidden && !netOn) {
      const t = view.tileAt(hoverX, hoverY), o = t >= 0 ? game.owner[t] : 0;
      if (o && o !== h.id && game.players[o].alive) q = game.players[o];
    }
    if (!q) { if (!el.hidden) { el.hidden = true; el.dataset.id = ''; } return; }
    const den = Math.max(1, game.map.landTiles - game.falloutCount), tile = view.tileAt(hoverX, hoverY);
    let tag = q.type === PT.BOT ? 'Bot' : q.type === PT.NATION ? 'Nation' : 'Mitspieler', cls = '';
    if (h.allies.has(q.id)) { tag = 'Verbündet'; cls = 'good'; }
    else if (h.out.some(function (a) { return a.active && a.tid === q.id; }) || h.inc.some(function (a) { return a.active && a.a === q; })) { tag = 'Im Krieg'; cls = 'bad'; }
    let s = '<div class="pkTop"><i style="background:' + q.css + '"></i><b>' + (q.flag ? G.flagOf(q.flag) + ' ' : '') + esc(q.name) + '</b><em class="' + cls + '">' + tag + '</em></div>' +
      '<div class="pkNum"><span>' + svg('troops', 14) + fmtT(q.troops) + '</span><span class="gold">' + svg('gold', 14) + fmt(q.gold) + '</span><span>' + (q.tiles / den * 100).toFixed(1) + '% Land</span></div><div class="pkHas">';
    let any = false;
    for (const e of PEEK) { const n = seen(q, e[0]); if (n > 0) { any = true; s += '<span title="' + G.UNAME[e[0]].replace('\u00AD', '') + '">' + svg(e[1], 15) + n + '</span>'; } }
    if (!any) s += '<span class="none">keine Gebäude</span>';
    s += '</div>';
    // the spot under the pointer: what the ground does to an attack, and how dense the troops stand
    // there (the net, drawn darker on the map)
    let here = 'Hier: ' + groundName(tile);
    const cell = q.post && game.CW ? q.post.cells.get(game.cellOf(tile)) : null, dk = cell && cell.n > 0 ? game.postDensSeen(q, cell) : 1;
    if (dk >= 1.15) here += ' · Truppen ' + (Math.round(Math.min(dk, G.COMBAT.densMax) * 10) / 10).toLocaleString('de-CH') + '× so dicht: langsamer, dort fallen auch mehr';
    s += '<div class="pkHere">' + esc(here) + '</div>';
    if (el.dataset.html !== s) { el.innerHTML = s; el.dataset.html = s; }
    el.hidden = false;
  }

  // ---------- version «Rohstoffe»: the card of a country, the income sheet ----------
  let landC = 0;
  const perSec = function (v) { return '+' + fmt(v * 10) + '/s'; };
  function setLand(tile) {
    const k = game && game.res && tile >= 0 && game.map.land[tile] ? G.countryAt(game.map, tile) : null;
    landC = k ? k.id : 0;
    view.resSel = landC;
    renderLand();
  }
  function resSvg(id, size) {
    return '<svg viewBox="0 0 24 24" width="' + size + '" height="' + size + '" aria-hidden="true">' + G.RES_ICON[id].map(function (l) {
      return '<path d="' + l[1] + '" fill="' + l[0] + '" stroke="rgba(10,16,24,.55)" stroke-width="1" stroke-linejoin="round" paint-order="stroke"/>';
    }).join('') + '</svg>';
  }
  function renderLand() {
    const el = $('land');
    if (!el) return;
    if (!game || !game.res || !landC) { if (!el.hidden) { el.hidden = true; el.dataset.html = ''; } return; }
    const k = game.map.countries[landC], h = game.human, ps = game.players, R = G.RES;
    // who holds how much of it
    const owners = [];
    let taken = 0;
    for (let i = 1; i < ps.length; i++) { const p = ps[i], n = p.alive && p.own ? p.own[landC] : 0; if (n > 0) { owners.push([n, p]); taken += n; } }
    owners.sort(function (a, b) { return b[0] - a[0] || a[1].id - b[1].id; });
    const pct = function (n) { const v = n / Math.max(1, k.tiles) * 100; return (v > 0 && v < 1 ? '<1' : Math.round(v)) + ' %'; };
    let s = '<div class="ldTop"><b>' + (k.iso ? G.flagOf(k.iso) + ' ' : '') + esc(k.name) + '</b><button id="landX" class="ldX" type="button" aria-label="Schliessen">×</button></div>';
    if (!owners.length) s += '<p class="ldFree">Noch frei</p>';
    else {
      s += '<div class="ldOwn">' + owners.slice(0, 2).map(function (o) {
        return '<span><i style="background:' + o[1].css + '"></i>' + (o[1] === h ? 'Du' : esc(o[1].name)) + ' ' + pct(o[0]) + '</span>';
      }).join('') + (owners.length > 2 ? '<span class="free">+' + (owners.length - 2) + ' weitere</span>' : taken < k.tiles * 0.995 ? '<span class="free">frei ' + pct(k.tiles - taken) + '</span>' : '') + '</div>';
    }
    s += '<div class="ldSec">Abbauen und ernten <small>erst die Anlage bringt Gold</small></div>';
    for (const i of k.deps) {
      const d = game.map.deposits[i], g = G.RAW[d.raw], o = game.owner[d.t], q = o ? ps[o] : null, dk = G.digOf(d.raw);
      const dl = game.dg ? game.dg.lv[i] : 0, ready = dl > 0 && game.ticks >= game.dg.at[i], mine = q === h && h.alive;
      const plant = dl ? dk[0] + (ready ? ' Stufe ' + dl : ' im Bau') : 'ohne ' + dk[0];   // short: the card is narrow on a phone
      const sub = !q ? 'frei' : (mine ? (dl ? '' : 'dein · ') : esc(q.name) + ' · ') + plant;
      s += '<button class="ldRow" type="button" data-dep="' + i + '">' + resSvg(d.raw, 22) + '<b>' + g[0] + '<small' + (mine ? ' class="good"' : '') + '>' + sub + '</small></b>' +
        (ready ? '<em>' + perSec(game.digGold(i)) + '</em>' : '<em class="pot">' + perSec(d.gold) + '</em>') + '</button>';
      if (mine && (!dl || ready) && dl < R.DIG_CAP) {      // build the plant, or make it one level better
        const c = game.digCheck(h, i);
        s += '<button class="ldDig' + (h.gold < c.cost ? ' poor' : '') + '" type="button" data-dig="' + i + '">' +
          '<span>' + (dl ? 'Auf Stufe ' + (dl + 1) + ' ausbauen' : dk[0] + ' bauen') + '<small>' + dk[1] + ' ' + perSec(dl ? Math.floor(d.gold / 2) : d.gold) + '</small></span><i>' + fmt(c.cost) + '</i></button>';
      }
    }
    const w = G.WARE[k.ware], lv = h.alive && h.fac ? h.fac[landC] : 0;
    s += '<div class="ldSec">Herstellen <small>jede Fabrik im Land</small></div><div class="ldRow">' + resSvg('fabrik', 22) + '<b>' + w[0] +
      '<small' + (lv ? ' class="good"' : '') + '>' + (lv ? 'deine Stufen: ' + Math.min(lv, R.FACTORY_CAP) + ' von ' + R.FACTORY_CAP : 'pro Fabrikstufe (max. ' + R.FACTORY_CAP + ')') + '</small></b><em>' + perSec(w[1]) + '</em></div>';
    if (el.dataset.html !== s) { el.innerHTML = s; el.dataset.html = s; }
    el.hidden = false;
  }
  // ---------- the table «Rohstoffe» ----------
  // Everything the player holds at a glance: per raw material the deposits, their plants and what
  // they bring, per country the factory goods; each line can be levelled up right there with the
  // commands the country card uses (`dig` for a plant, `up` for a factory). Replaces the old
  // «Einnahmen» window. Opened from the gold or the button in the bar; it stays live while open.
  function showRes() {
    $('modalCard').classList.add('resCard');
    openModal(resHtml(), 'res');
  }
  // The weakest built factory of the player in country c, or null.
  function facIn(h, c) {
    let best = null;
    for (const u of h.units) {
      if (u.type !== UT.FACTORY || !u.built || !u.active || game.map.ctile[u.tile] !== c) continue;
      if (!best || u.level < best.level) best = u;
    }
    return best;
  }
  const resFold = new Map();   // raw material -> list folded open (true) or shut (false); unset: open up to 3 deposits
  function resHtml() {
    const h = game.human, cs = game.map.countries, deps = game.map.deposits, R = G.RES, dg = game.dg;
    const groups = new Map();
    for (let i = 0; i < deps.length; i++) {
      if (game.owner[deps[i].t] !== h.id) continue;
      const d = deps[i];
      let gr = groups.get(d.raw);
      if (!gr) { gr = { raw: d.raw, rows: [], now: 0, built: 0 }; groups.set(d.raw, gr); }
      const lv = dg ? dg.lv[i] : 0, ready = lv > 0 && game.ticks >= dg.at[i], v = game.digGold(i);
      gr.rows.push({ i: i, d: d, lv: lv, ready: ready, v: v });
      gr.now += v; if (lv) gr.built++;
    }
    const list = Array.from(groups.values());
    for (const gr of list) gr.rows.sort(function (a, b) { return b.v - a.v || b.d.gold - a.d.gold || a.i - b.i; });
    list.sort(function (a, b) { return b.now - a.now || b.rows.length - a.rows.length || (a.raw < b.raw ? -1 : 1); });
    const raw = h.resRaw | 0, ware = h.resWare | 0;
    let s = '<h2>Rohstoffe</h2><div class="rtSum">' +
      '<div><small>Grundeinkommen</small><b>' + perSec(100) + '</b></div>' +
      '<div><small>Rohstoffe</small><b>' + perSec(raw) + '</b></div>' +
      '<div><small>Fabrikwaren</small><b>' + perSec(ware) + '</b></div>' +
      '<div class="all"><small>Zusammen</small><b>' + perSec(100 + raw + ware) + '</b></div></div>';
    // everything one level up at once: what it costs and how many plants the gold reaches
    const sumUp = function (rw) {
      let cost = 0, n = 0, all = 0;
      for (const e of game.digAllList(h, rw)) { all++; if (cost + e[0] <= h.gold || game.opts.infiniteGold) { cost += e[0]; n++; } }
      return { cost: cost, n: n, all: all };
    };
    const tot = sumUp('');
    if (tot.all) s += '<button class="btn rtAll" type="button" data-digall=""' + (tot.n ? '' : ' disabled') + '>Alles eine Stufe höher · ' + tot.n + ' von ' + tot.all + ' Anlagen · ' + fmt(tot.cost) + '</button>';
    s += '<div class="rtSec">Abbauen und ernten <small>Stufe 1 voller Ertrag, jede weitere die Hälfte dazu. Antippen klappt die Liste auf.</small></div>';
    if (!list.length) s += '<p class="rtEmpty">Noch kein Vorkommen. Erobere Land mit einem Vorkommen, dann steht es hier.</p>';
    for (const gr of list) {
      const g = G.RAW[gr.raw], dk = G.digOf(gr.raw), n = gr.rows.length;
      let lvs = 0; for (const r of gr.rows) lvs += r.lv;
      const su = sumUp(gr.raw), open = resFold.has(gr.raw) ? resFold.get(gr.raw) : n <= 3;
      s += '<div class="rtGrp"><div class="rtHead"><button type="button" class="rtFold" data-fold="' + gr.raw + '">' + resSvg(gr.raw, 22) + '<b>' + g[0] + '<small>' + n + ' Vorkommen · ' + gr.built + ' mit ' + dk[0] + (gr.built ? ' · Ø Stufe ' + (lvs / gr.built).toFixed(1) : '') + ' ' + (open ? '▴' : '▾') + '</small></b><em>' + (gr.now ? perSec(gr.now) : '–') + '</em></button>' +
        (su.all ? '<button class="rtBtn' + (su.n ? '' : ' poor') + '" type="button" data-digall="' + gr.raw + '">Alle +1 · ' + su.n + '/' + su.all + '<small>' + fmt(su.cost) + '</small></button>' : '<span class="rtBtn done">Alle voll</span>') + '</div>';
      if (open) for (const r of gr.rows) {
        const state = !r.lv ? '<small>ohne ' + dk[0] + '</small>' : !r.ready ? '<small>' + dk[0] + ' im Bau</small>' : '<small class="good">' + dk[0] + ' Stufe ' + r.lv + ' von ' + R.DIG_CAP + '</small>';
        s += '<div class="rtRow"><button class="rtWhere" type="button" data-go="' + r.i + '">' + esc(cs[r.d.c].name) + (r.v ? ' <i>' + perSec(r.v) + '</i>' : '') + state + '</button>';
        if (r.lv >= R.DIG_CAP) s += '<span class="rtBtn done">Höchste Stufe</span>';
        else if (r.lv && !r.ready) s += '<span class="rtBtn done">wird gebaut</span>';
        else {
          const c = game.digCheck(h, r.i), more = r.lv ? Math.floor(r.d.gold / 2) : r.d.gold;
          s += '<button class="rtBtn' + (h.gold < c.cost ? ' poor' : '') + '" type="button" data-dig="' + r.i + '">' + (r.lv ? 'Stufe ' + (r.lv + 1) : dk[0] + ' bauen') + ' · ' + perSec(more) + '<small>' + fmt(c.cost) + '</small></button>';
        }
        s += '</div>';
      }
      s += '</div>';
    }
    // factory goods: one line per country with an own factory
    const facs = [];
    if (h.fac) for (let c = 1; c < cs.length; c++) if (h.fac[c] > 0) facs.push([game.wareOf(c, h.fac[c]), c]);
    facs.sort(function (a, b) { return b[0] - a[0] || a[1] - b[1]; });
    s += '<div class="rtSec">Herstellen <small>pro Land zählen ' + R.FACTORY_CAP + ' Fabrikstufen</small></div>';
    {
      let fc = 0, fn = 0, fall = 0;
      const one = game.cost(h, UT.FACTORY);
      for (const f of facs) { const u = facIn(h, f[1]); if (u && h.fac[f[1]] < R.FACTORY_CAP) { fall++; if (fc + one <= h.gold || game.opts.infiniteGold) { fc += one; fn++; } } }
      if (fall > 1) s += '<button class="btn rtAll" type="button" data-facall="1"' + (fn ? '' : ' disabled') + '>Alle Fabriken eine Stufe höher · ' + fn + ' von ' + fall + ' · ' + fmt(fc) + '</button>';
    }
    if (!facs.length) s += '<p class="rtEmpty">Noch keine Fabrik. Jede Fabrik stellt die Ware des Landes her, in dem sie steht.</p>';
    for (const f of facs) {
      const c = f[1], k = cs[c], w = G.WARE[k.ware], lv = h.fac[c], u = facIn(h, c);
      s += '<div class="rtGrp"><div class="rtRow" style="padding-left:0"><button class="rtWhere" type="button" data-fgo="' + (u ? u.tile : -1) + '">' +
        '<span style="display:flex;align-items:center;gap:9px">' + resSvg('fabrik', 22) + '<span>' + w[0] + ' <i>' + perSec(f[0]) + '</i>' +
        '<small' + (lv ? ' class="good"' : '') + '>' + esc(k.name) + ' · Stufe ' + Math.min(lv, R.FACTORY_CAP) + ' von ' + R.FACTORY_CAP + '</small></span></span></button>';
      if (lv >= R.FACTORY_CAP || !u) s += '<span class="rtBtn done">' + (lv >= R.FACTORY_CAP ? 'Voll' : '') + '</span>';
      else {
        const cost = game.cost(h, UT.FACTORY);
        s += '<button class="rtBtn' + (h.gold < cost ? ' poor' : '') + '" type="button" data-fup="' + u.tile + '">Stufe ' + (Math.min(lv, R.FACTORY_CAP) + 1) + ' · ' + perSec(w[1]) + '<small>' + fmt(cost) + '</small></button>';
      }
      s += '</div></div>';
    }
    s += '<button class="btn" data-act="resume" type="button">Weiterspielen</button>';
    return s;
  }
  function renderRes() {
    const card = $('modalCard'), html = resHtml();
    if (card.dataset.html === html) return;
    const top = card.scrollTop;
    card.innerHTML = html; card.dataset.html = html; card.scrollTop = top;
  }
  // One line under the bar: what railways and sea trade have brought in the last minute, and how
  // many stations the own network ties together. Hidden as long as there is neither.
  function showIncome() {
    const h = game.human, T = game.ticks, el = $('incLine');
    if (!el) return;
    incLog.push([T, h.trainTotal || 0, h.shipTotal || 0]);
    while (incLog.length > 1 && T - incLog[1][0] >= 600) incLog.shift();
    const a = incLog[0], span = Math.max(50, T - a[0]), k = 600 / span;
    const tr = ((h.trainTotal || 0) - a[1]) * k, sh = ((h.shipTotal || 0) - a[2]) * k;
    let st = 0;
    if (game.railAdj) for (const u of h.units) if (u.built && G.isStation(u.type) && game.railAdj.has(u.id)) st++;
    let s = '';
    if (st || tr > 0) s += '<span>' + svg('factory', 13) + (st ? st + ' Stationen · ' : '') + '+' + fmt(Math.round(tr)) + '/min</span>';
    if (sh > 0) s += '<span>' + svg('port', 13) + '+' + fmt(Math.round(sh)) + '/min</span>';
    if (el.dataset.html !== s) { el.innerHTML = s; el.dataset.html = s; el.hidden = !s; }
  }
  // ---------- version «Pfeile» ----------
  // Arrows are planned with the right button (on a touch screen: a tap with Keil or Abschnitt),
  // drawn pale and numbered, and launched together with «Angreifen» or Enter. The share on the
  // slider is split evenly among them. A click on a planned arrow takes it away again.
  function addPlan(tile, w, s, info) {
    const h = game.human;
    if (game.thrustCount(h) + plans.length >= G.THRUST.max) { toast('Höchstens ' + G.THRUST.max + ' Pfeile gleichzeitig'); snd('deny'); return; }
    plans.push({ tile: tile, w: w, s: s, path: info && info.path, width: info ? info.width : game.thrustWidth(w), tid: info ? info.tid : game.owner[tile], troops: 0, band: info && info.band ? info.band : null });
    syncPlans(); snd('tap');
  }
  function planTap(tile) {
    const h = game.human, a = game.actionsAt(h, tile);
    if (!a.canAttack && a.boat) { strikeAt(tile, { sea: 1, say: 'Boot läuft aus' }); return; }   // an island of theirs: by boat
    if (!a.canAttack) { toast(a.why || 'Hier nicht möglich'); snd('deny'); return; }
    if (cfg.thrust === 3) {
      const dir = game.dirFrom(h, tile);
      if (!dir) { toast('Zu weit von deiner Grenze'); snd('deny'); return; }
      addPlan(tile, 3, -1, { band: dir, tid: a.tid, width: 0 });
      return;
    }
    const width = game.thrustWidth(cfg.thrust), r = game.thrustRoute(h, a.tid, tile, width, -1);
    if (!r) { toast('Kein Weg dorthin'); snd('deny'); return; }
    addPlan(tile, cfg.thrust, -1, { path: r.path, width: width, tid: a.tid });
  }
  function syncPlans() {
    if (view) view.plans = plans;
    const b = $('bGo');
    if (!b) return;
    const h = game && game.human, n = plans.length;
    for (const q of plans) q.troops = h ? h.troops * ratio / Math.max(1, n) : 0;
    b.hidden = !n;
    if (n) b.textContent = 'Angreifen · ' + n + (n === 1 ? ' Pfeil · ' : ' Pfeile · ') + fmtT(h.troops * ratio);
  }
  function launchPlans() {
    const n = plans.length;
    if (!n || !game || game.phase !== 'play' || !game.human.alive) return;
    const list = plans.slice();
    plans.length = 0;
    // each order takes its share of what is left: r_i = (ratio/n) / (1 - ratio*i/n), so all get the same
    for (let i = 0; i < n; i++) {
      const q = list[i], r = within(ratio / n / (1 - ratio * i / n), 0.01, 1);
      act({ k: 'strike', t: q.tile, r: r, w: q.w, s: q.s });
    }
    syncPlans();
    toast(n === 1 ? 'Angriff!' : n + ' Pfeile greifen an');
  }
  function strikeAt(tile, extra) {
    const c = { k: 'strike', t: tile, r: ratio };
    if (extra) for (const k in extra) c[k] = extra[k];
    if (c.sea) delete c.w;
    lastTile = tile;
    if (!c.sea && !c.say && c.w && planInfo && !planInfo.why) { const s = commitText(tile); if (s.indexOf('unterwegs') >= 0) c.say = s; }
    act(c);
  }
  function netOk() { return !!game && game.phase === 'play' && game.human.alive && !!game.human.post && !!game.netz; }
  // q: a quick brush from the buttons (no panel, the control panel stays); without it the full mode
  function setNet(on, q) {
    on = !!on && netOk();
    const wasQuick = !!quick && quick.src === 'btn';
    if (on && q) { quick = q; setBrush(q.less); }
    else if (!on || wasQuick) { if (quick && quick.src === 'btn') quick = null; }
    syncBrushBtns();
    if (on === netOn && (!on || !q === !wasQuick)) return;
    if (on !== netOn) { netOn = on; view.net.on = on; view.net.dirty = true; view.net.brush = null; endStroke(false); }
    $('bNet').setAttribute('aria-pressed', on && !q ? 'true' : 'false');
    $('netBar').hidden = !on || !!q;
    if (q) { if (game && game.phase === 'play' && !aim) $('ctrl').hidden = false; stopAim(); setGhost(null); closeRadial(); return; }
    $('netHint').textContent = window.matchMedia && window.matchMedia('(pointer: coarse)').matches
      ? 'Mit einem Finger über dein Land ziehen. Zwei Finger verschieben die Karte.'
      : 'Mit gedrückter Maustaste über dein Land ziehen. Umschalt + ziehen verschiebt die Karte.';
    if (on) { stopAim(); setGhost(null); closeRadial(); $('ctrl').hidden = true; }
    else if (game && game.phase === 'play' && !aim) $('ctrl').hidden = false;
  }
  function setBrush(less) {
    netLess = less;
    $('netMore').classList.toggle('on', !less); $('netLess').classList.toggle('on', less);
  }
  // «?» top right: every shortcut except the build and weapon keys (those stand on the bar below),
  // and while it is open each button with a key shows it
  function keysHtml() {
    const K = function (s) { return s.split(' ').map(function (k) { return '<kbd>' + k + '</kbd>'; }).join(''); };
    const row = function (keys, what) { return '<div class="kr"><span>' + keys + '</span><span>' + what + '</span></div>'; };
    const net = game && game.netz, pf = game && game.pfeile;
    let h = '<h4>Angreifen</h4>' +
      row('Klick', 'Angreifen (ganze Front)') + row(K('G'), 'Angreifen unter der Maus') + row(K('B'), 'Boot losschicken') +
      row('Rechts ziehen', 'Stoss vom Start zum Ziel') + row(K('F'), 'Keil oder Abschnitt') +
      row(K('T') + ' ' + K('Y'), 'Truppenanteil −/+ 10 %') + row(K('Shift') + ' Rad', 'Truppenanteil') +
      (pf ? row(K('Enter'), 'Geplante Pfeile losschicken') + row(K('⌫'), 'Letzten Pfeil entfernen') : '');
    if (net) h += '<h4>Aufstellung</h4>' + row(K('V') + ' halten', 'Verdichten, wo die Maus ist') + row(K('Shift') + K('V'), 'halten: ausdünnen') +
      row('+ / −', 'Rechts am Rand: einmal ziehen, lange drücken bleibt an') + row('2× tippen', 'und halten: verdichten') + row(K('N'), 'Aufstellung mit allem');
    h += '<h4>Bauen</h4>' + row(K('U'), 'Gebäude unter der Maus ausbauen') + row(K('Shift') + K('1') + '–' + K('6'), 'Nächstes dieser Art ausbauen') + row(K('Strg') + ' Klick', 'Baumenü') +
      '<h4>Mitspieler</h4>' + row(K('K'), 'Allianz anfragen') + row(K('L'), 'Allianz brechen') + row(K('I'), 'Spieler-Info') +
      '<h4>Karte und Spiel</h4>' + row(K('Q') + K('E'), 'Zoom −/+') + row(K('W') + K('A') + K('S') + K('D'), 'Karte schieben') + row(K('C'), 'Zum eigenen Gebiet') +
      (game && game.res ? row(K('R'), 'Vorkommen ein/aus') : '') +
      row(K('P'), 'Pause (auch Leertaste)') + row(K(',') + K('.'), 'Tempo −/+') + row(K('O'), 'Ton an/aus') + row(K('Esc'), 'Schliessen') + row(K('?'), 'Diese Liste');
    return h;
  }
  function showKeys(on) {
    on = on === undefined ? $('keysPanel').hidden : !!on;
    if (on) $('keysPanel').innerHTML = keysHtml();
    $('keysPanel').hidden = !on;
    $('bKeys').setAttribute('aria-pressed', on ? 'true' : 'false');
    document.body.classList.toggle('showKeys', on);
  }
  function syncBrushBtns() {
    const b = quick && quick.src === 'btn' ? quick : null;
    $('brMore').setAttribute('aria-pressed', b && !b.less ? 'true' : 'false');
    $('brLess').setAttribute('aria-pressed', b && b.less ? 'true' : 'false');
    $('brMore').classList.toggle('sticky', !!b && !b.less && b.sticky);
    $('brLess').classList.toggle('sticky', !!b && b.less && b.sticky);
  }
  // a tap on + or -: arms one stroke (the same button again puts it away); held long: stays on
  function brushBtn(less, long) {
    if (!netOk()) return;
    if (!long && quick && quick.src === 'btn' && quick.less === less) { setNet(false); return; }
    setNet(true, { src: 'btn', less: less, sticky: !!long });
    toast(long ? (less ? 'Ausdünnen bleibt an' : 'Verdichten bleibt an') + ', nochmals tippen zum Beenden' : (less ? 'Ausdünnen' : 'Verdichten') + ': einmal über dein Land ziehen');
  }
  // the key V (Shift: thin out): while it is held, the brush paints wherever the mouse goes
  function keyBrush(on, less) {
    if (on) {
      if (stroke || netOn || !netOk() || aim) return;
      quick = { src: 'key', less: less };
      view.net.on = true; view.net.dirty = true; setGhost(null); closeRadial();
      stroke = { t0: performance.now(), started: true, touch: false, r: 38, sx: -1e9, sy: -1e9, orig: new Map(), less: less, key: true };
      netTimer = setInterval(flushNet, 200);
      if (hoverX >= 0) { stamp(hoverX, hoverY); view.net.brush = { x: hoverX, y: hoverY, r: 38, less: less }; }
    } else if (quick && quick.src === 'key') {
      quick = null;
      endStroke(true);
      view.net.on = netOn; view.net.dirty = true;
    }
  }
  function flushNet() {
    if (!netQueue.size || !game) return;
    let ids = [], vals = [];
    for (const e of netQueue) {
      ids.push(e[0]); vals.push(Math.round(e[1] * 1000) / 1000);
      if (ids.length >= 400) { act({ k: 'mesh', c: ids, v: vals }); ids = []; vals = []; }
    }
    if (ids.length) act({ k: 'mesh', c: ids, v: vals });
    netQueue.clear();
  }
  // One dab of the brush at a point of the screen: the cells under it are weighed up (or down),
  // strongest in the middle. The brush has a fixed size on the screen, so zoomed out it is coarse.
  function stamp(sx, sy) {
    const h = game.human, post = h.post, CS = G.POST.cell, c = view.cam, now = performance.now();
    const wx = (sx - view.cw / 2) / c.z + c.x, wy = (sy - view.ch / 2) / c.z + c.y, R = stroke.r / c.z;
    const cx0 = Math.max(0, Math.floor((wx - R) / CS)), cx1 = Math.min(game.CW - 1, Math.floor((wx + R) / CS));
    const cy0 = Math.max(0, Math.floor((wy - R) / CS)), cy1 = Math.min(game.CH - 1, Math.floor((wy + R) / CS));
    const reach = R + CS * 0.5;
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const id = cy * game.CW + cx, cell = post.cells.get(id);
        if (!cell) continue;
        const dx = (cx + 0.5) * CS - wx, dy = (cy + 0.5) * CS - wy, d = Math.sqrt(dx * dx + dy * dy);
        const inside = wx >= cx * CS && wx < cx * CS + CS && wy >= cy * CS && wy < cy * CS + CS;
        let f = 1 - d / reach;
        if (inside && f < 0.6) f = 0.6;
        if (f <= 0) continue;
        const e = view.net.edit.get(id), cur = e ? e.m : cell.m;
        if (!stroke.orig.has(id)) stroke.orig.set(id, cur);
        const k = 1 + 0.2 * f, m = within(stroke.less ? cur / k : cur * k, G.POST.mMin, G.POST.mMax);
        view.net.edit.set(id, { m: m, at: now });
        netQueue.set(id, m);
      }
    }
    view.net.dirty = true;
    stroke.sx = sx; stroke.sy = sy;
  }
  function endStroke(keep) {
    if (!stroke) return;
    if (!keep && stroke.started) {
      // a second finger came down: this was a pinch, not a stroke. Put everything back.
      const now = performance.now();
      for (const e of stroke.orig) { view.net.edit.set(e[0], { m: e[1], at: now }); netQueue.set(e[0], e[1]); }
      view.net.dirty = true;
    }
    const done = keep && stroke.started, tapped = stroke.tap;
    stroke = null; view.net.brush = null;
    clearInterval(netTimer); netTimer = 0;
    flushNet();
    // a quick brush ends with the stroke: lifting the finger is «Fertig»
    if (tapped) { view.net.on = netOn; view.net.dirty = true; if (quick && quick.src === 'tap') quick = null; }
    else if (done && quick && quick.src === 'btn' && !quick.sticky) setNet(false);
  }

  // Warships by hand: a click on one of your own picks it (a white ring); then a click on water
  // sends that ship there, a click on one of your own ports calls it home, where it is laid up
  // (and costs no upkeep) until it is sent out again. Anything else lets go of it.
  function shipNear(sx, sy) {
    const h = game.human, z = view.cam.z;
    let best = null, bd = Math.max(14, z * 3) * Math.max(14, z * 3);
    for (const u of h.units) {
      if (u.type !== UT.WARSHIP || !u.active || u.vx === undefined) continue;
      const p = view.screenOf(u.tile), x = (u.vx + 0.5 - (u.tile % game.W) - 0.5) * z + p.x, y = (u.vy + 0.5 - ((u.tile / game.W) | 0) - 0.5) * z + p.y;
      const d = (x - sx) * (x - sx) + (y - sy) * (y - sy);
      if (d < bd) { bd = d; best = u; }
    }
    return best;
  }
  function shipTap(sx, sy, tile) {
    const h = game.human, hit = shipNear(sx, sy);
    if (hit) {
      view.shipSel = view.shipSel === hit.id ? -1 : hit.id;
      if (view.shipSel >= 0) toast(G.SHIP_CLASS[hit.cls || 0].name + ' ausgewählt: Wasser anklicken schickt es hin, dein Hafen ruft es zurück');
      snd('tap');
      return true;
    }
    if (!(view.shipSel >= 0)) return false;
    const id = view.shipSel, u = h.units.find(function (v) { return v.id === id && v.active; });
    view.shipSel = -1;
    if (!u) return false;
    const port = game.structNear(tile, 3);
    if (port && port.type === UT.PORT && port.owner === h && port.built) { act({ k: 'dock', s: id, t: port.tile, say: G.SHIP_CLASS[u.cls || 0].name + ' läuft in den Hafen ein' }); return true; }
    if (!game.map.land[tile]) { act({ k: 'ship', s: id, t: tile, say: G.SHIP_CLASS[u.cls || 0].name + ' nimmt Kurs' }); return true; }
    return false;
  }
  function tap(sx, sy, menu, mouse) {
    if (!game) return;
    const tile = view.tileAt(sx, sy);
    if (tile < 0) return;
    const h = game.human;
    view.reachKind = -1;
    if (ghost && game.phase === 'play' && h.alive) { placeGhost(tile); return; }
    if (game.res && !aim) setLand(tile);   // version «Rohstoffe»: every click shows the card of the country
    if (game.phase === 'spawn') {
      if (!game.canSpawnAt(tile) && game.owner[tile] !== h.id) { toast(game.map.land[tile] ? 'Hier ist schon jemand' : 'Wähle Land, kein Wasser'); return; }
      act({ k: 'spawn', t: tile });
      return;
    }
    if (aim) { aim.tile = tile; refreshAim(); snd('tap'); return; }
    if (game.phase === 'play' && h.alive && !menu && shipTap(sx, sy, tile)) return;
    const pa = game.pfeile && !menu ? view.planAt(sx, sy) : null;
    if (pa !== null) { plans.splice(pa, 1); syncPlans(); toast('Pfeil entfernt'); snd('tap'); return; }
    const arrow = view.arrowAt(sx, sy);
    if (arrow !== null && !menu) { openThrustCard(arrow, sx, sy); snd('tap'); return; }
    closeThrustCard();
    // a click on an own cloaking tower shows what it covers, until the next click elsewhere
    const su = game.owner[tile] === h.id ? game.structNear(tile, 3) : null;
    view.cloakTap = su && su.owner === h && su.built && su.type === UT.CLOAK ? su : null;
    // With a mouse a single left click attacks what is there, as in OpenFront: the whole front with
    // the share of the slider, a boat where there is no border; on an own building it opens its
    // card. The right button opens the circle menu, a right drag plans a wedge. Until 23.11.2026
    // a single click only looked around and a double click attacked.
    if (mouse) {
      if (menu || game.phase !== 'play' || !h.alive) return;
      if (game.owner[tile] === h.id) {
        const u = game.structNear(tile, 3);
        if (u && u.owner === h && u.built) openBuild(u.tile);
        return;
      }
      if (game.map.land[tile]) strikeAt(tile);
      return;
    }
    const o = game.owner[tile], q = o ? game.players[o] : null;
    // an attack that is already running is fed with one tap, whoever it is against
    const running = !!q && h.out.some(function (at) { return at.active && at.tid === q.id; });
    if (!menu && game.pfeile && cfg.thrust && !running && q && h.alive && o !== h.id && game.map.land[tile]) { planTap(tile); return; }
    if (!menu && (!q || q.type === PT.BOT || running) && h.alive && o !== h.id && game.map.land[tile]) {
      strikeAt(tile, cfg.thrust ? { w: cfg.thrust } : null);
      return;
    }
    snd('tap');
    // a tap on one of your own buildings goes straight to its upgrade card
    if (!menu && o === h.id && h.alive) {
      const u = game.structNear(tile, 3);
      if (u && u.owner === h && u.built) { openBuild(u.tile); return; }
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
    // A pinch remembers the map point between the two fingers and the zoom it began with. Every
    // move puts that same point back between the fingers, instead of adding up small steps.
    let pinch = null;
    const startPinch = function () {
      const r = cv.getBoundingClientRect(), t = two(), c = view.cam;
      pinch = { d: t.d, z: c.z, wx: (t.x - r.left - view.cw / 2) / c.z + c.x, wy: (t.y - r.top - view.ch / 2) / c.z + c.y };
    };
    document.addEventListener('pointerdown', function () { G.Audio.resume(); }, true);
    document.addEventListener('keydown', function () { G.Audio.resume(); }, true);
    document.addEventListener('click', function (e) {
      const b = e.target.closest && e.target.closest('button');
      if (b && !b.disabled && !b.closest('#radial') && !b.closest('#sheetBody') && b.id !== 'aimGo') snd('ui');
    }, true);
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button === 2) {
        // the right button: a drag from own land into a foe's draws a thrust; a plain click opens the circle menu
        if (!game || game.phase !== 'play' || aim || ghost || netOn) return;
        const r = cv.getBoundingClientRect();
        rdrag = { x0: e.clientX - r.left, y0: e.clientY - r.top, x: e.clientX - r.left, y: e.clientY - r.top, tile: view.tileAt(e.clientX - r.left, e.clientY - r.top), started: false, menu: false };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
        closeRadial(); closeThrustCard();
        return;
      }
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      closeRadial();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      // the first finger of a new touch: a finger whose lift was never reported must not linger,
      // or the next single finger would count as a pinch against a point that is not there
      if (e.isPrimary && e.pointerType !== 'mouse') ptr.clear();
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 2) startPinch(); else pinch = null;
      if (ptr.size === 1) { moved = false; downAt = performance.now(); downX = e.clientX; downY = e.clientY; downType = e.pointerType; }
      else moved = true;
      view.fly = null;
      if (netOn) {
        // one finger draws on the net, two move the map. A touch only starts to draw after a
        // moment, so the first finger of a pinch leaves no mark.
        if (ptr.size === 1 && !e.shiftKey) {
          const touch = e.pointerType !== 'mouse';
          stroke = { t0: downAt, started: false, touch: touch, r: touch ? 46 : 38, sx: 0, sy: 0, orig: new Map(), less: netLess };
        } else endStroke(false);
      } else if (stroke && stroke.tap && ptr.size > 1) endStroke(false);
      else if (ptr.size === 1 && !stroke && netOk() && !aim && !ghost && performance.now() - lastTapAt < 350 && Math.hypot(e.clientX - lastTapX, e.clientY - lastTapY) < 32) {
        // a double tap held on own land: thicken there right away, lifting the finger ends it
        const r = cv.getBoundingClientRect(), t = view.tileAt(e.clientX - r.left, e.clientY - r.top);
        if (t >= 0 && game.owner[t] === game.human.id) {
          const touch = e.pointerType !== 'mouse';
          lastTapAt = -1e9; quick = { src: 'tap', less: false };
          view.net.on = true; view.net.dirty = true;
          stroke = { t0: downAt, started: false, touch: touch, r: touch ? 46 : 38, sx: 0, sy: 0, orig: new Map(), less: false, tap: true };
        }
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') { const r = cv.getBoundingClientRect(); hoverX = e.clientX - r.left; hoverY = e.clientY - r.top; hoverUnit(); }
      if (rdrag && e.pointerType === 'mouse') {
        rdrag.x = hoverX; rdrag.y = hoverY;
        if (!rdrag.started && Math.hypot(rdrag.x - rdrag.x0, rdrag.y - rdrag.y0) > 10) rdrag.started = true;
        return;
      }
      // version «Rohstoffe»: while the start point is being chosen the card follows the mouse
      if (e.pointerType === 'mouse' && game && game.res && game.phase === 'spawn' && ptr.size === 0) {
        const t = view.tileAt(hoverX, hoverY), k = t >= 0 && game.map.land[t] ? G.countryAt(game.map, t) : null;
        if (k && k.id !== landC) setLand(t);
      }
      if (stroke && stroke.key && e.pointerType === 'mouse') {
        // the key V held: paint wherever the mouse goes, no button needed (Shift thins out)
        stroke.less = quick ? (quick.less = e.shiftKey) : stroke.less;
        if (Math.hypot(hoverX - stroke.sx, hoverY - stroke.sy) >= stroke.r * 0.4) stamp(hoverX, hoverY);
        view.net.brush = { x: hoverX, y: hoverY, r: stroke.r, less: stroke.less };
        return;
      }
      const p = ptr.get(e.pointerId);
      if (!p) return;
      if (netOn && e.pointerType === 'mouse') { const r = cv.getBoundingClientRect(); view.net.brush = { x: e.clientX - r.left, y: e.clientY - r.top, r: 38, less: netLess }; }
      if (stroke && ptr.size === 1) {
        const r = cv.getBoundingClientRect(), sx = e.clientX - r.left, sy = e.clientY - r.top;
        p.x = e.clientX; p.y = e.clientY;
        if (!stroke.started) {
          if (stroke.touch && performance.now() - stroke.t0 < 70) return;
          stroke.started = true;
          netTimer = setInterval(flushNet, 200);
          stamp(sx, sy);
        } else if (Math.hypot(sx - stroke.sx, sy - stroke.sy) >= stroke.r * 0.4) stamp(sx, sy);
        view.net.brush = { x: sx, y: sy, r: stroke.r, less: stroke.less };
        return;
      }
      if (ptr.size === 1) {
        if (!moved && Math.hypot(e.clientX - downX, e.clientY - downY) > 7) moved = true;
        if (moved) view.pan(e.clientX - p.x, e.clientY - p.y);
        p.x = e.clientX; p.y = e.clientY;
      } else if (ptr.size === 2) {
        p.x = e.clientX; p.y = e.clientY;
        if (!pinch) startPinch();
        const r = cv.getBoundingClientRect(), t = two(), z = pinch.z * t.d / pinch.d;
        view.zoomTo(pinch.wx, pinch.wy, t.x - r.left, t.y - r.top, z);
        // at the nearest or farthest zoom the fingers go on moving: measure from here, so that
        // turning back zooms at once
        if (view.cam.z !== z) { pinch.z = view.cam.z; pinch.d = t.d; }
      }
    });
    const up = function (e) {
      if (rdrag && e.pointerType === 'mouse' && (e.button === 2 || e.type !== 'pointerup')) {
        const d = rdrag;
        rdrag = null; rdragEnd = performance.now(); rdragDrew = d.started;
        if (d.started) {
          const t = view.tileAt(d.x, d.y), ok = planInfo && !planInfo.why && view.plan;
          if (e.type === 'pointerup' && ok && t >= 0 && game.pfeile) addPlan(t, dragWidth(), d.tile, planInfo);
          else if (e.type === 'pointerup' && ok && t >= 0) strikeAt(t, { w: dragWidth(), s: d.tile });
          else if (e.type === 'pointerup' && planInfo && planInfo.boat && t >= 0) strikeAt(t, { sea: 1, say: 'Boot läuft aus' });
          else if (e.type === 'pointerup' && planInfo && planInfo.why) { toast(planInfo.why); snd('deny'); }
          view.plan = null; planInfo = null; planKey = ''; showCommit();
        } else if (d.menu && e.type === 'pointerup') openRadial(view.tileAt(d.x0, d.y0), d.x0, d.y0);
        return;
      }
      if (!ptr.has(e.pointerId)) return;
      ptr.delete(e.pointerId);
      if (ptr.size === 2) startPinch(); else pinch = null;
      if (stroke && !stroke.key) {
        if (e.type === 'pointerup' && !stroke.started) { const r = cv.getBoundingClientRect(); stroke.started = true; stamp(e.clientX - r.left, e.clientY - r.top); }   // a tap is one dab
        endStroke(e.type === 'pointerup');
        return;
      }
      if (netOn) return;
      if (ptr.size === 0 && !moved && e.type === 'pointerup' && performance.now() - downAt < 1500) {
        const r = cv.getBoundingClientRect();
        if (performance.now() - downAt < 300) { lastTapAt = performance.now(); lastTapX = e.clientX; lastTapY = e.clientY; }
        shiftHeld = e.shiftKey;
        if ((e.ctrlKey || e.metaKey) && game && game.phase === 'play' && game.human.alive && !aim) {
          const t = view.tileAt(e.clientX - r.left, e.clientY - r.top);
          if (t >= 0) { closeRadial(); openBuild(t); }
          return;
        }
        tap(e.clientX - r.left, e.clientY - r.top, performance.now() - downAt > 400, e.pointerType === 'mouse');
      }
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', up);
    cv.addEventListener('lostpointercapture', up);
    // Safari on the iPhone ignores «user-scalable=no»: with a finger on a panel it would zoom the
    // whole page instead of the map, and then nothing sits under the fingers any more
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(function (n) {
      document.addEventListener(n, function (e) { e.preventDefault(); }, { passive: false });
    });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hoverX = -1; hoverY = -1; if (view) view.hoverUnit = null; } });
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      // the menu waits for the button to come up, so that a drag can become a thrust instead;
      // where the menu event comes only after the button is up, a drag just ended swallows it
      if (rdrag) { rdrag.menu = true; return; }
      if (rdragDrew && performance.now() - rdragEnd < 400) return;
      if (ghost) { setGhost(null); return; }
      if (!game || game.phase !== 'play' || aim) return;
      const r = cv.getBoundingClientRect(), tile = view.tileAt(e.clientX - r.left, e.clientY - r.top);
      if (tile >= 0) openRadial(tile, e.clientX - r.left, e.clientY - r.top);
    });
    cv.addEventListener('wheel', function (e) {
      e.preventDefault();
      if (e.shiftKey || (rdrag && rdrag.started)) { setRatio(ratio * 100 + (e.deltaY < 0 ? 5 : -5)); planKey = ''; return; }
      const r = cv.getBoundingClientRect();
      // as OpenFront (InputHandler, TransformHandler): each step multiplies the zoom by
      // 600 / (600 + delta); a touchpad pinch (a wheel with Ctrl, small steps) counts ten times.
      // The wheel in pixels (some browsers count lines or pages). Until 23.11.2026 exp(-delta x
      // 0.0016) for everything, and a pinch on a touchpad barely zoomed.
      let d = e.deltaY || e.deltaX;
      d *= e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      if (e.ctrlKey && Math.abs(d) <= 10) d *= 10;
      else if (Math.abs(d) < 2) return;
      d = within(d, -300, 300);
      view.zoomAt(e.clientX - r.left, e.clientY - r.top, 600 / (600 + d));
    }, { passive: false });
    window.addEventListener('resize', function () { view.resize(); });
    document.addEventListener('visibilitychange', function () { last = performance.now(); G.Audio.hush(document.hidden); });
    const held = new Set();
    document.addEventListener('keyup', function (e) { const k = e.key.toLowerCase(); held.delete(k); if (k === 'v') keyBrush(false); });
    window.addEventListener('blur', function () { held.clear(); keyBrush(false); });
    G.heldKeys = held;
    document.addEventListener('keydown', function (e) {
      const el = e.target;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'range'))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (view && view.reachKind >= 0) view.reachKind = -1;
        if (!$('keysPanel').hidden) showKeys(false);
        else if (ghost) setGhost(null);
        else if (netOn) setNet(false);
        else if (aim) stopAim();
        else if (!$('radial').hidden) closeRadial();
        else if (!$('sheet').hidden) closeBuild();
        else if (!$('modal').hidden && modalKind !== 'start' && modalKind !== 'starthelp' && modalKind !== 'lobby' && modalKind.indexOf('lv') !== 0) closeModal();
        return;
      }
      if (k === 'o') { const v = !(cfg.music || cfg.sfx); setSound('music', v); setSound('sfx', v); toast(v ? 'Ton an' : 'Ton aus'); return; }
      if (!game || !$('modal').hidden) return;
      // The layout follows OpenFront's default keys.
      if (k === '?') { showKeys(); return; }
      if (k === 'p' || k === ' ') { e.preventDefault(); togglePause(); return; }
      if (k === 'r' && game.res) { view.resSigns = !view.resSigns; toast(view.resSigns ? 'Vorkommen auf der Karte an' : 'Vorkommen auf der Karte aus'); return; }
      if ((k.length === 1 && 'wasd'.indexOf(k) >= 0) || k.indexOf('arrow') === 0) { held.add(k); e.preventDefault(); return; }
      // Shift with a building's number upgrades one of that kind: the nearest to the pointer that can still grow
      if (e.shiftKey && /^Digit[1-6]$/.test(e.code || '')) {
        if (e.repeat || game.phase !== 'play' || !game.human.alive) return;
        const b = BUILD.find(function (x) { return x.key === e.code.slice(5); });
        upgradeKind(b.t);
        return;
      }
      if (k === 'e' || k === '+' || k === '=') { view.zoomAt(view.cw / 2, view.ch / 2, 1.25); return; }
      if (k === 'q' || k === '-' || k === '_') { view.zoomAt(view.cw / 2, view.ch / 2, 0.8); return; }
      if (k === 't') { setRatio(ratio * 100 - 10); return; }
      if (k === 'y') { setRatio(ratio * 100 + 10); return; }
      if (k === 'c') { $('bHome').click(); return; }
      if (k === 'n') { if (game.netz) setNet(!(netOn && !quick)); return; }
      if (k === 'v') { e.preventDefault(); if (!e.repeat && game.netz) keyBrush(true, e.shiftKey); return; }
      if (k === 'f') {
        const ring = game.punkt ? [2, 1, 3] : [2, 1];
        if (finePointer()) { setThrust(ring[(ring.indexOf(dragWidth()) + 1) % ring.length]); toast('Rechts ziehen: ' + THRUST_NAME[dragWidth()]); }
        else { setThrust((cfg.thrust + 1) % (game.punkt ? 4 : 3)); toast('Angriff: ' + THRUST_NAME[cfg.thrust]); }
        return;
      }
      if (k === '.' || k === ',') { if (!mp) setSpeed(k === '.' ? 1 : -1); return; }
      if (e.repeat || game.phase !== 'play' || !game.human.alive) return;
      if (aim) { if (k === 'enter' && !$('aimGo').disabled) fireAim(); return; }
      if (k === 'enter' && game.pfeile) { launchPlans(); return; }
      if (k === 'backspace' && game.pfeile && plans.length) { plans.pop(); syncPlans(); toast('Letzter Pfeil entfernt'); return; }
      // everything below acts on the build menu's tile, or else on the tile under the mouse pointer
      const open = !$('sheet').hidden;
      const tile = open ? buildTile : (hoverX >= 0 ? view.tileAt(hoverX, hoverY) : -1);
      const digit = /^Digit[0-9]$/.test(e.code || '') ? e.code.slice(5) : k;
      const item = BUILD.find(function (b) { return b.key === digit; });
      if (!item && 'bgkliu'.indexOf(k) < 0) return;
      if (tile < 0 && !item) { toast('Zeige mit der Maus auf die Karte'); return; }
      const h = game.human;
      closeRadial();
      if (item) {
        // the key only shows the building or bomb at the pointer; the click places it (same key again: put it away)
        if (open) closeBuild();
        if (armory(item.t) && !game.opts.arsenal) { toast('Den ' + plain(item.t) + ' gibt es nur im Arsenal-Modus'); snd('deny'); return; }
        setGhost(ghost && ghost.t === item.t ? null : item.t);
        snd('ui');
        return;
      }
      if (k === 'u') { if (open) closeBuild(); doUpgrade(tile); return; }
      if (open) return;
      const q = game.owner[tile] && game.owner[tile] !== h.id ? game.players[game.owner[tile]] : null;
      if (k === 'g') strikeAt(tile);
      else if (k === 'b') act({ k: 'strike', t: tile, r: ratio, sea: 1, say: 'Boot läuft aus' });
      else if (k === 'i') openInfo(q ? q.id : h.id);
      else if (!q) { toast('Zeige auf einen anderen Spieler'); snd('deny'); }
      else if (k === 'k') act({ k: 'ally', p: q.id, say: 'Anfrage an ' + q.name + ' gesendet' });
      else if (k === 'l') {
        if (h.allies.has(q.id)) { infoId = q.id; onModalAct('break'); } else { toast('Mit ' + q.name + ' besteht keine Allianz'); snd('deny'); }
      }
    });

    $('rC').addEventListener('click', function () { radialAct('C'); });
    $('rN').addEventListener('click', function () { radialAct('N'); });
    $('rE').addEventListener('click', function () { radialAct('E'); });
    $('rS').addEventListener('click', function () { radialAct('S'); });
    $('rW').addEventListener('click', function () { radialAct('W'); });
    $('sheetBody').addEventListener('click', onBuild);
    // Closing the card of an air defence or factory with the cross keeps the rings of all of that
    // kind on the map (25.11.2026), until the next tap on the map or Escape.
    $('sheetClose').addEventListener('click', function () {
      const u = view && view.selUnit;
      closeBuild();
      if (view && u && u.owner === (game && game.human) && (u.type === UT.SAM || u.type === UT.FACTORY)) view.reachKind = u.type;
    });
    $('sheet').addEventListener('click', function (e) { if (e.target === this && performance.now() - sheetAt >= 350) closeBuild(); });
    $('modal').addEventListener('click', function (e) {
      if (e.target === this && (modalKind === 'info' || modalKind === 'menu' || modalKind === 'help' || modalKind === 'confirm' || modalKind === 'res')) { closeModal(); return; }
      if (modalKind === 'res') {
        const dg = e.target.closest('[data-dig]');        // build or level up a plant from the table
        if (dg) { const i = +dg.dataset.dig, k = G.digOf(game.map.deposits[i].raw); act({ k: 'dig', d: i, say: k[0] + (game.dg && game.dg.lv[i] ? ' wird ausgebaut' : ' wird gebaut') }); renderRes(); return; }
        const fo = e.target.closest('[data-fold]');       // fold a raw material's list open or shut
        if (fo) { const k = fo.dataset.fold, n = game.map.deposits.filter(function (d) { return d.raw === k && game.owner[d.t] === game.human.id; }).length; resFold.set(k, !(resFold.has(k) ? resFold.get(k) : n <= 3)); renderRes(); return; }
        const da = e.target.closest('[data-digall]');     // every plant (of one raw material) one level more
        if (da && !da.disabled) { act({ k: 'digall', r: da.dataset.digall, say: da.dataset.digall ? G.RAW[da.dataset.digall][0] + ': alle Anlagen werden ausgebaut' : 'Alle Anlagen werden ausgebaut' }); renderRes(); return; }
        const fa = e.target.closest('[data-facall]');     // every factory below the cap one level more
        if (fa && !fa.disabled) {
          const h = game.human, cs = game.map.countries;
          let n = 0;
          for (let c = 1; c < cs.length; c++) if (h.fac && h.fac[c] > 0 && h.fac[c] < G.RES.FACTORY_CAP) { const u = facIn(h, c); if (u) { act({ k: 'up', t: u.tile, n: 1 }); n++; } }
          if (n) toast(n + ' Fabriken werden ausgebaut');
          renderRes(); return;
        }
        const fu = e.target.closest('[data-fup]');        // level up the weakest factory of a country
        if (fu) { act({ k: 'up', t: +fu.dataset.fup, n: 1, say: 'Fabrik wird ausgebaut' }); renderRes(); return; }
        const go = e.target.closest('[data-go]'), fg = e.target.closest('[data-fgo]');
        if (go) { const d = game.map.deposits[+go.dataset.go]; closeModal(); view.flyTo(d.x, d.y, Math.max(view.cam.z, 4)); return; }
        if (fg && +fg.dataset.fgo >= 0) { const t = +fg.dataset.fgo; closeModal(); view.flyTo(t % game.W, (t / game.W) | 0, Math.max(view.cam.z, 4)); return; }
      }
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) onModalAct(b.dataset.act);
    });
    $('ratio').addEventListener('input', function () { setRatio(+this.value); });
    $('bGo').addEventListener('click', function () { launchPlans(); });
    $('modes').addEventListener('click', function (e) { const b = e.target.closest('button[data-w]'); if (b) { setThrust(+b.dataset.w); snd('ui'); } });
    $('thrustCard').addEventListener('click', function (e) {
      const b = e.target.closest('button[data-act]');
      if (!b || cardId < 0) return;
      if (b.dataset.act === 'feed') act({ k: 'feed', a: cardId, r: ratio, say: 'Stoss verstärkt' });
      else act({ k: 'ret', a: cardId });
      closeThrustCard();
    });
    $('statGold').addEventListener('click', function () { if (game && game.res && game.phase === 'play' && game.human.alive) showRes(); });
    $('bRes').addEventListener('click', function () { if (game && game.res && game.phase === 'play' && game.human.alive) showRes(); });
    $('land').addEventListener('click', function (e) {
      if (e.target.id === 'landX') { landC = 0; view.resSel = 0; renderLand(); return; }
      const dg = e.target.closest('[data-dig]');          // build the plant on a deposit, or make it better
      if (dg) {
        const i = +dg.dataset.dig, k = G.digOf(game.map.deposits[i].raw);
        act({ k: 'dig', d: i, say: k[0] + (game.dg && game.dg.lv[i] ? ' wird ausgebaut' : ' wird gebaut') });
        renderLand();
        return;
      }
      const b = e.target.closest('[data-dep]');           // a deposit in the list: fly to its spot
      if (b) { const d = game.map.deposits[+b.dataset.dep]; view.flyTo(d.x, d.y, Math.max(view.cam.z, 4)); }
    });
    $('bPause').addEventListener('click', togglePause);
    $('bNet').addEventListener('click', function () { setNet(!netOn); });
    $('netDone').addEventListener('click', function () { setNet(false); });
    $('bKeys').addEventListener('click', function () { showKeys(); });
    ['brMore', 'brLess'].forEach(function (id, i) {
      // a tap arms one stroke, a long press keeps the brush on
      const b = $(id);
      let at = 0, timer = 0, long = false;
      b.addEventListener('pointerdown', function (e) { e.stopPropagation(); at = performance.now(); long = false; clearTimeout(timer); timer = setTimeout(function () { long = true; brushBtn(i === 1, true); }, 450); });
      b.addEventListener('pointerup', function () { clearTimeout(timer); });
      b.addEventListener('pointerleave', function () { clearTimeout(timer); });
      b.addEventListener('click', function () { if (!long) brushBtn(i === 1, false); long = false; });
      b.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    });
    $('netMore').addEventListener('click', function () { setBrush(false); });
    $('netLess').addEventListener('click', function () { setBrush(true); });
    $('netEven').addEventListener('click', function () { netQueue.clear(); view.net.edit.clear(); view.net.dirty = true; act({ k: 'even' }); toast('Aufstellung ausgeglichen'); });
    $('aimNo').addEventListener('click', stopAim);
    $('aimGo').addEventListener('click', fireAim);
    $('bSpeed').addEventListener('click', function () { setSpeed(0); });
    $('bHome').addEventListener('click', function () {
      const h = game.human;
      if (h.alive && h.nameSize) view.flyTo(h.nameX, h.nameY, within(Math.min(view.cw, view.ch) / Math.max(30, (h.x1 - h.x0) * 1.5), 1.2, 7));
      else if (h.spawnTile >= 0) view.flyTo(h.spawnTile % game.W, (h.spawnTile / game.W) | 0, 4);
    });
    $('bMenu').addEventListener('click', showMenu);
    $('bFull').addEventListener('click', fsToggle);
    document.addEventListener('fullscreenchange', function () { fsShow(); view.resize(); });
    document.addEventListener('webkitfullscreenchange', function () { fsShow(); view.resize(); });
    $('hotbar').addEventListener('click', function (e) {
      const b = e.target.closest('.hk');
      if (!b || !game || game.phase !== 'play' || !game.human.alive) return;
      const t = +b.dataset.t;
      if (aim) stopAim();
      closeRadial(); if (!$('sheet').hidden) closeBuild();
      setGhost(ghost && ghost.t === t ? null : t);
    });
    $('bSound').addEventListener('click', function () { const v = !(cfg.music || cfg.sfx); setSound('music', v); setSound('sfx', v); });
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
  // 1x, 2x, 4x: the button cycles, the keys step up or down
  function setSpeed(dir) {
    speed = dir > 0 ? Math.min(4, speed * 2) : dir < 0 ? Math.max(1, speed / 2) : speed === 1 ? 2 : speed === 2 ? 4 : 1;
    $('bSpeed').textContent = speed + '×';
  }
  function togglePause() {
    if (mp) { if (mp.host) { mp.setPaused(!mp.paused); setPaused(mp.paused); } return; }
    setPaused(!paused);
  }
  function setRatio(pct) {
    pct = within(Math.round(pct), 1, 100);
    ratio = pct / 100;
    $('ratio').value = pct;
    $('ratio').style.setProperty('--p', pct + '%');
    $('ratioPct').textContent = pct + '%';
    if (game && game.human.alive) $('ratioTroops').textContent = fmtT(game.human.troops * ratio);
    if (plans.length) syncPlans();
  }

  // ---------- main loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(200, now - last);
    last = now;
    if (game && (mp ? mp.started : !paused)) {
      const behind = mp ? mp.buf.size : 0;
      acc += dt * (mp ? (behind > 6 ? 8 : behind > 2 ? 2 : 1) : speed);
      // a step goes out when the last one is back: a slow simulation slows the game, it never
      // holds up a picture
      if (acc >= 100 && !host.busy) {
        const ticks = [];
        while (acc >= 100 && ticks.length < 8) {
          if (mp) {
            // playing together: only as far as the host's turns allow
            if (turnLeft === 0) {
              const turn = mp.take();
              if (!turn) { acc = 100; break; }
              pending = turnOrders(turn);
              turnLeft = G.TURN;
            }
            turnLeft--;
            ticks.push(pending); pending = [];
          } else ticks.push([]);
          acc -= 100;
        }
        if (acc >= 100 && !(mp && !ticks.length)) acc = 0;
        if (ticks.length) host.step(ticks, !!mp);
      } else if (acc > 800) acc = 800;
    }
    let alpha = 1;
    if (game && !paused) alpha = Math.min(1, (now - stateAt) * (mp ? 1 : speed) / 100);
    refreshGhost();
    if (game) updatePlan(now);
    const held = G.heldKeys;
    if (held && held.size && game && $('modal').hidden) {
      const d = dt * 0.75;
      view.pan(((held.has('a') || held.has('arrowleft') ? 1 : 0) - (held.has('d') || held.has('arrowright') ? 1 : 0)) * d,
        ((held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)) * d);
    }
    // the map picture catches up with the changed tiles: at most FLUSH_MS of painting per picture,
    // so a tick with a lot of change is spread over the next pictures instead of holding one up
    if (game) view.flush(FLUSH_MS);
    view.draw(alpha, now);
  }
  const FLUSH_MS = 4;
  // After the host has run a step: what the interface shows of it.
  function afterSteps(n, sums) {
    stateAt = performance.now();
    if (!game) return;
    if (mp) for (let i = 0; i < sums.length; i += 2) mp.sum(sums[i], sums[i + 1]);
    view.placeNames(); pump(); if (game) hudTick();
  }
  // Sounds for things that happen on the map.
  G.onFx = function (f, seen) {
    if (f.k === 'boom') { if (f.beam) { if (seen) snd('laser', 0.2); } else if (f.big) snd('hydro', 0.3); else if (seen || !f.head) snd(f.head ? 'head' : 'boom', 0.12); }
    else if (f.k === 'shipboom') { if (seen) snd('boom', 0.15); }
    else if (f.k === 'coin') { if (f.mine) snd(f.amt && f.amt % 5000 === 0 ? 'train' : 'coin', 0.25); }
    else if (f.k === 'flag') { if (seen) snd('flag', 0.2); }
    else if (f.k === 'launch') { if (f.mine || seen) snd('launch', 0.3); }
    else if (f.k === 'pop' && seen) snd('pop', 0.15);
  };

  G.boot = function (defs) {
    MAPS = defs;
    view = new G.View($('cv'));
    $('bPause').innerHTML = svg('pause', 18);
    $('bHome').innerHTML = svg('home', 18);
    $('bRes').innerHTML = svg('table', 18);
    $('bNet').innerHTML = svg('net', 18);
    $('brMore').innerHTML = '<b>+</b>'; $('brLess').innerHTML = '<b>\u2212</b>';
    $('bMenu').innerHTML = svg('menu', 18);
    fsShow();
    $('icTroops').innerHTML = svg('troops', 20);
    $('icGold').innerHTML = svg('gold', 20);
    $('rN').innerHTML = '<span class="in">' + svg('hammer', 22) + '<span>Bauen</span></span>';
    $('rE').innerHTML = '<span class="in">' + svg('boat', 22) + '<span>Boot</span></span>';
    $('rS').innerHTML = '<span class="in">' + svg('info', 22) + '<span>Info</span></span>';
    $('rW').innerHTML = '<span class="in">' + svg('ally', 22) + '<span>Allianz</span></span>';
    $('aimNo').innerHTML = svg('close', 15) + 'Abbrechen';
    try { joinCode = (new URLSearchParams(location.search).get('raum') || '').toUpperCase().replace(/[^0-9A-Z]/g, '').slice(0, 6); } catch (e) { joinCode = ''; }
    $('sheetClose').innerHTML = svg('close', 16);
    bind();
    loadCfg();
    $('bSound').innerHTML = svg(cfg.music || cfg.sfx ? 'sound' : 'mute', 18);
    $('bSound').setAttribute('aria-pressed', cfg.music || cfg.sfx ? 'true' : 'false');
    setRatio(20);
    setThrust(cfg.thrust);
    showStart();
    previewMap(cfg.map);
    last = performance.now();
    requestAnimationFrame(frame);
    G.ui = {
      begin: begin, openModal: openModal, closeModal: closeModal, showStart: showStart, previewMap: previewMap, quitGame: quitGame,
      toast: toast, addMsg: addMsg, goRow: goRow, setPaused: setPaused, svg: svg, esc: esc, snd: snd, cfg: cfg, COLORS: COLORS,
      get game() { return game; }, get view() { return view; }, get modalKind() { return modalKind; }
    };
    G.debug = { get game() { return game; }, get view() { return view; }, get mp() { return mp; }, get host() { return host; }, tap: tap, cfg: cfg, act: act };
  };
})(globalThis.G = globalThis.G || {});
