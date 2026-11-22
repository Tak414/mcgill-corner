import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import type { components } from '../api/schema';
import { ExchangeFeedCursor } from './exchangeFeedCursor';
import { queryKeys } from './queryKeys';
import { clearOwnExchanges, consumeOwnExchange } from './recentOwnExchanges';

export type ExchangeSummary = components['schemas']['ExchangeSummary'];

const INTERVAL_MS = 5_000;

/**
 * App-wide "someone met you" feed (attendees only): polls GET /me/exchanges?since= every 5 s.
 * Missing/duplicate protection lives in ExchangeFeedCursor (since = last server_time − 5 s,
 * plus a set of seen ids). For each new exchange: invalidates me / events / leaderboard / that
 * event, then calls onExchange — unless our own POST /exchange already completed it in the last 60 s.
 *
 * `userId` restarts the feed for a new login; pass null to stop it (logged out or host).
 */
export function useExchangeFeed(userId: number | null, onExchange: (exchange: ExchangeSummary) => void) {
  const qc = useQueryClient();
  const onExchangeRef = useRef(onExchange);
  useEffect(() => {
    onExchangeRef.current = onExchange;
  });

  useEffect(() => {
    if (userId === null) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cursor = new ExchangeFeedCursor();
    clearOwnExchanges();

    async function tick() {
      try {
        const res = await api.getMyExchanges(cursor.sinceParam);
        if (stopped) return;
        const fresh = cursor.accept(res, (ex) => consumeOwnExchange(ex.event.id, ex.partner.id));
        if (fresh.length > 0) {
          void qc.invalidateQueries({ queryKey: queryKeys.me });
          void qc.invalidateQueries({ queryKey: queryKeys.events });
          void qc.invalidateQueries({ queryKey: queryKeys.leaderboard });
          for (const ex of fresh) void qc.invalidateQueries({ queryKey: queryKeys.event(ex.event.id) });
          for (const ex of fresh) onExchangeRef.current(ex);
        }
      } catch {
        // Network blip: keep the same `since` and try again next tick. 401 is handled by the API client.
      }
      if (!stopped) timer = setTimeout(tick, INTERVAL_MS);
    }

    void tick();
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [userId, qc]);
}
