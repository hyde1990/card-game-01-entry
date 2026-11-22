// Ember Court — input: mouse clicks on cards and lanes, plus the keyboard.
// 1–7 select a hand card, 1–3 choose a lane, Enter ends the turn, Esc returns
// to the title, M mutes. The renderer owns the clicks; this module owns keys.
export const ACTION_END_TURN = 1;
export const ACTION_TITLE = 2;
export const ACTION_MUTE = 4;

export function createInput(callbacks) {
  let selected = null;

  function selectHand(index, handSize) {
    if (index >= 0 && index < handSize) {
      selected = selected === index ? null : index;
      callbacks.onSelect(selected);
    }
  }

  function onKey(event) {
    const handSize = callbacks.handSize();
    const key = event.key;
    if (key >= '1' && key <= '7') {
      selectHand(Number(key) - 1, handSize);
      return;
    }
    if (key === 'Enter') {
      callbacks.onEndTurn();
      return;
    }
    if (key === 'Escape') {
      callbacks.onTitle();
      return;
    }
    if (key === 'm' || key === 'M') {
      callbacks.onMute();
    }
  }

  // Lane keys 1–3 share the number row with hand keys: a lane key only acts
  // while a card is selected, so 1–7 select first, then 1–3 place the card.
  function onKeyWithSelection(event) {
    const key = event.key;
    if (selected !== null && key >= '1' && key <= '3') {
      callbacks.onLane(Number(key) - 1, selected);
      selected = null;
      callbacks.onSelect(null);
      return;
    }
    onKey(event);
  }

  document.addEventListener('keydown', onKeyWithSelection);

  return {
    get selected() {
      return selected;
    },
    setSelected(value) {
      selected = value;
    },
    // A lane click places the selected card, if there is one; returns whether
    // a card was actually played, so the caller can play the sound once.
    laneClicked(lane) {
      if (selected === null) return false;
      const played = callbacks.onLane(lane, selected);
      selected = null;
      callbacks.onSelect(null);
      return played;
    },
    cardClicked(index) {
      selectHand(index, callbacks.handSize());
    },
  };
}
