import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { spawnEnemyByName } from '../entities/enemies/index.js';

// Owns enemy spawning: the 1s spawn loop + difficulty curve, the ranged
// turret spawner that kicks in after 30s, and the splitter spawner every 15s.
// Reads the enemy registry, so adding an enemy type never touches this file.
export class SpawnSystem {
  constructor(scene) {
    this.scene = scene;

    this.spawnTimer = scene.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.spawnEnemy()
    });

    // Ranged turret enemies start showing up after the first 30s, then every
    // 10s after that.
    scene.time.delayedCall(30000, () => {
      if (scene.gameOver) return;
      this.spawnTurretEnemy();
      this.turretSpawnTimer = scene.time.addEvent({
        delay: 10000,
        loop: true,
        callback: () => this.spawnTurretEnemy()
      });
    });

    this.splitterSpawnTimer = scene.time.addEvent({
      delay: 15000,
      loop: true,
      callback: () => this.spawnSplitter()
    });
  }

  spawnEnemy() {
    const scene = this.scene;
    // Difficulty curve: red share shrinks over time (every 15s), shifting the
    // mix toward green then blue. Unchanged from the original tuning.
    const tierStepIndex = Math.floor(scene.elapsed / 15);
    const redCount = Math.max(0, 60 - tierStepIndex);
    const nonRed = 60 - redCount;
    const greenCount = nonRed / 2;

    const roll = Phaser.Math.Between(1, 60);
    let tierName;
    if (roll <= redCount) tierName = 'red';
    else if (roll <= redCount + greenCount) tierName = 'green';
    else tierName = 'blue';

    const pos = scene.getSpawnPosition();
    spawnEnemyByName(scene, tierName, pos.x, pos.y);
  }

  spawnTurretEnemy() {
    const scene = this.scene;
    if (scene.gameOver) return;
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

    // Bias travel away from the spawn wall and clamp the landing point so a
    // long roll can't carry it through the opposite wall.
    const angle = inwardAngle + Phaser.Math.FloatBetween(-Phaser.Math.DegToRad(70), Phaser.Math.DegToRad(70));
    const travelDist = Phaser.Math.Between(150, 500);
    const targetX = Phaser.Math.Clamp(x + Math.cos(angle) * travelDist, margin, GAME_WIDTH - margin);
    const targetY = Phaser.Math.Clamp(y + Math.sin(angle) * travelDist, margin, GAME_HEIGHT - margin);

    const enemy = spawnEnemyByName(scene, 'turret', x, y);
    enemy.setTravelTarget(targetX, targetY);
  }

  spawnSplitter() {
    const scene = this.scene;
    if (scene.gameOver) return;
    const pos = scene.getSpawnPosition();
    spawnEnemyByName(scene, 'splitter', pos.x, pos.y);
  }

  stop() {
    this.spawnTimer.remove();
    if (this.turretSpawnTimer) this.turretSpawnTimer.remove();
    this.splitterSpawnTimer.remove();
  }
}
