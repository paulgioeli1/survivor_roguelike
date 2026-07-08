const GAME_WIDTH = 1800;
const GAME_HEIGHT = 1200;
const FONT_FAMILY = '"Orbitron", sans-serif';
const MAX_HP = 5;

const COLORS = {
  grid: 0x14142c,
  player: 0x00e5ff,
  orb: 0xff2079,
  ultimate: 0xffffff,
  red: 0xff2d55,
  green: 0x39ff6a,
  blue: 0x3ea8ff,
  heal: 0xffffff,
  battery: 0xffe066,
  bomb: 0xffb347,
  gun: 0xfff275,
  laser: 0xb15bff,
  sword: 0xdfe8ff,
  turret: 0xb84dff
};

const ENEMY_TIERS = {
  red: { hp: 1, speed: 119, color: COLORS.red, texture: 'enemy-red' },
  green: { hp: 2, speed: 77, color: COLORS.green, texture: 'enemy-green' },
  blue: { hp: 3, speed: 47, color: COLORS.blue, texture: 'enemy-blue' },
  turret: { hp: 5, speed: 110, color: COLORS.turret, texture: 'enemy-turret' }
};

const WEAPONS = {
  orb: { name: 'Orb', color: COLORS.orb, description: 'Orbiting shields block enemies. Right click: charge shockwave.' },
  bomb: { name: 'Bomb', color: COLORS.bomb, description: 'Left click: drop a bomb (max 3). Right click: detonate them all.' },
  gun: { name: 'Gun', color: COLORS.gun, description: 'Left click: fire a bullet (max 5). Right click: full-clip spread.' },
  laser: { name: 'Laser', color: COLORS.laser, description: 'Hold left click to fire until energy runs out. Right click: overcharged beam.' },
  sword: { name: 'Sword', color: COLORS.sword, description: 'Left click: slash toward the cursor. Right click: spinning slash.' }
};

function drawNeonGrid(scene, alpha) {
  const g = scene.add.graphics();
  g.lineStyle(1, COLORS.grid, alpha);
  for (let x = 0; x <= GAME_WIDTH; x += 40) {
    g.lineBetween(x, 0, x, GAME_HEIGHT);
  }
  for (let y = 0; y <= GAME_HEIGHT; y += 40) {
    g.lineBetween(0, y, GAME_WIDTH, y);
  }
  return g;
}
