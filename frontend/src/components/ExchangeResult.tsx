import type { ExchangeResultProps } from './types';

export function ExchangeResult(props: ExchangeResultProps) {
  const complete = props.status === 'completed';

  return (
    <div className="result-backdrop" role="presentation">
      <section className={`result-card ui-card ${complete ? 'complete' : 'pending'}`} role="dialog" aria-modal="true" aria-labelledby="result-title">
        <div className="result-art" aria-hidden="true"><span className="result-orbit orbit-a" /><span className="result-orbit orbit-b" /><span className="result-symbol">{complete ? '✦' : '···'}</span></div>
        <p className="ui-kicker">{complete ? 'A new connection' : 'Almost there'}</p>
        <h2 id="result-title">{complete ? `You met ${props.partnerName}!` : `Waiting for ${props.partnerName}`}</h2>
        {complete ? <>
          <div className="result-points">+{props.pointsGained}<span>points</span></div>
          <div className="result-zone"><div><span>Zone {props.zone.zone_id}</span><strong>{props.zone.exchange_count}/{props.zone.required_count} meetups</strong></div><div className="result-progress"><span style={{ width: `${Math.min(100, (props.zone.exchange_count / props.zone.required_count) * 100)}%` }} /></div></div>
          {props.zone.unlocked_now && <p className="result-unlocked"><span aria-hidden="true">✧</span> You cleared the fog in this zone</p>}
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
