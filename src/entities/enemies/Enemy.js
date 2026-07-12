import Phaser from 'phaser';
import { Stacks } from '../../core/Stacks.js';

// Base class for every enemy. Subclasses override only what differs — most
// tiers differ only in stats (supplied by config from the registry) and so are
// nearly empty; TurretEnemy overrides update() with its own state machine, a
// future SkeletonEnemy would override onDeath() to revive, and WallEnemy
// overrides setupBody()/onPlayerContact() to be a stationary blocker.
export class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    super(scene, x, y, config.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.tier = config.tier;        // registry key, e.g. 'red'
    this.enemyColor = config.color; // used for death particles
    this.maxHp = config.hp;
    this.hp = config.hp;
    this.speed = config.speed;
    this.lastHitTime = 0;           // per-enemy hit throttle (orb/laser)
    this.lastNearMs = scene.time.now; // for the stale-enemy cull; fresh on spawn
    this.blocksPlayer = !!config.blocksPlayer; // stationary blockers opt in via registry config
    this.stacks = new Stacks(this); // inert composition seam

    this.setupBody();
  }

  // Circle body sized to the sprite, matching the original setCircle math.
  // Override for enemies with a different shape/collision (e.g. a
  // rectangular, immovable blocker — see WallEnemy).
  setupBody() {
    const r = this.displayWidth * 0.32;
    this.body.setCircle(r, this.displayWidth / 2 - r, this.displayHeight / 2 - r);
  }

  // Default behavior: home in on the player. Called manually each frame by the
  // scene's updateEnemies() (not via group runChildUpdate).
  update() {
    this.scene.physics.moveToObject(this, this.scene.player, this.speed);
  }

  takeDamage(amount) {
    if (!this.active) return;
    this.hp -= amount;
    this.setTintFill(0xffffff);
    this.scene.time.delayedCall(80, () => {
      if (this.active) this.clearTint();
    });
    if (this.hp <= 0) this.die();
  }

  // Death pipeline: entity-specific visuals (onDeath, overridable) → scene-wide
  // bookkeeping (kill count / drops) → remove. Snapshot x/y before destroy.
  die() {
    const { x, y } = this;
    this.onDeath();
    this.scene.onEnemyKilled(this, x, y);
    this.destroy();
  }

  onDeath() {
    this.scene.spawnDeathParticles(this.x, this.y, this.enemyColor);
  }

  // Called when the player touches this enemy via the shared overlap. Default
  // is contact damage: destroy this enemy and hurt the player. Override to
  // change contact behavior — a stationary blocker (WallEnemy) no-ops here,
  // since it never damages the player and isn't destroyed by touch (physical
  // blocking is handled separately, by the enemyBlockers collider).
  onPlayerContact() {
    // Capture the scene reference before destroying — destroy() nulls
    // this.scene as part of its own cleanup.
    const scene = this.scene;
    this.destroy();
    scene.damagePlayer();
  }
}
