// All gameplay tuning numbers and type definitions. This is the file to edit
// when balancing the game (and the file a future live-tuning/cheat menu reads).
import { COLORS } from './colors.js';

export const ENEMY_TIERS = {
  red: { hp: 1, speed: 119, color: COLORS.red, texture: 'enemy-red' },
  green: { hp: 2, speed: 77, color: COLORS.green, texture: 'enemy-green' },
  blue: { hp: 3, speed: 47, color: COLORS.blue, texture: 'enemy-blue' },
  turret: { hp: 5, speed: 110, color: COLORS.turret, texture: 'enemy-turret' }
};

export const WEAPONS = {
  orb: { name: 'Orb', color: COLORS.orb, description: 'Orbiting shields block enemies. Right click: charge shockwave.' },
  bomb: { name: 'Bomb', color: COLORS.bomb, description: 'Left click: drop a bomb (max 3). Right click: detonate them all.' },
  gun: { name: 'Gun', color: COLORS.gun, description: 'Left click: fire a bullet (max 5). Right click: full-clip spread.' },
  laser: { name: 'Laser', color: COLORS.laser, description: 'Hold left click to fire until energy runs out. Right click: overcharged beam.' },
  sword: { name: 'Sword', color: COLORS.sword, description: 'Left click: slash toward the cursor. Right click: spinning slash.' }
};
