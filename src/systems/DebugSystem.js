import { ENEMY_REGISTRY, spawnEnemyByName } from '../entities/enemies/index.js';
import { GAMESPACE_REGISTRY, spawnGamespaceObjectByName } from '../entities/gamespace/index.js';

// Dev-only debug + cheat overlay. Toggled with the backtick (`) key. Created by
// GameScene only under import.meta.env.DEV, so it never ships to players.
//
// Cheats: godmode, infinite ability resources, kill-all, heal, +kills, and
// spawn-anything (dropdowns auto-populate from the enemy/gamespace registries,
// so every future type shows up for free).
//
// Debug: live readout (fps, timers, player, active-ability internals, entity
// counts), a physics hitbox overlay, and a diff-based event log that surfaces
// spawns/hits/heals/kills as they happen.
export class DebugSystem {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.cheats = { godmode: false, infiniteResources: false, hitboxes: false };
    this.logLines = [];
    this.prev = { kills: 0, hp: null, enemies: 0 };

    this.buildOverlay();

    this._keyHandler = (e) => {
      if (e.code === 'Backquote') {
        e.preventDefault();
        this.toggle();
      }
    };
    window.addEventListener('keydown', this._keyHandler);

    scene.events.once('shutdown', () => this.destroy());
    scene.events.once('destroy', () => this.destroy());
  }

  // ---- lifecycle ----

  toggle() {
    this.visible = !this.visible;
    this.overlay.style.display = this.visible ? 'block' : 'none';
  }

  destroy() {
    window.removeEventListener('keydown', this._keyHandler);
    if (this.overlay && this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
    this.overlay = null;
  }

  // ---- per-frame ----

  update() {
    // Continuously enforced cheats.
    if (this.cheats.godmode) this.scene.player.invulnerable = true;
    if (this.cheats.infiniteResources) {
      this.scene.player.abilities.forEach((a) => a.refill());
    }

    this.detectEvents();
    if (this.visible) this.renderStats();
  }

  detectEvents() {
    const s = this.scene;
    if (this.prev.hp === null) this.prev.hp = s.player.stats.hp;

    if (s.killCount > this.prev.kills) {
      this.pushLog(`kill +${s.killCount - this.prev.kills}  (total ${s.killCount})`);
    }
    if (s.player.stats.hp < this.prev.hp) this.pushLog(`player hurt -> ${s.player.stats.hp} hp`);
    if (s.player.stats.hp > this.prev.hp) this.pushLog(`player heal -> ${s.player.stats.hp} hp`);

    const ec = s.enemies.getLength();
    if (ec > this.prev.enemies) this.pushLog(`spawn +${ec - this.prev.enemies}  (enemies ${ec})`);

    this.prev.kills = s.killCount;
    this.prev.hp = s.player.stats.hp;
    this.prev.enemies = ec;
  }

  pushLog(msg) {
    const t = this.scene.elapsed.toFixed(1);
    this.logLines.push(`[${t}s] ${msg}`);
    if (this.logLines.length > 12) this.logLines.shift();
  }

  renderStats() {
    const s = this.scene;
    const p = s.player;
    const ab = p.primaryAbility();
    const fps = Math.round(this.scene.game.loop.actualFps);
    const lines = [
      `fps ${fps}    t ${s.elapsed.toFixed(1)}s    kills ${s.killCount}`,
      `hp ${p.stats.hp}/${p.stats.maxHp}   mana ${p.stats.mana}/${p.stats.maxMana}   invuln ${p.invulnerable}`,
      `pos ${Math.round(p.x)},${Math.round(p.y)}   speed ${p.getStat('moveSpeed')}`,
      `ability ${ab.constructor.name}  [${ab.debugState()}]`,
      `enemies ${s.enemies.getLength()}   pickups ${s.pickups.getLength()}   walls ${s.gamespaceBlockers.getLength()}`,
      '',
      '── events ──',
      ...this.logLines
    ];
    this.statsEl.textContent = lines.join('\n');
  }

  // ---- cheat actions ----

  killAll() {
    this.scene.enemies.getChildren().slice().forEach((e) => e.takeDamage(9999));
  }

  healFull() {
    const p = this.scene.player;
    p.stats.hp = p.stats.maxHp;
    this.scene.hud.setHp(p.stats.hp);
  }

  addKills(n) {
    // Route through the real kill hook so orb growth / heal drops still fire.
    for (let i = 0; i < n; i++) {
      this.scene.killCount += 1;
      this.scene.hud.setScore(this.scene.killCount);
      if (this.scene.killCount % 10 === 0) {
        this.scene.spawnHealPickup(this.scene.player.x, this.scene.player.y);
      }
      this.scene.player.onKill(this.scene.killCount);
    }
  }

  spawnEnemy(name) {
    const pos = this.scene.getSpawnPosition();
    // e is null for a telegraphed spawn (e.g. wall) — the real enemy doesn't
    // exist synchronously yet, so guard before touching it.
    const e = spawnEnemyByName(this.scene, name, pos.x, pos.y);
    if (e && e.setTravelTarget) e.setTravelTarget(pos.x, pos.y); // turrets station in place
    this.pushLog(`cheat: spawn ${name}`);
  }

  spawnGamespace(name) {
    const p = this.scene.player;
    spawnGamespaceObjectByName(this.scene, name, p.x + 160, p.y);
    this.pushLog(`cheat: spawn ${name}`);
  }

  setHitboxes(on) {
    const world = this.scene.physics.world;
    if (on && !world.debugGraphic) world.createDebugGraphic();
    world.drawDebug = on;
    if (world.debugGraphic) world.debugGraphic.setVisible(on);
  }

  // ---- overlay construction ----

  buildOverlay() {
    const existing = document.getElementById('debug-overlay');
    if (existing) existing.parentNode.removeChild(existing);

    const el = document.createElement('div');
    el.id = 'debug-overlay';
    el.style.cssText = [
      'position:fixed', 'top:10px', 'left:10px', 'width:280px', 'z-index:9999',
      'display:none', 'padding:10px 12px', 'border:1px solid #3a4570',
      'border-radius:8px', 'background:rgba(8,10,24,0.92)', 'color:#cdd6f4',
      'font:11px/1.5 ui-monospace,Menlo,Consolas,monospace', 'user-select:none'
    ].join(';');

    el.appendChild(this.makeHeader('DEBUG / CHEATS  (` to toggle)'));

    el.appendChild(this.makeCheckbox('Godmode', (on) => {
      this.cheats.godmode = on;
      if (!on) this.scene.player.invulnerable = false;
    }));
    el.appendChild(this.makeCheckbox('Infinite resources', (on) => { this.cheats.infiniteResources = on; }));
    el.appendChild(this.makeCheckbox('Show hitboxes', (on) => { this.cheats.hitboxes = on; this.setHitboxes(on); }));

    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;margin:6px 0';
    row.appendChild(this.makeButton('Kill all', () => this.killAll()));
    row.appendChild(this.makeButton('Heal full', () => this.healFull()));
    row.appendChild(this.makeButton('+10 kills', () => this.addKills(10)));
    el.appendChild(row);

    el.appendChild(this.makeSpawner('Spawn enemy', Object.keys(ENEMY_REGISTRY), (n) => this.spawnEnemy(n)));
    el.appendChild(this.makeSpawner('Spawn object', Object.keys(GAMESPACE_REGISTRY), (n) => this.spawnGamespace(n)));

    const stats = document.createElement('pre');
    stats.style.cssText = 'margin:8px 0 0;white-space:pre-wrap;color:#a6adc8;border-top:1px solid #3a4570;padding-top:6px';
    stats.textContent = '(stats update while running)';
    el.appendChild(stats);
    this.statsEl = stats;

    document.body.appendChild(el);
    this.overlay = el;
  }

  makeHeader(text) {
    const h = document.createElement('div');
    h.textContent = text;
    h.style.cssText = 'font-weight:700;color:#89b4fa;margin-bottom:8px;letter-spacing:0.02em';
    return h;
  }

  makeCheckbox(label, onChange) {
    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0';
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.addEventListener('change', () => onChange(box.checked));
    wrap.appendChild(box);
    wrap.appendChild(document.createTextNode(label));
    return wrap;
  }

  makeButton(label, onClick) {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'flex:1;min-width:70px;padding:4px 6px;cursor:pointer;background:#1e2138;color:#cdd6f4;border:1px solid #3a4570;border-radius:5px;font:inherit';
    b.addEventListener('click', onClick);
    return b;
  }

  makeSpawner(label, options, onSpawn) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;margin:4px 0';
    const select = document.createElement('select');
    select.style.cssText = 'flex:1;background:#1e2138;color:#cdd6f4;border:1px solid #3a4570;border-radius:5px;font:inherit;padding:3px';
    options.forEach((o) => {
      const opt = document.createElement('option');
      opt.value = o;
      opt.textContent = o;
      select.appendChild(opt);
    });
    const btn = this.makeButton(label, () => onSpawn(select.value));
    btn.style.flex = '0 0 auto';
    row.appendChild(select);
    row.appendChild(btn);
    return row;
  }
}
