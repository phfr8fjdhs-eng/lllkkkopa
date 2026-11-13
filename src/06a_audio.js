(function (G) {
  'use strict';
  // All sound is made in the browser: a slow generated soundtrack and short tones for actions.
  // Nothing is loaded from a file. The sound starts with the first tap, as browsers require.
  const A = G.Audio = { ctx: null, on: { music: true, sfx: true }, ready: false };
  let ctx = null, master = null, musicBus = null, sfxBus = null, echo = null, noiseBuf = null;
  let timer = 0, nextStep = 0, step = 0, seed = 12345;
  const lastAt = {};

  function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
  function hz(midi) { return 440 * Math.pow(2, (midi - 69) / 12); }

  A.init = function () {
    if (ctx || A.failed) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) { A.failed = true; return; }
    try {
      ctx = A.ctx = new AC();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 5; comp.attack.value = 0.004; comp.release.value = 0.2;
      master = ctx.createGain(); master.gain.value = 0.9;
      master.connect(comp); comp.connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
      sfxBus = ctx.createGain(); sfxBus.gain.value = A.on.sfx ? 0.8 : 0; sfxBus.connect(master);
      // a soft echo for the music
      echo = ctx.createDelay(1); echo.delayTime.value = 0.36;
      const fb = ctx.createGain(); fb.gain.value = 0.34;
      const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
      echo.connect(damp); damp.connect(fb); fb.connect(echo); damp.connect(musicBus);
      const len = ctx.sampleRate;
      noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      A.ready = true;
      A.apply();
    } catch (e) { A.failed = true; ctx = null; }
  };
  A.resume = function () {
    A.init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
  };
  // Bring volume and soundtrack in line with the switches.
  A.apply = function () {
    if (!ctx) return;
    const t = ctx.currentTime;
    sfxBus.gain.setTargetAtTime(A.on.sfx ? 0.8 : 0, t, 0.05);
    musicBus.gain.setTargetAtTime(A.on.music ? 0.5 : 0, t, 0.6);
    if (A.on.music && !timer) { nextStep = t + 0.15; timer = setInterval(schedule, 120); }
    else if (!A.on.music && timer) { clearInterval(timer); timer = 0; }
  };
  A.set = function (kind, v) { A.on[kind] = v; if (v) A.resume(); A.apply(); };
  A.hush = function (v) {
    if (!ctx) return;
    if (v) ctx.suspend(); else if (A.on.music || A.on.sfx) ctx.resume();
  };

  // ---------- building blocks ----------
  function tone(bus, type, f0, t, dur, vol, f1, attack) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (attack || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
    return g;
  }
  function noise(bus, t, dur, vol, type, f0, f1, q) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; s.loop = true;
    f.type = type; f.frequency.setValueAtTime(f0, t); f.Q.value = q || 0.7;
    if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(bus);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- soundtrack: four-bar phrases in A minor, sixteen steps to the bar ----------
  const CHORDS = [
    [57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65],     // Am7  Fmaj7  Cmaj7  G
    [57, 60, 64, 67], [53, 57, 60, 64], [50, 53, 57, 60], [52, 56, 59, 62]          // Am7  Fmaj7  Dm7    E7
  ];
  const SCALE = [69, 72, 74, 76, 79, 81, 84];   // A minor pentatonic for the lead
  const STEP = 60 / 92 / 4;
  let lead = 3;
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    if (nextStep < ctx.currentTime - 0.5) nextStep = ctx.currentTime + 0.05;
    while (nextStep < ctx.currentTime + 0.35) { playStep(step, nextStep); step++; nextStep += STEP; }
  }
  function playStep(n, t) {
    const bar = Math.floor(n / 16), s = n % 16, ch = CHORDS[bar % 8], part = Math.floor(bar / 8) % 4;
    const full = bar >= 4, drums = bar >= 8 && part !== 3;
    if (s === 0) {
      // pad: the chord held for the whole bar, two detuned voices each, opened slowly by a filter
      const f = ctx.createBiquadFilter(), g = ctx.createGain(), len = STEP * 16;
      f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1500, t + len * 0.5);
      f.frequency.linearRampToValueAtTime(600, t + len); f.Q.value = 0.8;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.055, t + 0.5);
      g.gain.setValueAtTime(0.055, t + len - 0.3); g.gain.linearRampToValueAtTime(0.0001, t + len + 0.5);
      f.connect(g); g.connect(musicBus);
      for (let i = 0; i < ch.length; i++) for (let d = -1; d <= 1; d += 2) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz(ch[i]); o.detune.value = d * 7;
        o.connect(f); o.start(t); o.stop(t + len + 0.6);
      }
    }
    // bass on the root
    if (s === 0 || s === 10 || (full && s === 6)) tone(musicBus, 'triangle', hz(ch[0] - 24), t, STEP * (s === 0 ? 5 : 2.5), 0.2, 0, 0.012);
    // plucked broken chord with echo
    if (full && s % 2 === 0) {
      const order = [0, 2, 1, 3, 2, 3, 1, 2], note = ch[order[(s / 2) % 8]] + 12;
      const g = tone(echo, 'triangle', hz(note), t, 0.32, part === 3 ? 0.035 : 0.06, 0, 0.004);
      g.connect(musicBus);
    }
    // a sparse lead that wanders over the scale
    if (bar >= 8 && part !== 0 && (s === 0 || s === 6 || s === 12 || (s === 14 && rnd() < 0.4)) && rnd() < 0.72) {
      lead = G.within(lead + Math.round(rnd() * 4 - 2), 0, SCALE.length - 1);
      const g = tone(echo, 'sine', hz(SCALE[lead]), t, STEP * 5, 0.07, 0, 0.03);
      g.connect(musicBus);
      tone(musicBus, 'sine', hz(SCALE[lead]) * 2, t, STEP * 2, 0.012, 0, 0.02);
    }
    if (drums) {
      if (s === 0 || s === 8 || (s === 11 && bar % 2)) tone(musicBus, 'sine', 120, t, 0.22, 0.3, 42, 0.003);
      if (s === 4 || s === 12) noise(musicBus, t, 0.14, 0.07, 'bandpass', 1900, 0, 0.9);
      if (s % 2 === 0) noise(musicBus, t, 0.035, s % 4 === 2 ? 0.035 : 0.018, 'highpass', 7000);
    }
  }

  // ---------- short tones ----------
  const PENTA = [0, 3, 5, 7, 10, 12, 15, 17];
  let tapN = 0;
  const SFX = {
    // every tap on the map lands on another note of the scale
    tap: function (t) { tone(sfxBus, 'sine', hz(72 + PENTA[tapN++ % PENTA.length]), t, 0.11, 0.16); },
    ui: function (t) { tone(sfxBus, 'triangle', 880, t, 0.06, 0.11); },
    open: function (t) { tone(sfxBus, 'sine', 520, t, 0.1, 0.12, 780); },
    close: function (t) { tone(sfxBus, 'sine', 620, t, 0.09, 0.09, 400); },
    deny: function (t) { tone(sfxBus, 'square', 150, t, 0.13, 0.07, 110); },
    attack: function (t) { noise(sfxBus, t, 0.18, 0.2, 'bandpass', 700, 2600, 1.2); tone(sfxBus, 'sawtooth', 196, t, 0.2, 0.1, 392); },
    build: function (t) {
      for (let i = 0; i < 2; i++) { tone(sfxBus, 'square', 210, t + i * 0.11, 0.05, 0.1, 120); noise(sfxBus, t + i * 0.11, 0.05, 0.16, 'highpass', 2500); }
      tone(sfxBus, 'sine', 660, t + 0.24, 0.16, 0.1);
    },
    upgrade: function (t) { [0, 4, 7, 12].forEach(function (s, i) { tone(sfxBus, 'triangle', hz(72 + s), t + i * 0.055, 0.13, 0.11); }); },
    boat: function (t) { tone(sfxBus, 'sawtooth', 110, t, 0.5, 0.1, 104, 0.06); tone(sfxBus, 'sawtooth', 165, t, 0.5, 0.06, 156, 0.06); },
    ship: function (t) { tone(sfxBus, 'sine', 1320, t, 0.5, 0.1); tone(sfxBus, 'sine', 1320, t + 0.22, 0.6, 0.1); },
    coin: function (t) { tone(sfxBus, 'sine', 1568, t, 0.07, 0.09); tone(sfxBus, 'sine', 2093, t + 0.06, 0.2, 0.09); },
    train: function (t) { tone(sfxBus, 'square', 587, t, 0.16, 0.035, 0, 0.02); tone(sfxBus, 'square', 698, t, 0.16, 0.035, 0, 0.02); tone(sfxBus, 'sine', 1760, t + 0.1, 0.12, 0.06); },
    good: function (t) { [0, 4, 7].forEach(function (s, i) { tone(sfxBus, 'sine', hz(76 + s), t + i * 0.07, 0.22, 0.1); }); },
    ally: function (t) { [0, 7, 12, 16].forEach(function (s, i) { tone(sfxBus, 'triangle', hz(67 + s), t + i * 0.08, 0.3, 0.1); }); },
    warn: function (t) { tone(sfxBus, 'square', 466, t, 0.12, 0.06); tone(sfxBus, 'square', 440, t + 0.14, 0.2, 0.06); },
    alarm: function (t) { for (let i = 0; i < 3; i++) { tone(sfxBus, 'square', 740, t + i * 0.3, 0.13, 0.07); tone(sfxBus, 'square', 554, t + i * 0.3 + 0.14, 0.13, 0.07); } },
    bad: function (t) { tone(sfxBus, 'sawtooth', 220, t, 0.16, 0.08, 185); tone(sfxBus, 'sawtooth', 165, t + 0.15, 0.28, 0.08, 131); },
    flag: function (t) { noise(sfxBus, t, 0.09, 0.12, 'highpass', 3000); tone(sfxBus, 'triangle', 523, t + 0.05, 0.1, 0.1); tone(sfxBus, 'triangle', 784, t + 0.14, 0.2, 0.1); },
    pop: function (t) { noise(sfxBus, t, 0.16, 0.2, 'lowpass', 1400, 200); tone(sfxBus, 'sine', 160, t, 0.16, 0.2, 50); },
    launch: function (t) { noise(sfxBus, t, 0.9, 0.16, 'bandpass', 300, 3200, 1.5); tone(sfxBus, 'sawtooth', 80, t, 0.9, 0.06, 320); },
    boom: function (t) { noise(sfxBus, t, 1.1, 0.5, 'lowpass', 2200, 90); tone(sfxBus, 'sine', 95, t, 1, 0.5, 28); },
    head: function (t) { noise(sfxBus, t, 0.4, 0.22, 'lowpass', 1500, 120); tone(sfxBus, 'sine', 110, t, 0.35, 0.22, 40); },
    // hydrogen bomb: a sharp crack, then a long rolling low end
    hydro: function (t) {
      noise(sfxBus, t, 0.12, 0.6, 'highpass', 1800);
      noise(sfxBus, t + 0.03, 3.2, 0.7, 'lowpass', 3000, 50);
      tone(sfxBus, 'sine', 70, t, 3, 0.7, 20);
      tone(sfxBus, 'triangle', 46, t + 0.15, 2.6, 0.35, 24, 0.2);
      noise(sfxBus, t + 0.5, 2.6, 0.14, 'bandpass', 240, 90, 2);
    },
    // satellite beam: a rising whine, then a hard electric crack
    laser: function (t) {
      tone(sfxBus, 'sawtooth', 300, t, 0.5, 0.12, 2400);
      tone(sfxBus, 'square', 1900, t + 0.02, 0.45, 0.05, 120);
      noise(sfxBus, t, 0.6, 0.35, 'bandpass', 3200, 300, 1.2);
      tone(sfxBus, 'sine', 90, t + 0.05, 0.8, 0.4, 30);
    },
    start: function (t) { [57, 64, 69, 76].forEach(function (m, i) { tone(sfxBus, 'triangle', hz(m), t + i * 0.1, 0.5, 0.11); }); },
    win: function (t) { [60, 64, 67, 72, 76, 79, 84].forEach(function (m, i) { tone(sfxBus, 'triangle', hz(m), t + i * 0.11, i === 6 ? 1.2 : 0.3, 0.13); }); },
    lose: function (t) { [69, 65, 62, 57, 50].forEach(function (m, i) { tone(sfxBus, 'sawtooth', hz(m), t + i * 0.2, i === 4 ? 1.2 : 0.34, 0.07); }); }
  };
  A.names = Object.keys(SFX);
  A.play = function (name, gap) {
    if (!ctx || !A.on.sfx || ctx.state !== 'running' || !SFX[name]) return;
    const now = ctx.currentTime;
    if (now - (lastAt[name] || -9) < (gap || 0.05)) return;    // never stack the same sound on itself
    lastAt[name] = now;
    SFX[name](now + 0.005);
  };
})(globalThis.G = globalThis.G || {});
