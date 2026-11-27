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
  //   lang     the scene runs in the mode «Langes Spiel» (the player then has everything researched,
  //            unless research: true)
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

  // a realm's cells between columns x0 and x1 get weight v; a nation keeps it (its own evening out
  // waits), so a scene can show a neighbour gathering troops
  function gather(Q, p, x0, x1, v) {
    const g = Q.g, CS = G.POST.cell, ids = [], vals = [];
    if (!p.post) return;
    p.post.autoAt = 1e12;
    for (const c of p.post.cells.values()) { const x = (c.id % g.CW) * CS; if (x >= x0 && x < x1) { ids.push(c.id); vals.push(v); } else { ids.push(c.id); vals.push(1); } }
    g.postPaint(p, ids, vals);
  }

  G.NEUES = [
    {
      n: 136, date: '27.11.2026', title: 'Langes Spiel: Bündnis dauert 8 Minuten', lang: true,
      text: 'Ein Bündnis dauert im Langen Spiel 8 Minuten statt 5. Nach 3 Minuten teilt ihr die Sicht, nach 6 Minuten das Radar, und du darfst Stützpunkte bauen. Beim Verlängern zählt die Zeit weiter. Hier ist das Bündnis mit Brenna fast 6 Minuten alt: gleich entsteht dein Silo in ihrem Land.',
      map: { w: 300, h: 160, seed: 936, shapes: [circ(80, 80, 62), circ(220, 80, 62)] },
      me: { x: 80, y: 80, r: 64, troops: 80000, gold: 3000000, build: [[UT.CITY, 70, 80, 4]] },
      foes: [{ name: 'Brenna', x: 220, y: 80, r: 64, troops: 80000, build: [[UT.CITY, 230, 80, 3]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) {
        const g = Q.g, b = Q.foe[0];
        g.makeAlliance(Q.me, b);
        const al = Q.me.allies.get(b.id); if (al) al.since = g.ticks - G.LANG.allyRadar + 60;   // 6 s short of six minutes
      }], [8, function (Q) {
        const g = Q.g;
        Q.me.gold += 3e6;
        g.build(Q.me, UT.SILO, g.levelTile(200, 105, Q.foe[0]));     // a base in Brenna's land
      }]],
      tips: [{ text: 'Dein Silo als Stützpunkt im Land von Brenna.', pins: function (Q) { return Q.units(Q.me, UT.SILO, 1); } }]
    },
    {
      n: 135, date: '27.11.2026', title: 'Langes Spiel: Flotte', lang: true,
      text: 'Das U-Boot kommt aus dem Hafen und feuert mit «Raketen-U-Boot» selbst Marschflugkörper, später auch Atombomben, und zeigt sich dabei. Das Abwehrschiff holt Marschflugkörper und Flugzeuge bei der Flotte herunter, das Radarschiff hebt den Nebel um sich auf.',
      map: { w: 300, h: 150, rough: 4, seed: 935, shapes: [rect(0, 0, 300, 40), rect(0, 100, 300, 150)] },
      me: { x: 150, y: 18, box: [0, 0, 300, 40], troops: 60000, gold: 3000000, build: [[UT.PORT, 120, 39, 2], [UT.CITY, 200, 25, 6]] },
      foes: [{ name: 'Südreich', x: 150, y: 130, box: [0, 100, 300, 150], troops: 90000, build: [[UT.CITY, 150, 125, 6], [UT.DEFENSE, 80, 106, 2], [UT.SILO, 200, 104, 2], [UT.PORT, 260, 101, 1]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) {
        Q.ship(Q.me, 150, 80, 2); Q.ship(Q.me, 80, 80, 1); Q.ship(Q.me, 200, 62, 4); Q.ship(Q.me, 240, 70, 5);
      }]],
      loop: [3, 8, function (Q, k) {
        if (k % 2 === 0) Q.fire(Q.me, UT.CRUISE, 150, 125);
        else Q.fire(Q.foe[0], UT.CRUISE, 200, 39);
      }]
    },
    {
      n: 134, date: '26.11.2026', title: 'Langes Spiel: Rüstungsindustrie', lang: true,
      text: 'Atomwaffen baut die nächste eigene Fabrik; eine gestrichelte Spur zeigt den Weg zum Silo. Jede weitere Fabrikstufe macht es schneller, ohne Fabrik dauert es doppelt so lange. Fällt die Fabrik, kommt die Waffe später. Ein Stoss aus dem Umkreis einer grossen Stadt startet mit mehr Schwung.',
      map: { w: 380, h: 200, seed: 934, shapes: [circ(90, 100, 70), circ(280, 100, 72)] },
      me: { x: 90, y: 100, r: 72, troops: 80000, gold: 0, build: [[UT.FACTORY, 150, 100, 1], [UT.FACTORY, 50, 80, 2], [UT.SILO, 125, 135, 2], [UT.CITY, 85, 150, 8]] },
      foes: [{ name: 'Ostmark', x: 280, y: 100, r: 74, troops: 120000, build: [[UT.CITY, 290, 100, 10], [UT.SILO, 214, 100, 2]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; }], [50, function (Q) { Q.fire(Q.foe[0], UT.CRUISE, 150, 100); }]],
      loop: [3, 45, function (Q) { Q.fire(Q.me, UT.ATOM, 290, 100); }]
    },
    {
      n: 133, date: '26.11.2026', title: 'Langes Spiel: Marine', lang: true,
      text: 'Das U-Boot ist unsichtbar, bis es feuert, und versenkt Kriegs- und Handelsschiffe; finden kann es nur ein Zerstörer mit Sonar. Seeminen liegen unsichtbar vor dem eigenen Hafen und versenken Boote. Der Flugzeugträger ist ein Flugplatz auf See. Kriegsschiffe halten mehr aus und kosten mehr Unterhalt, Handelsschiffe bringen mehr Gold.',
      map: STRAIT,
      me: { x: 150, y: 20, box: [0, 0, 300, 46], troops: 60000, gold: 3000000, build: [[UT.PORT, 150, 44, 2]] },
      foes: [{ name: 'Südküste', x: 150, y: 180, box: [0, 154, 300, 200], troops: 90000, build: [[UT.PORT, 150, 156, 2], [UT.CITY, 120, 180, 4]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) {
        Q.ship(Q.me, 118, 118, 2); Q.ship(Q.me, 150, 105, 3);
        Q.ship(Q.foe[0], 120, 128); Q.ship(Q.foe[0], 180, 128);
        for (let x = 138; x <= 162; x += 4) { const t = Q.tile(x, 58); Q.me.gold += G.LANG.mineCost; Q.g.build(Q.me, UT.MINE, t); }
      }]],
      loop: [2, 8, function (Q, k) {
        if (k % 2 === 0) Q.boat(Q.foe[0], 150, 25, 6000);
        else Q.fire(Q.me, UT.BOMBER, 150, 168);
      }]
    },
    {
      n: 132, date: '26.11.2026', title: 'Langes Spiel: Tarnbomber', lang: true,
      text: 'Der Tarnbomber trägt eine Atombombe und kommt durch Mauern aus Flugabwehr: Eine Flugabwehr sieht ihn nur in einem Viertel ihrer Reichweite, muss ihn dort 3 Sekunden halten und braucht dafür die Forschung «Gegen Tarnbomber»; er hält zwei Treffer aus. Nach dem Abwurf fliegt er zurück. Nur ein Radar mit «Tarnung erkennen» zeigt ihn.',
      map: { w: 380, h: 200, seed: 932, shapes: [circ(70, 100, 60), circ(290, 100, 80)] },
      me: { x: 70, y: 100, r: 62, troops: 80000, gold: 0, build: [[3.5, 90, 100, 2], [4.7, 60, 70, 3]] },
      foes: [{ name: 'Küstenreich', x: 290, y: 100, r: 82, troops: 200000, build: [[UT.SAM, 220, 70, 2], [UT.SAM, 215, 100, 2], [UT.SAM, 220, 130, 2], [UT.CITY, 300, 100, 10]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; }]],
      loop: [6, 40, function (Q) { Q.fire(Q.me, UT.STEALTH, 300, 100); }]
    },
    {
      n: 131, date: '26.11.2026', title: 'Langes Spiel: Luftwaffe', lang: true,
      text: 'Der Flugplatz (Taste 9) schickt Flugzeuge in seiner Reichweite. Bomber werfen Streubomben auf die Front, das Aufklärungsflugzeug deckt kurz ein Gebiet auf, und Abfangjäger starten von selbst gegen Bomber und Marschflugkörper. Flugzeuge fliegen selbst hin und zurück; man schiebt sie nicht.',
      map: { w: 300, h: 200, seed: 931, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 0, build: [[3.5, 100, 100, 3]] },
      foes: [{ name: 'Varnholm', x: 230, y: 100, box: [150, 0, 300, 200], troops: 120000, build: [[UT.SILO, 240, 100, 3]] }],
      allow: ALL, quest: none,
      loop: [6, 9, function (Q, k) {
        if (k % 3 === 0) Q.fire(Q.me, UT.BOMBER, 168, 90 + (k % 2) * 30);
        else if (k % 3 === 1) Q.fire(Q.me, UT.RECON, 250, 60);
        else Q.fire(Q.foe[0], UT.CRUISE, 95, 120);
      }]
    },
    {
      n: 130, date: '26.11.2026', title: 'Langes Spiel: Forschung', lang: true, research: true,
      text: 'Im Langen Spiel wird geforscht: Baue in einer Stadt ab Stufe 5 eine Uni (Ausbaukarte der Stadt, höchstens 3). Jede Uni forscht an einer Sache, grosse Städte schneller. Der Knopf mit dem Kolben oben zeigt alle Stufen. Zuerst wählst du eine Doktrin: Blitzkrieg oder Tiefenverteidigung.',
      map: { w: 300, h: 200, seed: 930, shapes: [circ(150, 100, 90)] },
      me: { x: 150, y: 100, r: 92, troops: 60000, gold: 4000000, build: [[UT.CITY, 110, 90, 8], [UT.CITY, 190, 110, 5], [UT.CITY, 150, 150, 2]] },
      foes: [], allow: ALL, quest: none,
      events: [[2, function (Q) {
        const g = Q.g, cs = Q.me.units.filter(function (u) { return u.type === UT.CITY && u.level >= 5; });
        for (const c of cs) g.buildUni(Q.me, c.tile);
        g.research(Q.me, 'blitz', cs[0] ? cs[0].tile : -1);
        g.research(Q.me, 'rak1', cs[1] ? cs[1].tile : -1);
      }]],
      tips: [{ text: 'Hier ist die Forschung.', el: '#bTech' }]
    },
    {
      n: 129, date: '26.11.2026', title: 'Langes Spiel: Bündnisse, Stützpunkte, Spione', lang: true,
      text: 'Ein Bündnis wird mit der Zeit wertvoller: nach 3 Minuten teilt ihr die Sicht, nach 6 Minuten auch das Radar, und du darfst im Land des Partners Stützpunkte bauen (Hafen, Silo, Flugabwehr). Du zahlst ihm dafür laufend Pacht. Ein Spion zeigt dir ein fremdes Land ein paar Minuten lang ganz.',
      map: { w: 360, h: 200, seed: 929, shapes: [circ(70, 100, 60), circ(185, 100, 55), circ(300, 100, 55)] },
      me: { x: 70, y: 100, r: 62, troops: 80000, gold: 3000000, build: [[UT.CITY, 60, 100, 4]] },
      foes: [{ name: 'Brenna', x: 185, y: 100, r: 57, troops: 80000, build: [[UT.CITY, 185, 100, 3]] },
        { name: 'Ostmark', x: 300, y: 100, r: 57, troops: 90000, build: [[UT.CITY, 300, 80, 6], [UT.SILO, 310, 120, 2], [UT.SAM, 285, 120, 2]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) {
        const g = Q.g, b = Q.foe[0];
        g.makeAlliance(Q.me, b);
        const al = Q.me.allies.get(b.id); if (al) { al.since = g.ticks - G.LANG.allyRadar; al.end += 60000; }
      }], [6, function (Q) {
        const g = Q.g;
        Q.me.gold += G.LANG.radarCost + 3e6;
        g.build(Q.me, UT.SILO, g.levelTile(185, 125, Q.foe[0]));     // a base in Brenna's land
        g.sendSpy(Q.me, Q.foe[1]);
      }]],
      tips: [{ text: 'Dein Silo im Land von Brenna.', pins: function (Q) { return Q.units(Q.me, UT.SILO, 1); } }]
    },
    {
      n: 128, date: '26.11.2026', title: 'Langes Spiel: Nebel und Radar', lang: true,
      text: 'Im Langen Spiel liegt Nebel über allem, was weiter als etwa 50 Felder von deinem Land weg ist. Dort siehst du nur, wem das Land gehört: keine Gebäude, Schiffe, Bomben, und die Truppen nur grob geschätzt (~). Ein Radar (Taste X) sieht in seinem grossen Kreis alles. Ein Silo, das feuert, verrät sich eine Minute lang.',
      map: { w: 400, h: 220, seed: 928, shapes: [circ(70, 110, 62), rect(150, 20, 390, 200)] },
      me: { x: 70, y: 110, r: 64, troops: 80000, gold: 0, build: [[4.7, 95, 140, 1], [UT.CITY, 60, 100, 3]] },
      foes: [{ name: 'Vellmar', x: 300, y: 110, box: [150, 0, 400, 220], troops: 200000, build: [[UT.CITY, 175, 150, 4], [UT.CITY, 330, 70, 8], [UT.SILO, 225, 160, 2], [UT.FACTORY, 280, 100, 3], [UT.SAM, 240, 60, 2]] }],
      allow: ALL, quest: none,
      loop: [8, 30, function (Q) { Q.fire(Q.foe[0], UT.CRUISE, 110, 110); }]
    },
    {
      n: 127, date: '26.11.2026', title: 'Langes Spiel: Waffen für den Krieg', lang: true,
      text: 'Im Langen Spiel trägt nicht die Atombombe den Krieg. Die Streubombe tötet Truppen an der Front, der Bunkerbrecher zerstört ein Gebäude, die thermobare Bombe trifft ein mittleres Gebiet ohne Verstrahlung, die Kurzstreckenrakete ist schnell und schwer abzufangen. Ein Marschflugkörper nimmt einem Gebäude ein Viertel seiner Stufen. Taste R schaltet die Bauleiste auf Waffen um.',
      map: { w: 320, h: 200, seed: 927, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 0, build: [[UT.SILO, 110, 100, 6]] },
      foes: [{ name: 'Varnholm', x: 230, y: 100, box: [150, 0, 300, 200], troops: 120000, build: [[UT.CITY, 200, 70, 12], [UT.FACTORY, 210, 130, 6], [UT.SAM, 245, 100, 1]] }],
      allow: ALL.concat([UT.CLUSTER, UT.BUNKER, UT.THERMO, UT.SRBM]), quest: none,
      loop: [6, 6, function (Q, k) {
        const kinds = [UT.CLUSTER, UT.CRUISE, UT.SRBM, UT.THERMO, UT.BUNKER];
        const t = kinds[k % kinds.length], at = t === UT.CRUISE || t === UT.BUNKER ? [200, 70] : t === UT.CLUSTER ? [165, 100] : t === UT.SRBM ? [170, 112] : [210, 130];
        Q.fire(Q.me, t, at[0], at[1]);
      }]
    },
    {
      n: 126, date: '26.11.2026', title: 'Langes Spiel: Atomwaffen schrecken ab', lang: true,
      text: 'Atomwaffen sind teuer, erst spät erlaubt (Atombombe ab Minute 30) und müssen im Silo scharfgemacht werden: Alle sehen den roten Ring. Wer eine einsetzt, verliert seine Bündnisse und seinen Handel, und alle kämpfen eine Weile härter gegen ihn. Wer ein Silo hat, trägt ☢ hinter dem Namen.',
      map: { w: 320, h: 200, seed: 926, shapes: [circ(80, 100, 60), circ(235, 100, 72)] },
      me: { x: 80, y: 100, r: 64, troops: 200000, gold: 0, build: [[UT.CITY, 70, 100, 8], [4.5, 95, 80, 4]] },
      foes: [{ name: 'Vellmar', x: 235, y: 100, r: 76, troops: 200000, build: [[UT.SILO, 230, 100, 2]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; }]],
      loop: [6, 50, function (Q) { Q.fire(Q.foe[0], UT.ATOM, 70, 100); }]
    },
    {
      n: 125, date: '26.11.2026', title: 'Langes Spiel: Evakuieren und Schutzräume', lang: true,
      text: 'Fliegt eine Bombe auf deine Stadt, erscheint oben «Evakuieren»: Dann sterben nur ein Drittel der Leute, aber die Stadt wächst eine Weile nicht. Eine Bombe nimmt der Stadt Stufen (Atombombe die Hälfte), statt sie ganz zu zerstören. Schutzräume (in der Ausbaukarte der Stadt) halbieren den Schaden.',
      map: { w: 320, h: 200, seed: 925, shapes: [circ(80, 100, 60), circ(235, 100, 72)] },
      me: { x: 80, y: 100, r: 64, troops: 200000, gold: 0, build: [[UT.CITY, 70, 60, 10], [UT.CITY, 70, 140, 10]] },
      foes: [{ name: 'Vellmar', x: 235, y: 100, r: 76, troops: 200000, build: [[UT.SILO, 230, 100, 3]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; const c = Q.me.units.find(function (u) { return u.type === UT.CITY && u.y > 100; }); if (c) c.shelter = 1; }]],
      loop: [6, 30, function (Q) {
        // the northern city is evacuated by the script; the southern one has shelters
        for (const u of Q.me.units.slice()) if (u.type === UT.CITY && u.built) Q.fire(Q.foe[0], UT.ATOM, u.x, u.y);
        const n = Q.me.units.find(function (u) { return u.type === UT.CITY && u.y < 100; });
        if (n) Q.g.evacuate(Q.me, n.tile);
      }],
      tips: [{ text: 'Hier erscheint «Evakuieren».', el: '#evac' }]
    },
    {
      n: 124, date: '26.11.2026', title: 'Langes Spiel: zwei Flugabwehren', lang: true,
      text: 'Im Langen Spiel gibt es zwei Flugabwehren: die kleine (Taste 6) gegen Marschflugkörper, mit vielen Schüssen, und die Raketenabwehr (Taste J) gegen Atom- und Wasserstoffbomben, mit wenigen Schüssen. Stehen mehrere nahe beieinander, lädt die zweite halb so schnell nach, die dritte nur noch ein Viertel.',
      map: { w: 320, h: 200, seed: 924, shapes: [circ(80, 100, 60), circ(235, 100, 72)] },
      me: { x: 80, y: 100, r: 64, troops: 60000, gold: 0, build: [[UT.SAM, 100, 80, 5], [4.5, 100, 125, 4], [4.5, 70, 125, 4], [UT.CITY, 60, 90, 3]] },
      foes: [{ name: 'Vellmar', x: 235, y: 100, r: 76, troops: 200000, build: [[UT.SILO, 230, 100, 5], [UT.SILO, 215, 75, 5]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; }]],   // nuclear weapons allowed at once (normally from minute 30)
      loop: [6, 7, function (Q, k) { if (k % 2) Q.fire(Q.foe[0], UT.CRUISE, 104, 87); else Q.fire(Q.foe[0], UT.ATOM, 85 + (k % 4) * 2, 118); }]
    },
    {
      n: 123, date: '26.11.2026', title: 'Langes Spiel: Abnutzung und Eingraben', lang: true,
      text: 'Wer an einem Abschnitt mehr als doppelt so dicht steht wie im Schnitt seiner Front, verliert dort laufend Truppen, ausser eine Stadt oder Schiene versorgt ihn (sonst erst ab Minute 20). Ruhige Grenzen graben sich ein, Verteidigungsposten halten auch mit wenigen Truppen.',
      map: { w: 300, h: 200, seed: 923, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 300000, build: [[UT.DEFENSE, 140, 60, 1]] },
      foes: [{ name: 'Varnholm', x: 230, y: 100, box: [150, 0, 300, 200], troops: 90000, ai: 1 }],
      allow: ALL, quest: none,
      events: [[0, function (Q) {
        // the north half of the own front stands six times as dense: more than twice the front's average
        const g = Q.g, me = Q.me, CS = G.POST.cell, ids = [], vals = [];
        g.wearFrom = 0;
        for (const c of me.post.cells.values()) if ((c.id % g.CW) * CS >= 128 && Math.floor(c.id / g.CW) * CS < 96) { ids.push(c.id); vals.push(6); }
        g.postPaint(me, ids, vals);
      }]],
      loop: [8, 20, function (Q) { Q.push(Q.foe[0], Q.me, 0.1, 150, 140); }]
    },
    {
      n: 122, date: '26.11.2026', title: 'Langes Spiel: Truppen sammeln sich', lang: true,
      text: 'Die Dichte des Nachbarn siehst du nur nahe an deiner Grenze. Sammelt er dort in kurzer Zeit viele Truppen, kommt die Meldung «Truppen sammeln sich an deiner Grenze». Truppen marschieren im Langen Spiel halb so schnell.',
      map: { w: 300, h: 200, seed: 922, shapes: [circ(150, 100, 92), rect(50, 35, 250, 165)] },
      me: { x: 70, y: 100, box: [0, 0, 150, 200], troops: 80000, gold: 300000 },
      foes: [{ name: 'Varnholm', x: 230, y: 100, box: [150, 0, 300, 200], troops: 120000 }],
      allow: ALL, quest: none,
      loop: [6, 45, function (Q, k) { gather(Q, Q.foe[0], 128, 176, k % 2 ? 6 : 1); }]
    },
    {
      n: 121, date: '26.11.2026', title: 'Langes Spiel: das Meer wirkt grösser', lang: true,
      text: 'Neuer Spielmodus «Langes Spiel»: Schiffe fahren halb so schnell, Bomben und Raketen fliegen langsamer (hier ein Marschflugkörper), und Flugabwehr, Kriegsschiffe und Häfen reichen nur halb so weit. Der Bodenkampf bleibt im Tempo.',
      map: { w: 300, h: 200, seed: 921, rough: 4, shapes: [rect(0, 0, 120, 200), rect(180, 0, 300, 200)] },
      me: { x: 50, y: 100, box: [0, 0, 125, 200], troops: 60000, gold: 500000, build: [[UT.PORT, 120, 60, 2], [UT.PORT, 120, 140, 2], [UT.SILO, 105, 100, 2], [UT.SAM, 70, 100, 2]] },
      foes: [{ name: 'Ostmark', x: 250, y: 100, box: [175, 0, 300, 200], troops: 60000, build: [[UT.PORT, 180, 50, 2], [UT.PORT, 180, 150, 2], [UT.SAM, 200, 100, 1]] }],
      allow: ALL, quest: none,
      events: [[0, function (Q) { Q.g.langEarly = G.LANG.nukeFrom[UT.ATOM]; }]],   // nuclear weapons allowed at once (normally from minute 30)
      loop: [6, 12, function (Q, k) { Q.fire(Q.me, UT.CRUISE, 235, 40 + (k % 2) * 120); }]
    },
    {
      n: 120, date: '25.11.2026', title: 'Schüsse bereit auf der Bauleiste',
      text: 'Auf den Bomben in der Bauleiste steht jetzt, wie viele du sofort abfeuern kannst (geladene Silo-Schüsse), rot 0, solange alles nachlädt. Bei der Flugabwehr steht die Zahl aller Abwehrschüsse zusammen (eine pro Stufe), nicht mehr die Anzahl Türme.',
      map: { w: 320, h: 200, seed: 920, shapes: [circ(80, 100, 60), circ(235, 100, 72)] },
      me: { x: 80, y: 100, r: 64, troops: 60000, gold: 0, build: [[UT.SILO, 95, 125, 3], [UT.SAM, 70, 80, 3], [UT.SAM, 55, 120, 1]] },
      foes: [{ name: 'Vellmar', x: 235, y: 100, r: 76, troops: 200000 }],
      allow: ALL, quest: none,
      loop: [6, 8, function (Q, k) { Q.fire(Q.me, UT.ATOM, 215 + (k % 3) * 18, 80 + (k % 2) * 40); }],
      tips: [{ text: 'Hier: bereit zum Abfeuern.', el: hot(UT.ATOM) }]
    },
    {
      n: 119, date: '25.11.2026', title: 'Hohe Stufen von weitem',
      text: 'Die Stufe über einem Gebäude erscheint umso früher, je höher sie ist. Hier siehst du von weitem nur die 30 und die 10. Zoom hinein: Erst dann kommen die 5 und die 3 dazu.',
      map: { w: 900, h: 600, seed: 919, rough: 8, shapes: [circ(450, 300, 270), rect(140, 110, 760, 490)] },
      me: { x: 450, y: 300, box: [0, 0, 900, 600], troops: 60000, gold: 1000000,
        build: [[UT.CITY, 300, 200, 30], [UT.CITY, 600, 220, 10], [UT.CITY, 330, 400, 5], [UT.CITY, 580, 410, 3], [UT.FACTORY, 450, 300, 2]] },
      foes: [], allow: ALL, quest: none
    },
    {
      n: 118, date: '25.11.2026', title: 'Silo zeigt das Nachladen',
      text: 'Hat dein Raketensilo eine Bombe abgefeuert, zeigt ein Ring, wie weit es nachgeladen hat, und darunter die Sekunden bis zum nächsten Schuss. Ein Silo auf Stufe 2 hat zwei Teile im Ring, einen pro Schuss. Anders als beim Bauen (dünner goldener Bogen) ist der Ring dunkel mit rotem Fortschritt.',
      map: { w: 320, h: 200, seed: 918, shapes: [circ(80, 100, 60), circ(235, 100, 72)] },
      me: { x: 80, y: 100, r: 64, troops: 60000, gold: 0, build: [[UT.SILO, 95, 125, 2]] },
      cam: [110, 115, 7],
      foes: [{ name: 'Torvik', x: 235, y: 100, r: 76, troops: 200000 }],
      allow: ALL, quest: none,
      loop: [6, 14, function (Q, k) { Q.fire(Q.me, UT.ATOM, 215 + (k % 3) * 18, 80 + (k % 2) * 40); }]
    },
    {
      n: 117, date: '25.11.2026', title: 'Alle Reichweiten auf einen Blick',
      text: 'Zeigst du mit der Maus auf eine Flugabwehr, tippst sie an oder wählst sie zum Bauen, siehst du die Reichweite aller deiner Flugabwehren, so erkennst du Lücken. Bei Fabriken und Häfen (wie weit ihre Handelsschiffe fahren) genauso, jede Art für sich. Schliesst du die Karte mit dem Kreuz, bleiben die Kreise stehen. Ganz herausgezoomt bleiben sie weg.',
      map: { w: 300, h: 200, seed: 916, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 3000000,
        build: [[UT.SAM, 95, 75], [UT.SAM, 150, 130], [UT.SAM, 210, 70], [UT.FACTORY, 150, 70], [UT.CITY, 120, 95], [UT.CITY, 185, 100], [UT.PORT, 257, 100, 2], [UT.PORT, 42, 140, 1]] },
      foes: [], allow: ALL, quest: none,
      // drawn only: the rings show at once, as if the mouse pointed at the first air defence
      look: function (v, g) { if (!v.hoverUnit) v.hoverUnit = g.human.units.find(function (u) { return u.type === UT.SAM && u.built; }) || null; },
      tips: [{ text: 'Zeig mit der Maus auf eine Fabrik oder einen Hafen.', pins: function (Q) { return Q.units(Q.me, UT.FACTORY, 1).concat(Q.units(Q.me, UT.PORT, 2)); } }]
    },
    {
      n: 116, date: '25.11.2026', title: 'Neue Zeichen für Atom- und Wasserstoffbombe',
      text: 'Die Atombombe ist jetzt ein dicker Bombenkörper in Eiform mit vollem Kastenleitwerk. Die Wasserstoffbombe ist lang und massiv, mit zwei Ringen und Flossen am Heck.',
      map: { w: 300, h: 200, seed: 916, shapes: [circ(150, 100, 95), rect(40, 30, 260, 170)] },
      me: { x: 150, y: 100, box: [0, 0, 300, 200], troops: 60000, gold: 2000000 },
      foes: [], allow: ALL, quest: none,
      tips: [{ text: 'Die neuen Zeichen der Bomben.', el: hot(UT.HYDRO) }]
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
      text: 'Reichweiten zeigt das Spiel nicht mehr dauernd für alle Gebäude, sondern erst, wenn du eines antippst. Die Karte bleibt so ruhig. Auch die Schiffe sind jetzt alle gleich gross gezeichnet. (Bei Flugabwehr und Fabriken siehe 25.11.)',
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
