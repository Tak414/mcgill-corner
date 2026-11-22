import type {
  EventDetail,
  EventSummary,
  HostEventSummary,
  LeaderboardEntry,
  ToastItem,
  ZoneProgress,
  Zones,
  ZoneResult,
} from '../components/types';

const south = 45.44;
const west = -73.68;
const latStep = 0.014;
const lngStep = 0.018;

export const zones: Zones = {
  bounds: { south: 45.44, west: -73.68, north: 45.58, east: -73.5 },
  rows: 10,
  cols: 10,
  cells: Array.from({ length: 100 }, (_, id) => {
    const row = Math.floor(id / 10);
    const col = id % 10;
    const ring = Math.max(Math.abs(row - 4), Math.abs(col - 5));
    const requiredCount = Math.min(5, Math.max(1, ring));
    return {
      id,
      row,
      col,
      bounds: {
        south: south + row * latStep,
        west: west + col * lngStep,
        north: south + (row + 1) * latStep,
        east: west + (col + 1) * lngStep,
      },
      required_count: requiredCount,
      bonus_points: requiredCount * 200,
    };
  }),
};

export const zoneProgress: ZoneProgress[] = [
  { zone_id: 45, exchange_count: 3, required_count: 1, unlocked: true },
  { zone_id: 46, exchange_count: 1, required_count: 1, unlocked: true },
  { zone_id: 35, exchange_count: 1, required_count: 2, unlocked: false },
];

export const events: EventSummary[] = [
  { id: 12, title: 'Board game night', location_name: 'McGill University', lat: 45.5048, lng: -73.5772, zone_id: 45, starts_at: '2026-11-21T20:00:00-05:00', ends_at: '2026-11-21T23:00:00-05:00', code_window: 'open', going_count: 8, is_going: true, host: { id: 1, name: 'Campus Connection Club' } },
  { id: 13, title: 'Coffee & conversation', location_name: 'Milton-Parc', lat: 45.5, lng: -73.56, zone_id: 46, starts_at: '2026-11-21T18:00:00-05:00', ends_at: '2026-11-21T20:00:00-05:00', code_window: 'open', going_count: 5, is_going: false, host: { id: 2, name: 'McGill Welcome Crew' } },
  { id: 14, title: 'Campus walk', location_name: 'Arts Building steps', lat: 45.51, lng: -73.58, zone_id: 55, starts_at: '2026-11-22T16:00:00-05:00', ends_at: '2026-11-22T17:30:00-05:00', code_window: 'before', going_count: 3, is_going: false, host: { id: 1, name: 'Campus Connection Club' } },
];

const eventBase: EventDetail = {
  ...events[0],
  description: 'Come as you are. Games, warm drinks, and easy conversation provided.',
  address: '845 Sherbrooke Street West',
  code_available_at: '2026-11-21T17:00:00-05:00',
  my_code: null,
  can_cancel: false,
  pending_from: [],
  people_met_here: [],
};

export const eventNotGoing: EventDetail = { ...eventBase, is_going: false, can_cancel: false };
export const eventGoingBefore: EventDetail = { ...eventBase, is_going: true, can_cancel: true, code_window: 'before', my_code: null };
export const eventGoingOpen: EventDetail = {
  ...eventBase,
  is_going: true,
  can_cancel: true,
  my_code: '4821',
  pending_from: [{ id: 7, name: 'Léa' }],
  people_met_here: [{ id: 5, name: 'Noah' }, { id: 6, name: 'Maya' }],
};
export const eventClosed: EventDetail = { ...eventBase, code_window: 'closed', ends_at: '2026-11-20T23:00:00-05:00' };
export const eventCannotCancel: EventDetail = { ...eventGoingOpen, can_cancel: false, pending_from: [], people_met_here: [{ id: 7, name: 'Léa' }] };
export const eventForHost: EventDetail = { ...eventBase };

export const resultZone: ZoneResult = { zone_id: 45, exchange_count: 1, required_count: 1, unlocked: true, unlocked_now: true };

export const top: LeaderboardEntry[] = [
  { rank: 1, user_id: 9, name: 'Léa Martin', points: 3400 },
  { rank: 1, user_id: 11, name: 'Noah Tremblay', points: 3400 },
  { rank: 3, user_id: 5, name: 'Maya Singh', points: 2950 },
  { rank: 4, user_id: 3, name: 'Alex Chen', points: 2600 },
  { rank: 5, user_id: 8, name: 'Samira Haddad', points: 2210 },
  { rank: 6, user_id: 17, name: 'Elliot Park', points: 2050 },
  { rank: 7, user_id: 14, name: 'Noémie Gagnon', points: 1980 },
  { rank: 8, user_id: 21, name: 'Ravi Patel', points: 1860 },
  { rank: 9, user_id: 16, name: 'Chloé Bouchard', points: 1710 },
  { rank: 10, user_id: 18, name: 'Amir Farah', points: 1630 },
  { rank: 11, user_id: 7, name: 'Isla Thompson', points: 1520 },
  { rank: 12, user_id: 12, name: 'Oliver King', points: 1480 },
  { rank: 13, user_id: 22, name: 'Émile Roy', points: 1370 },
  { rank: 14, user_id: 10, name: 'Aisha Ahmed', points: 1290 },
  { rank: 15, user_id: 13, name: 'Mateo Cruz', points: 1150 },
  { rank: 16, user_id: 6, name: 'Clara Weiss', points: 1020 },
  { rank: 17, user_id: 19, name: 'Theo Laurent', points: 960 },
  { rank: 18, user_id: 15, name: 'Zara Ali', points: 830 },
  { rank: 19, user_id: 20, name: 'William Wu', points: 700 },
  { rank: 20, user_id: 4, name: 'Ava Morrison', points: 610 },
];
export const meOutsideTop: LeaderboardEntry = { rank: 24, user_id: 24, name: 'Jordan Lee', points: 420 };
export const meInTop: LeaderboardEntry = { rank: 4, user_id: 3, name: 'Alex Chen', points: 2600 };
export const meFirst: LeaderboardEntry = { rank: 1, user_id: 9, name: 'Léa Martin', points: 3400 };
export const meNoPoints: LeaderboardEntry = { rank: 1, user_id: 3, name: 'Alex Chen', points: 0 };

const hostEvent = (event: EventSummary, completed_exchange_count: number): HostEventSummary => ({ ...event, completed_exchange_count });
export const hostEvents: HostEventSummary[] = [hostEvent(events[0], 14), hostEvent(events[2], 4)];

export const toasts: ToastItem[] = [
  { id: 'met', message: 'You met Léa at Board game night!', variant: 'success' },
  { id: 'zone', message: 'Zone 45 is now clear. Keep exploring.', variant: 'info' },
  { id: 'network', message: 'Could not reach the map. Try again.', variant: 'error' },
];
