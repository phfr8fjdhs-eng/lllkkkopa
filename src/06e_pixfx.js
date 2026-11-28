// Pixel style, part 2 (doku/stil.md): the defence ship, the sea mine, trains and rails, planes in
// 8 directions, effects (shell, explosions, splash, sinking, gold). Built like src/06d_pixart.js:
// plain Pix buffers, palette colours, player colour placeholders.
(function () {
  'use strict';
  const G = globalThis.G, X = G.Pixel, A = G.PixArt, C = X.C, hash = X.hash, K = A.K;
  const PC1 = X.PC1, PC2 = X.PC2, PC3 = X.PC3, PC4 = X.PC4;
  const FOAM = [C('#7692ac'), C('#88a7c3'), C('#a1bdd7')];

  // ---------------------------------------------------------------- defence ship (war4)
  // The destroyer of the sheet (its Pix, player tones already in) with the guns taken off: two
  // missile launch boxes (grid, lids in player colour) and a small white radar dome.
  function war4(destroyer) {
    const d = destroyer, p = new X.Pix(d.w, d.h);
    p.d.set(d.d); p.id.fill(1); p.k.fill(1); p.ax = d.ax; p.ay = d.ay;
    const top = d.h - 75;                                    // the sheet picture sits at the bottom
    const deck = C('#7f8a95'), deck2 = C('#6c707e');
    // paint the gun mounts over with deck (front gun, the two at the stern)
    for (const [x, y, r] of [[22, 52, 4.5], [78, 15, 4], [88, 11, 4]]) {
      for (let j = -Math.ceil(r); j <= r; j++) for (let i = -Math.ceil(r); i <= r; i++) {
        if (i * i + j * j > r * r) continue;
        const xx = x + i, yy = y + j + top;
        if (p.get(xx, yy)) p.d[yy * p.w + xx] = (i + j) % 3 ? deck : deck2;
      }
    }
    const iso = new X.Iso(p, 0, 0);
    const box = (sx, sy) => {
      iso.ox = sx; iso.oy = sy + top;
      iso.box(0, 0, 0, 4, 3, 2.5, {
        l: (s, t) => (t > 1.5 ? C('#898d95') : C('#747c89')), r: C('#5b626e'), lo: C('#3d4552'), hi: C('#a4acb1'), k: 1,
        t: (s, t) => (s % 1 < 0.3 || t % 1 < 0.3 ? C('#2c303d') : ((Math.floor(s) + Math.floor(t)) % 2 ? PC2 : PC1))
      });
    };
    box(21, 45); box(80, 7);
    const dome = new X.Iso(p, 64, 19 + top);
    dome.ball(0, 0, 0, 3.2, [C('#cbd0d3'), C('#b1bdd0'), C('#a4acb1'), C('#7f8a95')], C('#edeef4'), 1);
    // outline what was added where it now touches the water
    const add = [];
    for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (!p.get(x, y) && (p.get(x - 1, y) || p.get(x + 1, y) || p.get(x, y - 1) || p.get(x, y + 1)) && y < p.h - 1) {
      const n = [p.get(x - 1, y), p.get(x + 1, y), p.get(x, y - 1), p.get(x, y + 1)];
      if (n.some((v) => v && v !== C('#16273b') && (v >>> 24) === 255 && !d.d[y * d.w + x])) add.push(x, y);
    }
    for (let i = 0; i < add.length; i += 2) if (!d.get(add[i], add[i + 1])) p.put(add[i], add[i + 1], C('#16273b'));
    return p;
  }

  // ---------------------------------------------------------------- sea mine
  // A dark ball with 6 spikes, half in the water, a ring of foam, 2 × 2 player colour on top.
  function mine() {
    const p = new X.Pix(14, 12), iso = new X.Iso(p, 7, 7.5);
    const R = [C('#5b626e'), C('#3d4552'), C('#2c303d'), C('#20283a')];
    // spikes
    p.obj(1);
    for (const a of [-90, -45, -135, -10, -170, -68]) {
      const r = a * Math.PI / 180;
      for (let k = 3.4; k <= 5.2; k += 0.6) p.put(Math.round(7 + Math.cos(r) * k - 0.5), Math.round(7 + Math.sin(r) * k - 0.5), k > 4.8 ? C('#747c89') : R[1]);
    }
    iso.ball(0, 0, 0, 3.6, R, C('#747c89'), 1, true, 0.6);
    p.obj(1, false); p.put(6, 4, PC2); p.put(7, 4, PC1); p.put(6, 5, PC3); p.put(7, 5, PC2);
    p.finish();
    // foam ring on the water line
    p.obj(0, false);
    for (let x = 0; x < 14; x++) for (const y of [8, 9]) {
      const e = ((x + 0.5 - 7) / 6.2) ** 2 + ((y + 0.5 - 8.4) / 1.6) ** 2;
      if (e < 1 && !p.get(x, y)) p.put(x, y, FOAM[(x + y) % 3]);
    }
    const q = p.trim(); q.ax = Math.round(q.w / 2); q.ay = q.h - 2;
    return q;
  }

  // ---------------------------------------------------------------- trains
  // Seen like everything else: from above at a slant. The track runs on the map's grid (only
  // across or down the screen), so a car shows its roof, seen from above, and the one wall that
  // faces the viewer below it: the long side on a track across the screen, the end on a track
  // down the screen. Light from the top left. (28.11.2026; before: a flat side view on a track
  // seen from above, and on a track down the screen only the ends of the cars, stacked like boxes.)
  //   car(kind, dir): kind 'loco' or 0 (two containers), 1 (tank), 2 (open, with crates);
  //   dir 'h' (front to the right), 'l' (front to the left), 'd' (running down,
  //   the front end shows), 'u' (running up, the back end shows).
  // Anchor (ax, ay): the middle of the car's footprint on the track centre line.
  // The loco carries the owner's colour; wagons keep their load's colours.
  const CAR = { loco: { L: 24, H: 5 }, 0: { L: 21, H: 5 }, 1: { L: 19, H: 4 }, 2: { L: 19, H: 3 } };
  const CB = 7;                                              // width across the track
  const ROOF = [C('#cbd0d3'), C('#a4acb1'), C('#7f8a95')];
  const TK = [C('#a4acb1'), C('#898d95'), C('#747c89'), C('#5b626e')];
  const WD = [C('#a27544'), C('#774f31'), C('#2e2118')];
  const DARK = C('#20283a'), FRAME = C('#2c303d'), HUB = C('#5b626e');
  const GLASS = [K.gl1, K.gl3], LAMP = C('#d1be6d'), CREAM = C('#c4a76a');
  // roof(u, v): u along the car (0 back .. L-1 front), v across (0 the far side .. CB-1 the near
  // side). side(u, t) the near long side, t from the top (0) down; end(v, t, front) an end, v
  // from left to right as seen.
  const ART = {
    loco: {
      roof(u, v, L) {
        if ((u === 0 || u === L - 1) && (v === 0 || v === CB - 1)) return 0;     // rounded corners
        if (u >= L - 7) {                                                          // cab roof in the owner's colour
          if (u === L - 7) return PC3;
          return v === 0 || u === L - 1 ? PC1 : v === CB - 1 ? PC3 : PC2;
        }
        if (v === 0) return K.st1;                                                 // hood: grey, lit edge
        if (v === CB - 1) return K.st3;
        for (const f of [5, 11]) {                                                 // two round fans
          const du = u - f, dv = v - 3;
          if (Math.abs(du) <= 1 && Math.abs(dv) <= 1) return du === 0 && dv === 0 ? K.st3 : Math.abs(du) + Math.abs(dv) === 2 ? K.st2 : K.st5;
        }
        if (u === 15 && v >= 2 && v <= 3) return v === 2 ? K.st5 : K.st4;          // exhaust
        if (u === 0) return K.st3;
        return hash(u, v, 301) < 0.06 ? K.st3 : K.st2;
      },
      side(u, t, L, H) {
        if (t === 0) return u === 0 || u === L - 1 ? PC2 : PC1;
        if (t === H - 1) return PC3;
        if (u >= L - 6 && u <= L - 3 && t >= 1 && t <= 2) return u === L - 6 ? GLASS[1] : GLASS[0];   // cab window
        if (u === L - 7 && t >= 1) return PC3;                                     // cab door line
        if (u === L - 1 && t === H - 2) return LAMP;                               // headlamp
        if (t === H - 2) return CREAM;                                             // stripe
        if (u >= 3 && u <= 15 && t === 1 && u % 2) return PC3;                     // engine louvres
        if (u === 0) return PC3;
        return PC2;
      },
      end(v, t, front, H) {
        if (t === 0) return PC1;
        if (t === H - 1) return PC3;
        if (front && t >= 1 && t <= 2 && v >= 1 && v <= CB - 2) return v < CB / 2 ? GLASS[0] : GLASS[1];   // windscreen
        if (!front && t === 1 && v >= 2 && v <= CB - 3) return K.gl4;              // back window
        if (t === H - 2) return v === 0 || v === CB - 1 ? (front ? LAMP : PC3) : CREAM;
        return PC2;
      }
    },
    0: {                                                     // flat car with two containers
      box(u, L) { return u >= 1 && u <= 9 ? K.cnt[0] : u >= 11 && u <= L - 2 ? K.cnt[3] : 0; },
      roof(u, v, L) {
        const c = this.box(u, L);
        if (!c) return v >= 1 && v <= CB - 2 ? FRAME : 0;                       // the deck between
        if (v === 0) return X.lighter(c);
        if (v === CB - 1) return X.darker(c);
        return (u === 1 || u === 11 || u === 9 || u === L - 2) ? X.darker(c) : u % 3 === 0 ? X.lighter(c) : c;
      },
      side(u, t, L, H) {
        if (t === H - 1) return u === 0 || u === L - 1 ? K.st4 : K.st3;           // deck of the flat car
        const c = this.box(u, L);
        if (!c) return t >= H - 2 ? K.st4 : 0;
        if (t === 0) return X.lighter(c);
        if (u === 1 || u === 11 || u === 9 || u === L - 2) return X.darker(c);      // corner posts
        return u % 2 ? c : X.darker(c);                                            // ribs
      },
      end(v, t, front, H) {
        if (t === H - 1) return K.st3;
        const c = front ? K.cnt[3] : K.cnt[0];
        if (t === 0) return X.lighter(c);
        if (v === 0 || v === CB - 1) return X.darker(c);
        return v === 2 || v === 4 ? X.darker(c) : c;                               // door bars
      }
    },
    1: {                                                     // tank car
      roof(u, v, L) {
        if ((u === 0 || u === L - 1) && (v === 0 || v === CB - 1)) return 0;
        const du = u - Math.floor(L / 2), dv = v - 3;                             // round dome with its hatch
        if (Math.abs(du) <= 1 && Math.abs(dv) <= 1 && Math.abs(du) + Math.abs(dv) < 2) return du === 0 && dv === 0 ? TK[2] : du + dv < 0 ? K.st0 : TK[3];
        if (Math.abs(du) + Math.abs(dv) === 2 && Math.abs(du) <= 1 && Math.abs(dv) <= 1) return TK[1];
        if (u === 2 || u === L - 3) return v === 0 ? TK[1] : TK[2];               // bands
        return [TK[1], TK[0], TK[0], TK[1], TK[1], TK[2], TK[3]][v];               // round from above
      },
      side(u, t, L, H) {
        if (u === 0 || u === L - 1) return t === H - 1 ? K.st4 : TK[3];
        if (t === H - 1) return K.st4;
        if (u === 2 || u === L - 3) return TK[3];
        return t === 0 ? TK[2] : TK[3];
      },
      end(v, t, front, H) {
        if (t === H - 1) return v === 0 || v === CB - 1 ? 0 : K.st4;
        if (t === 0 && (v === 0 || v === CB - 1)) return 0;
        return v <= 1 ? TK[1] : v >= CB - 2 ? TK[3] : TK[2];
      }
    },
    2: {                                                     // open wagon with crates
      roof(u, v, L) {
        if (u === 0 || u === L - 1 || v === 0 || v === CB - 1) return v === 0 || u === 0 ? WD[0] : WD[1];   // rim
        for (const [a, b, c] of [[2, 6, K.cnt[3]], [8, 11, C('#934e1a')], [13, 16, K.cnt[1]]]) {
          if (u >= a && u <= b && v >= 1 && v <= 4) return v === 4 ? X.darker(c) : v === 1 ? X.lighter(c) : c;
        }
        return v === 5 ? WD[2] : (u % 4 ? WD[2] : WD[1]);                         // floor, in shadow
      },
      side(u, t, L, H) {
        if (u % 5 === 0 || u === L - 1) return WD[1];                             // stanchions
        if (t === H - 1) return WD[1];
        return t === 0 ? WD[0] : (hash(u, t, 302) < 0.15 ? WD[1] : WD[0]);
      },
      end(v, t, front, H) { return t === H - 1 || v === 0 || v === CB - 1 ? WD[1] : WD[0]; }
    }
  };
  // A drop shadow, black at 35 %, one pixel to the lower right of the outlined picture.
  const SHADOW = X.pack(0, 0, 0, 89);
  function dropShadow(p) {
    const add = [];
    for (let y = p.h - 1; y > 0; y--) for (let x = p.w - 1; x > 0; x--) if (!p.get(x, y) && p.get(x - 1, y - 1)) add.push(x, y);
    p.obj(0, false);
    for (let i = 0; i < add.length; i += 2) p.put(add[i], add[i + 1], SHADOW);
  }
  function car(kind, dir) {
    const a = ART[kind], L = CAR[kind].L, H = CAR[kind].H, m = 3, k = kind === 2 ? 2 : 1;
    let p;
    if (dir === 'h' || dir === 'l') {
      // 'l': the same car running left, drawn anew (not mirrored) so light and shadow stay put
      const at = dir === 'l' ? (x) => m + L - 1 - x : (x) => m + x;
      p = new X.Pix(L + 2 * m, CB + H + 2 + 2 * m);
      p.obj(k);
      for (let v = 0; v < CB; v++) for (let u = 0; u < L; u++) p.put(at(u), m + v, a.roof(u, v, L));
      for (let t = 0; t < H; t++) for (let u = 0; u < L; u++) p.put(at(u), m + CB + t, a.side(u, t, L, H));
      // under the body: the frame, two bogies with two wheels each, couplers at both ends
      const y = m + CB + H;
      for (let u = 1; u < L - 1; u++) p.put(m + u, y, FRAME);
      for (const b of [3, L - 7]) for (const w of [0, 3]) { p.put(m + b + w, y, DARK); p.put(m + b + w + 1, y, DARK); p.put(m + b + w, y + 1, HUB); p.put(m + b + w + 1, y + 1, DARK); }
      p.put(m - 1, y - 1, K.st4); p.put(m + L, y - 1, K.st4);
      p.ax = m + Math.floor(L / 2); p.ay = m + H + Math.floor(CB / 2);
    } else {
      const front = dir === 'd';                              // running down: the front is at the bottom
      p = new X.Pix(CB + 2 * m, L + H + 1 + 2 * m);
      p.obj(k);
      for (let y = 0; y < L; y++) for (let v = 0; v < CB; v++) {
        const u = front ? y : L - 1 - y;                       // the roof, its far end at the top
        p.put(m + v, m + y, a.roof(u, front ? v : CB - 1 - v, L));
      }
      for (let t = 0; t < H; t++) for (let v = 0; v < CB; v++) p.put(m + v, m + L + t, a.end(v, t, front, H));
      const y = m + L + H;
      for (let v = 1; v < CB - 1; v++) p.put(m + v, y, v === 1 || v === CB - 2 ? DARK : FRAME);
      p.ax = m + Math.floor(CB / 2); p.ay = m + H + Math.floor(L / 2);
    }
    p.finish();
    dropShadow(p);
    return p.trim();
  }
  // the older names, kept for callers
  function loco() { return car('loco', 'h'); }
  function wagon(kind) { return car(kind, 'h'); }
  function trainEnd(kind, front) { return car(kind, front === false ? 'u' : 'd'); }
  // Rail tiles, seen straight from above (the map's grid): ballast, sleepers every 3 pixels, two
  // rails. kind: 'h', 'v', 'x' (crossing), 'c0'–'c3' (curves: 0 left–down, 1 down–right,
  // 2 right–up, 3 up–left).
  const RT = 12;
  function rail(kind) {
    const p = new X.Pix(RT, RT), BAL = [C('#919994'), C('#898d95'), C('#a4acb1')], SL = C('#774f31'), RL = C('#3d4552'), RH = C('#747c89');
    p.obj(0, false);
    const straight = (vert) => {
      for (let i = 0; i < RT; i++) for (let j = 3; j < 9; j++) {
        const [x, y] = vert ? [j, i] : [i, j];
        const r = hash(x, y, 211);
        p.put(x, y, r < 0.2 ? BAL[1] : r > 0.9 ? BAL[2] : BAL[0]);
        if (i % 3 === 1 && j > 3 && j < 8) p.put(x, y, SL);
      }
      for (let i = 0; i < RT; i++) for (const j of [4, 7]) { const [x, y] = vert ? [j, i] : [i, j]; p.put(x, y, RL); }
      for (let i = 0; i < RT; i += 2) { const [x, y] = vert ? [4, i] : [i, 4]; p.put(x, y, RH); }
    };
    if (kind === 'h' || kind === 'x') straight(false);
    if (kind === 'v') straight(true);
    if (kind === 'x') { for (let i = 0; i < RT; i++) for (const j of [4, 7]) p.put(j, i, RL); }
    if (kind[0] === 'c') {
      // a quarter circle round one corner: 0 bottom left (joins left and bottom), 1 bottom right,
      // 2 top right, 3 top left
      const [ox, oy] = [[0, RT], [RT, RT], [RT, 0], [0, 0]][+kind[1]];
      for (let y = 0; y < RT; y++) for (let x = 0; x < RT; x++) {
        const dx = x + 0.5 - ox, dy = y + 0.5 - oy, r = Math.hypot(dx, dy), a = Math.atan2(Math.abs(dy), Math.abs(dx));
        if (r < 3 || r > 9) continue;                          // the ballast, as wide as on the straight
        const h = hash(x, y, 212);
        let c = h < 0.2 ? BAL[1] : h > 0.9 ? BAL[2] : BAL[0];
        // sleepers across the bend, 3 along the middle line (r 6) as on the straight
        if (r > 3.5 && r < 8.5) for (const sk of [1.5, 4.7, 7.9]) if (Math.abs(r * a - r * sk / 6) < 0.6) c = SL;
        // two rails, the outer one with the same light dashes as the straight
        if (Math.abs(r - 4.5) < 0.55) c = RL;
        if (Math.abs(r - 7.5) < 0.55) c = (x + y) % 2 ? RL : RH;
        p.put(x, y, c);
      }
    }
    return p;
  }

  // ---------------------------------------------------------------- planes, 8 directions
  // Each kind is a few flat parts (outline polygons, x forward, y to the right, in pixels) and a
  // fin. For every direction the parts are turned and drawn anew from above at a slant (y × 0.8):
  // eight drawn pictures, nothing turned at run time.
  const PLANES = {
    bomber: {
      parts: [
        { c: [C('#898d95'), C('#747c89')], poly: [[4, -2], [3, -19], [-2, -19], [-5, -2]] },
        { c: [C('#898d95'), C('#747c89')], poly: [[4, 2], [3, 19], [-2, 19], [-5, 2]] },
        { c: [C('#898d95'), C('#747c89')], poly: [[-13, -1], [-15, -7], [-18, -7], [-18, -1]] },
        { c: [C('#898d95'), C('#747c89')], poly: [[-13, 1], [-15, 7], [-18, 7], [-18, 1]] },
        { c: [C('#a4acb1'), C('#898d95')], poly: [[18, 0], [15, -2.4], [-17, -2], [-19, -1], [-19, 1], [-17, 2], [15, 2.4]], spine: C('#b1bdd0') },
        { c: [C('#3d4552'), C('#2c303d')], poly: [[5, -7], [5, -5], [0, -5], [0, -7]] }, { c: [C('#3d4552'), C('#2c303d')], poly: [[5, 5], [5, 7], [0, 7], [0, 5]] },
        { c: [C('#3d4552'), C('#2c303d')], poly: [[4, -13], [4, -11], [-1, -11], [-1, -13]] }, { c: [C('#3d4552'), C('#2c303d')], poly: [[4, 11], [4, 13], [-1, 13], [-1, 11]] },
        { c: [K.gl1, K.gl3], poly: [[17, 0], [14, -1.5], [12, -1.5], [12, 1.5], [14, 1.5]] }
      ], fin: [[-15, 0], [-19, 0], 5, PC2], badge: [-1, -9]
    },
    stealth: {
      parts: [
        { c: [C('#3d4552'), C('#2c303d')], poly: [[13, 0], [-6, -20], [-10, -17], [-6, -12], [-10, -8], [-6, -4], [-9, 0], [-6, 4], [-10, 8], [-6, 12], [-10, 17], [-6, 20]], spine: C('#4f515e') },
        { c: [C('#20283a'), C('#192032')], poly: [[9, 0], [6, -2], [3, -2], [3, 2], [6, 2]] }
      ], fin: null, badge: [-3, -11]
    },
    fighter: {
      parts: [
        { c: [C('#7393aa'), C('#607e93')], poly: [[6, -1.5], [-8, -10], [-10, -10], [-9, -1.5]] },
        { c: [C('#7393aa'), C('#607e93')], poly: [[6, 1.5], [-8, 10], [-10, 10], [-9, 1.5]] },
        { c: [C('#8cafc8'), C('#7393aa')], poly: [[12, 0], [8, -1.6], [-11, -1.6], [-11, 1.6], [8, 1.6]], spine: C('#a1bdd7') },
        { c: [K.gl3, K.gl4], poly: [[9, 0], [7, -1], [4, -1], [4, 1], [7, 1]] }
      ], fin: [[-7, 0], [-11, 0], 4, PC2], badge: [-5, -5]
    },
    recon: {
      parts: [
        { c: [C('#b1bdd0'), C('#a4acb1')], poly: [[1.5, -1], [0.5, -18], [-2, -18], [-2.5, -1]] },
        { c: [C('#b1bdd0'), C('#a4acb1')], poly: [[1.5, 1], [0.5, 18], [-2, 18], [-2.5, 1]] },
        { c: [C('#b1bdd0'), C('#a4acb1')], poly: [[-10, -1], [-11, -6], [-13, -6], [-13, -1]] },
        { c: [C('#b1bdd0'), C('#a4acb1')], poly: [[-10, 1], [-11, 6], [-13, 6], [-13, 1]] },
        { c: [C('#cbd0d3'), C('#a4acb1')], poly: [[13, 0], [10, -1.4], [-13, -1], [-13, 1], [10, 1.4]], spine: C('#edeef4') },
        { c: [K.gl3, K.gl4], poly: [[11, 0], [9, -1], [7, -1], [7, 1], [9, 1]] }
      ], fin: [[-10, 0], [-13, 0], 4, PC2], badge: [-1, -10]
    }
  };
  const SQ = 0.8;                                             // the slant: depth shows at 0.8
  function inPoly(x, y, P) {
    let c = false;
    for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
      const [xi, yi] = P[i], [xj, yj] = P[j];
      if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  // dir 0–7: 0 east, 1 south east, ... (screen directions, y down). Returns { pix, shadow }.
  function plane(kind, dir) {
    const P = PLANES[kind], ang = dir * Math.PI / 4, ca = Math.cos(ang), sa = Math.sin(ang);
    const S = 48, p = new X.Pix(S, S), sh = new X.Pix(S, S), c0 = S / 2;
    // Shading: each part's top in its light colour, its edge away from the light (lower right of
    // the screen) one pixel in the shade colour. (28.11.2026; before the whole picture was split
    // along one screen diagonal, so in the slanted directions one wing came out light and the
    // other dark and the plane read as a twisted X.)
    const partAt = new Int8Array(S * S).fill(-1);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const X0 = px + 0.5 - c0, Y0 = (py + 0.5 - c0) / SQ;
      const lx = X0 * ca + Y0 * sa, ly = -X0 * sa + Y0 * ca;   // back into the plane's own frame
      for (let i = P.parts.length - 1; i >= 0; i--) if (inPoly(lx, ly, P.parts[i].poly)) { partAt[py * S + px] = i; break; }
    }
    const at = (x, y) => (x < 0 || y < 0 || x >= S || y >= S ? -1 : partAt[y * S + x]);
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const i = at(px, py);
      if (i < 0) continue;
      const part = P.parts[i], X0 = px + 0.5 - c0, Y0 = (py + 0.5 - c0) / SQ;
      const lx = X0 * ca + Y0 * sa, ly = -X0 * sa + Y0 * ca;
      p.cur = i + 1; p.curK = 1;
      const edge = at(px + 1, py + 1) < 0 || at(px + 1, py) < 0 && at(px, py + 1) < 0;
      let c = edge ? part.c[1] : part.c[0];
      if (part.spine && Math.abs(ly) < 0.6) c = part.spine;
      // the roundel in the player colour, larger than before (a single pixel was lost)
      if (P.badge) for (const sgn of [1, -1]) {
        const d = Math.hypot(lx - P.badge[0], ly - sgn * P.badge[1]);
        if (d < 2.3) c = d < 1.1 ? PC1 : d < 1.8 ? PC2 : PC3;
      }
      p.put(px, py, c);
      sh.put(px, py, X.pack(0, 0, 0, 89));
    }
    if (P.fin) {                                              // the fin stands up from the tail
      const [[x0, y0], [x1], hgt, col] = P.fin;
      p.obj(1);
      for (let x = x0; x >= x1; x -= 0.5) {
        const f = (x0 - x) / (x0 - x1), sx = c0 + x * ca, sy = c0 + x * sa * SQ;
        for (let k = 0; k < hgt * f + 1; k++) p.put(Math.round(sx - 0.5), Math.round(sy - 0.5 - k), k > hgt * f - 0.5 ? (col === PC2 ? PC1 : X.lighter(col)) : col);
      }
      void y0;
    }
    p.edges = p.edges.map(() => true);
    p.finish();
    // anchor: the plane's centre, in the trimmed picture and in the trimmed shadow
    p.ax = c0; p.ay = c0; sh.ax = c0; sh.ay = c0;
    return { pix: p.trim(), shadow: sh.trim() };
  }

  // ---------------------------------------------------------------- effects
  // A shell in flight: a 3 × 3 dark ball with a glint, a short light trail behind (to the left).
  function shell() {
    const p = new X.Pix(8, 3);
    p.obj(0, false);
    p.put(0, 1, FOAM[0]); p.put(1, 1, C('#a4acb1')); p.put(2, 1, C('#cbd0d3'));
    p.obj(1);
    const B = ['.ab', 'bbc', '.cc'], M = { a: C('#747c89'), b: C('#3d4552'), c: C('#20283a') };
    for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) if (B[j][i] !== '.') p.put(4 + i, j, M[B[j][i]]);
    p.ax = 5; p.ay = 1;
    return p;
  }
  // An explosion in 6 frames: white flash, yellow, orange, red core, grey smoke, smoke fading.
  // size 16 (shells) or 40 (ships, buildings).
  function explosion(size) {
    const out = [], R = size / 2;
    const W = C('#f2f4fe'), Y = C('#d1be6d'), O = C('#cc8738'), RD = C('#b04945'), SM = [C('#747c89'), C('#5b626e'), C('#898d95')];
    const spec = [[0.35, [W, W, Y]], [0.6, [W, Y, O]], [0.8, [Y, O, RD]], [0.9, [O, RD, SM[0]]], [0.95, null], [1, null]];
    spec.forEach(([rr, ring], f) => {
      const p = new X.Pix(size, size);
      p.obj(0, false);
      const r = R * rr;
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - R, dy = y + 0.5 - R, n = hash(x >> 1, y >> 1, 220 + f) * 0.35;
        const d = Math.hypot(dx, dy) / r + n - 0.15;
        if (d > 1) continue;
        if (ring) p.put(x, y, d < 0.45 ? ring[0] : d < 0.75 ? ring[1] : ring[2]);
        else {
          // smoke: puffs, see-through, thinning out in the last frame
          const a = f === 4 ? 210 : 120, v = SM[d < 0.5 ? 2 : d < 0.8 ? 0 : 1];
          if (f === 5 && hash(x, y, 230) < 0.35) continue;
          p.put(x, y - (f - 3), X.pack(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, a));
        }
      }
      // sparks outside the ball in the bright frames
      if (f >= 1 && f <= 3) for (let k = 0; k < size / 3; k++) {
        const a = hash(k, f, 240) * Math.PI * 2, d = r * (1.05 + hash(k, f, 241) * 0.3);
        p.put(Math.round(R + Math.cos(a) * d), Math.round(R + Math.sin(a) * d), f === 1 ? Y : O);
      }
      p.ax = R; p.ay = R;
      out.push(p);
    });
    return out;
  }
  // A shell into the water: 3 frames of a white fountain.
  function splash() {
    const F = [
      ['..a..', '.aba.', 'abcba'],
      ['..a..', '.aba.', '.bcb.', 'abcba', '.ccc.'],
      ['a...a', '.a.a.', '..b..', '.aba.', 'abcba']
    ];
    return F.map((rows) => {
      const p = new X.Pix(7, rows.length + 1);
      p.obj(0, false);
      const M = { a: FOAM[2], b: C('#cbd0d3'), c: C('#f2f4fe') };
      rows.forEach((r, j) => { for (let i = 0; i < 5; i++) if (r[i] !== '.') p.put(i + 1, j, M[r[i]]); });
      for (let i = 0; i < 7; i++) if (i % 2 === 0) p.put(i, rows.length, FOAM[1]);
      p.ax = 3; p.ay = rows.length;
      return p;
    });
  }
  // A ship going down in 6 frames: it tips 2 pixels, sinks row by row, bubbles where it was.
  function sink(ship) {
    const out = [], w = ship.w, h = ship.h;
    for (let f = 0; f < 6; f++) {
      const p = new X.Pix(w + 4, h + 2), down = Math.round(f * h / 7), tilt = Math.min(2, f);
      p.obj(1);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const v = ship.d[y * w + x];
        if (!v) continue;
        const ny = y + down + Math.round(tilt * (x / w - 0.5));
        if (ny >= h - 2) continue;                              // under water
        p.put(x + 2, ny, v);
      }
      p.obj(0, false);
      for (let k = 0; k < 4 + f; k++) {
        const bx = 2 + Math.round(hash(k, f, 250) * w), by = h - 2 - Math.round(hash(k, f, 251) * 3);
        if (!p.get(bx, by)) p.put(bx, by, FOAM[k % 3]);
      }
      p.ax = ship.ax + 2; p.ay = h - 2;
      out.push(p);
    }
    return out;
  }
  // Gold: an 8 × 8 coin and the amount in a 3 × 5 pixel font, rising and fading (the fading is
  // the drawing's alpha).
  const DIG = {
    0: ['aaa', 'a.a', 'a.a', 'a.a', 'aaa'], 1: ['.a.', 'aa.', '.a.', '.a.', 'aaa'], 2: ['aaa', '..a', 'aaa', 'a..', 'aaa'], 3: ['aaa', '..a', '.aa', '..a', 'aaa'],
    4: ['a.a', 'a.a', 'aaa', '..a', '..a'], 5: ['aaa', 'a..', 'aaa', '..a', 'aaa'], 6: ['aaa', 'a..', 'aaa', 'a.a', 'aaa'], 7: ['aaa', '..a', '.a.', '.a.', '.a.'],
    8: ['aaa', 'a.a', 'aaa', 'a.a', 'aaa'], 9: ['aaa', 'a.a', 'aaa', '..a', 'aaa'], '+': ['...', '.a.', 'aaa', '.a.', '...'], k: ['a..', 'a.a', 'aa.', 'a.a', 'a.a']
  };
  const COIN = ['..bbbb..', '.baaaab.', 'baacaacb', 'bacaaa.b', 'bacaaa.b', 'baaaa.cb', '.b....b.', '..bbbb..'];
  function gold(text) {
    const s = String(text), w = 9 + s.length * 4 + 1, p = new X.Pix(w + 2, 10);
    p.obj(2);
    const M = { a: C('#c6b63f'), b: C('#856d1c'), c: C('#d1be6d'), '.': C('#a49e50') };
    COIN.forEach((r, j) => { for (let i = 0; i < 8; i++) { const ch = r[i]; if (j === 0 || j === 7 || i === 0 || i === 7) { if (ch !== '.') p.put(1 + i, 1 + j, M[ch]); } else p.put(1 + i, 1 + j, M[ch]); } });
    for (let n = 0; n < s.length; n++) {
      const g = DIG[s[n]];
      if (!g) continue;
      g.forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === 'a') p.put(11 + n * 4 + i, 3 + j, C('#d1be6d')); });
    }
    p.finish();
    p.ax = 5; p.ay = 9;
    return p;
  }

  // The target mark (selected or attacked ship): a red and white ring as on the battleship of the
  // second reference, with a dot in the middle. Not player colour.
  function target() {
    const p = new X.Pix(15, 15), Rd = C('#b04945'), Wt = C('#f2f4fe'), Dk = C('#7e2b2e');
    p.obj(0, false);
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) {
      const d = Math.hypot(x - 7, y - 7);
      if (d > 7.2) continue;
      if (d > 6.2) p.put(x, y, Dk); else if (d > 5) p.put(x, y, Rd); else if (d > 3.8) p.put(x, y, Wt); else if (d > 2.6) p.put(x, y, Rd); else if (d < 1.2) p.put(x, y, Rd);
    }
    p.ax = 7; p.ay = 7;
    return p;
  }

  G.PixFx = { target, war4, mine, car, CAR, loco, wagon, trainEnd, rail, plane, PLANES, shell, explosion, splash, sink, gold };
})();
