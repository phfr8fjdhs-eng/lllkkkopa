(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const UT = G.UT;

  // ---------- «Änderungen»: every change as a little scene (doku/neuheiten.md) ----------
  // A scene is a level without a quest (show: true): a small map of its own, a script that makes
  // the change happen at once (a ship sails, a bomb falls, a front moves), a line at the bottom
  // that says what changed, and the player can join in at any time. It never ends. The list on
  // screen (src/07c_neu.js) shows the newest first. Numbers from 101, so they never meet a level.
  // Fields as in G.LEVELS (src/03d_level.js), and:
  //   date   when the change came (dd.mm.yyyy), title   what it is called in the list
  //   text   one or two sentences: what is new, said plainly (shown at the bottom while it runs)
  //   loop   [first second, every n seconds, function (Q, k)]: the part of the script that repeats
  //   arsenal  the scene needs the «Arsenal» mode
  // A new change gets a scene here (at the top of the list), see CLAUDE.md.
  const S = G.levelShape, circ = S.circ, rect = S.rect;
  const hot = function (t) { return '#hotbar [data-t="' + t + '"]'; };
  const ALL = [UT.CITY, UT.DEFENSE, UT.PORT, UT.SILO, UT.SAM, UT.FACTORY, UT.WARSHIP, UT.ATOM, UT.HYDRO, UT.MIRV, UT.CRUISE];
  const none = { text: '', check: function () { return { ok: false, prog: 0, line: '' }; } };
  // two coasts, open sea between them
  const STRAIT = { w: 300, h: 200, rough: 4, shapes: [rect(0, 0, 300, 46), rect(0, 154, 300, 200)] };
  // the own cells (of the troop net) from column x0 on get weight v: the land there turns darker
  function thick(Q, x0, v) {
    const g = Q.g, me = Q.me, CS = G.POST.cell, ids = [], vals = [];
    if (!me.post) return;
    for (const c of me.post.cells.values()) if ((c.id % g.CW) * CS >= x0) { ids.push(c.id); vals.push(v); }
    g.postPaint(me, ids, vals);
  }

  G.NEUES = [
    {
      n: 116, date: '25.11.2026', title: 'Neues Zeichen für die Wasserstoffbombe',
      text: 'Die Wasserstoffbombe sieht jetzt aus wie eine grosse, schwere Atombombe, nach dem Vorbild der Zar-Bombe. Vorher war sie ein Stern.',
      map: { w: 300, h: 200, seed: 916, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 2000000 },
      foes: [], allow: ALL, quest: none,
      tips: [{ text: 'Das neue Zeichen der Wasserstoffbombe.', el: hot(UT.HYDRO) }]
    },
    {
      n: 115, date: '24.11.2026', title: 'Knopf «?» mit allen Kürzeln',
      text: 'Oben rechts zeigt der Knopf «?» alle Tasten auf einen Blick. Die Bau-Tasten sind neu verteilt und stehen auch auf der Bauleiste.',
      map: { w: 300, h: 200, seed: 915, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 2000000 },
      foes: [], allow: ALL, quest: none,
      tips: [{ text: 'Hier sind alle Kürzel.', el: '#bKeys' }]
    },
    {
      n: 114, date: '24.11.2026', title: 'Schnell verdichten',
      text: 'Truppen verdichten geht jetzt ohne Fenster: Taste V halten (Shift + V dünnt aus), am Handy die Knöpfe + und − am Rand oder doppelt tippen und ziehen. Hier wird die Front alle paar Sekunden dichter und wieder dünner.',
      map: { w: 300, h: 200, seed: 914, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 300000 },
      foes: [{ name: 'Brenn', x: 230, y: 100, box: [150, 0, 300, 200], troops: 70000 }],
      allow: ALL, quest: none,
      loop: [1, 8, function (Q, k) { thick(Q, 112, k % 2 ? 4 : 1); }],
      tips: [{ text: '', el: '#brMore' }]
    },
    {
      n: 101, date: '24.11.2026', title: 'Ruhige Dichte',
      text: 'Wo mehr Truppen stehen, ist das Land dunkler, hier an deiner Front. Neu ist das geglättet und hat nur drei Stufen: Es flackert nicht mehr bei jedem Marsch, auch nicht bei den Nationen.',
      map: { w: 300, h: 200, seed: 901, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 300000 },
      foes: [{ name: 'Varnholm', x: 230, y: 100, box: [150, 0, 300, 200], troops: 90000, ai: 1 }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { thick(Q, 112, 4); }]],
      loop: [8, 25, function (Q) { Q.push(Q.foe[0], Q.me, 0.12, 150, 100); }]
    },
    {
      n: 102, date: '24.11.2026', title: 'Schlachtschiff fährt flüssig',
      text: 'Das Schlachtschiff (gross) gleitet jetzt gleichmässig übers Wasser, im Tempo des Spiels, statt Feld für Feld zu springen. Daneben ein Zerstörer zum Vergleich.',
      map: Object.assign({ seed: 902 }, STRAIT),
      me: { x: 150, y: 180, box: [0, 150, 300, 200], troops: 60000, gold: 2000000, build: [[UT.PORT, 150, 156]] },
      foes: [{ name: 'Quellmark', x: 150, y: 20, box: [0, 0, 300, 50], troops: 60000 }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.ship(Q.me, 90, 100, 1); Q.ship(Q.me, 210, 100, 0); }]],
      tips: [{ text: '', pins: function (Q) { return Q.units(Q.me, UT.WARSHIP, 2); } }]
    },
    {
      n: 103, date: '24.11.2026', title: 'Reichweite nur beim Antippen',
      text: 'Reichweiten zeigt das Spiel nur noch für das Gebäude, das du antippst, nicht mehr für alle auf einmal. Die Karte bleibt so ruhig. Auch die Schiffe sind jetzt alle gleich gross gezeichnet.',
      map: { w: 300, h: 200, seed: 903, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 1000000,
        build: [[UT.SAM, 110, 90], [UT.SILO, 190, 90], [UT.DEFENSE, 150, 140], [UT.CITY, 150, 60], [UT.CITY, 95, 130], [UT.FACTORY, 205, 130]] },
      foes: [], allow: ALL, quest: none,
      tips: [{ text: 'Tippe auf die Flugabwehr.', pins: function (Q) { return Q.units(Q.me, UT.SAM, 1); } }]
    },
    {
      n: 104, date: '23.11.2026', title: 'Transportboot und Bootsspur',
      text: 'Das Transportboot ist schlichter gezeichnet, und seine Spur im Wasser ist ruhig wie in OpenFront. Tippe selbst aufs Ufer gegenüber, um ein Boot zu schicken.',
      map: { w: 320, h: 200, seed: 904, shapes: [circ(75, 100, 58), circ(245, 100, 58)] },
      me: { x: 75, y: 100, r: 62, troops: 80000, gold: 300000 },
      foes: [{ bot: 1, x: 235, y: 75, r: 10 }, { bot: 1, x: 255, y: 125, r: 10 }],
      allow: ALL, quest: none,
      loop: [1, 6, function (Q, k) { Q.boat(Q.me, 195 + (k % 3) * 4, 70 + (k * 23) % 60, 4000); }]
    },
    {
      n: 105, date: '23.11.2026', title: 'Zerstörer und Schlachtschiff',
      text: 'Es gibt zwei Kriegsschiffe: den schnellen Zerstörer und das langsame Schlachtschiff mit grosser Reichweite, das auch an Land schiesst. Tippe ein Schiff an: wählen, zurückrufen oder im Hafen lagern. Schiffe kosten Unterhalt.',
      map: Object.assign({ seed: 905 }, STRAIT),
      me: { x: 150, y: 180, box: [0, 150, 300, 200], troops: 60000, gold: 3000000, build: [[UT.PORT, 80, 156], [UT.PORT, 220, 156]] },
      foes: [{ name: 'Quellmark', x: 150, y: 20, box: [0, 0, 300, 50], troops: 80000 }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.ship(Q.me, 100, 120, 1); Q.ship(Q.me, 200, 120, 0); }]],
      loop: [3, 30, function (Q) { if (Q.ships(Q.foe[0]) < 2) Q.ship(Q.foe[0], 150, 75, 0); }],
      tips: [{ text: 'Tippe auf ein Schiff.', pins: function (Q) { return Q.units(Q.me, UT.WARSHIP, 2); } }]
    },
    {
      n: 106, date: '23.11.2026', title: 'Handel in drei Klassen',
      text: 'Je höher ein Hafen ausgebaut ist, desto grössere Handelsschiffe schickt er: kleine Frachter für kurze Wege, Containerschiffe für weite Strecken, mit mehr Gold.',
      map: { w: 300, h: 200, seed: 906, rough: 4, shapes: [rect(0, 0, 95, 200), rect(205, 0, 300, 200)] },
      me: { x: 40, y: 100, box: [0, 0, 100, 200], troops: 60000, gold: 500000, build: [[UT.PORT, 95, 45, 1], [UT.PORT, 95, 155, 3]] },
      foes: [{ name: 'Ostmark', x: 260, y: 100, box: [200, 0, 300, 200], troops: 60000, build: [[UT.PORT, 205, 40, 3], [UT.PORT, 205, 100, 2], [UT.PORT, 205, 160, 3]] }],
      allow: ALL, quest: none,
      tips: [{ text: '', pins: function (Q) { return Q.units(Q.me, UT.PORT, 2); } }]
    },
    {
      n: 107, date: '23.11.2026', title: 'Grüne Schienen-Vorschau',
      text: 'Wählst du eine Fabrik oder Stadt zum Bauen, zeigt eine grüne Linie, wo die Schienen hinkommen. Das Land hat jetzt die Farben wie in OpenFront.',
      map: { w: 300, h: 200, seed: 907, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 2000000,
        build: [[UT.FACTORY, 150, 100], [UT.CITY, 115, 80], [UT.CITY, 185, 80], [UT.CITY, 140, 135]] },
      foes: [], allow: ALL, quest: none,
      tips: [{ text: 'Fabrik wählen, dann über die Karte fahren.', el: hot(UT.FACTORY) }]
    },
    {
      n: 108, date: '23.11.2026', title: 'Kampf wie OpenFront',
      text: 'Ein Angriff auf der ganzen Front rechnet jetzt genau wie OpenFront. Das Gelände zählt: Durch das Gebirge in der Mitte geht der Angriff langsamer und kostet mehr.',
      map: { w: 300, h: 200, seed: 908, shapes: [circ(150, 100, 92), rect(45, 30, 255, 170), circ(150, 70, 22, 3), circ(150, 135, 16, 2)] },
      me: { x: 60, y: 100, box: [0, 0, 125, 200], troops: 120000, gold: 300000 },
      foes: [{ name: 'Grauwald', x: 240, y: 100, box: [125, 0, 300, 200], troops: 60000 }],
      allow: ALL, quest: none,
      loop: [6, 20, function (Q) { Q.push(Q.me, Q.foe[0], 0.35, 220, 100); }]
    },
    {
      n: 109, date: '23.11.2026', title: 'Nationen schlagen nicht sofort zurück',
      text: 'Greifst du eine Nation an, wirft sie nicht mehr sofort alle Truppen zurück. Sie wehrt sich, aber du hast Zeit zu reagieren. Greif selbst an: Linksklick auf ihr Land.',
      map: { w: 300, h: 200, seed: 909, shapes: [circ(150, 100, 92), rect(45, 30, 255, 170)] },
      me: { x: 60, y: 100, box: [0, 0, 150, 200], troops: 90000, gold: 300000 },
      foes: [{ name: 'Selvia', x: 240, y: 100, box: [150, 0, 300, 200], troops: 90000, ai: 1 }],
      allow: ALL, quest: none,
      loop: [6, 30, function (Q) { Q.push(Q.me, Q.foe[0], 0.25, 200, 100); }]
    },
    {
      n: 110, date: '20.11.2026', title: 'Bots wachsen in Armen',
      text: 'Bots breiten sich am Anfang schneller aus und wachsen in Armen statt als runder Fleck. Wer einen Bot erobert, bekommt 20 % weniger Gold als früher.',
      map: { w: 300, h: 200, seed: 910, shapes: [circ(150, 100, 95), rect(40, 25, 260, 175)] },
      me: { x: 50, y: 100, r: 10, troops: 30000, gold: 0 },
      foes: [{ bot: 1, x: 130, y: 60, r: 2 }, { bot: 1, x: 200, y: 70, r: 2 }, { bot: 1, x: 160, y: 140, r: 2 }, { bot: 1, x: 235, y: 130, r: 2 }, { bot: 1, x: 100, y: 145, r: 2 }],
      allow: ALL, quest: none
    },
    {
      n: 111, date: '19.11.2026', title: 'MIRV',
      text: 'Die MIRV teilt sich in viele Sprengköpfe. Wie viele, hängt von der Grösse des Ziels ab. Wer getroffen wird, verliert weniger Truppen als früher.',
      map: { w: 320, h: 200, seed: 911, shapes: [circ(70, 100, 55), circ(225, 100, 85)] },
      me: { x: 70, y: 100, r: 60, troops: 60000, gold: 0, build: [[UT.SILO, 70, 90], [UT.SILO, 60, 115]] },
      foes: [{ name: 'Kaldor', x: 225, y: 100, r: 90, troops: 200000, build: [[UT.CITY, 210, 80], [UT.CITY, 245, 120], [UT.CITY, 230, 70]] }],
      allow: ALL, quest: none,
      loop: [6, 32, function (Q) { Q.fire(Q.me, UT.MIRV, 225, 100); }]
    },
    {
      n: 112, date: '18.11.2026', title: 'Tarnturm',
      text: 'Im Modus «Arsenal» versteckt der Tarnturm die Gebäude in seiner Nähe, bis Gegner nahe herankommen. Seinen Bereich siehst du nur beim Bauen oder wenn du den Turm antippst.',
      arsenal: true,
      map: { w: 300, h: 200, seed: 912, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 90, y: 100, box: [0, 0, 170, 200], troops: 80000, gold: 2000000,
        build: [[UT.CLOAK, 100, 100], [UT.CITY, 85, 80], [UT.SILO, 120, 115], [UT.CITY, 60, 130]] },
      foes: [{ name: 'Morn', x: 240, y: 100, box: [170, 0, 300, 200], troops: 60000 }],
      allow: ALL.concat([UT.CLOAK]), quest: none,
      tips: [{ text: 'Tippe auf den Tarnturm.', pins: function (Q) { return Q.units(Q.me, UT.CLOAK, 1); } }]
    },
    {
      n: 113, date: '17.11.2026', title: 'Boot auf feindliche Inseln',
      text: 'Ein Tipp auf eine Insel des Gegners schickt sofort ein Boot hin, auch während du an Land angreifst.',
      map: { w: 320, h: 200, seed: 913, shapes: [circ(110, 100, 75), circ(255, 50, 22), circ(265, 150, 22), circ(215, 100, 14)] },
      me: { x: 110, y: 100, r: 80, troops: 90000, gold: 300000 },
      foes: [{ bot: 1, x: 255, y: 50, r: 24 }, { bot: 1, x: 265, y: 150, r: 24 }, { bot: 1, x: 215, y: 100, r: 16 }],
      allow: ALL, quest: none,
      tips: [{ text: 'Tippe auf eine Insel.', pins: function (Q) { return Q.realms(G.PT.BOT, 3); } }]
    }
  ];
  for (const L of G.NEUES) { L.show = true; L.name = L.title; }
})(globalThis.G = globalThis.G || {});
