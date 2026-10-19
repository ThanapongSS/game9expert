// Online lobby: create / join a room, both players pick a doll, the host
// starts the match, rematch or leave.
import { NET_PROTOCOL } from '../config.js';
import { STAGES } from '../characters/index.js';
import { t } from '../i18n.js';
import { hostRoom, joinRoom, normalizeCode, errorKey } from '../net/peer.js';
import { HostSync, GuestSync } from '../net/sync.js';
import { HostSession, GuestSession } from './sessions.js';
import { onlineHomeScreen, onlineHostScreen, statusScreen, selectScreen, vsScreen } from '../ui/screens.js';
import { sfx } from '../audio/audio.js';

export class OnlineFlow {
  constructor(app) {
    this.app = app;
    this.attempt = 0;
    this.reset();
  }

  reset() {
    this.tr = null;
    this.sync = null;
    this.role = null;
    this.myPick = null;
    this.theirPick = null;
    this.started = false;
    this.want = [false, false];
    this.hostHandle?.cancel();
    this.hostHandle = null;
  }

  get active() {
    return !!this.tr;
  }

  cleanup() {
    this.attempt++;
    if (this.tr) {
      this.tr.onclose = null;
      this.tr.close();
    }
    this.reset();
  }

  home(error = null, code = '') {
    this.cleanup();
    this.app.attract();
    this.app.show(onlineHomeScreen, {
      code, error,
      onBack: () => this.app.goMenu(),
      onCreate: () => this.create(),
      onJoin: (c) => this.join(c),
    });
  }

  async create() {
    const attempt = ++this.attempt;
    this.app.show(statusScreen, { message: t('online.creating'), onCancel: () => this.home() });
    try {
      const handle = await hostRoom({
        onCode: (code) => {
          if (attempt !== this.attempt) return;
          const link = `${location.origin}${location.pathname}?room=${code}`;
          this.app.show(onlineHostScreen, { code, link, onCancel: () => this.home() });
        },
        onGuest: (tr) => {
          if (attempt !== this.attempt) return tr.close();
          this.connected(tr, 'host');
        },
        onError: (e) => attempt === this.attempt && this.home(t(errorKey(e))),
      });
      if (attempt !== this.attempt) handle.cancel();
      else this.hostHandle = handle;
    } catch (e) {
      if (attempt === this.attempt) this.home(t(errorKey(e)));
    }
  }

  async join(raw) {
    const code = normalizeCode(raw);
    if (code.length !== 5) return this.home(t('online.enter'), code);
    const attempt = ++this.attempt;
    this.app.show(statusScreen, { message: t('online.connecting'), onCancel: () => this.home(null, code) });
    try {
      const tr = await joinRoom(code);
      if (attempt !== this.attempt) return tr.close();
      this.connected(tr, 'guest');
    } catch (e) {
      if (attempt === this.attempt) this.home(t(errorKey(e)), code);
    }
  }

  connected(tr, role) {
    sfx.select();
    this.tr = tr;
    this.role = role;
    this.myPick = null;
    this.theirPick = null;
    const sync = (this.sync = role === 'host' ? new HostSync(tr) : new GuestSync(tr));
    tr.onclose = () => this.lost();
    sync.on('pick', (m) => {
      this.theirPick = m.c;
      this.maybeStart();
    });
    sync.on('rematch', () => {
      this.want[1] = true;
      this.maybeRematch();
    });
    sync.on('bye', () => this.lost());
    if (role === 'host') {
      sync.on('hello', (m) => {
        sync.send({ t: 'welcome', v: NET_PROTOCOL });
        if (m.v !== NET_PROTOCOL) this.fail('online.err.version');
      });
    } else {
      sync.on('welcome', (m) => m.v !== NET_PROTOCOL && this.fail('online.err.version'));
      sync.on('full', () => this.fail('online.err.full'));
      sync.on('start', (m) => this.begin(m));
      sync.send({ t: 'hello', v: NET_PROTOCOL });
    }
    this.pick();
  }

  fail(key) {
    this.home(t(key));
  }

  lost() {
    if (!this.tr) return;
    this.tr = null;
    this.home(t('online.err.closed'));
  }

  leave() {
    this.sync?.send({ t: 'bye' });
    this.cleanup();
    this.app.goMenu();
  }

  pick() {
    this.app.attract();
    this.app.show(selectScreen, {
      title: t('select.you'),
      initial: this.app.prefs.p1,
      onBack: () => this.leave(),
      onConfirm: (id) => {
        this.myPick = id;
        this.app.prefs.p1 = id;
        this.app.savePrefs();
        this.sync.send({ t: 'pick', c: id });
        if (!this.maybeStart()) this.app.show(statusScreen, { message: t('online.pickWait'), onCancel: () => this.leave() });
      },
    });
  }

  // Host only: start once both players picked.
  maybeStart() {
    if (this.role !== 'host' || this.started || !this.myPick || !this.theirPick) return this.started;
    this.startMatch();
    return true;
  }

  startMatch() {
    const msg = { t: 'start', p1: this.myPick, p2: this.theirPick, stage: STAGES[Math.floor(Math.random() * STAGES.length)] };
    this.sync.send(msg);
    this.begin(msg);
  }

  begin({ p1, p2, stage }) {
    this.started = true;
    this.want = [false, false];
    const app = this.app;
    app.show(vsScreen, {
      p1, p2, alt2: p1 === p2, subtitle: t('stage.' + stage),
      onDone: () => {
        if (!this.tr) return;
        app.hideUI();
        const s = this.role === 'host'
          ? new HostSession({ p1, p2, stage, input: app.input, sync: this.sync })
          : new GuestSession({ input: app.input, sync: this.sync });
        s.online = true;
        s.onResult = (w) => this.result(w);
        app.setSession(s, { fight: true });
      },
    });
  }

  result(winner) {
    const me = this.role === 'host' ? 0 : 1;
    const outcome = winner === 'draw' ? 'draw' : winner === me ? 'win' : 'lose';
    (outcome === 'lose' ? sfx.lose : sfx.win)();
    this.app.showResult({
      title: t('result.' + outcome),
      tone: outcome,
      buttons: [
        { label: '🔁 ' + t('result.rematch'), cls: 'green', onClick: () => this.requestRematch() },
        { label: t('online.leave'), cls: 'ghost', onClick: () => this.leave() },
      ],
    });
  }

  requestRematch() {
    this.want[0] = true;
    this.sync.send({ t: 'rematch' });
    if (!this.maybeRematch()) this.app.show(statusScreen, { message: t('online.rematchWait'), onCancel: () => this.leave() });
  }

  maybeRematch() {
    if (this.role !== 'host' || !this.want[0] || !this.want[1]) return false;
    this.startMatch();
    return true;
  }
}
