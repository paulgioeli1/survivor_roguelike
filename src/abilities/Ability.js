import Phaser from 'phaser';

// Base class for every weapon/ability. The scene holds a loadout of these and
// dispatches input/update/HUD to them, replacing the old weaponType if/else
// chains. Subclasses override only the hooks they use.
//
// getStat(key) is the single chokepoint for reading a tunable number. Today it
// returns the base value from this.stats unchanged; later, buffs/debuffs (from
// stacks, superchargers, enemy debuffs) will be applied here so no call site
// ever reads a raw stat directly.
export class Ability {
  constructor(scene) {
    this.scene = scene;
    this.level = 1;   // "grow" seam — abilities can level up later
    this.stats = {};  // per-ability tunables, read via getStat()
  }

  init() {}
  update(delta) {}
  onLeftClick() {}
  onRightClick() {}
  onKill(killCount) {}      // called after each enemy dies (orb growth, etc.)
  onBatteryPickup() {}      // orb charge pickups; no-op for others

  // Returns { text, color } for the shared HUD status line.
  hudText() {
    return { text: '', color: '#4c5580' };
  }

  getStat(key) {
    return this.stats[key];
  }

  // Debug hooks. refill() tops up this ability's resource (used by the debug
  // "infinite resources" cheat); debugState() returns a short introspection
  // string for the debug readout. Overridden per ability.
  refill() {}
  debugState() { return ''; }

  aimAngle() {
    const p = this.scene.input.activePointer;
    return Phaser.Math.Angle.Between(this.scene.player.x, this.scene.player.y, p.x, p.y);
  }
}
