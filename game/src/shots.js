// Ember Court — the screenshot scenes behind ?shot=title|play|win|loss. Each one
// plays the real rules forward from a fresh world with a fixed seed, steered by
// the same autopilots a player would use, so the frame is what a real game looks
// like and the same seed always gives the same frame. No mockups.
import { cardById } from './config.js';
import { duchessTurn, playerAutopilot } from './ai.js';
import { SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

// Play full turns until the game ends (or the cap is hit). `playerPolicy` and
// `duchessPolicy` steer the two sides: strong beats weak, so a strong player
// against a weak Duchess wins, and the reverse loses.
function playUntilOver(world, playerPolicy, duchessPolicy, maxTurns) {
  for (let turn = 0; turn < maxTurns; turn += 1) {
    if (world.state.over) break;
    playerAutopilot(world, playerPolicy);
    if (world.state.over) break;
    world.endPlayerTurn((state) => duchessTurn(world, duchessPolicy));
  }
  return world.state.over;
}

// Stage a dense cover frame: after real play, top up both sides' embers and
// play real cards from each hand into any lane where that side has no creature
// yet, so the cover shows creatures on both sides in all three lanes. Every
// placement goes through world.playCard (costs, lane caps and combos all apply),
// and the fill is deterministic — same seed, same hands, same frame. The
// player's fill prefers a Tide creature, then a Star one, so the staged turn can
// fire High Tide and show it in the combo line.
function pickFillCard(world, side) {
  const hand = world.state[side].hand;
  const wanted = side === 'player' ? ['tide', 'star'] : [];
  for (const suit of wanted) {
    const idx = hand.findIndex((id) => {
      const card = cardById(id);
      return card.kind === 'creature' && card.suit === suit;
    });
    if (idx !== -1) return idx;
  }
  return hand.findIndex((id) => cardById(id).kind === 'creature');
}

function fillLanesForShot(world) {
  const state = world.state;
  if (state.over) return;
  state.player.embers = 10;
  state.enemy.embers = 10;
  for (const side of ['player', 'enemy']) {
    for (let lane = 0; lane < 3; lane += 1) {
      if (state[side].lanes[lane].length > 0) continue;
      for (let tries = 0; tries < 4 && state[side].lanes[lane].length === 0; tries += 1) {
        const idx = pickFillCard(world, side);
        if (idx === -1) {
          world.drawCard(side);
          continue;
        }
        if (!world.playCard(side, idx, lane)) break;
      }
    }
  }
  // Show High Tide on the cover too: if it has not fired this turn, play one
  // Tide creature and then one Star creature (cheapest of each suit in hand)
  // into the roomiest lane, through the real playCard path — the combo fires,
  // draws a card, and the combo line lights up. Skipped silently if the hand
  // holds no Tide or no Star creature.
  if (!state.highTideThisTurn) {
    state.player.embers = 10;
    for (const suit of ['tide', 'star']) {
      const hand = state.player.hand;
      let idx = -1;
      let cheapest = Infinity;
      for (let i = 0; i < hand.length; i += 1) {
        const card = cardById(hand[i]);
        if (card.kind === 'creature' && card.suit === suit && card.cost < cheapest) {
          cheapest = card.cost;
          idx = i;
        }
      }
      if (idx === -1) continue;
      const lane = [0, 1, 2].reduce((a, b) => (state.player.lanes[a].length <= state.player.lanes[b].length ? a : b));
      if (state.player.lanes[lane].length >= 4) continue;
      world.playCard('player', idx, lane);
      if (state.highTideThisTurn) break;
    }
  }
}

export function stageShot(name, world) {
  world.reset();
  if (name === 'title') {
    // A title over a live table: a few turns in, so the board behind it is rich.
    for (let turn = 0; turn < 3; turn += 1) {
      playerAutopilot(world, 'strong');
      if (world.state.over) break;
      world.endPlayerTurn((state) => duchessTurn(world, 'balanced'));
      if (world.state.over) break;
    }
    return { screen: SCREEN_TITLE };
  }
  if (name === 'play') {
    // Mid-game, both sides developed: six full turns of real play, then the
    // deterministic fill so every lane holds creatures on both sides.
    for (let turn = 0; turn < 6; turn += 1) {
      playerAutopilot(world, 'strong');
      if (world.state.over) break;
      world.endPlayerTurn((state) => duchessTurn(world, 'balanced'));
      if (world.state.over) break;
    }
    fillLanesForShot(world);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // A strong player against a distracted Duchess: real combat brings her to 0.
    // If the policies somehow do not finish the game, the shot still shows a
    // live play frame rather than a wrong end screen (stageShot guards the screen).
    playUntilOver(world, 'strong', 'weak', 60);
    return { screen: world.state.winner === 'player' ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'loss') {
    // A distracted player against a sharp Duchess: real combat brings you to 0.
    playUntilOver(world, 'weak', 'strong', 60);
    return { screen: world.state.winner === 'enemy' ? SCREEN_LOSS : SCREEN_PLAY };
  }
  return { screen: SCREEN_TITLE };
}
