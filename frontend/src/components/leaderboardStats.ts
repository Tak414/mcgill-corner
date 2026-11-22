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
