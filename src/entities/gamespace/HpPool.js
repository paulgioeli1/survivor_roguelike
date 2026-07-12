import { GamespaceObject } from './GamespaceObject.js';
import { HP_POOL } from '../../config/balance.js';

// A trigger the player can stand in and heal over time. v1 is non-depleting
// (a reusable relax spot) — `state` is still wired up (see StructureSystem)
// so a future depletable structure drops in without rework.
export class HpPool extends GamespaceObject {
  constructor(scene, x, y, config) {
    super(scene, x, y, config);
    this.body.setCircle(this.width / 2);
    this.lastHealMs = 0;
    this.state = {};
  }

  onPlayerOverlap(player) {
    const now = this.scene.time.now;
    if (now - this.lastHealMs < HP_POOL.healInterval) return;
    this.lastHealMs = now;
    if (player.heal()) this.scene.hud.setHp(player.stats.hp);
  }
}
