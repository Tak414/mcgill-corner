import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import * as api from '../api';
import type { components } from '../api/schema';
import { queryKeys } from './queryKeys';
import { rememberOwnExchange } from './recentOwnExchanges';

type EventCreateRequest = components['schemas']['EventCreateRequest'];

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: QueryKey[]) => Promise.all(keys.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

export function useRsvp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (eventId: number) => api.rsvp(eventId),
    onSuccess: (_data, eventId) => invalidate(queryKeys.event(eventId), queryKeys.events),
  });
}

export function useCancelRsvp() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (eventId: number) => api.cancelRsvp(eventId),
    onSuccess: (_data, eventId) => invalidate(queryKeys.event(eventId), queryKeys.events),
  });
}

export function useExchange() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ eventId, code }: { eventId: number; code: string }) => api.exchangeCode(eventId, code),
    onSuccess: (data, { eventId }) => {
      if (data.status === 'completed') {
        rememberOwnExchange(eventId, data.partner.id);
        return invalidate(queryKeys.event(eventId), queryKeys.events, queryKeys.me, queryKeys.leaderboard);
      }
      return invalidate(queryKeys.event(eventId));
    },
  });
}

export function useCreateEvent() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: EventCreateRequest) => api.createEvent(body),
    onSuccess: () => invalidate(queryKeys.hostEvents, queryKeys.events),
  });
}
