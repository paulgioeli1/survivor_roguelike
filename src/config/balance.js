// All gameplay tuning numbers and type definitions. This is the file to edit
// when balancing the game (and the file a future live-tuning/cheat menu reads).
import { COLORS } from './colors.js';

// Hard cap on simultaneously-active enemies — a framerate backstop, NOT a
// difficulty mechanic. When at cap the spawners pause (they never despawn a
// chasing enemy). See SpawnSystem.
export const MAX_ACTIVE_ENEMIES = 400;

export const ENEMY_TIERS = {
  red: { hp: 1, speed: 119, color: COLORS.red, texture: 'enemy-red' },
  green: { hp: 2, speed: 77, color: COLORS.green, texture: 'enemy-green' },
  blue: { hp: 3, speed: 47, color: COLORS.blue, texture: 'enemy-blue' },
  turret: { hp: 5, speed: 110, color: COLORS.turret, texture: 'enemy-turret' },
  // Stationary blocker: no speed (never chases), blocksPlayer routes it into
  // the physical collider group, telegraphMs delays its real spawn behind a
  // warning animation. See entities/enemies/WallEnemy.js.
  wall: { hp: 3, speed: 0, color: COLORS.wall, texture: 'wall-enemy-tex', blocksPlayer: true, telegraphMs: 1500 }
};

// SplitterEnemy has 3 stages (big/medium/small) instead of one tier, so it
// doesn't fit the single-hp/texture shape of ENEMY_TIERS above — see
// entities/enemies/SplitterEnemy.js for how this table is consumed.
export const SPLITTER = {
  color: COLORS.splitter,
  speed: 60, // 50% of the red triangle chaser's speed (119)
  stages: [
    { hp: 3, texture: 'splitter-big-tex' },
    { hp: 2, texture: 'splitter-medium-tex' },
    { hp: 1, texture: 'splitter-small-tex' }
  ]
};

export const WEAPONS = {
  orb: { name: 'Orb', color: COLORS.orb, description: 'Orbiting shields block enemies. Right click: charge shockwave.' },
  bomb: { name: 'Bomb', color: COLORS.bomb, description: 'Left click: drop a bomb (max 3). Right click: detonate them all.' },
  gun: { name: 'Gun', color: COLORS.gun, description: 'Left click: fire a bullet (max 5). Right click: full-clip spread.' },
  laser: { name: 'Laser', color: COLORS.laser, description: 'Hold left click to fire until energy runs out. Right click: overcharged beam.' },
  sword: { name: 'Sword', color: COLORS.sword, description: 'Left click: slash toward the cursor. Right click: spinning slash.' }
};
