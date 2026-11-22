import type { operations } from './schema';
import { request } from './client';

type Ops = operations;
type Body<Op extends keyof Ops> = Ops[Op] extends { requestBody: { content: { 'application/json': infer B } } } ? B : never;
type Ok<Op extends keyof Ops, Status extends number = 200> = Ops[Op]['responses'] extends Record<
  Status,
  { content: { 'application/json': infer R } }
>
  ? R
  : never;

// auth
export const login = (body: Body<'login'>) => request<Ok<'login'>>('/login', { method: 'POST', body });
export const register = (body: Body<'register'>) => request<Ok<'register', 201>>('/register', { method: 'POST', body });
export const logout = () => request<void>('/logout', { method: 'POST' });

// me
export const getMe = () => request<Ok<'getMe'>>('/me');
export const getMyExchanges = (since?: string) =>
  request<Ok<'getMyExchanges'>>('/me/exchanges', { query: { since } });

// zones
export const getZones = () => request<Ok<'getZones'>>('/zones');

// events
export const listEvents = () => request<Ok<'listEvents'>>('/events');
export const getEvent = (id: number) => request<Ok<'getEvent'>>(`/events/${id}`);
export const createEvent = (body: Body<'createEvent'>) =>
  request<Ok<'createEvent', 201>>('/events', { method: 'POST', body });
export const rsvp = (id: number) => request<Ok<'rsvp'>>(`/events/${id}/rsvp`, { method: 'POST' });
export const cancelRsvp = (id: number) => request<Ok<'cancelRsvp'>>(`/events/${id}/rsvp`, { method: 'DELETE' });

// exchange
export const exchangeCode = (id: number, code: string) =>
  request<Ok<'exchangeCode'>>(`/events/${id}/exchange`, { method: 'POST', body: { code } satisfies Body<'exchangeCode'> });

// host
export const listHostEvents = () => request<Ok<'listHostEvents'>>('/host/events');

// leaderboard
export const getLeaderboard = () => request<Ok<'getLeaderboard'>>('/leaderboard');
