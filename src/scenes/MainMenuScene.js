import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY, WEAPONS, drawNeonGrid } from '../constants.js';

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('MainMenu');
  }

  create() {
    drawNeonGrid(this, 0.6);

    // Layout was tuned for a 600px-tall canvas; scale every absolute
    // Y offset by the same ratio so the menu stays proportioned on
    // taller canvases instead of clumping at the top.
    const s = GAME_HEIGHT / 600;

    this.add.text(GAME_WIDTH / 2, 110 * s, 'NEON WASTELAND', {
      fontFamily: FONT_FAMILY,
      fontSize: '44px',
      fontStyle: '900',
      color: '#00e5ff'
    }).setOrigin(0.5).setShadow(0, 0, '#00e5ff', 12, true, true);

    this.add.text(GAME_WIDTH / 2, 156 * s, 'a fast-follow survivor', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#8890b0'
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, 200 * s, 'CHOOSE YOUR WEAPON', {
      fontFamily: FONT_FAMILY,
      fontSize: '18px',
      fontStyle: '700',
      color: '#e8f9ff'
    }).setOrigin(0.5);

    const keys = Object.keys(WEAPONS);
    const cardWidth = 160;
    const gap = 14;
    this.descFontSize = 16;

    // Measure how tall the longest description renders at the new font
    // size so every card — sized identically — is guaranteed to fit all
    // five descriptions instead of guessing a fixed height.
    let maxDescHeight = 0;
    keys.forEach((key) => {
      const probe = this.add.text(0, 0, WEAPONS[key].description, {
        fontFamily: FONT_FAMILY,
        fontSize: `${this.descFontSize}px`,
        wordWrap: { width: cardWidth - 24 }
      });
      maxDescHeight = Math.max(maxDescHeight, probe.height);
      probe.destroy();
    });
    const cardHeight = 2 * (maxDescHeight + 26);

    const totalWidth = keys.length * cardWidth + (keys.length - 1) * gap;
    const startX = (GAME_WIDTH - totalWidth) / 2 + cardWidth / 2;
    const cardY = 320 * s;

    keys.forEach((key, i) => {
      const x = startX + i * (cardWidth + gap);
      this.makeWeaponCard(x, cardY, cardWidth, cardHeight, key, WEAPONS[key]);
    });

    this.add.text(GAME_WIDTH / 2, 440 * s, 'WASD to move   |   aim with mouse   |   left click to attack   |   right click for ultimate', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#4c5580'
    }).setOrigin(0.5);
  }

  makeWeaponCard(x, y, w, h, weaponKey, weapon) {
    const colorStr = '#' + weapon.color.toString(16).padStart(6, '0');
    const card = this.add.rectangle(x, y, w, h, 0x0d0f22)
      .setStrokeStyle(2, weapon.color)
      .setInteractive({ useHandCursor: true });

    this.add.circle(x, y - h / 2 + 34, 10, weapon.color, 1)
      .setStrokeStyle(2, 0xffffff, 0.3);

    const nameText = this.add.text(x, y - h / 2 + 62, weapon.name, {
      fontFamily: FONT_FAMILY,
      fontSize: '20px',
      fontStyle: '700',
      color: colorStr
    }).setOrigin(0.5);

    this.add.text(x, y + 12, weapon.description, {
      fontFamily: FONT_FAMILY,
      fontSize: `${this.descFontSize}px`,
      color: '#8890b0',
      align: 'center',
      wordWrap: { width: w - 24 }
    }).setOrigin(0.5, 0);

    card.on('pointerover', () => {
      card.setFillStyle(0x1a0d2e);
      nameText.setColor('#ffffff');
    });
    card.on('pointerout', () => {
      card.setFillStyle(0x0d0f22);
      nameText.setColor(colorStr);
    });
    card.on('pointerdown', () => this.scene.start('Game', { weapon: weaponKey }));
  }
}
