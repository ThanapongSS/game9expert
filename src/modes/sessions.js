// A session owns whatever produces the match view each frame:
// a local simulation (CPU / attract / online host) or snapshots (online guest).
import { ROSTER, STAGES } from '../characters/index.js';
import { createMatch, stepMatch } from '../sim/match.js';
import { AIController } from '../ai/aiController.js';
import { t } from '../i18n.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

class LocalSim {
  constructor({ p1, p2, stage }) {
    this.match = createMatch({ p1, p2, stage });
    this.events = [];
    this.ended = false;
    this.onResult = null;
  }

  inputs() {
    return [0, 0];
  }

  step() {
    const ev = stepMatch(this.match, this.inputs());
    this.afterStep(ev);
    if (ev.length) this.events.push(...ev);
    if (this.match.phase === 'result' && !this.ended) {
      this.ended = true;
      this.onResult?.(this.match.winner);
    }
  }

  afterStep() {}

  view() {
    return this.match;
  }

  takeEvents() {
    const e = this.events;
    this.events = [];
    return e;
  }
}

// CPU vs CPU behind the menus.
export class AttractSession extends LocalSim {
  constructor() {
    const p1 = pick(ROSTER);
    const p2 = pick(ROSTER.filter((c) => c !== p1));
    super({ p1, p2, stage: pick(STAGES) });
    this.ai = [new AIController('normal', Math.random() * 1e9), new AIController('normal', Math.random() * 1e9)];
    this.attract = true;
    this.localIdx = -1;
  }

  inputs() {
    return [this.ai[0].sample(this.match, 0), this.ai[1].sample(this.match, 1)];
  }

  hudOptions() {
    return { hud: false };
  }
}

export class CpuSession extends LocalSim {
  constructor({ p1, p2, stage, level, input }) {
    super({ p1, p2, stage });
    this.ai = new AIController(level, Math.random() * 1e9);
    this.input = input;
    this.localIdx = 0;
  }

  inputs() {
    return [this.input.sample(), this.ai.sample(this.match, 1)];
  }

  hudOptions() {
    return { labels: [t('hud.you'), t('hud.cpu')] };
  }
}

export class HostSession extends LocalSim {
  constructor({ p1, p2, stage, input, sync }) {
    super({ p1, p2, stage });
    this.input = input;
    this.sync = sync;
    this.localIdx = 0;
    sync.start(this.match);
  }

  inputs() {
    return [this.input.sample(), this.sync.remoteInput()];
  }

  afterStep(ev) {
    this.sync.afterStep(ev);
  }

  hudOptions() {
    return { labels: [t('hud.you'), t('hud.friend')], ping: this.sync.rtt };
  }
}

export class GuestSession {
  constructor({ input, sync }) {
    this.input = input;
    this.sync = sync;
    this.localIdx = 1;
    this.ended = false;
    this.onResult = null;
    this.pingTimer = 0;
    sync.reset();
  }

  step() {
    this.sync.sendInput(this.input.sample());
    if (++this.pingTimer >= 60) {
      this.pingTimer = 0;
      this.sync.ping();
    }
    const v = this.sync.snap;
    if (v && v.phase === 'result' && !this.ended) {
      this.ended = true;
      this.onResult?.(v.winner);
    }
  }

  view() {
    return this.sync.view();
  }

  takeEvents() {
    return this.sync.takeEvents();
  }

  hudOptions() {
    return { labels: [t('hud.friend'), t('hud.you')], ping: this.sync.rtt };
  }
}
