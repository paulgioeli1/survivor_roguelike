// The VIEW: how much world the camera shows / the canvas resolution. The scale
// config (main.js) FITs this to the window, so the player always sees a
// 1800x1200 slice of the world regardless of window size.
export const GAME_WIDTH = 1800;
export const GAME_HEIGHT = 1200;

// The playable WORLD — much larger than the view. The camera follows the player
// across it (see CameraController.follow). Enormous-but-fixed: persistence of
// world content is free, and there's no infinite-streaming machinery. Tunable;
// at 40000 the center-to-edge run is ~90s at base move speed.
export const WORLD_WIDTH = 40000;
export const WORLD_HEIGHT = 40000;

// Half the view diagonal — the off-screen threshold for ring spawns (an enemy
// beyond this distance from the player is guaranteed off-screen at any angle).
export const VIEW_RADIUS = Math.hypot(GAME_WIDTH, GAME_HEIGHT) / 2;

export const FONT_FAMILY = '"Orbitron", sans-serif';
export const MAX_HP = 5;
