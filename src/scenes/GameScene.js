import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY, MAX_HP } from '../config/constants.js';
import { COLORS } from '../config/colors.js';
import { WEAPONS } from '../config/balance.js';
import { drawNeonGrid } from '../core/grid.js';
import { SpawnSystem } from '../systems/SpawnSystem.js';
import { createAbility } from '../abilities/index.js';

export class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  init(data) {
    this.weaponType = (data && data.weapon) || 'orb';
  }

  create() {
    this.killCount = 0;
    this.maxHp = MAX_HP;
    this.hp = this.maxHp;
    this.elapsed = 0;
    this.invulnerable = false;
    this.gameOver = false;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawNeonGrid(this, 0.5);
    this.createHud();

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player-tex');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(14, this.player.width / 2 - 14, this.player.height / 2 - 14);

    // Shared groups the scene owns. Ability-specific projectile groups (orbs,
    // bullets, bombs) are created by the ability itself in its init().
    this.enemyBullets = this.physics.add.group();
    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickupCollected, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHit, null, this);

    // The active ability. Input/update/HUD dispatch through it — no weaponType
    // branching. Its init() wires up its own groups and collisions.
    this.ability = createAbility(this.weaponType, this);
    this.ability.init();

    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver) return;
      if (pointer.rightButtonDown()) {
        this.ability.onRightClick();
      } else if (pointer.leftButtonDown()) {
        this.ability.onLeftClick();
      }
    });

    this.spawnSystem = new SpawnSystem(this);

    // Battery pickups only matter to the orb's charge-gated ultimate — don't
    // bother spawning them for abilities that can't use them.
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
    this.updateTimerText();

    this.handleMovement();
    this.ability.update(delta);
    this.updateEnemies(delta);
    this.updateResourceHud();
  }

  createHud() {
    this.timerText = this.add.text(GAME_WIDTH / 2, 16, '00:00', {
      fontFamily: FONT_FAMILY,
      fontSize: '26px',
      fontStyle: '700',
      color: '#e8f9ff'
    }).setOrigin(0.5, 0).setShadow(0, 0, '#00e5ff', 8, true, true);

    this.scoreText = this.add.text(20, 20, 'kills  0', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#8890b0'
    });

    const weapon = WEAPONS[this.weaponType];
    this.add.text(20, 44, weapon.name, {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#' + weapon.color.toString(16).padStart(6, '0')
    });

    this.hpPips = [];
    for (let i = 0; i < this.maxHp; i++) {
      const pip = this.add.rectangle(GAME_WIDTH - 30 - i * 26, 30, 18, 18, COLORS.player)
        .setStrokeStyle(1, 0xffffff, 0.4);
      this.hpPips.push(pip);
    }

    // Shared status line at the bottom-left; each ability supplies its text
    // via hudText(). Abilities that need extra HUD (e.g. the laser bar) create
    // it themselves in init().
    this.ultimateText = this.add.text(20, GAME_HEIGHT - 30, 'ultimate charging  0%', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#4c5580'
    });
  }

  updateTimerText() {
    const total = Math.floor(this.elapsed);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    this.timerText.setText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
  }

  updateHpDisplay() {
    this.hpPips.forEach((pip, i) => {
      pip.setFillStyle(i < this.hp ? COLORS.player : 0x1a1d3a);
    });
  }

  updateResourceHud() {
    const h = this.ability.hudText();
    this.ultimateText.setText(h.text);
    this.ultimateText.setColor(h.color);
  }

  handleMovement() {
    const speed = 220;
    let vx = 0;
    let vy = 0;
    if (this.keys.A.isDown) vx -= 1;
    if (this.keys.D.isDown) vx += 1;
    if (this.keys.W.isDown) vy -= 1;
    if (this.keys.S.isDown) vy += 1;

    const v = new Phaser.Math.Vector2(vx, vy);
    if (v.length() > 0) v.normalize();
    this.player.setVelocity(v.x * speed, v.y * speed);
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
    if (this.invulnerable || this.gameOver) return;
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
      this.applyHeal();
    } else if (pickup.pickupType === 'battery') {
      this.ability.onBatteryPickup();
    }
    pickup.destroy();
  }

  applyHeal() {
    if (this.hp < this.maxHp) {
      this.hp += 1;
      this.updateHpDisplay();
    }
  }

  updateEnemies(delta) {
    // Polymorphic: each enemy subclass decides how it moves (base chases,
    // TurretEnemy runs its own state machine).
    this.enemies.getChildren().forEach((enemy) => enemy.update(delta));
  }

  // Called by Enemy.die() after its death visuals run — scene-wide kill
  // bookkeeping (score, heal drops), then the ability's own on-kill hook
  // (e.g. orb growth). The enemy is destroyed by die() itself.
  onEnemyKilled(enemy, x, y) {
    this.killCount += 1;
    this.scoreText.setText(`kills  ${this.killCount}`);

    if (this.killCount % 10 === 0) {
      this.spawnHealPickup(x, y);
    }

    this.ability.onKill(this.killCount);
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
    if (this.invulnerable || this.gameOver) return;
    enemy.destroy();
    this.damagePlayer();
  }

  damagePlayer() {
    this.hp -= 1;
    this.updateHpDisplay();
    this.cameras.main.shake(120, 0.006);
    this.setInvulnerable();
    if (this.hp <= 0) {
      this.endGame();
    }
  }

  setInvulnerable() {
    this.invulnerable = true;
    this.tweens.add({
      targets: this.player,
      alpha: 0.3,
      yoyo: true,
      repeat: 4,
      duration: 90,
      onComplete: () => {
        this.player.alpha = 1;
        this.invulnerable = false;
      }
    });
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
