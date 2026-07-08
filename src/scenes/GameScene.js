class GameScene extends Phaser.Scene {
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

    this.enemies = this.physics.add.group();
    this.pickups = this.physics.add.group();

    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.physics.add.overlap(this.orbGroup, this.enemies, this.handleOrbHit, null, this);
    this.physics.add.overlap(this.bullets, this.enemies, this.handleBulletHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);
    this.physics.add.overlap(this.player, this.pickups, this.handlePickupCollected, null, this);

    this.input.on('pointerdown', () => {
      if (this.ultimateReady && !this.ultimateActive) this.triggerUltimate();
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    this.batteryTimer = this.time.addEvent({
      delay: 20000,
      loop: true,
      callback: () => this.spawnBatteryCell()
    });

    this.initWeapon();
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.elapsed += delta / 1000;
    this.updateTimerText();

    this.handleMovement();
    this.updateWeapon(delta);
    this.updateEnemies();
    this.updateUltimateCharge(delta);
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
    this.weaponTimer = 0;
    if (this.weaponType === 'orb') {
      this.addOrb();
    }
  }

  updateWeapon(delta) {
    if (this.weaponType === 'orb') {
      this.updateOrbs(delta);
    } else if (this.weaponType === 'bomb') {
      this.updateBomb(delta);
    } else if (this.weaponType === 'gun') {
      this.updateGun(delta);
    } else if (this.weaponType === 'laser') {
      this.updateLaser(delta);
    } else if (this.weaponType === 'sword') {
      this.updateSword(delta);
    }
  }

  aimAngle() {
    const pointer = this.input.activePointer;
    return Phaser.Math.Angle.Between(this.player.x, this.player.y, pointer.x, pointer.y);
  }

  updateBomb(delta) {
    const dropInterval = 1000;
    this.weaponTimer += delta;
    if (this.weaponTimer >= dropInterval) {
      this.weaponTimer -= dropInterval;
      this.dropBombs();
    }
  }

  dropBombs() {
    const minutes = Math.floor(this.elapsed / 60);
    const bombCount = Math.min(12, 1 + minutes);
    for (let i = 0; i < bombCount; i++) {
      this.spawnBomb();
    }
  }

  spawnBomb() {
    const bomb = this.bullets.create(this.player.x, this.player.y, 'bomb-tex');
    bomb.body.setCircle(6, bomb.width / 2 - 6, bomb.height / 2 - 6);
    bomb.body.setAllowGravity(false);
    bomb.body.setVelocity(0, 0);
    this.time.delayedCall(2200, () => {
      if (bomb.active) bomb.destroy();
    });
  }

  updateGun(delta) {
    const fireInterval = 1000;
    this.weaponTimer += delta;
    if (this.weaponTimer >= fireInterval) {
      this.weaponTimer -= fireInterval;
      this.fireGun();
    }
  }

  fireGun() {
    const baseAngle = this.aimAngle();
    const minutes = Math.floor(this.elapsed / 60);
    const bulletCount = Math.min(12, 1 + minutes);
    const spreadStep = Phaser.Math.DegToRad(5);
    for (let i = 0; i < bulletCount; i++) {
      const offset = (i - (bulletCount - 1) / 2) * spreadStep;
      this.spawnBullet(baseAngle + offset);
    }
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

  updateLaser(delta) {
    const minutes = Math.floor(this.elapsed / 60);
    const interval = 1000 * Math.pow(0.95, minutes);
    this.weaponTimer += delta;
    if (this.weaponTimer >= interval) {
      this.weaponTimer -= interval;
      this.fireLaser();
    }
  }

  fireLaser() {
    const angle = this.aimAngle();
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);
    const maxLen = Math.hypot(GAME_WIDTH, GAME_HEIGHT);
    const hitWidth = 10;

    this.enemies.getChildren().forEach((enemy) => {
      const px = enemy.x - this.player.x;
      const py = enemy.y - this.player.y;
      const t = px * dirX + py * dirY;
      if (t < 0) return;
      const closestX = this.player.x + dirX * t;
      const closestY = this.player.y + dirY * t;
      const dist = Phaser.Math.Distance.Between(enemy.x, enemy.y, closestX, closestY);
      if (dist <= hitWidth) {
        this.damageEnemy(enemy, 1);
      }
    });

    const g = this.add.graphics();
    g.setPosition(this.player.x, this.player.y);
    g.lineStyle(4, COLORS.laser, 0.9);
    g.lineBetween(0, 0, dirX * maxLen, dirY * maxLen);
    this.tweens.add({
      targets: g,
      alpha: 0,
      duration: 150,
      onUpdate: () => g.setPosition(this.player.x, this.player.y),
      onComplete: () => g.destroy()
    });
  }

  updateSword(delta) {
    const swingInterval = 1000;
    this.weaponTimer += delta;
    if (this.weaponTimer >= swingInterval) {
      this.weaponTimer -= swingInterval;
      this.swingSword();
    }
  }

  swingSword() {
    const aim = this.aimAngle();
    const halfArc = Phaser.Math.DegToRad(30);
    const range = 90;

    this.enemies.getChildren().forEach((enemy) => {
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
    const minuteIndex = Math.floor(this.elapsed / 60);
    const redCount = Math.max(0, 60 - minuteIndex);
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
    if (this.ultimateReady || this.ultimateActive) return;
    const chargeAmount = this.ultimateCooldown * 0.1;
    this.ultimateTimer = Math.min(this.ultimateTimer + chargeAmount, this.ultimateCooldown);
    if (this.ultimateTimer >= this.ultimateCooldown) {
      this.ultimateReady = true;
      this.ultimateText.setText('ultimate ready  (left click)');
      this.ultimateText.setColor('#ffffff');
    } else {
      const pct = Math.floor((this.ultimateTimer / this.ultimateCooldown) * 100);
      this.ultimateText.setText(`ultimate charging  ${pct}%`);
    }
  }

  updateEnemies() {
    this.enemies.getChildren().forEach((enemy) => {
      this.physics.moveToObject(enemy, this.player, enemy.speed);
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
      this.ultimateText.setText('ultimate ready  (left click)');
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

        this.enemies.getChildren().forEach((enemy) => {
          if (hitSet.has(enemy)) return;
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
    this.batteryTimer.remove();
    this.physics.pause();
    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', { score: this.killCount, time: this.elapsed });
    });
  }
}
