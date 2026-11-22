// Ember Court — boot and the one loop: the world advances only on player actions
// (a turn-based game has no frame loop), and the renderer repaints after every
// action. Screens: title, play, win, loss.
//
// ?seed=N fixes the deal. ?shot=title|play|win|loss (with &seed=N) stages that
// scene instead of running the game, paints it twice and sets
// window.__shotReady for a screenshot.
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { duchessTurn } from './ai.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_LOSS, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const root = document.getElementById('app');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(root);
const audio = createAudio();
let screen = SCREEN_TITLE;
let selected = null;

function announce(message) {
  status.textContent = message;
}

function paint() {
  renderer.render(world.state, screen, selected, world.score());
}

function endGame() {
  screen = world.state.winner === 'player' ? SCREEN_WIN : SCREEN_LOSS;
  if (screen === SCREEN_WIN) audio.win();
  else audio.lose();
  announce(screen === SCREEN_WIN
    ? `You win! Score ${world.score()}.`
    : `You lose. Score ${world.score()}.`);
  paint();
}

function startGame() {
  world.reset();
  selected = null;
  screen = SCREEN_PLAY;
  announce('Your turn. Play a card, then End Turn.');
  paint();
}

function runShot(name) {
  const scene = stageShot(name, world);
  screen = scene.screen;
  if (screen === SCREEN_WIN) announce(`You win! Score ${world.score()}.`);
  else if (screen === SCREEN_LOSS) announce(`You lose. Score ${world.score()}.`);
  let painted = 0;
  function paintTwice() {
    paint();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paintTwice);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paintTwice);
}

function runGame() {
  const input = createInput({
    handSize: () => world.state.player.hand.length,
    onSelect: (value) => {
      selected = value;
      paint();
    },
    onLane: (lane, handIndex) => {
      if (screen !== SCREEN_PLAY || world.state.over) return false;
      const played = world.playCard('player', handIndex, lane);
      if (played) {
        audio.play();
        if (world.state.over) endGame();
        else paint();
        return true;
      }
      return false;
    },
    onEndTurn: () => {
      if (screen !== SCREEN_PLAY || world.state.over) return;
      world.endPlayerTurn((state) => duchessTurn(world, 'balanced'));
      audio.damage();
      if (world.state.over) endGame();
      else {
        announce(`Round ${world.state.round}. Your turn.`);
        paint();
      }
    },
    onTitle: () => {
      screen = SCREEN_TITLE;
      paint();
    },
    onMute: () => {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    },
  });

  renderer.setHandlers({
    onCardClick: (index) => input.cardClicked(index),
    onLaneClick: (lane) => {
      if (input.laneClicked(lane)) {
        if (world.state.over) endGame();
        else paint();
      }
    },
    onEndTurn: () => {
      if (screen !== SCREEN_PLAY || world.state.over) return;
      world.endPlayerTurn((state) => duchessTurn(world, 'balanced'));
      audio.damage();
      if (world.state.over) endGame();
      else paint();
    },
    onPlayAgain: (kind) => startGame(),
  });

  announce('Ember Court. Press Play to duel the Ashen Duchess.');
  paint();
}

if (shot) runShot(shot);
else runGame();
