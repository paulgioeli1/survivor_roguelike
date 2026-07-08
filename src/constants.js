const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
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
  sword: 0xdfe8ff
};

const ENEMY_TIERS = {
  red: { hp: 1, speed: 119, color: COLORS.red, texture: 'enemy-red' },
  green: { hp: 2, speed: 77, color: COLORS.green, texture: 'enemy-green' },
  blue: { hp: 3, speed: 47, color: COLORS.blue, texture: 'enemy-blue' }
};

const WEAPONS = {
  orb: { name: 'Orb', color: COLORS.orb, description: 'Orbiting shields block enemies.' },
  bomb: { name: 'Bomb', color: COLORS.bomb, description: 'Drops charges at your feet. +1 per minute.' },
  gun: { name: 'Gun', color: COLORS.gun, description: 'Fires bullets at the cursor. +1 spread per minute.' },
  laser: { name: 'Laser', color: COLORS.laser, description: 'Pierces enemies in a line. Fires faster over time.' },
  sword: { name: 'Sword', color: COLORS.sword, description: '60° slash toward the cursor.' }
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
