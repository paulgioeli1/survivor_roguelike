const GAME_WIDTH = 900;
const GAME_HEIGHT = 600;
const FONT_FAMILY = '"Orbitron", sans-serif';

const COLORS = {
  grid: 0x14142c,
  player: 0x00e5ff,
  orb: 0xff2079,
  ultimate: 0xffffff,
  red: 0xff2d55,
  green: 0x39ff6a,
  blue: 0x3ea8ff
};

const ENEMY_TIERS = {
  red: { hp: 1, speed: 140, color: COLORS.red, texture: 'enemy-red' },
  green: { hp: 2, speed: 90, color: COLORS.green, texture: 'enemy-green' },
  blue: { hp: 3, speed: 55, color: COLORS.blue, texture: 'enemy-blue' }
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
