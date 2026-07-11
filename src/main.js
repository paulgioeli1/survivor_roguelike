import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './config/constants.js';
import { BootScene } from './scenes/BootScene.js';
import { MainMenuScene } from './scenes/MainMenuScene.js';
import { GameScene } from './scenes/GameScene.js';
import { GameOverScene } from './scenes/GameOverScene.js';

function boot() {
  const config = {
    type: Phaser.AUTO,
    parent: 'game-container',
    backgroundColor: '#050510',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [BootScene, MainMenuScene, GameScene, GameOverScene]
  };

  window.game = new Phaser.Game(config);
}

let booted = false;
function bootOnce() {
  if (booted) return;
  booted = true;
  boot();
}

setTimeout(bootOnce, 1500);

try {
  if (document.fonts && document.fonts.load) {
    Promise.all([
      document.fonts.load('900 32px "Orbitron"'),
      document.fonts.load('500 16px "Orbitron"')
    ]).then(bootOnce).catch(bootOnce);
  } else {
    bootOnce();
  }
} catch (e) {
  bootOnce();
}
