(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const Game = G.Game, UT = G.UT, PT = G.PT;

  // ---------- campaign «Feldzug» (doku/feldzug.md) ----------
  // A row of levels, each with a map of its own, fixed players, the weapons it allows and one
  // quest. Levels 1-10 teach one thing each; the later ones (still to come) ask for skill.
  // Everything here reads and changes the game only inside the simulation, so a level plays the
  // same on every device, like the rest of the game.

  // ---------- maps from a few shapes ----------
  // A shape: c (circle) x y r, r (rectangle) x0 y0 x1 y1, l (line) x0 y0 x1 y1 w; v is what it
  // paints: 0 water, 1 lowland, 2 highland, 3 mountains. Later shapes paint over earlier ones.
  // `rough` frays the edges by up to that many tiles, so the land does not look drawn with a ruler.
  const circ = function (x, y, r, v) { return { c: 'c', x: x, y: y, r: r, v: v === undefined ? 1 : v }; };
  const rect = function (x0, y0, x1, y1, v) { return { c: 'r', x0: x0, y0: y0, x1: x1, y1: y1, v: v === undefined ? 1 : v }; };
  const line = function (x0, y0, x1, y1, w, v) { return { c: 'l', x0: x0, y0: y0, x1: x1, y1: y1, w: w, v: v === undefined ? 1 : v }; };
  function dist(s, x, y) {
    if (s.c === 'c') return Math.hypot(x - s.x, y - s.y) - s.r;
    if (s.c === 'r') {
      const dx = Math.max(s.x0 - x, x - s.x1), dy = Math.max(s.y0 - y, y - s.y1);
      return dx > 0 && dy > 0 ? Math.hypot(dx, dy) : Math.max(dx, dy);
    }
    const vx = s.x1 - s.x0, vy = s.y1 - s.y0, len = vx * vx + vy * vy;
    const k = len ? G.within(((x - s.x0) * vx + (y - s.y0) * vy) / len, 0, 1) : 0;
    return Math.hypot(x - s.x0 - vx * k, y - s.y0 - vy * k) - s.w / 2;
  }
  G.levelMap = function (def) {
    const m = def.map, W = m.w, H = m.h, cls = new Uint8Array(W * H), fbm = G.makeNoise(m.seed);
    const rough = m.rough === undefined ? 5 : m.rough;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const n = (fbm(x / 18, y / 18, 3) - 0.5) * 2 * rough;
      let v = 0;
      for (const s of m.shapes) if (dist(s, x, y) + (s.sharp ? 0 : n) < 0) v = s.v;
      cls[y * W + x] = v;
    }
    G.cleanupMap(cls, W, H);
    return G.buildMap(W, H, cls, m.seed, { id: 'level' + def.n, name: def.name, nations: [] });
  };

  // ---------- the levels ----------
  // me      where the player starts: x, y and how far around the land is theirs (r, or a box);
  //         without x the player picks a start point as in a normal game
  // foes    nations ({ name, x, y, r or box, troops, ai, build }) and bots ({ bot: 1, x, y, r })
  // allow   what the build bar offers; everything else is locked in this level
  // quest   text, and check(Q) -> { ok, fail, prog (0..1), line (what the bar shows) }
  // par     seconds for two and three stars (or stars(Q) for levels you have to hold out)
  // events  [seconds after the start, function (Q)]: the script of the opponents
  // tips    shown one after the other. They show rather than explain: a few words (text, may be
  //         empty), el (a CSS selector to point at), pins(Q, last) (tiles that get a marker pin
  //         on the map), mark ('pop': the spot on the troop bar where troops grow fastest),
  //         when(Q). The tips are only drawn, they never change the game.
  // goal    [x, y]: a ring on the map that marks the target
  const hot = function (t) { return '#hotbar [data-t="' + t + '"]'; };
  G.LEVEL_PACE = 0.67;   // pace of fronts in a level, as on the world map (S of «Welt»)
  G.levelShape = { circ: circ, rect: rect, line: line };   // for the scenes of «Änderungen» (src/03e_neu.js)
  const LEVELS = G.LEVELS = [
    {
      n: 1, name: 'Lichtung', learn: 'Startpunkt und Ausbreiten',
      map: { w: 280, h: 200, seed: 101, shapes: [circ(140, 100, 78), circ(92, 72, 40), circ(190, 128, 42), circ(172, 66, 18, 2), circ(100, 130, 12, 2)] },
      me: { troops: 25000, gold: 0 }, foes: [], allow: [],
      quest: {
        text: 'Halte die Hälfte der Insel.',
        check: function (Q) { const s = Q.share(Q.me); return { ok: s >= 0.5, prog: s / 0.5, line: Q.pct(s) + ' von 50 %' }; }
      },
      par: [90, 60],
      tips: [
        { text: '', pins: function (Q) { return [Q.g.levelTile(140, 100)]; }, when: function (Q) { return Q.g.phase === 'spawn'; } },
        { text: 'Tippe auf freies Land.', pins: function (Q, last) { return Q.frontier(3, last); }, when: function (Q) { return Q.g.phase === 'play' && Q.share(Q.me) < 0.05; } },
        { text: 'So viele Truppen ziehen los.', el: '#ratio', when: function (Q) { return Q.share(Q.me) >= 0.05; } },
        { text: 'Hier wachsen sie am schnellsten.', el: '#popBar', mark: 'pop', when: function (Q) { return Q.share(Q.me) >= 0.12; } }
      ]
    },
    {
      n: 2, name: 'Kornkammer', learn: 'Land, Städte und Wachstum',
      map: { w: 300, h: 200, seed: 212, shapes: [circ(150, 100, 84), circ(85, 80, 40), circ(220, 125, 45), circ(110, 150, 14, 2), circ(200, 55, 16, 2)] },
      me: { x: 150, y: 100, r: 6, troops: 20000, gold: 125000 }, foes: [],
      allow: [UT.CITY],
      quest: {
        text: 'Erreiche 40K Truppen.',
        check: function (Q) { const t = Q.me.troops; return { ok: t >= 400000, prog: t / 400000, line: G.fmtTroops(t) + ' von 40K' }; }
      },
      par: [100, 70],
      tips: [
        { text: 'Mehr Land, mehr Truppen.', el: '#popTxt', pins: function (Q, last) { return Q.frontier(3, last); }, when: function (Q) { return Q.me.tiles < 1500; } },
        { text: 'Städte bringen mehr Truppen.', el: hot(UT.CITY), pins: function (Q) { return Q.built(Q.me, UT.CITY) ? [] : [Q.g.levelTile(150, 100, Q.me)]; }, when: function (Q) { return Q.me.tiles >= 1500 && !Q.built(Q.me, UT.CITY); } },
        { text: 'Weniger losschicken, schneller wachsen.', el: '#popBar', mark: 'pop', when: function (Q) { return Q.secs > 30 || Q.built(Q.me, UT.CITY) > 0; } }
      ]
    },
    {
      n: 3, name: 'Hügelland', learn: 'Bots erobern und Gold',
      map: { w: 300, h: 200, seed: 202, shapes: [circ(150, 100, 86), circ(80, 90, 52), circ(225, 110, 55), circ(160, 40, 26, 2), circ(150, 160, 22, 2)] },
      me: { x: 70, y: 95, r: 9, troops: 30000, gold: 0 },
      foes: [{ bot: 1, x: 130, y: 60, r: 8 }, { bot: 1, x: 140, y: 140, r: 8 }, { bot: 1, x: 190, y: 85, r: 8 }, { bot: 1, x: 200, y: 140, r: 8 }, { bot: 1, x: 250, y: 75, r: 8 }, { bot: 1, x: 260, y: 130, r: 8 }],
      allow: [],
      quest: {
        text: 'Erobere 4 Bots ganz.',
        check: function (Q) { const n = Q.beaten(PT.BOT); return { ok: n >= 4, prog: n / 4, line: n + ' von 4 Bots' }; }
      },
      par: [130, 90],
      tips: [
        { text: 'Bots bringen Gold.', pins: function (Q) { return Q.realms(PT.BOT, 3); } }
      ]
    },
    {
      n: 4, name: 'Flusstal', learn: 'Fabrik und Ausbau',
      map: { w: 300, h: 200, seed: 303, shapes: [rect(20, 20, 280, 180), line(150, 0, 140, 60, 6, 0), line(140, 60, 158, 120, 6, 0), line(158, 120, 150, 150, 5, 0), circ(240, 60, 18, 2)] },
      me: { x: 80, y: 100, r: 20, troops: 40000, gold: 700000 },
      foes: [{ bot: 1, x: 70, y: 40, r: 9 }, { bot: 1, x: 210, y: 140, r: 10 }, { bot: 1, x: 230, y: 60, r: 9 }],
      allow: [UT.CITY, UT.FACTORY],
      quest: {
        text: 'Baue 2 Städte und 1 Fabrik und baue eine Stadt auf Stufe 2 aus.',
        check: function (Q) {
          const c = Q.built(Q.me, UT.CITY), f = Q.built(Q.me, UT.FACTORY), up = Q.me.units.some(function (u) { return u.type === UT.CITY && u.level >= 2; });
          const n = Math.min(2, c) + Math.min(1, f) + (up ? 1 : 0);
          return { ok: n >= 4, prog: n / 4, line: 'Städte ' + Math.min(2, c) + '/2 · Fabrik ' + Math.min(1, f) + '/1 · Ausbau ' + (up ? '1' : '0') + '/1' };
        }
      },
      par: [140, 100],
      tips: [
        { text: 'Zwei Städte bauen.', el: hot(UT.CITY), when: function (Q) { return Q.built(Q.me, UT.CITY) < 2; } },
        { text: 'Fabrik: Züge bringen Gold.', el: hot(UT.FACTORY), when: function (Q) { return Q.built(Q.me, UT.CITY) >= 1 && !Q.built(Q.me, UT.FACTORY); } },
        { text: 'Stadt antippen, ausbauen.', pins: function (Q) { return Q.units(Q.me, UT.CITY, 1); }, when: function (Q) { return Q.built(Q.me, UT.CITY) >= 2; } }
      ]
    },
    {
      n: 5, name: 'Engpass', learn: 'Gezielter Stoss mit Keil', diff: 0,
      map: { w: 340, h: 180, seed: 404, rough: 4, shapes: [rect(10, 30, 330, 150), circ(250, 60, 16, 2), circ(200, 125, 14, 2)] },
      me: { x: 45, y: 90, box: [0, 0, 80, 180], troops: 90000, gold: 0 },
      foes: [{ name: 'Morvanien', x: 300, y: 90, box: [80, 0, 340, 180], troops: 70000, build: [[UT.CITY, 312, 90]] }],
      allow: [],
      goal: [312, 90],
      quest: {
        text: 'Erreiche die Hauptstadt von Morvanien in 3 Minuten.',
        check: function (Q) {
          const d = Q.reach(Q.me, 312, 90);
          return { ok: d <= 3, prog: G.within(1 - (d - 3) / 230, 0, 1), line: 'Noch ' + Math.max(0, d - 3) + ' Felder' };
        }
      },
      limit: 180, par: [140, 100],
      tips: [
        { text: 'Rechts ziehen: ein schneller Stoss.', el: '#modes' },
        { text: 'Stockt er? Pfeil antippen, Verstärken.', when: function (Q) { return Q.secs > 40; } }
      ]
    },
    {
      n: 6, name: 'Passhöhe', learn: 'Verteidigung und Gelände',
      map: { w: 320, h: 200, seed: 505, rough: 4, shapes: [rect(10, 10, 310, 190), line(160, 0, 160, 82, 18, 3), line(160, 118, 160, 200, 18, 3), line(150, 82, 150, 118, 10, 2)] },
      me: { x: 70, y: 100, box: [0, 0, 160, 200], troops: 60000, gold: 400000 },
      foes: [{ name: 'Pellgard', x: 260, y: 100, box: [160, 0, 320, 200], troops: 160000 }],
      allow: [UT.DEFENSE, UT.CITY],
      goal: [150, 100],
      quest: {
        text: 'Halte den Pass 2½ Minuten. Verliere höchstens 15 % Land.',
        check: function (Q) {
          const keep = Q.me.tiles / Q.start.tiles;
          return { ok: Q.secs >= 150, fail: keep < 0.85 ? 'Pellgard ist durchgebrochen' : '', prog: Q.secs / 150, line: 'Noch ' + Q.clock(150 - Q.secs) + ' · ' + Q.pct(Math.min(1, keep)) + ' Land' };
        }
      },
      stars: function (Q) { const k = Q.me.tiles / Q.start.tiles; return k >= 1 ? 3 : k >= 0.95 ? 2 : 1; },
      starText: ['Pass gehalten', 'Höchstens 5 % Land verloren', 'Kein Feld verloren'],
      events: [
        [18, function (Q) { Q.push(Q.foe[0], Q.me, 0.4, 60, 100, 2); }],
        [65, function (Q) { Q.push(Q.foe[0], Q.me, 0.45, 60, 100, 2); }],
        [110, function (Q) { Q.push(Q.foe[0], Q.me, 0.5, 60, 100, 1); }]
      ],
      tips: [
        { text: 'Posten an den Pass.', el: hot(UT.DEFENSE), pins: function (Q) { return Q.built(Q.me, UT.DEFENSE) ? [] : [Q.g.levelTile(150, 100, Q.me)]; } },
        { text: 'Hol dir das Land zurück.', when: function (Q) { return Q.me.tiles < Q.start.tiles; } },
        { text: 'Truppen an die Grenze ziehen.', el: '#bNet', when: function (Q) { return Q.secs > 30 && Q.g.netz && !!Q.me.post; } }
      ]
    },
    {
      n: 7, name: 'Archipel', learn: 'Boote und Hafen',
      map: { w: 320, h: 200, seed: 606, shapes: [circ(80, 100, 56), circ(245, 100, 52), circ(165, 30, 14), circ(170, 175, 12)] },
      me: { x: 80, y: 100, r: 60, troops: 50000, gold: 300000 },
      foes: [{ bot: 1, x: 230, y: 70, r: 10 }, { bot: 1, x: 260, y: 130, r: 10 }],
      allow: [UT.PORT, UT.CITY],
      goal: [245, 100],
      quest: {
        text: 'Halte 75 % der Insel rechts.',
        check: function (Q) { const s = Q.islandShare(Q.me, 245, 100); return { ok: s >= 0.75, prog: s / 0.75, line: Q.pct(s) + ' von 75 %' }; }
      },
      par: [110, 75],
      tips: [
        { text: 'Ufer antippen: Boot.', pins: function (Q) { return [Q.g.levelTile(196, 100)]; }, when: function (Q) { return Q.islandShare(Q.me, 245, 100) < 0.02; } },
        { text: 'Hafen: Handel bringt Gold.', el: hot(UT.PORT), when: function (Q) { return Q.secs > 25; } }
      ]
    },
    {
      n: 8, name: 'Meerenge', learn: 'Kriegsschiffe',
      map: { w: 320, h: 200, seed: 707, rough: 4, shapes: [rect(0, 0, 320, 64), rect(0, 136, 320, 200), circ(160, 100, 9)] },
      me: { x: 70, y: 175, box: [0, 120, 160, 200], troops: 60000, gold: 800000, build: [[UT.PORT, 80, 140]] },
      foes: [{ name: 'Quellmark', x: 160, y: 25, box: [0, 0, 320, 80], troops: 120000 }],
      allow: [UT.WARSHIP, UT.PORT],
      quest: {
        text: 'Versenke die Kriegsschiffe von Quellmark.',
        check: function (Q) {
          if (Q.secs < 2) return { ok: false, prog: 0, line: 'Die Flotte läuft aus' };
          const n = Q.ships(Q.foe[0]);
          return { ok: n === 0, prog: (2 - n) / 2, line: (2 - n) + ' von 2 versenkt' };
        }
      },
      par: [100, 65],
      events: [
        [0, function (Q) { Q.ship(Q.foe[0], 120, 80); Q.ship(Q.foe[0], 220, 80); }],
        [40, function (Q) { Q.boat(Q.foe[0], 110, 140, 15000); }],
        [90, function (Q) { Q.boat(Q.foe[0], 140, 140, 20000); }]
      ],
      tips: [
        { text: 'Kriegsschiff bauen.', el: hot(UT.WARSHIP), when: function (Q) { return Q.ships(Q.me) < 1; } },
        { text: 'Zwei gegen eins gewinnt.', pins: function (Q) { return Q.units(Q.foe[0], UT.WARSHIP, 2); }, when: function (Q) { return Q.ships(Q.me) >= 1; } },
        { text: 'Boote abfangen!', pins: function (Q) { return Q.units(Q.foe[0], UT.TRANSPORT, 2); }, when: function (Q) { return Q.secs > 38; } }
      ]
    },
    {
      n: 9, name: 'Festung', learn: 'Raketensilo und Atombombe',
      map: { w: 320, h: 200, seed: 808, rough: 4, shapes: [rect(10, 15, 310, 185), circ(255, 100, 30, 2)] },
      me: { x: 60, y: 100, box: [0, 0, 120, 200], troops: 50000, gold: 3900000 },
      foes: [{ name: 'Rabenstein', x: 255, y: 100, box: [120, 0, 320, 200], troops: 400000, build: [[UT.CITY, 255, 92], [UT.CITY, 249, 104], [UT.CITY, 262, 106]] }],
      allow: [UT.SILO, UT.ATOM, UT.CITY],
      goal: [255, 100],
      quest: {
        text: 'Zerstöre die drei Städte von Rabenstein.',
        check: function (Q) { const n = Q.built(Q.foe[0], UT.CITY); return { ok: n === 0, prog: (3 - n) / 3, line: (3 - n) + ' von 3 zerstört' }; }
      },
      par: [60, 35],
      tips: [
        { text: 'Raketensilo bauen.', el: hot(UT.SILO), pins: function (Q) { return [Q.g.levelTile(40, 100, Q.me)]; }, when: function (Q) { return !Q.built(Q.me, UT.SILO); } },
        { text: 'Atombombe auf die Städte.', el: hot(UT.ATOM), when: function (Q) { return Q.built(Q.me, UT.SILO) >= 1; } }
      ]
    },
    {
      n: 10, name: 'Schutzschirm', learn: 'Flugabwehr',
      map: { w: 320, h: 200, seed: 909, rough: 4, shapes: [rect(10, 20, 140, 180), rect(190, 20, 310, 180)] },
      me: { x: 70, y: 100, box: [0, 0, 160, 200], troops: 60000, gold: 4600000, build: [[UT.CITY, 62, 92], [UT.CITY, 78, 92], [UT.CITY, 62, 108], [UT.CITY, 78, 108]] },
      foes: [{ name: 'Nordheim', x: 260, y: 100, box: [160, 0, 320, 200], troops: 200000, build: [[UT.SILO, 280, 100, 2]] }],
      allow: [UT.SAM, UT.CITY, UT.DEFENSE],
      quest: {
        text: 'Behalte 3 deiner 4 Städte, 2½ Minuten lang.',
        check: function (Q) {
          const n = Q.built(Q.me, UT.CITY);
          return { ok: Q.secs >= 150, fail: n < 3 ? 'Zu viele Städte zerstört' : '', prog: Q.secs / 150, line: 'Noch ' + Q.clock(150 - Q.secs) + ' · ' + n + ' Städte' };
        }
      },
      stars: function (Q) { return Q.built(Q.me, UT.CITY) < 4 ? 1 : Q.hit ? 2 : 3; },
      starText: ['3 Städte gehalten', 'Alle 4 Städte gehalten', 'Keine Bombe hat dein Land getroffen'],
      events: [
        [40, function (Q) { Q.nukeCity(Q.foe[0], Q.me); }],
        [70, function (Q) { Q.nukeCity(Q.foe[0], Q.me); }],
        [100, function (Q) { Q.nukeCity(Q.foe[0], Q.me); Q.nukeCity(Q.foe[0], Q.me); }],
        [130, function (Q) { Q.nukeCity(Q.foe[0], Q.me); Q.nukeCity(Q.foe[0], Q.me); }]
      ],
      tips: [
        { text: 'Bomben kommen. Flugabwehr bauen.', el: hot(UT.SAM), pins: function (Q) { return Q.built(Q.me, UT.SAM) ? [] : [Q.g.levelTile(70, 100, Q.me)]; } },
        { text: 'Zwei auf einmal? Zweite Flugabwehr.', el: hot(UT.SAM), when: function (Q) { return Q.secs > 75; } }
      ]
    },
    {
      n: 11, name: 'Raketenkette', learn: 'Marschflugkörper und Salven',
      map: { w: 320, h: 200, seed: 1010, rough: 4, shapes: [rect(10, 20, 140, 180), rect(180, 20, 310, 180)] },
      me: { x: 60, y: 100, box: [0, 0, 160, 200], troops: 60000, gold: 3500000, build: [[UT.SILO, 90, 100, 3]] },
      foes: [{ name: 'Tessmark', x: 270, y: 100, box: [160, 0, 320, 200], troops: 200000, build: [[UT.SAM, 210, 100], [UT.SAM, 245, 100], [UT.SILO, 270, 100], [UT.SAM, 278, 92]] }],
      allow: [UT.CRUISE, UT.ATOM, UT.HYDRO, UT.SILO],
      goal: [270, 100],
      quest: {
        text: 'Zerstöre das Raketensilo von Tessmark.',
        check: function (Q) { const n = Q.built(Q.foe[0], UT.SILO); return { ok: n === 0, prog: 1 - Q.built(Q.foe[0], UT.SAM) / 6 - n / 2, line: Q.built(Q.foe[0], UT.SAM) + ' Flugabwehren stehen noch' }; }
      },
      par: [150, 90],
      tips: [
        { text: 'Marschflugkörper fliegen tief.', el: hot(UT.CRUISE) },
        { text: 'Zwei Schüsse aufs selbe Ziel.', pins: function (Q) { return Q.front(Q.foe[0], UT.SAM); }, when: function (Q) { return Q.secs > 10; } }
      ]
    }
  ];
  for (const L of LEVELS) {
    if (!L.starText && L.par) L.starText = ['Geschafft', 'Unter ' + clock(L.par[0]), 'Unter ' + clock(L.par[1])];
  }
  function clock(s) { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
  G.levelClock = clock;
  // A level or a scene of «Änderungen» (G.NEUES, src/03e_neu.js, numbers from 101) by its number.
  G.levelDef = function (n) {
    return LEVELS.find(function (L) { return L.n === n; }) || (G.NEUES || []).find(function (L) { return L.n === n; });
  };

  // ---------- setting a level up ----------
  // The tile of land nearest to x, y (owned by p, if given), searched in growing squares.
  Game.prototype.levelTile = function (x, y, p) {
    const W = this.W, H = this.H, land = this.map.land;
    x = Math.round(x); y = Math.round(y);
    for (let r = 0; r < 40; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const t = yy * W + xx;
        if (land[t] && (!p || this.owner[t] === p.id)) return t;
      }
    }
    return -1;
  };
  // Start a realm at x, y and give it the free land around: a circle (r) or a box [x0, y0, x1, y1].
  Game.prototype.levelClaim = function (p, d) {
    const t = this.levelTile(d.x, d.y);
    if (t < 0 || !this.spawn(p, t)) return;
    const W = this.W, H = this.H, land = this.map.land;
    if (d.box) {
      for (let y = Math.max(0, d.box[1]); y < Math.min(H, d.box[3]); y++) for (let x = Math.max(0, d.box[0]); x < Math.min(W, d.box[2]); x++) {
        const i = y * W + x;
        if (land[i] && !this.owner[i]) this.conquer(p, i);
      }
    } else if (d.r) {
      const cx = t % W, cy = (t / W) | 0;
      for (let y = Math.max(0, cy - d.r); y <= Math.min(H - 1, cy + d.r); y++) for (let x = Math.max(0, cx - d.r); x <= Math.min(W - 1, cx + d.r); x++) {
        const i = y * W + x;
        if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= d.r * d.r && land[i] && !this.owner[i]) this.conquer(p, i);
      }
    }
  };
  // A building that is already there when the level starts.
  Game.prototype.levelPlace = function (p, type, x, y, level) {
    // 4.5: the missile defence of «Langes Spiel» (air defence class 1)
    const cls = type === 4.5 || type === 3.5 ? 1 : type === 4.7 ? 2 : 0;   // 4.7: the radar, 3.5: the airfield
    if (cls) type = type === 3.5 ? UT.SILO : UT.SAM;
    let t = this.levelTile(x, y, p);
    if (t < 0) return null;
    if (type === UT.PORT) { t = this.portSite(p, t); if (t < 0) return null; }
    const u = this.newUnit(type, p, t);
    u.level = level || 1;
    if (type === UT.PORT) u.water = this.portWater(t);
    if ((type === UT.SAM || type === UT.SILO) && this.lang && cls) u.cls = cls;
    this.addUnit(u);
    this.finishBuild(u);
    if (u.ready) { u.ready.length = 0; for (let i = 0; i < u.level; i++) u.ready.push(0); }
    if (type === UT.SAM && this.lang) this.samSlots(u);
    return u;
  };

  Game.prototype.levelSetup = function (human) {
    const def = G.levelDef(this.opts.level);
    const people = Array.isArray(human) ? human : [human];
    const me = this.addPlayer({ name: people[0].name, type: PT.HUMAN, color: people[0].color });
    this.humans.push(me); this.human = me; this.names.add(me.name);
    me.troops = def.me.troops; me.gold = def.me.gold;
    // «Langes Spiel»: a scene shows its change at once, so the player has everything researched
    if (this.lang && def.show && !def.research && G.TECH) { me.tech = {}; for (const t of G.TECH) me.tech[t.id] = 1; }
    // level maps are small, so S (and with it the pace of every front) sits at its floor of 0.4;
    // a level runs at the pace of the world map instead, else spreading out feels sluggish
    this.attackPace = Math.max(this.attackPace, G.LEVEL_PACE * G.PACE.attack);
    const foes = [];
    for (const f of def.foes) {
      const p = f.bot ? this.addPlayer({ name: this.botName(), type: PT.BOT }) : this.addPlayer({ name: f.name, type: PT.NATION, strength: f.strength || 1 });
      if (!f.bot) this.names.add(f.name);
      this.levelClaim(p, f);
      if (f.troops) p.troops = f.troops;
      if (f.gold) p.gold = f.gold;
      if (f.bot || f.ai) p.ai = new G.AI(this, p);
      foes.push(p);
    }
    if (def.me.x !== undefined) this.levelClaim(me, def.me);
    // buildings come last, once every realm has its land
    for (let i = 0; i < def.foes.length; i++) for (const b of def.foes[i].build || []) this.levelPlace(foes[i], b[0], b[1], b[2], b[3]);
    for (const b of def.me.build || []) this.levelPlace(me, b[0], b[1], b[2], b[3]);
    // «Langes Spiel»: the realms of a level or scene are at war with the player from the start (an
    // alliance in its script ends that again), so ships and fighters fight at once
    if (this.lang) for (const f of foes) this.declareWar(me, f, true);
    this.lv = { def: def, foes: foes, fired: 0, tip: 0, over: false, result: null, check: null, start: null, hit: false, goal: def.goal ? this.levelTile(def.goal[0], def.goal[1]) : -1, isle: new Map() };
    this.lv.Q = this.levelQ();
  };

  // ---------- what the quests and the script can ask and do ----------
  Game.prototype.levelQ = function () {
    const g = this, lv = this.lv;
    const Q = {
      g: g, me: g.human, foe: lv.foes, secs: 0, start: null, hit: false,
      tile: function (x, y) { return Math.round(y) * g.W + Math.round(x); },
      share: function (p) { return p.tiles / Math.max(1, g.map.landTiles - g.falloutCount); },
      pct: function (s) { return Math.round(Math.min(1, s) * 100) + ' %'; },
      clock: clock,
      // realms of a kind that no longer exist
      beaten: function (type) { let n = 0; for (let i = 1; i < g.players.length; i++) { const p = g.players[i]; if (p.type === type && p.spawned && !p.alive) n++; } return n; },
      built: function (p, type) { let n = 0; for (const u of p.units) if (u.type === type && u.active && u.built) n++; return n; },
      // how far (in tiles) the land of p is from x, y at its nearest point
      reach: function (p, x, y) {
        let best = 1e9;
        for (const b of p.border) { const d = Math.hypot(b % g.W - x, ((b / g.W) | 0) - y); if (d < best) best = d; }
        return Math.round(best);
      },
      // ---- only for the pins of the tips (src/07b_level.js): they read, never change ----
      // up to n free tiles just beyond the own border, spread around it; pins in `last` that still
      // stand on free land stay where they are
      frontier: function (n, last) {
        const W = g.W, own = g.owner, land = g.map.land, me = g.human;
        const keep = (last || []).filter(function (t) { return land[t] && !own[t]; });
        if (keep.length >= n || !me.border.size) return keep.slice(0, n);
        let cx = 0, cy = 0, k = 0;
        for (const b of me.border) { cx += b % W; cy += (b / W) | 0; k++; }
        cx /= k; cy /= k;
        const cand = [];
        for (const b of me.border) for (const t of [b - 1, b + 1, b - W, b + W]) if (t >= 0 && t < g.N && land[t] && !own[t]) cand.push(t);
        const out = keep.slice();
        while (out.length < n && cand.length) {
          let best = -1, bd = -1e18;
          for (const t of cand) {
            let d = 1e9;
            for (const o of out) d = Math.min(d, Math.hypot(t % W - o % W, ((t / W) | 0) - ((o / W) | 0)));
            if (!out.length) d = -Math.hypot(t % W - cx, ((t / W) | 0) - cy + 1e3);   // first pin: the top of the border
            if (d > bd) { bd = d; best = t; }
          }
          if (out.length && bd < 8) break;
          // a few tiles further out, so the pin stands clearly on the free land
          let t = best;
          const dx = t % W - cx, dy = ((t / W) | 0) - cy, l = Math.hypot(dx, dy) || 1;
          for (let s = 6; s > 0; s--) {
            const x = Math.round(t % W + dx / l * s), y = Math.round(((t / W) | 0) + dy / l * s), u = y * W + x;
            if (x >= 0 && y >= 0 && x < W && y < g.H && land[u] && !own[u]) { t = u; break; }
          }
          out.push(t);
        }
        return out;
      },
      // a tile in the middle of each living realm of a kind (at most n)
      realms: function (type, n) {
        const W = g.W, out = [];
        for (let i = 1; i < g.players.length && out.length < n; i++) {
          const p = g.players[i];
          if (!p || p.type !== type || !p.alive || !p.border.size) continue;
          let x = 0, y = 0, k = 0;
          for (const b of p.border) { x += b % W; y += (b / W) | 0; k++; }
          const t = g.levelTile(x / k, y / k, p);
          if (t >= 0) out.push(t);
        }
        return out;
      },
      // where p's units of a kind are (at most n)
      units: function (p, type, n) {
        const out = [];
        for (const u of p.units) if (u.type === type && u.active && out.length < n) out.push(u.tile);
        return out;
      },
      // the unit of a kind nearest to the player (the front of a chain)
      front: function (p, type) {
        let best = null;
        for (const u of p.units) if (u.type === type && u.active && (!best || u.x < best.x)) best = u;
        return best ? [best.tile] : [];
      },
      ships: function (p) { let n = 0; for (const u of p.units) if (u.type === UT.WARSHIP && u.active) n++; return n; },
      // share of one island (the land connected to x, y) that p holds
      islandShare: function (p, x, y) {
        const key = Q.tile(x, y);
        let isle = lv.isle.get(key);
        if (!isle) {
          const W = g.W, H = g.H, land = g.map.land, seen = new Uint8Array(g.N), list = [], s = g.levelTile(x, y);
          if (s >= 0) { seen[s] = 1; list.push(s); }
          for (let i = 0; i < list.length; i++) {
            const t = list[i], tx = t % W, ty = (t / W) | 0;
            if (tx > 0 && land[t - 1] && !seen[t - 1]) { seen[t - 1] = 1; list.push(t - 1); }
            if (tx < W - 1 && land[t + 1] && !seen[t + 1]) { seen[t + 1] = 1; list.push(t + 1); }
            if (ty > 0 && land[t - W] && !seen[t - W]) { seen[t - W] = 1; list.push(t - W); }
            if (ty < H - 1 && land[t + W] && !seen[t + W]) { seen[t + W] = 1; list.push(t + W); }
          }
          isle = list; lv.isle.set(key, isle);
        }
        let n = 0;
        for (const t of isle) if (g.owner[t] === p.id) n++;
        return n / Math.max(1, isle.length);
      },
      // the script: build or fire something for an opponent (the gold is topped up), attack, send a boat
      fire: function (p, type, x, y) { const t = type === UT.WARSHIP ? Q.tile(x, y) : g.levelTile(x, y); if (t < 0) return null; const c = g.buildCheck(p, type, t); p.gold += Math.max(g.cost(p, type), c.cost || 0); return g.build(p, type, t); },
      push: function (p, q, share, x, y, mode) { if (p.alive && q.alive) g.attack(p, q.id, p.troops * share, -1, g.levelTile(x, y, q), mode || 0); },
      // a warship that is simply there, at sea (without a port of its own it cannot be repaired)
      ship: function (p, x, y, cls) {
        const t = Q.tile(x, y);
        if (g.map.land[t]) return null;
        const u = g.newUnit(UT.WARSHIP, p, t);
        u.cls = cls === true ? 1 : cls | 0;   // «Langes Spiel» also 2 submarine, 3 carrier
        u.hp = G.SHIP_CLASS ? G.SHIP_CLASS[u.cls].hp : 1000; u.patrol = t; u.shotAt = 0; u.target = null; u.path = null; u.pi = 0; u.wait = false;
        if (g.lang) g.langShip(u);
        g.addUnit(u);
        return u;
      },
      boat: function (p, x, y, troops) {
        if (!p.alive) return;
        const plan = g.boatPlan(p, g.levelTile(x, y));
        if (plan) { p.troops += troops; g.sendBoat(p, plan, troops); }
      },
      // an atom bomb on one of q's cities, picked in turn
      nukeCity: function (p, q) {
        const cs = q.units.filter(function (u) { return u.type === UT.CITY && u.active; });
        if (!cs.length || !p.alive) return;
        const u = cs[(lv.fired++) % cs.length];
        Q.fire(p, UT.ATOM, u.x, u.y);
      }
    };
    return Q;
  };

  // Is this kind of thing unlocked in the level being played?
  // A scene of «Änderungen» in the mode «Langes Spiel» allows everything (its weapons, planes and
  // ships are many and new; the player is meant to try them).
  Game.prototype.levelAllows = function (type) { return !this.lv || this.lv.def.allow.indexOf(type) >= 0 || (this.lang && !!this.lv.def.show); };

  // Every half second while a level runs: the script, the quest, the end.
  Game.prototype.levelTick = function () {
    const lv = this.lv, def = lv.def, Q = lv.Q, me = this.human;
    if (lv.over || this.phase !== 'play') return;
    Q.secs = (this.ticks - this.playStart) / 10;
    if (!Q.start) Q.start = { tiles: Math.max(1, me.tiles) };
    if (me.tiles < (lv.lastTiles || 0) && this.falloutCount > (lv.lastFall || 0)) Q.hit = true;   // a bomb took some of the land
    lv.lastTiles = me.tiles; lv.lastFall = this.falloutCount;
    const ev = def.events || [];
    while ((lv.ev || 0) < ev.length && Q.secs >= ev[lv.ev || 0][0]) { const e = ev[lv.ev || 0]; lv.ev = (lv.ev || 0) + 1; e[1](Q); }
    // a scene of «Änderungen» repeats its script (loop: [first second, every so many seconds, function])
    // and never ends: it is there to be watched and played with
    if (def.loop && Q.secs >= (lv.loopAt === undefined ? def.loop[0] : lv.loopAt)) { lv.loopAt = Q.secs + def.loop[1]; lv.loops = (lv.loops || 0) + 1; def.loop[2](Q, lv.loops); }
    if (def.show) { lv.check = { ok: false, prog: 0, line: '' }; return; }
    const r = def.quest.check(Q);
    lv.check = r;
    let end = null;
    if (!me.alive) end = { win: false, why: 'Dein Gebiet wurde erobert' };
    else if (r.ok) end = { win: true };
    else if (r.fail) end = { win: false, why: r.fail };
    else if (def.limit && Q.secs >= def.limit) end = { win: false, why: 'Die Zeit ist abgelaufen' };
    if (!end) return;
    end.secs = Q.secs;
    end.stars = !end.win ? 0 : def.stars ? def.stars(Q) : 1 + (Q.secs <= def.par[0] ? 1 : 0) + (Q.secs <= def.par[1] ? 1 : 0);
    lv.over = true; lv.result = end;
    this.emit({ k: 'quest', win: end.win, stars: end.stars, secs: end.secs, why: end.why || '' });
  };
})(globalThis.G = globalThis.G || {});
