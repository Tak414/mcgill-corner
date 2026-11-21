import { useEffect } from 'react';
import type { UnlockCelebrationProps } from './types';

export function UnlockCelebration({ zoneId, bonusPoints, onDone }: UnlockCelebrationProps) {
  useEffect(() => {
    const timer = window.setTimeout(onDone, 3200);
    return () => window.clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="unlock-celebration" role="dialog" aria-modal="true" aria-labelledby="unlock-title">
      <div className="unlock-fog" aria-hidden="true" />
      <div className="unlock-message">
        <div className="unlock-art" aria-hidden="true"><span className="unlock-ring ring-one" /><span className="unlock-ring ring-two" /><span className="unlock-spark">✦</span><span className="unlock-pin">⌖</span></div>
        <p className="ui-kicker">The map just got a little smaller</p>
        <h2 id="unlock-title">Zone {zoneId} is yours.</h2>
        <p>You opened this part of Montreal together.</p>
        <div className="unlock-bonus">+{bonusPoints} <span>bonus points</span></div>
        <button className="ui-button" type="button" onClick={onDone}>Keep exploring<span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}
