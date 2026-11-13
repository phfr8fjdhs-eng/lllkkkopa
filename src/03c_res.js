(function (G) {
  'use strict';
  // Game version «Rohstoffe»: every country of the Earth map has raw materials and one factory
  // good. Land pays for the raw materials of the country it lies in, a factory makes the good of
  // the country it stands in. Only whole numbers are used, so every device counts the same gold.
  // This file is left out of the classic game (tools/build.py).
  const Math = G.M, Game = G.Game, UT = G.UT, PT = G.PT;

  G.RES = {
    MONO_NUM: 9, MONO_DEN: 10,   // from this share of a country on it counts as a monopoly
    MONO_MUL: 3, MONO_DIV: 2,    // ... and its raw materials pay one and a half times
    FACTORY_CAP: 5,              // factory levels per country that still find buyers
    EVERY: 10                    // income is counted anew every so many ticks
  };

  // id: [name, sign, gold per tick]. Raw materials: for a country of middling size held completely.
  G.RAW = {
    oel: ['Erdöl', '🛢️', 60], gas: ['Erdgas', '🔥', 45], kohle: ['Kohle', '🪨', 25], eisen: ['Eisenerz', '⛏️', 30],
    kupfer: ['Kupfer', '🟠', 35], gold: ['Gold', '🥇', 50], silber: ['Silber', '🥈', 35], platin: ['Platin', '⚪', 50],
    diam: ['Diamanten', '💎', 55], edel: ['Edelsteine', '💠', 40], uran: ['Uran', '☢️', 45], selt: ['Seltene Erden', '🧲', 50],
    lith: ['Lithium', '🔋', 45], kobalt: ['Kobalt', '🔵', 40], nickel: ['Nickel', '🔩', 30], baux: ['Bauxit', '🧱', 25],
    zinn: ['Zinn', '🥫', 25], phos: ['Phosphat', '🧪', 22], salz: ['Salz', '🧂', 10], wasser: ['Wasserkraft', '💧', 22],
    holz: ['Holz', '🪵', 15], korn: ['Getreide', '🌾', 15], mais: ['Mais', '🌽', 14], reis: ['Reis', '🍚', 15],
    soja: ['Soja', '🫘', 16], kaffee: ['Kaffee', '☕', 20], kakao: ['Kakao', '🍫', 20], tee: ['Tee', '🍵', 16],
    zucker: ['Zucker', '🍬', 12], frucht: ['Früchte', '🍌', 12], oliven: ['Oliven', '🫒', 14], wein: ['Wein', '🍷', 20],
    gewuerz: ['Gewürze', '🌶️', 16], tabak: ['Tabak', '🍂', 14], baumw: ['Baumwolle', '🧶', 15], wolle: ['Wolle', '🐑', 14],
    kaut: ['Kautschuk', '🌳', 18], palm: ['Palmöl', '🌴', 18], vieh: ['Vieh', '🐄', 15], fisch: ['Fisch', '🐟', 15],
    tour: ['Tourismus', '🏝️', 20]
  };
  // Factory goods: gold per tick and factory level.
  G.WARE = {
    med: ['Medikamente', '💊', 250], chips: ['Mikrochips', '💾', 260], flug: ['Flugzeuge', '✈️', 240], uhr: ['Uhren', '⌚', 230],
    soft: ['Software', '💻', 220], auto: ['Autos', '🚗', 200], elek: ['Elektronik', '📱', 200], batt: ['Batterien', '🔋', 200],
    waffen: ['Rüstung', '🛡️', 190], masch: ['Maschinen', '⚙️', 180], schiff: ['Schiffe', '🚢', 170], treib: ['Treibstoff', '⛽', 170],
    chem: ['Chemie', '⚗️', 160], schmuck: ['Schmuck', '💍', 150], kosm: ['Kosmetik', '💄', 150], leder: ['Mode und Leder', '👜', 150],
    stahl: ['Stahl', '🏗️', 140], alu: ['Aluminium', '🔧', 130], schoko: ['Schokolade', '🍫', 130], zigarren: ['Zigarren', '🚬', 130],
    duenger: ['Dünger', '🌱', 110], teppich: ['Teppiche', '🧵', 110], kaese: ['Käse', '🧀', 110], textil: ['Textilien', '👕', 100],
    moebel: ['Möbel', '🪑', 100], papier: ['Papier', '📄', 100], rum: ['Rum', '🥃', 100], getraenk: ['Getränke', '🥤', 90],
    kons: ['Fischkonserven', '🐠', 90], lebens: ['Lebensmittel', '🥫', 90], zement: ['Baustoffe', '🧱', 80]
  };
  // ISO code: 'raw materials|factory good'. Countries that are not listed (small islands) fish and host guests.
  const T = {
    // Europe
    CH: 'wasser salz|med', DE: 'kohle korn|auto', FR: 'wein korn|flug', IT: 'wein oliven|leder', ES: 'oliven wein frucht|auto',
    PT: 'wein fisch|textil', GB: 'oel gas fisch|med', IE: 'vieh fisch|soft', NL: 'gas vieh|chips', BE: 'korn zucker|schoko',
    LU: 'eisen|stahl', AT: 'wasser holz eisen|masch', LI: 'wasser|masch', MC: 'tour|schmuck', AD: 'tour wasser|lebens',
    SM: 'tour|leder', VA: 'tour|papier', DK: 'oel fisch vieh|med', NO: 'oel gas fisch|schiff', SE: 'eisen holz wasser|auto',
    FI: 'holz nickel|papier', IS: 'fisch wasser|alu', PL: 'kohle kupfer korn|moebel', CZ: 'kohle korn|auto', SK: 'holz korn|auto',
    HU: 'korn baux|batt', RO: 'oel korn holz|auto', BG: 'korn kupfer|kosm', GR: 'oliven baux tour|schiff', CY: 'tour kupfer|lebens',
    MT: 'tour fisch|elek', HR: 'tour holz|schiff', SI: 'holz wasser|med', BA: 'holz kohle|moebel', RS: 'kupfer korn|stahl',
    ME: 'baux tour|alu', MK: 'tabak wein|textil', AL: 'oliven wasser|textil', XK: 'kohle nickel|zement', UA: 'korn eisen kohle|stahl',
    BY: 'holz korn|duenger', MD: 'wein korn|lebens', EE: 'holz fisch|soft', LV: 'holz fisch|papier', LT: 'korn holz|moebel',
    RU: 'oel gas nickel|waffen', TR: 'korn baumw|textil', GE: 'wein wasser|getraenk', AM: 'kupfer gold|schmuck', AZ: 'oel gas|treib',
    // Near East and Central Asia
    SA: 'oel gas phos|treib', AE: 'oel gas|alu', QA: 'gas oel|treib', KW: 'oel|treib', BH: 'oel|alu', OM: 'oel gas fisch|treib',
    IQ: 'oel gas|zement', IR: 'oel gas kupfer|teppich', IL: 'gas phos|soft', PS: 'oliven|lebens', JO: 'phos|duenger',
    LB: 'wein frucht|schmuck', SY: 'oel baumw oliven|textil', YE: 'oel kaffee fisch|lebens', EG: 'gas baumw phos|textil',
    KZ: 'oel uran kohle|stahl', UZ: 'gas gold baumw|textil', TM: 'gas baumw|teppich', KG: 'gold wasser|lebens',
    TJ: 'wasser baumw|alu', AF: 'lith edel frucht|teppich', MN: 'kupfer kohle wolle|textil',
    // South and East Asia
    IN: 'kohle eisen reis|med', PK: 'baumw reis gas|textil', BD: 'reis gas|textil', LK: 'tee edel kaut|textil', NP: 'wasser reis|teppich',
    BT: 'wasser holz|lebens', MV: 'tour fisch|kons', CN: 'selt kohle reis|elek', JP: 'fisch reis|auto', KR: 'fisch reis|chips',
    KP: 'kohle eisen|waffen', TW: 'reis fisch|chips', HK: 'tour|schmuck', MO: 'tour|lebens', ID: 'palm nickel kohle|batt',
    MY: 'palm zinn gas|elek', SG: 'tour|elek', TH: 'reis kaut zinn|auto', VN: 'reis kaffee fisch|elek', KH: 'reis kaut|textil',
    LA: 'wasser holz kupfer|lebens', MM: 'edel gas reis|textil', PH: 'nickel frucht reis|elek', BN: 'oel gas|treib',
    TL: 'oel kaffee|lebens', PG: 'gold kupfer gas|lebens',
    // Oceania
    AU: 'eisen kohle lith|alu', NZ: 'vieh wolle holz|kaese', FJ: 'zucker tour fisch|getraenk', NC: 'nickel fisch|lebens',
    SB: 'holz fisch|kons', VU: 'tour frucht|lebens',
    // Africa
    MA: 'phos fisch oliven|duenger', EH: 'phos fisch|kons', DZ: 'gas oel|treib', TN: 'phos oliven|textil', LY: 'oel gas|treib',
    MR: 'eisen fisch gold|kons', ML: 'gold baumw|textil', NE: 'uran gold|lebens', TD: 'oel baumw vieh|lebens', SD: 'gold oel vieh|lebens',
    SS: 'oel vieh|lebens', ER: 'gold kupfer salz|lebens', DJ: 'salz fisch|lebens', ET: 'kaffee gold vieh|leder', SO: 'vieh fisch|kons',
    SN: 'fisch phos|lebens', GM: 'fisch frucht|lebens', GW: 'frucht fisch|lebens', GN: 'baux gold eisen|alu', SL: 'diam eisen kakao|lebens',
    LR: 'kaut eisen holz|lebens', CI: 'kakao kaffee kaut|schoko', GH: 'gold kakao oel|schoko', TG: 'phos kakao|duenger',
    BJ: 'baumw palm|textil', BF: 'gold baumw|textil', NG: 'oel gas kakao|zement', CM: 'oel kakao holz|moebel', GQ: 'oel gas holz|treib',
    GA: 'oel holz|moebel', CG: 'oel holz|moebel', CD: 'kobalt kupfer diam|lebens', CF: 'diam gold holz|lebens', ST: 'kakao fisch|schoko',
    CV: 'fisch tour salz|kons', AO: 'oel diam|treib', ZM: 'kupfer kobalt|lebens', ZW: 'platin lith tabak|lebens',
    MW: 'tabak tee zucker|lebens', MZ: 'gas kohle edel|alu', TZ: 'gold kaffee edel|lebens', KE: 'tee kaffee frucht|lebens',
    UG: 'kaffee gold fisch|lebens', RW: 'kaffee tee zinn|lebens', BI: 'kaffee tee nickel|lebens', NA: 'uran diam fisch|kons',
    BW: 'diam kupfer vieh|schmuck', ZA: 'gold platin kohle|auto', LS: 'diam wasser wolle|textil', SZ: 'zucker holz|getraenk',
    MG: 'gewuerz nickel edel|textil', MU: 'zucker tour fisch|textil', SC: 'fisch tour|kons', KM: 'gewuerz fisch|lebens',
    // America
    US: 'oel gas mais|flug', CA: 'oel holz uran|alu', MX: 'silber oel frucht|auto', GT: 'kaffee zucker frucht|textil',
    BZ: 'zucker frucht fisch|lebens', SV: 'kaffee zucker|textil', HN: 'kaffee frucht|textil', NI: 'kaffee gold vieh|lebens',
    CR: 'frucht kaffee|med', PA: 'frucht fisch kupfer|schiff', CU: 'zucker tabak nickel|zigarren', DO: 'zucker gold tabak|zigarren',
    HT: 'frucht kaffee|textil', JM: 'baux zucker kaffee|rum', BS: 'tour fisch salz|lebens', TT: 'gas oel|duenger',
    BB: 'zucker tour|rum', PR: 'tour kaffee|med', CO: 'kaffee oel kohle|textil', VE: 'oel gas gold|treib', GY: 'oel gold zucker|rum',
    SR: 'gold baux oel|alu', EC: 'oel frucht fisch|kons', PE: 'kupfer gold silber|textil', BO: 'lith gas zinn|lebens',
    BR: 'eisen soja kaffee|flug', PY: 'soja wasser vieh|lebens', UY: 'vieh soja wolle|lebens', AR: 'soja vieh lith|auto',
    CL: 'kupfer lith wein|papier', FK: 'fisch wolle|kons', GL: 'fisch selt|kons'
  };
  const NONE = 'fisch tour|lebens', SPECIAL = { Somaliland: 'vieh fisch|lebens' };

  // Spread the country raster (one cell = 2 x 2 tiles) over the land of the map and work out what
  // every country is worth. Small countries would be worthless by area alone and Russia would be
  // everything, so the size counts by its square root, between half and three times the price.
  G.attachCountries = function (map, def, cells) {
    const W = map.W, H = map.H, cw = def.w, ch = def.h, land = map.land, n = def.list.length;
    const ct = new Uint8Array(map.N), tiles = new Int32Array(n + 1);
    for (let y = 0, i = 0; y < H; y++) {
      const row = Math.min(ch - 1, y >> 1) * cw;
      for (let x = 0; x < W; x++, i++) if (land[i]) { const c = cells[row + Math.min(cw - 1, x >> 1)]; ct[i] = c; tiles[c]++; }
    }
    const list = [null];
    for (let c = 1; c <= n; c++) {
      const d = def.list[c - 1], s = (T[d[0]] || SPECIAL[d[1]] || NONE).split('|'), raw = s[0].split(' ');
      // size factor in hundredths: 50 .. 300
      const f = G.within(Math.floor(Math.sqrt(tiles[c] * 1000 / map.landTiles) * 100), 50, 300);
      let sum = 0;
      for (const r of raw) sum += G.RAW[r][2];
      list.push({ id: c, iso: d[0], name: d[1], x: d[2], y: d[3], tiles: tiles[c], raw: raw, ware: s[1],
        f: f, value: Math.floor(sum * f / 100), wareGold: G.WARE[s[1]][2] });
    }
    map.ctile = ct; map.countries = list;
  };
  G.countryAt = function (map, t) { return map.ctile && t >= 0 ? map.countries[map.ctile[t]] || null : null; };

  // ---------- the rules ----------
  Game.prototype.resOn = function () { return !!this.opts.res && !!this.map.ctile; };
  // Called from conquer and relinquish: one tile changes hands.
  Game.prototype.resMove = function (prev, id, t) {
    const c = this.map.ctile[t];
    if (!c) return;
    if (prev) this.players[prev].own[c]--;
    if (id) { const p = this.players[id]; (p.own || (p.own = new Int32Array(this.map.countries.length)))[c]++; }
  };
  // What a player earns in one country per tick: [raw materials, factory good, monopoly 0/1].
  Game.prototype.resOf = function (p, c, levels) {
    const k = this.map.countries[c], own = p.own ? p.own[c] : 0, R = G.RES;
    let raw = 0, mono = 0;
    if (own > 0 && k.tiles > 0) {
      raw = Math.floor(k.value * own / k.tiles);
      if (own * R.MONO_DEN >= k.tiles * R.MONO_NUM) { mono = 1; raw = Math.floor(raw * R.MONO_MUL / R.MONO_DIV); }
    }
    return [raw, Math.min(levels, R.FACTORY_CAP) * k.wareGold, mono];
  };
  Game.prototype.resTick = function () {
    const ps = this.players, n = this.map.countries.length, h = this.human;
    for (let i = 1; i < ps.length; i++) { const p = ps[i]; if (p.fac) p.fac.fill(0); }
    for (const u of this.structAt.values()) {
      if (u.type !== UT.FACTORY || !u.built || !u.active) continue;
      const c = this.map.ctile[u.tile];
      if (c) { const p = u.owner; (p.fac || (p.fac = new Int16Array(n)))[c] += u.level; }
    }
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive || !p.own) { p.resRate = 0; continue; }
      let raw = 0, ware = 0, monos = 0;
      for (let c = 1; c < n; c++) {
        const lv = p.fac ? p.fac[c] : 0;
        if (!p.own[c] && !lv) continue;
        const r = this.resOf(p, c, lv);
        raw += r[0]; ware += r[1];
        if (r[2]) {
          monos++;
          if (p === h) { const m = p.mono || (p.mono = new Uint8Array(n)); if (!m[c]) { m[c] = 1; this.emit({ k: 'mono', c: c }); } }
        } else if (p === h && p.mono) p.mono[c] = 0;
      }
      if (p.type === PT.BOT) { raw >>= 1; ware >>= 1; }      // bots stay weak
      p.resRaw = raw; p.resWare = ware; p.monos = monos; p.resRate = raw + ware;
    }
  };
})(globalThis.G);
