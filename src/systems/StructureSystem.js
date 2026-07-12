import Phaser from 'phaser';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../config/constants.js';
import {
  STRUCTURE_SPACING,
  STRUCTURE_SPAWN_CHANCE,
  STRUCTURE_PLAYER_EXCLUSION_RADIUS,
  STRUCTURE_ACTIVATE_RADIUS,
  STRUCTURE_DEACTIVATE_RADIUS,
  STRUCTURE_PLACEMENT
} from '../config/balance.js';
import { spawnGamespaceObjectByName } from '../entities/gamespace/index.js';

// Persistent world structures ("stumble upon an oasis" — see
// docs/phase-2-structures.md). Separates a structure's existence (a cheap
// record: {x, y, type, state}) from its live interactive GamespaceObject:
// records are placed once at run start across the whole world, honestly
// (position + RNG only, never player state); only records near the player get
// a live object, which is destroyed (record kept) once they wander off. State
// round-trips via a shared object reference, so returning to a structure finds
// it exactly as it was left.
export class StructureSystem {
  constructor(scene) {
    this.scene = scene;
    this.records = [];
    this.placeStructures();
  }

  placeStructures() {
    const margin = STRUCTURE_SPACING;
    const originX = WORLD_WIDTH / 2;
    const originY = WORLD_HEIGHT / 2;
    const jitter = STRUCTURE_SPACING * 0.3;

    for (let cellX = margin; cellX <= WORLD_WIDTH - margin; cellX += STRUCTURE_SPACING) {
      for (let cellY = margin; cellY <= WORLD_HEIGHT - margin; cellY += STRUCTURE_SPACING) {
        if (Math.random() > STRUCTURE_SPAWN_CHANCE) continue;

        const x = cellX + Phaser.Math.FloatBetween(-jitter, jitter);
        const y = cellY + Phaser.Math.FloatBetween(-jitter, jitter);
        if (Phaser.Math.Distance.Between(x, y, originX, originY) < STRUCTURE_PLAYER_EXCLUSION_RADIUS) continue;

        this.records.push({ x, y, type: this.pickType(), state: {}, live: null });
      }
    }
  }

  pickType() {
    const total = STRUCTURE_PLACEMENT.reduce((sum, entry) => sum + entry.weight, 0);
    let roll = Math.random() * total;
    for (const entry of STRUCTURE_PLACEMENT) {
      roll -= entry.weight;
      if (roll <= 0) return entry.type;
    }
    return STRUCTURE_PLACEMENT[STRUCTURE_PLACEMENT.length - 1].type;
  }

  update() {
    const player = this.scene.player;
    this.records.forEach((record) => {
      const dist = Phaser.Math.Distance.Between(record.x, record.y, player.x, player.y);
      if (!record.live && dist <= STRUCTURE_ACTIVATE_RADIUS) {
        this.activate(record);
      } else if (record.live && dist > STRUCTURE_DEACTIVATE_RADIUS) {
        this.deactivate(record);
      }
    });
  }

  activate(record) {
    const live = spawnGamespaceObjectByName(this.scene, record.type, record.x, record.y);
    // Shared reference, not a copy: mutations the live object makes to its
    // state are automatically visible in record.state, so no explicit
    // write-back is needed on deactivate.
    live.state = record.state;
    record.live = live;
  }

  deactivate(record) {
    record.live.destroy();
    record.live = null;
  }

  liveCount() {
    return this.records.reduce((n, r) => n + (r.live ? 1 : 0), 0);
  }

  stop() {
    this.records.forEach((record) => {
      if (record.live) {
        record.live.destroy();
        record.live = null;
      }
    });
  }
}
