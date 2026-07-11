import { Enemy } from './Enemy.js';

// A stationary rectangular blocker. Deals no contact damage and isn't
// destroyed by touch — it physically blocks the player (via the
// enemyBlockers collider set up in GameScene) until killed by weapon fire.
// Never moves and has no interaction with other enemies or their
// projectiles (nothing in the codebase collides enemies with each other).
export class WallEnemy extends Enemy {
  update() {} // stationary — no chase behavior

  setupBody() {
    this.body.setSize(this.displayWidth, this.displayHeight);
    this.body.setImmovable(true);
    this.body.setAllowGravity(false);
  }

  onPlayerContact() {} // blocking is handled by the physics collider, not contact damage
}
