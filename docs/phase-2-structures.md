# Phase 2 — Persistent world structures ("stumble upon an oasis")

**Prerequisite:** Phase 1 (open world) must be done first — this builds on the
camera-follow + world coordinates. Read this file, the current code, and
`CLAUDE.md`, then build following the conventions. Verify in the preview,
commit per logical group.

## Goal & decisions (already made)

Structures (HP/mana pools, later chargers/chests/market/teleporters) that:
- **Pre-exist** at fixed world coordinates — you *discover* them, they aren't
  spawned around you. (Spawning-around-the-player was explicitly rejected: it
  kills the "it was always there" feeling and makes "come back to it"
  incoherent.)
- **Persist for the whole run** at their coordinates, with their state (e.g.
  depleted) remembered — leave and return and it's the same structure, same
  spot, same state.
- Are placed **honestly**: pure position-based RNG, spread out, **no bias toward
  players who are hurting.** The "oasis in my moment of need" feeling comes from
  genuine scarcity + luck, not a pity mechanic. Tune *density* if too punishing;
  never tune *toward the player's state*.

### The core pattern: records vs. live objects
Separate a structure's **existence** (a cheap record: `{x, y, type, state}`)
from its **live interactive object** (a `GamespaceObject` with a physics body).
Pre-place all records at run start; only instantiate the live object when the
player is near; despawn the live object (keep the record) when they leave. This
gives lazy-instantiation efficiency AND genuine pre-existence AND coherent
return, all at once. (This is how open-world games handle props.)

Fixed world → pre-place at run start is sufficient; **no procedural-noise /
chunk machinery needed.** (If we ever go infinite, swap the run-start roll for a
deterministic seeded function behind the same interface — nothing downstream
changes.)

## Work items

### 1. First real structure: HP pool
Need at least one structure to build/test the system against. Create
`entities/gamespace/HpPool.js` extending `GamespaceObject` (`blocks: false` — a
trigger, not a wall):
- Overlap trigger: while the player stands in it, heal over time (e.g. +1 HP
  every ~1.2s up to max) via `onPlayerOverlap(player)`. Matches the described
  "pools the player can step into and relax in."
- v1: **non-depleting** (a reusable relax spot) — keeps state trivial while the
  system is built. The state store (below) is still generic so a *depletable*
  structure (chest = opened/not, one-shot charger) drops in later without
  rework.
- Add a `hp-pool-tex` placeholder in `BootScene` (a soft-edged circle/pool
  shape in a healing color) and register it in `GAMESPACE_REGISTRY` +
  `config/colors.js` + any tuning in `balance.js`.

### 2. StructureSystem (placement + lazy instantiation + persistence)
New `systems/StructureSystem.js`, created in `GameScene.create`, updated each
frame (or on a short interval) from `GameScene.update`:

**Run-start placement (records):**
- Roll structure records across the world with **spread-not-clumped** spacing.
  Simple approach: divide the world into cells of ~`STRUCTURE_SPACING` px
  (start ~2500), and for each cell place at most one structure at a
  jittered position within the cell, with a per-cell spawn probability. Gives
  Poisson-disk-ish distribution cheaply (~256 records in a 40k² world at 2500
  spacing — trivial memory).
- Exclude a radius around the player's start (WORLD center) so you don't spawn
  on top of the player, and keep records inside a margin from world bounds.
- Choose each record's `type` by **weighted random** from a placement table
  (see item 3). Store `{ x, y, type, state: {} , live: null }`.

**Per-frame activation (lazy live objects), with hysteresis:**
- Instantiate the live object for records within `ACTIVATE_RADIUS` of the player
  (~`VIEW_RADIUS + 500`) that aren't already live: call
  `spawnGamespaceObjectByName(scene, record.type, record.x, record.y)` (reuses
  the existing gamespace registry + group wiring, so the player-vs-gamespace
  overlap set up in `GameScene` covers it automatically), set `record.live`.
- Despawn (destroy the live object, keep the record) for live records beyond
  `DEACTIVATE_RADIUS` (~`ACTIVATE_RADIUS + 400` — larger than activate to avoid
  thrashing at the boundary). Set `record.live = null`.
- **State round-trip:** the live object reads its initial state from
  `record.state` on instantiation and writes changes back to `record.state`
  (e.g. a depleted chest), so returning re-instantiates in the same state. For
  the non-depleting HP pool v1 this is a no-op, but wire the round-trip now.
- `stop()` / scene shutdown: destroy any live objects (records are GC'd with the
  scene — runs are ephemeral, no cross-session save needed; the record list is
  trivially serializable if we ever want "resume a run").

### 3. Placement table (honest, weighted)
In `config/balance.js`, a `STRUCTURE_PLACEMENT` table listing which gamespace
types appear in worldgen and their relative weights, plus `STRUCTURE_SPACING`
and per-cell spawn probability / density. **No player-state inputs** — placement
is a function of position and the run seed only. Start with just `hpPool`;
adding a type later = one line here + its class/registry entry.

### 4. Culling interaction
Phase 1's enemy culling must **not** touch structures — structures live in the
gamespace groups, not the `enemies` group, so they're already excluded. Double-
check the stale-cull sweep only iterates `scene.enemies`.

## Verification (preview, zero console errors)
- Move across the world: structures appear **spread out, not clumped**, and
  become visible/interactive **before** you reach them (pre-existing feel), not
  popping in on top of you.
- Stand in an HP pool at low HP → heals over time; step out → stops.
- Leave a structure's area and return → **same structure, same spot** (and, once
  we have a depletable one, same state).
- Low HP does **not** change where structures are (honest placement — spot-check
  by comparing layouts at high vs low HP from the same seed).
- FPS stays healthy with only nearby structures instantiated (confirm distant
  records aren't live objects — check counts via the debug readout).

## Follow-ons this unlocks (not in Phase 2)
Mana pools, superchargers, puzzle chests (exercise depletable state), the
traveling market, teleporters (link two records), loot/currency drops with a
collection magnet, the easter-egg edge reward. Each is "one file + registry
line + placement-table entry."
