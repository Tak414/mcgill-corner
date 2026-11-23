/**
 * Demo mode: an in-browser stand-in for the Laravel API, so the app works with no backend
 * (VITE_DEMO_MODE=true). It answers the same paths with the same shapes as contract/openapi.yaml
 * and applies the same rules as api-contract.md; its state lives in localStorage.
 */
import { ApiError, type ApiErrorCode, type FieldErrors } from '../client';
import type { components } from '../schema';
import { ATTENDEE_PASSWORD, DEMO_ATTENDEES, DEMO_EVENTS, DEMO_HOSTS, HOST_PASSWORD, PARTNER_CODE, PARTNER_DELAY_MS } from './demoData';

type S = components['schemas'];
type Role = S['Role'];

type DemoUser = { id: number; name: string; email: string; password: string; role: Role; points: number };
type DemoEvent = {
  id: number; host_id: number; title: string; description: string; location_name: string; address: string | null;
  lat: number; lng: number; zone_id: number; starts_at: number; ends_at: number; partner_id: number | null;
};
type DemoRsvp = { event_id: number; user_id: number; code: string | null };
type DemoExchange = {
  id: number; event_id: number; low: number; high: number; low_confirmed: boolean; high_confirmed: boolean;
  completed_at: number | null; low_points: number; high_points: number; low_unlocked_now: boolean; high_unlocked_now: boolean;
  /** Set when the caller entered the simulated partner's code: the partner "enters" the caller's code at this time. */
  partner_confirms_at: number | null;
};
type DemoProgress = { exchange_count: number; unlocked: boolean };
type DemoState = {
  version: 1; seeded_at: number; next_id: number;
  users: DemoUser[]; events: DemoEvent[]; rsvps: DemoRsvp[]; exchanges: DemoExchange[];
  progress: Record<string, DemoProgress>; tokens: Record<string, number>;
};

const STORAGE_KEY = 'unlock.demo.state';
/** Events are timed from the first visit; after this the world starts over so there is always something on now. */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;

// ---------- zones (integer micro-degrees, as api-contract.md "Zones") ----------

function locate(lat: number, lng: number): number | null {
  const latU = Math.round(lat * 1_000_000);
  const lngU = Math.round(lng * 1_000_000);
  if (latU < 45_440_000 || latU > 45_580_000 || lngU < -73_680_000 || lngU > -73_500_000) return null;
  const row = Math.min(9, Math.floor((latU - 45_440_000) / 14_000));
  const col = Math.min(9, Math.floor((lngU + 73_680_000) / 18_000));
  return row * 10 + col;
}

function requiredCount(zoneId: number): number {
  const ring = Math.max(Math.abs(Math.floor(zoneId / 10) - 4), Math.abs((zoneId % 10) - 5));
  return Math.min(5, Math.max(1, ring));
}

const bonusPoints = (zoneId: number) => requiredCount(zoneId) * 200;

function zones(): S['Zones'] {
  const cells: S['ZoneCell'][] = [];
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      const id = row * 10 + col;
      const south = 45.44 + row * 0.014;
      const west = -73.68 + col * 0.018;
      cells.push({ id, row, col, bounds: { south, west, north: south + 0.014, east: west + 0.018 }, required_count: requiredCount(id), bonus_points: bonusPoints(id) });
    }
  }
  return { bounds: { south: 45.44, west: -73.68, north: 45.58, east: -73.5 }, rows: 10, cols: 10, cells };
}

// ---------- state ----------

function seed(now: number): DemoState {
  const state: DemoState = { version: 1, seeded_at: now, next_id: 1, users: [], events: [], rsvps: [], exchanges: [], progress: {}, tokens: {} };
  const id = () => state.next_id++;
  for (const [email, name] of DEMO_HOSTS) state.users.push({ id: id(), name, email, password: HOST_PASSWORD, role: 'host', points: 0 });
  const startOfMinute = Math.floor(now / 60_000) * 60_000;
  for (const [title, description, location_name, address, lat, lng, startsIn, endsIn] of DEMO_EVENTS) {
    state.events.push({
      id: state.events.length + 1, host_id: state.users[0].id, title, description, location_name, address, lat, lng,
      zone_id: locate(lat, lng) ?? 45, starts_at: startOfMinute + startsIn * 60_000, ends_at: startOfMinute + endsIn * 60_000, partner_id: null,
    });
  }
  for (const [email, name, progress, going] of DEMO_ATTENDEES) {
    const user: DemoUser = { id: id(), name, email, password: ATTENDEE_PASSWORD, role: 'attendee', points: 0 };
    for (const [zone, count] of Object.entries(progress)) {
      const zoneId = Number(zone);
      const unlocked = count >= requiredCount(zoneId);
      user.points += 100 * count + (unlocked ? bonusPoints(zoneId) : 0);
      state.progress[`${user.id}:${zoneId}`] = { exchange_count: count, unlocked };
    }
    state.users.push(user);
    for (const index of going) {
      const event = state.events[index];
      const isPartner = event.partner_id === null;
      if (isPartner) event.partner_id = user.id;
      state.rsvps.push({ event_id: event.id, user_id: user.id, code: isPartner ? PARTNER_CODE : uniqueCode(state, event.id) });
    }
  }
  return state;
}

let cached: DemoState | null = null;

function load(now: number): DemoState {
  if (cached && now - cached.seeded_at < MAX_AGE_MS) return cached;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as DemoState | null;
    if (saved?.version === 1 && now - saved.seeded_at < MAX_AGE_MS) return (cached = saved);
  } catch {
    // unreadable or blocked storage: start a fresh world
  }
  cached = seed(now);
  save(cached);
  return cached;
}

function save(state: DemoState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked: the demo still works until the page reloads
  }
}

/** Start the demo world over (fresh events, everyone back to their starting rank) and sign everyone out. */
export function resetDemo() {
  cached = seed(Date.now());
  save(cached);
}

// ---------- helpers ----------

const fail = (status: number, code: ApiErrorCode, message: string, fields?: FieldErrors): never => {
  throw new ApiError(status, code, message, fields);
};

const iso = (ms: number) => new Date(ms).toISOString().replace('.000Z', 'Z');
const ref = (user: DemoUser): S['PersonRef'] => ({ id: user.id, name: user.name });

function uniqueCode(state: DemoState, eventId: number): string {
  const taken = new Set(state.rsvps.filter((r) => r.event_id === eventId).map((r) => r.code));
  taken.add(PARTNER_CODE);
  for (;;) {
    const code = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    if (!taken.has(code)) return code;
  }
}

/** Demo mode keeps every code window open, like DEMO_MODE=true on the server. Ended events stay closed. */
const codeWindow = (event: DemoEvent, now: number): S['CodeWindow'] => (now > event.ends_at ? 'closed' : 'open');

function userById(state: DemoState, id: number): DemoUser {
  return state.users.find((u) => u.id === id) ?? fail(404, 'NOT_FOUND', 'Not found.');
}

function eventById(state: DemoState, id: number): DemoEvent {
  return state.events.find((e) => e.id === id) ?? fail(404, 'NOT_FOUND', 'Event not found.');
}

function caller(state: DemoState, token: string | null): DemoUser {
  const id = token === null ? undefined : state.tokens[token];
  return id === undefined ? fail(401, 'UNAUTHENTICATED', 'Please log in.') : userById(state, id);
}

const rsvpOf = (state: DemoState, eventId: number, userId: number) => state.rsvps.find((r) => r.event_id === eventId && r.user_id === userId);

function issueCode(state: DemoState, event: DemoEvent, userId: number, now: number) {
  const rsvp = rsvpOf(state, event.id, userId);
  if (rsvp && rsvp.code === null && codeWindow(event, now) === 'open') rsvp.code = uniqueCode(state, event.id);
  return rsvp;
}

/** +100 points, +1 meeting in the event's zone, and the zone bonus once enough meetings happened there. */
function award(state: DemoState, user: DemoUser, zoneId: number) {
  const key = `${user.id}:${zoneId}`;
  const progress = (state.progress[key] ??= { exchange_count: 0, unlocked: false });
  progress.exchange_count += 1;
  const unlockedNow = !progress.unlocked && progress.exchange_count >= requiredCount(zoneId);
  const bonus = unlockedNow ? bonusPoints(zoneId) : 0;
  if (unlockedNow) progress.unlocked = true;
  user.points += 100 + bonus;
  return { points: 100 + bonus, unlockedNow, progress };
}

function complete(state: DemoState, exchange: DemoExchange, at: number) {
  const event = eventById(state, exchange.event_id);
  const low = award(state, userById(state, exchange.low), event.zone_id);
  const high = award(state, userById(state, exchange.high), event.zone_id);
  Object.assign(exchange, {
    low_confirmed: true, high_confirmed: true, completed_at: at, partner_confirms_at: null,
    low_points: low.points, high_points: high.points, low_unlocked_now: low.unlockedNow, high_unlocked_now: high.unlockedNow,
  });
  return { low, high };
}

/** The simulated partner enters the caller's code a few seconds after the caller entered theirs. */
function advance(state: DemoState, now: number) {
  let changed = false;
  for (const exchange of state.exchanges) {
    if (exchange.completed_at === null && exchange.partner_confirms_at !== null && exchange.partner_confirms_at <= now) {
      complete(state, exchange, exchange.partner_confirms_at);
      changed = true;
    }
  }
  return changed;
}

// ---------- shapes ----------

function summary(state: DemoState, event: DemoEvent, viewer: DemoUser, now: number): S['EventSummary'] {
  return {
    id: event.id, title: event.title, location_name: event.location_name, lat: event.lat, lng: event.lng, zone_id: event.zone_id,
    starts_at: iso(event.starts_at), ends_at: iso(event.ends_at), code_window: codeWindow(event, now),
    going_count: state.rsvps.filter((r) => r.event_id === event.id).length,
    is_going: rsvpOf(state, event.id, viewer.id) !== undefined,
    host: ref(userById(state, event.host_id)),
  };
}

function detail(state: DemoState, event: DemoEvent, viewer: DemoUser, now: number): S['EventDetail'] {
  const rsvp = viewer.role === 'attendee' ? issueCode(state, event, viewer.id, now) : undefined;
  const mine = state.exchanges.filter((x) => x.event_id === event.id && (x.low === viewer.id || x.high === viewer.id));
  const partnerOf = (x: DemoExchange) => userById(state, x.low === viewer.id ? x.high : x.low);
  const met = mine.filter((x) => x.completed_at !== null);
  const waiting = mine.filter((x) => x.completed_at === null && (x.low === viewer.id ? x.high_confirmed && !x.low_confirmed : x.low_confirmed && !x.high_confirmed));
  return {
    ...summary(state, event, viewer, now),
    description: event.description, address: event.address, code_available_at: iso(event.starts_at - 3 * HOUR),
    my_code: rsvp && codeWindow(event, now) === 'open' ? rsvp.code : null,
    can_cancel: rsvp !== undefined && met.length === 0,
    pending_from: waiting.map((x) => ref(partnerOf(x))),
    people_met_here: met.map((x) => ref(partnerOf(x))),
  };
}

function leaderboard(state: DemoState, viewer: DemoUser): S['Leaderboard'] {
  const attendees = state.users.filter((u) => u.role === 'attendee').sort((a, b) => b.points - a.points || a.id - b.id);
  const entry = (u: DemoUser): S['LeaderboardEntry'] => ({ rank: 1 + attendees.filter((o) => o.points > u.points).length, user_id: u.id, name: u.name, points: u.points });
  return { top: attendees.slice(0, 20).map(entry), me: viewer.role === 'host' ? null : entry(viewer) };
}

// ---------- validation ----------

function validateEvent(body: Partial<S['EventCreateRequest']>, now: number): S['EventCreateRequest'] {
  const fields: FieldErrors = {};
  const add = (field: string, message: string) => (fields[field] ??= []).push(message);
  const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
  const title = text(body.title);
  const locationName = text(body.location_name);
  if (title.length < 1 || title.length > 80) add('title', 'The title must be 1–80 characters.');
  if (locationName.length < 1 || locationName.length > 120) add('location_name', 'The place name must be 1–120 characters.');
  if (text(body.description).length > 500) add('description', 'The description may not be longer than 500 characters.');
  if (text(body.address).length > 200) add('address', 'The address may not be longer than 200 characters.');
  if (typeof body.lat !== 'number' || !(body.lat > 0)) add('lat', 'The latitude must be a positive number.');
  if (typeof body.lng !== 'number' || !(body.lng < 0)) add('lng', 'The longitude must be a negative number.');
  const starts = Date.parse(body.starts_at ?? '');
  const ends = Date.parse(body.ends_at ?? '');
  if (Number.isNaN(starts) || starts <= now) add('starts_at', 'The start time must be in the future.');
  if (Number.isNaN(ends) || ends <= starts) add('ends_at', 'The end time must be after the start time.');
  else if (ends - starts > 12 * HOUR) add('ends_at', 'An event can last at most 12 hours.');
  if (Object.keys(fields).length > 0) fail(422, 'VALIDATION_FAILED', 'Some fields are invalid.', fields);
  return body as S['EventCreateRequest'];
}

// ---------- routes ----------

type Method = 'GET' | 'POST' | 'DELETE';

function route(state: DemoState, method: Method, path: string, query: Record<string, string | undefined>, body: unknown, token: string | null, now: number): unknown {
  const input = (body ?? {}) as Record<string, unknown>;

  if (method === 'POST' && path === '/login') {
    const user = state.users.find((u) => u.email.toLowerCase() === String(input.email ?? '').trim().toLowerCase() && u.password === input.password);
    if (!user) return fail(401, 'UNAUTHENTICATED', 'These credentials do not match our records.');
    const newToken = `demo-${user.id}-${now}`;
    state.tokens[newToken] = user.id;
    return { token: newToken, user: { id: user.id, name: user.name, role: user.role, points: user.points } } satisfies S['AuthResponse'];
  }

  if (method === 'POST' && path === '/register') {
    const { name, email, password, role } = input as Partial<S['RegisterRequest']>;
    const fields: FieldErrors = {};
    if (!name?.trim() || name.trim().length > 50) fields.name = ['The name must be 1–50 characters.'];
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fields.email = ['Enter a valid email address.'];
    else if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) fields.email = ['The email has already been taken.'];
    if (!password || password.length < 8) fields.password = ['The password must be at least 8 characters.'];
    if (role !== 'host' && role !== 'attendee') fields.role = ['Choose host or attendee.'];
    if (Object.keys(fields).length > 0) return fail(422, 'VALIDATION_FAILED', 'Some fields are invalid.', fields);
    const user: DemoUser = { id: state.next_id++, name: name!.trim(), email: email!.trim(), password: password!, role: role!, points: 0 };
    state.users.push(user);
    const newToken = `demo-${user.id}-${now}`;
    state.tokens[newToken] = user.id;
    return { token: newToken, user: { id: user.id, name: user.name, role: user.role, points: 0 } } satisfies S['AuthResponse'];
  }

  const me = caller(state, token);

  if (method === 'POST' && path === '/logout') {
    delete state.tokens[token!];
    return undefined;
  }

  if (method === 'GET' && path === '/me') {
    const zone_progress = me.role === 'host' ? [] : Object.entries(state.progress)
      .filter(([key, p]) => key.startsWith(`${me.id}:`) && p.exchange_count > 0)
      .map(([key, p]) => { const zone_id = Number(key.split(':')[1]); return { zone_id, exchange_count: p.exchange_count, required_count: requiredCount(zone_id), unlocked: p.unlocked }; })
      .sort((a, b) => a.zone_id - b.zone_id);
    return { id: me.id, name: me.name, role: me.role, points: me.points, zone_progress } satisfies S['Me'];
  }

  if (method === 'GET' && path === '/me/exchanges') {
    const since = query.since ? Date.parse(query.since) : null;
    const rows = state.exchanges
      .filter((x) => x.completed_at !== null && (x.low === me.id || x.high === me.id) && (since === null || x.completed_at > since))
      .sort((a, b) => b.completed_at! - a.completed_at! || b.id - a.id);
    const exchanges = (since === null ? rows.slice(0, 20) : rows).map((x): S['ExchangeSummary'] => {
      const isLow = x.low === me.id;
      const event = eventById(state, x.event_id);
      return {
        id: x.id, event: { id: event.id, title: event.title }, partner: ref(userById(state, isLow ? x.high : x.low)),
        completed_at: iso(x.completed_at!), points_gained: isLow ? x.low_points : x.high_points, zone_id: event.zone_id,
        unlocked_now: isLow ? x.low_unlocked_now : x.high_unlocked_now,
      };
    });
    // Whole seconds, like the server, so the feed cursor behaves the same.
    return { server_time: iso(Math.floor(now / 1000) * 1000), exchanges } satisfies S['MeExchanges'];
  }

  if (method === 'GET' && path === '/zones') return zones();

  if (method === 'GET' && path === '/leaderboard') return leaderboard(state, me);

  if (method === 'GET' && path === '/host/events') {
    if (me.role !== 'host') return fail(403, 'FORBIDDEN_ROLE', "Your account type can't do this.");
    return state.events.filter((e) => e.host_id === me.id).sort((a, b) => b.starts_at - a.starts_at || b.id - a.id)
      .map((e): S['HostEventSummary'] => ({ ...summary(state, e, me, now), completed_exchange_count: state.exchanges.filter((x) => x.event_id === e.id && x.completed_at !== null).length }));
  }

  if (path === '/events') {
    if (method === 'GET') {
      return state.events.filter((e) => e.ends_at >= now).sort((a, b) => a.starts_at - b.starts_at || a.id - b.id).map((e) => summary(state, e, me, now));
    }
    if (me.role !== 'host') return fail(403, 'FORBIDDEN_ROLE', "Your account type can't do this.");
    const values = validateEvent(input as Partial<S['EventCreateRequest']>, now);
    const zoneId = locate(values.lat, values.lng);
    if (zoneId === null) return fail(422, 'OUTSIDE_GRID', 'This location is outside the map grid.');
    const event: DemoEvent = {
      id: Math.max(0, ...state.events.map((e) => e.id)) + 1, host_id: me.id, title: values.title.trim(), description: values.description?.trim() ?? '',
      location_name: values.location_name.trim(), address: values.address?.trim() || null, lat: values.lat, lng: values.lng, zone_id: zoneId,
      starts_at: Date.parse(values.starts_at), ends_at: Date.parse(values.ends_at), partner_id: null,
    };
    state.events.push(event);
    return detail(state, event, me, now);
  }

  const match = /^\/events\/(\d+)(?:\/(rsvp|exchange))?$/.exec(path);
  if (!match) return fail(404, 'NOT_FOUND', 'Not found.');
  const event = eventById(state, Number(match[1]));
  const action = match[2];

  if (!action && method === 'GET') return detail(state, event, me, now);

  if (me.role !== 'attendee') return fail(403, 'FORBIDDEN_ROLE', "Your account type can't do this.");

  if (action === 'rsvp' && method === 'POST') {
    if (codeWindow(event, now) === 'closed') return fail(422, 'EVENT_ENDED', 'This event has ended.');
    if (!rsvpOf(state, event.id, me.id)) state.rsvps.push({ event_id: event.id, user_id: me.id, code: null });
    const rsvp = issueCode(state, event, me.id, now)!;
    return { going_count: state.rsvps.filter((r) => r.event_id === event.id).length, code_window: codeWindow(event, now), my_code: rsvp.code } satisfies S['RsvpResponse'];
  }

  if (action === 'rsvp' && method === 'DELETE') {
    if (!rsvpOf(state, event.id, me.id)) return fail(403, 'NOT_GOING', "You're not going to this event.");
    const mine = (x: DemoExchange) => x.event_id === event.id && (x.low === me.id || x.high === me.id);
    if (state.exchanges.some((x) => mine(x) && x.completed_at !== null)) return fail(409, 'CANNOT_CANCEL', 'You already met someone here.');
    state.exchanges = state.exchanges.filter((x) => !mine(x));
    state.rsvps = state.rsvps.filter((r) => !(r.event_id === event.id && r.user_id === me.id));
    return { going_count: state.rsvps.filter((r) => r.event_id === event.id).length } satisfies S['CancelRsvpResponse'];
  }

  if (action === 'exchange' && method === 'POST') {
    if (codeWindow(event, now) !== 'open') return fail(422, 'CODE_WINDOW_CLOSED', 'Codes are not open for this event.');
    if (!rsvpOf(state, event.id, me.id)) return fail(403, 'NOT_GOING', "You're not going to this event.");
    const code = String(input.code ?? '');
    const target = state.rsvps.find((r) => r.event_id === event.id && r.code === code);
    if (!target) return fail(404, 'INVALID_CODE', "That code doesn't match anyone here.");
    if (target.user_id === me.id) return fail(422, 'OWN_CODE', "That's your own code.");
    const [low, high] = me.id < target.user_id ? [me.id, target.user_id] : [target.user_id, me.id];
    let exchange = state.exchanges.find((x) => x.event_id === event.id && x.low === low && x.high === high);
    if (exchange?.completed_at != null) return fail(409, 'ALREADY_EXCHANGED', 'You already met here.');
    exchange ??= state.exchanges[state.exchanges.push({
      id: state.next_id++, event_id: event.id, low, high, low_confirmed: false, high_confirmed: false, completed_at: null,
      low_points: 0, high_points: 0, low_unlocked_now: false, high_unlocked_now: false, partner_confirms_at: null,
    }) - 1];
    if (me.id === low) exchange.low_confirmed = true;
    else exchange.high_confirmed = true;
    const partner = userById(state, target.user_id);
    if (!(exchange.low_confirmed && exchange.high_confirmed)) {
      if (target.user_id === event.partner_id) exchange.partner_confirms_at ??= now + PARTNER_DELAY_MS;
      return { status: 'pending', partner: ref(partner) } satisfies S['ExchangePending'];
    }
    const result = complete(state, exchange, now)[me.id === low ? 'low' : 'high'];
    return {
      status: 'completed', partner: ref(partner), points_gained: result.points, total_points: me.points,
      zone: { zone_id: event.zone_id, exchange_count: result.progress.exchange_count, required_count: requiredCount(event.zone_id), unlocked: result.progress.unlocked, unlocked_now: result.unlockedNow },
    } satisfies S['ExchangeCompleted'];
  }

  return fail(404, 'NOT_FOUND', 'Not found.');
}

/** Answer one API request the way the server would. Throws ApiError for error responses. */
export async function handleDemoRequest(method: Method, path: string, query: Record<string, string | undefined>, body: unknown, token: string | null): Promise<unknown> {
  await new Promise((resolve) => setTimeout(resolve, 120)); // a little latency, so loading states still show
  const now = Date.now();
  const state = load(now);
  advance(state, now);
  try {
    // A deep copy, so the app can never change the demo world by mutating a response.
    const result = route(state, method, path, query, body === undefined ? undefined : JSON.parse(JSON.stringify(body)), token, now);
    return result === undefined ? undefined : JSON.parse(JSON.stringify(result));
  } finally {
    save(state);
  }
}

/** For the event sheet's hint: who you can meet at this event in the demo, and their code. */
export function demoPartnerFor(eventId: number): { name: string; code: string } | null {
  const state = load(Date.now());
  const event = state.events.find((e) => e.id === eventId);
  if (!event || event.partner_id === null) return null;
  return { name: userById(state, event.partner_id).name, code: PARTNER_CODE };
}
