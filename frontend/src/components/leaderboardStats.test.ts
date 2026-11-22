import { describe, expect, it } from 'vitest';
import { rankTier, shareOfTop, summarize } from './leaderboardStats';

const entry = (rank: number, user_id: number, points: number) => ({ rank, user_id, name: `U${user_id}`, points });

describe('leaderboard summary', () => {
  const top = [entry(1, 9, 3400), entry(1, 11, 3400), entry(3, 5, 2950), entry(4, 3, 2600)];

  it('reports the top score and the gap to it', () => {
    expect(summarize(top, entry(4, 3, 2600))).toEqual({ topScore: 3400, toFirst: 800 });
  });

  it('treats a tie at the top as leading', () => {
    expect(summarize(top, entry(1, 11, 3400)).toFirst).toBe(0);
  });

  it('works when the viewer is outside the top list', () => {
    expect(summarize(top, entry(24, 24, 420))).toEqual({ topScore: 3400, toFirst: 2980 });
  });

  it('has no gap without a viewer or before anyone scores', () => {
    expect(summarize(top, null).toFirst).toBeNull();
    expect(summarize([entry(1, 1, 0), entry(1, 2, 0)], entry(1, 1, 0))).toEqual({ topScore: 0, toFirst: null });
    expect(summarize([], null)).toEqual({ topScore: 0, toFirst: null });
  });

  it('sizes progress bars against the top score', () => {
    expect(shareOfTop(3400, 3400)).toBe(100);
    expect(shareOfTop(1700, 3400)).toBe(50);
    expect(shareOfTop(0, 3400)).toBe(0);
    expect(shareOfTop(100, 0)).toBe(0);
  });

  it('gives ranks 1–3 their own tier, shared by ties', () => {
    expect([1, 1, 3, 4, 12].map((rank) => rankTier(rank, 3400))).toEqual([1, 1, 3, 'rest', 'rest']);
    expect(rankTier(2, 3400)).toBe(2);
  });

  it('gives no medals while nobody has points (everyone ties at #1)', () => {
    expect(rankTier(1, 0)).toBe('rest');
  });
});
