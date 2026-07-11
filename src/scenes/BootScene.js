import Phaser from 'phaser';
import { COLORS } from '../config/colors.js';

// Boot generates every placeholder texture ONCE (previously GameScene
// regenerated them on every run) and is the single place to add
// `this.load.image(...)` when real art arrives. Then it hands off to the menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload() {
    // Real assets (art/audio) will be loaded here later, e.g.
    //   this.load.image('player', 'assets/player.png');
    // Swapping placeholder -> real then only touches this file + createTextures.
  }

  create() {
    this.createTextures();
    this.scene.start('MainMenu');
  }

  createTextures() {
    const size = 28;
    const pg = this.add.graphics();
    pg.fillStyle(COLORS.player, 0.25);
    pg.fillRect(0, 0, size + 16, size + 16);
    pg.fillStyle(COLORS.player, 1);
    pg.fillRect(8, 8, size, size);
    pg.generateTexture('player-tex', size + 16, size + 16);
    pg.destroy();

    const og = this.add.graphics();
    og.fillStyle(COLORS.orb, 0.35);
    og.fillCircle(10, 10, 10);
    og.fillStyle(COLORS.orb, 1);
    og.fillCircle(10, 10, 5);
    og.generateTexture('orb-tex', 20, 20);
    og.destroy();

    this.createTriangleTexture('enemy-red', COLORS.red, 22);
    this.createTriangleTexture('enemy-green', COLORS.green, 24);
    this.createTriangleTexture('enemy-blue', COLORS.blue, 26);
    this.createPentagonTexture('enemy-turret', COLORS.turret, 34);

    const hg = this.add.graphics();
    this.drawHeart(hg, 15, 16, 22, COLORS.heal, 0.3);
    this.drawHeart(hg, 15, 16, 14, COLORS.heal, 1);
    hg.generateTexture('heal-tex', 30, 30);
    hg.destroy();

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.battery, 0.3);
    bg.fillRoundedRect(1, 3, 20, 22, 4);
    bg.fillStyle(COLORS.battery, 1);
    bg.fillRoundedRect(4, 6, 14, 17, 3);
    bg.fillRect(8, 2, 6, 5);
    bg.generateTexture('battery-tex', 22, 26);
    bg.destroy();

    const bulletG = this.add.graphics();
    bulletG.fillStyle(COLORS.gun, 0.35);
    bulletG.fillCircle(7, 7, 7);
    bulletG.fillStyle(COLORS.gun, 1);
    bulletG.fillCircle(7, 7, 3);
    bulletG.generateTexture('bullet-tex', 14, 14);
    bulletG.destroy();

    const bombG = this.add.graphics();
    bombG.fillStyle(COLORS.bomb, 0.35);
    bombG.fillCircle(9, 10, 9);
    bombG.fillStyle(COLORS.bomb, 1);
    bombG.fillCircle(9, 10, 6);
    bombG.fillStyle(0x3a2a1a, 1);
    bombG.fillRect(7, 0, 4, 4);
    bombG.generateTexture('bomb-tex', 18, 20);
    bombG.destroy();

    const enemyBulletG = this.add.graphics();
    enemyBulletG.fillStyle(COLORS.turret, 0.35);
    enemyBulletG.fillCircle(7, 7, 7);
    enemyBulletG.fillStyle(COLORS.turret, 1);
    enemyBulletG.fillCircle(7, 7, 3);
    enemyBulletG.generateTexture('enemy-bullet-tex', 14, 14);
    enemyBulletG.destroy();

    const partG = this.add.graphics();
    partG.fillStyle(0xffffff, 1);
    partG.fillRect(0, 0, 4, 4);
    partG.generateTexture('particle-tex', 4, 4);
    partG.destroy();

    // Placeholder for gamespace obstacles (walls the player can't pass).
    const obg = this.add.graphics();
    obg.fillStyle(0x1a1d3a, 1);
    obg.fillRect(0, 0, 80, 80);
    obg.lineStyle(2, 0x3a4570, 1);
    obg.strokeRect(1, 1, 78, 78);
    obg.generateTexture('obstacle-tex', 80, 80);
    obg.destroy();
  }

  createTriangleTexture(key, color, size) {
    const pad = 6;
    const total = size + pad * 2;
    const cx = total / 2;
    const g = this.add.graphics();
    g.fillStyle(color, 0.25);
    g.fillTriangle(cx, pad - 4, pad - 4, total - pad + 4, total - pad + 4, total - pad + 4);
    g.fillStyle(color, 1);
    g.fillTriangle(cx, pad, pad, total - pad, total - pad, total - pad);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  createPentagonTexture(key, color, size) {
    const pad = 6;
    const total = size + pad * 2;
    const cx = total / 2;
    const cy = total / 2;
    const pentagonPoints = (radius) => {
      const pts = [];
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + i * (Math.PI * 2 / 5);
        pts.push({ x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius });
      }
      return pts;
    };
    const g = this.add.graphics();
    g.fillStyle(color, 0.25);
    g.fillPoints(pentagonPoints(size / 2 + 4), true);
    g.fillStyle(color, 1);
    g.fillPoints(pentagonPoints(size / 2), true);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  drawHeart(g, cx, cy, s, color, alpha) {
    const r = s * 0.28;
    g.fillStyle(color, alpha);
    g.fillCircle(cx - r, cy - r * 0.4, r);
    g.fillCircle(cx + r, cy - r * 0.4, r);
    g.fillTriangle(cx - s * 0.5, cy - r * 0.1, cx + s * 0.5, cy - r * 0.1, cx, cy + s * 0.5);
  }
}
