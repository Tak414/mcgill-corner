import type { components } from '../api/schema';

type ExchangeSummary = components['schemas']['ExchangeSummary'];
type MeExchanges = components['schemas']['MeExchanges'];

/**
 * How far before the last server_time the next poll asks from.
 *
 * The backend sends server_time and stores completed_at in whole seconds and filters
 * `completed_at > since`. completed_at is taken inside the exchange transaction, before the
 * commit, and the poll's query runs before its server_time is read. So an exchange that only
 * becomes visible after a poll can carry a completed_at one or more seconds below that poll's
 * server_time. Asking from 5 s earlier covers that; the seen-id set removes the overlap.
 */
export const SINCE_OVERLAP_MS = 5_000;

/**
 * Pure state for the GET /me/exchanges?since= feed:
 * - never misses: each poll asks from (last server_time − 5 s)
 * - never repeats: every returned id is remembered and skipped afterwards
 * - the first response only sets the starting point (older exchanges are not notified)
 */
export class ExchangeFeedCursor {
  private since: string | undefined;
  private readonly seen = new Set<number>();

  /** The `since` query value for the next poll (undefined for the first call). */
  get sinceParam(): string | undefined {
    return this.since;
  }

  /**
   * Record a response. Returns the exchanges to notify about, oldest first.
   * `isOwn` is asked only for new ids, to skip exchanges our own POST /exchange already showed.
   */
  accept(res: MeExchanges, isOwn: (ex: ExchangeSummary) => boolean = () => false): ExchangeSummary[] {
    const isFirst = this.since === undefined;
    this.since = new Date(Date.parse(res.server_time) - SINCE_OVERLAP_MS).toISOString();

    const unseen = res.exchanges.filter((ex) => !this.seen.has(ex.id));
    for (const ex of unseen) this.seen.add(ex.id);
    if (isFirst) return [];

    // The server returns newest first; notify in the order they happened.
    return unseen.filter((ex) => !isOwn(ex)).reverse();
  }
}
