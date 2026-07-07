function boot() {
  const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#050510',
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { y: 0 },
        debug: false
      }
    },
    scene: [MainMenuScene, GameScene, GameOverScene]
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
