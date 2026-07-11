import { Enemy } from './Enemy.js';
import { SPLITTER } from '../../config/balance.js';

const MAX_STAGE = SPLITTER.stages.length - 1;

// A square that splits into two smaller copies of itself when its current
// stage's hp reaches 0, instead of dying outright: big (3 hits) -> 2x medium
// (2 hits each) -> 4x small (1 hit each) -> gone. Only the final stage's
// destruction is a real kill (score / heal-drop / orb-growth); splitting
// itself is not — it overrides die() entirely rather than onDeath(), since
// the base pipeline (particles + kill count + destroy) doesn't fit a
// transformation instead of a death.
export class SplitterEnemy extends Enemy {
  constructor(scene, x, y, config) {
    super(scene, x, y, config);
    this.stage = config.stage || 0;
  }

  die() {
    this.onDeath(); // visual feedback either way (split or final)
    if (this.stage < MAX_STAGE) {
      this.split();
    } else {
      this.scene.onEnemyKilled(this, this.x, this.y);
    }
    this.destroy();
  }

  split() {
    const nextStage = this.stage + 1;
    const stageConfig = SPLITTER.stages[nextStage];
    const offset = this.displayWidth * 0.35;
    this.spawnChild(nextStage, stageConfig, this.x - offset, this.y);
    this.spawnChild(nextStage, stageConfig, this.x + offset, this.y);
  }

  spawnChild(stage, stageConfig, x, y) {
    const child = new SplitterEnemy(this.scene, x, y, {
      tier: this.tier,
      hp: stageConfig.hp,
      texture: stageConfig.texture,
      speed: this.speed,
      color: this.enemyColor,
      stage
    });
    this.scene.enemies.add(child);
  }
}
