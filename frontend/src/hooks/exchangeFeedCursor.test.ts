import { describe, expect, it } from 'vitest';
import type { components } from '../api/schema';
import { ExchangeFeedCursor } from './exchangeFeedCursor';

type ExchangeSummary = components['schemas']['ExchangeSummary'];
type MeExchanges = components['schemas']['MeExchanges'];

const T0 = Date.parse('2026-11-21T22:00:00Z');
const sec = (s: number) => T0 + s * 1000;
const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');

/**
 * Behaves like the Laravel endpoint: completed_at is taken inside the transaction (before commit)
 * and stored in whole seconds; a row is visible only after its commit; the query
 * `completed_at > since` runs first and server_time (whole seconds) is read afterwards.
 */
class FakeServer {
  private rows: Array<{ ex: ExchangeSummary; completedSec: number; visibleAt: number }> = [];

  complete(id: number, setAtMs: number, commitAtMs: number, partnerId = 100 + id, eventId = 1) {
    const completedSec = Math.floor(setAtMs / 1000) * 1000;
    this.rows.push({
      completedSec,
      visibleAt: commitAtMs,
      ex: {
        id,
        event: { id: eventId, title: 'Board Games' },
        partner: { id: partnerId, name: `P${partnerId}` },
        completed_at: iso(completedSec),
        points_gained: 100,
        zone_id: 45,
        unlocked_now: false,
      },
    });
  }

  poll(since: string | undefined, queryAtMs: number, serverTimeAtMs: number): MeExchanges {
    const sinceMs = since === undefined ? null : Date.parse(since);
    const rows = this.rows
      .filter((r) => r.visibleAt <= queryAtMs)
      .filter((r) => sinceMs === null || r.completedSec > sinceMs)
      .sort((a, b) => b.completedSec - a.completedSec || b.ex.id - a.ex.id);
    return {
      server_time: iso(Math.floor(serverTimeAtMs / 1000) * 1000),
      exchanges: (sinceMs === null ? rows.slice(0, 20) : rows).map((r) => r.ex),
    };
  }
}

/** Polls every 5 s from `startSec`; returns ids notified per poll. */
function run(server: FakeServer, cursor: ExchangeFeedCursor, polls: Array<[querySec: number, serverTimeSec: number]>, isOwn?: (ex: ExchangeSummary) => boolean) {
  return polls.map(([q, s]) => cursor.accept(server.poll(cursor.sinceParam, sec(q), sec(s)), isOwn).map((ex) => ex.id));
}

describe('ExchangeFeedCursor', () => {
  it('first poll only sets the starting point; older exchanges are not notified', () => {
    const server = new FakeServer();
    server.complete(1, sec(-60), sec(-60));
    const cursor = new ExchangeFeedCursor();
    expect(cursor.sinceParam).toBeUndefined();
    expect(run(server, cursor, [[0, 0], [5, 5]])).toEqual([[], []]);
  });

  it('asks from the last server_time minus 5 s', () => {
    const server = new FakeServer();
    const cursor = new ExchangeFeedCursor();
    run(server, cursor, [[11.2, 11.2]]);
    expect(cursor.sinceParam).toBe('2026-11-21T22:00:06.000Z');
  });

  it('never misses an exchange committed after a poll but stamped in an earlier second', () => {
    // Poll 1 queries at 10.999 s and reads server_time at 11.002 s → "…:11".
    // The exchange set completed_at at 10.9 s (stored as …:10) and committed at 11.0 s,
    // so poll 1 did not see it.
    const server = new FakeServer();
    server.complete(7, sec(10.9), sec(11.0));
    const cursor = new ExchangeFeedCursor();
    const notified = run(server, cursor, [[0, 0], [10.999, 11.002], [16, 16]]);
    expect(notified).toEqual([[], [], [7]]);

    // The same timeline with a 1 s overlap (since = …:10) would have lost it: …:10 > …:10 is false.
    expect(server.poll('2026-11-21T22:00:10Z', sec(16), sec(16)).exchanges).toEqual([]);
  });

  it('covers a commit that lands up to ~4 s after the completed_at second', () => {
    const server = new FakeServer();
    // completed_at set at 20.1 s (stored …:20) but committed at 23.5 s; a poll at 23 s (server_time …:23)
    // does not see it yet. The next poll asks from …:18, so …:20 is still returned.
    server.complete(8, sec(20.1), sec(23.5));
    const cursor = new ExchangeFeedCursor();
    expect(run(server, cursor, [[0, 0], [18, 18], [23, 23], [28, 28]]).flat()).toEqual([8]);
  });

  it('never notifies the same exchange twice, even though overlapping polls return it again', () => {
    const server = new FakeServer();
    server.complete(9, sec(7), sec(7));
    const cursor = new ExchangeFeedCursor();
    const notified = run(server, cursor, [[0, 0], [5, 5], [10, 10], [15, 15]]);
    expect(notified.flat()).toEqual([9]);
    // poll 3 (since …:05) returned it again and was filtered out
    expect(server.poll('2026-11-21T22:00:05Z', sec(10), sec(10)).exchanges.map((e) => e.id)).toEqual([9]);
  });

  it('skips my own completed exchange, and does not bring it back on a later overlapping poll', () => {
    const server = new FakeServer();
    server.complete(10, sec(6), sec(6), 55, 3); // my own POST /exchange completed this one
    server.complete(11, sec(7), sec(7), 66, 3); // the partner completed this one
    const own = new Set(['3:55']);
    const isOwn = (ex: ExchangeSummary) => own.delete(`${ex.event.id}:${ex.partner.id}`);
    const cursor = new ExchangeFeedCursor();
    expect(run(server, cursor, [[0, 0], [8, 8], [13, 13]], isOwn)).toEqual([[], [11], []]);
  });

  it('notifies several new exchanges oldest first', () => {
    const server = new FakeServer();
    server.complete(20, sec(6), sec(6));
    server.complete(21, sec(8), sec(8));
    const cursor = new ExchangeFeedCursor();
    expect(run(server, cursor, [[0, 0], [9, 9]])).toEqual([[], [20, 21]]);
  });
});
