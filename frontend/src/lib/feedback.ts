/**
 * Short sounds and vibrations for exchange moments. Tones are generated with Web Audio,
 * so there are no audio files. Everything fails silently: no sound support, no vibration
 * support (iPhone Safari has no navigator.vibrate) or a muted phone just means no feedback.
 */
export type FeedbackKind = 'pending' | 'meet' | 'unlock';

/* [frequency Hz, start offset s, duration s] */
const TONES: Record<FeedbackKind, Array<[number, number, number]>> = {
  pending: [[659.25, 0, 0.12]],
  meet: [[523.25, 0, 0.18], [659.25, 0.09, 0.22], [783.99, 0.18, 0.38]],
  unlock: [[523.25, 0, 0.2], [659.25, 0.11, 0.2], [783.99, 0.22, 0.22], [1046.5, 0.34, 0.65]],
};
const VIBRATION: Record<FeedbackKind, number | number[]> = {
  pending: 15,
  meet: [30, 60, 45],
  unlock: [60, 50, 60, 50, 160],
};

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
 */
export function primeFeedback(): void {
  try {
    const c = audio();
    if (c && c.state !== 'running') void c.resume();
  } catch {
    // no audio
  }
}

function tone(c: AudioContext, frequency: number, start: number, duration: number) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.16, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(start);
  osc.stop(start + duration + 0.05);
}

function playTones(kind: FeedbackKind) {
  const c = audio();
  if (!c) return;
  const play = () => {
    const t0 = c.currentTime + 0.02;
    for (const [frequency, offset, duration] of TONES[kind]) tone(c, frequency, t0 + offset, duration);
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
