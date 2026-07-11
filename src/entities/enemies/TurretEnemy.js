import Phaser from 'phaser';
import { Enemy } from './Enemy.js';

// Ranged enemy: travels to a spawn-assigned station point, then stops and
// fires aimed bullets at the player on a timer. Overrides the base chase.
export class TurretEnemy extends Enemy {
  constructor(scene, x, y, config) {
    super(scene, x, y, config);
    this.kind = 'turret';
    this.turretState = 'traveling';
    this.targetX = x;
    this.targetY = y;
    this.shootTimer = 0;
  }

  // Called by the spawner once it has picked a landing spot in the arena.
  setTravelTarget(tx, ty) {
    this.targetX = tx;
    this.targetY = ty;
  }

  update(delta) {
    if (this.turretState === 'traveling') {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, this.targetX, this.targetY);
      if (dist <= 6) {
        this.body.setVelocity(0, 0);
        this.turretState = 'stationed';
        this.shootTimer = 0;
      } else {
        this.scene.physics.moveTo(this, this.targetX, this.targetY, this.speed);
      }
    } else {
      this.body.setVelocity(0, 0);
      this.shootTimer += delta;
      if (this.shootTimer >= 2000) {
        this.shootTimer -= 2000;
        this.fireBullet();
      }
    }
  }

  fireBullet() {
    const scene = this.scene;
    const angle = Phaser.Math.Angle.Between(this.x, this.y, scene.player.x, scene.player.y);
    const bullet = scene.enemyBullets.create(this.x, this.y, 'enemy-bullet-tex');
    bullet.body.setCircle(4, bullet.width / 2 - 4, bullet.height / 2 - 4);
    bullet.body.setAllowGravity(false);
    const speed = 260;
    bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    scene.time.delayedCall(3000, () => {
      if (bullet.active) bullet.destroy();
    });
  }
}
