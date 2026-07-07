class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  create() {
    this.killCount = 0;
    this.hp = 5;
    this.elapsed = 0;
    this.invulnerable = false;
    this.gameOver = false;

    this.ultimateCooldown = 30000;
    this.ultimateTimer = 0;
    this.ultimateReady = false;
    this.ultimateActive = false;

    this.orbRadius = 60;
    this.orbAngle = 0;

    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT);

    drawNeonGrid(this, 0.5);
    this.createTextures();
    this.createHud();

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player-tex');
    this.player.setCollideWorldBounds(true);
    this.player.body.setCircle(14, this.player.width / 2 - 14, this.player.height / 2 - 14);

    this.orbGroup = this.physics.add.group();
    this.addOrb();

    this.enemies = this.physics.add.group();

    this.keys = this.input.keyboard.addKeys('W,A,S,D');

    this.physics.add.overlap(this.orbGroup, this.enemies, this.handleOrbHit, null, this);
    this.physics.add.overlap(this.player, this.enemies, this.handlePlayerHit, null, this);

    this.input.on('pointerdown', () => {
      if (this.ultimateReady && !this.ultimateActive) this.triggerUltimate();
    });

    this.spawnTimer = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });
  }

  update(time, delta) {
    if (this.gameOver) return;

    this.elapsed += delta / 1000;
    this.updateTimerText();

    this.handleMovement();
    this.updateOrbs(delta);
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

    this.hpPips = [];
    for (let i = 0; i < 5; i++) {
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
    this.spawnDeathParticles(enemy.x, enemy.y, ENEMY_TIERS[enemy.tier].color);
    enemy.destroy();
    this.killCount += 1;
    this.scoreText.setText(`kills  ${this.killCount}`);

    const targetOrbCount = 1 + Math.floor(this.killCount / 50);
    if (targetOrbCount > this.orbGroup.getLength()) {
      this.addOrb();
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
    this.physics.pause();
    this.time.delayedCall(400, () => {
      this.scene.start('GameOver', { score: this.killCount, time: this.elapsed });
    });
  }
}
