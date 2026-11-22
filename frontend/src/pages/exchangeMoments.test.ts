import { describe, expect, it } from 'vitest';
import { queueResult, type NewResultMoment } from './exchangeMoments';

const zone = { zone_id: 45, exchange_count: 1, required_count: 1, unlocked: true, unlocked_now: true };
const pending = (eventId: number, partnerId: number): NewResultMoment => ({ eventId, partnerId, status: 'pending', partnerName: `P${partnerId}` });
const completed = (eventId: number, partnerId: number): NewResultMoment => ({
  eventId, partnerId, status: 'completed', partnerName: `P${partnerId}`, pointsGained: 300, zone, totalPoints: 300,
});

describe('result queue', () => {
  it('replaces the waiting card when that exchange completes', () => {
    const q1 = queueResult([], pending(1, 7), 0);
    const q2 = queueResult(q1, completed(1, 7), 1);
    expect(q2).toHaveLength(1);
    expect(q2[0]).toMatchObject({ id: 1, status: 'completed', partnerId: 7 });
  });

  it('queues a completion when no waiting card is open', () => {
    expect(queueResult([], completed(1, 7), 0)).toHaveLength(1);
  });

  it('keeps other exchanges in order', () => {
    let q = queueResult([], completed(1, 7), 0);
    q = queueResult(q, completed(2, 8), 1);
    expect(q.map((m) => m.partnerId)).toEqual([7, 8]);
  });

  it('ignores repeats of a card already queued', () => {
    const q = queueResult([], completed(1, 7), 0);
    expect(queueResult(q, completed(1, 7), 1)).toBe(q);
    expect(queueResult(q, pending(1, 7), 2)).toBe(q);
  });
});
