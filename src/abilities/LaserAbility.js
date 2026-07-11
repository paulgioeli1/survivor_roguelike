import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { COLORS } from '../config/colors.js';
import { Ability } from './Ability.js';

// Hold left click to fire a continuous beam until energy drains, then it locks
// out and recharges. Ultimate is a one-shot overcharged beam that kills
// everything in its path. Owns its own energy bar in the HUD.
export class LaserAbility extends Ability {
  constructor(scene) {
    super(scene);
    this.stats = { energyMax: 100, fillDuration: 10000, drainDuration: 2500 };
    this.energy = this.getStat('energyMax');
    this.lockedOut = false;
    this.ultimateActive = false;
    this.beamGraphic = null;
    this.beamFiring = false;
    this.lastAngle = 0;
  }

  init() {
    const scene = this.scene;
    this.barWidth = 200;
    const barX = 20;
    const barY = GAME_HEIGHT - 46;
    scene.add.rectangle(barX, barY, this.barWidth, 10, 0x1a1d3a)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0xffffff, 0.25);
    this.barFill = scene.add.rectangle(barX, barY, this.barWidth, 10, COLORS.laser)
      .setOrigin(0, 0.5);
  }

  update(delta) {
    const scene = this.scene;
    const pointer = scene.input.activePointer;
    const energyMax = this.getStat('energyMax');
    const wantsFire = !this.lockedOut && !this.ultimateActive
      && this.energy > 0 && pointer.leftButtonDown();

    if (wantsFire) {
      this.energy = Math.max(0, this.energy - (energyMax / this.getStat('drainDuration')) * delta);
      this.fireTick();
      if (this.energy <= 0) {
        this.energy = 0;
        this.lockedOut = true;
        this.clearBeam();
      }
    } else {
      if (!pointer.leftButtonDown()) this.clearBeam();
      this.beamFiring = false;
      this.energy = Math.min(energyMax, this.energy + (energyMax / this.getStat('fillDuration')) * delta);
      if (this.lockedOut && this.energy >= energyMax) {
        this.lockedOut = false;
      }
    }

    // Keep the energy bar in sync every frame.
    this.barFill.width = this.barWidth * (this.energy / energyMax);
    this.barFill.setFillStyle(this.lockedOut ? 0x4c5580 : COLORS.laser);
  }

  fireTick() {
    const angle = this.aimAngle();
    this.drawBeam(angle, 4, COLORS.laser, 0.85);

    // Sweep-test interpolated angles between last frame's aim and this frame's
    // so a fast mouse whip can't slip an enemy through the gap between rays.
    const prevAngle = this.beamFiring ? this.lastAngle : angle;
    const sweepDelta = Phaser.Math.Angle.Wrap(angle - prevAngle);
    const steps = Phaser.Math.Clamp(Math.ceil(Math.abs(sweepDelta) / Phaser.Math.DegToRad(2)), 1, 48);
    for (let i = 0; i <= steps; i++) {
      const sampleAngle = prevAngle + sweepDelta * (i / steps);
      // Per-enemy cooldown so a held beam is steady DoT, not one hit per frame,
      // and a single sweep doesn't re-hit an enemy at multiple sub-angles.
      this.damageEnemiesInBeam(sampleAngle, 10, 1, 120);
    }

    this.lastAngle = angle;
    this.beamFiring = true;
  }

  damageEnemiesInBeam(angle, hitWidth, amount, hitCooldownMs) {
    const scene = this.scene;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const now = scene.time.now;

    scene.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      if (hitCooldownMs && now - (enemy.lastHitTime || 0) < hitCooldownMs) return;
      const px = enemy.x - scene.player.x;
      const py = enemy.y - scene.player.y;
      const t = px * dirX + py * dirY;
      if (t < 0) return;
      const closestX = scene.player.x + dirX * t;
      const closestY = scene.player.y + dirY * t;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, closestX, closestY);
      if (dist <= hitWidth) {
        enemy.lastHitTime = now;
        enemy.takeDamage(amount);
      }
    });
  }

  drawBeam(angle, thickness, color, alpha) {
    const scene = this.scene;
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const maxLen = Math.hypot(GAME_WIDTH, GAME_HEIGHT);
    if (!this.beamGraphic) this.beamGraphic = scene.add.graphics();
    const g = this.beamGraphic;
    g.clear();
    g.setPosition(scene.player.x, scene.player.y);
    g.lineStyle(thickness, color, alpha);
    g.lineBetween(0, 0, dirX * maxLen, dirY * maxLen);
  }

  clearBeam() {
    if (this.beamGraphic) this.beamGraphic.clear();
  }

  onRightClick() {
    const energyMax = this.getStat('energyMax');
    if (this.energy < energyMax || this.lockedOut || this.ultimateActive) return;
    this.ultimateActive = true;
    const scene = this.scene;

    const angle = this.aimAngle();
    // "Kills everything in its path" via a huge damage number, so it still runs
    // through the normal hit flash / death particles / kill-count bookkeeping.
    this.damageEnemiesInBeam(angle, 100, 9999, 0);

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const maxLen = Math.hypot(GAME_WIDTH, GAME_HEIGHT);
    const g = scene.add.graphics();
    g.setPosition(scene.player.x, scene.player.y);
    g.lineStyle(40, COLORS.laser, 0.9);
    g.lineBetween(0, 0, dirX * maxLen, dirY * maxLen);
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy()
    });

    this.energy = 0;
    this.lockedOut = true;
    this.ultimateActive = false;
  }

  hudText() {
    const pct = Math.floor(this.energy);
    const label = this.lockedOut
      ? 'recharging'
      : (pct >= 100 ? 'full   |   right click: overcharge beam' : `${pct}%`);
    return {
      text: `laser energy  ${label}`,
      color: this.lockedOut ? '#4c5580' : '#b15bff'
    };
  }
}
