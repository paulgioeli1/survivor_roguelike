import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { COLORS } from '../config/colors.js';
import { Ability } from './Ability.js';

// Orbiting shields that block/damage enemies. Ultimate is a charge-gated
// expanding shockwave (the only ability charged by time + battery pickups).
export class OrbAbility extends Ability {
  constructor(scene) {
    super(scene);
    this.stats = { orbRadius: 66, ultimateCooldown: 30000, hitThrottle: 350 };
    this.orbAngle = 0;
    this.ultimateTimer = 0;
    this.ultimateReady = false;
    this.ultimateActive = false;
  }

  init() {
    this.orbGroup = this.scene.physics.add.group();
    this.scene.physics.add.overlap(this.orbGroup, this.scene.enemies, this.handleOrbHit, null, this);
    this.addOrb();
  }

  addOrb() {
    const scene = this.scene;
    const orb = scene.physics.add.sprite(scene.player.x, scene.player.y, 'orb-tex');
    orb.body.setCircle(5, 5, 5);
    orb.body.setAllowGravity(false);
    this.orbGroup.add(orb);
  }

  update(delta) {
    // Rotate the orbs around the player (runs even during the ultimate).
    this.orbAngle += Phaser.Math.DegToRad(90) * (delta / 1000);
    const orbs = this.orbGroup.getChildren();
    const n = orbs.length;
    const radius = this.getStat('orbRadius');
    const player = this.scene.player;
    orbs.forEach((orb, i) => {
      const angle = this.orbAngle + i * (Math.PI * 2 / n);
      orb.body.reset(player.x + Math.cos(angle) * radius, player.y + Math.sin(angle) * radius);
    });

    // Charge the ultimate over time.
    if (this.ultimateReady || this.ultimateActive) return;
    this.ultimateTimer += delta;
    if (this.ultimateTimer >= this.getStat('ultimateCooldown')) {
      this.ultimateReady = true;
    }
  }

  handleOrbHit(orb, enemy) {
    const now = this.scene.time.now;
    if (now - (enemy.lastHitTime || 0) < this.getStat('hitThrottle')) return;
    enemy.lastHitTime = now;
    enemy.takeDamage(1);
  }

  onRightClick() {
    if (this.ultimateReady && !this.ultimateActive) this.triggerUltimate();
  }

  onKill(killCount) {
    const targetOrbCount = 1 + Math.floor(killCount / 50);
    if (targetOrbCount > this.orbGroup.getLength()) this.addOrb();
  }

  onBatteryPickup() {
    if (this.ultimateReady || this.ultimateActive) return;
    const cooldown = this.getStat('ultimateCooldown');
    this.ultimateTimer = Math.min(this.ultimateTimer + cooldown * 0.1, cooldown);
    if (this.ultimateTimer >= cooldown) this.ultimateReady = true;
  }

  triggerUltimate() {
    const scene = this.scene;
    this.ultimateReady = false;
    this.ultimateActive = true;
    this.ultimateTimer = 0;

    const hitSet = new Set();
    const maxRadius = Math.max(GAME_WIDTH, GAME_HEIGHT);
    const bandWidth = 24;
    const graphic = scene.add.graphics();
    const tweenObj = { radius: 0 };

    scene.tweens.add({
      targets: tweenObj,
      radius: maxRadius,
      duration: 3000,
      ease: 'Cubic.Out',
      onUpdate: () => {
        graphic.clear();
        const alpha = 1 - (tweenObj.radius / maxRadius) * 0.6;
        graphic.lineStyle(6, COLORS.ultimate, alpha);
        graphic.strokeCircle(scene.player.x, scene.player.y, tweenObj.radius);

        // Snapshot first — iterating the live group while takeDamage() destroys
        // entries would skip enemies.
        scene.enemies.getChildren().slice().forEach((enemy) => {
          if (!enemy.active || hitSet.has(enemy)) return;
          const dist = Phaser.Math.Distance.Between(scene.player.x, scene.player.y, enemy.x, enemy.y);
          if (Math.abs(dist - tweenObj.radius) <= bandWidth) {
            hitSet.add(enemy);
            enemy.takeDamage(1);
          }
        });
      },
      onComplete: () => {
        graphic.destroy();
        this.ultimateActive = false;
      }
    });
  }

  refill() {
    if (!this.ultimateActive) this.ultimateReady = true;
  }

  debugState() {
    const ult = this.ultimateReady
      ? 'READY'
      : `${Math.floor((this.ultimateTimer / this.getStat('ultimateCooldown')) * 100)}%`;
    return `orbs=${this.orbGroup.getLength()} ult=${ult}`;
  }

  hudText() {
    // Charging → grey %, ready → white prompt, active → prompt stays (grey)
    // through the 3s animation, matching the original readout.
    if (this.ultimateActive) return { text: 'ultimate ready  (right click)', color: '#4c5580' };
    if (this.ultimateReady) return { text: 'ultimate ready  (right click)', color: '#ffffff' };
    const pct = Math.floor((this.ultimateTimer / this.getStat('ultimateCooldown')) * 100);
    return { text: `ultimate charging  ${pct}%`, color: '#4c5580' };
  }
}
