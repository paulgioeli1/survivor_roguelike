// Wraps the main camera so screen juice lives in one tunable place.
export class CameraController {
  constructor(scene) {
    this.scene = scene;
    this.camera = scene.cameras.main;
  }

  // Center-lock on the player with a slight lerp so motion smooths rather than
  // rigidly gluing. Symmetric framing keeps threats from every direction
  // equally visible — the right choice for an all-sides survivor-like.
  follow(target) {
    this.camera.startFollow(target, true, 0.1, 0.1); // roundPx, lerpX, lerpY
  }

  shakeOnHit() {
    this.camera.shake(120, 0.006);
  }
}
