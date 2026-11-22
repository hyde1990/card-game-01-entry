// Ember Court — the screenshot scenes behind ?shot=title|play|win|loss. Each one
// plays the real rules forward from a fresh world with a fixed seed, steered by
// the same autopilots a player would use, so the frame is what a real game looks
// like and the same seed always gives the same frame. No mockups.
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
    // Mid-game, both sides developed: six full turns of real play.
    for (let turn = 0; turn < 6; turn += 1) {
      playerAutopilot(world, 'strong');
      if (world.state.over) break;
      world.endPlayerTurn((state) => duchessTurn(world, 'balanced'));
      if (world.state.over) break;
    }
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
