class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  init(data) {
    this.finalScore = data.score || 0;
    this.finalTime = data.time || 0;
  }

  create() {
    drawNeonGrid(this, 0.4);

    this.add.text(GAME_WIDTH / 2, 150, 'YOU DIED', {
      fontFamily: FONT_FAMILY,
      fontSize: '44px',
      fontStyle: '900',
      color: '#ff2d55'
    }).setOrigin(0.5).setShadow(0, 0, '#ff2d55', 14, true, true);

    const mins = Math.floor(this.finalTime / 60);
    const secs = Math.floor(this.finalTime % 60);
    const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    this.add.text(GAME_WIDTH / 2, 230, `survived  ${timeStr}`, {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      color: '#e8f9ff'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 264, `enemies defeated  ${this.finalScore}`, {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      color: '#e8f9ff'
    }).setOrigin(0.5);

    this.makeButton(GAME_WIDTH / 2, 360, 'RESTART', 0x00e5ff, () => this.scene.start('Game'));
    this.makeButton(GAME_WIDTH / 2, 430, 'QUIT', 0x8890b0, () => this.scene.start('MainMenu'));
  }

  makeButton(x, y, label, color, onClick) {
    const colorStr = '#' + color.toString(16).padStart(6, '0');
    const btn = this.add.rectangle(x, y, 220, 52, 0x0d0f22)
      .setStrokeStyle(2, color)
      .setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: '700',
      color: colorStr
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x1a1d3a));
    btn.on('pointerout', () => btn.setFillStyle(0x0d0f22));
    btn.on('pointerdown', onClick);
  }
}
