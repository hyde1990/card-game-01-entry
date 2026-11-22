// Ember Court — the deck: one job, building and drawing the two decks. The world
// owns the hands; this module only knows how a deck is made and what a draw is.
import { buildDeck, cardById } from './config.js';
import { shuffle } from './random.js';

// A fresh 24-card deck (two copies of each of the 12 catalogue cards), shuffled
// with the seeded RNG so a fixed seed always deals the same order.
export function freshDeck(random) {
  return shuffle(buildDeck(), random);
}

// Draw the top card of `deck` into `hand` when the hand has room; otherwise the
// card is lost (the world announces it). Returns the drawn card id or null.
// A deck that runs out simply stops dealing — the game ends on life, not on cards.
export function drawInto(deck, hand, maxHand) {
  if (deck.length === 0) return null;
  const id = deck.shift();
  if (hand.length >= maxHand) return null;
  hand.push(id);
  return id;
}

export { cardById };
