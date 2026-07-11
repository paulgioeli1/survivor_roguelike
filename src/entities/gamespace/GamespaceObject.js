import Phaser from 'phaser';

// Base class for everything that lives in the arena besides the player and
// enemies: obstacles, pools, superchargers, chests, teleporters, the market.
//
// Two flavors, chosen by config.blocks:
//   blocks: true  -> a solid static wall (the scene sets up a collider so the
//                    player physically can't pass).
//   blocks: false -> a trigger the player can stand in; onPlayerOverlap(player)
//                    runs each frame of contact (pools, chargers, teleporters).
//
// Subclasses override onPlayerOverlap (and add their own state) — adding a new
// gamespace feature is a new file + one registry line, no scene edits.
export class GamespaceObject extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, config) {
    const isStatic = !!config.blocks;
    super(scene, x, y, config.texture);
    scene.add.existing(this);
    scene.physics.add.existing(this, isStatic);
    this.blocks = isStatic;
    if (!isStatic) {
      this.body.setAllowGravity(false);
      this.body.setImmovable(true);
    }
  }

  // Runs every frame the player overlaps a non-blocking object. No-op default.
  onPlayerOverlap(player) {}
}
