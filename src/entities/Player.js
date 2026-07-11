import Phaser from 'phaser';
import { MAX_HP } from '../config/constants.js';
import { Stacks } from '../core/Stacks.js';

// The player. Owns movement, a generic stat block, a loadout of abilities, and
// a stacks component. Input/update/kill/pickup events fan out to every ability
// in the loadout — today there's exactly one, so behavior matches the original
// single-weapon game, but nothing assumes "one".
export class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, 'player-tex');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.body.setCircle(14, this.width / 2 - 14, this.height / 2 - 14);

    // Generic stat block. mana is wired now (0/0) but unused until abilities
    // need it — cheap now, painful to retrofit. Reads go through getStat() so
    // future buffs/debuffs (superchargers, stacks, enemy debuffs) apply at one
    // chokepoint.
    this.stats = { maxHp: MAX_HP, hp: MAX_HP, maxMana: 0, mana: 0, moveSpeed: 220 };

    this.abilities = [];             // loadout (one today; push to add more)
    this.stacks = new Stacks(this);  // inert composition seam
    this.invulnerable = false;

    this.keys = scene.input.keyboard.addKeys('W,A,S,D');
  }

  getStat(key) {
    return this.stats[key];
  }

  addAbility(ability) {
    this.abilities.push(ability);
    ability.init();
    return ability;
  }

  primaryAbility() {
    return this.abilities[0];
  }

  update(delta) {
    this.handleMovement();
    this.abilities.forEach((a) => a.update(delta));
  }

  handleMovement() {
    const speed = this.getStat('moveSpeed');
    let vx = 0;
    let vy = 0;
    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.length() > 0) v.normalize();
    this.setVelocity(v.x * speed, v.y * speed);
  }

  onLeftClick() { this.abilities.forEach((a) => a.onLeftClick()); }
  onRightClick() { this.abilities.forEach((a) => a.onRightClick()); }
  onKill(killCount) { this.abilities.forEach((a) => a.onKill(killCount)); }
  onBatteryPickup() { this.abilities.forEach((a) => a.onBatteryPickup()); }

  // Applies one point of damage. Returns true if it was lethal. No-op (and not
  // lethal) while invulnerable.
  takeDamage() {
    if (this.invulnerable) return false;
    this.stats.hp -= 1;
    this.setInvulnerable();
    return this.stats.hp <= 0;
  }

  heal() {
    if (this.stats.hp < this.stats.maxHp) {
      this.stats.hp += 1;
      return true;
    }
    return false;
  }

  setInvulnerable() {
    this.invulnerable = true;
    this.scene.tweens.add({
      targets: this,
      alpha: 0.3,
      yoyo: true,
      repeat: 4,
      duration: 90,
      onComplete: () => {
        this.alpha = 1;
        this.invulnerable = false;
      }
    });
  }
}
