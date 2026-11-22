import { useEffect, useRef } from 'react';
import { Confetti } from './ExchangeResult';
import { rankTier } from './leaderboardStats';
import type { RankUpCelebrationProps } from './types';
import { useCountUp } from './useCountUp';

/** Shown on the leaderboard after the viewer's row has slid up; stays until the button is pressed. */
export function RankUpCelebration({ rank, places, nextGoal, onDone }: RankUpCelebrationProps) {
  const button = useRef<HTMLButtonElement>(null);
  useEffect(() => button.current?.focus(), []);
  // The medal counts down from the old rank to the new one.
  const climbedSoFar = useCountUp(places, 900, 250);
  const tier = rankTier(rank, 1);

  return (
    <div className="unlock-celebration rankup-celebration" role="dialog" aria-modal="true" aria-labelledby="rankup-title">
      <div className="unlock-fog" aria-hidden="true" />
      <div className="unlock-message">
        <div className="unlock-art" aria-hidden="true">
          <span className="unlock-ring ring-one" />
          <span className="unlock-ring ring-two" />
          <span className={`rankup-medal tier-${tier}`}>#{rank + places - climbedSoFar}</span>
          <Confetti pieces={20} />
        </div>
        <p className="ui-kicker">Moving up</p>
        <h2 id="rankup-title">You’re now {rank === 1 ? 'at the top' : `#${rank}`}!</h2>
        <div className="unlock-bonus" aria-label={`Up ${places} ${places === 1 ? 'place' : 'places'}`}>▲ {places} <span>{places === 1 ? 'place' : 'places'}</span></div>
        <p>
          {nextGoal === null
            ? 'Nobody has more points than you. Keep meeting people to stay there.'
            : <>Next: <strong>{nextGoal.points.toLocaleString()} pts</strong> to catch {nextGoal.name}.</>}
        </p>
        <button ref={button} className="ui-button" type="button" onClick={onDone}>Keep exploring<span aria-hidden="true">→</span></button>
      </div>
    </div>
  );
}
