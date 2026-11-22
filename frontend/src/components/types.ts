import type { components } from '../api/schema';
type S = components['schemas'];


export type Zones = S['Zones'];
export type ZoneProgress = S['ZoneProgress'];
export type EventSummary = S['EventSummary'];
export type EventDetail = S['EventDetail'];
export type EventCreateRequest = S['EventCreateRequest'];
export type HostEventSummary = S['HostEventSummary'];
export type LeaderboardEntry = S['LeaderboardEntry'];
export type ZoneResult = S['ZoneResult'];
export type PersonRef = S['PersonRef'];
export type Role = S['Role'];
export type LatLng = { lat: number; lng: number };
export type FieldErrors = Record<string, string[]>;


export type AuthFormProps = {
  mode: 'login' | 'register';
  isSubmitting: boolean;
  errorMessage: string | null;
  fieldErrors: FieldErrors;
  onSubmit: (values: { name?: string; email: string; password: string; role?: Role }) => void;
  onSwitchMode: () => void;
};


export type TopBarProps = {
  name: string;
  role: Role;
  points: number;
  unlockedCount: number;
  /* from the avatar menu; the page logs out and goes to /login */
  onLogout: () => void;
};


export type BottomTabsProps = {
  active: 'map' | 'leaderboard';
  onChange: (tab: 'map' | 'leaderboard') => void;
};


export type FogMapProps = {
  zones: Zones;
  /* unlocked zones have unlocked = true */
  zoneProgress: ZoneProgress[];
  events: EventSummary[];
  selectedEventId: number | null;
  onPinClick: (eventId: number) => void;
  /** Zones just unlocked whose fog stays until their reveal plays (the player is still on the result screens). */
  heldZoneIds?: number[];
  /** Fly to this zone and slowly clear its fog; a new key plays it again. */
  reveal?: { zoneId: number; key: number } | null;
  /** The map has arrived at the zone and the fog starts to clear. */
  onRevealStart?: (zoneId: number) => void;
  /** The zone's fog is gone. */
  onRevealEnd?: (zoneId: number) => void;
};


export type EventSheetProps = {
  event: EventDetail;
  /* hosts see details only, no buttons */
  viewerRole: Role;
  isSubmitting: boolean;
  errorMessage: string | null;
  onRsvp: () => void;
  onCancelRsvp: () => void;
  /* exactly 4 digits */
  onSubmitCode: (code: string) => void;
  onClose: () => void;
};


export type CodeInputProps = {
  isSubmitting: boolean;
  /* exactly 4 digits */
  onSubmitCode: (code: string) => void;
};


export type ExchangeResultProps =
  | { status: 'pending'; partnerName: string; onClose: () => void }
  | {
      status: 'completed';
      partnerName: string;
      /** Everything this exchange earned, zone bonus included (the server's points_gained). */
      pointsGained: number;
      /** The part of pointsGained that is the zone-unlock bonus; 0 when no zone opened. */
      bonusPoints: number;
      zone: ZoneResult;
      totalPoints: number;
      onClose: () => void;
    };


export type ZoneLabelProps = { zoneId: number };

export type RankUpCelebrationProps = {
  /** The new rank. */
  rank: number;
  /** Places gained. */
  places: number;
  /** The closest person above: points still needed to catch them; null when the viewer leads. */
  nextGoal: { name: string; points: number } | null;
  onDone: () => void;
};

export type UnlockCelebrationProps ={ zoneId: number; bonusPoints: number; onDone: () => void };


export type ToastItem = { id: string; message: string; variant: 'success' | 'info' | 'error' };


export type ToastStackProps = { toasts: ToastItem[]; onDismiss: (id: string) => void };


export type LeaderboardProps = {
  top: LeaderboardEntry[];
  me: LeaderboardEntry | null;
  /** The viewer's rank the last time they looked; when it was worse, their row slides up to the new rank. */
  previousRank?: number | null;
  /** Called once when the viewer's row has finished sliding up, with the number of places gained. */
  onRankUp?: (places: number) => void;
};


export type HostEventListProps = {
  events: HostEventSummary[];
  onCreate: () => void;
  onSelect: (eventId: number) => void;
};


export type LocationPickerProps = {
  value: LatLng | null;
  /* called on map tap or pin drag */
  onChange: (value: LatLng) => void;
  /* the teammate calls the geocoder */
  onSearch: (query: string) => void;
  isSearching: boolean;
  searchError: string | null;
  zonePreview:
    | { kind: 'inside'; zoneId: number; requiredCount: number }
    | { kind: 'outside' }
    | null;
};


export type EventFormProps = {
  isSubmitting: boolean;
  errorMessage: string | null;
  fieldErrors: FieldErrors;
  /* EventForm renders <LocationPicker {...location} /> */
  location: LocationPickerProps;
  onSubmit: (values: Omit<EventCreateRequest, 'lat' | 'lng'>) => void;
  onCancel: () => void;
};
