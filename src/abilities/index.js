// The ability registry: the one place that knows what abilities exist. To add
// one: create its class file, then add a line here. Display metadata (name,
// color, description) stays in config/balance.js (WEAPONS).
import { WEAPONS } from '../config/balance.js';
import { OrbAbility } from './OrbAbility.js';
import { BombAbility } from './BombAbility.js';
import { GunAbility } from './GunAbility.js';
import { LaserAbility } from './LaserAbility.js';
import { SwordAbility } from './SwordAbility.js';

export const ABILITY_REGISTRY = {
  orb: { class: OrbAbility, ...WEAPONS.orb },
  bomb: { class: BombAbility, ...WEAPONS.bomb },
  gun: { class: GunAbility, ...WEAPONS.gun },
  laser: { class: LaserAbility, ...WEAPONS.laser },
  sword: { class: SwordAbility, ...WEAPONS.sword }
};

export function createAbility(name, scene) {
  const def = ABILITY_REGISTRY[name];
  const ability = new def.class(scene);
  ability.def = def;
  return ability;
}
