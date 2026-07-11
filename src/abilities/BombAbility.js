import { COLORS } from '../config/colors.js';
import { Ability } from './Ability.js';

// Drop bombs (max 3, regen over time) that explode on enemy contact. Ultimate
// detonates all placed bombs at once.
export class BombAbility extends Ability {
  constructor(scene) {
    super(scene);
    this.stats = { inventoryMax: 3, regenInterval: 3000, blastRadius: 40 };
    this.inventory = this.getStat('inventoryMax');
    this.regenTimer = 0;
  }

  init() {
    this.bombs = this.scene.physics.add.group();
    this.scene.physics.add.overlap(this.bombs, this.scene.enemies, this.handleBombEnemyContact, null, this);
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
    const scene = this.scene;
    const bomb = this.bombs.create(scene.player.x, scene.player.y, 'bomb-tex');
    bomb.body.setCircle(6, bomb.width / 2 - 6, bomb.height / 2 - 6);
    bomb.body.setAllowGravity(false);
    bomb.body.setImmovable(true);
  }

  onRightClick() {
    // Snapshot first — exploding one bomb destroys it and shifts the live
    // group array, which would skip the next bomb.
    this.bombs.getChildren().slice().forEach((bomb) => this.explodeBomb(bomb));
  }

  handleBombEnemyContact(bomb, enemy) {
    this.explodeBomb(bomb);
  }

  explodeBomb(bomb) {
    if (!bomb.active) return;
    const { x, y } = bomb;
    const radius = this.getStat('blastRadius');
    bomb.destroy();
    this.scene.damageEnemiesInRadius(x, y, radius, 1);
    this.spawnExplosionEffect(x, y, radius);
  }

  spawnExplosionEffect(x, y, radius) {
    const scene = this.scene;
    const emitter = scene.add.particles(0, 0, 'particle-tex', {
      tint: COLORS.bomb,
      speed: { min: 80, max: 220 },
      lifespan: 400,
      scale: { start: 2, end: 0 },
      blendMode: 'ADD',
      emitting: false
    });
    emitter.explode(20, x, y);
    scene.time.delayedCall(450, () => emitter.destroy());

    const g = scene.add.graphics();
    g.lineStyle(4, COLORS.bomb, 0.9);
    g.strokeCircle(x, y, radius);
    scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: 300,
      onComplete: () => g.destroy()
    });
  }

  refill() {
    this.inventory = this.getStat('inventoryMax');
  }

  debugState() {
    return `bombs=${this.inventory}/${this.getStat('inventoryMax')} placed=${this.bombs.getLength()}`;
  }

  hudText() {
    return {
      text: `bombs  ${this.inventory}/${this.getStat('inventoryMax')}   |   right click: detonate all`,
      color: this.inventory > 0 ? '#ffb347' : '#4c5580'
    };
  }
}
