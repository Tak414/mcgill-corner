import { describe, expect, it } from 'vitest';
import { boardBeforeRankUp, condenseBoard, rankTier, shareOfTop, summarize } from './leaderboardStats';

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

describe('condensed board', () => {
  const board = Array.from({ length: 20 }, (_, i) => entry(i + 1, 100 + i, 2000 - i * 50));
  const shown = (rows: ReturnType<typeof condenseBoard>) =>
    rows.map((r) => (r.kind === 'entry' ? r.entry.rank : `…${r.hidden}`));

  it('shows the podium and two people either side of the viewer', () => {
    expect(shown(condenseBoard(board, board[9]))).toEqual([1, 2, 3, '…4', 8, 9, 10, 11, 12, '…8']);
  });

  it('joins the podium and the viewer when they touch', () => {
    expect(shown(condenseBoard(board, board[3]))).toEqual([1, 2, 3, 4, 5, 6, '…14']);
    expect(shown(condenseBoard(board, board[0]))).toEqual([1, 2, 3, '…17']);
  });

  it('puts a viewer outside the top 20 after a gap', () => {
    expect(shown(condenseBoard(board, entry(24, 999, 10)))).toEqual([1, 2, 3, '…20', 24]);
  });

  it('keeps short boards whole', () => {
    expect(shown(condenseBoard(board.slice(0, 4), board[3]))).toEqual([1, 2, 3, 4]);
  });

  it('places the viewer back at the old rank for the rank-up animation', () => {
    const me = board[3]; // now 4th, was 9th
    const before = boardBeforeRankUp(board, me, 9);
    expect(before.top.findIndex((e) => e.user_id === me.user_id)).toBe(8);
    expect(before.me.rank).toBe(9);
    expect(before.top).toHaveLength(20);
    // The people passed were one place higher before: no duplicate ranks around the old spot.
    expect(before.top.slice(3, 10).map((e) => e.rank)).toEqual([4, 5, 6, 7, 8, 9, 10]);
  });
});
