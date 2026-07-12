import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/constants.js';
import { spawnEnemyByName } from '../entities/enemies/index.js';

// Owns enemy spawning: the 1s spawn loop + difficulty curve, the ranged
// turret spawner that kicks in after 30s, the splitter spawner every 15s, and
// the wall spawner every 20s. Reads the enemy registry, so adding an enemy
// type never touches this file.
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

    this.wallSpawnTimer = scene.time.addEvent({
      delay: 20000,
      loop: true,
      callback: () => this.spawnWall()
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
    // Ring-spawn like everything else (off-screen), then travel to a station
    // point within the player's view so it stops and fires on-screen.
    const pos = scene.getSpawnPosition();
    const enemy = spawnEnemyByName(scene, 'turret', pos.x, pos.y);
    const targetX = Phaser.Math.Clamp(scene.player.x + Phaser.Math.RND.sign() * Phaser.Math.Between(200, 700), 40, WORLD_WIDTH - 40);
    const targetY = Phaser.Math.Clamp(scene.player.y + Phaser.Math.RND.sign() * Phaser.Math.Between(150, 500), 40, WORLD_HEIGHT - 40);
    enemy.setTravelTarget(targetX, targetY);
  }

  spawnSplitter() {
    const scene = this.scene;
    if (scene.gameOver) return;
    const pos = scene.getSpawnPosition();
    spawnEnemyByName(scene, 'splitter', pos.x, pos.y);
  }

  spawnWall() {
    const scene = this.scene;
    if (scene.gameOver) return;
    const pos = scene.getSpawnPosition();
    spawnEnemyByName(scene, 'wall', pos.x, pos.y); // telegraphed — see spawnWithTelegraph()
  }

  stop() {
    this.spawnTimer.remove();
    if (this.turretSpawnTimer) this.turretSpawnTimer.remove();
    this.splitterSpawnTimer.remove();
    this.wallSpawnTimer.remove();
  }
}
