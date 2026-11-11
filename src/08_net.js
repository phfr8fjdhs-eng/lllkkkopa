(function (G) {
  'use strict';
  // Playing together over the network.
  //
  // Every device runs the same simulation from the same seed. Only the orders of the players travel:
  // the host collects them, numbers them into turns and sends the turns to everyone. Each turn is
  // "carry out these orders, then advance TURN steps". Nothing else is shared, so the traffic is tiny.
  //
  // The messages go through a public relay (an MQTT broker reached over WebSocket), because the page
  // is served as plain files and has no server of its own. The first sign of the room code says which relay.

  const TURN = G.TURN = 2;
  G.RELAYS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const enc = new TextEncoder(), dec = new TextDecoder();

  function str(s) {
    const b = enc.encode(s), o = new Uint8Array(b.length + 2);
    o[0] = b.length >> 8; o[1] = b.length & 255; o.set(b, 2);
    return o;
  }
  function packet(head, parts) {
    let n = 0;
    for (const p of parts) n += p.length;
    const len = [];
    let x = n;
    do { let d = x % 128; x = Math.floor(x / 128); if (x > 0) d |= 128; len.push(d); } while (x > 0);
    const o = new Uint8Array(1 + len.length + n);
    o[0] = head; o.set(len, 1);
    let at = 1 + len.length;
    for (const p of parts) { o.set(p, at); at += p.length; }
    return o;
  }

  // ---------- a small MQTT 3.1.1 client: connect, subscribe, publish, keep alive, reconnect ----------
  function Link(url, topics, on) {
    this.url = url; this.topics = topics; this.on = on;
    this.ws = null; this.buf = new Uint8Array(0); this.ready = false; this.closed = false;
    this.ping = 0; this.timer = 0;
    this.connect();
  }
  Link.prototype.connect = function () {
    if (this.closed) return;
    let ws;
    try { ws = new WebSocket(this.url, 'mqtt'); } catch (e) { this.timer = setTimeout(() => this.connect(), 2000); return; }
    ws.binaryType = 'arraybuffer';
    this.ws = ws; this.buf = new Uint8Array(0);
    ws.onopen = () => {
      const id = 'gl' + Math.random().toString(36).slice(2, 12);
      ws.send(packet(0x10, [str('MQTT'), new Uint8Array([4, 2, 0, 60]), str(id)]));
    };
    ws.onmessage = (e) => { if (this.ws === ws) this.feed(new Uint8Array(e.data)); };
    const gone = () => {
      if (this.ws !== ws) return;
      this.ws = null;
      const was = this.ready;
      this.ready = false;
      clearInterval(this.ping);
      if (this.closed) return;
      if (was && this.on.down) this.on.down();
      this.timer = setTimeout(() => this.connect(), 1500);
    };
    ws.onclose = gone; ws.onerror = gone;
  };
  Link.prototype.feed = function (chunk) {
    let b = this.buf;
    if (b.length) { const j = new Uint8Array(b.length + chunk.length); j.set(b); j.set(chunk, b.length); b = j; } else b = chunk;
    let at = 0;
    for (;;) {
      if (b.length - at < 2) break;
      let len = 0, mul = 1, i = at + 1, done = false;
      while (i < b.length && i < at + 5) {
        const d = b[i++];
        len += (d & 127) * mul; mul *= 128;
        if (!(d & 128)) { done = true; break; }
      }
      if (!done || b.length - i < len) break;
      this.handle(b[at], b.subarray(i, i + len));
      at = i + len;
    }
    this.buf = at < b.length ? b.slice(at) : new Uint8Array(0);
  };
  Link.prototype.handle = function (head, body) {
    const type = head >> 4;
    if (type === 2) {                                   // connection accepted: subscribe
      if (body[1] !== 0) { this.ws.close(); return; }
      const parts = [new Uint8Array([0, 1])];
      for (const t of this.topics) { parts.push(str(t)); parts.push(new Uint8Array([0])); }
      this.ws.send(packet(0x82, parts));
    } else if (type === 9) {                            // subscribed: the line is up
      this.ready = true;
      clearInterval(this.ping);
      this.ping = setInterval(() => { if (this.ws && this.ready) this.ws.send(new Uint8Array([0xC0, 0])); }, 25000);
      if (this.on.up) this.on.up();
    } else if (type === 3) {                            // a message
      const tl = (body[0] << 8) | body[1], qos = (head >> 1) & 3;
      const topic = dec.decode(body.subarray(2, 2 + tl)), text = dec.decode(body.subarray(2 + tl + (qos ? 2 : 0)));
      let m = null;
      try { m = JSON.parse(text); } catch (e) { /* not ours */ }
      if (m && typeof m === 'object') this.on.msg(topic, m);
    }
  };
  Link.prototype.pub = function (topic, obj) {
    if (!this.ready || !this.ws || this.ws.readyState !== 1) return false;
    this.ws.send(packet(0x30, [str(topic), enc.encode(JSON.stringify(obj))]));
    return true;
  };
  Link.prototype.close = function () {
    this.closed = true;
    clearTimeout(this.timer); clearInterval(this.ping);
    if (this.ws) { try { this.ws.close(); } catch (e) { /* already gone */ } }
  };
  G.Link = Link;

  // ---------- a room: the host and its guests ----------
  // me: { id, name, color }.  on: lobby(), start(msg), status(text), desync(), lost(text), paused(bool)
  function Session(host, me, on) {
    this.host = host; this.me = me; this.on = on;
    this.code = ''; this.base = ''; this.link = null; this.up = false; this.closed = false;
    this.players = host ? [me] : [];
    this.started = false; this.startMsg = null; this.paused = false;
    this.buf = new Map(); this.next = 0; this.needAt = 0;
    this.hseq = 0; this.log = []; this.queue = [];
    this.sums = new Map(); this.others = new Map(); this.bad = false;
    this.timers = [];
  }
  Session.prototype.relays = function () {
    let custom = '';
    try { custom = new URLSearchParams(location.search).get('relay') || ''; } catch (e) { /* no address bar */ }
    return custom ? [custom] : G.RELAYS;
  };
  // Host: find a relay that answers, then make up the room code.
  Session.prototype.create = function () {
    const list = this.relays();
    let rnd = '';
    for (let i = 0; i < 5; i++) rnd += ABC[Math.floor(Math.random() * ABC.length)];
    const attempt = (i) => {
      if (this.closed) return;
      if (i >= list.length) { this.on.status('Keine Verbindung zum Vermittlungsdienst. Prüfe dein Internet und versuche es nochmal.', true); return; }
      this.on.status('Verbinde …');
      this.code = i + rnd; this.base = 'grenzland1/' + this.code;
      let ok = false;
      const link = this.link = new Link(list[i], [this.base + '/c'], {
        up: () => { ok = true; this.up = true; this.on.status(''); this.on.lobby(); this.beat(); },
        down: () => { this.up = false; this.on.status('Verbindung unterbrochen, verbinde neu …'); },
        msg: (t, m) => this.fromGuest(m)
      });
      setTimeout(() => { if (!ok && this.link === link && !this.closed) { link.close(); attempt(i + 1); } }, 7000);
    };
    attempt(0);
    this.timers.push(setInterval(() => this.beat(), 2000));
    this.timers.push(setInterval(() => this.hostTurn(), TURN * 100));
  };
  Session.prototype.join = function (code) {
    code = String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    const list = this.relays(), i = +code[0];
    if (code.length !== 6 || !(i >= 0 && i < Math.max(list.length, 1))) { this.on.status('Diesen Raum gibt es nicht. Prüfe den Link.', true); return; }
    this.code = code; this.base = 'grenzland1/' + code;
    this.on.status('Verbinde …');
    let ok = false;
    this.link = new Link(list[Math.min(i, list.length - 1)], [this.base + '/h'], {
      up: () => { ok = true; this.up = true; this.on.status(this.started ? '' : 'Verbunden. Suche den Raum …'); if (this.started) this.need(); else this.hello(); },
      down: () => { this.up = false; this.on.status('Verbindung unterbrochen, verbinde neu …'); },
      msg: (t, m) => this.fromHost(m)
    });
    setTimeout(() => { if (!ok && !this.closed) this.on.status('Keine Verbindung zum Vermittlungsdienst. Prüfe dein Internet.', true); }, 9000);
    this.timers.push(setInterval(() => {
      if (!this.up) return;
      if (!this.started) this.hello();
      else if (!this.buf.has(this.next) && this.buf.size) this.need();
    }, 2000));
  };
  Session.prototype.hello = function () {
    this.link.pub(this.base + '/c', { t: 'join', id: this.me.id, name: this.me.name, color: this.me.color });
  };
  Session.prototype.need = function () {
    const now = Date.now();
    if (now - this.needAt < 900) return;
    this.needAt = now;
    this.link.pub(this.base + '/c', { t: 'need', from: this.next });
  };
  Session.prototype.toAll = function (m) { return this.link && this.link.pub(this.base + '/h', m); };

  // ---------- host side ----------
  Session.prototype.beat = function () {
    if (!this.up) return;
    if (!this.started) this.toAll({ t: 'lobby', players: this.players });
    else this.toAll({ t: 'hb', s: this.hseq, p: this.paused ? 1 : 0 });
  };
  Session.prototype.fromGuest = function (m) {
    if (m.t === 'join') {
      if (this.started) { if (!this.players.some(function (p) { return p.id === m.id; })) this.toAll({ t: 'full', id: m.id }); else this.toAll(this.startMsg); return; }
      if (!this.players.some(function (p) { return p.id === m.id; })) {
        if (this.players.length >= 8) { this.toAll({ t: 'full', id: m.id }); return; }
        this.players.push({ id: String(m.id).slice(0, 16), name: String(m.name || 'Gast').slice(0, 18), color: (+m.color || 0) % 6 });
        this.on.lobby();
      }
      this.toAll({ t: 'lobby', players: this.players });
    } else if (m.t === 'bye') {
      if (!this.started) {
        this.players = this.players.filter(function (p) { return p.id !== m.id; });
        this.on.lobby(); this.toAll({ t: 'lobby', players: this.players });
      }
    } else if (m.t === 'cmd' && this.started) {
      const i = this.players.findIndex(function (p) { return p.id === m.id; });
      if (i >= 0 && m.c && typeof m.c === 'object') this.queue.push([i + 1, m.c]);
    } else if (m.t === 'need' && this.started) {
      const from = Math.max(0, m.from | 0);
      if (from < this.log.length) this.toAll({ t: 'turns', from: from, list: this.log.slice(from, from + 400) });
    } else if (m.t === 'needstart' && this.started) {
      this.toAll(this.startMsg);
    } else if (m.t === 'sum') {
      const a = this.others.get(m.T) || [];
      a.push(m.v); this.others.set(m.T, a);
      this.compare(m.T);
    }
  };
  Session.prototype.begin = function (cfg) {
    this.startMsg = Object.assign({ t: 'start', players: this.players }, cfg);
    this.started = true;
    this.toAll(this.startMsg);
    this.on.start(this.startMsg);
  };
  Session.prototype.hostTurn = function () {
    if (!this.host || !this.started || this.paused || this.closed) return;
    if (this.buf.size > 12) return;                     // this device is behind: let it catch up first
    const c = this.queue; this.queue = [];
    const s = this.hseq++;
    this.log.push(c); this.buf.set(s, c);
    this.toAll({ t: 'turn', s: s, c: c });
  };
  Session.prototype.setPaused = function (v) { this.paused = v; this.beat(); };
  Session.prototype.compare = function (T) {
    if (this.bad || !this.sums.has(T) || !this.others.has(T)) return;
    const mine = this.sums.get(T);
    if (this.others.get(T).some(function (v) { return v !== mine; })) { this.bad = true; this.toAll({ t: 'desync' }); this.on.desync(); }
    if (this.sums.size > 40) { const k = this.sums.keys().next().value; this.sums.delete(k); this.others.delete(k); }
  };

  // ---------- guest side ----------
  Session.prototype.store = function (s, c) {
    if (s >= this.next && !this.buf.has(s) && Array.isArray(c)) this.buf.set(s, c);
  };
  Session.prototype.fromHost = function (m) {
    if (m.t === 'lobby') {
      if (this.started || !Array.isArray(m.players)) return;
      this.players = m.players;
      const me = this.me.id;
      if (!m.players.some(function (p) { return p.id === me; })) this.hello(); else this.on.status('');
      this.on.lobby();
    } else if (m.t === 'full') {
      if (m.id === this.me.id && !this.started) this.on.lost('Der Raum ist voll oder das Spiel läuft schon.');
    } else if (m.t === 'start') {
      if (this.started) return;
      const me = this.me.id;
      if (!Array.isArray(m.players) || !m.players.some(function (p) { return p.id === me; })) { this.on.lost('Das Spiel hat ohne dich begonnen.'); return; }
      this.started = true; this.startMsg = m; this.players = m.players;
      this.on.start(m);
    } else if (m.t === 'turn') {
      if (!this.started) { this.link.pub(this.base + '/c', { t: 'needstart' }); return; }
      this.store(m.s, m.c);
      if (!this.buf.has(this.next)) this.need();
    } else if (m.t === 'turns') {
      if (!this.started || !Array.isArray(m.list)) return;
      for (let i = 0; i < m.list.length; i++) this.store(m.from + i, m.list[i]);
    } else if (m.t === 'hb') {
      if (!this.started) { this.link.pub(this.base + '/c', { t: 'needstart' }); return; }
      if (this.paused !== !!m.p) { this.paused = !!m.p; this.on.paused(this.paused); }
      let top = this.next - 1;
      while (this.buf.has(top + 1)) top++;
      if (m.s - 1 > top) this.need();
    } else if (m.t === 'desync') {
      if (!this.bad) { this.bad = true; this.on.desync(); }
    } else if (m.t === 'end') {
      this.on.lost('Der Gastgeber hat das Spiel beendet.');
    }
  };

  // ---------- both sides ----------
  Session.prototype.index = function () {
    const me = this.me.id;
    return this.players.findIndex(function (p) { return p.id === me; });
  };
  Session.prototype.send = function (c) {
    if (this.host) this.queue.push([this.index() + 1, c]);
    else if (!this.link.pub(this.base + '/c', { t: 'cmd', id: this.me.id, c: c })) this.on.status('Keine Verbindung, Befehl nicht gesendet');
  };
  // The next turn in line, or null while it has not arrived yet.
  Session.prototype.take = function () {
    const c = this.buf.get(this.next);
    if (!c) return null;
    this.buf.delete(this.next); this.next++;
    return c;
  };
  Session.prototype.sum = function (T, v) {
    if (this.host) { this.sums.set(T, v); this.compare(T); }
    else this.link.pub(this.base + '/c', { t: 'sum', T: T, v: v });
  };
  Session.prototype.close = function () {
    if (this.closed) return;
    this.closed = true;
    for (const t of this.timers) clearInterval(t);
    if (this.link) {
      if (this.host) this.toAll({ t: 'end' }); else this.link.pub(this.base + '/c', { t: 'bye', id: this.me.id });
      const l = this.link;
      setTimeout(function () { l.close(); }, 300);
    }
  };
  G.Session = Session;
})(globalThis.G = globalThis.G || {});
