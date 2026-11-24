// Where the game runs (doku/leistung.md, 25.11.2026). Two hosts with the same face:
//   in a worker  the default: the simulation has its own thread, so a long tick never holds up a
//                picture; the page reads the mirror (src/05b_sync.js), one tick behind at most
//   on the page  with ?worker=0 in the address, for the tests that reach into the game, and
//                whenever a worker cannot be made
// The interface talks only to the host:
//   host.ready(cb)              cb() once the game is there (on the page: at once)
//   host.game                   the game to read: the mirror, or the game itself
//   host.exec(id, c, cb)        one order now (playing alone; also while paused); cb(why)
//   host.order(id, c, cb)       an order for the next step: returns the entry for host.step
//   host.step(ticks, sum)       one tick per entry of `ticks`, each entry the orders to carry out
//                               before it; then onState(n, sums) with the checksums of every
//                               100th tick when `sum`
//   host.busy                   a step is under way (the worker is still at it)
//   host.stop()                 end the game
(function (G) {
  'use strict';
  function wantWorker() {
    try { if (new URLSearchParams(location.search).get('worker') === '0') return false; } catch (e) { /* no address */ }
    return typeof Worker === 'function' && typeof Blob === 'function' && !!document.getElementById('sim');
  }
  G.Host = function (map, opts, people, onError) {
    if (wantWorker()) {
      try { return new WorkerHost(map, opts, people, onError); } catch (e) { /* no worker here: play on the page */ }
    }
    return new LocalHost(map, opts, people);
  };

  // what the person at this device ordered, waiting for the answer
  function Orders() { this.seq = 0; this.cb = new Map(); }
  Orders.prototype.add = function (cb) { const s = ++this.seq; if (cb) this.cb.set(s, cb); return s; };
  Orders.prototype.answer = function (acks) {
    for (let i = 0; i < acks.length; i += 2) {
      const cb = this.cb.get(acks[i]);
      if (cb) { this.cb.delete(acks[i]); cb(acks[i + 1]); }
    }
  };

  // ---------- on the page ----------
  function LocalHost(map, opts, people) {
    this.local = true; this.busy = false; this.onState = null;
    this.game = new G.Game(map, opts);
    this.game.setup(people);
    this.orders = new Orders();
  }
  LocalHost.prototype.ready = function (cb) { cb(); };
  LocalHost.prototype.exec = function (id, c, cb) { const why = this.game.exec(id, c); if (cb) cb(why || ''); };
  LocalHost.prototype.order = function (id, c, cb) { return [id, c, this.orders.add(cb)]; };
  LocalHost.prototype.step = function (ticks, sum) {
    const g = this.game, me = g.human ? g.human.id : -1, acks = [], sums = [];
    for (const list of ticks) {
      for (const o of list) { const why = g.exec(o[0], o[1]); if (o[0] === me && o[2] !== undefined) acks.push(o[2], why || ''); }
      g.tick();
      if (sum && g.ticks % 100 === 0) sums.push(g.ticks, g.checksum());
    }
    this.orders.answer(acks);
    if (this.onState) this.onState(ticks.length, sums);
  };
  LocalHost.prototype.stop = function () { this.game = null; };

  // ---------- in a worker ----------
  // The worker runs the same code as the page: the script block «sim» of this page (the build
  // puts the simulation there), started from a Blob, so the game stays one file.
  function WorkerHost(map, opts, people, onError) {
    this.local = false; this.busy = true; this.onState = null; this.onError = onError || null;
    this.game = null; this.waiting = []; this.orders = new Orders(); this.dumpCb = null;
    this.sync = new G.SyncIn(map);
    const src = document.getElementById('sim').textContent;
    this.url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    this.w = new Worker(this.url);
    const self = this;
    this.w.onmessage = function (ev) { self.got(ev.data); };
    this.w.onerror = function (ev) { ev.preventDefault(); self.fail(ev.message || 'Fehler im Spiel'); };
    this.w.postMessage({ k: 'init', map: G.mapPack(map), opts: opts, people: people });
  }
  WorkerHost.prototype.got = function (d) {
    if (!this.w) return;
    if (d.k === 'error') { this.fail(d.message); return; }
    if (d.k === 'dump') { const cb = this.dumpCb; this.dumpCb = null; if (cb) cb(d.dump); return; }
    this.sync.apply(d);
    if (d.k === 'ready') {
      this.game = this.sync.m; this.busy = false;
      const w = this.waiting; this.waiting = [];
      for (const cb of w) cb();
      return;
    }
    if (d.acks) this.orders.answer(d.acks);
    if (d.k === 'state') { this.busy = false; if (this.onState) this.onState(d.n, d.sums); }
  };
  WorkerHost.prototype.fail = function (msg) {
    if (typeof console !== 'undefined') console.error('Spiel im Worker:', msg);
    const cb = this.onError;
    this.stop();
    if (cb) cb(msg);
  };
  WorkerHost.prototype.ready = function (cb) { if (this.game) cb(); else this.waiting.push(cb); };
  WorkerHost.prototype.exec = function (id, c, cb) { this.w.postMessage({ k: 'exec', id: id, c: c, seq: this.orders.add(cb) }); };
  WorkerHost.prototype.order = function (id, c, cb) { return [id, c, this.orders.add(cb)]; };
  WorkerHost.prototype.step = function (ticks, sum) {
    this.busy = true;
    this.w.postMessage({ k: 'step', ticks: ticks, sum: !!sum });
  };
  // for the tests: the worker's game as the mirror should show it (G.syncDump)
  WorkerHost.prototype.dump = function (cb) { this.dumpCb = cb; this.w.postMessage({ k: 'dump' }); };
  WorkerHost.prototype.stop = function () {
    if (this.w) { this.w.terminate(); this.w = null; URL.revokeObjectURL(this.url); }
    this.game = null; this.waiting = []; this.onState = null; this.onError = null;
  };
})(globalThis.G = globalThis.G || {});
