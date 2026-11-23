import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { handleDemoRequest, resetDemo } from './demoServer';

type Json = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const call = (method: 'GET' | 'POST' | 'DELETE', path: string, token: string | null, body?: unknown, query: Record<string, string | undefined> = {}) =>
  handleDemoRequest(method, path, query, body, token) as Promise<Json>;

async function signIn(email: string, password = 'unlock123') {
  return (await call('POST', '/login', null, { email, password })).token as string;
}

describe('demo server', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout'] });
    vi.setSystemTime(new Date('2026-11-22T16:00:00Z'));
    resetDemo();
  });
  afterEach(() => vi.useRealTimers());

  /** Runs the demo server's small fake latency; the outcome is captured first so a rejection is never unhandled. */
  const settle = async <T,>(promise: Promise<T>): Promise<T> => {
    const outcome = promise.then((value) => ({ ok: true as const, value }), (error: unknown) => ({ ok: false as const, error }));
    await vi.advanceTimersByTimeAsync(200);
    const result = await outcome;
    if (result.ok === true) return result.value;
    throw result.error;
  };

  it('starts attendee1 at #9 and attendee2 at #10, like the seeded server', async () => {
    const a1 = await settle(signIn('attendee1@unlock.test'));
    const a2 = await settle(signIn('attendee2@unlock.test'));
    expect((await settle(call('GET', '/leaderboard', a1))).me).toMatchObject({ rank: 9, points: 400 });
    expect((await settle(call('GET', '/leaderboard', a2))).me).toMatchObject({ rank: 10, points: 300 });
  });

  it('lists the six real events in their zones, with codes open', async () => {
    const token = await settle(signIn('attendee1@unlock.test'));
    const events = (await settle(call('GET', '/events', token))) as unknown as Json[];
    expect(events.map((e) => e.zone_id).sort()).toEqual([23, 24, 35, 45, 55, 56]);
    expect(events.every((e) => e.code_window === 'open')).toBe(true);
  });

  it('meeting the demo partner completes a few seconds later, unlocks the zone and climbs to #6', async () => {
    const token = await settle(signIn('attendee1@unlock.test'));
    const pollack = ((await settle(call('GET', '/events', token))) as unknown as Json[]).find((e) => e.zone_id === 45)!;
    const rsvp = await settle(call('POST', `/events/${pollack.id}/rsvp`, token));
    expect(rsvp.my_code).toMatch(/^\d{4}$/);

    const since = (await settle(call('GET', '/me/exchanges', token))).server_time as string;
    expect(await settle(call('POST', `/events/${pollack.id}/exchange`, token, { code: '2468' }))).toMatchObject({ status: 'pending', partner: { name: 'Sophie Tremblay' } });

    await vi.advanceTimersByTimeAsync(4500);
    const feed = await settle(call('GET', '/me/exchanges', token, undefined, { since }));
    expect(feed.exchanges).toHaveLength(1);
    expect(feed.exchanges[0]).toMatchObject({ points_gained: 300, unlocked_now: true, zone_id: 45, partner: { name: 'Sophie Tremblay' } });
    expect((await settle(call('GET', '/leaderboard', token))).me).toMatchObject({ rank: 6, points: 700 });
    expect((await settle(call('GET', `/events/${pollack.id}`, token))).people_met_here).toEqual([expect.objectContaining({ name: 'Sophie Tremblay' })]);
    await expect(settle(call('POST', `/events/${pollack.id}/exchange`, token, { code: '2468' }))).rejects.toMatchObject({ code: 'ALREADY_EXCHANGED' });
  });

  it('completes at once when two visitors enter each other’s codes', async () => {
    const a1 = await settle(signIn('attendee1@unlock.test'));
    const a2 = await settle(signIn('attendee2@unlock.test'));
    const code1 = (await settle(call('POST', '/events/2/rsvp', a1))).my_code;
    const code2 = (await settle(call('POST', '/events/2/rsvp', a2))).my_code;
    expect(await settle(call('POST', '/events/2/exchange', a1, { code: code2 }))).toMatchObject({ status: 'pending' });
    expect(await settle(call('POST', '/events/2/exchange', a2, { code: code1 }))).toMatchObject({ status: 'completed', points_gained: 300, total_points: 600 });
  });

  it('answers errors with the contract codes', async () => {
    const token = await settle(signIn('attendee1@unlock.test'));
    await expect(settle(signIn('attendee1@unlock.test', 'wrong'))).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' });
    await expect(settle(call('POST', '/events/1/exchange', token, { code: '2468' }))).rejects.toMatchObject({ code: 'NOT_GOING' });
    const own = (await settle(call('POST', '/events/1/rsvp', token))).my_code;
    await expect(settle(call('POST', '/events/1/exchange', token, { code: own }))).rejects.toMatchObject({ code: 'OWN_CODE' });
    await expect(settle(call('POST', '/events/1/exchange', token, { code: own === '0000' ? '0001' : '0000' }))).rejects.toMatchObject({ code: 'INVALID_CODE' });
    await expect(settle(call('GET', '/host/events', token))).rejects.toMatchObject({ code: 'FORBIDDEN_ROLE' });
    await expect(settle(call('GET', '/me', 'not-a-token'))).rejects.toMatchObject({ status: 401 });
  });

  it('lets a host create an event and rejects a pin outside the grid', async () => {
    const host = await settle(signIn('host1@unlock.test', 'host12345'));
    const base = { title: 'Board games', location_name: 'Trottier', starts_at: '2026-11-22T18:00:00Z', ends_at: '2026-11-22T20:00:00Z' };
    expect(await settle(call('POST', '/events', host, { ...base, lat: 45.5048, lng: -73.5772 }))).toMatchObject({ zone_id: 45, going_count: 0 });
    await expect(settle(call('POST', '/events', host, { ...base, lat: 45.7, lng: -73.5772 }))).rejects.toMatchObject({ code: 'OUTSIDE_GRID' });
    await expect(settle(call('POST', '/events', host, { ...base, lat: -73.5, lng: 45.5 }))).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
    expect((await settle(call('GET', '/host/events', host))) as unknown as Json[]).toHaveLength(7);
  });
});
