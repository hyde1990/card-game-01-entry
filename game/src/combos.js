// Ember Court — combos: Kindled and High Tide, the two ways cards combine.
// One home for the combo rules so the world, the renderer and the outline all
// read them from the same place. Pure functions of the state passed in; the
// world supplies `drawCard` and `say` so this module stays DOM-free.
// Kindled — a Flame and a Thorn creature share one lane: +1 attack each.
// High Tide — a Tide and a Star card played on the same turn: draw a card.
import { LANES } from './config.js';

// A lane is Kindled when its creatures mix Flame and Thorn.
export function laneKindled(creatures) {
  const suits = new Set(creatures.map((c) => c.suit));
  return suits.has('flame') && suits.has('thorn');
}

// A creature's attack on the table: base attack, +1 while its lane is Kindled.
export function effectiveAttack(creature, laneCreatures) {
  return creature.attack + (laneKindled(laneCreatures) ? 1 : 0);
}

// Fire the combos a turn's plays earned. High Tide fires once per turn, the
// first time Tide + Star are both among the suits played this turn; Kindled
// is a standing lane bonus, announced the first time a lane kindles.
export function checkCombos(state, side, drawCard, say) {
  const suits = new Set(state.playedSuitsThisTurn);
  if (suits.has('tide') && suits.has('star') && !state.highTideThisTurn) {
    state.highTideThisTurn = true;
    state.combos.push('High Tide');
    drawCard(side);
    say('High Tide! Tide + Star in one turn — draw a card.');
  }
  for (let l = 0; l < LANES; l += 1) {
    const laneSuits = new Set(state[side].lanes[l].map((c) => c.suit));
    if (laneSuits.has('flame') && laneSuits.has('thorn') && !state.combos.includes(`Kindled lane ${l + 1}`)) {
      state.combos.push(`Kindled lane ${l + 1}`);
      say(`Kindled! Flame + Thorn share lane ${l + 1}: +1 attack.`);
    }
  }
}
