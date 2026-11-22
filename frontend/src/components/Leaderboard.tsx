import { rankTier, shareOfTop, summarize } from './leaderboardStats';
import type { LeaderboardEntry, LeaderboardProps } from './types';

function ordinal(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  return `${rank}${rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'}`;
}

function Row({ entry, isMe, topScore }: { entry: LeaderboardEntry; isMe: boolean; topScore: number }) {
  const tier = rankTier(entry.rank, topScore);
  const share = shareOfTop(entry.points, topScore);
  return (
    <li className={`leaderboard-row${isMe ? ' is-me' : ''}`}>
      <span className={`leaderboard-rank tier-${tier}`} aria-label={ordinal(entry.rank)}>{entry.rank}</span>
      <span className="leaderboard-person">
        <span className={`leader-avatar avatar-${entry.user_id % 5}`} aria-hidden="true">{entry.name.charAt(0).toUpperCase()}</span>
        <strong>{entry.name}</strong>
        {isMe && <em>You</em>}
      </span>
      <strong className="leaderboard-score">{entry.points.toLocaleString()}<small> pts</small></strong>
      <span className="leaderboard-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
    </li>
  );
}

export function Leaderboard({ top, me }: LeaderboardProps) {
  const meInTop = me !== null && top.some((entry) => entry.user_id === me.user_id);
  const { topScore, toFirst } = summarize(top, me);
  const myTier = me ? rankTier(me.rank, topScore) : null;

  return (
    <section className="leaderboard ui-card" aria-labelledby="leaderboard-title">
      <div className="leaderboard-head">
        <div>
          <p className="ui-kicker">Good things travel</p>
          <h2 id="leaderboard-title">Community board</h2>
          <p className="ui-muted">A little curiosity goes a long way.</p>
        </div>
        {me ? (
          <div className={`leaderboard-emblem tier-${myTier}`} aria-label={`Your rank: ${ordinal(me.rank)}`}>
            <small>Rank</small>
            <strong>#{me.rank}</strong>
          </div>
        ) : (
          <span className="leaderboard-emblem" aria-hidden="true">✦</span>
        )}
      </div>

      <dl className="leaderboard-stats">
        <div><dt>Top score</dt><dd>{topScore.toLocaleString()}</dd></div>
        {me && <div><dt>Your points</dt><dd>{me.points.toLocaleString()}</dd></div>}
        {toFirst !== null && (
          <div className={toFirst === 0 ? 'is-leading' : ''}><dt>To #1</dt><dd>{toFirst === 0 ? 'Leading' : `+${toFirst.toLocaleString()}`}</dd></div>
        )}
      </dl>

      {top.length > 0 && <div className="leaderboard-columns" aria-hidden="true"><span>Rank</span><span>Name</span><span>Points</span></div>}
      <ol className="leaderboard-list">
        {top.map((entry) => <Row key={entry.user_id} entry={entry} isMe={entry.user_id === me?.user_id} topScore={topScore} />)}
      </ol>
      {me && !meInTop && (
        <div className="leaderboard-me-outside">
          <span className="leaderboard-me-label">Your place</span>
          <ol className="leaderboard-list" start={me.rank}><Row entry={me} isMe topScore={topScore} /></ol>
        </div>
      )}
      {top.length === 0 && <p className="leaderboard-empty">Your first exchange could start the list.</p>}
    </section>
  );
}
