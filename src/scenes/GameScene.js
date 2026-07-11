import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY, MAX_HP, COLORS, ENEMY_TIERS, WEAPONS, drawNeonGrid } from '../constants.js';

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

    // Orb is the only weapon whose ultimate is gated by a charge meter
    // (time + battery pickups). Every other weapon's ultimate is gated by
    // its own ammo/energy resource instead — see initWeapon().
    this.ultimateCooldown = 30000;
    this.ultimateTimer = 0;
    this.ultimateReady = false;
    this.ultimateActive = false;

    this.orbRadius = 66;
    this.orbAngle = 0;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawNeonGrid(this, 0.5);
    this.createTextures();
    this.createHud();

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player-tex');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(14, this.player.width / 2 - 14, this.player.height / 2 - 14);

    this.orbGroup = this.physics.add.group();
    this.bullets = this.physics.add.group();
    this.bombs = this.physics.add.group();
    this.enemyBullets = this.physics.add.group();

    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.physics.add.overlap(this.orbGroup, this.enemies, this.handleOrbHit, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHit, null, this);
    this.physics.add.overlap(this.bombs, this.enemies, this.handleBombEnemyContact, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickupCollected, null, this);
    this.physics.add.overlap(this.player, this.enemyBullets, this.handleEnemyBulletHit, null, this);

    this.input.mouse.disableContextMenu();
    this.input.on('pointerdown', (pointer) => {
      if (this.gameOver) return;
      if (pointer.rightButtonDown()) {
        this.handleRightClick();
      } else if (pointer.leftButtonDown()) {
        this.handleLeftClick();
      }
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    // Battery pickups only matter to the orb's charge-gated ultimate —
    // don't bother spawning them for weapons that can't use them.
    if (this.weaponType === 'orb') {
      this.batteryTimer = this.time.addEvent({
        delay: 20000,
        loop: true,
        callback: () => this.spawnBatteryCell()
      });
    }

    // Ranged turret enemies start showing up after the first 30s, then
    // every 10s after that.
    this.time.delayedCall(30000, () => {
      if (this.gameOver) return;
      this.spawnTurretEnemy();
      this.turretSpawnTimer = this.time.addEvent({
        delay: 10000,
        loop: true,
        callback: () => this.spawnTurretEnemy()
      });
    });

    this.initWeapon();
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.elapsed += delta / 1000;
    this.updateTimerText();

    this.handleMovement();
    this.updateWeapon(delta);
    this.updateEnemies(delta);
    if (this.weaponType === 'orb') {
      this.updateUltimateCharge(delta);
    }
    this.updateResourceHud();
  }

  createTextures() {
    const size = 28;
    const pg = this.add.graphics();
    pg.fillStyle(COLORS.player, 0.25);
    pg.fillRect(0, 0, size + 16, size + 16);
    pg.fillStyle(COLORS.player, 1);
    pg.fillRect(8, 8, size, size);
    pg.generateTexture('player-tex', size + 16, size + 16);
    pg.destroy();

    const og = this.add.graphics();
    og.fillStyle(COLORS.orb, 0.35);
    og.fillCircle(10, 10, 10);
    og.fillStyle(COLORS.orb, 1);
    og.fillCircle(10, 10, 5);
    og.generateTexture('orb-tex', 20, 20);
    og.destroy();

    this.createTriangleTexture('enemy-red', COLORS.red, 22);
    this.createTriangleTexture('enemy-green', COLORS.green, 24);
    this.createTriangleTexture('enemy-blue', COLORS.blue, 26);
    this.createPentagonTexture('enemy-turret', COLORS.turret, 34);

    const hg = this.add.graphics();
    this.drawHeart(hg, 15, 16, 22, COLORS.heal, 0.3);
    this.drawHeart(hg, 15, 16, 14, COLORS.heal, 1);
    hg.generateTexture('heal-tex', 30, 30);
    hg.destroy();

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.battery, 0.3);
    bg.fillRoundedRect(1, 3, 20, 22, 4);
    bg.fillStyle(COLORS.battery, 1);
    bg.fillRoundedRect(4, 6, 14, 17, 3);
    bg.fillRect(8, 2, 6, 5);
    bg.generateTexture('battery-tex', 22, 26);
    bg.destroy();

    const bulletG = this.add.graphics();
    bulletG.fillStyle(COLORS.gun, 0.35);
    bulletG.fillCircle(7, 7, 7);
    bulletG.fillStyle(COLORS.gun, 1);
    bulletG.fillCircle(7, 7, 3);
    bulletG.generateTexture('bullet-tex', 14, 14);
    bulletG.destroy();

    const bombG = this.add.graphics();
    bombG.fillStyle(COLORS.bomb, 0.35);
    bombG.fillCircle(9, 10, 9);
    bombG.fillStyle(COLORS.bomb, 1);
    bombG.fillCircle(9, 10, 6);
    bombG.fillStyle(0x3a2a1a, 1);
    bombG.fillRect(7, 0, 4, 4);
    bombG.generateTexture('bomb-tex', 18, 20);
    bombG.destroy();

    const enemyBulletG = this.add.graphics();
    enemyBulletG.fillStyle(COLORS.turret, 0.35);
    enemyBulletG.fillCircle(7, 7, 7);
    enemyBulletG.fillStyle(COLORS.turret, 1);
    enemyBulletG.fillCircle(7, 7, 3);
    enemyBulletG.generateTexture('enemy-bullet-tex', 14, 14);
    enemyBulletG.destroy();

    const partG = this.add.graphics();
    partG.fillStyle(0xffffff, 1);
    partG.fillRect(0, 0, 4, 4);
    partG.generateTexture('particle-tex', 4, 4);
    partG.destroy();
  }

  createTriangleTexture(key, color, size) {
    const pad = 6;
    const total = size + pad * 2;
    const cx = total / 2;
    const g = this.add.graphics();
    g.fillStyle(color, 0.25);
    g.fillTriangle(cx, pad - 4, pad - 4, total - pad + 4, total - pad + 4, total - pad + 4);
    g.fillStyle(color, 1);
    g.fillTriangle(cx, pad, pad, total - pad, total - pad, total - pad);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  createPentagonTexture(key, color, size) {
    const pad = 6;
    const total = size + pad * 2;
    const cx = total / 2;
    const cy = total / 2;
    const pentagonPoints = (radius) => {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
      }
      return pts;
    };
    const g = this.add.graphics();
    g.fillStyle(color, 0.25);
    g.fillPoints(pentagonPoints(size / 2 + 4), true);
    g.fillStyle(color, 1);
    g.fillPoints(pentagonPoints(size / 2), true);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  drawHeart(g, cx, cy, s, color, alpha) {
    const r = s * 0.28;
    g.fillStyle(color, alpha);
    g.fillCircle(cx - r, cy - r * 0.4, r);
    g.fillCircle(cx + r, cy - r * 0.4, r);
    g.fillTriangle(cx - s * 0.5, cy - r * 0.1, cx + s * 0.5, cy - r * 0.1, cx, cy + s * 0.5);
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

    this.ultimateText = this.add.text(20, GAME_HEIGHT - 30, 'ultimate charging  0%', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#4c5580'
    });

    if (this.weaponType === 'laser') {
      this.laserEnergyBarWidth = 200;
      const barX = 20;
      const barY = GAME_HEIGHT - 46;
      this.add.rectangle(barX, barY, this.laserEnergyBarWidth, 10, 0x1a1d3a)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0xffffff, 0.25);
      this.laserEnergyBarFill = this.add.rectangle(barX, barY, this.laserEnergyBarWidth, 10, COLORS.laser)
        .setOrigin(0, 0.5);
    }
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

  addOrb() {
    const orb = this.physics.add.sprite(this.player.x, this.player.y, 'orb-tex');
    orb.body.setCircle(5, 5, 5);
    orb.body.setAllowGravity(false);
    this.orbGroup.add(orb);
  }

  updateOrbs(delta) {
    this.orbAngle += Phaser.Math.DegToRad(90) * (delta / 1000);
    const orbs = this.orbGroup.getChildren();
    const n = orbs.length;
    orbs.forEach((orb, i) => {
      const angle = this.orbAngle + i * (Math.PI * 2 / n);
      const x = this.player.x + Math.cos(angle) * this.orbRadius;
      const y = this.player.y + Math.sin(angle) * this.orbRadius;
      orb.body.reset(x, y);
    });
  }

  initWeapon() {
    if (this.weaponType === 'orb') {
      this.addOrb();
    } else if (this.weaponType === 'bomb') {
      this.bombInventoryMax = 3;
      this.bombInventory = this.bombInventoryMax;
      this.bombRegenTimer = 0;
      this.bombRegenInterval = 3000;
      this.bombBlastRadius = 40; // ~2 grid cells (grid is 40px)
    } else if (this.weaponType === 'gun') {
      this.bulletInventoryMax = 5;
      this.bulletInventory = this.bulletInventoryMax;
      this.bulletRegenTimer = 0;
      this.bulletRegenInterval = 1600; // 20% faster than the original 2000ms
    } else if (this.weaponType === 'laser') {
      this.laserEnergyMax = 100;
      this.laserEnergy = this.laserEnergyMax;
      this.laserFillDuration = 10000;
      this.laserDrainDuration = 2500; // half the original 5000ms of continuous fire
      this.laserLockedOut = false;
      this.laserUltimateActive = false;
      this.laserBeamGraphic = null;
      this.laserBeamFiring = false;
      this.lastLaserAngle = 0;
    } else if (this.weaponType === 'sword') {
      this.swordSwingCooldown = 450;
      this.swordSwingTimer = 0;
      this.swordUltimateCooldown = 9000;
      this.swordUltimateTimer = 0;
      this.swordUltimateActive = false;
    }
    this.updateResourceHud();
  }

  updateWeapon(delta) {
    if (this.weaponType === 'orb') {
      this.updateOrbs(delta);
    } else if (this.weaponType === 'bomb') {
      this.updateBombRegen(delta);
    } else if (this.weaponType === 'gun') {
      this.updateBulletRegen(delta);
    } else if (this.weaponType === 'laser') {
      this.updateLaserEnergy(delta);
    } else if (this.weaponType === 'sword') {
      this.updateSwordCooldowns(delta);
    }
  }

  handleLeftClick() {
    if (this.weaponType === 'bomb') {
      this.placeBomb();
    } else if (this.weaponType === 'gun') {
      this.fireSingleBullet();
    } else if (this.weaponType === 'sword') {
      this.trySwingSword();
    }
    // Orb has no left-click action; laser fires continuously while held,
    // handled every frame in updateLaserEnergy() instead of on click.
  }

  handleRightClick() {
    if (this.weaponType === 'orb') {
      if (this.ultimateReady && !this.ultimateActive) this.triggerUltimate();
    } else if (this.weaponType === 'bomb') {
      this.detonateAllBombs();
    } else if (this.weaponType === 'gun') {
      this.fireGunUltimate();
    } else if (this.weaponType === 'laser') {
      this.fireLaserUltimate();
    } else if (this.weaponType === 'sword') {
      this.trySpinSlash();
    }
  }

  aimAngle() {
    const pointer = this.input.activePointer;
    return Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
  }

  // ---- Bomb ----

  placeBomb() {
    if (this.bombInventory <= 0) return;
    this.bombInventory -= 1;
    const bomb = this.bombs.create(this.player.x, this.player.y, 'bomb-tex');
    bomb.body.setCircle(6, bomb.width / 2 - 6, bomb.height / 2 - 6);
    bomb.body.setAllowGravity(false);
    bomb.body.setImmovable(true);
  }

  updateBombRegen(delta) {
    if (this.bombInventory >= this.bombInventoryMax) return;
    this.bombRegenTimer += delta;
    if (this.bombRegenTimer >= this.bombRegenInterval) {
      this.bombRegenTimer -= this.bombRegenInterval;
      this.bombInventory = Math.min(this.bombInventoryMax, this.bombInventory + 1);
    }
  }

  handleBombEnemyContact(bomb, enemy) {
    this.explodeBomb(bomb);
  }

  explodeBomb(bomb) {
    if (!bomb.active) return;
    const { x, y } = bomb;
    bomb.destroy();
    this.damageEnemiesInRadius(x, y, this.bombBlastRadius, 1);
    this.spawnExplosionEffect(x, y, this.bombBlastRadius);
  }

  detonateAllBombs() {
    // Snapshot first — see fireLaser()-style comments elsewhere: exploding
    // one bomb destroys it and shifts the live group array, which would
    // skip the next bomb if we iterated that array directly.
    this.bombs.getChildren().slice().forEach((bomb) => this.explodeBomb(bomb));
  }

  damageEnemiesInRadius(x, y, radius, amount) {
    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      const enemyRadius = enemy.body.radius || 12;
      const dist = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
      if (dist <= radius + enemyRadius) {
        this.damageEnemy(enemy, amount);
      }
    });
  }

  spawnExplosionEffect(x, y, radius) {
    const emitter = this.add.particles(0, 0, 'particle-tex', {
      tint: COLORS.bomb,
      speed: { min: 80, max: 220 },
      lifespan: 400,
      scale: { start: 2, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    emitter.explode(20, x, y);
    this.time.delayedCall(450, () => emitter.destroy());

    const g = this.add.graphics();
    g.lineStyle(4, COLORS.bomb, 0.9);
    g.strokeCircle(x, y, radius);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy()
    });
  }

  // ---- Gun ----

  fireSingleBullet() {
    if (this.bulletInventory <= 0) return;
    this.bulletInventory -= 1;
    this.spawnBullet(this.aimAngle());
  }

  updateBulletRegen(delta) {
    if (this.bulletInventory >= this.bulletInventoryMax) return;
    this.bulletRegenTimer += delta;
    if (this.bulletRegenTimer >= this.bulletRegenInterval) {
      this.bulletRegenTimer -= this.bulletRegenInterval;
      this.bulletInventory = Math.min(this.bulletInventoryMax, this.bulletInventory + 1);
    }
  }

  fireGunUltimate() {
    if (this.bulletInventory < this.bulletInventoryMax) return;
    const baseAngle = this.aimAngle();
    const bulletCount = this.bulletInventoryMax;
    const spreadStep = Phaser.Math.DegToRad(5);
    for (let i = 0; i < bulletCount; i++) {
      const offset = (i - (bulletCount - 1) / 2) * spreadStep;
      this.spawnBullet(baseAngle + offset);
    }
    this.bulletInventory = 0;
  }

  spawnBullet(angle) {
    // Velocity must be set AFTER the sprite is added to the physics
    // group — Arcade Physics Group.create() adds it immediately, but
    // group.add() on an existing sprite resets its velocity to 0.
    const bullet = this.bullets.create(this.player.x, this.player.y, 'bullet-tex');
    bullet.body.setCircle(4, bullet.width / 2 - 4, bullet.height / 2 - 4);
    bullet.body.setAllowGravity(false);
    const speed = 480;
    bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.time.delayedCall(2200, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  handleBulletHit(bullet, enemy) {
    if (!bullet.active) return;
    bullet.destroy();
    this.damageEnemy(enemy, 1);
  }

  // ---- Laser ----

  updateLaserEnergy(delta) {
    const pointer = this.input.activePointer;
    const wantsFire = !this.laserLockedOut && !this.laserUltimateActive
      && this.laserEnergy > 0 && pointer.leftButtonDown();

    if (wantsFire) {
      this.laserEnergy = Math.max(0, this.laserEnergy - (this.laserEnergyMax / this.laserDrainDuration) * delta);
      this.fireLaserTick();
      if (this.laserEnergy <= 0) {
        this.laserEnergy = 0;
        this.laserLockedOut = true;
        this.clearLaserBeam();
      }
    } else {
      if (!pointer.leftButtonDown()) this.clearLaserBeam();
      this.laserBeamFiring = false;
      this.laserEnergy = Math.min(this.laserEnergyMax, this.laserEnergy + (this.laserEnergyMax / this.laserFillDuration) * delta);
      if (this.laserLockedOut && this.laserEnergy >= this.laserEnergyMax) {
        this.laserLockedOut = false;
      }
    }
  }

  fireLaserTick() {
    const angle = this.aimAngle();
    this.drawLaserBeam(angle, 4, COLORS.laser, 0.85);

    // A held beam re-reads the mouse angle fresh every frame and only
    // tests a single instantaneous ray. Whip the mouse fast enough and the
    // angle jumps several degrees between two consecutive frames, so an
    // enemy sitting in the gap between last frame's ray and this frame's
    // ray never gets tested against either one — the beam visually sweeps
    // through it but the collision check skips it entirely. Sweep-test a
    // handful of interpolated angles between last frame's aim and this
    // frame's aim so the swept arc has no gaps, regardless of spin speed.
    const prevAngle = this.laserBeamFiring ? this.lastLaserAngle : angle;
    const sweepDelta = Phaser.Math.Angle.Wrap(angle - prevAngle);
    const steps = Phaser.Math.Clamp(Math.ceil(Math.abs(sweepDelta) / Phaser.Math.DegToRad(2)), 1, 48);
    for (let i = 0; i <= steps; i++) {
      const sampleAngle = prevAngle + sweepDelta * (i / steps);
      // Continuous fire needs a per-enemy cooldown (like the orb's own hit
      // throttle) so a held beam deals steady damage-over-time instead of
      // one hit per rendered frame; it also stops a single sweep from
      // re-hitting the same enemy at multiple sampled sub-angles.
      this.damageEnemiesInBeam(sampleAngle, 10, 1, 120);
    }

    this.lastLaserAngle = angle;
    this.laserBeamFiring = true;
  }

  damageEnemiesInBeam(angle, hitWidth, amount, hitCooldownMs) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const now = this.time.now;

    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      if (hitCooldownMs && now - (enemy.lastHitTime || 0) < hitCooldownMs) return;
      const px = enemy.x - this.player.x;
      const py = enemy.y - this.player.y;
      const t = px * dirX + py * dirY;
      if (t < 0) return;
      const closestX = this.player.x + dirX * t;
      const closestY = this.player.y + dirY * t;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, closestX, closestY);
      if (dist <= hitWidth) {
        enemy.lastHitTime = now;
        this.damageEnemy(enemy, amount);
      }
    });
  }

  drawLaserBeam(angle, thickness, color, alpha) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const maxLen = Math.hypot(GAME_WIDTH, GAME_HEIGHT);
    if (!this.laserBeamGraphic) this.laserBeamGraphic = this.add.graphics();
    const g = this.laserBeamGraphic;
    g.clear();
    g.setPosition(this.player.x, this.player.y);
    g.lineStyle(thickness, color, alpha);
    g.lineBetween(0, 0, dirX * maxLen, dirY * maxLen);
  }

  clearLaserBeam() {
    if (this.laserBeamGraphic) this.laserBeamGraphic.clear();
  }

  fireLaserUltimate() {
    if (this.laserEnergy < this.laserEnergyMax || this.laserLockedOut || this.laserUltimateActive) return;
    this.laserUltimateActive = true;

    const angle = this.aimAngle();
    // "Kills everything in its path" — a huge damage number rather than a
    // special-cased instakill so it still plays through the normal hit
    // flash / death particles / kill-count bookkeeping.
    this.damageEnemiesInBeam(angle, 100, 9999, 0);

    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const maxLen = Math.hypot(GAME_WIDTH, GAME_HEIGHT);
    const g = this.add.graphics();
    g.setPosition(this.player.x, this.player.y);
    g.lineStyle(40, COLORS.laser, 0.9);
    g.lineBetween(0, 0, dirX * maxLen, dirY * maxLen);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy()
    });

    this.laserEnergy = 0;
    this.laserLockedOut = true;
    this.laserUltimateActive = false;
  }

  // ---- Sword ----

  trySwingSword() {
    if (this.swordSwingTimer > 0) return;
    this.swingSword();
    this.swordSwingTimer = this.swordSwingCooldown;
  }

  updateSwordCooldowns(delta) {
    if (this.swordSwingTimer > 0) this.swordSwingTimer = Math.max(0, this.swordSwingTimer - delta);
    if (this.swordUltimateTimer > 0) this.swordUltimateTimer = Math.max(0, this.swordUltimateTimer - delta);
  }

  swingSword() {
    const aim = this.aimAngle();
    const halfArc = Phaser.Math.DegToRad(30);
    const range = 90;

    // See the comment in fireLaser(): snapshot the array first so killing
    // an enemy mid-swing doesn't shift the live group array and cause the
    // next enemy in the arc to be skipped.
    this.enemies.getChildren().slice().forEach((enemy) => {
      if (!enemy.active) return;
      // Pad the range/angle checks by the enemy's own collision radius so a
      // sprite that's visually touching the wedge still counts as a hit,
      // rather than only checking its exact center point.
      const enemyRadius = enemy.body.radius || 12;
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist > range + enemyRadius) return;
      const angleToEnemy = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      const diff = Phaser.Math.Angle.Wrap(angleToEnemy - aim);
      const angularPadding = Math.atan2(enemyRadius, Math.max(dist, 1));
      if (Math.abs(diff) <= halfArc + angularPadding) {
        this.damageEnemy(enemy, 1);
      }
    });

    const g = this.add.graphics();
    g.setPosition(this.player.x, this.player.y);
    g.fillStyle(COLORS.sword, 0.5);
    g.slice(0, 0, range, aim - halfArc, aim + halfArc, false);
    g.fillPath();
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 180,
      onUpdate: () => g.setPosition(this.player.x, this.player.y),
      onComplete: () => g.destroy()
    });
  }

  trySpinSlash() {
    if (this.swordUltimateTimer > 0 || this.swordUltimateActive) return;
    this.spinSlash();
    this.swordUltimateTimer = this.swordUltimateCooldown;
  }

  spinSlash() {
    this.swordUltimateActive = true;
    const radius = 150;
    const tickInterval = 150;
    const totalDuration = 900;

    const g = this.add.graphics();
    g.setPosition(this.player.x, this.player.y);
    g.lineStyle(6, COLORS.sword, 0.8);
    g.strokeCircle(0, 0, radius);

    const tick = () => this.damageEnemiesInRadius(this.player.x, this.player.y, radius, 1);
    tick();
    this.time.addEvent({
      delay: tickInterval,
      repeat: Math.floor(totalDuration / tickInterval) - 1,
      callback: tick
    });

    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: totalDuration,
      onUpdate: () => g.setPosition(this.player.x, this.player.y),
      onComplete: () => {
        g.destroy();
        this.swordUltimateActive = false;
      }
    });
  }

  // ---- Shared resource HUD ----

  updateResourceHud() {
    if (this.weaponType === 'orb') return; // handled by updateUltimateCharge()

    if (this.weaponType === 'bomb') {
      this.ultimateText.setText(`bombs  ${this.bombInventory}/${this.bombInventoryMax}   |   right click: detonate all`);
      this.ultimateText.setColor(this.bombInventory > 0 ? '#ffb347' : '#4c5580');
    } else if (this.weaponType === 'gun') {
      const full = this.bulletInventory >= this.bulletInventoryMax;
      this.ultimateText.setText(`bullets  ${this.bulletInventory}/${this.bulletInventoryMax}${full ? '   |   right click: spread ultimate' : ''}`);
      this.ultimateText.setColor(full ? '#fff275' : '#4c5580');
    } else if (this.weaponType === 'laser') {
      const pct = Math.floor(this.laserEnergy);
      const label = this.laserLockedOut ? 'recharging' : (pct >= 100 ? 'full   |   right click: overcharge beam' : `${pct}%`);
      this.ultimateText.setText(`laser energy  ${label}`);
      this.ultimateText.setColor(this.laserLockedOut ? '#4c5580' : '#b15bff');
      const ratio = this.laserEnergy / this.laserEnergyMax;
      this.laserEnergyBarFill.width = this.laserEnergyBarWidth * ratio;
      this.laserEnergyBarFill.setFillStyle(this.laserLockedOut ? 0x4c5580 : COLORS.laser);
    } else if (this.weaponType === 'sword') {
      const ready = this.swordUltimateTimer <= 0;
      this.ultimateText.setText(ready ? 'spin slash ready  (right click)' : `spin slash  ${(this.swordUltimateTimer / 1000).toFixed(1)}s`);
      this.ultimateText.setColor(ready ? '#dfe8ff' : '#4c5580');
    }
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

  spawnEnemy() {
    const tierStepIndex = Math.floor(this.elapsed / 15);
    const redCount = Math.max(0, 60 - tierStepIndex);
    const nonRed = 60 - redCount;
    const greenCount = nonRed / 2;

    const roll = Phaser.Math.Between(1, 60);
    let tierName;
    if (roll <= redCount) tierName = 'red';
    else if (roll <= redCount + greenCount) tierName = 'green';
    else tierName = 'blue';

    const tier = ENEMY_TIERS[tierName];
    const pos = this.getSpawnPosition();
    const enemy = this.enemies.create(pos.x, pos.y, tier.texture);
    enemy.tier = tierName;
    enemy.hp = tier.hp;
    enemy.speed = tier.speed;
    enemy.lastHitTime = 0;

    const r = enemy.displayWidth * 0.32;
    enemy.body.setCircle(r, enemy.displayWidth / 2 - r, enemy.displayHeight / 2 - r);
  }

  spawnTurretEnemy() {
    if (this.gameOver) return;
    const margin = 24;
    const edge = Phaser.Math.Between(0, 3); // 0=left, 1=right, 2=top, 3=bottom
    let x;
    let y;
    let inwardAngle;
    if (edge === 0) {
      x = margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      inwardAngle = 0;
    } else if (edge === 1) {
      x = GAME_WIDTH - margin;
      y = Phaser.Math.Between(margin, GAME_HEIGHT - margin);
      inwardAngle = Math.PI;
    } else if (edge === 2) {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = margin;
      inwardAngle = Math.PI / 2;
    } else {
      x = Phaser.Math.Between(margin, GAME_WIDTH - margin);
      y = GAME_HEIGHT - margin;
      inwardAngle = -Math.PI / 2;
    }

    // Keep the travel angle biased away from the spawn wall so it heads
    // into the arena, then clamp the landing point to the play area so a
    // long travel roll can't carry it through the opposite (or an
    // adjacent) wall.
    const angle = inwardAngle + Phaser.Math.FloatBetween(-Phaser.Math.DegToRad(70), Phaser.Math.DegToRad(70));
    const travelDist = Phaser.Math.Between(150, 500);
    const targetX = Phaser.Math.Clamp(x + Math.cos(angle) * travelDist, margin, GAME_WIDTH - margin);
    const targetY = Phaser.Math.Clamp(y + Math.sin(angle) * travelDist, margin, GAME_HEIGHT - margin);

    const tier = ENEMY_TIERS.turret;
    const enemy = this.enemies.create(x, y, tier.texture);
    enemy.tier = 'turret';
    enemy.hp = tier.hp;
    enemy.speed = tier.speed;
    enemy.lastHitTime = 0;
    enemy.kind = 'turret';
    enemy.turretState = 'traveling';
    enemy.targetX = targetX;
    enemy.targetY = targetY;
    enemy.shootTimer = 0;

    const r = enemy.displayWidth * 0.32;
    enemy.body.setCircle(r, enemy.displayWidth / 2 - r, enemy.displayHeight / 2 - r);
  }

  updateTurretEnemy(enemy, delta) {
    if (enemy.turretState === 'traveling') {
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, enemy.targetX, enemy.targetY);
      if (dist <= 6) {
        enemy.body.setVelocity(0, 0);
        enemy.turretState = 'stationed';
        enemy.shootTimer = 0;
      } else {
        this.physics.moveTo(enemy, enemy.targetX, enemy.targetY, enemy.speed);
      }
    } else {
      enemy.body.setVelocity(0, 0);
      enemy.shootTimer += delta;
      if (enemy.shootTimer >= 2000) {
        enemy.shootTimer -= 2000;
        this.fireEnemyBullet(enemy);
      }
    }
  }

  fireEnemyBullet(enemy) {
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y);
    const bullet = this.enemyBullets.create(enemy.x, enemy.y, 'enemy-bullet-tex');
    bullet.body.setCircle(4, bullet.width / 2 - 4, bullet.height / 2 - 4);
    bullet.body.setAllowGravity(false);
    const speed = 260;
    bullet.body.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.time.delayedCall(3000, () => {
      if (bullet.active) bullet.destroy();
    });
  }

  handleEnemyBulletHit(player, bullet) {
    // Arcade Physics always calls overlap callbacks as (singleObject,
    // groupMember) — i.e. player first, bullet second — regardless of the
    // order the two are passed into physics.add.overlap(). Getting this
    // backwards meant `bullet.destroy()` was actually destroying the
    // player sprite (nulling its physics body), which crashed the very
    // next frame's movement code with the game silently frozen.
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
      this.applyBatteryCharge();
    }
    pickup.destroy();
  }

  applyHeal() {
    if (this.hp < this.maxHp) {
      this.hp += 1;
      this.updateHpDisplay();
    }
  }

  applyBatteryCharge() {
    if (this.weaponType !== 'orb') return;
    if (this.ultimateReady || this.ultimateActive) return;
    const chargeAmount = this.ultimateCooldown * 0.1;
    this.ultimateTimer = Math.min(this.ultimateTimer + chargeAmount, this.ultimateCooldown);
    if (this.ultimateTimer >= this.ultimateCooldown) {
      this.ultimateReady = true;
      this.ultimateText.setText('ultimate ready  (right click)');
      this.ultimateText.setColor('#ffffff');
    } else {
      const pct = Math.floor((this.ultimateTimer / this.ultimateCooldown) * 100);
      this.ultimateText.setText(`ultimate charging  ${pct}%`);
    }
  }

  updateEnemies(delta) {
    this.enemies.getChildren().forEach((enemy) => {
      if (enemy.kind === 'turret') {
        this.updateTurretEnemy(enemy, delta);
      } else {
        this.physics.moveToObject(enemy, this.player, enemy.speed);
      }
    });
  }

  handleOrbHit(orb, enemy) {
    const now = this.time.now;
    if (now - (enemy.lastHitTime || 0) < 350) return;
    enemy.lastHitTime = now;
    this.damageEnemy(enemy, 1);
  }

  damageEnemy(enemy, amount) {
    if (!enemy.active) return;
    enemy.hp -= amount;
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(80, () => {
      if (enemy.active) enemy.clearTint();
    });
    if (enemy.hp <= 0) {
      this.killEnemy(enemy);
    }
  }

  killEnemy(enemy) {
    const { x, y } = enemy;
    this.spawnDeathParticles(x, y, ENEMY_TIERS[enemy.tier].color);
    enemy.destroy();
    this.killCount += 1;
    this.scoreText.setText(`kills  ${this.killCount}`);

    if (this.killCount % 10 === 0) {
      this.spawnHealPickup(x, y);
    }

    if (this.weaponType === 'orb') {
      const targetOrbCount = 1 + Math.floor(this.killCount / 50);
      if (targetOrbCount > this.orbGroup.getLength()) {
        this.addOrb();
      }
    }
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

  updateUltimateCharge(delta) {
    if (this.ultimateReady || this.ultimateActive) return;
    this.ultimateTimer += delta;
    if (this.ultimateTimer >= this.ultimateCooldown) {
      this.ultimateReady = true;
      this.ultimateText.setText('ultimate ready  (right click)');
      this.ultimateText.setColor('#ffffff');
    } else {
      const pct = Math.floor((this.ultimateTimer / this.ultimateCooldown) * 100);
      this.ultimateText.setText(`ultimate charging  ${pct}%`);
    }
  }

  triggerUltimate() {
    this.ultimateReady = false;
    this.ultimateActive = true;
    this.ultimateTimer = 0;
    this.ultimateText.setColor('#4c5580');

    const hitSet = new Set();
    const maxRadius = Math.max(GAME_WIDTH, GAME_HEIGHT);
    const bandWidth = 24;
    const graphic = this.add.graphics();
    const tweenObj = { radius: 0 };

    this.tweens.add({
      targets: tweenObj,
      radius: maxRadius,
      duration: 3000,
      ease: 'Cubic.Out',
      onUpdate: () => {
        graphic.clear();
        const alpha = 1 - (tweenObj.radius / maxRadius) * 0.6;
        graphic.lineStyle(6, COLORS.ultimate, alpha);
        graphic.strokeCircle(this.player.x, this.player.y, tweenObj.radius);

        // Snapshot first — see fireLaser() for why iterating the live
        // group array while damageEnemy() destroys entries causes skips.
        this.enemies.getChildren().slice().forEach((enemy) => {
          if (!enemy.active || hitSet.has(enemy)) return;
          const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
          if (Math.abs(dist - tweenObj.radius) <= bandWidth) {
            hitSet.add(enemy);
            this.damageEnemy(enemy, 1);
          }
        });
      },
      onComplete: () => {
        graphic.destroy();
        this.ultimateActive = false;
      }
    });
  }

  endGame() {
    this.gameOver = true;
    this.spawnTimer.remove();
    if (this.batteryTimer) this.batteryTimer.remove();
    if (this.turretSpawnTimer) this.turretSpawnTimer.remove();
    this.physics.pause();
    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', { score: this.killCount, time: this.elapsed });
    });
  }
}
