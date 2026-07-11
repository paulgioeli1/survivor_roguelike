import Phaser from 'phaser';
import { Ability } from './Ability.js';

// Fires single bullets (max 5, regen over time). Ultimate fires the full clip
// as a spread when full.
export class GunAbility extends Ability {
  constructor(scene) {
    super(scene);
    this.stats = { inventoryMax: 5, regenInterval: 1600, bulletSpeed: 480 };
    this.inventory = this.getStat('inventoryMax');
    this.regenTimer = 0;
  }

  init() {
    this.bullets = this.scene.physics.add.group();
    this.scene.physics.add.overlap(this.bullets, this.scene.enemies, this.handleBulletHit, null, this);
  }

  update(delta) {
    const max = this.getStat('inventoryMax');
    if (this.inventory >= max) return;
    this.regenTimer += delta;
    if (this.regenTimer >= this.getStat('regenInterval')) {
      this.regenTimer -= this.getStat('regenInterval');
      this.inventory = Math.min(max, this.inventory + 1);
    }
  }

  onLeftClick() {
    if (this.inventory <= 0) return;
    this.inventory -= 1;
    this.spawnBullet(this.aimAngle());
  }

  onRightClick() {
    const max = this.getStat('inventoryMax');
    if (this.inventory < max) return;
    const baseAngle = this.aimAngle();
    const spreadStep = Phaser.Math.DegToRad(5);
    for (let i = 0; i < max; i++) {
      const offset = (i - (max - 1) / 2) * spreadStep;
      this.spawnBullet(baseAngle + offset);
    }
    this.inventory = 0;
  }

  spawnBullet(angle) {
    const scene = this.scene;
    // Velocity must be set AFTER the sprite is added to the group — group
    // creation resets an existing sprite's velocity to 0.
    const bullet = this.bullets.create(scene.player.x, scene.player.y, 'bullet-tex');
    bullet.body.setCircle(4, bullet.width / 2 - 4, bullet.height / 2 - 4);
    bullet.body.setAllowGravity(false);
    const speed = this.getStat('bulletSpeed');
    bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    scene.time.delayedCall(2200, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  handleBulletHit(bullet, enemy) {
    if (!bullet.active) return;
    bullet.destroy();
    enemy.takeDamage(1);
  }

  hudText() {
    const full = this.inventory >= this.getStat('inventoryMax');
    return {
      text: `bullets  ${this.inventory}/${this.getStat('inventoryMax')}${full ? '   |   right click: spread ultimate' : ''}`,
      color: full ? '#fff275' : '#4c5580'
    };
  }
}
