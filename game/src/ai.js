// Ember Court — the Duchess: she plays affordable cards by lane value, guards
// when her life is low, and answers a big creature with a freeze. Her choices are
// readable: every turn sets state.intent, a plain line the table shows before she
// moves, and her cards flip face-up as she plays them.
import { cardById, LANES } from './config.js';

// Score a lane for the Duchess: she likes lanes where she can kill, lanes that
// are empty (free face damage), and — when hurt — lanes where a guard can stand.
function laneValue(state, lane) {
  const mine = state.enemy.lanes[lane].length;
  const theirs = state.player.lanes[lane].length;
  let value = 2 - mine * 0.5;
  if (mine >= 4) value -= 10; // a full lane takes no more creatures
  if (theirs === 0) value += 3;
  else {
    const biggest = Math.max(...state.player.lanes[lane].map((c) => c.attack));
    value += biggest;
  }
  if (state.enemy.life <= 8) value += state.enemy.lanes[lane].length === 0 ? 1 : 0;
  return value;
}

function bestLane(state) {
  let best = 0;
  let bestValue = -Infinity;
  for (let lane = 0; lane < LANES; lane += 1) {
    const value = laneValue(state, lane);
    if (value > bestValue) {
      bestValue = value;
      best = lane;
    }
  }
  return best;
}

// `policy` steers the autopilot in screenshots: 'balanced' plays to win,
// 'weak' plays badly (for the win shot), 'strong' plays sharply (loss shot).
export function duchessTurn(world, policy = 'balanced') {
  const state = world.state;
  const plays = [];
  const hurt = state.enemy.life <= 8;
  const weak = policy === 'weak';

  // Intent first, so the player can read her plan before the cards land.
  const focus = bestLane(state);
  state.intent = weak
    ? 'The Duchess plots… she seems distracted, favouring no lane.'
    : hurt
      ? `The Duchess plots… she guards lane ${focus + 1}, her life is low.`
      : `The Duchess plots… she eyes lane ${focus + 1}.`;

  let guardPlayed = false;
  for (let guard = 0; guard < 12; guard += 1) {
    const hand = state.enemy.hand;
    let choice = -1;
    let choiceLane = null;
    // Spells first when they clearly help.
    for (let i = 0; i < hand.length; i += 1) {
      const card = cardById(hand[i]);
      if (card.kind !== 'spell' || card.cost > state.enemy.embers) continue;
      if (card.effect === 'heal' && state.enemy.life <= 14 && !weak) {
        choice = i;
        choiceLane = null;
        break;
      }
      if (card.effect === 'starfall' && state.player.lanes.flat().length >= 2 && !weak) {
        choice = i;
        choiceLane = null;
        break;
      }
      if (card.effect === 'freeze' && !weak) {
        const bigLane = [0, 1, 2].reduce((a, b) =>
          (state.player.lanes[a].reduce((s, c) => s + c.attack, 0) >= state.player.lanes[b].reduce((s, c) => s + c.attack, 0) ? a : b));
        if (state.player.lanes[bigLane].length > 0 && !state.frozen[bigLane]) {
          choice = i;
          choiceLane = bigLane;
          break;
        }
      }
      if (card.effect === 'burst' && !weak) {
        const targetLane = [0, 1, 2].reduce((a, b) =>
          ((state.player.lanes[a][0]?.health ?? 0) >= (state.player.lanes[b][0]?.health ?? 0) ? a : b));
        if (state.player.lanes[targetLane].length > 0 || state.player.life <= 6) {
          choice = i;
          choiceLane = targetLane;
          break;
        }
      }
    }
    if (choice === -1) {
      // Creatures: guard first when hurt, else the best value for the cost.
      for (let i = 0; i < hand.length; i += 1) {
        const card = cardById(hand[i]);
        if (card.kind !== 'creature' || card.cost > state.enemy.embers) continue;
        if (hurt && card.ability === 'guard' && !guardPlayed) {
          choice = i;
          choiceLane = bestLane(state);
          guardPlayed = true;
          break;
        }
      }
    }
    if (choice === -1) {
      for (let i = 0; i < hand.length; i += 1) {
        const card = cardById(hand[i]);
        if (card.kind !== 'creature' || card.cost > state.enemy.embers) continue;
        const value = (card.attack + card.health) / card.cost;
        if (weak && value > 1.5) continue; // a distracted Duchess skips her best cards
        if (choice === -1 || value > (cardById(hand[choice]).attack + cardById(hand[choice]).health) / cardById(hand[choice]).cost) {
          choice = i;
          choiceLane = bestLane(state);
        }
      }
    }
    if (choice === -1) break;
    const played = world.playCard('enemy', choice, choiceLane);
    if (!played) break;
    plays.push(played.name);
    if (state.over) break;
    if (weak && plays.length >= 1 && state.enemy.embers < 3) break;
  }
  return plays;
}

// The player's autopilot for screenshots: plays affordable creatures into the
// best lane, casts spells when they clearly help. `policy` 'strong' plays well,
// 'weak' plays badly.
export function playerAutopilot(world, policy = 'strong') {
  const state = world.state;
  const strong = policy === 'strong';
  for (let guard = 0; guard < 12; guard += 1) {
    const hand = state.player.hand;
    let choice = -1;
    let choiceLane = null;
    for (let i = 0; i < hand.length; i += 1) {
      const card = cardById(hand[i]);
      if (card.cost > state.player.embers) continue;
      if (card.kind === 'spell') {
        if (card.effect === 'heal' && state.player.life <= 14 && strong) { choice = i; choiceLane = null; break; }
        if (card.effect === 'starfall' && state.enemy.lanes.flat().length >= 2 && strong) { choice = i; choiceLane = null; break; }
        if (card.effect === 'burst' && state.enemy.lanes.flat().length > 0 && strong) {
          choice = i;
          choiceLane = [0, 1, 2].reduce((a, b) => ((state.enemy.lanes[a][0]?.health ?? 0) >= (state.enemy.lanes[b][0]?.health ?? 0) ? a : b));
          break;
        }
        if (card.effect === 'freeze' && state.enemy.lanes.flat().length > 0 && strong) {
          choice = i;
          choiceLane = [0, 1, 2].reduce((a, b) => (state.enemy.lanes[a].reduce((s, c) => s + c.attack, 0) >= state.enemy.lanes[b].reduce((s, c) => s + c.attack, 0) ? a : b));
          break;
        }
      }
    }
    if (choice === -1) {
      for (let i = 0; i < hand.length; i += 1) {
        const card = cardById(hand[i]);
        if (card.kind !== 'creature' || card.cost > state.player.embers) continue;
        const value = (card.attack + card.health) / card.cost;
        if (!strong && value > 1.5) continue;
        if (choice === -1) { choice = i; choiceLane = bestPlayerLane(state); continue; }
        const bestValue = (cardById(hand[choice]).attack + cardById(hand[choice]).health) / cardById(hand[choice]).cost;
        if (value > bestValue) { choice = i; choiceLane = bestPlayerLane(state); }
      }
    }
    if (choice === -1) break;
    if (!world.playCard('player', choice, choiceLane)) break;
    if (state.over) break;
  }
}

function bestPlayerLane(state) {
  let best = 0;
  let bestValue = -Infinity;
  for (let lane = 0; lane < LANES; lane += 1) {
    let value = 2 - state.player.lanes[lane].length * 0.5;
    if (state.player.lanes[lane].length >= 4) value -= 10; // a full lane takes no more
    if (state.enemy.lanes[lane].length === 0) value += 3;
    else value += Math.max(...state.enemy.lanes[lane].map((c) => c.attack));
    if (value > bestValue) { bestValue = value; best = lane; }
  }
  return best;
}
