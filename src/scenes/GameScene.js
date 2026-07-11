import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { WEAPONS } from '../config/balance.js';
import { drawNeonGrid } from '../core/grid.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { Hud } from '../systems/Hud.js';
import { CameraController } from '../systems/CameraController.js';
import { Player } from '../entities/Player.js';
import { createAbility } from '../abilities/index.js';

// Thin coordinator: builds the world, player, HUD, camera, and spawner, wires
// shared collisions, and delegates per-frame work to those pieces. Combat
// specifics live in the entities/abilities/systems it composes.
export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.weaponType = (data && data.weapon) || 'orb';
  }

  create() {
    this.killCount = 0;
    this.elapsed = 0;
    this.gameOver = false;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawNeonGrid(this, 0.5);
    this.camera = new CameraController(this);

    this.player = new Player(this, GAME_WIDTH / 2, GAME_HEIGHT / 2);

    // Shared groups the scene owns. Ability-specific projectile groups (orbs,
    // bullets, bombs) are created by the ability itself in its init().
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    const weapon = WEAPONS[this.weaponType];
    this.hud = new Hud(this, weapon.name, weapon.color, this.player.stats.maxHp);

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickupCollected, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHit, null, this);

    // Give the player its starting ability. addAbility() runs the ability's
    // init(), which wires up its own groups/collisions/HUD extras.
    this.player.addAbility(createAbility(this.weaponType, this));

    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver) return;
      if (pointer.rightButtonDown()) {
        this.player.onRightClick();
      } else if (pointer.leftButtonDown()) {
        this.player.onLeftClick();
      }
    });

    this.spawnSystem = new SpawnSystem(this);

    // Battery pickups only matter to the orb's charge-gated ultimate.
    if (this.weaponType === 'orb') {
      this.batteryTimer = this.time.addEvent({
        delay: 20000,
        loop: true,
        callback: () => this.spawnBatteryCell()
      });
    }

    this.updateResourceHud();
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.elapsed += delta / 1000;
    this.hud.setTime(this.elapsed);

    this.player.update(delta);
    this.updateEnemies(delta);
    this.updateResourceHud();
  }

  updateResourceHud() {
    this.hud.setResource(this.player.primaryAbility().hudText());
  }

  // Shared combat helper used by the bomb and sword abilities.
  damageEnemiesInRadius(x, y, radius, amount) {
    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      const enemyRadius = enemy.body.radius || 12;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius + enemyRadius) {
        enemy.takeDamage(amount);
      }
    });
  }

  getSpawnPosition() {
    const margin = 24;
    let x;
    let y;
    let dist;
    do {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      dist = Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y);
    } while (dist < 140);
    return { x, y };
  }

  handleEnemyBulletHit(player, bullet) {
    // Arcade Physics always calls overlap callbacks as (singleObject,
    // groupMember) — player first, bullet second — regardless of argument
    // order. Getting this backwards would destroy the player sprite instead.
    if (!bullet.active) return;
    bullet.destroy();
    if (this.player.invulnerable || this.gameOver) return;
    this.damagePlayer();
  }

  spawnHealPickup(x, y) {
    const pickup = this.physics.add.sprite(x, y, 'heal-tex');
    pickup.pickupType = 'heal';
    pickup.body.setCircle(9, pickup.width / 2 - 9, pickup.height / 2 - 9);
    pickup.body.setAllowGravity(false);
    this.pickups.add(pickup);
  }

  spawnBatteryCell() {
    if (this.gameOver) return;
    const pos = this.getSpawnPosition();
    const pickup = this.physics.add.sprite(pos.x, pos.y, 'battery-tex');
    pickup.pickupType = 'battery';
    pickup.body.setCircle(9, pickup.width / 2 - 9, pickup.height / 2 - 9);
    pickup.body.setAllowGravity(false);
    this.pickups.add(pickup);
  }

  handlePickupCollected(player, pickup) {
    if (!pickup.active) return;
    if (pickup.pickupType === 'heal') {
      if (this.player.heal()) this.hud.setHp(this.player.stats.hp);
    } else if (pickup.pickupType === 'battery') {
      this.player.onBatteryPickup();
    }
    pickup.destroy();
  }

  updateEnemies(delta) {
    // Polymorphic: each enemy subclass decides how it moves (base chases,
    // TurretEnemy runs its own state machine).
    this.enemies.getChildren().forEach((enemy) => enemy.update(delta));
  }

  // Called by Enemy.die() after its death visuals run — scene-wide kill
  // bookkeeping (score, heal drops), then the loadout's own on-kill hooks
  // (e.g. orb growth). The enemy is destroyed by die() itself.
  onEnemyKilled(enemy, x, y) {
    this.killCount += 1;
    this.hud.setScore(this.killCount);

    if (this.killCount % 10 === 0) {
      this.spawnHealPickup(x, y);
    }

    this.player.onKill(this.killCount);
  }

  spawnDeathParticles(x, y, color) {
    const emitter = this.add.particles(0, 0, 'particle-tex', {
      tint: color,
      speed: { min: 60, max: 160 },
      lifespan: 300,
      scale: { start: 1.4, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    emitter.explode(10, x, y);
    this.time.delayedCall(350, () => emitter.destroy());
  }

  handlePlayerHit(player, enemy) {
    if (this.player.invulnerable || this.gameOver) return;
    enemy.destroy();
    this.damagePlayer();
  }

  damagePlayer() {
    const died = this.player.takeDamage();
    this.hud.setHp(this.player.stats.hp);
    this.camera.shakeOnHit();
    if (died) {
      this.endGame();
    }
  }

  endGame() {
    this.gameOver = true;
    this.spawnSystem.stop();
    if (this.batteryTimer) this.batteryTimer.remove();
    this.physics.pause();
    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', { score: this.killCount, time: this.elapsed });
    });
  }
}
