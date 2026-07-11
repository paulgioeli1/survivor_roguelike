# Phase 1 — Open the world (survivor-like camera + spawning)

**How to run this:** Read this file and the current code, then build it following
the conventions in `CLAUDE.md` (class+registry, thin `GameScene`, no if/else
dispatch). Verify each numbered item in the browser preview before moving on,
and commit per logical group. Model: Sonnet is fine — this is scoped execution,
the design is already decided below.

## Goal & decisions (already made — don't relitigate)

Transform the fixed 1800×1200 arena into an open-world survivor-like:
**enormous fixed world · camera center-locked with slight lerp · enemies spawn
in an off-screen ring around the player · HUD pinned to the camera · culling is
a perf-only backstop (never a gameplay mechanic) · soft, visible world edge.**

- The world is a *stage with memory*: fixed bounds (persistence is free later),
  not infinite/streamed. No terrain persistence needed.
- **View size stays 1800×1200** (`GAME_WIDTH/HEIGHT` = what the camera shows /
  canvas resolution — leave the scale config alone). **World becomes huge**
  (`WORLD_WIDTH/HEIGHT`). Keep these two concepts distinct throughout.

## Work items

### 1. World constants
`config/constants.js`: set `WORLD_WIDTH`/`WORLD_HEIGHT` to a large tunable value —
start at **40000 × 40000**. Leave `GAME_WIDTH/HEIGHT` at 1800×1200 (view/canvas).
Add a `VIEW_RADIUS` helper if useful: `Math.hypot(GAME_WIDTH, GAME_HEIGHT) / 2`
(≈1082) — the off-screen threshold used by ring spawns.

### 2. World + camera bounds, player start
`GameScene.create`:
- `this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)` (was GAME_*).
- Player starts at world center: `new Player(this, WORLD_WIDTH/2, WORLD_HEIGHT/2)`.
- `this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT)`.
- Reposition the demo obstacle relative to world center (or delete it — it's
  currently at `GAME_WIDTH/2 + 320`, which is now a far corner). Put it near
  the player start so it's still a visible pattern demo, or remove it.

### 3. Camera follow (CameraController)
Add to `systems/CameraController.js`:
```js
follow(target) {
  this.camera.startFollow(target, true, 0.1, 0.1); // roundPx, lerpX, lerpY
  // Optional tiny deadzone to kill micro-jitter — keep it SMALL:
  // this.camera.setDeadzone(40, 40);
}
```
Call `this.camera.follow(this.player)` in `GameScene.create` after the player
exists. Keep `shakeOnHit()`.

### 4. Grid that scrolls with the world (TileSprite trick)
The current `drawNeonGrid` draws lines across GAME_WIDTH/HEIGHT once — it won't
cover a moving 40k world. Replace with a **camera-locked TileSprite**:
- In `BootScene`, generate a `grid-tile-tex` (e.g. 40×40, one L-shaped set of
  grid lines) so it tiles seamlessly.
- In `GameScene.create`, add a TileSprite sized to the **view** (GAME_WIDTH ×
  GAME_HEIGHT) at screen center, `setScrollFactor(0)`, sent to back.
- Each frame (in `update`), set `grid.tilePositionX = this.cameras.main.scrollX`
  and `tilePositionY = scrollY` so the pattern scrolls opposite the camera and
  reads as a continuous world-fixed grid. Cheap at any world size.
- Keep `drawNeonGrid` for the MainMenu/GameOver scenes (unchanged there), or
  give those a static version — they don't scroll.

### 5. Enemy ring spawning (the core gameplay change)
Replace `GameScene.getSpawnPosition()` (currently random world coords ≥140px
from player) with a **ring spawn just outside the view**:
```js
getSpawnPosition() {
  const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
  const dist = Phaser.Math.Between(VIEW_RADIUS + 80, VIEW_RADIUS + 380); // just off-screen
  const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * dist, 40, WORLD_WIDTH - 40);
  const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * dist, 40, WORLD_HEIGHT - 40);
  return { x, y };
}
```
- All enemy spawners (regular, splitter, wall) already call `getSpawnPosition()`
  → they get ring spawns automatically.
- **Rework `SpawnSystem.spawnTurretEnemy`**: its edge-of-arena logic is obsolete
  (world edge is 20k px away). Ring-spawn it like the others, then set its
  travel target to a point *within the view* near the player (e.g. player ±
  Between(200, 700) on each axis) so it stations on-screen and shoots.
- **Pickups spawn IN view, not in the ring.** Heal drops already spawn at the
  enemy's death location (in view) — fine. But `spawnBatteryCell` uses
  `getSpawnPosition()` → it'd spawn off-screen and be unfindable. Give pickups a
  separate `getPickupPosition()` that returns a point *within* the view
  (player + random within ~VIEW_RADIUS*0.7, clamped to world). Use it for
  batteries.

### 6. Pin the HUD to the camera
Every screen-space UI element must get `.setScrollFactor(0)` or it scrolls away:
- `systems/Hud.js`: `timerText`, `scoreText`, the weapon label, every HP pip,
  `resourceText`. (Their GAME_* positions are then correct as screen coords.)
- `abilities/LaserAbility.js`: the two energy-bar rectangles created in `init()`.
- Leave world-space visuals alone (particles, laser beam, orb ultimate ring,
  telegraph blocks, enemies, the DOM debug overlay).

### 7. Culling — PERF BACKSTOP ONLY (never gameplay)
Two mechanisms, neither of which may ever remove a nearby/chasing enemy:
- **Hard active cap:** `MAX_ACTIVE_ENEMIES` (start ~400) in balance.js. In
  `SpawnSystem`, skip spawning when `scene.enemies.getLength() >= cap` (pause,
  don't despawn). This is what protects framerate.
- **Stale cull:** each enemy tracks the last time it was near the player
  (update a `lastNearMs` when within ~`VIEW_RADIUS*1.5`). A periodic sweep
  (every ~5s) destroys enemies where `now - lastNearMs > 120000` (2 min) AND
  currently far. Use a raw `enemy.destroy()` — NOT `die()` (no particles, no
  kill count, no loot). These are abandoned, off-screen forever; removing them
  is invisible to the player.
- The reason "run away" doesn't trivialize the game is the **ring spawn** (you
  run into fresh enemies ahead), not culling. Do not cull to create difficulty.

### 8. Soft, visible world edge
- Player already `setCollideWorldBounds(true)` → stops at the edge.
- Draw a visible border so it's never a surprise: a neon `strokeRect(0, 0,
  WORLD_WIDTH, WORLD_HEIGHT)` Graphics in world space (thick, glowing). Only
  visible when the player is near it.
- Camera bounds (item 2) already stop the camera at the edge, so the player
  slides off-center as they approach — a natural "you're at the edge" signal.
- (Optional/polish) the easter-egg reward for reaching a corner — leave a TODO;
  not required for Phase 1.

### 9. Coordinate sweep
Audit `GAME_WIDTH`/`GAME_HEIGHT` usages and split by meaning:
- **"World" meaning → change to `WORLD_*`:** physics/camera bounds (done above),
  `SplitterEnemy` split-clamp, turret target clamps, ring-spawn clamps.
- **"View/screen" meaning → keep `GAME_*`:** HUD layout, orb-ultimate
  `maxRadius`, laser `maxLen` (both are "big enough to cross the screen" — view
  is correct), MainMenu/GameOver layout (separate scenes, unchanged).

## Verification (do all in the preview, zero console errors)
- Camera follows the player; player stays ~centered with a slight smoothing lag.
- Enemies appear from **all sides, off-screen**, and walk in. Kite in a straight
  line and confirm you **cannot outrun the horde** (fresh enemies spawn ahead).
- HUD (timer/score/HP pips/weapon label/ability text/laser bar) stays fixed on
  screen while the world scrolls underneath.
- Battery pickups (orb weapon) appear on-screen and are collectable.
- Turrets ring-spawn and station within view, then fire.
- Walk to a world edge: player stops at a visible border, no void beyond, not a
  surprise trap.
- Spam-spawn enemies via the debug menu and confirm the cap holds framerate;
  confirm stale far-away enemies eventually vanish but nearby chasers never do.

## Explicitly NOT in Phase 1
Structures/pools/persistence (that's Phase 2), loot/currency, minimap, the
easter-egg reward payload.
