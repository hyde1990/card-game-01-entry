// Ember Court — procedural sound only: short WebAudio blips, no audio files, no
// network. A play is a warm pluck, damage is a low thud, a win is a rising
// arpeggio. Mute-safe: nothing is created until the first user gesture.
export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        context = new AudioContext();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') void context.resume();
    return context;
  }

  function blip(frequency, duration, type, gainValue, when = 0) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    const start = ctx.currentTime + when;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.05);
  }

  return {
    play() {
      // A warm pluck, then a fifth above it: the sound of a card landing.
      blip(523.25, 0.18, 'triangle', 0.12);
      blip(784, 0.22, 'triangle', 0.08, 0.06);
    },
    damage() {
      blip(110, 0.25, 'sawtooth', 0.12);
    },
    heal() {
      blip(392, 0.2, 'sine', 0.1);
      blip(587.33, 0.25, 'sine', 0.08, 0.08);
    },
    win() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => blip(f, 0.35, 'triangle', 0.12, i * 0.12));
    },
    lose() {
      [392, 311.13, 233.08].forEach((f, i) => blip(f, 0.4, 'sine', 0.1, i * 0.15));
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
  };
}
