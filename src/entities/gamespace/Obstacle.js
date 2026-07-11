import { GamespaceObject } from './GamespaceObject.js';

// A solid wall that simply blocks the player. Behavior is entirely
// "blocks: true" from the registry; the subclass is the home for any
// wall-specific behavior added later (e.g. destructible walls).
export class Obstacle extends GamespaceObject {}
