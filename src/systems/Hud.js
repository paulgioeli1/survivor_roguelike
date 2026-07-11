import { GAME_WIDTH, GAME_HEIGHT, FONT_FAMILY } from '../config/constants.js';
import { COLORS } from '../config/colors.js';

// Owns the heads-up display: timer, kill count, weapon label, HP pips, and the
// shared bottom-left status line. Abilities that need extra HUD (e.g. the laser
// energy bar) create it themselves in their init().
export class Hud {
  constructor(scene, weaponName, weaponColor, maxHp) {
    this.scene = scene;

    this.timerText = scene.add.text(GAME_WIDTH / 2, 16, '00:00', {
      fontFamily: FONT_FAMILY,
      fontSize: '26px',
      fontStyle: '700',
      color: '#e8f9ff'
    }).setOrigin(0.5, 0).setShadow(0, 0, '#00e5ff', 8, true, true);

    this.scoreText = scene.add.text(20, 20, 'kills  0', {
      fontFamily: FONT_FAMILY,
      fontSize: '16px',
      color: '#8890b0'
    });

    scene.add.text(20, 44, weaponName, {
      fontFamily: FONT_FAMILY,
      fontSize: '13px',
      color: '#' + weaponColor.toString(16).padStart(6, '0')
    });

    this.hpPips = [];
    for (let i = 0; i < maxHp; i++) {
      const pip = scene.add.rectangle(GAME_WIDTH - 30 - i * 26, 30, 18, 18, COLORS.player)
        .setStrokeStyle(1, 0xffffff, 0.4);
      this.hpPips.push(pip);
    }

    this.resourceText = scene.add.text(20, GAME_HEIGHT - 30, 'ultimate charging  0%', {
      fontFamily: FONT_FAMILY,
      fontSize: '14px',
      color: '#4c5580'
    });
  }

  setTime(elapsed) {
    const total = Math.floor(elapsed);
    const mins = Math.floor(total / 60);
    const secs = total % 60;
    this.timerText.setText(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
  }

  setScore(kills) {
    this.scoreText.setText(`kills  ${kills}`);
  }

  setHp(hp) {
    this.hpPips.forEach((pip, i) => {
      pip.setFillStyle(i < hp ? COLORS.player : 0x1a1d3a);
    });
  }

  // Takes the { text, color } an ability returns from hudText().
  setResource(h) {
    this.resourceText.setText(h.text);
    this.resourceText.setColor(h.color);
  }
}
