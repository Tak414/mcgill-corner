import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { boardBeforeRankUp, condenseBoard, rankTier, shareOfTop, summarize } from './leaderboardStats';
import type { LeaderboardEntry, LeaderboardProps } from './types';

/* How long the old position shows before the viewer's row slides up, and how long the slide takes. */
const RANK_UP_DELAY_MS = 700;
const SLIDE_MS = 750;

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function ordinal(rank: number) {
  if (rank % 100 >= 11 && rank % 100 <= 13) return `${rank}th`;
  return `${rank}${rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'}`;
}

type RowProps = { entry: LeaderboardEntry; isMe: boolean; topScore: number; climbed: number; rowRef: (el: HTMLLIElement | null) => void };

function Row({ entry, isMe, topScore, climbed, rowRef }: RowProps) {
  const tier = rankTier(entry.rank, topScore);
  const share = shareOfTop(entry.points, topScore);
  return (
    <li ref={rowRef} className={`leaderboard-row${isMe ? ' is-me' : ''}${climbed > 0 ? ' just-climbed' : ''}`}>
      <span className={`leaderboard-rank tier-${tier}`} aria-label={ordinal(entry.rank)}>{entry.rank}</span>
      <span className="leaderboard-person">
        <span className={`leader-avatar avatar-${entry.user_id % 5}`} aria-hidden="true">{entry.name.charAt(0).toUpperCase()}</span>
        <strong>{entry.name}</strong>
        {isMe && <em>You</em>}
        {climbed > 0 && <span className="rank-climb" aria-label={`Up ${climbed} ${climbed === 1 ? 'place' : 'places'}`}>▲ {climbed}</span>}
      </span>
      <strong className="leaderboard-score">{entry.points.toLocaleString()}<small> pts</small></strong>
      <span className="leaderboard-bar" aria-hidden="true"><span style={{ width: `${share}%` }} /></span>
    </li>
  );
}

export function Leaderboard({ top, me, previousRank = null, onRankUp }: LeaderboardProps) {
  const climbed = me !== null && previousRank !== null && previousRank > me.rank ? previousRank - me.rank : 0;
  // Rank-up: first show the board as it was (viewer at the old rank), then let the row slide up.
  // Remember which climb has played (old → new rank), so new props replay it and re-renders don't.
  const climbKey = climbed > 0 && me !== null ? `${previousRank}>${me.rank}` : null;
  const [playedKey, setPlayedKey] = useState<string | null>(() => (reducedMotion() ? climbKey : null));
  const settled = climbKey === null || playedKey === climbKey;
  const onRankUpRef = useRef(onRankUp);
  useEffect(() => {
    onRankUpRef.current = onRankUp;
  });
  useEffect(() => {
    if (settled || climbKey === null) return;
    const timer = setTimeout(() => {
      setPlayedKey(climbKey);
      onRankUpRef.current?.(climbed);
    }, RANK_UP_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settled, climbKey, climbed]);

  const shown = !settled && me !== null && previousRank !== null ? boardBeforeRankUp(top, me, previousRank) : { top, me };
  const rows = condenseBoard(shown.top, shown.me);
  const { topScore, toFirst } = summarize(top, me);
  const myTier = me ? rankTier(me.rank, topScore) : null;

  // FLIP: rows that stay on screen glide from where they were to where they are now.
  const rowEls = useRef(new Map<number, HTMLLIElement>());
  const lastTops = useRef(new Map<number, number>());
  useLayoutEffect(() => {
    const nextTops = new Map<number, number>();
    rowEls.current.forEach((el, id) => {
      const nowTop = el.getBoundingClientRect().top;
      nextTops.set(id, nowTop);
      const before = lastTops.current.get(id);
      if (before === undefined || reducedMotion() || typeof el.animate !== 'function') return;
      const dy = before - nowTop;
      if (Math.abs(dy) > 1) {
        el.animate([{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0)' }], { duration: SLIDE_MS, easing: 'cubic-bezier(.2,.8,.2,1)' });
      }
    });
    lastTops.current = nextTops;
  });
  const refFor = (id: number) => (el: HTMLLIElement | null) => {
    if (el) rowEls.current.set(id, el);
    else rowEls.current.delete(id);
  };

  return (
    <section className="leaderboard ui-card" aria-labelledby="leaderboard-title">
      <div className="leaderboard-head">
        <div>
          <p className="ui-kicker">Good things travel</p>
          <h2 id="leaderboard-title">Community board</h2>
          <p className="ui-muted">A little curiosity goes a long way.</p>
        </div>
        {me ? (
          <div className={`leaderboard-emblem tier-${myTier}${settled && climbed > 0 ? ' just-climbed' : ''}`} aria-label={`Your rank: ${ordinal(me.rank)}`}>
            <small>Rank</small>
            <strong>#{shown.me?.rank ?? me.rank}</strong>
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

      {rows.length > 0 && <div className="leaderboard-columns" aria-hidden="true"><span>Rank</span><span>Name</span><span>Points</span></div>}
      <ol className="leaderboard-list">
        {rows.map((row) =>
          row.kind === 'gap' ? (
            <li key={row.key} className="leaderboard-gap">
              <span aria-hidden="true">⋯</span> {row.hidden} more {row.hidden === 1 ? 'explorer' : 'explorers'}
            </li>
          ) : (
            <Row
              key={row.entry.user_id}
              entry={row.entry}
              isMe={row.entry.user_id === me?.user_id}
              topScore={topScore}
              climbed={settled && row.entry.user_id === me?.user_id ? climbed : 0}
              rowRef={refFor(row.entry.user_id)}
            />
          ),
        )}
      </ol>
      {top.length === 0 && <p className="leaderboard-empty">Your first exchange could start the list.</p>}
    </section>
  );
}
