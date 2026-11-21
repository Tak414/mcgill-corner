import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as api from '../api';
import type { components } from '../api/schema';
import { queryKeys } from './queryKeys';
import { clearOwnExchanges, consumeOwnExchange } from './recentOwnExchanges';

export type ExchangeSummary = components['schemas']['ExchangeSummary'];

const INTERVAL_MS = 5_000;

/**
 * App-wide "someone met you" feed (attendees only): polls GET /me/exchanges?since= every 5 s.
 * The first call has no `since` and only establishes the starting server_time (no notifications).
 * For each new exchange: invalidates me / events / that event, then calls onExchange
 * — unless our own POST /exchange already completed it in the last 60 s.
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
    let since: string | undefined;
    // server_time and completed_at are whole seconds and the server filters `completed_at > since`,
    // so an exchange completed later in the same second as server_time would be skipped.
    // Ask from 1 s earlier and drop ids we have already seen.
    const seen = new Set<number>();
    clearOwnExchanges();

    async function tick() {
      try {
        const res = await api.getMyExchanges(since);
        if (stopped) return;
        const isFirst = since === undefined;
        since = new Date(Date.parse(res.server_time) - 1_000).toISOString();
        const unseen = res.exchanges.filter((ex) => !seen.has(ex.id));
        for (const ex of unseen) seen.add(ex.id);
        if (!isFirst) {
          const fresh = unseen.filter((ex) => !consumeOwnExchange(ex.event.id, ex.partner.id));
          if (fresh.length > 0) {
            void qc.invalidateQueries({ queryKey: queryKeys.me });
            void qc.invalidateQueries({ queryKey: queryKeys.events });
            void qc.invalidateQueries({ queryKey: queryKeys.leaderboard });
            for (const ex of fresh) void qc.invalidateQueries({ queryKey: queryKeys.event(ex.event.id) });
            for (const ex of [...fresh].reverse()) onExchangeRef.current(ex); // server returns newest first
          }
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
