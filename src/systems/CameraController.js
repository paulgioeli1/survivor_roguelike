// Wraps the main camera so screen juice lives in one tunable place. Today it
// only replicates the existing shake-on-hit. It's built ready for opening the
// world beyond the viewport: switching to a player-follow is a one-liner here
// (this.camera.startFollow(target)) once WORLD_WIDTH/HEIGHT exceed the screen.
export class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  shakeOnHit() {
    this.camera.shake(120, 0.006);
  }
}
