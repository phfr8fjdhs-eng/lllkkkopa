(function (G) {
  'use strict';
  const Math = G.M;   // same results on every device, see 00_util.js
  const within = G.within, fmt = G.fmt;
  const PT = G.PT = { HUMAN: 0, NATION: 1, BOT: 2 };
  const UT = G.UT = {
    CITY: 0, DEFENSE: 1, PORT: 2, SILO: 3, SAM: 4, FACTORY: 5, CLOAK: 6, WARSHIP: 7, TRANSPORT: 8, TRADE: 9,
    TRAIN: 10, SHELL: 11, SAMM: 12, ATOM: 13, HYDRO: 14, MIRV: 15, WARHEAD: 16, CRUISE: 17, LASER: 18,
    // «Langes Spiel» only (src/04c_lang.js): cluster bomb, bunker buster, thermobaric bomb, short-range ballistic missile
    CLUSTER: 19, BUNKER: 20, THERMO: 21, SRBM: 22,
    // «Langes Spiel», Paket 5: planes (they fly from an airfield, a silo of class 1, and back)
    BOMBER: 23, STEALTH: 24, RECON: 25, FIGHTER: 26,
    // «Langes Spiel», Paket 6: a sea mine (it lies still on the water; not a bomb, see addUnit)
    MINE: 27
  };
  // Buildings are the kinds up to the cloaking tower; everything after them moves.
  G.isStruct = function (type) { return type <= UT.CLOAK; };
  // Ground combat: OpenFront's fight (tileLoss, tileTime; doku/openfront-abgleich.md), and on top
  // only the density of the cell a tile lies in (src/03b_posture.js).
  //   densMax   the densest a cell counts for (times the realm's average)
  //   base      the yardstick for momentum: what a tile of free land costs a person
  // (Until 23.11.2026 a local fight of its own with more constants here: exchange, fMin, fMax,
  // depth, army, armyFrom, dens.)
  G.COMBAT = { densMax: 3, dTime: 0.7, dLoss: 0.3, dFall: 0.5, base: 16 };
  // Thrusts: an attack aimed at a spot instead of the whole front.
  //   widths  lane width in tiles on the world map for mode 1 (section) and 2 (wedge); scaled by map.S
  //   max     thrusts a player can have under way at once
  //   pull    how strongly a thrust takes tiles nearer its goal first (per unit of way cost)
  //   ring    the same around the goal once it has fallen (per tile of distance)
//   flank   how many defenders per tile of depth a thrust meets along each of its two flanks, as
//           tiles of front (so a wedge 40 tiles deep fights as if its front were 80 tiles longer)
//   speed   how far the head of a thrust gets per tick at most, in way cost (open lowland: tiles), times attackPace
  //   crowd   troops a narrow attack can use at once, per defender it faces (more wait as supply)
  //   dirShare  width of a direction attack as a share of the side of a square as large as the realm
  //   search  most tiles the way-finding looks at before it gives up
  // A pocket of a person or nation holds out G.KESSEL ticks (30 s) before it falls; seen again
  // within G.KESSEL_GAP ticks it is the same pocket.
  G.KESSEL = 300; G.KESSEL_GAP = 60;
  // Momentum (switch `schwung`): an attack on a realm starts with 1 (up to `max` when prepared)
  // and loses it with every tile, the more the dearer the tile and the narrower the front:
  //   decay    loss of momentum per tile = decay x resistance / width of the front, where the
  //            resistance is what the tile cost in troops over 2 x G.COMBAT.base (0.25 to 4)
  //   stop     below this the attack halts; what is left of it stands in the land it took
  //   rest     ticks a stretch of border needs after an attack from it to give full momentum again
  //   mass     extra momentum per unit of density above the average where it starts (the net)
  //   rail     extra momentum at most for a railway at the start; along a railway it also fades
  //            slower (to `railFade` of the decay on the line itself)
  //   min/max  range of the momentum an attack can start with
  G.MOMENTUM = { decay: 0.012, stop: 0.25, slow: 0.5, stall: 200, rest: 300, mass: 0.25, rail: 0.15, railFade: 0.6, min: 0.55, max: 1.5 };
  G.THRUST = { widths: [0, 30, 12], max: 4, pull: 1.2, ring: 0.6, speed: 0.5, flank: 3, deep: 4, hold: 1.5, fan: 0.45, nose: 1, crowd: 2, dirShare: 0.6, search: 250000 };
  G.UNAME = ['Stadt', 'Verteidigungs\u00ADposten', 'Hafen', 'Raketensilo', 'Flugabwehr', 'Fabrik', 'Tarnturm', 'Zerstörer', 'Boot',
    'Handelsschiff', 'Zug', 'Granate', 'Abwehrrakete', 'Atombombe', 'Wasserstoff\u00ADbombe', 'MIRV', 'Sprengkopf', 'Marschflug\u00ADkörper', 'Satelliten\u00ADstrahl',
    'Streubombe', 'Bunker\u00ADbrecher', 'Thermobare Bombe', 'Kurzstrecken\u00ADrakete', 'Bomber', 'Tarnbomber', 'Aufklärungs\u00ADflugzeug', 'Abfangjäger'];
  G.UNAME[7.5] = 'Schlachtschiff';
  G.UNAME[7.2] = 'U-Boot'; G.UNAME[7.7] = 'Flugzeug\u00ADträger'; G.UNAME[7.9] = 'Seemine'; G.UNAME[27] = 'Seemine';   // «Langes Spiel», Paket 6 (src/07_ui.js)   // the interface's own number for warship class 1 (src/07_ui.js, BS)
  G.UNAME[4.5] = 'Raketenabwehr';    // «Langes Spiel»: air defence class 1 (src/07_ui.js, ABM)
  G.UNAME[3.5] = 'Flugplatz';        // «Langes Spiel»: silo class 1 (src/07_ui.js, FIELD)
  G.UNAME[4.7] = 'Radar';            // «Langes Spiel»: air defence class 2 (src/07_ui.js, RADAR)
  // Tempo. The numbers of the simulation are OpenFront's, but its maps have two million tiles and
  // ours are smaller (map.S is the scale of a side), so the same tiles per tick looked hectic:
  // a ship crossed our Atlantic in 0.6 of the time, a front rolled over a country in 0.6 of the
  // time. Everything that moves over tiles is therefore slowed by the scale of the map, which
  // gives the pace of the original. These three factors come on top, for tuning by feel:
  // move (ships, trains, shells), attack (how fast a front advances), growth (troops per tick).
  G.PACE = { move: 1, attack: 1, growth: 1 };
  // Mode «Langes Spiel» (opts.lang, doku/langes-spiel.md): the world feels larger without more
  // tiles. Everything at sea and in the air is slower and reaches less far, the ground keeps its
  // pace. All numbers are first values for tuning by feel.
  //   world   speed of ships and reach of air defences, warships and ports
  //   air     speed of bombs, cruise missiles and interceptors
  //   march   ticks troops need to cross a cell of open ground (classic: 20, src/03b_posture.js)
  //   rail    how much quicker a railway makes its cell and the cells one and two away (classic 0.2, 0.45, 0.75)
  //   seeCells  how many cells (16 tiles) behind your own border you see a neighbour's density
  //   mass*   the warning «Truppen sammeln sich»: over massSpan ticks the density of a neighbour
  //           along the border rises by massRise (to at least 1 + massRise of his average) and
  //           his troops there by massShare of your army; then quiet for him for massQuiet ticks
  //   wear*   from tick wearFrom of the game, a front cell denser than wearOver times the
  //           average of the own front loses `wear` of the surplus per minute (less with supply)
  //   dig*    a cell digs in within digTicks; dug in fully, an attacker loses 1 + digLoss times
  //           as many troops and needs 1 + digTime times as long; each lost tile takes digDrop
  //   sam*, abm*  two air defences: class 0 (key 6) only against cruise missiles, samShots per
  //           level; class 1, missile defence (key J), only against atom and hydrogen bombs and
  //           warheads, 1 + floor(level / 4) shots, reload abmReload x 8 / (level + 7), price x
  //           abmCost. A second launcher of the same class within reach reloads 1 / abmStack
  //           times as long, a third 1 / abmStack^2 (src/04c_lang.js)
  //   cityHit  share of its levels a city loses to a bomb in the inner ring (by UT: atom bomb,
  //           hydrogen bomb, warhead), half that in the outer ring, at least one level; its people
  //           (its share of the troop limit, as full as the realm) die. Evacuated (an order given
  //           at most evacHold ticks before), only evacDie of the people of the new level die; the
  //           city then gives no growth for evacStop ticks and comes back over evacBack ticks.
  //           Shelters (a city upgrade for shelterCost) halve the lost levels and the dead.
  //   nuke*, arm  atom bomb, hydrogen bomb, MIRV: price x nukeCost, only from tick nukeFrom of play
  //           (minute 30, 45, 60), and a silo has to arm one for `arm` ticks before it flies,
  //           seen by all. Whoever fires one is an outcast for `outlaw` ticks: alliances broken,
  //           no trade, and every attack on him is outlawHit times as strong (losses / outlawHit)
  //   price   the conventional weapons of the mode (by UT)
  //   range   reach from the silo, in tiles of the Earth (5600 wide), scaled to the width of the map
  //           (at least rangeW wide, so small maps keep a useful reach)
  //   share   share of a building's levels a cruise missile or short-range missile takes (at least
  //           one; level 1 falls); the next cruise missile costs cruiseHeat more for every one fired
  //           in the last cruiseCool ticks
  //   fog*    fog (only for the eye): you see fogSee cells (16 tiles) beyond your own land
  //   radar*  radar (air defence class 2, key X): price radarCost, sees everything within
  //           (radarR[0] + radarR[1] x √level) x S tiles
  //   spy*    a spy costs spyCost and shows a realm's troops, density and buildings for spyTicks
  //   ally*   an alliance shows the partner's sight after allySight ticks, his radar and leave to
  //           build bases in his land after allyRadar ticks
  //   rent, baseLeave  a base pays its host `rent` gold per tick; when the alliance ends it goes
  //           to the host after baseLeave ticks
  //   tier*, uni*  research: tiers open at tierFrom ticks of play and a step of a tier costs
  //           tierCost points; a university (city upgrade from level uniLevel, at most uniMax,
  //           price uniCost, upkeep uniUpkeep gold per tick) brings uniRp x (1 + level / 10)
  //           points per tick. Stronger shelters (research) let shelter2 through
  //   field*, air*, plane*  air force: an airfield (silo class 1, price fieldCost, a sortie per level)
  //           reaches airR tiles of the Earth (scaled like `range`); planes fly planeSpeed x the
  //           speed of a bomb, cost planeCost a sortie (the stealth bomber its bomb on top) and
  //           the airfield needs the flight there and back plus planeRest ticks. The stealth
  //           bomber: a launcher sees it only inside stealthSeen of its reach, must hold it there
  //           stealthLock ticks, and it takes stealthHp hits. A recon flight shows reconR tiles
  //           around its target for reconTicks; a fighter rests fighterRest ticks after a hunt
  //   post*   defence posts: radius x postR, losses x (postLoss[0] + postLoss[1] x level), time
  //           x (1 + postTime x level), and a tile they cover counts as at least postDens dense
  G.LANG = {
    world: 0.5, air: 0.4, march: 40, rail: [0.3, 0.5, 0.8], seeCells: 2,
    massSpan: 600, massRise: 0.5, massShare: 0.03, massQuiet: 900,
    wearFrom: 12000, wearOver: 2, wear: 0.01,
    digTicks: 1200, digLoss: 2, digTime: 0.75, digDrop: 0.004,
    postR: 1.5, postLoss: [5, 3], postTime: 3, postDens: 2,
    samShots: 2, samReload: 90, abmCost: 1.5, abmReload: 90, abmStack: 0.5,
    cityHit: { 13: 0.5, 14: 1, 16: 0.25, 21: 0.35 }, evacDie: 0.33, evacStop: 600, evacBack: 1800, evacHold: 900, shelterCost: 250000, shelter: 0.5,
    // Paket 2: nuclear weapons deter, conventional ones fight the war
    nukeCost: { 13: 8, 14: 8, 15: 4 }, nukeFrom: { 13: 18000, 14: 27000, 15: 36000 }, arm: { 13: 300, 14: 450, 15: 600 },
    outlaw: 6000, outlawHit: 1.25,
    price: { 19: 400000, 20: 600000, 21: 1500000, 22: 500000 },
    range: { 22: 150, 17: 300, 19: 300, 20: 300, 21: 300, 13: 800, 14: 1500 }, rangeW: 2400,
    share: 0.25, cruiseHeat: 0.25, cruiseCool: 300, srbmSpeed: 4, srbmSeen: 0.25,
    // Paket 3: fog, reconnaissance, alliances, bases
    fogSee: 3, radarCost: 1000000, radarR: [140, 40], spyCost: 500000, spyTicks: 3000,
    allySight: 3000, allyRadar: 9000, rent: 100, baseLeave: 300,
    // Paket 4: research (src/04c_lang.js, G.TECH)
    tierFrom: [0, 0, 9000, 18000, 27000], tierCost: [120, 240, 420, 600, 900],
    uniLevel: 5, uniMax: 3, uniCost: 1000000, uniUpkeep: 50, uniRp: 0.08, shelter2: 0.3,
    // Paket 5: the air force (src/04c_lang.js, planes)
    fieldCost: 2000000, airR: 250, planeSpeed: { 23: 0.6, 24: 0.6, 25: 0.9, 26: 1.5 }, planeCost: { 23: 600000, 24: 2000000, 25: 200000 },
    planeRest: 200, stealthSeen: 0.25, stealthLock: 30, stealthHp: 2, reconR: 40, reconTicks: 600, fighterRest: 150,
    // Paket 6: the navy (doku/langes-spiel.md)
    shipHp: 1.5, shipUpkeep: 1.5, tradeGold: 1.5, sonarR: 60, subShow: 300, subQuiet: 0.6,
    mineCost: 150000, mineR: 120, mineMax: 30, mineHit: 3, mineDmg: 1500, mineClear: 25, carrierSlots: 2
  };
  G.isPlane = function (t) { return t >= UT.BOMBER && t <= UT.FIGHTER; };
  G.LANG_WEAPON = function (t) { return t >= UT.CLUSTER && t <= UT.SRBM; };
  // What the ground does to an attack, by what covers it (index: G.COVER). `speed` multiplies
  // what a tile costs in time, `loss` what it costs the attacker in troops. Height comes on top
  // (lowland, highland, mountains: the numbers of OpenFront). Forest and swamp give cover and
  // swallow an advance, ice is all but impassable, open desert is quick to cross. A river is a
  // line of defence: the tile it runs through is slow and bloody to take, a great river more so.
  //                 water grass farm forest desert tundra ice  swamp
  G.TERRAIN = {
    speed: [1, 1, 1, 1.5, 0.9, 1.3, 2.6, 1.8],
    loss: [1, 1, 1, 1.25, 1, 1.1, 1.5, 1.25],
    riverSpeed: 4, riverLoss: 2, greatSpeed: 6, greatLoss: 3,
    free: 0.15          // how much of all that counts on land nobody holds
  };
  // What the cover adds, as factors over open ground. The cold no longer counts (until 23.11.2026
  // it made two thirds of the world map up to twice as slow and 1.5 times as dear): it was not
  // to be seen on the map, and OpenFront has nothing like it. Height (lowland, highland,
  // mountains) is OpenFront's and drawn clearly, also under a realm's colour (View.paint).
  G.groundSpeed = function (map, t) {
    const cov = map.cover;
    return cov ? G.TERRAIN.speed[cov[t]] : 1;
  };
  G.groundLoss = function (map, t) {
    const cov = map.cover;
    return cov ? G.TERRAIN.loss[cov[t]] : 1;
  };
  G.LASER_COOL = 450;   // ticks between two shots of the satellite beam (Arsenal mode)
  G.DIFF_NAMES = ['Leicht', 'Mittel', 'Schwer', 'Unmöglich'];

  // Nation strength per difficulty and the alliance length follow OpenFront's configuration.
  const NATION_START = [12500, 18750, 25000, 31250];
  const NATION_MAX = [0.5, 0.75, 1, 1.25];
  const NATION_GROW = [0.9, 0.95, 1, 1.05];
  const ALLIANCE_TICKS = 3000;      // five minutes
  const TRAITOR_TICKS = 300;        // thirty seconds
  const WIN_SHARE = 0.8;

  // Bot names: a people and a form of state, with the ending the grammar asks for.
  const FOLK = ['Hethitisch', 'Phönizisch', 'Karthagisch', 'Mongolisch', 'Byzantinisch', 'Venezianisch', 'Hanseatisch',
    'Aztekisch', 'Babylonisch', 'Assyrisch', 'Persisch', 'Osmanisch', 'Preussisch', 'Bayrisch', 'Burgundisch',
    'Normannisch', 'Fränkisch', 'Gotisch', 'Keltisch', 'Skythisch', 'Etruskisch', 'Makedonisch', 'Spartanisch',
    'Trojanisch', 'Nubisch', 'Äthiopisch', 'Tatarisch', 'Kosakisch', 'Bengalisch', 'Khmerisch', 'Mandschurisch',
    'Tibetisch', 'Sumerisch', 'Lydisch', 'Thrakisch', 'Dakisch', 'Sächsisch', 'Friesisch', 'Lombardisch', 'Katalanisch',
    'Andalusisch', 'Walisisch', 'Kaledonisch', 'Livländisch', 'Böhmisch', 'Mährisch', 'Illyrisch', 'Kretisch',
    'Samnitisch', 'Numidisch', 'Parthisch', 'Baktrisch', 'Armenisch', 'Georgisch', 'Polynesisch', 'Maurisch'];
  const STATE = [['Reich', 'es'], ['Kaiserreich', 'es'], ['Königreich', 'es'], ['Sultanat', 'es'], ['Khanat', 'es'],
    ['Fürstentum', 'es'], ['Herzogtum', 'es'], ['Protektorat', 'es'], ['Emirat', 'es'], ['Imperium', 'es'],
    ['Republik', 'e'], ['Union', 'e'], ['Föderation', 'e'], ['Dynastie', 'e'], ['Horde', 'e'], ['Liga', 'e'],
    ['Allianz', 'e'], ['Konföderation', 'e'], ['Krone', 'e'], ['Bund', 'er'], ['Orden', 'er'], ['Freistaat', 'er'],
    ['Stammesbund', 'er'], ['Städtebund', 'er']];
  const INVENTED = ['Aldoria', 'Brenmark', 'Calvenien', 'Dornreich', 'Elmstadt', 'Falkonia', 'Grauhaven', 'Hohenfels',
    'Ilmland', 'Jadeküste', 'Kronwald', 'Lindau', 'Morvanien', 'Nordheim', 'Ostara', 'Pellgard', 'Quellmark',
    'Rabenstein', 'Silvanien', 'Tessmark'];

  function Game(map, opts) {
    this.map = map; this.W = map.W; this.H = map.H; this.N = map.N; this.S = map.S;
    this.opts = Object.assign({
      seed: 1, difficulty: 1, bots: 100, nations: true, instantBuild: false,
      infiniteGold: false, infiniteTroops: false, spawnTicks: 150, autoSpawn: false, me: 0, pfeile: false, netz: true, punkt: false, aufstellung: true, kessel: true, schwung: true, bahn: true, hafen: true
    }, opts || {});
    // two switches (doku/pfeile.md): `pfeile` plans arrows and launches them together;
    // `netz` lets a person paint the net (without it the troops stand evenly, nothing to set)
    this.pfeile = !!this.opts.pfeile;
    this.netz = this.opts.netz !== false;
    // `punkt`: a click or a right-button drag can also attack just one spot (mode 3)
    this.punkt = !!this.opts.punkt;
    // `aufstellung` off: no posture at all, every realm is one pool of troops as in OpenFront (no
    // density, digging in, reserves or pockets; the net is gone with it)
    this.aufstellung = this.opts.aufstellung !== false;
    // switches for testing (doku/vision.md, 22.11.2026): `kessel` land cut off holds out for a
    // while instead of falling at once; `schwung` attacks lose momentum as they get deep;
    // `bahn` factories, railways and trains by deliveries; `hafen` ports by level
    this.kessel = this.opts.kessel !== false;
    this.schwung = this.opts.schwung !== false;
    this.bahn = this.opts.bahn !== false;
    this.hafen = this.opts.hafen !== false;
    // Two ways of fighting to compare (`kampf`, 22.11.2026, doku/kampfsysteme.md); without it the
    // single switches above decide, as the tests set them.
    //   'grenzland': the net as passive defence (density: slower, and more fall there), pockets
    //                hold out, wedges and sections lose momentum
    //   'grenzen':   no net to paint (a person's troops stand evenly; nations keep the posture they
    //                set themselves); direction attack; pockets fall at once; no momentum
    // Both fight with OpenFront's formula and the density on top (tileLoss, since 23.11.2026) and
    // can plan arrows (`pfeile`). `crowd` (a cap on attackers per defender) prices nothing any more.
    this.kampfArt = this.opts.kampf === 'grenzland' || this.opts.kampf === 'grenzen' ? this.opts.kampf : '';
    this.crowd = this.opts.crowd !== false;
    if (this.kampfArt === 'grenzland') { this.aufstellung = true; this.netz = true; this.kessel = true; this.schwung = true; this.punkt = false; this.crowd = false; }
    else if (this.kampfArt === 'grenzen') { this.aufstellung = true; this.netz = false; this.kessel = false; this.schwung = false; this.punkt = true; this.crowd = true; }
    // the campaign teaches the basics; a wedge deep through a level would die of momentum there
    if (this.opts.level) this.schwung = false;
    this.rng = new G.RNG(this.opts.seed);
    const N = this.N, S = this.S;
    this.owner = new Uint16Array(N);
    this.fallout = new Uint8Array(N); this.falloutCount = 0;
    this.stamp = new Int32Array(N); this.sid = 0; this.q = new Int32Array(N);
    this.players = [null];
    this.ticks = 0; this.phase = 'spawn'; this.spawnEnd = this.opts.spawnTicks;
    this.playStart = 0; this.immuneUntil = 0;
    this.attacks = []; this.attackSeq = 0;
    this.units = []; this.nukes = []; this.structAt = new Map(); this.uid = 0;
    this.portList = null; this.tradeCount = 0;
    this.rails = []; this.railKeys = new Map(); this.railAdj = new Map(); this.railDirty = false; this.railAt = 0; this.railBad = new Set();
    this.requests = []; this.events = []; this.fx = [];
    this.res = !!(this.opts.res && map.ctile);   // version «Rohstoffe»: countries pay for their raw materials
    this.human = null; this.humans = []; this.winner = null; this.names = new Set();
    // the tiles changed since the last picture: a list that grows when needed (24.11.2026; one
    // slot for every tile was 65 MB on the Earth, a tick changes some ten thousand)
    this.dirty = new Int32Array(Math.min(N, 1 << 16)); this.dirtyN = 0; this.dirtyFlag = new Uint8Array(N);
    this.sea = map.sea || (map.sea = new G.SeaGraph(map));   // built once per map, shared by every game on it
    this.pathLeg = new G.Pathfinder(map, 160000); this.pathCache = new Map(); this.pathQ = []; this.pathJob = null;
    this.pathNear = new G.Pathfinder(map, 260000); this.nearQ = []; this.nearJob = null;   // short hops: a window of at most 260 000 tiles
    this.lang = !!this.opts.lang;         // mode «Langes Spiel»
    const LW = this.lang ? G.LANG.world : 1, LA = this.lang ? G.LANG.air : 1;
    this.langEarly = 0;                  // «Langes Spiel»: ticks a scene adds to the game time for the nuclear weapons
    this.wearFrom = G.LANG.wearFrom;     // «Langes Spiel»: from this tick of play on, over-dense fronts wear (a scene may move it)
    this.reach = LW;                      // share of the usual reach at sea and in the air
    this.pace0 = S * G.PACE.move;         // tiles a train or shell covers per tick
    this.pace = this.pace0 * LW;          // tiles a ship covers per tick
    this.attackPace = S * G.PACE.attack;  // share of OpenFront's tiles per tick a front takes
    this.R = {
      spawn: 4,
      defense: Math.round(Math.max(8, Math.round(30 * S)) * (this.lang ? G.LANG.postR : 1)),
      structDist: Math.max(5, Math.round(15 * S)),
      atomIn: Math.max(5, Math.round(12 * S)), atomOut: Math.max(9, Math.round(30 * S)),
      hydroIn: Math.round(80 * S), hydroOut: Math.round(100 * S),
      headIn: Math.max(4, Math.round(12 * S)), headOut: Math.max(6, Math.round(18 * S)),
      cruiseIn: Math.max(3, Math.round(7 * S)), cruiseOut: Math.max(5, Math.round(11 * S)),
      laserIn: Math.max(4, Math.round(10 * S)), laserOut: Math.max(6, Math.round(16 * S)),
      cloak: Math.max(8, Math.round(26 * S)), reveal: Math.max(7, Math.round(22 * S)),
      sam: Math.round(70 * S * LW), warTarget: Math.round(70 * S * LW), warPatrol: Math.round(100 * S * LW),
      mirvRange: Math.round(1500 * S), mirvCount: Math.max(8, Math.round(120 * S * S)),
      botDist: Math.max(10, Math.round(30 * S)), boatBox: Math.round(150 * S),
      tnSearch: Math.max(60, Math.round(200 * S)), portSearch: Math.max(14, Math.round(40 * S)),
      clusterIn: Math.max(4, Math.round(10 * S)), clusterOut: Math.max(7, Math.round(20 * S)),
      bunkerIn: Math.max(2, Math.round(3 * S)), bunkerOut: Math.max(3, Math.round(5 * S)),
      thermoIn: Math.max(4, Math.round(9 * S)), thermoOut: Math.max(7, Math.round(18 * S)),
      nukeSpeed: Math.max(2.5, 6 * S) * LA, rail: Math.max(30, Math.round(110 * S))
    };
  }

  // ---------- messages for the interface ----------
  Game.prototype.emit = function (e) {
    e.t = this.ticks; this.events.push(e);
    if (this.events.length > 400) this.events.splice(0, 200);
  };
  Game.prototype.say = function (text, cls) { this.emit({ k: 'msg', text: text, cls: cls || 'info' }); };

  // ---------- players ----------
  Game.prototype.addPlayer = function (info) {
    const id = this.players.length, o = this.opts;
    const p = {
      id: id, name: info.name, type: info.type, strength: info.strength || 1, flag: info.flag || '',
      troops: 0, gold: 0, tiles: 0, peak: 0, border: new Set(), alive: false, spawned: false, spawnTile: -1,
      x0: this.W, y0: this.H, x1: -1, y1: -1,
      units: [], cnt: new Int32Array(28), cityLv: 0, dposts: [], boats: 0,
      out: [], inc: [], allies: new Map(), embargo: new Set(), reqCd: new Map(),
      rel: info.type === PT.NATION ? new Map() : null,
      traitorUntil: -1, betrayals: 0, lastChange: 0, lastCluster: 0, ai: null,
      nameX: 0, nameY: 0, nameSize: 0, tradeGold: 0, conquests: 0, cc: null, ccAt: -1, post: null
    };
    // people and nations stand in cells (src/03b_posture.js); bots are too small to need it
    if ((info.type === PT.HUMAN || info.type === PT.NATION) && this.postInit && this.aufstellung) this.postInit(p);
    let c = info.color;
    if (!c) {
      if (info.type === PT.NATION) {
        // Nations take their colour from one fixed, matt palette (G.PALETTE), in its order, and
        // only when every colour of it is in use are further shades made from it. A colour too
        // close to a person at the table is passed over, so nobody is mistaken for a player.
        const P = G.PALETTE, used = this.palUsed || (this.palUsed = 0);
        const near = (c) => { for (const q of this.humans) if (Math.abs(q.r - c[0]) + Math.abs(q.g - c[1]) + Math.abs(q.b - c[2]) < 54) return true; return false; };
        let k = used;
        c = null;
        for (let n = 0; n < P.length && !c; n++, k++) {
          const base = P[k % P.length], round = (k / P.length) | 0;
          // later rounds: the same colours a step lighter, then a step darker, and so on
          const sh = round === 0 ? 0 : (round % 2 ? 1 : -1) * 13 * ((round + 1) >> 1);
          const cand = [within(base[0] + sh, 40, 235), within(base[1] + sh, 40, 235), within(base[2] + sh, 40, 235)];
          if (!near(cand)) c = cand;
        }
        if (!c) c = P[k % P.length].slice();
        this.palUsed = k;
      } else {
        c = [196, 196, 196];   // every bot is the same light grey: it recedes, and is easy to tell from nations; the border still parts two bots
      }
    } else if (info.type === PT.HUMAN) {
      // Two people who picked the same colour: the later one is moved round the colour wheel.
      for (const q of this.humans) {
        if (Math.abs(q.r - c[0]) + Math.abs(q.g - c[1]) + Math.abs(q.b - c[2]) < 60) { c = G.hsl((G.hueOf(c) + 150 + 40 * this.humans.length) % 360, 0.46, 0.56); break; }
      }
    }
    p.r = c[0]; p.g = c[1]; p.b = c[2];
    if (info.type === PT.BOT) p.troops = 10000;
    else if (info.type === PT.NATION) p.troops = NATION_START[o.difficulty] * p.strength;
    else { p.troops = o.infiniteTroops ? 1e6 : 25000; p.gold = G.START_GOLD; }   // a person starts with a purse, enough for the first buildings
    this.players.push(p);
    return p;
  };

  Game.prototype.botName = function () {
    const r = this.rng;
    const make = function () { const f = r.pick(FOLK), st = r.pick(STATE); return f + st[1] + ' ' + st[0]; };
    for (let i = 0; i < 60; i++) {
      const n = make();
      if (!this.names.has(n)) { this.names.add(n); return n; }
    }
    return make() + ' ' + (this.players.length);
  };

  Game.prototype.freeLandNear = function (x, y, rad) {
    const W = this.W, H = this.H, land = this.map.land, own = this.owner;
    for (let r = 0; r <= rad; r++) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const t = yy * W + xx;
        if (land[t] && !own[t]) return t;
      }
    }
    return -1;
  };

  Game.prototype.setup = function (human) {
    if (this.opts.level && this.levelSetup) { this.levelSetup(human); return; }   // a level of the campaign brings its own players (src/03d_level.js)
    const map = this.map, o = this.opts, rng = this.rng, W = this.W;
    // one person, or a list of people for a game over the network (opts.me picks the one at this device)
    const people = !human ? [] : Array.isArray(human) ? human : [human];
    for (const h of people) { this.humans.push(this.addPlayer({ name: h.name, type: PT.HUMAN, color: h.color })); this.names.add(h.name); }
    if (people.length) this.human = this.humans[o.me] || null;
    const spots = [];
    const far = function (t, d) {
      const x = t % W, y = (t / W) | 0;
      for (let i = 0; i < spots.length; i++) {
        const dx = spots[i] % W - x, dy = ((spots[i] / W) | 0) - y;
        if (dx * dx + dy * dy < d * d) return false;
      }
      return true;
    };
    const randomLand = (d) => {
      for (let tries = 0; tries < 300; tries++) {
        const c = rng.int(0, this.N);
        if (map.land[c] && !this.owner[c] && far(c, d)) return c;
      }
      return -1;
    };
    if (o.nations) {
      let list = map.nations;
      if (!list.length) {
        list = [];
        const names = INVENTED.slice();
        for (let i = 0; i < 14 && names.length; i++) {
          const t = randomLand(Math.round(90 * this.S));
          if (t < 0) break;
          spots.push(t);
          list.push([names.splice(rng.int(0, names.length), 1)[0], t % W, (t / W) | 0, 1 + (i % 3 === 0 ? 1 : 0), '']);
        }
        spots.length = 0;
      }
      // only part of the nations take the field (three in four unless told otherwise), the rest of the world belongs to bots
      // (on the Earth every country takes the field: a world without the big powers is no world)
      const share = o.nationShare === undefined ? (map.cover ? 1 : 0.75) : o.nationShare;
      if (share < 1 && list.length > 4) {
        list = list.slice();
        const keep = Math.max(4, Math.round(list.length * share));
        while (list.length > keep) list.splice(rng.int(0, list.length), 1);
      }
      for (const n of list) {
        const t = this.freeLandNear(n[1], n[2], 10);
        if (t < 0) continue;
        const p = this.addPlayer({ name: n[0], type: PT.NATION, strength: n[3], flag: n[4] });
        this.names.add(n[0]);
        this.spawn(p, t); spots.push(t);
        p.ai = new G.AI(this, p);
      }
    }
    let minD = this.R.botDist;
    for (let i = 0; i < o.bots; i++) {
      let t = randomLand(minD);
      while (t < 0 && minD > 5) { minD = Math.max(5, minD * 0.8); t = randomLand(minD); }
      if (t < 0) break;
      const p = this.addPlayer({ name: this.botName(), type: PT.BOT });
      this.spawn(p, t); spots.push(t);
      p.ai = new G.AI(this, p);
    }
  };

  // ---------- numbers that drive the economy ----------
  Game.prototype.maxTroops = function (p) {
    if (p.type === PT.HUMAN && this.opts.infiniteTroops) return 1e9;
    const m = 2 * (Math.pow(p.tiles, 0.6) * 1000 + 50000) + p.cityLv * 250000;
    if (p.type === PT.BOT) return m / 3;
    if (p.type === PT.HUMAN) return m;
    return m * NATION_MAX[this.opts.difficulty];
  };
  Game.prototype.troopGrowth = function (p) {
    const max = this.maxTroops(p);
    let add = (10 + Math.pow(p.troops, 0.73) / 4) * (1 - p.troops / max);
    if (p.type === PT.BOT) add *= 0.4;
    else if (p.type === PT.NATION) add *= NATION_GROW[this.opts.difficulty];
    add *= G.PACE.growth;
    if (p.evacW) add *= 1 - p.evacW;   // «Langes Spiel»: evacuated cities do not grow (src/04c_lang.js)
    return Math.min(p.troops + add, max) - p.troops;
  };
  // In the version «Rohstoffe» the land and the factories of a player pay on top (src/03c_res.js).
  Game.prototype.goldRate = function (p) { return (p.type === PT.BOT ? 50 : 100) + (this.res ? p.resRate | 0 : 0); };

  // ---------- territory ----------
  Game.prototype.markDirty = function (t) {
    if (this.dirtyFlag[t]) return;
    this.dirtyFlag[t] = 1;
    if (this.dirtyN === this.dirty.length) { const d = new Int32Array(Math.min(this.N, this.dirty.length * 2)); d.set(this.dirty); this.dirty = d; }
    this.dirty[this.dirtyN++] = t;
  };
  Game.prototype.fixBorder = function (t) {
    const own = this.owner, id = own[t];
    this.markDirty(t);
    if (!id) return;
    const W = this.W, x = t % W, y = (t - x) / W;
    const edge = (x > 0 && own[t - 1] !== id) || (x < W - 1 && own[t + 1] !== id) ||
      (y > 0 && own[t - W] !== id) || (y < this.H - 1 && own[t + W] !== id);
    const set = this.players[id].border;
    if (edge) set.add(t); else set.delete(t);
  };
  Game.prototype.fixAround = function (t) {
    const W = this.W, x = t % W, y = (t - x) / W;
    this.fixBorder(t);
    if (x > 0) this.fixBorder(t - 1);
    if (x < W - 1) this.fixBorder(t + 1);
    if (y > 0) this.fixBorder(t - W);
    if (y < this.H - 1) this.fixBorder(t + W);
  };
  Game.prototype.conquer = function (p, t) {
    const own = this.owner, prev = own[t], id = p.id;
    if (prev === id) return;
    if (prev) { const q = this.players[prev]; q.tiles--; q.border.delete(t); q.lastChange = this.ticks; if (q.post) this.postLose(q, t); }
    own[t] = id; p.tiles++; p.lastChange = this.ticks;
    if (this.res) this.resMove(prev, id, t);
    if (p.post) this.postGain(p, t);
    if (p.tiles > p.peak) p.peak = p.tiles;   // the largest it has ever been decides what its conquest pays
    if (this.fallout[t]) { this.fallout[t] = 0; this.falloutCount--; }
    const W = this.W, x = t % W, y = (t - x) / W;
    if (x < p.x0) p.x0 = x;
    if (x > p.x1) p.x1 = x;
    if (y < p.y0) p.y0 = y;
    if (y > p.y1) p.y1 = y;
    this.fixAround(t);
    if (this.structAt.size) { const u = this.structAt.get(t); if (u) this.captureUnit(u, p); }
  };
  Game.prototype.relinquish = function (t) {
    const own = this.owner, prev = own[t];
    if (!prev) return;
    const q = this.players[prev];
    q.tiles--; q.border.delete(t); q.lastChange = this.ticks; own[t] = 0;
    if (this.res) this.resMove(prev, 0, t);
    if (q.post) this.postLose(q, t);
    this.fixAround(t);
    if (this.structAt.size) { const u = this.structAt.get(t); if (u) this.removeUnit(u); }
  };
  Game.prototype.forTiles = function (p, fn) {
    const W = this.W, own = this.owner, id = p.id;
    const x0 = p.x0, x1 = p.x1, y0 = p.y0, y1 = p.y1;
    for (let y = y0; y <= y1; y++) {
      let t = y * W + x0;
      for (let x = x0; x <= x1; x++, t++) if (own[t] === id) fn(t);
    }
  };
  // Pull the bounding box in to the tiles that are really owned.
  Game.prototype.shrinkBox = function (p) {
    const W = this.W, own = this.owner, id = p.id;
    if (p.tiles <= 0) { p.x0 = W; p.y0 = this.H; p.x1 = -1; p.y1 = -1; return; }
    const rowHas = function (y) { for (let x = p.x0, t = y * W + p.x0; x <= p.x1; x++, t++) if (own[t] === id) return true; return false; };
    const colHas = function (x) { for (let y = p.y0, t = p.y0 * W + x; y <= p.y1; y++, t += W) if (own[t] === id) return true; return false; };
    while (p.y0 < p.y1 && !rowHas(p.y0)) p.y0++;
    while (p.y1 > p.y0 && !rowHas(p.y1)) p.y1--;
    while (p.x0 < p.x1 && !colHas(p.x0)) p.x0++;
    while (p.x1 > p.x0 && !colHas(p.x1)) p.x1--;
  };

  // ---------- spawning ----------
  Game.prototype.canSpawnAt = function (t) { return t >= 0 && this.map.land[t] === 1 && this.owner[t] === 0; };
  Game.prototype.spawn = function (p, t) {
    if (this.map.land[t] !== 1) return false;
    if (this.owner[t] !== 0 && this.owner[t] !== p.id) return false;
    if (p.tiles > 0) {
      this.forTiles(p, (q) => this.relinquish(q));
      p.x0 = this.W; p.y0 = this.H; p.x1 = -1; p.y1 = -1;
    }
    const W = this.W, H = this.H, land = this.map.land, own = this.owner;
    const cx = t % W, cy = (t / W) | 0, r = this.R.spawn;
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r * r) continue;
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const n = y * W + x;
      if (land[n] && !own[n]) this.conquer(p, n);
    }
    p.spawned = true; p.alive = p.tiles > 0; p.spawnTile = t;
    return p.alive;
  };

  // ---------- relations and alliances ----------
  Game.prototype.friendly = function (a, b) { return a === b || a.allies.has(b.id); };
  Game.prototype.isTraitor = function (p) { return p.traitorUntil > this.ticks; };
  Game.prototype.relate = function (p, other, delta) {
    if (!p.rel || p === other) return;
    p.rel.set(other.id, within((p.rel.get(other.id) || 0) + delta, -100, 100));
  };
  Game.prototype.relation = function (p, other) { return p.rel ? (p.rel.get(other.id) || 0) : 0; };
  Game.prototype.canTrade = function (a, b) { return !a.embargo.has(b.id) && !b.embargo.has(a.id) && !(this.lang && (this.outlawed(a) || this.outlawed(b))); };

  Game.prototype.canRequestAlliance = function (a, b) {
    if (a === b || !a.alive || !b.alive || this.phase !== 'play') return false;
    if (this.lv) return false;   // no alliances in the campaign: every level is a duel of its own
    if (a.allies.has(b.id)) return false;
    for (const r of this.requests) if ((r.from === a && r.to === b) || (r.from === b && r.to === a)) return false;
    return (a.reqCd.get(b.id) || 0) <= this.ticks;
  };
  Game.prototype.requestAlliance = function (a, b) {
    if (!this.canRequestAlliance(a, b)) return false;
    const r = { id: ++this.uid, from: a, to: b, until: this.ticks + 200, decideAt: this.ticks + this.rng.int(10, 30) };
    this.requests.push(r);
    a.reqCd.set(b.id, this.ticks + 300);
    if (b === this.human) this.emit({ k: 'allyReq', id: r.id, from: a.id, until: r.until });
    return true;
  };
  Game.prototype.answerRequest = function (id, accept) {
    const i = this.requests.findIndex(function (r) { return r.id === id; });
    if (i < 0) return;
    const r = this.requests[i];
    this.requests.splice(i, 1);
    if (accept && r.from.alive && r.to.alive) {
      this.makeAlliance(r.from, r.to);
    } else if (r.from === this.human) {
      this.say(r.to.name + ' lehnt deine Allianz ab', 'warn');
    }
  };
  Game.prototype.makeAlliance = function (a, b) {
    if (a.allies.has(b.id)) return;
    const al = { a: a, b: b, end: this.ticks + ALLIANCE_TICKS, prompted: false, since: this.ticks };   // since: «Langes Spiel», alliances grow more valuable with time
    a.allies.set(b.id, al); b.allies.set(a.id, al);
    for (const at of a.out.slice()) if (at.tid === b.id) this.endAttack(at, true);
    for (const at of b.out.slice()) if (at.tid === a.id) this.endAttack(at, true);
    this.relate(a, b, 100); this.relate(b, a, 100);
    if (a === this.human || b === this.human) {
      this.say('Allianz mit ' + (a === this.human ? b : a).name + ' geschlossen', 'good');
    }
  };
  Game.prototype.breakAlliance = function (a, b) {
    if (!a.allies.has(b.id)) return false;
    a.allies.delete(b.id); b.allies.delete(a.id);
    if (!this.isTraitor(b)) { a.traitorUntil = this.ticks + TRAITOR_TICKS; a.betrayals++; }
    this.relate(b, a, -100);
    for (let i = 1; i < this.players.length; i++) {
      const q = this.players[i];
      if (q !== a && q !== b && q.alive) this.relate(q, a, -40);
    }
    if (b.type !== PT.HUMAN) b.embargo.add(a.id);
    if (b === this.human) this.say(a.name + ' hat die Allianz mit dir gebrochen!', 'bad');
    else if (a === this.human) this.say('Du hast ' + b.name + ' verraten. 30 Sekunden lang bist du leichter anzugreifen.', 'warn');
    return true;
  };
  Game.prototype.renewAlliance = function (a, b) {
    const al = a.allies.get(b.id);
    if (!al) return false;
    const ok = b.type === PT.HUMAN || (b.ai && b.ai.decide(a, true));
    if (ok) { al.end = this.ticks + ALLIANCE_TICKS; al.prompted = false; }
    if (a === this.human) this.say(ok ? 'Allianz mit ' + b.name + ' verlängert' : b.name + ' will die Allianz nicht verlängern', ok ? 'good' : 'warn');
    return ok;
  };
  Game.prototype.donate = function (a, b, kind, amount) {
    if (!a.alive || !b.alive || !a.allies.has(b.id) || amount < 1) return false;
    if (kind === 'gold') { amount = Math.min(amount, a.gold); a.gold -= amount; b.gold += amount; }
    else { amount = Math.min(amount, a.troops); a.troops -= amount; b.troops += amount; }
    this.relate(b, a, 50);
    if (b === this.human) this.say(a.name + ' schickt dir ' + (kind === 'gold' ? fmt(amount) + ' Gold' : G.fmtTroops(amount) + ' Truppen'), 'good');
    return amount;
  };

  Game.prototype.tickDiplomacy = function () {
    const T = this.ticks, ps = this.players, h = this.human;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if (p.rel) {
        for (const e of p.rel) {
          const v = e[1] > 0 ? e[1] - 0.5 : e[1] + 0.5;
          if (Math.abs(v) < 0.5) p.rel.delete(e[0]); else p.rel.set(e[0], v);
        }
      }
      for (const e of p.allies) {
        if (p.id > e[0]) continue;
        const al = e[1], q = ps[e[0]];
        if (T >= al.end) {
          p.allies.delete(q.id); q.allies.delete(p.id);
          if (p === h || q === h) this.say('Die Allianz mit ' + (p === h ? q : p).name + ' ist abgelaufen', 'warn');
        } else if (!al.prompted && al.end - T <= 300 && (p === h || q === h)) {
          al.prompted = true;
          this.emit({ k: 'renew', id: (p === h ? q : p).id, until: al.end });
        }
      }
    }
    for (const r of this.requests.slice()) {
      if (!r.from.alive || !r.to.alive) { this.answerRequest(r.id, false); continue; }
      if (r.to.type !== PT.HUMAN) {
        if (T >= r.decideAt) this.answerRequest(r.id, r.to.ai ? r.to.ai.decide(r.from, false) : false);
      } else if (T >= r.until) {
        this.answerRequest(r.id, false);
      }
    }
  };

  // ---------- neighbours ----------
  Game.prototype.neighbors = function (p) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H, id = p.id;
    const ids = new Set();
    let tn = false;
    for (const t of p.border) {
      const x = t % W, y = (t - x) / W;
      if (x > 0) { const n = t - 1, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (x < W - 1) { const n = t + 1, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (y > 0) { const n = t - W, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
      if (y < H - 1) { const n = t + W, o = own[n]; if (o !== id) { if (o) ids.add(o); else if (land[n]) tn = true; } }
    }
    return { tn: tn, ids: ids };
  };
  // Which piece of land (continent or island) every land tile belongs to, worked out once per map.
  // Ids above 65534 share 65535 (only on maps with that many islands).
  Game.prototype.landBody = function () {
    const map = this.map;
    if (map.body) return map.body;
    const W = this.W, H = this.H, N = this.N, land = map.land, body = new Uint16Array(N), q = new Int32Array(N);
    let id = 0;
    for (let s = 0; s < N; s++) {
      if (!land[s] || body[s]) continue;
      if (id < 65535) id++;
      let qh = 0, qt = 0;
      q[qt++] = s; body[s] = id;
      while (qh < qt) {
        const t = q[qh++], x = t % W;
        if (x > 0 && land[t - 1] && !body[t - 1]) { body[t - 1] = id; q[qt++] = t - 1; }
        if (x < W - 1 && land[t + 1] && !body[t + 1]) { body[t + 1] = id; q[qt++] = t + 1; }
        if (t >= W && land[t - W] && !body[t - W]) { body[t - W] = id; q[qt++] = t - W; }
        if (t + W < N && land[t + W] && !body[t + W]) { body[t + W] = id; q[qt++] = t + W; }
      }
    }
    return (map.body = body);
  };
  // Whether p borders tid by land; with `onBody`, only on that piece of land (see landBody).
  Game.prototype.sharesBorder = function (p, tid, onBody) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H;
    const body = onBody ? this.landBody() : null;
    for (const t of p.border) {
      if (body && body[t] !== onBody) continue;
      const x = t % W, y = (t - x) / W;
      if (x > 0 && own[t - 1] === tid && land[t - 1]) return true;
      if (x < W - 1 && own[t + 1] === tid && land[t + 1]) return true;
      if (y > 0 && own[t - W] === tid && land[t - W]) return true;
      if (y < H - 1 && own[t + W] === tid && land[t + W]) return true;
    }
    return false;
  };
  // Is this free tile part of open land that touches the player's territory?
  Game.prototype.tnTouches = function (p, tile) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H, id = p.id, lim = this.R.tnSearch;
    const st = this.stamp, sid = ++this.sid, q = this.q;
    const tx = tile % W, ty = (tile / W) | 0;
    let qh = 0, qt = 0;
    q[qt++] = tile; st[tile] = sid;
    while (qh < qt) {
      const t = q[qh++], x = t % W, y = (t - x) / W;
      for (let k = 0; k < 4; k++) {
        let n;
        if (k === 0) { if (x === 0) continue; n = t - 1; }
        else if (k === 1) { if (x === W - 1) continue; n = t + 1; }
        else if (k === 2) { if (y === 0) continue; n = t - W; }
        else { if (y === H - 1) continue; n = t + W; }
        const o = own[n];
        if (o === id) return true;
        if (o === 0 && land[n] && st[n] !== sid) {
          const nx = n % W, ny = (n - nx) / W;
          if (Math.abs(nx - tx) + Math.abs(ny - ty) <= lim) { st[n] = sid; q[qt++] = n; }
        }
      }
    }
    return false;
  };

  // ---------- land attacks ----------
  function Attack(id, a, tid, troops, t) {
    this.id = id; this.a = a; this.tid = tid; this.troops = troops;
    this.heap = new G.Heap(128); this.front = new Set(); this.active = true; this.start = t;
    this.want = 0; this.cell = -1; this.near = -1;   // posture: troops ordered but still on the march, and where they gather
    // a thrust: aimed at `goal`, it fights only inside its lane (`lane`, the tiles within half its
    // width of `path`) until the goal has fallen (`reached`); `dist` is the cost of the way to the goal
    this.goal = -1; this.width = 0; this.path = null; this.lane = null; this.dist = null; this.reached = false; this.reroute = 0;
    this.head = undefined; this.limit = 0;   // how near the goal the thrust has got, and how near it may get this tick
    // a direction attack (mode 3): the part of the front facing one way. It fights only within a band
    // `rad` tiles to each side of the line from `spot` (an own border tile) along (dx, dy), and
    // moves forward as a front does, no lane and no goal
    this.spot = -1; this.rad = 0; this.dx = 0; this.dy = 0;
  }

  Game.prototype.addFront = function (at, tile) {
    const own = this.owner, land = this.map.land, mg = this.map.mag, W = this.W, H = this.H;
    const tid = at.tid, aid = at.a.id, rng = this.rng, T = this.ticks;
    const x = tile % W, y = (tile - x) / W;
    for (let k = 0; k < 4; k++) {
      let n;
      if (k === 0) { if (x === 0) continue; n = tile - 1; }
      else if (k === 1) { if (x === W - 1) continue; n = tile + 1; }
      else if (k === 2) { if (y === 0) continue; n = tile - W; }
      else { if (y === H - 1) continue; n = tile + W; }
      if (!land[n] || own[n] !== tid) continue;
      if (at.lane && !at.lane.has(n)) {                              // a thrust stays in its lane;
        if (!at.reached) continue;                                    // once the goal has fallen it widens
        const gx = at.goal % W, gy = (at.goal / W) | 0, nx0 = n % W, ny0 = (n / W) | 0, r = at.width * G.THRUST.hold;
        if ((nx0 - gx) * (nx0 - gx) + (ny0 - gy) * (ny0 - gy) > r * r) continue;   // only into a ring round the goal
      }
      let ds = 0;
      if (at.spot >= 0) {                                           // a direction attack stays in its band
        const vx = n % W - at.spot % W, vy = ((n / W) | 0) - ((at.spot / W) | 0);
        ds = vx * at.dx + vy * at.dy;
        const cr = Math.abs(vx * at.dy - vy * at.dx);
        let h = Math.imul(n, 0x9E3779B1); h ^= h >>> 15; h = Math.imul(h, 0x85EBCA77); const rag = (h >>> 28) * 0.25 - 1.9;                // a ragged edge, the same on every device
        if (ds < -2 || cr > at.rad * 0.6 + Math.max(0, ds) * G.THRUST.fan + rag) continue;   // a fan that opens forward
        ds += G.THRUST.nose * cr * cr / Math.max(1, at.rad);                         // the middle leads: a rounded nose
      }
      at.front.add(n);
      const nx = n % W, ny = (n - nx) / W;
      let mine = 0;
      if (nx > 0 && own[n - 1] === aid) mine++;
      if (nx < W - 1 && own[n + 1] === aid) mine++;
      if (ny > 0 && own[n - W] === aid) mine++;
      if (ny < H - 1 && own[n + W] === aid) mine++;
      if (mine > 2) mine = 10;
      const m = mg[n], rough = m < 10 ? 1 : m < 20 ? 1.5 : 2;
      let key = (rng.int(0, 7) + 10) * (1 - mine * 0.5 + rough / 2) + T;
      if (at.spot >= 0) key += G.THRUST.ring * 0.5 * ds;         // the band moves forward evenly
      if (at.goal >= 0) {
        // a thrust takes first what lies nearer its goal: along the way while it is under way,
        // in rings around the goal once it has fallen
        if (!at.reached) { const d = at.dist.get(n); key += G.THRUST.pull * (d === undefined ? 1e3 : d); }
        else { const gx = at.goal % W, gy = (at.goal - gx) / W; key += G.THRUST.ring * Math.sqrt((nx - gx) * (nx - gx) + (ny - gy) * (ny - gy)); }
      }
      at.heap.push(key, n);
    }
  };
  Game.prototype.refreshFront = function (at) {
    at.heap.clear(); at.front.clear();
    for (const b of at.a.border) this.addFront(at, b);
  };

  // ---------- thrusts ----------
  // What a tile costs a thrust to cross, as a factor over open lowland: hills and mountains, cover,
  // cold, rivers and the defender's posts. A thrust looks for the cheapest way, so it goes round a
  // mountain range or through a valley instead of straight across.
  Game.prototype.crossCost = function (tile, dp, dr2) {
    const map = this.map, m = map.mag[tile], W = this.W;
    let c = (m < 10 ? 1 : m < 20 ? 1.2121 : 1.5152) * G.groundSpeed(map, tile);
    if (map.cover) { const f = map.feat[tile]; if (f & 2) c *= G.TERRAIN.greatSpeed; else if (f & 1) c *= G.TERRAIN.riverSpeed; }
    if (dp && dp.length) {
      const x = tile % W, y = (tile - x) / W;
      for (let i = 0; i < dp.length; i++) { const dx = dp[i].x - x, dy = dp[i].y - y; if (dx * dx + dy * dy <= dr2) { c *= this.postSpd(dp[i].level); break; } }
    }
    return c;
  };
  // Width of a thrust in tiles on this map: mode 1 a section of the front, mode 2 a wedge.
  Game.prototype.thrustWidth = function (mode) {
    const w = G.THRUST.widths[mode] || 0;
    return w ? Math.max(5, Math.round(w * this.map.S / 0.6)) : 0;
  };
  // The way of a thrust from p's border to `goal` in the land of tid (0: free land), or null.
  // Reads the game only, so the interface can ask for a preview as often as it likes.
  //   entry: the tile where it breaks in, path: the tiles from there to the goal,
  //   lane: the tiles within half the width of the way, dist: cost of the way to the goal.
  // start: an own tile the thrust should break in near (the start of a drag), or -1 to let the
  // way-finding choose the cheapest spot on the border.
  const DIAG = 1.4142135623730951;   // √2, written out so every device uses the same number
  Game.prototype.thrustRoute = function (p, tid, goal, width, start) {
    const own = this.owner, land = this.map.land, W = this.W, H = this.H, N = this.N, pid = p.id;
    if (goal < 0 || goal >= N || own[goal] !== tid || !land[goal] || !(width > 0)) return null;
    const t = tid ? this.players[tid] : null, dp = t ? t.dposts : null, dr2 = this.R.defense * this.R.defense;
    const heap = this.thrustHeap || (this.thrustHeap = new G.Heap(1024)), dist = new Map(), done = new Set();
    const touches = function (n) {
      const x = n % W;
      return (x > 0 && own[n - 1] === pid) || (x < W - 1 && own[n + 1] === pid) || (n >= W && own[n - W] === pid) || (n + W < N && own[n + W] === pid);
    };
    heap.clear(); dist.set(goal, 0); heap.push(0, goal);
    const costOf = new Map();
    const cost = (n) => { let c = costOf.get(n); if (c === undefined) { c = this.crossCost(n, dp, dr2); costOf.set(n, c); } return c; };
    // With a start, the entry is the border tile that is cheapest by way cost plus distance from
    // the start (two units of way cost per tile); the search goes on until nothing can beat it.
    const hasStart = start >= 0 && start < N && own[start] === pid, sx = hasStart ? start % W : 0, sy = hasStart ? (start - sx) / W : 0;
    let entry = -1, stop = Infinity, best = Infinity;
    while (heap.n > 0) {
      const d = heap.k[0], n = heap.pop();
      if (done.has(n)) continue;
      if (d > stop) break;
      done.add(n);
      if (done.size > G.THRUST.search) { if (entry >= 0) break; return null; }
      if (touches(n)) {
        if (hasStart) {
          const nx = n % W, ny = (n - nx) / W, sc = d + 2 * Math.sqrt((nx - sx) * (nx - sx) + (ny - sy) * (ny - sy));
          if (sc < best) { best = sc; entry = n; stop = sc + width * 2; }
        } else if (entry < 0) { entry = n; stop = d * 1.3 + width * 2; }
      }
      // eight directions, a diagonal step costing √2: with four the cost of every staircase is the
      // same, and the way came out as an L (first across, then straight up) instead of straight on
      const x = n % W, y = (n - x) / W, cn = cost(n);
      for (let dy = -1; dy <= 1; dy++) {
        if ((dy < 0 && y === 0) || (dy > 0 && y === H - 1)) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if ((!dx && !dy) || (dx < 0 && x === 0) || (dx > 0 && x === W - 1)) continue;
          const m = n + dy * W + dx;
          if (!land[m] || own[m] !== tid || done.has(m)) continue;
          // no cutting a corner between two tiles that are not tid's land
          if (dx && dy && (own[n + dx] !== tid || own[n + dy * W] !== tid)) continue;
          const nd = d + (cn + cost(m)) / 2 * (dx && dy ? DIAG : 1), od = dist.get(m);
          if (od === undefined || nd < od) { dist.set(m, nd); heap.push(nd, m); }
        }
      }
    }
    if (entry < 0) return null;
    // the way: from the entry downhill in `dist` to the goal
    const path = [entry];
    for (let cur = entry, guard = 0; cur !== goal && guard < 100000; guard++) {
      const x = cur % W;
      let best = -1, bd = dist.get(cur);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= W) continue;
        const m = cur + dy * W + dx;
        if (m < 0 || m >= N) continue;
        const dm = dist.get(m);
        if (dm !== undefined && done.has(m) && dm < bd) { bd = dm; best = m; }
      }
      if (best < 0) break;
      path.push(best); cur = best;
    }
    // the lane: whatever of tid's land lies within half the width of the way (steps in eight directions)
    const lane = new Set(), r = Math.max(1, width >> 1), q = [], depth = new Map();
    for (const n of path) { lane.add(n); depth.set(n, 0); q.push(n); }
    for (let i = 0; i < q.length; i++) {
      const n = q[i], dn = depth.get(n);
      if (dn >= r) continue;
      const x = n % W;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if ((!dx && !dy) || x + dx < 0 || x + dx >= W) continue;
        const m = n + dy * W + dx;
        if (m < 0 || m >= N || lane.has(m) || !land[m] || own[m] !== tid) continue;
        lane.add(m); depth.set(m, dn + 1); q.push(m);
      }
    }
    for (const n of lane) if (!dist.has(n)) dist.set(n, (dist.get(entry) || 0) + width);
    return { entry: entry, goal: goal, path: path, lane: lane, dist: dist, width: width };
  };
  // What a thrust will likely do, for the preview. It plays the fight through on a shadow copy of
  // its lane, tick by tick and with the same rules as `addFront` and `tickAttack`: the same order
  // of tiles (nearer the goal first, gaps filled, rough ground later), the head no faster than
  // `speed`, a tick's budget, each tile priced as there (tileLoss, tileTime), the troops shrinking
  // with every tile and the cells thinning as their defenders fall. What it leaves out (a
  // counter-attack, a third party taking land) only makes the real thrust do a little worse.
  //   reach: share of the way it gets (0..1), left: troops left when the goal falls (0 if it does
  //   not), secs: seconds until then, counted: tiles taken until then, tiles, len.
  Game.prototype.thrustEstimate = function (p, route, troops) {
    const tid = this.owner[route.goal], t = tid ? this.players[tid] : null, CB = G.COMBAT, map = this.map, W = this.W, H = this.H;
    const own = this.owner, pid = p.id, mg = map.mag;
    const tp = t ? t.post : null;
    let tT = t ? t.troops : 0, tN = t ? t.tiles : 1;      // the defender's troops and land, shrinking as the fight goes
    const dp = t ? t.dposts : null, dr2 = this.R.defense * this.R.defense, TR = G.TERRAIN;
    const traitor = t && t.traitorUntil > this.ticks ? 0.5 : 1;
    const dist = route.dist, lane = route.lane, start = dist.get(route.entry) || 0, width = route.width;
    const taken = new Set(), front = new Set(), heap = new G.Heap(256), cells = new Map();
    const mine = function (n) { return own[n] === pid || taken.has(n); };
    // the fight rolls a die for every tile it queues; the preview rolls its own, from a fixed start,
    // so the game's dice are left alone and the same drag always shows the same verdict
    let T = 0, seed = 12345;
    // like addFront: the lane tiles next to `tile` join the front, keyed the way the fight keys them
    const add = function (tile) {
      const x = tile % W, y = (tile - x) / W;
      for (let k = 0; k < 4; k++) {
        let n;
        if (k === 0) { if (x === 0) continue; n = tile - 1; } else if (k === 1) { if (x === W - 1) continue; n = tile + 1; }
        else if (k === 2) { if (y === 0) continue; n = tile - W; } else { if (y === H - 1) continue; n = tile + W; }
        if (!lane.has(n) || taken.has(n)) continue;
        front.add(n);
        const nx = n % W, ny = (n - nx) / W;
        let c = 0;
        if (nx > 0 && mine(n - 1)) c++;
        if (nx < W - 1 && mine(n + 1)) c++;
        if (ny > 0 && mine(n - W)) c++;
        if (ny < H - 1 && mine(n + W)) c++;
        if (c > 2) c = 10;
        const m = mg[n], rough = m < 10 ? 1 : m < 20 ? 1.5 : 2, d = dist.get(n);
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        heap.push((10 + ((seed >>> 16) & 7)) * (1 - c * 0.5 + rough / 2) + T + G.THRUST.pull * (d === undefined ? 1e3 : d), n);
      }
    };
    for (const b of p.border) add(b);
    const step = G.THRUST.speed * this.attackPace, defer = [], MO = G.MOMENTUM;
    let left = troops, count = 0, head = start, limit = start, carry = 0, reach = 0, done = false, won = false;
    // momentum as the fight has it (switch `schwung`): starts where the thrust breaks in
    const mom0 = this.schwung && t ? this.momentumStart(p, [route.entry]) : -1;
    let mom = mom0;
    for (; T < 3000 && !done; T++) {
      limit = Math.max(limit - step, head - 3 * step);
      const dAvg = tT / Math.max(1, tN);
      const n = front.size + 2;
      let budget = (t ? 1 : n * (p.type === PT.BOT ? 1.9 : 2)) * this.attackPace + carry;
      if (budget <= 0) { carry = budget; continue; }
      while (budget > 0) {
        if (heap.n === 0) { if (!defer.length) done = true; break; }
        const tile = heap.pop();
        front.delete(tile);
        if (taken.has(tile)) continue;
        const dt = dist.get(tile);
        if (dt !== undefined && dt < limit) { defer.push(tile); continue; }
        const x = tile % W, y = (tile - x) / W, m = mg[tile];
        let gl = (m < 10 ? 1 : m < 20 ? 1.25 : 1.5) * G.groundLoss(map, tile), gs = (m < 10 ? 1 : m < 20 ? 1.2121 : 1.5152) * G.groundSpeed(map, tile);
        if (map.cover) { const f = map.feat[tile]; if (f & 2) { gl *= TR.greatLoss; gs *= TR.greatSpeed; } else if (f & 1) { gl *= TR.riverLoss; gs *= TR.riverSpeed; } }
        let loss, used;
        if (t) {
          // the cell thins out as its tiles fall and its defenders with them, as postTake does
          const pc = tp ? tp.cells.get(this.cellOf(tile)) : null;
          let cs = null, dens = 1;
          if (pc) {
            cs = cells.get(pc.id);
            if (!cs) { cs = { c: this.postDens(t, pc) * dAvg * pc.n, n: pc.n }; cells.set(pc.id, cs); }
            dens = cs.n > 0 && dAvg > 0 ? cs.c / cs.n / dAvg : 1;
          }
          let mag = 80 * gl, speed = 16.5 * gs, inPost = false;
          if (dp && dp.length) for (let i = 0; i < dp.length; i++) { const dx = dp[i].x - x, dy = dp[i].y - y; if (dx * dx + dy * dy <= dr2) { mag *= this.postMag(dp[i].level, t); speed *= this.postSpd(dp[i].level); inPost = true; break; } }
          let dk = pc ? Math.min(CB.densMax, dens) : 1;
          if (this.lang && pc) { if (inPost) dk = Math.max(dk, G.LANG.postDens); const e = this.digOf(pc, t); mag *= 1 + this.digLossOf(t) * e; speed *= 1 + G.LANG.digTime * e; }
          const D = dAvg * Math.pow(dk, CB.dFall);
          const R = tT / Math.max(1, left);
          loss = this.tileLoss(mag, R, dAvg, dk, pc ? this.postHold(pc) : 1, p.type !== PT.BOT && t.type === PT.BOT, traitor);
          used = this.tileTime(speed, R, dk, traitor, front.size);
          if (mom0 > 0) {
            const fade = this.cellRail && this.CW ? 1 - (1 - MO.railFade) * (1 - this.cellRail[this.cellOf(tile)]) / 0.8 : 1;
            mom -= MO.decay * within(loss / (2 * CB.base), 0.25, 4) / Math.max(4, width) * fade;
            const k = Math.max(mom, MO.slow);
            loss /= Math.sqrt(k); used /= Math.min(1.25, k);
          }
          const gone = Math.min(tT, D);
          tT -= gone; tN--;
          if (cs) { cs.c = Math.max(0, cs.c - gone); cs.n--; }
        } else {
          const mag = 80 * (1 + (gl - 1) * TR.free), speed = 16.5 * (1 + (gs - 1) * TR.free);
          loss = p.type === PT.BOT ? mag / 10 : mag / 5;
          used = within(2000 * Math.max(10, speed) / Math.max(1, left), 5, 100);
        }
        budget -= used; left -= loss; taken.add(tile); count++;
        if (dt !== undefined && dt < head) head = dt;
        if (start > 0 && dt !== undefined) reach = Math.max(reach, 1 - dt / start);
        if (left < 1) { left = 0; done = true; break; }
        if (tile === route.goal) { won = true; done = true; break; }
        if (mom0 > 0 && mom < MO.stop) { done = true; break; }          // out of momentum: it halts here
        add(tile);
      }
      carry = Math.min(0, budget);
      for (let i = 0; i < defer.length; i++) { if (!taken.has(defer[i])) { front.add(defer[i]); heap.push(T + 1 + i * 1e-3, defer[i]); } }
      defer.length = 0;
    }
    if (won) reach = 1; else left = 0;
    return { reach: reach, left: left, secs: T / 10, counted: count, tiles: lane.size, len: route.path.length, mom: mom0, stalled: mom0 > 0 && mom < MO.stop };
  };
  // ---------- momentum ----------
  // A coarse key for a stretch of land (16 x 16 tiles), independent of the posture.
  Game.prototype.zoneOf = function (t) { const W = this.W, x = t % W; return (((t - x) / W) >> 4) * ((W + 15) >> 4) + (x >> 4); };
  // Where an attack starts, as a handful of tiles: the entry of a thrust, the spot of a direction
  // attack, otherwise up to 48 tiles of its front.
  Game.prototype.momentumSpots = function (at) {
    if (at.path && at.path.length) return [at.path[0]];
    if (at.spot >= 0) return [at.spot];
    const out = [], step = Math.max(1, Math.floor(at.front.size / 48));
    let i = 0;
    for (const t of at.front) { if (i++ % step === 0) out.push(t); if (out.length >= 48) break; }
    return out;
  };
  // The momentum an attack from these tiles would start with. Reads the game only (the preview
  // asks too). Rest: how long since the last attack from there; mass: how dense the attacker's
  // own troops stand there (only with a posture); rail: a railway there.
  Game.prototype.momentumStart = function (a, spots) {
    const MO = G.MOMENTUM, T = this.ticks, tired = a.tired;
    if (!spots.length) return 1;
    let rest = 0, mass = 0, rail = 0;
    for (const t of spots) {
      const last = tired ? tired.get(this.zoneOf(t)) : undefined;
      rest += last === undefined ? 1 : within((T - last) / MO.rest, 0, 1);
      if (a.post && this.CW) { const c = a.post.cells.get(this.cellOf(t)); if (c) mass += within((this.postDens(a, c) - 1) * MO.mass, 0, MO.max - 1); }
      if (this.cellRail && this.CW) rail += MO.rail * (1 - this.cellRail[this.cellOf(t)]) / 0.8;
    }
    const n = spots.length;
    return within((rest / n) * (1 + mass / n + rail / n + (this.lang && this.has(a, 'blitz') ? 0.1 : 0)), MO.min, MO.max);
  };
  // How many thrusts a player has under way.
  // Where a direction attack of p's toward `tile` starts and which way it goes: the own border
  // tile nearest to it, the direction from there to the tile, and the half width of the band (half
  // a section). null when the tile lies more than a section's width from the border. Reads only.
  Game.prototype.dirFrom = function (p, tile) {
    // the band is as wide as the realm is large: a share of the side of a square of the same area
    // (not a fixed section), so a small realm attacks narrow and a big one broad
    const W = this.W, nx = tile % W, ny = (tile / W) | 0, reach = this.thrustWidth(1) / 2;
    const half = Math.max(4, Math.round(G.THRUST.dirShare * Math.sqrt(Math.max(1, p.tiles)) / 2));
    let d2 = Infinity, o = -1;
    for (const b of p.border) { const dx = b % W - nx, dy = ((b / W) | 0) - ny, d = dx * dx + dy * dy; if (d < d2 || (d === d2 && b < o)) { d2 = d; o = b; } }
    if (o < 0 || d2 > 4 * Math.max(half, reach) * Math.max(half, reach)) return null;
    let dx = nx - o % W, dy = ny - ((o / W) | 0), l = Math.sqrt(dx * dx + dy * dy);
    if (l < 1) { dx = 1; dy = 0; l = 1; }
    return { o: o, dx: dx / l, dy: dy / l, half: half };
  };
  Game.prototype.thrustCount = function (p) {
    let n = 0;
    for (const o of p.out) if (o.active && (o.goal >= 0 || o.spot >= 0)) n++;
    return n;
  };

  // Send troops against a player (tid) or against free land (tid 0). src is a landing tile, or -1.
  // near: the tile the order was given at. For a realm with a posture the troops are then drawn
  // from the cell at that spot; what is not at hand marches there and joins as it arrives.
  // mode: 0 the whole front (default), 1 a section, 2 a wedge, 3 a direction; for 1 to 3 `near` is the goal.
  Game.prototype.attack = function (a, tid, troops, src, near, mode, start) {
    this.attackWhy = '';
    if (!a.alive || this.phase !== 'play') return null;
    const t = tid ? this.players[tid] : null;
    if (t) {
      if (t === a || !t.alive || this.friendly(a, t)) return null;
      if (this.ticks < this.immuneUntil) return null;
    }
    // A thrust needs a way; reinforcing one that aims close by joins it instead of starting another.
    let route = null, join = null, spot = -1, rad = 0;
    if (mode === 3 && src < 0 && near >= 0) {
      // a direction attack: the part of the front facing the tile clicked; joins one that starts
      // close by and points the same way
      var dir = this.dirFrom(a, near);
      if (!dir) { this.attackWhy = 'Zu weit von deiner Grenze'; return null; }
      const W = this.W, ox = dir.o % W, oy = (dir.o / W) | 0;
      for (const o of a.out) {
        if (!o.active || o.tid !== tid || o.spot < 0) continue;
        const dx = o.spot % W - ox, dy = ((o.spot / W) | 0) - oy;
        if (dx * dx + dy * dy <= dir.half * dir.half && o.dx * dir.dx + o.dy * dir.dy > 0.8) { join = o; break; }
      }
      if (!join) {
        if (this.thrustCount(a) >= G.THRUST.max) { this.attackWhy = 'Höchstens ' + G.THRUST.max + ' Stösse gleichzeitig'; return null; }
        spot = dir.o; rad = dir.half;
      }
    } else if (mode && src < 0 && near >= 0) {
      const width = this.thrustWidth(mode);
      for (const o of a.out) {
        if (!o.active || o.tid !== tid || o.goal < 0 || o.width !== width) continue;
        const dx = o.goal % this.W - near % this.W, dy = ((o.goal / this.W) | 0) - ((near / this.W) | 0);
        if (dx * dx + dy * dy <= width * width) { join = o; break; }
      }
      if (!join) {
        if (this.thrustCount(a) >= G.THRUST.max) { this.attackWhy = 'Höchstens ' + G.THRUST.max + ' Stösse gleichzeitig'; return null; }
        route = this.thrustRoute(a, tid, near, width, start === undefined ? -1 : start);
        if (!route) { this.attackWhy = 'Kein Weg dorthin'; return null; }
      }
    }
    // Every attack, a thrust as well as the whole front, takes its troops at once and from the
    // whole realm alike. How troops stand (density, digging in, reserves, pockets) only counts
    // for the defender.
    troops = Math.min(troops, a.troops);
    if (troops < 1) return null;
    a.troops -= troops;
    if (t) {
      troops = this.meetIncoming(a, t, troops);
      if (troops < 1) return null;
    }
    if (t) this.relate(t, a, -80);
    let at = join;
    if (!at && !route && spot < 0) for (const o of a.out) if (o.active && o.tid === tid && o.goal < 0 && o.spot < 0) { at = o; break; }
    if (!at) {
      at = new Attack(++this.attackSeq, a, tid, 0, this.ticks);
      if (route) { at.goal = route.goal; at.width = route.width; at.path = route.path; at.lane = route.lane; at.dist = route.dist; }
      if (spot >= 0) { at.spot = spot; at.rad = rad; at.dx = dir.dx; at.dy = dir.dy; at.width = 2 * rad; }
      a.out.push(at);
      if (t) {
        t.inc.push(at);
        if (t === this.human && this.ticks - (a.warnAt || -999) > 300) {
          a.warnAt = this.ticks; this.say(a.name + ' greift dich an', 'bad');
          this.emit({ k: 'raid', id: a.id });   // the interface sounds the alarm
        }
      }
      this.attacks.push(at);
      if (src < 0) this.refreshFront(at);
      // momentum: how much push a narrow attack (wedge, section, direction) starts with (rest,
      // troops massed there, railway). Only narrow ones: the whole front is the broad, safe way,
      // and every click on it feeds the same attack; with momentum (until 23.11.2026) a few
      // clicks in a row left it tired, it halted at once and the troops came home.
      if (this.schwung && t && (at.goal >= 0 || at.spot >= 0)) at.mom = this.momentumStart(a, this.momentumSpots(at));
    }
    if (src >= 0) this.addFront(at, src);
    at.troops += troops; at.sum = (at.sum || 0) + troops;   // sum: all ever sent, for the display
    return at;
  };
  // A thrust whose lane has run out before the goal fell (someone else took the way, or the lane
  // was cut): it looks for a new way from where it stands, a few times, and otherwise comes home.
  Game.prototype.rerouteThrust = function (at) {
    if (at.reroute >= 3) return false;
    at.reroute++;
    const r = this.thrustRoute(at.a, at.tid, at.goal, at.width);
    if (!r) return false;
    at.path = r.path; at.lane = r.lane; at.dist = r.dist; at.head = undefined;
    this.refreshFront(at);
    return at.heap.n > 0;
  };
  // Troops sent against someone who is attacking us first meet that attack, one for one.
  Game.prototype.meetIncoming = function (a, t, troops) {
    for (const inc of a.inc.slice()) {
      if (!inc.active || inc.a !== t) continue;
      if (inc.troops > troops) { inc.troops -= troops; return 0; }
      troops -= inc.troops;
      // a counter-attack catches our attack: both lose as many, one for one (as OpenFront)
      if (t === this.human && t.alive) this.say('Dein Angriff auf ' + a.name + ' wurde vom Gegenangriff abgefangen (' + G.fmt(inc.troops) + ' gegen ' + G.fmt(inc.troops) + ')', 'warn');
      this.endAttack(inc, false);
    }
    return troops;
  };
  Game.prototype.feedAttack = function (at, troops) {
    if (at.tid) troops = this.meetIncoming(at.a, this.players[at.tid], troops);
    at.troops += troops; at.sum = (at.sum || 0) + troops;
  };

  Game.prototype.endAttack = function (at, refund) {
    if (!at.active) return;
    at.active = false;
    at.want = 0;                 // whoever was still marching simply stays where they are
    if (refund && at.a.alive && at.troops > 0) {
      const c = at.a.post && at.cell >= 0 ? this.postCellOfAttack(at) : null;
      if (c) this.postGive(at.a, c, at.troops); else at.a.troops += at.troops;   // they come back where they set out
    }
    let i = at.a.out.indexOf(at);
    if (i >= 0) at.a.out.splice(i, 1);
    if (at.tid) {
      const t = this.players[at.tid];
      i = t.inc.indexOf(at);
      if (i >= 0) t.inc.splice(i, 1);
    }
  };
  // Calling troops back costs a quarter of them.
  Game.prototype.retreat = function (at) {
    if (!at.active) return;
    at.troops *= 0.75;
    this.endAttack(at, true);
  };

  // One tile of a realm, as OpenFront has it (EngineConfig.attackLogic): the attacker loses
  // mag x within(army / attack, 0.6, 2) x (0.463 + 0.0039 x troops per tile), a human or nation
  // against a bot x 0.7; the tile takes within(R, 0.82, 7.5) x within(R / 20, 1, 50) / 8.55 x its
  // cost of a tick's budget, shared over the front. `mag` and `speed` carry ground, defence posts
  // and fallout. On top the cell's density `dk`, mild on purpose (a buffer that deters, no wall:
  // time x √dk, price x dk^0.25, so three times as dense is 1.7 times as slow and 1.3 times as
  // dear; until later on 23.11.2026 time x dk, price x √dk) and its hold (cut off).
  Game.prototype.tileLoss = function (mag, R, dAvg, dk, holdF, botHit, traitor) {
    return mag * (botHit ? 0.7 : 1) * traitor * within(R, 0.6, 2) * (0.463 + 0.0039 * dAvg) * Math.pow(dk, G.COMBAT.dLoss) * holdF;
  };
  Game.prototype.tileTime = function (speed, R, dk, traitor, front) {
    return within(R, 0.82, 7.5) * within(R / 20, 1, 50) / 8.55 * speed * (traitor < 1 ? 0.5 : 1) / Math.max(1, front + 1) * Math.pow(dk, G.COMBAT.dTime);
  };

  Game.prototype.tickAttack = function (at) {
    const a = at.a, tid = at.tid, t = tid ? this.players[tid] : null;
    if (!a.alive) { this.endAttack(at, false); return; }
    if (t && (!t.alive || this.friendly(a, t))) { this.endAttack(at, true); return; }
    if (at.want > 0) this.postDrain(at);
    if (at.troops < 1) { if (at.want > 0) return; this.endAttack(at, false); return; }
    const own = this.owner, map = this.map, mg = map.mag, W = this.W, H = this.H, aid = a.id;
    const n = at.front.size + this.rng.int(0, 5);
    const CB = G.COMBAT, dAvg = t ? t.troops / Math.max(1, t.tiles) : 0;
    const narrow = at.goal >= 0 || at.spot >= 0;
    // («Feste Grenzen» capped until 23.11.2026 what a narrow attack could bring to bear, two per
    // defender facing it, so a blitz was no faster than the whole front. With the whole realm
    // behind every attack the cap made a wedge twice as dear and slow as in «Grenzland»; how fast a
    // thrust's head may move (`G.THRUST.speed`) keeps a blitz in check in both systems.)
    // What the front may take this tick: against a realm a whole tick, each tile a share of it
    // (OpenFront, tileTime); on free land a few tiles per tile of front. A tile that costs more
    // than is left is paid off over the following ticks (`carry`).
    let budget = (t ? 1 : n * (a.type === PT.BOT ? 1.9 : 2)) * this.attackPace + (at.carry || 0);
    // A narrow attack with momentum that has taken nothing for `stall` ticks has stuck fast: it
    // halts like one out of momentum, its troops stay as defenders. Before 23.11.2026 it could sit
    // there for minutes paying off one dear tile, with its troops tied up and nothing to see.
    if (at.want > 0) at.took = this.ticks;   // troops still marching up: not stuck
    if (at.mom !== undefined && this.ticks - (at.took !== undefined ? at.took : at.start) > G.MOMENTUM.stall) {
      if (a === this.human) this.say('Der Angriff auf ' + t.name + ' steckt fest und hält an', 'warn');
      this.endAttack(at, true);
      return;
    }
    if (budget <= 0) { at.carry = budget; return; }
    const landTiles = map.landTiles;
    const traitor = t && t.traitorUntil > this.ticks ? 0.5 : 1;
    const dp = t ? t.dposts : null, dr2 = this.R.defense * this.R.defense, fo = this.fallout;
    const cov = map.cover, ft = map.feat, TR = G.TERRAIN;
    const tp = t ? t.post : null;
    // A thrust's head moves no faster than `speed` (way cost per tick); what lies further ahead
    // waits, and the budget goes into the width of the lane meanwhile.
    const aimed = at.goal >= 0 && !at.reached, defer = this.deferList || (this.deferList = []);
    defer.length = 0;
    // `limit` moves toward the goal by `step` every tick, but runs at most three steps ahead of the
    // head, so a thrust that was held up does not leap forward afterwards.
    if (aimed) {
      const step = G.THRUST.speed * this.attackPace;
      if (at.head === undefined) at.head = at.limit = at.dist.get(at.path[0]) || 0;
      at.limit = Math.max(at.limit - step, at.head - 3 * step);
    }
    const headLimit = aimed ? at.limit : 0;
    let guard = 0;
    while (budget > 0) {
      if (at.troops < 1) { if (at.want > 0) { at.carry = 0; return; } this.endAttack(at, false); return; }
      if (at.goal >= 0 && !at.reached && own[at.goal] !== tid) {
        // the goal has fallen (to us or to someone else): from now on the thrust widens around it
        at.reached = true; this.refreshFront(at);
      }
      if (at.heap.n === 0) {
        if (defer.length) break;
        this.refreshFront(at);
        if (at.heap.n === 0 && !(at.goal >= 0 && !at.reached && this.rerouteThrust(at))) { this.endAttack(at, true); return; }
      }
      if (++guard > 100000) return;
      const tile = at.heap.pop();
      at.front.delete(tile);
      if (own[tile] !== tid) continue;
      const x = tile % W, y = (tile - x) / W;
      if (!((x > 0 && own[tile - 1] === aid) || (x < W - 1 && own[tile + 1] === aid) ||
            (y > 0 && own[tile - W] === aid) || (y < H - 1 && own[tile + W] === aid))) continue;
      let dt = 0;
      if (aimed) {
        dt = at.dist.get(tile);
        if (dt !== undefined && dt < headLimit) { defer.push(tile); continue; }
      }
      this.addFront(at, tile);
      const m = mg[tile];
      // what the ground adds, as factors over open lowland
      let gl = m < 10 ? 1 : m < 20 ? 1.25 : 1.5, gs = m < 10 ? 1 : m < 20 ? 1.2121 : 1.5152;
      gl *= G.groundLoss(map, tile); gs *= G.groundSpeed(map, tile);
      if (cov) {
        const f = ft[tile];
        if (f & 2) { gl *= TR.greatLoss; gs *= TR.greatSpeed; }
        else if (f & 1) { gl *= TR.riverLoss; gs *= TR.riverSpeed; }
      }
      // Ground, defence posts and fallout weigh fully against a realm (as OpenFront); empty land is
      // taken almost as fast in the mountains as on the plain (`TR.free`).
      const pc = tp ? tp.cells.get(this.cellOf(tile)) : null;
      const hold = t ? 1 : TR.free;
      const ph = this.lang && this.has(a, 'pionier') ? hold * 0.6 : hold;   // research Pioniere: the ground slows your attack less
      let mag = 80 * (1 + (gl - 1) * ph), speed = 16.5 * (1 + (gs - 1) * ph), inPost = false;
      if (dp && dp.length) {
        for (let i = 0; i < dp.length; i++) {
          const dx = dp[i].x - x, dy = dp[i].y - y;
          if (dx * dx + dy * dy <= dr2) { mag *= this.postMag(dp[i].level, t); speed *= this.postSpd(dp[i].level); inPost = true; break; }   // level 1: losses x5, speed cost x3
        }
      }
      if (fo[tile]) { const f = 5 - 2 * this.falloutCount / landTiles; mag *= f; speed *= f; }
      let loss, used;
      if (t) {
        // Every attack on a realm, the whole front as well as a wedge, fights as in OpenFront
        // (tileLoss, tileTime), with only the density of the cell on top (`dk`, 1 = the realm's
        // average): a dense tile is slower to take and a little dearer, and all who stand on it
        // fall with it. Density so buys time and costs the defender troops; it adds no strength.
        // Since 23.11.2026; before, a local fight of its own with digging in, reserves, a floor
        // price and ground weighed by the local odds: nobody could judge whom he could beat.
        // R: the defender's whole army against this attack, as OpenFront. (For a few hours on
        // 23.11.2026 the attacker's whole realm counted instead: every attack, a counter-attack as
        // well, then came cheap, and land swung to and fro.)
        let dk = pc ? Math.min(CB.densMax, this.postDens(t, pc)) : 1;
        // «Langes Spiel»: a post holds its ground even when thin, a quiet cell digs in (src/04c_lang.js)
        if (this.lang && pc) { if (inPost) dk = Math.max(dk, G.LANG.postDens); const e = this.digOf(pc, t); mag *= 1 + this.digLossOf(t) * e; speed *= 1 + G.LANG.digTime * e; }
        const R = t.troops / Math.max(1, at.troops);
        loss = this.tileLoss(mag, R, dAvg, dk, pc ? this.postHold(pc) : 1, a.type !== PT.BOT && t.type === PT.BOT, traitor);
        if (this.lang) {
          if (t.outlawUntil > this.ticks) loss /= G.LANG.outlawHit;   // «Langes Spiel»: an outcast is fought harder
          if (this.has(a, 'heer3a') && this.airCover(a, tile)) loss *= 0.85;   // research Warthog: cheaper within reach of an own airfield
        }
        used = this.tileTime(speed, R, dk, traitor, at.front.size);
        if (this.lang && pc && this.has(t, 'heer3b') && t.post && t.post.front && !t.post.front.has(pc.id)) used *= 1.3;   // research Apache: slow behind the front
        if (at.mom !== undefined) {
          // momentum (wedge, section, direction in «Grenzland»): fades with every tile, the more the
          // dearer the tile and the narrower the front, slower along a railway; with little of it
          // every tile is dearer and slower
          const MO = G.MOMENTUM, wide = Math.max(4, at.width || 0);
          const fade = this.cellRail && this.CW ? 1 - (1 - MO.railFade) * (1 - this.cellRail[this.cellOf(tile)]) / 0.8 : 1;
          at.mom -= MO.decay * within(loss / (2 * CB.base), 0.25, 4) / wide * fade * (this.lang && this.has(a, 'heer4') ? 0.7 : 1);
          const k = Math.max(at.mom, MO.slow);   // at most half as fast (until 23.11.2026 down to a quarter: a tired wedge froze)
          loss /= Math.sqrt(k); used /= Math.min(1.25, k);
        }
        if (pc) this.postTake(t, pc, dAvg * Math.pow(dk, CB.dFall));
        else t.troops = Math.max(0, t.troops - dAvg);
      } else {
        loss = a.type === PT.BOT ? mag / 10 : mag / 5;
        used = within(2000 * Math.max(10, speed) / at.troops, 5, 100);
      }
      budget -= used; at.troops -= loss;
      if (aimed && dt !== undefined && dt < at.head) at.head = dt;
      at.taken = (at.taken || 0) + 1;
      at.took = this.ticks;
      if (at.mom !== undefined) (a.tired || (a.tired = new Map())).set(this.zoneOf(tile), this.ticks);
      this.conquer(a, tile);
      if (t && t.tiles < 100) { this.finishOff(a, t); this.endAttack(at, true); return; }
      if (at.mom !== undefined && at.mom < G.MOMENTUM.stop) {
        // out of momentum: the attack halts, and those still in it stay as defenders of what they took
        if (a === this.human) this.say('Der Angriff auf ' + t.name + ' hat keinen Schwung mehr', 'warn');
        this.redefer(at, defer);
        this.endAttack(at, true);
        return;
      }
    }
    at.carry = Math.min(0, budget);
    this.redefer(at, defer);
  };
  // Tiles a thrust's head had to leave for later go back onto its front for the next tick.
  Game.prototype.redefer = function (at, defer) {
    for (let i = 0; i < defer.length; i++) { const n = defer[i]; if (this.owner[n] === at.tid) { at.front.add(n); at.heap.push(this.ticks + 1 + i * 1e-3, n); } }
    defer.length = 0;
  };

  // Whoever takes a player over gets its gold; a bot pays a bounty on top.
  // On top comes a reward by size: so much gold for every tile the conquered realm held at its largest.
  // The colours of the nations: matt, medium-light, spread round the colour wheel in three tones
  // (clear, pale, dusty). Ordered so that the first ones handed out differ the most.
  G.PALETTE = (function () {
    const hues = [4, 24, 42, 58, 78, 104, 134, 158, 176, 194, 212, 232, 256, 282, 308, 334];
    const tones = [[0.36, 0.63], [0.28, 0.71], [0.30, 0.54]];
    const out = [];
    for (let t = 0; t < tones.length; t++) for (let i = 0; i < hues.length; i++) out.push(G.hsl(hues[(i * 7 + t * 5) % hues.length], tones[t][0], tones[t][1]));
    return out;
  })();
  G.BOT_BOUNTY = 60000;
  G.START_GOLD = 250000;
  G.NUKE_PAUSE = 300;     // ticks a nation waits between two volleys of bombs (30 s)
  G.NUKE_VOLLEY = 2;      // bombs in a volley (one more from «Schwer» up)
  G.NUKE_PEACE = 6000;    // ticks after the start in which no nation fires a bomb (ten minutes)
  G.MIRV_LATE = 18000;    // nations fire a MIRV only after this much play (thirty minutes) ...
  G.MIRV_PAUSE = 6000;    // ... at most one of all nations together every ten minutes ...
  G.MIRV_RARE = 40;       // ... and then on one turn of a nation in this many
  // MIRV, deliberately weaker than OpenFront (doku/openfront-abgleich.md): its warheads cover about this
  // share of the target's land, and each hit tile costs the owner this many tiles' worth of troops
  // (OpenFront: 5 for every bomb). Together a MIRV takes roughly a third of the army, not all of it.
  G.MIRV_COVER = 0.33;
  G.WARHEAD_KILL = 1.5;
  G.NUKE_KILL = 3;        // the same for atom and hydrogen bombs, cruise missiles and the beam (OpenFront: 5)
  G.LAND_GOLD = 60;
  G.BOT_LOOT = 0.8;       // a conquered bot pays 20 % less (its gold and the bounty)
  Game.prototype.bounty = function (t) {
    const b = Math.max(t.peak || 0, t.tiles) * G.LAND_GOLD;
    return t.type === PT.BOT ? Math.round((b + G.BOT_BOUNTY) * G.BOT_LOOT) : Math.round(b);
  };
  // everything a conquest pays: the loser's gold (half of it for a person, bots pay less) and the bounty
  Game.prototype.lootValue = function (t) {
    const own = t.type === PT.HUMAN ? t.gold / 2 : t.type === PT.BOT ? t.gold * G.BOT_LOOT : t.gold;
    return Math.floor(own) + this.bounty(t);
  };
  Game.prototype.loot = function (a, t) {
    // a conquered person keeps half of the gold out of the victor's hands, bots and nations lose all of it
    const gold = this.lootValue(t);
    t.gold = 0; a.gold += gold; a.conquests++;
    this.emit({ k: 'loot', by: a.id, gold: gold, x: (t.x0 + t.x1) / 2, y: (t.y0 + t.y1) / 2 });
    return gold;
  };
  // A player reduced to a sliver of land is absorbed whole, gold included.
  Game.prototype.finishOff = function (a, t) {
    this.loot(a, t);   // the gold shows on the map (event 'loot'); no message besides (24.11.2026)
    this.forTiles(t, (x) => this.conquer(a, x));
  };

  // ---------- cut-off pockets ----------
  Game.prototype.removeClusters = function (p) {
    const W = this.W, H = this.H, own = this.owner, id = p.id, st = this.stamp, sid = ++this.sid;
    const border = p.border, clusters = [];
    for (const start of border) {
      if (st[start] === sid) continue;
      const cl = [start];
      st[start] = sid;
      for (let i = 0; i < cl.length; i++) {
        const t = cl[i], x = t % W, y = (t - x) / W;
        for (let dy = -1; dy <= 1; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= H) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= W || (!dx && !dy)) continue;
            const n = yy * W + xx;
            if (st[n] !== sid && own[n] === id && border.has(n)) { st[n] = sid; cl.push(n); }
          }
        }
      }
      clusters.push(cl);
    }
    if (!clusters.length) return;
    let mi = 0;
    for (let i = 1; i < clusters.length; i++) if (clusters[i].length > clusters[mi].length) mi = i;
    for (let i = 0; i < clusters.length; i++) {
      if (p.tiles <= 0) return;
      // With pockets that hold out (`kessel`, Grenzland) the main body of a realm is never handed
      // over for being enclosed: it has to be conquered. OpenFront (and Feste Grenzen) give it away.
      if (i === mi && this.kessel && p.post) continue;
      if (!(i === mi ? this.enclosed(p, clusters[i]) : this.surrounded(p, clusters[i]))) continue;
      // a pocket of a person or a nation holds out for a while (`G.KESSEL`) before it gives up;
      // meanwhile it can break out or be relieved, and its troops starve (03b_posture.js)
      if (this.kessel && p.post && !this.pocketReady(p, clusters[i])) continue;
      this.capturePocket(p, clusters[i]);
    }
  };
  // How long a pocket has been one: every tile remembers when it was first seen in a pocket and
  // when last; a pocket seen again within `G.KESSEL_GAP` ticks keeps its start. True once it has
  // held out for `G.KESSEL` ticks.
  Game.prototype.pocketReady = function (p, cl) {
    const T = this.ticks, from = p.pocketFrom || (p.pocketFrom = new Map()), seen = p.pocketSeen || (p.pocketSeen = new Map());
    let f = T;
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], s = seen.get(t);
      if (s !== undefined && T - s <= G.KESSEL_GAP) { const v = from.get(t); if (v < f) f = v; }
    }
    if (f === T && p === this.human) this.say('Ein Teil deines Landes ist eingekesselt', 'bad');
    for (let i = 0; i < cl.length; i++) { from.set(cl[i], f); seen.set(cl[i], T); }
    if (seen.size > 4 * cl.length + 2000) for (const [t, s] of seen) if (T - s > G.KESSEL_GAP) { seen.delete(t); from.delete(t); }
    p.pocketWait = T;
    return T - f >= G.KESSEL;
  };
  // Every neighbour of the main body belongs to one single other player.
  Game.prototype.enclosed = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id;
    let enemy = 0;
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
      for (let k = 0; k < 4; k++) {
        const o = own[k === 0 ? t - 1 : k === 1 ? t + 1 : k === 2 ? t - W : t + W];
        if (o === id) continue;
        if (!o) return false;
        if (enemy && o !== enemy) return false;
        enemy = o;
      }
    }
    return enemy > 0 && !this.friendly(p, this.players[enemy]);
  };
  // A detached piece that sits inland and inside the reach of the players around it.
  Game.prototype.surrounded = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id, shore = this.map.shore;
    let cx0 = W, cx1 = -1, cy0 = H, cy1 = -1, ex0 = W, ex1 = -1, ey0 = H, ey1 = -1;
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (shore[t] || x === 0 || y === 0 || x === W - 1 || y === H - 1) return false;
      if (x < cx0) cx0 = x;
      if (x > cx1) cx1 = x;
      if (y < cy0) cy0 = y;
      if (y > cy1) cy1 = y;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        const o = own[ny * W + nx];
        if (!o || o === id) continue;
        if (nx < ex0) ex0 = nx;
        if (nx > ex1) ex1 = nx;
        if (ny < ey0) ey0 = ny;
        if (ny > ey1) ey1 = ny;
      }
    }
    return ex1 >= 0 && ex0 <= cx0 && ey0 <= cy0 && ex1 >= cx1 && ey1 >= cy1;
  };
  Game.prototype.capturePocket = function (p, cl) {
    const W = this.W, H = this.H, own = this.owner, id = p.id;
    const count = new Map();
    for (let i = 0; i < cl.length; i++) {
      const t = cl[i], x = t % W, y = (t - x) / W;
      if (own[t] !== id) return;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x - 1 : k === 1 ? x + 1 : x, ny = k === 2 ? y - 1 : k === 3 ? y + 1 : y;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const o = own[ny * W + nx];
        if (o && o !== id) count.set(o, (count.get(o) || 0) + 1);
      }
    }
    let taker = null, best = 0;
    for (const e of count) {
      const q = this.players[e[0]];
      if (this.friendly(p, q)) continue;
      for (const at of q.out) if (at.active && at.tid === id && at.troops > best) { best = at.troops; taker = q; }
    }
    if (!taker) {
      best = 0;
      for (const e of count) {
        const q = this.players[e[0]];
        if (!this.friendly(p, q) && e[1] > best) { best = e[1]; taker = q; }
      }
    }
    if (!taker) return;
    const st = this.stamp, sid = ++this.sid, q = this.q;
    let qh = 0, qt = 0;
    q[qt++] = cl[0]; st[cl[0]] = sid;
    while (qh < qt) {
      const t = q[qh++], x = t % W, y = (t - x) / W;
      if (x > 0 && own[t - 1] === id && st[t - 1] !== sid) { st[t - 1] = sid; q[qt++] = t - 1; }
      if (x < W - 1 && own[t + 1] === id && st[t + 1] !== sid) { st[t + 1] = sid; q[qt++] = t + 1; }
      if (y > 0 && own[t - W] === id && st[t - W] !== sid) { st[t - W] = sid; q[qt++] = t - W; }
      if (y < H - 1 && own[t + W] === id && st[t + W] !== sid) { st[t + W] = sid; q[qt++] = t + W; }
    }
    if (qt === p.tiles) {
      this.loot(taker, p);   // the gold shows on the map (event 'loot')
    }
    const list = q.slice(0, qt);
    for (let i = 0; i < list.length; i++) this.conquer(taker, list[i]);
  };

  // ---------- deaths and victory ----------
  Game.prototype.kill = function (p) {
    p.alive = false; p.troops = 0;
    for (const a of p.out.slice()) this.endAttack(a, false);
    for (const a of p.inc.slice()) this.endAttack(a, true);
    for (const u of p.units.slice()) if (u.type < UT.ATOM) this.removeUnit(u);
    for (const e of p.allies) this.players[e[0]].allies.delete(p.id);
    p.allies.clear(); p.border.clear();
    if (p === this.human) this.emit({ k: 'defeat' });
  };
  Game.prototype.reap = function () {
    const ps = this.players;
    for (let i = 1; i < ps.length; i++) if (ps[i].alive && ps[i].tiles <= 0) this.kill(ps[i]);
  };
  Game.prototype.checkWin = function () {
    const den = Math.max(1, this.map.landTiles - this.falloutCount), ps = this.players;
    let alive = 0, last = null;
    for (let i = 1; i < ps.length; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      alive++; last = p;
      if (p.tiles / den >= WIN_SHARE) { this.winner = p; break; }
    }
    if (!this.winner && alive === 1 && ps.length > 2) this.winner = last;
    if (this.winner) this.emit({ k: 'win', id: this.winner.id });
  };

  // ---------- one step of the simulation (a tenth of a second) ----------
  Game.prototype.tick = function () {
    const T = ++this.ticks, ps = this.players, n = ps.length;
    if (this.phase === 'spawn') {
      // With people in the game it starts as soon as everyone has picked a start point.
      const hs = this.humans;
      let all = true;
      for (let i = 0; i < hs.length; i++) if (!hs[i].spawned) all = false;
      const late = T >= this.spawnEnd;
      if (hs.length ? (all || (late && this.opts.autoSpawn)) : late) {
        for (let i = 0; i < hs.length; i++) {
          if (hs[i].spawned) continue;
          for (let k = 0; k < 400 && !hs[i].spawned; k++) {
            const c = this.rng.int(0, this.N);
            if (this.canSpawnAt(c) && !this.map.shore[c]) this.spawn(hs[i], c);
          }
        }
        this.phase = 'play'; this.playStart = T; this.immuneUntil = T + 50;
        this.emit({ k: 'start' });
      }
      return;
    }
    if (this.res && this.ticks % G.RES.EVERY === 0) this.resTick();
    for (let i = 1; i < n; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      p.troops += this.troopGrowth(p);
      if (p.troops < 0) p.troops = 0;
      p.gold += this.goldRate(p);
    }
    if (this.opts.infiniteGold) for (let i = 0; i < this.humans.length; i++) if (this.humans[i].alive) this.humans[i].gold = 1e9;

    const at = this.attacks;
    for (let i = 0; i < at.length; i++) if (at[i].active) this.tickAttack(at[i]);
    if (T % 20 === 0) this.attacks = at.filter(function (a) { return a.active; });
    this.reap();

    if (this.postTick) this.postTick();
    if (this.lang) this.langTick();
    this.pathStep();
    this.tickRail();
    const us = this.units;
    for (let i = 0; i < us.length; i++) if (us[i].active) this.tickUnit(us[i]);
    if (T % 10 === 0) {
      this.units = us.filter(function (u) { return u.active; });
      this.nukes = this.nukes.filter(function (u) { return u.active; });
    }

    for (let i = 1; i < n; i++) {
      const p = ps[i];
      if (!p.alive) continue;
      if ((T + i * 7) % 20 === 0 && p.lastChange >= (p.boxAt || 0)) { p.boxAt = T; this.shrinkBox(p); }
      if (p.ai) p.ai.tick();
      if ((T + i * 3) % 20 === 0 && (p.lastChange >= p.lastCluster || T - (p.pocketWait || -1e9) <= 40)) { p.lastCluster = T; this.removeClusters(p); }
    }
    if (T % 10 === 0) this.tickDiplomacy();
    this.reap();
    if (this.lv) { if (T % 5 === 0) this.levelTick(); }   // a level ends with its quest, not at 80 % of the land
    else if (T % 10 === 0 && !this.winner) this.checkWin();
  };

  // ---------- sea routes, worked on a little every step ----------
  Game.prototype.requestPath = function (src, dst, cb, urgent, shy, near) {
    const job = { src: src, dst: dst, cb: cb, shy: !!shy }, q = near ? this.nearQ : this.pathQ;
    if (urgent) q.unshift(job); else q.push(job);
  };
  // Sea routes are worked out a slice per tick, in two lanes. A merchant's route across an ocean
  // can take many ticks; a warship's next patrol leg is a short hop that must not queue behind it
  // (that is what used to leave warships lying still). So short hops have a lane and a search
  // of their own; one that turns out not to be short after all is handed to the long lane.
  Game.prototype.pathStep = function () {
    this.pathLane(this.pathNear, this.nearQ, 'nearJob', 9000, 80000);
    this.pathLong(9000);
  };
  // A long route, in two steps (see SeaGraph): which cells of the sea to pass through, then the
  // tiles, in legs of LEG cells, each searched only inside its corridor.
  const LEG = 10;
  Game.prototype.pathLong = function (budget) {
    const sea = this.sea, pf = this.pathLeg, map = this.map;
    while (budget > 0) {
      let j = this.pathJob;
      if (!j) {
        j = this.pathQ.shift();
        if (!j) return;
        budget -= 30;
        if (j.src < 0 || j.dst < 0 || map.land[j.src] || map.land[j.dst] || map.wcomp[j.src] !== map.wcomp[j.dst]) { j.cb(null); continue; }
        if (j.src === j.dst) { j.cb(new Int32Array([j.src])); continue; }
        if (!sea.start(j.src, j.dst)) { j.cb(null); continue; }
        j.stage = 0; this.pathJob = j;
      }
      if (j.stage === 0) {
        budget -= sea.run(budget) * 2;
        if (sea.state === 0) return;
        if (sea.state !== 1) { this.pathJob = null; j.cb(null); continue; }
        j.nodes = sea.result(); j.i = 0; j.cur = j.src; j.parts = []; j.len = 0; j.stage = 1; j.leg = false;
      }
      if (!j.leg) {
        const last = j.nodes.length - 1, to = Math.min(last, j.i + LEG);
        const wp = to === last ? j.dst : sea.rep[j.nodes[to]];
        j.to = to; j.wp = wp;
        if (wp === j.cur) { j.i = to; if (to === last) { this.pathDone(j); } continue; }
        pf.start(j.cur, wp, j.shy, 400000, sea.corridor(j.nodes, j.i, to));
        j.leg = true;
      }
      budget -= pf.run(budget);
      if (pf.state === 0) return;
      if (pf.state !== 1) { this.pathJob = null; j.cb(null); continue; }   // cannot happen while the graph matches the sea
      const part = pf.result();
      j.parts.push(part); j.len += part.length - (j.parts.length > 1 ? 1 : 0);
      j.cur = j.wp; j.i = j.to; j.leg = false;
      if (j.to === j.nodes.length - 1) this.pathDone(j);
    }
  };
  Game.prototype.pathDone = function (j) {
    this.pathJob = null;
    if (!j.parts.length) { j.cb(new Int32Array([j.src])); return; }
    const out = new Int32Array(j.len);
    let n = 0;
    for (let p = 0; p < j.parts.length; p++) {
      const part = j.parts[p];
      for (let i = p ? 1 : 0; i < part.length; i++) out[n++] = part[i];
    }
    j.cb(out);
  };
  Game.prototype.pathLane = function (pf, queue, slot, budget, limit) {
    while (budget > 0) {
      if (!this[slot]) {
        const job = queue.shift();
        if (!job) return;
        if (!pf.start(job.src, job.dst, job.shy, limit)) {
          budget -= 50;
          job.cb(job.src === job.dst && job.src >= 0 && !this.map.land[job.src] ? new Int32Array([job.src]) : null);
          continue;
        }
        this[slot] = job;
      }
      budget -= pf.run(budget);
      if (pf.state !== 0) {
        const job = this[slot];
        this[slot] = null;
        if (pf.state === 1) job.cb(pf.result());
        else if (pf.gaveUp) this.pathQ.push(job);   // not a short hop: the long lane takes it
        else job.cb(null);
      }
    }
  };

  // ---------- what the player can do at a tile ----------
  Game.prototype.actionsAt = function (p, tile) {
    const tid = this.owner[tile], land = this.map.land[tile] === 1;
    const res = {
      tile: tile, land: land, tid: tid, own: tid === p.id,
      target: tid && tid !== p.id ? this.players[tid] : null, canAttack: false, boat: null, why: ''
    };
    if (!p.alive || this.phase !== 'play') { res.why = 'Nicht möglich'; return res; }
    if (!land) { res.why = 'Wasser'; return res; }
    if (res.own) { res.why = 'Eigenes Gebiet'; return res; }
    const q = res.target;
    if (q && this.friendly(p, q)) { res.why = 'Verbündet'; return res; }
    if (q && this.ticks < this.immuneUntil) { res.why = 'Schonfrist: Spieler sind noch geschützt'; return res; }
    // A realm is attacked by land only where it can be reached by land: on an island of theirs
    // that we do not border, a tap sends a boat instead (even while a land attack on them runs).
    if (q ? this.sharesBorder(p, tid, this.landBody()[tile]) : this.tnTouches(p, tile)) res.canAttack = true;
    if (p.boats < 3) res.boat = this.boatPlan(p, tile);
    if (!res.canAttack && !res.boat) res.why = p.boats >= 3 ? 'Höchstens 3 Boote gleichzeitig' : 'Von hier nicht erreichbar';
    return res;
  };
  // Attack over land if there is a shared border, otherwise by sea.
  Game.prototype.strike = function (p, tile, ratio) {
    const a = this.actionsAt(p, tile);
    if (a.canAttack) return this.attack(p, a.tid, p.troops * ratio, -1, tile) ? '' : 'Zu wenig Truppen';
    if (a.boat) return this.sendBoat(p, a.boat, p.troops * ratio) ? '' : 'Boot kann nicht auslaufen';
    return a.why;
  };

  // ---------- orders ----------
  // Everything a person does goes through here, so the same order gives the same result on every device.
  // Returns '' when it worked, otherwise the reason.
  Game.prototype.exec = function (id, c) {
    const p = this.players[id], ps = this.players;
    if (!p || p.type !== PT.HUMAN || !c) return 'Nicht möglich';
    if (c.k === 'spawn') {
      if (this.phase !== 'spawn' || !(c.t >= 0 && c.t < this.N)) return 'Nicht möglich';
      if (!this.canSpawnAt(c.t) && this.owner[c.t] !== p.id) return this.map.land[c.t] ? 'Hier ist schon jemand' : 'Wähle Land, kein Wasser';
      return this.spawn(p, c.t) ? '' : 'Hier nicht möglich';
    }
    if (!p.alive || this.phase !== 'play') return 'Nicht möglich';
    const q = c.p > 0 && c.p < ps.length && c.p !== id ? ps[c.p] : null;
    const tileOk = c.t >= 0 && c.t < this.N, r = within(+c.r || 0, 0.01, 1);
    switch (c.k) {
      case 'strike': {
        if (!tileOk) return 'Nicht möglich';
        const a = this.actionsAt(p, c.t);
        if (a.canAttack && !c.sea) {
          const mode = c.w === 1 || c.w === 2 || (c.w === 3 && this.punkt) ? c.w : 0, st = c.s >= 0 && c.s < this.N ? Math.floor(c.s) : -1;
          return this.attack(p, a.tid, p.troops * r, -1, c.t, mode, st) ? '' : (this.attackWhy || 'Zu wenig Truppen');
        }
        if (a.boat) return this.sendBoat(p, a.boat, p.troops * r) ? '' : 'Boot kann nicht auslaufen';
        return a.why || 'Hier nicht möglich';
      }
      case 'feed': {                                          // reinforce a thrust with a share of the army
        const at = p.out.find(function (o) { return o.active && o.id === c.a; });
        if (!at || (at.goal < 0 && at.spot < 0)) return 'Nicht möglich';
        if (at.spot >= 0) return this.attack(p, at.tid, p.troops * r, -1, Math.round(at.spot + at.dx * 4) + Math.round(at.dy * 4) * this.W, 3) ? '' : (this.attackWhy || 'Zu wenig Truppen');
        const mode = at.width === this.thrustWidth(1) ? 1 : 2;
        return this.attack(p, at.tid, p.troops * r, -1, at.goal, mode) ? '' : (this.attackWhy || 'Zu wenig Truppen');
      }
      case 'ship': return tileOk && this.moveWarship(p, c.t, c.s >= 0 ? Math.floor(c.s) : -1) ? '' : 'Kein Schiff kann dorthin';
      case 'dock': return this.dockWarship(p, Math.floor(+c.s), tileOk ? c.t : -1) ? '' : 'Kein eigener Hafen an diesem Gewässer';
      case 'build': {
        if (!tileOk || !(c.u <= UT.WARSHIP || c.u === UT.ATOM || c.u === UT.HYDRO || c.u === UT.MIRV || c.u === UT.CRUISE || c.u === UT.LASER || (this.lang && (G.LANG_WEAPON(c.u) || c.u === UT.MINE || (G.isPlane(c.u) && c.u !== UT.FIGHTER)))) || !(c.u >= 0)) return 'Nicht möglich';
        if (this.lv && !this.levelAllows(c.u)) return 'In diesem Level noch gesperrt';
        const cls = (c.u === UT.WARSHIP && (c.cls === 1 || (this.lang && (c.cls === 2 || c.cls === 3)))) || (c.u === UT.SAM && this.lang && (c.cls === 1 || c.cls === 2)) || (c.u === UT.SILO && this.lang && c.cls === 1) ? c.cls : 0;    // a battleship; a missile defence, a radar
        const pick = c.s | 0;   // the silo the player chose, 0 = the nearest (src/04c_lang.js)
        const chk = this.buildCheck(p, c.u, c.t, cls, !!c.fresh, pick);
        if (!chk.ok) return chk.why || 'Nicht möglich';
        return this.build(p, c.u, c.t, cls, !!c.fresh, pick) ? '' : 'Nicht möglich';
      }
      case 'salvo': return this.lang ? this.salvo(p, c.list) : 'Nicht möglich';
      case 'spy': return this.lang && q && q !== p ? this.sendSpy(p, q) : 'Nicht möglich';
      case 'host': if (!this.lang || !q) return 'Nicht möglich'; (p.hostOk || (p.hostOk = {}))[q.id] = c.on ? 1 : 0; return '';
      case 'uni': return tileOk && this.lang ? this.buildUni(p, c.t) : 'Nicht möglich';
      case 'research': return this.lang && G.TECH_BY[c.id] ? this.research(p, c.id, tileOk ? c.t : -1) : 'Nicht möglich';
      case 'techoffer': return this.lang && q && G.TECH_BY[c.id] ? this.techOffer(p, q, c.id, c.price) : 'Nicht möglich';
      case 'techtake': return this.lang && q && G.TECH_BY[c.id] ? this.techTake(p, q, c.id) : 'Nicht möglich';
      case 'evac': return tileOk && this.lang ? this.evacuate(p, c.t) : 'Nicht möglich';
      case 'shelter': return tileOk && this.lang ? this.buildShelter(p, c.t) : 'Nicht möglich';
      case 'up': {
        const u = tileOk ? this.structNear(c.t, 4) : null;
        const n = c.n >= 1 && c.n <= 100 ? Math.floor(c.n) : 1;
        return u && this.upgradeBy(p, u, n) > 0 ? '' : 'Ausbau nicht möglich';
      }
      case 'digall': {                                        // version «Rohstoffe»: every own plant one level more
        if (!this.res) return 'Nicht möglich';
        return this.digAll(p, typeof c.r === 'string' ? c.r : '') ? '' : 'Zu wenig Gold';
      }
      case 'dig': {                                           // version «Rohstoffe»: a plant on a deposit, or a better one
        const i = Math.floor(+c.d);
        if (!this.res || !(i >= 0 && i < this.map.deposits.length)) return 'Nicht möglich';
        const chk = this.digCheck(p, i);
        return chk.ok && this.dig(p, i) ? '' : chk.why || 'Nicht möglich';
      }
      case 'mesh': return this.netz && this.postPaint && this.postPaint(p, c.c, c.v) ? '' : 'Nicht möglich';
      case 'even': return this.postReset && this.postReset(p) ? '' : 'Nicht möglich';
      case 'ret': { for (const a of p.out) if (a.id === c.a) { this.retreat(a); return ''; } return 'Nicht möglich'; }
      case 'bret': { for (const u of p.units) if (u.id === c.u && u.type === UT.TRANSPORT) { u.retreat = true; return ''; } return 'Nicht möglich'; }
      case 'ally': return q && this.requestAlliance(p, q) ? '' : 'Gerade nicht möglich';
      case 'ans': {
        for (const rq of this.requests) if (rq.id === c.id && rq.to === p) { this.answerRequest(rq.id, !!c.y); return ''; }
        return 'Nicht möglich';
      }
      case 'renew': return q && this.renewAlliance(p, q) ? '' : 'Nicht möglich';
      case 'break': return q && this.breakAlliance(p, q) ? '' : 'Nicht möglich';
      case 'don': return q && this.donate(p, q, c.g === 'gold' ? 'gold' : 'troops', c.g === 'gold' ? Math.floor(Math.min(p.gold, 1e9) * 0.1) : p.troops * r) ? '' : 'Nicht möglich';
      case 'emb': if (!q) return 'Nicht möglich'; if (c.on) p.embargo.add(q.id); else p.embargo.delete(q.id); return '';
    }
    return 'Nicht möglich';
  };

  // A short fingerprint of the game, to notice when two devices have drifted apart.
  Game.prototype.checksum = function () {
    let h = this.ticks | 0;
    for (let i = 1; i < this.players.length; i++) {
      const p = this.players[i];
      h = (Math.imul(h, 31) + p.tiles) | 0;
      h = (Math.imul(h, 31) + Math.floor(p.troops)) | 0;
      h = (Math.imul(h, 31) + Math.floor(p.gold / 16)) | 0;
      if (p.post) for (const c of p.post.cells.values()) h = (Math.imul(h, 31) + c.n + Math.floor(c.m * 100) + Math.floor(1000 * c.u / (p.post.H || 1))) | 0;
    }
    return h;
  };

  G.Game = Game;
})(globalThis.G = globalThis.G || {});
