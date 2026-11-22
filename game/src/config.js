// Ember Court — rules constants: the four suits, the card list and the numbers
// every other module shares. Suits are told apart by colour AND shape, never by
// text alone: each suit carries a colour, a glyph and a shape word.
export const MAX_LIFE = 20;
export const MAX_EMBERS = 10;
export const MAX_HAND = 7;
export const MAX_LANE_CREATURES = 4;
export const LANES = 3;
export const START_HAND = 5;

export const SUITS = {
  flame: { key: 'flame', label: 'Flame', color: '#e5484d', dark: '#8f1d20', glyph: '🔥', shape: 'flame' },
  tide: { key: 'tide', label: 'Tide', color: '#3e8fe0', dark: '#174a7d', glyph: '🌊', shape: 'wave' },
  thorn: { key: 'thorn', label: 'Thorn', color: '#46a35e', dark: '#1d5c2e', glyph: '🌿', shape: 'leaf' },
  star: { key: 'star', label: 'Star', color: '#e8a91c', dark: '#8a5f05', glyph: '⭐', shape: 'star' },
};

// Card catalogue. `kind` is creature or spell. Creatures carry attack/health;
// spells carry an effect. `ability` is a short keyword the world resolves.
export const CARDS = [
  { id: 'ember-imp', name: 'Ember Imp', suit: 'flame', kind: 'creature', cost: 1, attack: 1, health: 1, text: 'A spark with teeth.' },
  { id: 'cinder-fox', name: 'Cinder Fox', suit: 'flame', kind: 'creature', cost: 2, attack: 2, health: 2, text: 'Quick as a flare.' },
  { id: 'flame-wyrm', name: 'Flame Wyrm', suit: 'flame', kind: 'creature', cost: 4, attack: 4, health: 3, text: 'It eats the dark.' },
  { id: 'tide-singer', name: 'Tide Singer', suit: 'tide', kind: 'creature', cost: 2, attack: 2, health: 2, text: 'Her song pulls the sea.' },
  { id: 'tide-herald', name: 'Tide Herald', suit: 'tide', kind: 'creature', cost: 3, attack: 3, health: 3, text: 'The tide arrives early.' },
  { id: 'tide-leviathan', name: 'Tide Leviathan', suit: 'tide', kind: 'creature', cost: 5, attack: 4, health: 5, text: 'The whole ocean, angry.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', suit: 'thorn', kind: 'creature', cost: 1, attack: 1, health: 2, text: 'Small. Sharp. Patient.' },
  { id: 'thorn-warden', name: 'Thorn Warden', suit: 'thorn', kind: 'creature', cost: 2, attack: 1, health: 4, ability: 'guard', text: 'Guard: blocks face damage in its lane.' },
  { id: 'thorn-bramble', name: 'Thorn Bramble', suit: 'thorn', kind: 'creature', cost: 3, attack: 2, health: 3, text: 'It grows where it falls.' },
  { id: 'star-moth', name: 'Star Moth', suit: 'star', kind: 'creature', cost: 2, attack: 2, health: 1, ability: 'draw', text: 'Draw a card when played.' },
  { id: 'star-seer', name: 'Star Seer', suit: 'star', kind: 'creature', cost: 3, attack: 3, health: 2, text: 'She has seen this turn.' },
  { id: 'star-phoenix', name: 'Star Phoenix', suit: 'star', kind: 'creature', cost: 5, attack: 4, health: 4, text: 'It burns, then returns.' },
  { id: 'ember-burst', name: 'Ember Burst', suit: 'flame', kind: 'spell', cost: 2, effect: 'burst', text: 'Deal 2 damage in a lane, or to the rival if it is empty.' },
  { id: 'still-water', name: 'Still Water', suit: 'tide', kind: 'spell', cost: 2, effect: 'heal', text: 'Restore 3 life.' },
  { id: 'root-snare', name: 'Root Snare', suit: 'thorn', kind: 'spell', cost: 2, effect: 'freeze', text: 'Freeze a lane: its creatures cannot strike this round.' },
  { id: 'falling-star', name: 'Falling Star', suit: 'star', kind: 'spell', cost: 3, effect: 'starfall', text: 'Deal 1 damage to all enemy creatures.' },
];

// The deck is two copies of every catalogue card, shuffled with the seeded RNG.
export function buildDeck() {
  const deck = [];
  for (const card of CARDS) deck.push(card.id, card.id);
  return deck;
}

export function cardById(id) {
  return CARDS.find((card) => card.id === id);
}

// Combos, named on the table when they fire:
// Kindled — a Flame and a Thorn creature share one of your lanes: +1 attack each.
// High Tide — a Tide and a Star card played on the same turn: draw a card.
export const COMBO_KINDLED = 'Kindled';
export const COMBO_HIGH_TIDE = 'High Tide';
