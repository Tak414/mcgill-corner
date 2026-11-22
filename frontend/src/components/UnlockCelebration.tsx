import { useEffect, useRef } from 'react';
import type { UnlockCelebrationProps } from './types';
import { ZoneLabel } from './ZoneLabel';

export function UnlockCelebration({ zoneId, bonusPoints, onDone }: UnlockCelebrationProps) {
  // Stays until "Keep exploring" is pressed; focus it so keyboard and screen-reader users land on it.
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);

  return (
    <div className="unlock-celebration" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="unlock-fog" aria-hidden="true" />
      <div className="unlock-message">
        <div className="unlock-art" aria-hidden="true"><span className="unlock-ring ring-one" /><span className="unlock-ring ring-two" /><span className="unlock-spark">✦</span><span className="unlock-pin">⌖</span></div>
        <p className="ui-kicker">The map just got a little smaller</p>
        <h2 id="unlock-title"><ZoneLabel zoneId={zoneId} /> is yours.</h2>
        <p>You opened this part of Montreal together.</p>
        <div className="unlock-bonus">+{bonusPoints} <span>bonus points</span></div>
        <button ref={button} className="ui-button" type="button" onClick={onDone}>Keep exploring<span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}
