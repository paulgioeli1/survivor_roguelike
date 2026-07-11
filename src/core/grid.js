import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants.js';
import { COLORS } from '../config/colors.js';

// Draws the neon background grid. Used by every scene.
export function drawNeonGrid(scene, alpha) {
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
