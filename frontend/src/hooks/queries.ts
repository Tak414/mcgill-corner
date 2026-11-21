import { useQuery } from '@tanstack/react-query';
import * as api from '../api';
import { queryKeys } from './queryKeys';

/** The fixed grid: fetched once. */
export function useZones() {
  return useQuery({ queryKey: queryKeys.zones, queryFn: api.getZones, staleTime: Infinity, gcTime: Infinity });
}

/** Map pins, every 15 s. */
export function useEvents() {
  return useQuery({ queryKey: queryKeys.events, queryFn: api.listEvents, refetchInterval: 15_000 });
}

/** Points and zone progress, every 15 s. */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: api.getMe, refetchInterval: 15_000 });
}

/** Detail sheet, every 5 s while it is open (pass null when closed). */
export function useEvent(id: number | null) {
  return useQuery({
    queryKey: queryKeys.event(id ?? -1),
    queryFn: () => api.getEvent(id as number),
    enabled: id !== null,
    refetchInterval: 5_000,
  });
}

/** Fetched each time the leaderboard opens. */
export function useLeaderboard() {
  return useQuery({ queryKey: queryKeys.leaderboard, queryFn: api.getLeaderboard, refetchOnMount: 'always' });
}

/** Host's own events: on open and every 15 s. */
export function useHostEvents() {
  return useQuery({
    queryKey: queryKeys.hostEvents,
    queryFn: api.listHostEvents,
    refetchOnMount: 'always',
    refetchInterval: 15_000,
  });
}
