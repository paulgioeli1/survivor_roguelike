import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, WORLD_WIDTH, WORLD_HEIGHT, VIEW_RADIUS } from '../config/constants.js';
import { COLORS } from '../config/colors.js';
import { WEAPONS } from '../config/balance.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { Hud } from '../systems/Hud.js';
import { CameraController } from '../systems/CameraController.js';
import { Player } from '../entities/Player.js';
import { createAbility } from '../abilities/index.js';
import { spawnGamespaceObjectByName } from '../entities/gamespace/index.js';
import { DebugSystem } from '../systems/DebugSystem.js';
import { Analytics } from '../systems/Analytics.js';
import { saveRun } from '../systems/RunSaver.js';

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

    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Camera-locked scrolling grid: a view-sized TileSprite whose tile offset
    // tracks the camera scroll, faking a continuous world-fixed grid at any
    // world size (see update()). Sits behind everything.
    this.grid = this.add.tileSprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 'grid-tile-tex')
      .setScrollFactor(0)
      .setDepth(-10);

    this.camera = new CameraController(this);

    this.player = new Player(this, WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    this.camera.follow(this.player);

    // Soft, visible world edge: a thick neon border in world space (scrolls
    // with the world, only seen when near it). The player already stops here
    // via setCollideWorldBounds — this just makes the boundary readable so
    // drifting into it is a redirect, not a surprise.
    const border = this.add.graphics().setDepth(-5);
    border.lineStyle(12, COLORS.player, 0.6);
    border.strokeRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    // Shared groups the scene owns. Ability-specific projectile groups (orbs,
    // bullets, bombs) are created by the ability itself in its init().
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    // Stationary blocker enemies (e.g. WallEnemy) also join this group; the
    // collider below stops the player physically, separate from the
    // enemies-overlap that handles contact damage/onPlayerContact().
    this.enemyBlockers = this.physics.add.group();
    this.pickups = this.physics.add.group();

    const weapon = WEAPONS[this.weaponType];
    this.hud = new Hud(this, weapon.name, weapon.color, this.player.stats.maxHp);

    // Gamespace objects: blockers (walls) collide with the player; triggers
    // (pools/chargers/etc.) overlap and fire onPlayerOverlap each frame.
    this.gamespaceBlockers = this.physics.add.staticGroup();
    this.gamespaceObjects = this.physics.add.group();

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickupCollected, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHit, null, this);
    this.physics.add.collider(this.player, this.gamespaceBlockers);
    this.physics.add.collider(this.player, this.enemyBlockers);
    this.physics.add.overlap(this.player, this.gamespaceObjects, (p, obj) => obj.onPlayerOverlap(p), null, this);

    // Demo: one static wall proving the gamespace pattern, near the player's
    // world-center start. Remove or replace with real level layout later.
    spawnGamespaceObjectByName(this, 'obstacle', WORLD_WIDTH / 2 + 320, WORLD_HEIGHT / 2);

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
    Analytics.gameStart(this.weaponType);

    // Dev-only debug/cheat overlay (backtick to toggle). Gated by Vite's DEV
    // flag so it never ships in a production build.
    if (import.meta.env.DEV) this.debug = new DebugSystem(this);
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.elapsed += delta / 1000;
    this.hud.setTime(this.elapsed);

    // Scroll the grid opposite the camera so it reads as world-fixed.
    this.grid.tilePositionX = this.cameras.main.scrollX;
    this.grid.tilePositionY = this.cameras.main.scrollY;

    this.player.update(delta);
    this.updateEnemies(delta);
    this.updateResourceHud();

    if (this.debug) this.debug.update();
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

  // Off-screen ring around the player: enemies spawn just beyond the view and
  // walk in from every direction. This (not culling) is what stops a fleeing
  // player from outrunning the horde — fresh enemies appear ahead of them too.
  getSpawnPosition() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.Between(VIEW_RADIUS + 80, VIEW_RADIUS + 380);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 40, WORLD_WIDTH - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 40, WORLD_HEIGHT - 40);
    return { x, y };
  }

  // Within the view, near the player, so on-screen pickups (batteries) are
  // findable — unlike the off-screen enemy ring.
  getPickupPosition() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist = Phaser.Math.Between(120, VIEW_RADIUS * 0.7);
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 40, WORLD_WIDTH - 40);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 40, WORLD_HEIGHT - 40);
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
    const pos = this.getPickupPosition();
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
    // TurretEnemy runs its own state machine). Also refresh each enemy's
    // "last seen near the player" stamp, which the stale cull reads.
    const now = this.time.now;
    const nearThreshold = VIEW_RADIUS * 1.5;
    this.enemies.getChildren().forEach((enemy) => {
      enemy.update(delta);
      if (Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y) <= nearThreshold) {
        enemy.lastNearMs = now;
      }
    });
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
    enemy.onPlayerContact();
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

    Analytics.gameOver(this.weaponType, this.killCount, this.elapsed);
    saveRun({ weapon: this.weaponType, killCount: this.killCount, elapsedSeconds: this.elapsed });

    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', { score: this.killCount, time: this.elapsed });
    });
  }
}
