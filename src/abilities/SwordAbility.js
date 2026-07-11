import Phaser from 'phaser';
import { COLORS } from '../config/colors.js';
import { Ability } from './Ability.js';

// Melee wedge slash toward the cursor (short cooldown). Ultimate is a spinning
// slash that damages everything around the player over ~1s.
export class SwordAbility extends Ability {
  constructor(scene) {
    super(scene);
    this.stats = { swingCooldown: 450, range: 90, ultimateCooldown: 9000, ultimateRadius: 150 };
    this.swingTimer = 0;
    this.ultimateTimer = 0;
    this.ultimateActive = false;
  }

  update(delta) {
    if (this.swingTimer > 0) this.swingTimer = Math.max(0, this.swingTimer - delta);
    if (this.ultimateTimer > 0) this.ultimateTimer = Math.max(0, this.ultimateTimer - delta);
  }

  onLeftClick() {
    if (this.swingTimer > 0) return;
    this.swing();
    this.swingTimer = this.getStat('swingCooldown');
  }

  onRightClick() {
    if (this.ultimateTimer > 0 || this.ultimateActive) return;
    this.spinSlash();
    this.ultimateTimer = this.getStat('ultimateCooldown');
  }

  swing() {
    const scene = this.scene;
    const aim = this.aimAngle();
    const halfArc = Phaser.Math.DegToRad(30);
    const range = this.getStat('range');

    // Snapshot first so killing an enemy mid-swing doesn't skip the next.
    scene.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      // Pad range/angle by the enemy's radius so a sprite visually touching the
      // wedge counts, not just its exact center.
      const enemyRadius = enemy.body.radius || 12;
      const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, enemy.x, enemy.y);
      if (dist > range + enemyRadius) return;
      const angleToEnemy = Phaser.Math.Angle.Between(scene.player.x, scene.player.y, enemy.x, enemy.y);
      const diff = Phaser.Math.Angle.Wrap(angleToEnemy - aim);
      const angularPadding = Math.atan2(enemyRadius, Math.max(dist, 1));
      if (Math.abs(diff) <= halfArc + angularPadding) {
        enemy.takeDamage(1);
      }
    });

    const g = scene.add.graphics();
    g.setPosition(scene.player.x, scene.player.y);
    g.fillStyle(COLORS.sword, 0.5);
    g.slice(0, 0, range, aim - halfArc, aim + halfArc, false);
    g.fillPath();
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onUpdate: () => g.setPosition(scene.player.x, scene.player.y),
      onComplete: () => g.destroy()
    });
  }

  spinSlash() {
    const scene = this.scene;
    this.ultimateActive = true;
    const radius = this.getStat('ultimateRadius');
    const tickInterval = 150;
    const totalDuration = 900;

    const g = scene.add.graphics();
    g.setPosition(scene.player.x, scene.player.y);
    g.lineStyle(6, COLORS.sword, 0.8);
    g.strokeCircle(0, 0, radius);

    const tick = () => scene.damageEnemiesInRadius(scene.player.x, scene.player.y, radius, 1);
    tick();
    scene.time.addEvent({
      delay: tickInterval,
      repeat: Math.floor(totalDuration / tickInterval) - 1,
      callback: tick
    });

    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: totalDuration,
      onUpdate: () => g.setPosition(scene.player.x, scene.player.y),
      onComplete: () => {
        g.destroy();
        this.ultimateActive = false;
      }
    });
  }

  hudText() {
    const ready = this.ultimateTimer <= 0;
    return ready
      ? { text: 'spin slash ready  (right click)', color: '#dfe8ff' }
      : { text: `spin slash  ${(this.ultimateTimer / 1000).toFixed(1)}s`, color: '#4c5580' };
  }
}
