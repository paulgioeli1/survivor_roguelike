# survivor_roguelike — architecture & conventions

A neon-wasteland survivor game built on **Phaser 3.80** + **Vite** (ES modules).
Read this before adding features — it exists to keep the codebase from
collapsing back into one giant scene full of if/else chains.

## Run & verify

- `npm run dev` — Vite dev server on **http://localhost:8420** (hot reload).
- `npm run build` — production build (also the fastest way to catch a broken
  import; a clean build means every module resolved).
- Preview tooling note: the headless preview tab is often **backgrounded**, so
  `requestAnimationFrame` is parked and the game loop won't self-advance. To
  drive the sim from an eval, step it manually:
  `for (const _ of Array(150)) game.loop.step(t += 16)`. Scene boot also needs a
  few manual steps. `document.hidden` being true is expected, not a bug.

## The core pattern: class + registry (learn once, reuse everywhere)

Every content family — enemies, abilities, gamespace objects — uses the **same
two pieces**:

1. **A base class** for shared behavior; each type is a **subclass** that
   overrides only what differs. This answers "what *is* this thing."
2. **A registry** (`index.js`, a plain lookup table) that binds each type name
   to its class + config, plus a `spawn…ByName()` / `create…()` helper. The
   spawner reads the registry instead of a `switch`. This answers "what types
   exist and where do the tuning numbers live."

**To add a type: create one file + add one line to the registry. Never add a
`weaponType === …` / `enemy.kind === …` if/else branch** — that pattern is what
this whole structure replaced. Per-type behavior goes in the subclass.

Numeric tuning lives in `config/balance.js`; the registry binds classes to it.

## Layout

```
src/
  config/      constants.js (dimensions, WORLD_*), colors.js, balance.js (tuning)
  core/        grid.js (neon grid), Stacks.js (stack component)
  scenes/      BootScene (makes textures once + loads assets), MainMenu, Game, GameOver
  entities/
    Player.js
    enemies/   Enemy.js (base) + <Tier>Enemy.js + index.js (ENEMY_REGISTRY)
    gamespace/ GamespaceObject.js (base) + <Thing>.js + index.js (GAMESPACE_REGISTRY)
  abilities/   Ability.js (base) + <Name>Ability.js + index.js (ABILITY_REGISTRY)
  systems/     SpawnSystem, Hud, CameraController
  main.js      Phaser.Game config + scene list
```

`GameScene` is a **thin coordinator**: it builds the world/player/HUD/camera/
spawner, wires shared collisions, and delegates per-frame work. Keep it that way
— combat/behavior specifics belong in the entity/ability/system, not the scene.

## How to add things

**An enemy:** create `entities/enemies/FooEnemy.js` extending `Enemy`; override
`update(delta)` (movement), `onDeath()` (e.g. revive), `setupBody()` (shape/body,
e.g. a rectangular immovable blocker — see `WallEnemy`), or `onPlayerContact()`
(what happens when the player touches it — default is contact damage; a
stationary blocker no-ops here since physical blocking is a separate collider)
only if it differs. Add stats to `ENEMY_TIERS` in `balance.js` and one line to
`ENEMY_REGISTRY`. Two registry config flags: `blocksPlayer: true` also adds the
enemy to `scene.enemyBlockers` (the collider group that physically stops the
player — set `blocksPlayer` rather than wiring a collider yourself); `telegraphMs`
delays the real spawn behind a pulsing warning outline for that many ms (see
`spawnEnemyByName` in `entities/enemies/index.js` — works for any enemy, not
just one type). A telegraphed spawn returns `null` synchronously; guard before
touching the result (see `DebugSystem.spawnEnemy`). The `Enemy` base gives you
`takeDamage()`, `die()`, and a chasing `update()`.

**An ability:** create `abilities/FooAbility.js` extending `Ability`; implement
the hooks it uses (`init`, `update`, `onLeftClick`, `onRightClick`, `onKill`,
`hudText`). Give it a projectile group + collider in `init()` if it needs one.
Add a line to `ABILITY_REGISTRY`. Read tunables via `this.getStat(key)`.

**A gamespace object** (pool, charger, chest, teleporter, market): create
`entities/gamespace/Foo.js` extending `GamespaceObject`; set `blocks:true` in the
registry for a solid wall, or `blocks:false` and override `onPlayerOverlap(player)`
for a trigger. Add a line to `GAMESPACE_REGISTRY`. No `GameScene` edits needed.

## Seams already in place (use them; don't route around them)

- **`getStat(key)`** on `Player` and every `Ability` is the single chokepoint for
  reading a tunable. Future buffs/debuffs (superchargers, stacks, enemy debuffs)
  apply here — never read a raw stat at a call site.
- **Abilities are a loadout** (`player.abilities`, one today). Input/update/kill/
  pickup fan out to all of them. Adding a 2nd ability mid-run = `push`.
- **`Stacks`** (`core/Stacks.js`) is attached to `Player` and every `Enemy`
  (composition, since they share no parent). Inert today; it's where the
  "N stacks → effect" strategic system will hook in.
- **`CameraController`** owns screen juice. Opening the world beyond the viewport
  is `camera.startFollow(player)` once `WORLD_WIDTH/HEIGHT` exceed the screen.
- **`BootScene`** is the one place to load real art/audio (`this.load.*`) and
  generate placeholder textures.

## Verify every change

Run the game (`npm run dev` + preview), confirm no console errors, and exercise
the changed path. Behavior-preserving refactors must play **identically**.
