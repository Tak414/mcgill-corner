import type { LeaderboardProps } from './types';

function ordinal(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  return `${rank}${rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'}`;
}

function rankMark(rank: number) {
  return rank === 1 ? '✦' : rank === 2 ? '✧' : rank === 3 ? '◈' : String(rank).padStart(2, '0');
}

export function Leaderboard({ top, me }: LeaderboardProps) {
  const meInTop = me !== null && top.some((entry) => entry.user_id === me.user_id);

  return (
    <section className="leaderboard ui-card" aria-labelledby="leaderboard-title">
      <div className="leaderboard-head"><div><p className="ui-kicker">Good things travel</p><h2 id="leaderboard-title">Community board</h2><p className="ui-muted">A little curiosity goes a long way.</p></div><span className="leaderboard-trophy" aria-hidden="true">✦</span></div>
      <div className="leaderboard-columns"><span>RANK</span><span>NAME</span><span>POINTS</span></div>
      <ol className="leaderboard-list">
        {top.map((entry) => {
          const isMe = entry.user_id === me?.user_id;
          return <li className={`leaderboard-row ${isMe ? 'is-me' : ''} rank-${entry.rank}`} key={entry.user_id}>
            <span className="leaderboard-rank" aria-label={ordinal(entry.rank)}>{rankMark(entry.rank)}</span>
            <span className="leaderboard-person"><span className={`leader-avatar avatar-${entry.user_id % 5}`}>{entry.name.charAt(0).toUpperCase()}</span><strong>{entry.name}</strong>{isMe && <em>You</em>}</span>
            <strong className="leaderboard-score">{entry.points.toLocaleString()}<small> pts</small></strong>
          </li>;
        })}
      </ol>
      {me && !meInTop && <div className="leaderboard-me-outside"><span className="leaderboard-me-label">Your place</span><div className="leaderboard-row is-me"><span className="leaderboard-rank">{rankMark(me.rank)}</span><span className="leaderboard-person"><span className="leader-avatar">{me.name.charAt(0).toUpperCase()}</span><strong>{me.name}</strong><em>You</em></span><strong className="leaderboard-score">{me.points.toLocaleString()}<small> pts</small></strong></div></div>}
      {top.length === 0 && <p className="leaderboard-empty">Your first exchange could start the list.</p>}
    </section>
  );
}
