import { Enemy } from './Enemy.js';

// Fast, fragile chaser. Differs from the base only in stats (from the
// registry), so the subclass is empty — it's the home for any Red-specific
// behavior added later.
export class RedEnemy extends Enemy {}
