// The enemy registry: the one place that knows what enemy types exist. The
// spawner reads this instead of a switch/if-else. To add an enemy: create its
// class file, then add one line here (class + stats). Numeric tuning stays in
// config/balance.js (ENEMY_TIERS); this file just binds a class to each tier.
import { ENEMY_TIERS } from '../../config/balance.js';
import { RedEnemy } from './RedEnemy.js';
import { GreenEnemy } from './GreenEnemy.js';
import { BlueEnemy } from './BlueEnemy.js';
import { TurretEnemy } from './TurretEnemy.js';

export const ENEMY_REGISTRY = {
  red: { class: RedEnemy, ...ENEMY_TIERS.red },
  green: { class: GreenEnemy, ...ENEMY_TIERS.green },
  blue: { class: BlueEnemy, ...ENEMY_TIERS.blue },
  turret: { class: TurretEnemy, ...ENEMY_TIERS.turret }
};

// Helper the spawner uses: builds an enemy of `name` at (x,y), wired into the
// scene's enemies group. Passes a config carrying the tier key + stats.
export function spawnEnemyByName(scene, name, x, y) {
  const def = ENEMY_REGISTRY[name];
  const enemy = new def.class(scene, x, y, { tier: name, ...def });
  scene.enemies.add(enemy);
  return enemy;
}
