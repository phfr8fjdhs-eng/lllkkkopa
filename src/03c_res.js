(function (G) {
  'use strict';
  // Game version «Rohstoffe»: every country of the Earth map has raw materials, dug up at deposits
  // (spots on the map: whoever holds the spot sells them), and one factory good, made by every
  // factory that stands in the country. Only whole numbers are used, so every device counts the
  // same gold. This file is left out of the classic game (tools/build.py).
  const Math = G.M, Game = G.Game, UT = G.UT, PT = G.PT;

  G.RES = {
    FACTORY_CAP: 5,              // factory levels per country that still find buyers
    EVERY: 10,                   // income is counted anew every so many ticks
    ZOOM: 3                      // from this zoom on the map shows deposits and factory goods
  };

  // Two kinds of goods. Raw materials are dug up at a deposit: a spot on the map, and whoever
  // holds that spot sells them. id: [name, gold per tick for a country of middling size].
  G.RAW = {
    oel: ['Erdöl', 60], gas: ['Erdgas', 45], kohle: ['Kohle', 25], eisen: ['Eisen', 30], kupfer: ['Kupfer', 35],
    gold: ['Gold', 50], edel: ['Edelsteine', 50], uran: ['Uran', 45], lith: ['Lithium', 45], selt: ['Seltene Erden', 50],
    wasser: ['Wasserkraft', 22], holz: ['Holz', 15], korn: ['Getreide', 15], vieh: ['Vieh', 15], fisch: ['Fisch', 15],
    kaffee: ['Kaffee', 20], kakao: ['Kakao', 20], baumw: ['Baumwolle', 15], frucht: ['Früchte', 12], wein: ['Wein', 20]
  };
  // Factory goods are made by any factory that stands in the country: [name, gold per tick and factory level].
  G.WARE = {
    med: ['Medikamente', 250], chips: ['Mikrochips', 260], flug: ['Flugzeuge', 240], auto: ['Autos', 200], elek: ['Elektronik', 200],
    batt: ['Batterien', 200], waffen: ['Rüstung', 190], masch: ['Maschinen', 180], schiff: ['Schiffe', 170], treib: ['Treibstoff', 170],
    chem: ['Chemie', 160], schmuck: ['Schmuck', 150], stahl: ['Stahl', 140], schoko: ['Schokolade', 130], textil: ['Textilien', 100],
    moebel: ['Möbel', 100], papier: ['Papier', 100], getraenk: ['Getränke', 90], lebens: ['Lebensmittel', 90], zement: ['Baustoffe', 80]
  };
  // The signs of the raw materials, drawn by hand on a 24 x 24 grid: layers of [colour, path]. The
  // map draws them on the canvas, the country card as SVG. `fabrik` is the sign of the factory goods.
  const dot = function (x, y, r) { return 'M' + (x - r) + ' ' + y + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + -2 * r + ' 0z'; };
  const DROP = 'M12 2C8 8 5 11 5 15a7 7 0 0 0 14 0C19 11 16 8 12 2z';
  G.RES_ICON = {
    oel: [['#1d1d22', DROP], ['#7a7a88', 'M8.3 14.6a3.9 3.9 0 0 0 3.5 3.9v-1.6a2.3 2.3 0 0 1-1.9-2.3z']],
    gas: [['#2f7fe0', 'M12 2c1 4 6 6 6 12a6 6 0 0 1-12 0c0-3 2-4 2.5-7 1.5 1 2 2 2 3 1-2 2-5 1.5-8z'], ['#a9d6ff', 'M12 13c1.5 2 3 2.6 3 4.6a3 3 0 0 1-6 0c0-1.6 1.6-2.4 3-4.6z']],
    kohle: [['#2a2a2e', 'M3 16l3-8 7-3 7 4 1 8-6 3H7z'], ['#55555e', 'M6 8l7 4 7-3-7-4z']],
    eisen: [['#74808c', 'M4 4h16v4h-5.5v8H20v4H4v-4h5.5V8H4z']],
    kupfer: [['#c56f34', 'M4 18l3-8h10l3 8z'], ['#e9a574', 'M7 10l1.5-3h7L17 10z']],
    gold: [['#e2a81c', 'M2 20l1.6-5.5h6.3L11.5 20zM12.5 20l1.6-5.5h6.3L22 20zM7.2 13L8.8 7.5h6.4L16.8 13z'], ['#f8d568', 'M8.8 7.5h6.4l.5 1.7H8.3z']],
    edel: [['#2aa6cf', 'M7 4h10l4 5-9 11L3 9z'], ['#9be6f5', 'M7 4l5 5 5-5z'], ['#63cbe6', 'M3 9h18l-9 3z']],
    uran: [['#f2c200', dot(12, 12, 10)], ['#1d1d22', dot(12, 12, 1.7) + 'M10.5 9.4L8 5.07A8 8 0 0 1 16 5.07L13.5 9.4A3 3 0 0 0 10.5 9.4zM15 12L20 12A8 8 0 0 1 16 18.93L13.5 14.6A3 3 0 0 0 15 12zM10.5 14.6L8 18.93A8 8 0 0 1 4 12L9 12A3 3 0 0 0 10.5 14.6z']],
    lith: [['#2c7d40', 'M9.5 2.5h5V6h-5z'], ['#3fae5a', 'M6 5.5h12V22H6z'], ['#ffffff', 'M13.2 8l-4.2 6.6h2.8l-1 5.2 4.2-6.6h-2.8z']],
    selt: [['#cf4038', 'M4 4h5.5v9a2.5 2.5 0 0 0 5 0V4H20v9a8 8 0 0 1-16 0z'], ['#eceff3', 'M4 4h5.5v3.2H4zM14.5 4H20v3.2h-5.5z']],
    wasser: [['#3d9be0', DROP], ['#ffffff', 'M13.2 8.5L9.6 14.2h2.3l-.9 4.3 3.6-5.7h-2.3z']],
    holz: [['#96643a', 'M2.5 8h15v8.5h-15z'], ['#dbb681', 'M17.5 8a3.4 4.25 0 1 0 0 8.5a3.4 4.25 0 1 0 0-8.5z'], ['#96643a', 'M17.5 10.6a1.3 1.65 0 1 0 0 3.3a1.3 1.65 0 1 0 0-3.3z']],
    korn: [['#b98a16', 'M11.3 11h1.4v11.5h-1.4z'], ['#e3b22c', 'M12 1.5c1.7 1.7 1.7 3.9 0 5.4c-1.7-1.5-1.7-3.7 0-5.4zM11 8.2c-2.3 0-3.8-1.3-4.2-3.4c2.3 0 3.8 1.3 4.2 3.4zM13 8.2c2.3 0 3.8-1.3 4.2-3.4c-2.3 0-3.8 1.3-4.2 3.4zM11 12.8c-2.3 0-3.8-1.3-4.2-3.4c2.3 0 3.8 1.3 4.2 3.4zM13 12.8c2.3 0 3.8-1.3 4.2-3.4c-2.3 0-3.8 1.3-4.2 3.4zM11 17.4c-2.3 0-3.8-1.3-4.2-3.4c2.3 0 3.8 1.3 4.2 3.4zM13 17.4c2.3 0 3.8-1.3 4.2-3.4c-2.3 0-3.8 1.3-4.2 3.4z']],
    vieh: [['#e3d6b8', 'M7.2 8.5L2.5 4.5l1.3 5.3zM16.8 8.5l4.7-4-1.3 5.3z'], ['#8a5a3a', 'M6.5 7.5h11l-1.2 10a4.3 4.3 0 0 1-8.6 0z'], ['#edc0a8', 'M8.3 15h7.4l-.5 2.8a3.2 3.2 0 0 1-6.4 0z'], ['#1d1d22', dot(9.6, 11.3, 0.9) + dot(14.4, 11.3, 0.9)]],
    fisch: [['#3d8fd1', 'M2.5 12c3-5.5 9.5-5.5 13.5-1l5.5-4.5v11L16 13c-4 4.5-10.5 4.5-13.5-1z'], ['#ffffff', dot(7, 11.2, 1.1)]],
    kaffee: [['#6b3f22', 'M12 2.5c4.6 0 7.2 4.2 7.2 9.5s-2.6 9.5-7.2 9.5S4.8 17.300 4.800 12S7.4 2.5 12 2.5z'], ['#d0a070', 'M12.9 3.200c-3.3 3.800 2.2 7-.7 17.600h-1.1c2.9-10.600-2.800-13.800.5-17.600z']],
    kakao: [['#b5542a', 'M12 1.5c5.800 3.500 6.800 14 0 21c-6.800-7-5.800-17.500 0-21z'], ['#7d3518', 'M11.500 3.500h1v17h-1zM8.200 8c.8 3 .8 6 0 9h-.9c.8-3 .8-6 0-9zM15.800 8c-.8 3-.8 6 0 9h.9c-.8-3-.8-6 0-9z']],
    baumw: [['#7a5a36', 'M11.2 15h1.600v7.500h-1.600z'], ['#ffffff', dot(8, 8.500, 4.300) + dot(16, 8.500, 4.300) + dot(12, 12.500, 4.300) + dot(12, 5.500, 3.600)]],
    frucht: [['#d8433b', 'M12 7.5c-3.200-2.200-7.500 0-7.500 5.300S7.800 22 10 22s1.500-.7 2-.7.2.7 2 .7 5.500-3.900 5.500-9.200S15.200 5.300 12 7.500z'], ['#4fa84a', 'M12 7.500c0-3.300 2.200-5 4.500-5c0 2.800-1.700 5-4.500 5z']],
    wein: [['#4fa84a', 'M11.300 1.500h1.400v4.500h-1.400z'], ['#7b3fa0', dot(7.500, 8.500, 2.900) + dot(12, 8.500, 2.900) + dot(16.500, 8.500, 2.900) + dot(9.750, 13, 2.900) + dot(14.250, 13, 2.900) + dot(12, 17.500, 2.900)]],
    fabrik: [['#8496a8', 'M2.500 21V10.500l6 4v-4l6 4V3.500h4.500V21z'], ['#f4b740', 'M5 16.500h2.500V19H5zM9.500 16.500H12V19H9.500zM14 16.500h2.500V19H14z']]
  };
  // ISO code: 'raw materials (two at most)|factory good'. Countries that are not listed (small islands) fish.
  const T = {
    // Europe
    CH: 'wasser|med', DE: 'kohle korn|auto', FR: 'wein korn|flug', IT: 'wein frucht|textil', ES: 'frucht wein|auto',
    PT: 'wein fisch|textil', GB: 'oel fisch|med', IE: 'vieh fisch|med', NL: 'gas vieh|chips', BE: 'korn|schoko',
    LU: 'eisen|stahl', AT: 'wasser holz|masch', LI: 'wasser|masch', MC: 'fisch|schmuck', AD: 'wasser|lebens',
    SM: 'wein|textil', VA: 'wein|papier', DK: 'fisch vieh|med', NO: 'oel fisch|schiff', SE: 'eisen holz|auto',
    FI: 'holz|papier', IS: 'fisch wasser|lebens', PL: 'kohle kupfer|moebel', CZ: 'kohle|auto', SK: 'holz|auto',
    HU: 'korn|batt', RO: 'oel korn|auto', BG: 'korn kupfer|chem', GR: 'frucht fisch|schiff', CY: 'kupfer frucht|lebens',
    MT: 'fisch|elek', HR: 'holz fisch|schiff', SI: 'holz wasser|med', BA: 'holz kohle|moebel', RS: 'kupfer korn|stahl',
    ME: 'holz|stahl', MK: 'wein|textil', AL: 'wasser frucht|textil', XK: 'kohle|zement', UA: 'korn eisen|stahl',
    BY: 'holz korn|chem', MD: 'wein korn|lebens', EE: 'holz|elek', LV: 'holz fisch|papier', LT: 'korn holz|moebel',
    RU: 'oel gas|waffen', TR: 'korn baumw|textil', GE: 'wein wasser|getraenk', AM: 'kupfer gold|schmuck', AZ: 'oel gas|treib',
    // Near East and Central Asia
    SA: 'oel gas|treib', AE: 'oel gas|treib', QA: 'gas oel|treib', KW: 'oel|treib', BH: 'oel|stahl', OM: 'oel fisch|treib',
    IQ: 'oel gas|zement', IR: 'oel gas|textil', IL: 'gas|chips', PS: 'frucht|lebens', JO: 'frucht|chem',
    LB: 'wein frucht|schmuck', SY: 'oel baumw|textil', YE: 'oel kaffee|lebens', EG: 'gas baumw|textil',
    KZ: 'oel uran|stahl', UZ: 'gas gold|textil', TM: 'gas baumw|textil', KG: 'gold wasser|lebens',
    TJ: 'wasser baumw|stahl', AF: 'lith edel|textil', MN: 'kupfer kohle|textil',
    // South and East Asia
    IN: 'kohle eisen|med', PK: 'baumw gas|textil', BD: 'korn gas|textil', LK: 'edel fisch|textil', NP: 'wasser korn|textil',
    BT: 'wasser holz|lebens', MV: 'fisch|lebens', CN: 'selt kohle|elek', JP: 'fisch korn|auto', KR: 'fisch korn|chips',
    KP: 'kohle eisen|waffen', TW: 'fisch korn|chips', HK: 'fisch|schmuck', MO: 'fisch|lebens', ID: 'kohle gas|batt',
    MY: 'gas holz|elek', SG: 'fisch|elek', TH: 'korn holz|auto', VN: 'korn kaffee|elek', KH: 'korn holz|textil',
    LA: 'wasser holz|lebens', MM: 'edel gas|textil', PH: 'frucht fisch|elek', BN: 'oel gas|treib',
    TL: 'oel kaffee|lebens', PG: 'gold kupfer|lebens',
    // Oceania
    AU: 'eisen kohle|stahl', NZ: 'vieh holz|lebens', FJ: 'frucht fisch|getraenk', NC: 'eisen fisch|stahl',
    SB: 'holz fisch|lebens', VU: 'frucht fisch|lebens',
    // Africa
    MA: 'fisch frucht|chem', EH: 'fisch|lebens', DZ: 'gas oel|treib', TN: 'frucht fisch|textil', LY: 'oel gas|treib',
    MR: 'eisen fisch|lebens', ML: 'gold baumw|textil', NE: 'uran gold|lebens', TD: 'oel vieh|lebens', SD: 'gold vieh|lebens',
    SS: 'oel vieh|lebens', ER: 'gold kupfer|lebens', DJ: 'fisch|lebens', ET: 'kaffee vieh|textil', SO: 'vieh fisch|lebens',
    SN: 'fisch|lebens', GM: 'fisch|lebens', GW: 'frucht fisch|lebens', GN: 'gold eisen|stahl', SL: 'edel eisen|lebens',
    LR: 'eisen holz|lebens', CI: 'kakao kaffee|schoko', GH: 'gold kakao|schoko', TG: 'kakao|chem',
    BJ: 'baumw|textil', BF: 'gold baumw|textil', NG: 'oel gas|zement', CM: 'oel kakao|moebel', GQ: 'oel gas|treib',
    GA: 'oel holz|moebel', CG: 'oel holz|moebel', CD: 'kupfer edel|lebens', CF: 'edel gold|lebens', ST: 'kakao fisch|schoko',
    CV: 'fisch|lebens', AO: 'oel edel|treib', ZM: 'kupfer|lebens', ZW: 'gold lith|lebens',
    MW: 'korn|lebens', MZ: 'gas kohle|stahl', TZ: 'gold kaffee|lebens', KE: 'kaffee frucht|lebens',
    UG: 'kaffee gold|lebens', RW: 'kaffee|lebens', BI: 'kaffee|lebens', NA: 'uran edel|lebens',
    BW: 'edel kupfer|schmuck', ZA: 'gold kohle|auto', LS: 'edel wasser|textil', SZ: 'frucht holz|getraenk',
    MG: 'edel frucht|textil', MU: 'frucht fisch|textil', SC: 'fisch|lebens', KM: 'frucht fisch|lebens',
    // America
    US: 'oel gas|flug', CA: 'oel holz|papier', MX: 'oel frucht|auto', GT: 'kaffee frucht|textil',
    BZ: 'frucht fisch|lebens', SV: 'kaffee|textil', HN: 'kaffee frucht|textil', NI: 'kaffee gold|lebens',
    CR: 'frucht kaffee|med', PA: 'frucht kupfer|schiff', CU: 'frucht|getraenk', DO: 'gold frucht|getraenk',
    HT: 'frucht kaffee|textil', JM: 'kaffee frucht|getraenk', BS: 'fisch|lebens', TT: 'gas oel|chem',
    BB: 'frucht|getraenk', PR: 'kaffee|med', CO: 'kaffee oel|textil', VE: 'oel gas|treib', GY: 'oel gold|getraenk',
    SR: 'gold oel|stahl', EC: 'oel frucht|lebens', PE: 'kupfer gold|textil', BO: 'lith gas|lebens',
    BR: 'eisen kaffee|flug', PY: 'wasser vieh|lebens', UY: 'vieh korn|lebens', AR: 'vieh lith|auto',
    CL: 'kupfer lith|papier', FK: 'fisch vieh|lebens', GL: 'fisch selt|lebens'
  };
  const NONE = 'fisch|lebens', SPECIAL = { Somaliland: 'vieh|lebens' };

  // Spread the country raster (one cell = 2 x 2 tiles) over the land of the map, work out what the
  // goods of every country are worth and choose the spots of the deposits. Small countries would
  // be worthless by area alone and Russia would be everything, so the size counts by its square
  // root, between half and three times the price. The spots come from a hash of the tile number:
  // the same on every device, inland where the country has an inland, and apart from each other.
  G.attachCountries = function (map, def, cells) {
    const W = map.W, H = map.H, cw = def.w, ch = def.h, land = map.land, n = def.list.length, SL = 6;
    const ct = new Uint8Array(map.N), tiles = new Int32Array(n + 1);
    const best = new Float64Array((n + 1) * SL).fill(-1), spot = new Int32Array((n + 1) * SL).fill(-1);
    const anyBest = new Float64Array(n + 1).fill(-1), anySpot = new Int32Array(n + 1).fill(-1);
    for (let y = 0, i = 0; y < H; y++) {
      const row = Math.min(ch - 1, y >> 1) * cw;
      for (let x = 0; x < W; x++, i++) {
        if (!land[i]) continue;
        const c = cells[row + Math.min(cw - 1, x >> 1)];
        ct[i] = c; tiles[c]++;
        let h = Math.imul((i + 0x9E3779B9) | 0, 0x85EBCA6B); h ^= h >>> 15; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 13; h >>>= 0;
        if (h > anyBest[c]) { anyBest[c] = h; anySpot[c] = i; }
        if (map.shore[i] || (map.feat && map.feat[i])) continue;      // not on the beach, not in a river
        const k = c * SL + h % SL;
        if (h > best[k]) { best[k] = h; spot[k] = i; }
      }
    }
    const list = [null], deps = [];
    for (let c = 1; c <= n; c++) {
      const d = def.list[c - 1], s = (T[d[0]] || SPECIAL[d[1]] || NONE).split('|'), raw = s[0].split(' ');
      // size factor in hundredths: 50 .. 300
      const f = G.within(Math.floor(Math.sqrt(tiles[c] * 1000 / map.landTiles) * 100), 50, 300);
      const k = { id: c, iso: d[0], name: d[1], x: d[2], y: d[3], tiles: tiles[c], raw: raw, ware: s[1], f: f, wareGold: G.WARE[s[1]][1], deps: [] };
      list.push(k);
      if (!tiles[c]) continue;
      const cand = [];
      for (let j = 0; j < SL; j++) if (spot[c * SL + j] >= 0) cand.push(spot[c * SL + j]);
      if (!cand.length) cand.push(anySpot[c]);
      let last = -1;
      for (let j = 0; j < raw.length; j++) {
        let t = cand[0], far = -1;
        if (last >= 0) for (const q of cand) {            // the second deposit: as far from the first as the choice allows
          const dx = q % W - last % W, dy = ((q / W) | 0) - ((last / W) | 0), dd = dx * dx + dy * dy;
          if (dd > far) { far = dd; t = q; }
        }
        if (t === last) break;                             // a country of a single spot has a single deposit
        last = t;
        k.deps.push(deps.length);
        deps.push({ id: deps.length, t: t, x: t % W, y: (t / W) | 0, c: c, raw: raw[j], gold: Math.floor(G.RAW[raw[j]][1] * f / 100) });
      }
      k.raw = raw.slice(0, k.deps.length);
    }
    map.ctile = ct; map.countries = list; map.deposits = deps;
  };
  G.countryAt = function (map, t) { return map.ctile && t >= 0 ? map.countries[map.ctile[t]] || null : null; };

  // ---------- the rules ----------
  // Called from conquer and relinquish: one tile changes hands. The count of land per country and
  // player is only shown on the country card; the gold comes from deposits and factories.
  Game.prototype.resMove = function (prev, id, t) {
    const c = this.map.ctile[t];
    if (!c) return;
    if (prev) this.players[prev].own[c]--;
    if (id) { const p = this.players[id]; (p.own || (p.own = new Int32Array(this.map.countries.length)))[c]++; }
  };
  // What the factory levels of one player in one country pay per tick.
  Game.prototype.wareOf = function (c, levels) { return Math.min(levels, G.RES.FACTORY_CAP) * this.map.countries[c].wareGold; };
  Game.prototype.resTick = function () {
    const ps = this.players, n = this.map.countries.length, h = this.human, deps = this.map.deposits, own = this.owner;
    for (let i = 1; i < ps.length; i++) { const p = ps[i]; p.resRaw = 0; p.resWare = 0; if (p.fac) p.fac.fill(0); }
    const held = this.depHeld || (this.depHeld = new Uint16Array(deps.length));
    for (let i = 0; i < deps.length; i++) {
      const d = deps[i], o = own[d.t];
      if (o) ps[o].resRaw += d.gold;
      if (o !== held[i]) {                                 // tell the player about a deposit won or lost
        if (h && (o === h.id || held[i] === h.id) && this.phase === 'play') this.emit({ k: 'dep', d: i, won: o === h.id });
        held[i] = o;
      }
    }
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY || !u.built || !u.active) continue;
      const c = this.map.ctile[u.tile];
      if (c) { const p = u.owner; (p.fac || (p.fac = new Int16Array(n)))[c] += u.level; }
    }
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) { p.resRate = 0; continue; }
      if (p.fac) for (let c = 1; c < n; c++) if (p.fac[c]) p.resWare += this.wareOf(c, p.fac[c]);
      if (p.type === PT.BOT) { p.resRaw >>= 1; p.resWare >>= 1; }      // bots stay weak
      p.resRate = p.resRaw + p.resWare;
    }
  };
})(globalThis.G);
