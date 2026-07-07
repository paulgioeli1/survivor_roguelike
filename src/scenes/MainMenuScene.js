class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    drawNeonGrid(this, 0.6);

    this.add.text(GAME_WIDTH / 2, 180, 'NEON WASTELAND', {
      fontFamily: FONT_FAMILY,
      fontSize: '48px',
      fontStyle: '900',
      color: '#00e5ff'
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 12, true, true);

    this.add.text(GAME_WIDTH / 2, 240, 'a fast-follow survivor', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#8890b0'
    }).setOrigin(0.5);

    const startBtn = this.add.rectangle(GAME_WIDTH / 2, 340, 220, 56, 0x0d0f22)
      .setStrokeStyle(2, 0xff2079)
      .setInteractive({ useHandCursor: true });

    const startText = this.add.text(GAME_WIDTH / 2, 340, 'START', {
      fontFamily: FONT_FAMILY,
      fontSize: '22px',
      fontStyle: '700',
      color: '#ff2079'
    }).setOrigin(0.5);

    startBtn.on('pointerover', () => {
      startBtn.setFillStyle(0x1a0d2e);
      startText.setColor('#ffffff');
    });
    startBtn.on('pointerout', () => {
      startBtn.setFillStyle(0x0d0f22);
      startText.setColor('#ff2079');
    });
    startBtn.on('pointerdown', () => this.scene.start('Game'));

    this.add.text(GAME_WIDTH / 2, 420, 'WASD to move   |   left click to unleash ultimate', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#4c5580'
    }).setOrigin(0.5);
  }
}
