// The gamespace registry: the one place that knows what arena objects exist.
// To add one (pool, supercharger, chest, teleporter, market): create its class
// file, then add a line here. blocks:true routes it to the collider group
// (walls); blocks:false routes it to the overlap group (triggers).
import { Obstacle } from './Obstacle.js';

export const GAMESPACE_REGISTRY = {
  obstacle: { class: Obstacle, texture: 'obstacle-tex', blocks: true }
};

export function spawnGamespaceObjectByName(scene, name, x, y) {
  const def = GAMESPACE_REGISTRY[name];
  const obj = new def.class(scene, x, y, def);
  (def.blocks ? scene.gamespaceBlockers : scene.gamespaceObjects).add(obj);
  return obj;
}
