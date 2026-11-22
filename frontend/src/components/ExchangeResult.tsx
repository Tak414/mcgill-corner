import type { CSSProperties } from 'react';
import type { ExchangeResultProps } from './types';
import { useCountUp } from './useCountUp';
import { ZoneLabel } from './ZoneLabel';
import { zoneShortName } from './zoneNames';

/** A small burst of confetti behind the card's symbol (CSS only; hidden with reduced motion). */
export function Confetti({ pieces = 14 }: { pieces?: number }) {
  return <span className="confetti" aria-hidden="true">{Array.from({ length: pieces }, (_, i) => <i key={i} />)}</span>;
}

export function ExchangeResult(props: ExchangeResultProps) {
  const complete = props.status === 'completed';
  const meetPoints = complete ? props.pointsGained - props.bonusPoints : 0;
  const shownPoints = useCountUp(meetPoints, 700, 180);

  return (
    <div className="result-backdrop" role="presentation">
      <section className={`result-card ui-card ${complete ? 'complete' : 'pending'}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="result-art" aria-hidden="true"><span className="result-orbit orbit-a" /><span className="result-orbit orbit-b" /><span className="result-symbol">{complete ? '✦' : '···'}</span>{complete && <Confetti />}</div>
        <p className="ui-kicker">{complete ? 'A new connection' : 'Almost there'}</p>
        <h2 id="result-title">{complete ? `You met ${props.partnerName}!` : `Waiting for ${props.partnerName}`}</h2>
        {complete ? <>
          <div className="result-points" aria-label={`+${meetPoints} points for meeting`}>+{shownPoints}<span>points for meeting</span></div>
          <div className="result-zone">
            <div><span><ZoneLabel zoneId={props.zone.zone_id} /></span><strong>{props.zone.exchange_count}/{props.zone.required_count} meetups</strong></div>
            <div className="result-progress">
              <span
                className="result-progress-fill"
                style={{
                  '--from': `${Math.min(100, (Math.max(0, props.zone.exchange_count - 1) / props.zone.required_count) * 100)}%`,
                  '--to': `${Math.min(100, (props.zone.exchange_count / props.zone.required_count) * 100)}%`,
                } as CSSProperties}
              />
            </div>
          </div>
          {props.zone.unlocked_now ? (
            <p className="result-unlocked"><span aria-hidden="true">✧</span> You cleared the fog in this zone{props.bonusPoints > 0 && <strong className="result-bonus">+{props.bonusPoints} bonus</strong>}</p>
          ) : !props.zone.unlocked && props.zone.exchange_count < props.zone.required_count ? (
            <p className="result-next">
              {props.zone.required_count - props.zone.exchange_count} more {props.zone.required_count - props.zone.exchange_count === 1 ? 'meetup' : 'meetups'} to open {zoneShortName(props.zone.zone_id)}
            </p>
          ) : null}
          <p className="result-total">Your new balance <strong>{props.totalPoints.toLocaleString()} pts</strong></p>
        </> : <>
          <p className="result-copy">You shared codes with {props.partnerName}. Once they enter yours, you’ll both unlock a little more of Montreal.</p>
          <div className="waiting-indicator" aria-label="Waiting"><i /><i /><i /></div>
        </>}
        <button className="ui-button result-done" type="button" onClick={props.onClose}>{complete ? 'Lovely, thanks' : 'Back to the map'}<span aria-hidden="true">→</span></button>
      </section>
    </div>
  );
}
