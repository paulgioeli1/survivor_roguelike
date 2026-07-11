// The enemy registry: the one place that knows what enemy types exist. The
// spawner reads this instead of a switch/if-else. To add an enemy: create its
// class file, then add one line here (class + stats). Numeric tuning stays in
// config/balance.js (ENEMY_TIERS); this file just binds a class to each tier.
import { ENEMY_TIERS } from '../../config/balance.js';
import { RedEnemy } from './RedEnemy.js';
import { GreenEnemy } from './GreenEnemy.js';
import { BlueEnemy } from './BlueEnemy.js';
import { TurretEnemy } from './TurretEnemy.js';
import { WallEnemy } from './WallEnemy.js';

export const ENEMY_REGISTRY = {
  red: { class: RedEnemy, ...ENEMY_TIERS.red },
  green: { class: GreenEnemy, ...ENEMY_TIERS.green },
  blue: { class: BlueEnemy, ...ENEMY_TIERS.blue },
  turret: { class: TurretEnemy, ...ENEMY_TIERS.turret },
  wall: { class: WallEnemy, ...ENEMY_TIERS.wall }
};

function createEnemy(scene, def, name, x, y) {
  const enemy = new def.class(scene, x, y, { tier: name, ...def });
  scene.enemies.add(enemy);
  // Stationary blockers (config.blocksPlayer) also join the collider group
  // GameScene uses to physically stop the player — see Enemy.blocksPlayer.
  if (enemy.blocksPlayer) scene.enemyBlockers.add(enemy);
  return enemy;
}

// Draws a pulsing outline (matching the enemy's real shape/color) at (x,y),
// then creates the real enemy there once def.telegraphMs elapses. Any
// registry entry can opt into this by setting telegraphMs — nothing here is
// specific to one enemy type.
function spawnWithTelegraph(scene, def, name, x, y) {
  const frame = scene.textures.get(def.texture).source[0];
  const w = frame.width;
  const h = frame.height;

  const g = scene.add.graphics();
  g.lineStyle(3, def.color, 1);
  g.strokeRect(x - w / 2, y - h / 2, w, h);
  const pulse = scene.tweens.add({ targets: g, alpha: 0.15, duration: 180, yoyo: true, repeat: -1 });

  scene.time.delayedCall(def.telegraphMs, () => {
    pulse.stop();
    g.destroy();
    if (scene.gameOver) return; // don't spawn into a finished run
    createEnemy(scene, def, name, x, y);
  });
}

// Helper the spawner uses: builds an enemy of `name` at (x,y), wired into the
// scene's enemies group (and enemyBlockers if it's a stationary blocker). If
// the registry entry sets telegraphMs, a brief warning animation plays first
// and this returns null (the real enemy doesn't exist synchronously yet).
export function spawnEnemyByName(scene, name, x, y) {
  const def = ENEMY_REGISTRY[name];
  if (def.telegraphMs) {
    spawnWithTelegraph(scene, def, name, x, y);
    return null;
  }
  return createEnemy(scene, def, name, x, y);
}
