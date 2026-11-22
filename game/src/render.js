// Ember Court — the renderer: world state in, DOM out. Cards are divs, so their
// text stays legible at thumbnail size; suits are colour AND shape (a coloured
// badge with a glyph), costs and attack/health are big and high-contrast.
import { cardById, SUITS, MAX_LIFE } from './config.js';
import { effectiveAttack } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSS = 'loss';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function suitBadge(suitKey) {
  const suit = SUITS[suitKey];
  const badge = el('span', 'suit-badge');
  badge.style.background = suit.color;
  badge.title = suit.label;
  const glyph = el('span', 'suit-glyph', suit.glyph);
  const label = el('span', 'suit-label', suit.label);
  badge.append(glyph, label);
  return badge;
}

// A card face: big cost gem top-left, suit badge, name, art glyph, text, and
// attack/health for creatures. `affordable` dims cards the player cannot pay for.
function cardFace(card, { affordable = true, small = false } = {}) {
  const suit = SUITS[card.suit];
  const node = el('div', `card suit-${card.suit}${small ? ' small' : ''}${affordable ? '' : ' unaffordable'}`);
  node.style.setProperty('--suit', suit.color);
  node.style.setProperty('--suit-dark', suit.dark);
  const cost = el('div', 'cost', String(card.cost));
  cost.title = `${card.cost} embers`;
  const name = el('div', 'card-name', card.name);
  const art = el('div', 'card-art', suit.glyph);
  const text = el('div', 'card-text', card.text);
  node.append(cost, suitBadge(card.suit), name, art, text);
  if (card.kind === 'creature') {
    const stats = el('div', 'card-stats');
    stats.append(el('span', 'atk', `⚔ ${card.attack}`), el('span', 'hp', `♥ ${card.health}`));
    node.append(stats);
  } else {
    node.append(el('div', 'card-kind', '✦ SPELL'));
  }
  return node;
}

// A creature standing in a lane: smaller card with live attack/health.
// Attack shown is the Kindled-boosted value combat actually uses.
function laneCreature(creature, laneCreatures) {
  const card = cardById(creature.cardId);
  const suit = SUITS[creature.suit];
  const node = el('div', `lane-card suit-${creature.suit}${creature.ability === 'guard' ? ' guard' : ''}`);
  node.style.setProperty('--suit', suit.color);
  node.style.setProperty('--suit-dark', suit.dark);
  node.append(
    el('div', 'lane-glyph', suit.glyph),
    el('div', 'lane-name', creature.name),
    el('div', 'lane-stats'),
  );
  const stats = node.querySelector('.lane-stats');
  stats.append(el('span', 'atk', `⚔ ${effectiveAttack(creature, laneCreatures)}`), el('span', 'hp', `♥ ${creature.health}`));
  if (creature.ability === 'guard') node.append(el('div', 'guard-tag', '🛡 GUARD'));
  node.title = `${creature.name} — ${card.text}`;
  return node;
}

function lifeBar(life, who) {
  const wrap = el('div', `life ${who}`);
  const hearts = el('span', 'hearts', `♥ ${life}`);
  const bar = el('div', 'life-bar');
  const fill = el('div', 'life-fill');
  fill.style.width = `${Math.max(0, (life / MAX_LIFE) * 100)}%`;
  bar.append(fill);
  wrap.append(hearts, bar);
  return wrap;
}

export function createRenderer(root) {
  const hud = root.querySelector('#hud');
  const intent = root.querySelector('#intent');
  const enemyHand = root.querySelector('#enemy-hand');
  const board = root.querySelector('#board');
  const playerHand = root.querySelector('#player-hand');
  const logBox = root.querySelector('#log');
  const endTurnBtn = root.querySelector('#end-turn');
  const titleOverlay = root.querySelector('#title-overlay');
  const endOverlay = root.querySelector('#end-overlay');

  let onCardClick = null;
  let onLaneClick = null;
  let onEndTurn = null;
  let onPlayAgain = null;

  endTurnBtn.addEventListener('click', () => onEndTurn && onEndTurn());
  titleOverlay.querySelector('#play-btn').addEventListener('click', () => onPlayAgain && onPlayAgain('start'));
  endOverlay.querySelector('#again-btn').addEventListener('click', () => onPlayAgain && onPlayAgain('again'));

  function render(state, screen, selected, score) {
    const player = state.player;
    const enemy = state.enemy;

    // HUD: life, embers, round, score.
    hud.replaceChildren();
    const title = el('div', 'hud-title', '🔥 EMBER COURT');
    const round = el('div', 'hud-round', `Round ${state.round}`);
    const embers = el('div', 'hud-embers', `🔥 ${player.embers} embers`);
    const scoreEl = el('div', 'hud-score', `Score ${score}`);
    const you = el('div', 'hud-life');
    you.append(el('span', 'hud-who', 'YOU '), lifeBar(player.life, 'you'));
    const foe = el('div', 'hud-life');
    foe.append(el('span', 'hud-who', 'DUCHESS '), lifeBar(enemy.life, 'foe'));
    hud.append(title, round, embers, scoreEl, you, foe);

    intent.textContent = state.intent || '';

    // The Duchess's hand: face-down backs with a count, plus her played cards
    // flip face-up on the table as she plays them.
    enemyHand.replaceChildren();
    enemyHand.append(el('div', 'hand-label', `The Ashen Duchess — ${enemy.hand.length} cards`));
    const backs = el('div', 'backs');
    for (let i = 0; i < Math.min(enemy.hand.length, 7); i += 1) {
      backs.append(el('div', 'card-back', '🕯'));
    }
    enemyHand.append(backs);

    // The board: three lanes, her creatures above, yours below.
    board.replaceChildren();
    for (let lane = 0; lane < 3; lane += 1) {
      const laneEl = el('div', `lane${state.frozen[lane] ? ' frozen' : ''}`);
      laneEl.dataset.lane = String(lane);
      laneEl.setAttribute('aria-label', `Lane ${lane + 1}`);
      laneEl.addEventListener('click', () => onLaneClick && onLaneClick(lane));
      const head = el('div', 'lane-head', `LANE ${lane + 1}${state.frozen[lane] ? ' ❄ FROZEN' : ''}`);
      const foeSide = el('div', 'lane-side foe-side');
      for (const creature of enemy.lanes[lane]) foeSide.append(laneCreature(creature, enemy.lanes[lane]));
      const mid = el('div', 'lane-mid', '⚔');
      const mySide = el('div', 'lane-side my-side');
      for (const creature of player.lanes[lane]) mySide.append(laneCreature(creature, player.lanes[lane]));
      laneEl.append(head, foeSide, mid, mySide);
      board.append(laneEl);
    }

    // Your hand: click a card to select it, then click a lane to play it.
    playerHand.replaceChildren();
    playerHand.append(el('div', 'hand-label', `Your hand — ${player.hand.length}/7 · click a card, then a lane`));
    const cards = el('div', 'cards');
    player.hand.forEach((cardId, index) => {
      const card = cardById(cardId);
      const node = cardFace(card, { affordable: player.embers >= card.cost });
      node.dataset.index = String(index);
      if (selected === index) node.classList.add('selected');
      node.addEventListener('click', () => onCardClick && onCardClick(index));
      cards.append(node);
    });
    playerHand.append(cards);

    // The log: the last few events, newest first.
    logBox.replaceChildren();
    for (const line of state.log) logBox.append(el('div', 'log-line', line));

    endTurnBtn.disabled = screen !== SCREEN_PLAY || state.over;

    // Overlays.
    if (screen === SCREEN_TITLE) {
      titleOverlay.classList.remove('hidden');
      endOverlay.classList.add('hidden');
    } else if (screen === SCREEN_WIN || screen === SCREEN_LOSS) {
      titleOverlay.classList.add('hidden');
      endOverlay.classList.remove('hidden');
      const win = screen === SCREEN_WIN;
      endOverlay.querySelector('#end-title').textContent = win ? '👑 THE COURT IS YOURS!' : '🕯 THE COURT KEEPS HER';
      endOverlay.querySelector('#end-sub').textContent = win
        ? 'The Ashen Duchess bows. Your embers burn brightest.'
        : 'Your embers go out. The Duchess keeps the court — for now.';
      endOverlay.querySelector('#end-score').textContent = `Score ${score} · ${state.round} rounds · ${state.damageDealt} damage dealt`;
      endOverlay.querySelector('#end-life').textContent = `You ${player.life} ♥ — Duchess ${enemy.life} ♥`;
      endOverlay.classList.toggle('win', win);
      endOverlay.classList.toggle('loss', !win);
    } else {
      titleOverlay.classList.add('hidden');
      endOverlay.classList.add('hidden');
    }
  }

  return {
    render,
    setHandlers(handlers) {
      onCardClick = handlers.onCardClick;
      onLaneClick = handlers.onLaneClick;
      onEndTurn = handlers.onEndTurn;
      onPlayAgain = handlers.onPlayAgain;
    },
  };
}
