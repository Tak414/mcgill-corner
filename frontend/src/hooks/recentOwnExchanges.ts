/**
 * Exchanges this client completed itself (POST /exchange → completed) in the last 60 s.
 * The exchange feed skips them, because the result screen already showed them.
 */
const TTL_MS = 60_000;
const recent = new Map<string, number>();

const keyOf = (eventId: number, partnerId: number) => `${eventId}:${partnerId}`;

export function rememberOwnExchange(eventId: number, partnerId: number, now = Date.now()) {
  recent.set(keyOf(eventId, partnerId), now + TTL_MS);
}

/** True (and forgets it) if this exchange was completed by our own request within the TTL. */
export function consumeOwnExchange(eventId: number, partnerId: number, now = Date.now()): boolean {
  const key = keyOf(eventId, partnerId);
  const expires = recent.get(key);
  if (expires === undefined) return false;
  recent.delete(key);
  return expires >= now;
}

export function clearOwnExchanges() {
  recent.clear();
}
