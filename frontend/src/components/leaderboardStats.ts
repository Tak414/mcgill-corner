import type { LeaderboardEntry } from './types';

/** 1–3 get their own badge colour; everyone else is a plain number. */
export type RankTier = 1 | 2 | 3 | 'rest';

/** Before anyone scores, everyone ties at rank 1: no medals until someone has points. */
export function rankTier(rank: number, topScore: number): RankTier {
  if (topScore <= 0) return 'rest';
  return rank === 1 || rank === 2 || rank === 3 ? rank : 'rest';
}

export type LeaderboardSummary = {
  /** Highest score on the board (0 when nobody has points yet). */
  topScore: number;
  /** Points the viewer still needs to reach the top score; 0 when they lead; null without a viewer or while nobody has points. */
  toFirst: number | null;
};

/** Worked out from the leaderboard response alone; ties share a rank, so "leading" means "has the top score". */
export function summarize(top: LeaderboardEntry[], me: LeaderboardEntry | null): LeaderboardSummary {
  const topScore = top.reduce((max, entry) => Math.max(max, entry.points), me?.points ?? 0);
  const toFirst = me === null || topScore === 0 ? null : Math.max(0, topScore - me.points);
  return { topScore, toFirst };
}

/** Width of a row's progress bar: share of the top score, 0–100. */
export function shareOfTop(points: number, topScore: number): number {
  if (topScore <= 0 || points <= 0) return 0;
  return Math.min(100, Math.round((points / topScore) * 1000) / 10);
}

/** A row in the condensed board: a person, or a "⋯ N more" gap standing for hidden people. */
export type BoardRow = { kind: 'entry'; entry: LeaderboardEntry } | { kind: 'gap'; hidden: number; key: string };

/**
 * Keep the board short: the top `podium` people and `around` people either side of the viewer,
 * with each skipped stretch shown as one gap. Without a viewer, just the top podium + around.
 * A viewer outside the list (rank beyond the top 20) is added at the end after a gap.
 */
export function condenseBoard(top: LeaderboardEntry[], me: LeaderboardEntry | null, podium = 3, around = 2): BoardRow[] {
  const myIndex = me === null ? -1 : top.findIndex((entry) => entry.user_id === me.user_id);
  const keep = new Set<number>();
  for (let i = 0; i < Math.min(podium, top.length); i++) keep.add(i);
  if (myIndex >= 0) {
    for (let i = Math.max(0, myIndex - around); i <= Math.min(top.length - 1, myIndex + around); i++) keep.add(i);
  } else if (me === null) {
    for (let i = podium; i < Math.min(top.length, podium + around); i++) keep.add(i);
  }

  const rows: BoardRow[] = [];
  let hidden = 0;
  top.forEach((entry, i) => {
    if (keep.has(i)) {
      if (hidden > 0) rows.push({ kind: 'gap', hidden, key: `gap-before-${entry.user_id}` });
      hidden = 0;
      rows.push({ kind: 'entry', entry });
    } else {
      hidden += 1;
    }
  });
  if (me !== null && myIndex === -1) {
    // Everyone after the last shown row up to the viewer is hidden (we only know the count roughly).
    const between = Math.max(hidden, me.rank - 1 - (rows.length > 0 ? lastRank(rows) : 0));
    if (between > 0) rows.push({ kind: 'gap', hidden: between, key: 'gap-before-me' });
    rows.push({ kind: 'entry', entry: me });
  } else if (hidden > 0) {
    rows.push({ kind: 'gap', hidden, key: 'gap-end' });
  }
  return rows;
}

function lastRank(rows: BoardRow[]): number {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (row.kind === 'entry') return row.entry.rank;
  }
  return 0;
}

/**
 * The board as it looked before the viewer moved up: the viewer placed back at `previousRank`
 * (showing that rank). Used for the first frame of the rank-up animation.
 */
export function boardBeforeRankUp(top: LeaderboardEntry[], me: LeaderboardEntry, previousRank: number): { top: LeaderboardEntry[]; me: LeaderboardEntry } {
  const oldMe = { ...me, rank: previousRank };
  // People the viewer overtook were one place higher before.
  const others = top
    .filter((entry) => entry.user_id !== me.user_id)
    .map((entry) => (entry.rank > me.rank && entry.rank <= previousRank ? { ...entry, rank: entry.rank - 1 } : entry));
  if (previousRank > top.length && !top.some((entry) => entry.user_id === me.user_id)) return { top, me: oldMe };
  if (previousRank > top.length) return { top: others, me: oldMe };
  const index = Math.min(others.length, Math.max(0, previousRank - 1));
  return { top: [...others.slice(0, index), oldMe, ...others.slice(index)], me: oldMe };
}
