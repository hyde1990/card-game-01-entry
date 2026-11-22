// Ember Court — the world: state, turns, embers, drawing, playing cards, combat,
// win and loss. Pure rules, no DOM: the renderer and the shot autopilot both
// drive the game through this module, so a screenshot is a real game state.
import { buildDeck, cardById, LANES, MAX_EMBERS, MAX_HAND, MAX_LANE_CREATURES, MAX_LIFE, START_HAND } from './config.js';
import { shuffle } from './random.js';

let nextUid = 1;

function makeCreature(card) {
  return {
    uid: nextUid,
    cardId: card.id,
    name: card.name,
    suit: card.suit,
    attack: card.attack,
    health: card.health,
    maxHealth: card.health,
    ability: card.ability ?? null,
    kind: 'creature',
  };
}

function makeSide(random) {
  return { life: MAX_LIFE, hand: [], deck: shuffle(buildDeck(), random), lanes: [[], [], []], embers: 1 };
}

export function effectiveAttack(creature, laneCreatures) {
  const suits = new Set(laneCreatures.map((c) => c.suit));
  const kindled = suits.has('flame') && suits.has('thorn');
  return creature.attack + (kindled ? 1 : 0);
}

export function createWorld(random) {
  const state = {
    round: 0,
    phase: 'player',
    over: false,
    winner: null,
    frozen: [false, false, false],
    log: [],
    intent: '',
    damageDealt: 0,
    damageTaken: 0,
    combos: [],
    highTideThisTurn: false,
    playedSuitsThisTurn: [],
    player: makeSide(random),
    enemy: makeSide(random),
  };

  function say(text) {
    state.log.unshift(text);
    if (state.log.length > 6) state.log.length = 6;
  }

  function drawCard(side) {
    const who = state[side];
    if (who.deck.length === 0) return null;
    if (who.hand.length >= MAX_HAND) {
      who.deck.shift();
      say(`${side === 'player' ? 'You' : 'The Duchess'} had a full hand; a card is lost.`);
      return null;
    }
    const id = who.deck.shift();
    who.hand.push(id);
    return id;
  }

  function startRound() {
    state.round += 1;
    state.player.embers = Math.min(state.round, MAX_EMBERS);
    state.enemy.embers = Math.min(state.round, MAX_EMBERS);
    state.frozen = [false, false, false];
    state.highTideThisTurn = false;
    state.playedSuitsThisTurn = [];
    drawCard('player');
    drawCard('enemy');
    say(`Round ${state.round} — embers rise to ${state.player.embers}.`);
  }

  function reset() {
    nextUid = 1;
    state.round = 0;
    state.phase = 'player';
    state.over = false;
    state.winner = null;
    state.frozen = [false, false, false];
    state.log = [];
    state.intent = 'The Duchess shuffles her deck, watching you.';
    state.damageDealt = 0;
    state.damageTaken = 0;
    state.combos = [];
    state.highTideThisTurn = false;
    state.playedSuitsThisTurn = [];
    state.player = makeSide(random);
    state.enemy = makeSide(random);
    for (let i = 0; i < START_HAND - 1; i += 1) {
      drawCard('player');
      drawCard('enemy');
    }
    startRound();
  }

  function laneHasGuard(creatures) {
    return creatures.some((c) => c.ability === 'guard');
  }

  // Resolve a spell. `lane` is the lane the spell points at (0–2), or null.
  function castSpell(side, card, lane) {
    const foe = side === 'player' ? 'enemy' : 'player';
    const me = state[side];
    const them = state[foe];
    const who = side === 'player' ? 'You' : 'The Duchess';
    if (card.effect === 'burst') {
      const targetLane = lane ?? 0;
      const target = them.lanes[targetLane][0];
      if (target) {
        const dealt = Math.min(2, target.health);
        target.health -= 2;
        say(`${who} cast Ember Burst: ${target.name} takes 2.`);
        if (side === 'player') state.damageDealt += dealt;
      } else {
        const dealt = Math.min(2, them.life);
        them.life = Math.max(0, them.life - 2);
        say(`${who} cast Ember Burst: ${foe === 'enemy' ? 'the Duchess' : 'you'} take 2.`);
        if (side === 'player') state.damageDealt += dealt;
        else state.damageTaken += dealt;
      }
    } else if (card.effect === 'heal') {
      me.life = Math.min(MAX_LIFE, me.life + 3);
      say(`${who} cast Still Water and heals 3.`);
    } else if (card.effect === 'freeze') {
      const targetLane = lane ?? 0;
      state.frozen[targetLane] = true;
      say(`${who} cast Root Snare: lane ${targetLane + 1} is frozen solid.`);
    } else if (card.effect === 'starfall') {
      for (let l = 0; l < LANES; l += 1) {
        for (const creature of them.lanes[l]) creature.health -= 1;
      }
      say(`${who} cast Falling Star: every enemy creature takes 1.`);
      if (side === 'player') state.damageDealt += them.lanes.flat().length;
    }
    // Clean up creatures killed by a spell.
    for (let l = 0; l < LANES; l += 1) {
      them.lanes[l] = them.lanes[l].filter((c) => c.health > 0);
    }
  }

  function checkCombos(side) {
    const suits = new Set(state.playedSuitsThisTurn);
    if (suits.has('tide') && suits.has('star') && !state.highTideThisTurn) {
      state.highTideThisTurn = true;
      state.combos.push('High Tide');
      drawCard(side);
      say('High Tide! Tide + Star in one turn — draw a card.');
    }
    // Kindled is a standing lane bonus, checked at combat time.
    for (let l = 0; l < LANES; l += 1) {
      const laneSuits = new Set(state[side].lanes[l].map((c) => c.suit));
      if (laneSuits.has('flame') && laneSuits.has('thorn') && !state.combos.includes(`Kindled lane ${l + 1}`)) {
        state.combos.push(`Kindled lane ${l + 1}`);
        say(`Kindled! Flame + Thorn share lane ${l + 1}: +1 attack.`);
      }
    }
  }

  function playCard(side, handIndex, lane) {
    if (state.over || state.phase !== 'player' && side === 'player') return null;
    const who = state[side];
    const cardId = who.hand[handIndex];
    if (cardId === undefined) return null;
    const card = cardById(cardId);
    if (!card || who.embers < card.cost) return null;
    if (card.kind === 'creature' && (lane === null || lane === undefined || lane < 0 || lane >= LANES)) return null;
    if (card.kind === 'creature' && who.lanes[lane].length >= MAX_LANE_CREATURES) return null;
    if (card.kind === 'spell' && card.effect !== 'heal' && card.effect !== 'starfall' && (lane === null || lane === undefined || lane < 0 || lane >= LANES)) return null;

    who.hand.splice(handIndex, 1);
    who.embers -= card.cost;
    state.playedSuitsThisTurn.push(card.suit);
    const whoName = side === 'player' ? 'You' : 'The Duchess';
    if (card.kind === 'creature') {
      const creature = makeCreature(card);
      who.lanes[lane].push(creature);
      say(`${whoName} play ${card.name} (${card.suit}) in lane ${lane + 1}.`);
      if (card.ability === 'draw') drawCard(side);
    } else {
      castSpell(side, card, lane);
    }
    checkCombos(side);
    checkEnd();
    return card;
  }

  // One combat round: creatures strike across their lane at the same time.
  // A frozen lane's creatures do not strike. A guard takes face damage for its lane.
  function combat() {
    const hits = [];
    for (let l = 0; l < LANES; l += 1) {
      if (state.frozen[l]) {
        say(`Lane ${l + 1} is frozen — no strikes there.`);
        continue;
      }
      for (const [attacker, defender] of [['player', 'enemy'], ['enemy', 'player']]) {
        for (const creature of state[attacker].lanes[l]) {
          const atk = effectiveAttack(creature, state[attacker].lanes[l]);
          const foes = state[defender].lanes[l];
          if (foes.length > 0) {
            const target = laneHasGuard(foes) ? foes.find((c) => c.ability === 'guard') : foes[0];
            hits.push({ target, damage: atk, lane: l, from: attacker });
          } else {
            hits.push({ face: defender, damage: atk, lane: l, from: attacker });
          }
        }
      }
    }
    for (const hit of hits) {
      if (hit.target) {
        hit.target.health -= hit.damage;
        say(`${hit.from === 'player' ? 'Your' : 'Her'} creature strikes lane ${hit.lane + 1} for ${hit.damage}.`);
      } else {
        const side = state[hit.face];
        const dealt = Math.min(hit.damage, side.life);
        side.life = Math.max(0, side.life - hit.damage);
        if (hit.face === 'enemy') state.damageDealt += dealt;
        else state.damageTaken += dealt;
        say(`${hit.from === 'player' ? 'You strike' : 'The Duchess strikes'} lane ${hit.lane + 1} for ${hit.damage} to the face.`);
      }
    }
    for (let l = 0; l < LANES; l += 1) {
      state.player.lanes[l] = state.player.lanes[l].filter((c) => c.health > 0);
      state.enemy.lanes[l] = state.enemy.lanes[l].filter((c) => c.health > 0);
    }
  }

  function checkEnd() {
    if (state.over) return;
    if (state.enemy.life <= 0) {
      state.over = true;
      state.winner = 'player';
      state.phase = 'over';
      say('The Duchess falls. The Ember Court is yours!');
    } else if (state.player.life <= 0) {
      state.over = true;
      state.winner = 'enemy';
      state.phase = 'over';
      say('Your embers go out. The Duchess keeps the court.');
    }
  }

  function score() {
    return state.round + state.damageDealt;
  }

  // The player's End Turn: the Duchess takes her turn (ai.js decides), then
  // combat, then a new round — unless someone already won.
  function endPlayerTurn(aiTakeTurn) {
    if (state.over || state.phase !== 'player') return;
    state.phase = 'enemy';
    // The Duchess's suits are her own turn: clear the player's suits so her
    // Tide cannot combine with the player's Star (or vice versa).
    state.playedSuitsThisTurn = [];
    aiTakeTurn(state);
    checkEnd();
    if (!state.over) {
      combat();
      checkEnd();
    }
    if (!state.over) {
      state.phase = 'player';
      startRound();
    }
  }

  return { state, reset, drawCard, playCard, combat, endPlayerTurn, checkEnd, score, say };
}
