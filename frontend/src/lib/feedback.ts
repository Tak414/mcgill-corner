/**
 * Short sounds and vibrations for exchange moments. Tones are generated with Web Audio,
 * so there are no audio files. Everything fails silently: no sound support, no vibration
 * support (iPhone Safari has no navigator.vibrate) or a muted phone just means no feedback.
 */
/**
 * pending: soft tick (code sent, waiting) · meet: bright three-note "ding-ding-ding" ·
 * unlock: bigger four-note fanfare · reveal: a slow rising shimmer while the fog lifts ·
 * open: the final chord when the zone is clear · tap: a tiny haptic on button presses.
 */
export type FeedbackKind = 'pending' | 'meet' | 'unlock' | 'reveal' | 'open' | 'tap' | 'rankup';

/* [frequency Hz, start offset s, duration s] */
const TONES: Record<FeedbackKind, Array<[number, number, number]>> = {
  pending: [[659.25, 0, 0.12]],
  meet: [[523.25, 0, 0.18], [659.25, 0.09, 0.22], [783.99, 0.18, 0.38]],
  unlock: [[523.25, 0, 0.2], [659.25, 0.11, 0.2], [783.99, 0.22, 0.22], [1046.5, 0.34, 0.65]],
  // C major pentatonic, rising over ~2.4 s, quiet: the fog "lifting".
  reveal: [
    [523.25, 0, 0.5], [587.33, 0.3, 0.5], [659.25, 0.6, 0.5], [783.99, 0.9, 0.5],
    [880, 1.2, 0.5], [1046.5, 1.5, 0.55], [1174.66, 1.8, 0.55], [1318.51, 2.1, 0.7],
  ],
  open: [[523.25, 0, 0.9], [659.25, 0, 0.9], [783.99, 0, 0.9], [1046.5, 0.12, 1.1]],
  tap: [],
  // Quick "whoosh up" of four notes for moving up the leaderboard.
  rankup: [[392, 0, 0.12], [523.25, 0.07, 0.12], [659.25, 0.14, 0.14], [1046.5, 0.22, 0.4]],
};
const VIBRATION: Record<FeedbackKind, number | number[]> = {
  pending: 15,
  meet: [30, 60, 45],
  unlock: [60, 50, 60, 50, 160],
  // Light pulses that speed up as the fog clears, then a firm finish.
  reveal: [20, 260, 20, 200, 25, 150, 30, 110, 35, 80, 45],
  open: [80, 60, 140],
  tap: 8,
  rankup: [15, 30, 15, 30, 70],
};
const VOLUME: Record<FeedbackKind, number> = { pending: 0.12, meet: 0.16, unlock: 0.16, reveal: 0.07, open: 0.11, tap: 0, rankup: 0.14 };

let context: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  context ??= new Ctor();
  return context;
}

/**
 * Browsers only allow sound after the user has tapped something. Call this from a tap/key
 * listener; later sounds (for example when the partner finishes an exchange) can then play.
 * Taps on a main button also get a tiny haptic tick.
 */
export function primeFeedback(event?: Event): void {
  try {
    const c = audio();
    if (c && c.state !== 'running') void c.resume();
  } catch {
    // no audio
  }
  const target = event?.target;
  if (event?.type === 'pointerdown' && target instanceof Element && target.closest('.ui-button, .result-done, .bottom-tabs button')) {
    feedback('tap');
  }
}

function tone(c: AudioContext, frequency: number, start: number, duration: number, volume: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playTones(kind: FeedbackKind) {
  if (TONES[kind].length === 0) return;
  const c = audio();
  if (!c) return;
  const play = () => {
    const t0 = c.currentTime + 0.02;
    for (const [frequency, offset, duration] of TONES[kind]) tone(c, frequency, t0 + offset, duration, VOLUME[kind]);
  };
  if (c.state === 'running') play();
  else void c.resume().then(play, () => {});
}

/** Play the sound and vibration for a moment. Safe to call anywhere; never throws. */
export function feedback(kind: FeedbackKind): void {
  try {
    playTones(kind);
  } catch {
    // no audio
  }
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(VIBRATION[kind]);
  } catch {
    // no vibration
  }
}
