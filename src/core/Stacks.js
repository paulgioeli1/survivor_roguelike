// A generic stack-counter component ATTACHED to an entity (player or enemy)
// rather than inherited — players and enemies share no parent beyond Phaser's
// sprite, so this is the game's first composition (vs inheritance) case.
//
// A "stack" is a named counter that accumulates and can fire a callback when it
// crosses a threshold, e.g.:
//   player.stacks.onThreshold('frenzy', 5, p => grantSpeedBuff(p, 10000));
//   player.stacks.add('frenzy');   // called when you hit a matching enemy
//
// It is INERT today: no concrete stack types are defined, so nothing calls
// add(). It exists so the `stacks` field is present on Player and Enemy now,
// making the future buff/debuff system a drop-in instead of a retrofit.
export class Stacks {
  constructor(owner) {
    this.owner = owner;
    this.counts = new Map();   // type -> current count
    this.thresholds = [];      // { type, at, callback, fired }
  }

  add(type, amount = 1) {
    const next = (this.counts.get(type) || 0) + amount;
    this.counts.set(type, next);
    for (const t of this.thresholds) {
      if (t.type === type && !t.fired && next >= t.at) {
        t.fired = true;
        t.callback(this.owner, next);
      }
    }
    return next;
  }

  get(type) {
    return this.counts.get(type) || 0;
  }

  onThreshold(type, at, callback) {
    this.thresholds.push({ type, at, callback, fired: false });
  }

  clear(type) {
    this.counts.set(type, 0);
    for (const t of this.thresholds) {
      if (t.type === type) t.fired = false;
    }
  }
}
