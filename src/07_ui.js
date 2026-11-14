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

  const COLORS = [[208, 92, 84], [84, 128, 200], [216, 164, 80], [146, 112, 196], [70, 160, 148], [206, 112, 160]];   // matt, but a touch stronger than the nations' palette
  // The keys are OpenFront's defaults (1 city, 2 factory, 3 port ... 0 MIRV); the two weapons OpenFront
  // does not have sit on free letters. They build at the mouse pointer.
  const BUILD = [
    { t: UT.CITY, icon: 'city', note: 'Truppen-Limit +25K', key: '1' },
    { t: UT.PORT, icon: 'port', note: 'Handel und Kriegsschiffe', key: '3' },
    { t: UT.FACTORY, icon: 'factory', note: 'Gleise und Züge bringen Gold', key: '2' },
    { t: UT.DEFENSE, icon: 'defense', note: 'Grenze fünfmal zäher', key: '4' },
    { t: UT.SILO, icon: 'silo', note: 'Startet Bomben', key: '5' },
    { t: UT.SAM, icon: 'sam', note: 'Fängt Bomben ab', key: '6' },
    { t: UT.WARSHIP, icon: 'warship', note: 'Nimmt fremde Schiffe ein', key: '7' },
    { t: UT.CRUISE, icon: 'cruise', note: 'Trifft genau, keine Verstrahlung', key: 'v' },
    { t: UT.ATOM, icon: 'atom', note: 'Kleiner Krater', key: '8' },
    { t: UT.HYDRO, icon: 'hydro', note: 'Riesiger Krater', key: '9' },
    { t: UT.LASER, icon: 'laser', note: 'Aus dem All, nicht abfangbar', key: 'z' },
    { t: UT.MIRV, icon: 'mirv', note: 'Verwüstet ein ganzes Reich', key: '0' }
  ];
  const TERRAIN = ['Ebene', 'Hochland', 'Gebirge'];
  // What the ground under a tile is called: its cover on the Earth, with height and river.
  function groundName(tile) {
    const m = game.map, lvl = m.mag[tile] < 10 ? 0 : m.mag[tile] < 20 ? 1 : 2;
    // height rounded to 50 m and the mean temperature: both decide how fast the tile falls
    const clim = ' · ' + (Math.round(m.elevOf(tile) / 50) * 50).toLocaleString('de-CH') + ' m · ' + m.tempOf(tile) + ' °C';
    if (!m.cover) return TERRAIN[lvl] + clim;
    let n = G.COVER_NAME[m.cover[tile]];
    if (lvl) n += ', ' + TERRAIN[lvl];
    if (m.feat[tile] & 2) n += ', grosser Fluss'; else if (m.feat[tile] & 1) n += ', Fluss';
    return n + clim;
  }
  const snd = function (name, gap) { G.Audio.play(name, gap); };
  const plain = function (t) { return G.UNAME[t].replace('\u00AD', ''); };
  const coin = function (n) { return '<span class="price">' + svg('gold', 13) + (n ? fmt(n) : 'gratis') + '</span>'; };
  // What a building does at a given level, for the upgrade card.
  function levelText(type, lv) {
    if (type === UT.CITY) return 'Truppen-Limit +' + 25 * lv + 'K';
    if (type === UT.PORT) return lv === 1 ? 'Schickt Handelsschiffe' : 'Schickt ' + lv + '-mal so oft Handelsschiffe';
    if (type === UT.SILO) return lv === 1 ? '1 Rakete pro Ladung' : lv + ' Raketen pro Ladung';
    if (type === UT.SAM) return (lv === 1 ? '1 Abwehrrakete' : lv + ' Abwehrraketen') + ' pro Ladung, Reichweite ' + Math.round(150 - 480 / (lv + 5));
    if (type === UT.DEFENSE) return 'Grenze ' + (3 + 2 * lv) + '-mal zäher';
    return lv === 1 ? 'Schickt Züge los' : 'Züge fahren ' + ((1 + lv) / 2).toLocaleString('de-CH') + '-mal so oft';
  }

  let MAPS = [], maps = {}, game = null, view = null;
  let paused = false, speed = 1, acc = 0, last = 0, ratio = 0.2;
  // Aufstellung: the editing mode of the net (see 03b_posture.js)
  let netOn = false, netLess = false, stroke = null, netTimer = 0, lastTile = -1, commitAt = -99;
  const netQueue = new Map();
  let sel = null, radialAt = 0, modalKind = '', infoId = 0, lbOpen = false, lbAt = -99, liveAt = -99, tradeAt = 0;
  let toastTimer = 0, endShown = false, botsTouched = false;
  let mp = null, turnLeft = 0, aim = null, joinCode = '', lobbyNote = '', goldTimer = 0;
  const chips = new Map(), asks = new Map();
  const cfg = { name: 'Spieler', color: 0, map: 'erde', diff: 1, bots: -1, nations: true, instant: false, gold: false, troops: false, tap: false, music: true, sfx: true, mode: 'klassisch' };
  const MODES = [['klassisch', 'Klassisch', 'Das Spiel wie gewohnt.'], ['arsenal', 'Arsenal', 'Zusätzliche Waffe: der Satellitenstrahl. Er kommt aus dem All, braucht kein Silo und lässt sich nicht abfangen. Auch die Nationen setzen ihn ein.']];
  let hoverX = -1, hoverY = -1;
  const RES = G.VARIANT === 'rohstoffe';   // this page is the game version «Rohstoffe» (src/03c_res.js)
  let ghost = null, ghostKey = '', shiftHeld = false;   // the thing a build key is about to place
  const special = function (id) { return G.SPECIAL_MAPS.find(function (m) { return m.id === id; }); };

  function loadCfg() {
    try {
      const s = JSON.parse(localStorage.getItem('grenzland.v1') || '{}');
      for (const k in cfg) if (typeof s[k] === typeof cfg[k]) cfg[k] = s[k];
    } catch (e) { /* storage may be unavailable */ }
    // ?karte=welt in the address picks the map (the tests use it to stay off the big one)
    try { const k = new URLSearchParams(location.search).get('karte'); if (k) cfg.map = k; } catch (e) { /* no address to read */ }
    if (cfg.map !== 'zufall' && !special(cfg.map) && !MAPS.some(function (m) { return m.id === cfg.map; })) cfg.map = MAPS[0].id;
    G.Audio.on.music = cfg.music; G.Audio.on.sfx = cfg.sfx;
    if (cfg.mode !== 'arsenal') cfg.mode = 'klassisch';
    botsTouched = cfg.bots >= 0;
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
  function defaultBots(map) { return Math.min(400, Math.round(map.landTiles / 950 / 10) * 10); }
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
      h += '<button class="btn" id="fJoin" type="button">' + svg('people', 20) + 'Beitreten</button>';
      h += '<button class="btn ghost" id="fSolo" type="button">Lieber allein spielen</button>';
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
      h += '<div class="field"><div class="lab">Schwierigkeit</div><div class="seg" id="fDiff">' + G.DIFF_NAMES.map(function (n, i) {
        return '<button type="button" data-i="' + i + '" aria-pressed="' + (i === cfg.diff) + '">' + n + '</button>';
      }).join('') + '</div></div>';
      h += '<div class="field"><label for="fBots">Bots <b id="fBotsVal">' + Math.max(0, cfg.bots) + '</b></label><input id="fBots" type="range" min="0" max="400" step="10" value="' + Math.max(0, cfg.bots) + '"></div>';
      h += '<div class="field"><div class="lab">Optionen</div><div class="checks">' + check('fNations', 'Nationen', cfg.nations) +
        check('fInstant', 'Sofort bauen', cfg.instant) + check('fGold', 'Unendlich Gold', cfg.gold) + check('fTroops', 'Unendlich Truppen', cfg.troops) + '</div></div>';
      h += '<button class="btn" id="fStart" type="button">Spiel starten</button>';
      h += '<button class="btn alt" id="fHost" type="button">' + svg('people', 20) + 'Mit Freunden spielen</button>';
    }
    h += '<button class="btn ghost" id="fHelp" type="button">So wird gespielt</button>';
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
      cfg.map = b.dataset.id;
      for (const c of this.querySelectorAll('.mapc')) c.setAttribute('aria-pressed', c === b ? 'true' : 'false');
      previewMap(cfg.map);
    });
    drawThumbs();
    const cur = $('fMap').querySelector('.mapc[aria-pressed=true]');
    if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    $('fMode').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (!b) return;
      cfg.mode = b.dataset.id; press(this, b);
      $('fModeNote').textContent = MODES.find(function (m) { return m[0] === cfg.mode; })[2];
    });
    $('fDiff').addEventListener('click', function (e) {
      const b = e.target.closest('button');
      if (b) { cfg.diff = +b.dataset.i; press(this, b); }
    });
    $('fBots').addEventListener('input', function () { botsTouched = true; cfg.bots = +this.value; $('fBotsVal').textContent = this.value; });
    $('fStart').addEventListener('click', startGame);
    $('fHost').addEventListener('click', function () { readForm(); openRoom(true); });
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
        diff: cfg.diff, bots: Math.max(0, cfg.bots), nations: cfg.nations, arsenal: cfg.mode === 'arsenal', res: RES
      });
    });
  }
  function startMp(m) {
    const me = mp.index();
    turnLeft = 0;
    loadMap(m.map, m.mapSeed).then(function (map) {
      begin(map, {
        seed: m.seed, difficulty: m.diff, bots: m.bots, nations: m.nations, arsenal: !!m.arsenal, res: !!m.res, spawnTicks: 300, autoSpawn: true, me: me
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
      '<li><b>Spielmodus Arsenal:</b> Zusätzlich gibt es den <b>Satellitenstrahl</b> (600K Gold). Er braucht kein Silo, trifft drei Sekunden nach dem Abfeuern, kann nicht abgefangen werden und hinterlässt keine Verstrahlung. Danach lädt der Satellit 45 Sekunden nach.</li>' +
      '<li><b>Ausbauen:</b> Tippe auf eines deiner Gebäude, dann öffnet sich gleich die Ausbaukarte mit drei Knöpfen: eine Stufe, fünf Stufen oder so viele, wie dein Gold reicht. Alle Gebäude gehen bis Stufe 100. Jede Stufe kostet so viel wie ein weiteres Gebäude derselben Art (Stadt: 125K, 250K, 500K, danach je 1M) und bringt bei Städten +25K Truppen-Limit. </li>' +
      '<li><b>Eroberung:</b> Wer ein Reich ganz einnimmt, bekommt dessen Gold (bei Mitspielern die Hälfte) und dazu eine Prämie nach Landgrösse: 60 Gold für jedes Feld, das das Reich zu seiner grössten Zeit hatte. Bots bringen zusätzlich 25K. Die Summe steht in der Spieler-Info.</li>' +
      '<li><b>Maus:</b> Ein einfacher Klick schaut sich nur um (Karte ziehen). Ein Doppelklick greift an, der Rechtsklick öffnet das Kreismenü. Fährst du über ein fremdes Reich, steht oben, was es hat.</li>' +
      '<li><b>Tippen (Handy):</b> Ein Tipp auf freies Land oder auf einen Bot greift sofort an. Bei Nationen und Mitspielern öffnet sich das Menü, dort musst du auf Angreifen tippen. Läuft dein Angriff auf sie schon, schickt jeder weitere Tipp auf ihr Land sofort mehr Truppen. Lange drücken öffnet das Menü überall.</li>' +
      '<li><b>Karte:</b> Ziehen verschiebt, zwei Finger oder das Mausrad zoomen.</li>' +
      '</ul><h2 class="h3">Tastenkürzel</h2><p>Die Belegung ist die von OpenFront.</p><div class="keys">' +
      BUILD.map(function (b) { return '<span><kbd>' + b.key.toUpperCase() + '</kbd>' + plain(b.t) + (b.t === UT.LASER ? ' (Arsenal)' : '') + '</span>'; }).join('') +
      '<span><kbd>G</kbd>Angreifen</span><span><kbd>B</kbd>Boot schicken</span><span><kbd>T</kbd><kbd>Y</kbd>Truppenanteil −/+ 10 %</span>' +
      '<span><kbd>K</kbd>Allianz anfragen</span><span><kbd>L</kbd>Allianz brechen</span><span><kbd>I</kbd>Spieler-Info</span>' +
      '<span><kbd>Q</kbd><kbd>E</kbd>Zoom −/+</span><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>Karte schieben</span><span><kbd>C</kbd>Zum eigenen Gebiet</span>' +
      '<span><kbd>P</kbd>Pause</span><span><kbd>,</kbd><kbd>.</kbd>Tempo −/+</span><span><kbd>Strg</kbd>+ Klick: Baumenü</span><span>Doppelklick: Angreifen</span><span>Rechtsklick: Kreismenü</span><span><kbd>N</kbd>Aufstellung</span><span><kbd>Shift</kbd>+ Mausrad: Truppenanteil</span>' +
      '<span><kbd>Esc</kbd>Schliessen</span></div><p>Eine Bau-Taste zeigt das Gebäude oder die Bombe zuerst am Mauszeiger: in deiner Farbe, wenn es dort geht, rot, wenn nicht. Fehlt nur das Gold, bleibt der Preis stehen und wird rot; sonst steht der Grund dabei. Bei Bomben siehst du schon beim Zielen die Flugbahn vom Silo (rot, wo gegnerische Flugabwehr sie erreicht), den Sprengradius und die Reichweite jeder Flugabwehr: die gegnerische violett, deine eigene grün. Fliegt eine Bombe auf dein Land zu, wird die Reichweite deiner eigenen Flugabwehr ebenfalls eingeblendet. Ein Klick setzt es, mit gedrückter <kbd>Shift</kbd>-Taste mehrere hintereinander. Klickst du damit auf ein eigenes Gebäude derselben Art, wird es um eine Stufe ausgebaut; dieselbe Taste, <kbd>Esc</kbd> oder ein Rechtsklick legt es wieder weg.</p><p>Zusätzlich, weil es das in OpenFront nicht gibt: <kbd>U</kbd> baut das Gebäude unter dem Mauszeiger aus, <kbd>Shift</kbd> + <kbd>1</kbd>–<kbd>6</kbd> das nächste Gebäude dieser Art, <kbd>Enter</kbd> feuert im Zielmodus des Baumenüs die Bombe ab, <kbd>M</kbd> schaltet den Ton, die Leertaste pausiert ebenfalls.</p><p>' +
      'Befehle gelten für die Stelle unter dem Mauszeiger.</p>';
  }
  function showHelp(fromStart) {
    openModal(helpHtml() + '<button class="btn" data-act="' + (fromStart ? 'start' : 'resume') + '" type="button">' + (fromStart ? 'Zurück' : 'Weiterspielen') + '</button>', fromStart ? 'starthelp' : 'help');
  }

  function startGame() {
    readForm();
    $('fStart').disabled = true; $('fStart').textContent = 'Karte wird vorbereitet';
    loadMap(cfg.map).then(function (map) {
      begin(map, {
        seed: (Math.random() * 2e9) | 0, difficulty: cfg.diff, bots: cfg.bots, nations: cfg.nations, arsenal: cfg.mode === 'arsenal', res: RES,
        instantBuild: cfg.instant, infiniteGold: cfg.gold, infiniteTroops: cfg.troops
      }, { name: cfg.name, color: COLORS[cfg.color] });
    }).catch(function (e) {
      toast(e.message);
      $('fStart').disabled = false; $('fStart').textContent = 'Spiel starten';
    });
  }
  function begin(map, opts, people) {
    game = new G.Game(map, opts);
    game.setup(people);
    view.setMap(map); view.setGame(game); view.fit(false);
    landC = 0; view.resSel = 0; view.resSigns = true; renderLand();
    if (!RES && opts.res) setTimeout(function () { addMsg('Dieser Raum spielt die Version «Rohstoffe». Öffne den Einladungslink, sonst läuft dein Spiel auseinander.', 'bad'); }, 50);
    $('statGold').classList.toggle('res', game.res);
    if (RES && !game.res) setTimeout(function () { addMsg(opts.res ? 'Rohstoffe gibt es nur auf der Karte «Erde». Diese Runde läuft klassisch.' : 'Dieser Raum spielt ohne Rohstoffe.', 'info'); }, 50);
    view.cam.z = within(Math.max(view.cw / map.W, view.ch / map.H) * 0.5, view.cam.z, 4);
    $('modal').hidden = true; modalKind = '';
    $('hud').hidden = false; $('spawnBar').hidden = false; $('ctrl').hidden = true; $('lb').hidden = true; $('aimBar').hidden = true;
    netOn = false; stroke = null; netQueue.clear(); lastTile = -1; commitAt = -99; view.net.on = false; view.net.edit.clear(); view.net.w = 0; view.net.at = -1e9;
    $('peek').hidden = true;
    $('bNet').hidden = true; $('bNet').setAttribute('aria-pressed', 'false'); $('netBar').hidden = true; $('commit').textContent = '';
    $('feedMsgs').innerHTML = ''; $('feedLive').innerHTML = ''; chips.clear(); asks.clear();
    $('lbRows').innerHTML = ''; $('clock').textContent = '0:00';
    speed = 1; $('bSpeed').textContent = '1×'; acc = 0; endShown = false; lbAt = liveAt = -99; tradeAt = 0; aim = null;
    setPaused(false);
    view.placeNames();
    hudTick();
  }
  // Every order of the player goes through here: carried out at once when playing alone,
  // sent to the host when playing together.
  function act(c) {
    if (!game) return;
    if (mp) mp.send(c);
    else done(c, game.exec(game.human.id, c));
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
  function applyTurn(list) {
    const me = game.human ? game.human.id : 0;
    for (let i = 0; i < list.length; i++) {
      const id = list[i][0] | 0, c = list[i][1], why = game.exec(id, c);
      if (id === me) done(c, why);
    }
  }
  function quitGame() {
    game = null; closeRadial(); $('sheet').hidden = true; stopAim();
    $('hud').hidden = true;
    leaveRoom();
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
        $('spawnBar').hidden = true; $('ctrl').hidden = false; $('lb').hidden = false; $('bNet').hidden = !h.post;
        const W = game.W;
        view.flyTo(h.spawnTile % W, (h.spawnTile / W) | 0, within(Math.min(view.cw, view.ch) / 70, 2.2, 6));
        addMsg('Los geht es. Breite dich aus, bevor es andere tun.', 'good');
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
      } else if (e.k === 'defeat') { setNet(false); $('bNet').hidden = true; showEnd('defeat', null); }
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
        el.innerHTML = '<span></span>' + (action ? '<button type="button" aria-label="Zurückrufen">' + svg('close', 13) + '</button>' : '');
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
      for (let i = 0; i < inc.length && i < 3; i++) put('i' + inc[i].id, 'bad', inc[i].a.name + ' greift an · ' + fmtT(inc[i].troops), null);
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
    if (!h.alive || game.phase !== 'play') { el.hidden = true; return; }
    el.hidden = false;
    const rich = game.opts.infiniteGold;
    const cells = BUILD.filter(function (b) { return b.t !== UT.LASER || game.opts.arsenal; }).map(function (b) {
      const cost = game.cost(h, b.t), wait = b.t === UT.LASER ? Math.ceil(((h.laserAt || 0) - game.ticks) / 10) : 0;
      const have = b.t === UT.WARSHIP ? h.units.filter(function (u) { return u.type === UT.WARSHIP; }).length : b.t <= UT.FACTORY ? h.units.filter(function (u) { return u.type === b.t; }).length : 0;
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
        $('spawnHint').textContent = 'Tippe auf freies Land, dann geht es sofort los';
      }
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
    }
    if (T - lbAt >= 10) { lbAt = T; leaderboard(); }
    if (T - liveAt >= 3) { liveAt = T; live(); }
    if (T - tradeAt >= 150) {
      tradeAt = T;
      if (h.tradeGold > 0) { addMsg('Handel bringt ' + fmt(h.tradeGold) + ' Gold', 'good'); h.tradeGold = 0; }
    }
    if (modalKind === 'info' && T % 5 === 0) renderInfo();
    if (aim && T % 3 === 0) refreshAim();
  }

  // ---------- end of game ----------
  function showEnd(kind, winner) {
    if (kind === 'other' && endShown === 'defeat' && !$('modal').hidden) { /* replace the defeat card */ }
    else if (endShown && kind !== 'other') return;
    endShown = kind;
    snd(kind === 'win' ? 'win' : 'lose');
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
    } else kind = p.type === PT.HUMAN ? 'Mitspieler' : 'Bot · baut nichts, greift nur viel Schwächere langsam an';
    let s = '<div class="who"><span class="dot big" style="background:' + p.css + '"></span><div><h2>' + (p.flag ? G.flagOf(p.flag) + ' ' : '') + esc(p.name) + '</h2><p>' + kind + '</p></div></div>';
    s += '<div class="facts">' + fact('Truppen', fmtT(p.troops)) + fact('Gold', me && game.opts.infiniteGold ? '∞' : fmt(p.gold)) + fact('Gebiet', (p.tiles / den * 100).toFixed(1) + ' %') + '</div>';
    if (!me && p.alive) s += '<p class="notes">Eroberung bringt ' + fmt(Math.floor(p.type === PT.HUMAN ? p.gold / 2 : p.gold) + game.bounty(p)) + ' Gold (sein Gold und die Prämie für ' + G.fmt(Math.max(p.peak, p.tiles)) + ' Felder).</p>';
    s += '<div class="facts six">' + fact('Städte', p.cnt[UT.CITY]) + fact('Häfen', p.cnt[UT.PORT]) + fact('Fabriken', p.cnt[UT.FACTORY]) +
      fact('Posten', p.cnt[UT.DEFENSE]) + fact('Silos', p.cnt[UT.SILO]) + fact('Abwehr', p.cnt[UT.SAM]) + '</div>';
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
    openModal('<h2>' + (mp ? 'Menü' : 'Pause') + '</h2><p>' + esc(game.map.name) + ' · ' + G.DIFF_NAMES[game.opts.difficulty] + (game.opts.arsenal ? ' · Arsenal' : '') + '</p>' +
      '<button class="btn" data-act="resume" type="button">Weiterspielen</button>' +
      '<button class="btn ghost" data-act="help" type="button">So wird gespielt</button>' +
      '<label class="check wide" for="mMusic"><input id="mMusic" type="checkbox"' + (cfg.music ? ' checked' : '') + '>Musik</label>' +
      '<label class="check" for="mSfx"><input id="mSfx" type="checkbox"' + (cfg.sfx ? ' checked' : '') + '>Töne bei Aktionen</label>' +
      '<button class="btn ghost" data-act="quit" type="button">Spiel beenden</button>', 'menu');
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
    if (what === 'close' || act === 'resume') { closeModal(); return; }
    if (what === 'help') { showHelp(false); return; }
    if (what === 'quit') { quitGame(); return; }
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
        (max ? '<small>Höchste Stufe erreicht</small>' : '<small class="next">Stufe ' + (near.level + 1) + ': ' + levelText(near.type, near.level + 1) + '</small>') + '</div></div>' + btns + '</div>';
    }
    const cell = function (b) {
      const nuke = b.t >= UT.ATOM;
      let ok, note, cost = game.cost(h, b.t);
      if (b.t === UT.LASER) {
        const wait = (h.laserAt || 0) - game.ticks;
        ok = wait <= 0 && h.gold >= cost && game.ticks >= game.immuneUntil;
        note = wait > 0 ? 'Lädt noch ' + Math.ceil(wait / 10) + ' s' : game.ticks < game.immuneUntil ? 'Schonfrist läuft noch' : h.gold < cost ? 'Zu wenig Gold' : b.note;
      } else if (nuke) {
        const s = game.readySilo(h, tile);
        ok = s.any && h.gold >= cost;
        note = !s.any ? 'Dafür brauchst du ein Raketensilo' : h.gold < cost ? 'Zu wenig Gold' : 'Ziel wählen und abfeuern';
      } else {
        const c = game.buildCheck(h, b.t, tile);
        ok = c.ok; note = c.ok ? b.note : c.why; cost = c.cost;
      }
      const have = b.t < UT.ATOM ? h.cnt[b.t] : 0;
      return '<button class="item' + (nuke ? ' nuke' : '') + (!game.opts.infiniteGold && h.gold < cost ? ' poor' : '') + '" type="button" data-t="' + b.t + '"' + (ok ? '' : ' disabled') + '><kbd>' + b.key.toUpperCase() + '</kbd>' + (have ? '<i class="own">' + have + '</i>' : '') +
        '<span class="ic">' + svg(b.icon, 24) + '</span><b>' + G.UNAME[b.t] + '</b><small>' + esc(note) + '</small>' + coin(cost) + '</button>';
    };
    html += '<h3>Gebäude</h3><div class="grid">' + BUILD.filter(function (b) { return b.t <= UT.FACTORY; }).map(cell).join('') + '</div>';
    html += '<h3>Flotte und Raketen</h3><div class="grid">' + BUILD.filter(function (b) { return b.t > UT.FACTORY && (b.t !== UT.LASER || game.opts.arsenal); }).map(cell).join('') + '</div>';
    $('sheetBody').innerHTML = html;
    $('purse').innerHTML = svg('gold', 15) + (game.opts.infiniteGold ? '∞' : fmt(h.gold));
    $('sheet').hidden = false; sheetAt = performance.now();
    view.mark = tile;
    snd('open');
  }
  // Build at a tile, or start aiming a bomb at it. Used by the menu and by the keys.
  function doBuild(t, tile) {
    if (t === UT.LASER && !game.opts.arsenal) { toast('Den Satellitenstrahl gibt es nur im Arsenal-Modus'); snd('deny'); return; }
    if (t === UT.LASER) { startAim(t, tile); return; }
    if (t >= UT.ATOM) {
      const h = game.human, s = game.readySilo(h, tile);
      if (!s.any) { toast('Dafür brauchst du ein Raketensilo'); snd('deny'); return; }
      startAim(t, tile);
      return;
    }
    act({ k: 'build', u: t, t: tile, say: t === UT.WARSHIP ? 'Kriegsschiff läuft aus' : plain(t) + (game.opts.instantBuild ? ' gebaut' : ' wird gebaut') });
  }
  function doUpgrade(tile, n) {
    const u = game.structNear(tile, 4);
    act({ k: 'up', t: tile, n: n || 1, say: (u ? plain(u.type) : 'Gebäude') + ' ausgebaut' });
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
  function closeBuild() { $('sheet').hidden = true; if (view) view.mark = -1; }
  function onBuild(e) {
    if (performance.now() - sheetAt < 350) return;
    const b = e.target.closest('[data-t],[data-up]');
    if (!b || b.disabled) return;
    if (b.dataset.up) doUpgrade(buildTile, +b.dataset.up);
    else {
      const t = +b.dataset.t;
      if (t >= UT.ATOM) closeBuild();
      doBuild(t, buildTile);
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
    const c = game.buildCheck(h, ghost.t, tile);
    // for a bomb: the silo it would start from (or, while all are reloading, any silo), so the flight path can be shown
    const silo = ghost.t >= UT.ATOM && ghost.t !== UT.LASER ? c.silo || game.readySilo(h, tile).silo || h.units.find(function (u) { return u.type === UT.SILO && u.built; }) || null : null;
    view.ghost = { type: ghost.t, icon: icon, tile: tile, ok: c.ok, silo: silo,
      text: c.ok || c.why === 'Zu wenig Gold' ? plain(ghost.t) + ' · ' + G.fmt(game.cost(h, ghost.t)) : c.why || 'Hier nicht möglich' };   // too little gold: the price stays, in red
  }
  // The player's own finished building of the kind being placed, if the pointer is on it.
  function ghostUpgrade(tile) {
    if (!ghost || ghost.t > UT.FACTORY) return null;
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
    const c = game.buildCheck(h, t, tile);
    if (!c.ok) { toast(plain(t) + ': ' + (c.why || 'Hier nicht möglich')); snd('deny'); return; }
    if (t >= UT.ATOM) act({ k: 'build', u: t, t: tile, say: plain(t) + ' gestartet' });
    else doBuild(t, tile);
    if (!shiftHeld) setGhost(null);   // hold Shift to place several in a row
  }

  // ---------- Aufstellung ----------
  // An order to attack over land: says beforehand how much is at hand and how much has to march.
  function commitText(tile) {
    const h = game.human;
    if (!h.post || tile < 0 || game.owner[tile] === h.id || !game.map.land[tile]) return '';
    const a = game.actionsAt(h, tile);
    if (!a.canAttack) return '';
    const i = game.commitInfo(h, tile, ratio);
    if (i.now + i.later < 1) return '';
    return fmtT(i.now) + ' sofort' + (i.later >= 1 ? ' · ' + fmtT(i.later) + ' unterwegs · ca. ' + Math.max(1, Math.round(i.eta)) + ' s' : '');
  }
  function showCommit() {
    const el = $('commit');
    if (!el) return;
    const tile = hoverX >= 0 ? view.tileAt(hoverX, hoverY) : lastTile;
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
    const den = Math.max(1, game.map.landTiles - game.falloutCount);
    let tag = q.type === PT.BOT ? 'Bot' : q.type === PT.NATION ? 'Nation' : 'Mitspieler', cls = '';
    if (h.allies.has(q.id)) { tag = 'Verbündet'; cls = 'good'; }
    else if (h.out.some(function (a) { return a.active && a.tid === q.id; }) || h.inc.some(function (a) { return a.active && a.a === q; })) { tag = 'Im Krieg'; cls = 'bad'; }
    let s = '<div class="pkTop"><i style="background:' + q.css + '"></i><b>' + (q.flag ? G.flagOf(q.flag) + ' ' : '') + esc(q.name) + '</b><em class="' + cls + '">' + tag + '</em></div>' +
      '<div class="pkNum"><span>' + svg('troops', 14) + fmtT(q.troops) + '</span><span class="gold">' + svg('gold', 14) + fmt(q.gold) + '</span><span>' + (q.tiles / den * 100).toFixed(1) + '% Land</span></div><div class="pkHas">';
    let any = false;
    for (const e of PEEK) { const n = q.cnt[e[0]]; if (n > 0) { any = true; s += '<span title="' + G.UNAME[e[0]].replace('\u00AD', '') + '">' + svg(e[1], 15) + n + '</span>'; } }
    if (!any) s += '<span class="none">keine Gebäude</span>';
    s += '</div>';
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
  function showIncome() {
    const h = game.human, cs = game.map.countries, deps = game.map.deposits, raw = new Int32Array(cs.length), rows = [];
    for (let i = 0; i < deps.length; i++) if (game.owner[deps[i].t] === h.id) raw[deps[i].c] += game.digGold(i);
    for (let c = 1; c < cs.length; c++) {
      const ware = h.fac && h.fac[c] ? game.wareOf(c, h.fac[c]) : 0;
      if (raw[c] + ware > 0) rows.push([raw[c] + ware, cs[c], raw[c], ware]);
    }
    rows.sort(function (a, b) { return b[0] - a[0] || a[1].id - b[1].id; });
    let s = '<h2>Einnahmen</h2><div class="facts">' + fact('Grundeinkommen', perSec(100)) + fact('Rohstoffe', perSec(h.resRaw | 0)) + fact('Fabrikwaren', perSec(h.resWare | 0)) + '</div>';
    if (!rows.length) s += '<p class="notes">Noch kein Vorkommen und keine Fabrik. Klicke auf ein Land, um zu sehen, was es dort gibt.</p>';
    else {
      s += '<div class="incList"><div class="incRow head"><b>Land</b><span>Rohstoffe</span><span>Fabriken</span></div>' + rows.slice(0, 14).map(function (r) {
        const k = r[1];
        return '<div class="incRow"><b>' + (k.iso ? G.flagOf(k.iso) + ' ' : '') + esc(k.name) + '</b><span>' + (r[2] ? perSec(r[2]) : '–') + '</span><span>' + (r[3] ? perSec(r[3]) : '–') + '</span></div>';
      }).join('') + '</div>';
      if (rows.length > 14) s += '<p class="notes">und ' + (rows.length - 14) + ' weitere Länder</p>';
    }
    s += '<p class="notes"><b>Abbauen und ernten:</b> Ein Vorkommen bringt erst Gold, wenn du darauf eine Anlage gebaut hast: Mine, Bohrturm, Staudamm, Holzfällerei, Farm, Plantage, Viehhof oder Fischerei. Klicke dazu auf das Land. <b>Herstellen:</b> Jede Fabrik stellt die Ware des Landes her, in dem sie steht; pro Land zählen ' + G.RES.FACTORY_CAP + ' Stufen.</p>' +
      '<button class="btn" data-act="resume" type="button">Weiterspielen</button>';
    openModal(s, 'help');
  }
  function strikeAt(tile, extra) {
    const c = { k: 'strike', t: tile, r: ratio };
    if (extra) for (const k in extra) c[k] = extra[k];
    lastTile = tile;
    if (!c.sea && !c.say) { const s = commitText(tile); if (s.indexOf('unterwegs') >= 0) c.say = s; }
    act(c);
  }
  function setNet(on) {
    on = !!on && !!game && game.phase === 'play' && game.human.alive && !!game.human.post;
    if (on === netOn) return;
    netOn = on; view.net.on = on; view.net.dirty = true; view.net.brush = null;
    endStroke(false);
    $('bNet').setAttribute('aria-pressed', on ? 'true' : 'false');
    $('netBar').hidden = !on;
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
        const k = 1 + 0.2 * f, m = within(netLess ? cur / k : cur * k, G.POST.mMin, G.POST.mMax);
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
    stroke = null; view.net.brush = null;
    clearInterval(netTimer); netTimer = 0;
    flushNet();
  }

  // Double click with the mouse: attack what is there (over land, or by boat where there is no
  // border), or open the upgrade card of an own building.
  function dbl(sx, sy) {
    if (!game || game.phase !== 'play' || aim || ghost || netOn) return;
    const tile = view.tileAt(sx, sy), h = game.human;
    if (tile < 0 || !h.alive) return;
    closeRadial();
    if (game.owner[tile] === h.id) {
      const u = game.structNear(tile, 3);
      if (u && u.owner === h && u.built) openBuild(u.tile);
      return;
    }
    if (!game.map.land[tile]) return;
    strikeAt(tile);
  }
  function tap(sx, sy, menu, mouse) {
    if (!game) return;
    const tile = view.tileAt(sx, sy);
    if (tile < 0) return;
    const h = game.human;
    if (ghost && game.phase === 'play' && h.alive) { placeGhost(tile); return; }
    if (game.res && !aim) setLand(tile);   // version «Rohstoffe»: every click shows the card of the country
    if (game.phase === 'spawn') {
      if (!game.canSpawnAt(tile) && game.owner[tile] !== h.id) { toast(game.map.land[tile] ? 'Hier ist schon jemand' : 'Wähle Land, kein Wasser'); return; }
      act({ k: 'spawn', t: tile });
      return;
    }
    if (aim) { aim.tile = tile; refreshAim(); snd('tap'); return; }
    // With a mouse a single click only looks around. A double click attacks, the right button
    // opens the circle menu. Touch keeps its taps: there is no second button on a screen.
    if (mouse) return;
    const o = game.owner[tile], q = o ? game.players[o] : null;
    // an attack that is already running is fed with one tap, whoever it is against
    const running = !!q && h.out.some(function (at) { return at.active && at.tid === q.id; });
    if (!menu && (!q || q.type === PT.BOT || running) && h.alive && o !== h.id && game.map.land[tile]) {
      strikeAt(tile);
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
    document.addEventListener('pointerdown', function () { G.Audio.resume(); }, true);
    document.addEventListener('keydown', function () { G.Audio.resume(); }, true);
    document.addEventListener('click', function (e) {
      const b = e.target.closest && e.target.closest('button');
      if (b && !b.disabled && !b.closest('#radial') && !b.closest('#sheetBody') && b.id !== 'aimGo') snd('ui');
    }, true);
    cv.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      closeRadial();
      try { cv.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) { moved = false; downAt = performance.now(); downX = e.clientX; downY = e.clientY; downType = e.pointerType; }
      else moved = true;
      view.fly = null;
      if (netOn) {
        // one finger draws on the net, two move the map. A touch only starts to draw after a
        // moment, so the first finger of a pinch leaves no mark.
        if (ptr.size === 1 && !e.shiftKey) {
          const touch = e.pointerType !== 'mouse';
          stroke = { t0: downAt, started: false, touch: touch, r: touch ? 46 : 38, sx: 0, sy: 0, orig: new Map() };
        } else endStroke(false);
      }
    });
    cv.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'mouse') { const r = cv.getBoundingClientRect(); hoverX = e.clientX - r.left; hoverY = e.clientY - r.top; }
      // version «Rohstoffe»: while the start point is being chosen the card follows the mouse
      if (e.pointerType === 'mouse' && game && game.res && game.phase === 'spawn' && ptr.size === 0) {
        const t = view.tileAt(hoverX, hoverY), k = t >= 0 && game.map.land[t] ? G.countryAt(game.map, t) : null;
        if (k && k.id !== landC) setLand(t);
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
        view.net.brush = { x: sx, y: sy, r: stroke.r, less: netLess };
        return;
      }
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
      if (stroke) {
        if (e.type === 'pointerup' && !stroke.started) { const r = cv.getBoundingClientRect(); stroke.started = true; stamp(e.clientX - r.left, e.clientY - r.top); }   // a tap is one dab
        endStroke(e.type === 'pointerup');
        return;
      }
      if (netOn) return;
      if (ptr.size === 0 && !moved && e.type === 'pointerup' && performance.now() - downAt < 1500) {
        const r = cv.getBoundingClientRect();
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
    cv.addEventListener('dblclick', function (e) {
      if (downType !== 'mouse') return;
      const r = cv.getBoundingClientRect();
      dbl(e.clientX - r.left, e.clientY - r.top);
    });
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { hoverX = -1; hoverY = -1; } });
    cv.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      if (ghost) { setGhost(null); return; }
      if (!game || game.phase !== 'play' || aim) return;
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
    document.addEventListener('visibilitychange', function () { last = performance.now(); G.Audio.hush(document.hidden); });
    const held = new Set();
    document.addEventListener('keyup', function (e) { held.delete(e.key.toLowerCase()); });
    window.addEventListener('blur', function () { held.clear(); });
    G.heldKeys = held;
    document.addEventListener('keydown', function (e) {
      const el = e.target;
      if (el && (el.tagName === 'TEXTAREA' || (el.tagName === 'INPUT' && el.type !== 'checkbox' && el.type !== 'range'))) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        if (ghost) setGhost(null);
        else if (netOn) setNet(false);
        else if (aim) stopAim();
        else if (!$('radial').hidden) closeRadial();
        else if (!$('sheet').hidden) closeBuild();
        else if (!$('modal').hidden && modalKind !== 'start' && modalKind !== 'starthelp' && modalKind !== 'lobby') closeModal();
        return;
      }
      if (k === 'm') { const v = !(cfg.music || cfg.sfx); setSound('music', v); setSound('sfx', v); toast(v ? 'Ton an' : 'Ton aus'); return; }
      if (!game || !$('modal').hidden) return;
      // The layout follows OpenFront's default keys.
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
      if (k === 'n') { setNet(!netOn); return; }
      if (k === '.' || k === ',') { if (!mp) setSpeed(k === '.' ? 1 : -1); return; }
      if (e.repeat || game.phase !== 'play' || !game.human.alive) return;
      if (aim) { if (k === 'enter' && !$('aimGo').disabled) fireAim(); return; }
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
        if (item.t === UT.LASER && !game.opts.arsenal) { toast('Den Satellitenstrahl gibt es nur im Arsenal-Modus'); snd('deny'); return; }
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
    $('sheetClose').addEventListener('click', closeBuild);
    $('sheet').addEventListener('click', function (e) { if (e.target === this && performance.now() - sheetAt >= 350) closeBuild(); });
    $('modal').addEventListener('click', function (e) {
      if (e.target === this && (modalKind === 'info' || modalKind === 'menu' || modalKind === 'help' || modalKind === 'confirm')) { closeModal(); return; }
      const b = e.target.closest('[data-act]');
      if (b && !b.disabled) onModalAct(b.dataset.act);
    });
    $('ratio').addEventListener('input', function () { setRatio(+this.value); });
    $('statGold').addEventListener('click', function () { if (game && game.res && game.phase === 'play' && game.human.alive) showIncome(); });
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
    $('ratioPct').textContent = pct + '%';
    if (game && game.human.alive) $('ratioTroops').textContent = fmtT(game.human.troops * ratio);
  }

  // ---------- main loop ----------
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(200, now - last);
    last = now;
    let alpha = 1;
    if (game && (mp ? mp.started : !paused)) {
      const behind = mp ? mp.buf.size : 0;
      acc += dt * (mp ? (behind > 6 ? 8 : behind > 2 ? 2 : 1) : speed);
      let n = 0;
      while (acc >= 100 && n < 8 && game) {
        if (mp) {
          // playing together: only as far as the host's turns allow
          if (turnLeft === 0) {
            const turn = mp.take();
            if (!turn) { acc = 100; break; }
            applyTurn(turn);
            turnLeft = G.TURN;
          }
          turnLeft--;
        }
        game.tick(); acc -= 100; n++;
        if (mp && game.ticks % 100 === 0) mp.sum(game.ticks, game.checksum());
      }
      if (acc >= 100 && !(mp && n === 0)) acc = 0;
      if (n) { view.flush(); view.placeNames(); pump(); if (game) hudTick(); }
      alpha = Math.min(1, acc / 100);
    }
    refreshGhost();
    const held = G.heldKeys;
    if (held && held.size && game && $('modal').hidden) {
      const d = dt * 0.75;
      view.pan(((held.has('a') || held.has('arrowleft') ? 1 : 0) - (held.has('d') || held.has('arrowright') ? 1 : 0)) * d,
        ((held.has('w') || held.has('arrowup') ? 1 : 0) - (held.has('s') || held.has('arrowdown') ? 1 : 0)) * d);
    }
    view.draw(alpha, now);
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
    $('bNet').innerHTML = svg('net', 18);
    $('bMenu').innerHTML = svg('menu', 18);
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
    showStart();
    previewMap(cfg.map);
    last = performance.now();
    requestAnimationFrame(frame);
    G.debug = { get game() { return game; }, get view() { return view; }, get mp() { return mp; }, tap: tap, cfg: cfg, act: act };
  };
})(globalThis.G = globalThis.G || {});
