# API Contract v0.2.3 — CodeJam 16

Frontend: React SPA (mobile web, Leaflet). Backend: Laravel JSON API (Sanctum tokens).
The two sides share **only** the files in `/contract`:

- **`openapi.yaml` — the single source of truth for every request and response shape.** Frontend types are generated from it; the mock server runs from it; backend responses are tested against it.
- **`api-contract.md` (this file) — the rules and the reasons behind them.** If this file and `openapi.yaml` disagree on a field, `openapi.yaml` wins; fix this file.

Any change → bump the version in **both** files, open a PR, and tell the whole team.

**Changelog**
- v0.2.3 — Zone math is done in integer micro-degrees, so points exactly on a boundary always land in the same zone on every platform (the float formula put lat 45.538 in row 6 instead of 7). Boundary golden points added.
- v0.2.2 — Coordinate validation order clarified: wrong signs (lat ≤ 0 or lng ≥ 0) → `VALIDATION_FAILED`; valid signs but outside the grid → `OUTSIDE_GRID`. `openapi.yaml` no longer puts the grid range on the lat/lng fields.
- v0.2.1 — Event location: map-tap fallback when address search fails; Nominatim parameters fixed; demo seed events use hard-coded coordinates. `openapi.yaml` added as the source of truth for shapes; `NOT_FOUND` error added for unknown event ids.
- v0.2 — Confirmed rules (mutual code entry, 10×10 grid, points, code window).

---

## 0. Conventions

- Base URL `/api`. JSON everywhere. Keys are `snake_case`.
- Auth header: `Authorization: Bearer <token>`.
- Times: ISO 8601 with offset (`2026-11-21T20:00:00-05:00`). Stored in UTC. **The server's clock is the only clock** — the frontend never decides time-based rules.
- **Coordinates are always named fields `{ "lat": 45.5048, "lng": -73.5772 }`. Never arrays.** Montreal `lng` is always negative; the server rejects positive `lng`.
- Errors: `{ "error": { "code": "INVALID_CODE", "message": "..." } }`. Validation errors add `error.fields`. The frontend switches on `error.code`.
- `DEMO_MODE=true` (backend `.env`) → every event's code window is `open`.

---

## 1. Rules (the server decides all of these)

### Accounts
- One role per account: `host` or `attendee`, chosen at sign-up.
- Hosts create events only. Hosts cannot RSVP or exchange, always have 0 points, and never appear on the leaderboard.

### Zones (fixed grid)
- Bounding box: south 45.44, west -73.68, north 45.58, east -73.50. **10 rows × 10 cols = 100 zones.**
- Cell size: 0.014° lat × 0.018° lng (≈1.5 km).
- **All grid math uses integer micro-degrees (never floating-point division):**
  ```
  lat_u = round(lat * 1_000_000)          // integer
  lng_u = round(lng * 1_000_000)          // integer
  inside  = 45_440_000 <= lat_u <= 45_580_000  and  -73_680_000 <= lng_u <= -73_500_000
  row     = min(9, intdiv(lat_u - 45_440_000, 14_000))
  col     = min(9, intdiv(lng_u + 73_680_000, 18_000))
  zone_id = row * 10 + col                // 0–99; row 0 = south, col 0 = west
  ```
  Outside the grid → `OUTSIDE_GRID`.
- **Boundary rule:** a point exactly on an inner boundary belongs to the cell to its **north** (row) and **east** (col). Points on the outer north/east edge are clamped into row/col 9.
- The same integer formula is used everywhere: the backend (authoritative), the frontend zone preview, and the seeder. Never compute zones from float division or by comparing against the float `bounds` in `GET /zones` (those are for drawing only).
- Center zone = McGill = row 4, col 5 → **zone 45**.
- `ring = max(|row - 4|, |col - 5|)`.
- `required_count`: ring 0–1 → 1, ring 2 → 2, ring 3 → 3, ring 4 → 4, ring ≥5 → 5.
- `bonus_points = required_count × 200`.
- Generated once by the seeder. The frontend may preview a zone for UX, but the server's value is the truth.
- Fog is **per user**. Event pins are visible even in fogged zones.

### Event creation (host)
**The pin's lat/lng is the truth. The address is display text only.**
1. **Primary: address search.** The host types an address → presses **Search** → the frontend calls Nominatim **once** → shows a draggable pin → the host checks it by eye, drags if needed, and confirms.
   - Only on button press. **No autocomplete.** Max 1 request/second (disable the button for 1 s after each call).
   - `https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=-73.68,45.58,-73.50,45.44&q=<query>` with `Accept-Language: en,fr`.
2. **Fallback: tap the map.** If search fails or is rate-limited, the host taps the map to drop the pin. **The form must always be submittable without a successful search.**
- The server validates lat/lng and **computes `zone_id` itself**.
- Validation (same on both sides): `title` 1–80 chars · `description` ≤ 500 · `location_name` 1–120 · `address` ≤ 200, optional · `starts_at` after now · `ends_at` after `starts_at`, ≤ 12 h later.
- Coordinates are checked in this order:
  1. **Field validation:** `lat` and `lng` are numbers, `lat > 0` and `lng < 0` → else `VALIDATION_FAILED` (wrong signs usually mean lat and lng were swapped).
  2. **Grid check:** the point is inside the grid → else `OUTSIDE_GRID`.
  The grid range is never a field-validation rule.

### Code window
- `before`: now < `starts_at − 3h`
- `open`: `starts_at − 3h` ≤ now ≤ `ends_at`
- `closed`: now > `ends_at`

### RSVP ("I'm going")
- Attendees only. Allowed while the window is `before` or `open` (walk-ins allowed). `closed` → `EVENT_ENDED`.
- The 4-digit code is issued only when the window is `open`, lazily (no cron): the first `GET /events/{id}` or `POST /rsvp` with the window `open` and no code yet. Unique within the event; stable after issue.
- **Cancel:** allowed until the user has a **completed** exchange at this event; cancelling deletes their pending exchanges there. After a completed exchange → `CANNOT_CANCEL`. No penalty.

### Exchange (both people must enter each other's code)
- One row per (event, pair), stored ordered (`user_low_id < user_high_id`) with two flags: `low_confirmed`, `high_confirmed`.
- Checks, in order:
  1. Caller is an attendee → else `FORBIDDEN_ROLE`
  2. Window is `open` → else `CODE_WINDOW_CLOSED`
  3. Caller has RSVP'd → else `NOT_GOING`
  4. Code belongs to an RSVP at this event → else `INVALID_CODE`
  5. Not the caller's own code → else `OWN_CODE`
  6. Pair not already completed at this event → else `ALREADY_EXCHANGED`
- In **one transaction**: upsert the pair row, set the caller's flag, **re-read the row with a lock**. Both flags true and `completed_at` null → complete it. (The re-read prevents the "both enter at the same moment and nothing completes" bug.)
- Re-entering while pending is idempotent → `pending` again.
- A pending exchange is valid until the code window closes. No deletion job needed.
- **On completion, for both users:** +100 points · `zone_progress.exchange_count` +1 for the event's zone · if `exchange_count ≥ required_count` and not yet unlocked → unlock + `bonus_points`.
- Same pair at a **different** event can exchange again.
- "Attended an event" = ≥1 completed exchange there.

### Leaderboard
- All-time `points`, attendees only. Ties share a rank (1, 1, 3).

---

## 2. Data model (backend)

```
users          id, name, email, password, role(host|attendee), points
zones          id(0-99), row, col, south, west, north, east, required_count, bonus_points
events         id, host_id, title, description, location_name, address(nullable), lat, lng, zone_id, starts_at, ends_at
rsvps          id, event_id, user_id, code(nullable), created_at
               UNIQUE(event_id, user_id), UNIQUE(event_id, code)
exchanges      id, event_id, user_low_id, user_high_id, low_confirmed, high_confirmed,
               completed_at(nullable),
               low_points_gained, high_points_gained, low_unlocked_now, high_unlocked_now
               UNIQUE(event_id, user_low_id, user_high_id)
zone_progress  user_id, zone_id, exchange_count, unlocked_at(nullable)
               UNIQUE(user_id, zone_id)
```

---

## 3. Endpoints (shapes are in `openapi.yaml`)

| Method | Path | Who | Purpose |
|---|---|---|---|
| POST | `/register` | anyone | Create account, choose role |
| POST | `/login` | anyone | Get a token |
| POST | `/logout` | any | Revoke token |
| GET | `/me` | any | Points + zone progress |
| GET | `/me/exchanges?since=` | any | New completed exchanges (toast + unlock animation) |
| GET | `/zones` | any | The 100-cell grid |
| GET | `/events` | any | Map pins (not ended) |
| POST | `/events` | host | Create event |
| GET | `/events/{id}` | any | Detail sheet, my code, pending partners |
| POST | `/events/{id}/rsvp` | attendee | I'm going |
| DELETE | `/events/{id}/rsvp` | attendee | Cancel going |
| POST | `/events/{id}/exchange` | attendee | Enter a code |
| GET | `/host/events` | host | My events + counts |
| GET | `/leaderboard` | any | Top 20 + me |

## 4. Error codes
| Code | HTTP | When |
|---|---|---|
| `UNAUTHENTICATED` | 401 | Missing or invalid token |
| `FORBIDDEN_ROLE` | 403 | Wrong role for this action |
| `NOT_GOING` | 403 | Exchange or cancel without an RSVP |
| `NOT_FOUND` | 404 | Unknown event id |
| `INVALID_CODE` | 404 | No RSVP at this event has that code |
| `OWN_CODE` | 422 | Entered your own code |
| `ALREADY_EXCHANGED` | 409 | Pair already completed at this event |
| `CODE_WINDOW_CLOSED` | 422 | Exchange outside the code window |
| `EVENT_ENDED` | 422 | RSVP after `ends_at` |
| `CANNOT_CANCEL` | 409 | Cancel after a completed exchange |
| `OUTSIDE_GRID` | 422 | Event location outside the grid |
| `VALIDATION_FAILED` | 422 | Form validation (with `error.fields`) |

## 5. Polling (frontend)
| What | Endpoint | Interval |
|---|---|---|
| "Someone met you" toast + unlock animation | `GET /me/exchanges?since=` | 5 s, app-wide |
| Map | `GET /events`, `GET /me` | 15 s |
| Event detail | `GET /events/{id}` | 5 s |
| Leaderboard | `GET /leaderboard` | on open |
| Zones | `GET /zones` | once at startup |

## 6. Golden test points (backend tests and frontend checks must agree)
| Point (lat, lng) | Expected |
|---|---|
| 45.5048, -73.5772 (McGill) | zone 45, required 1, bonus 200 |
| 45.44, -73.68 (SW corner) | zone 0, required 5 |
| 45.58, -73.50 (NE corner) | zone 99 (clamped), required 5 |
| 45.60, -73.70 | `OUTSIDE_GRID` |
| 45.5048, 73.5772 (positive lng) | `VALIDATION_FAILED` |
| 45.51, -73.58 (on a row boundary) | zone 55 |
| 45.538, -73.60 (on a row boundary; float math wrongly gives row 6) | zone 74 |
| 45.454, -73.662 (on a row and a column boundary) | zone 11 |

## 7. Demo safety
- **The demo must not depend on Nominatim.** Seeded events use hard-coded lat/lng.
- After seeding, show every demo event on the map and check each pin by eye.
- Seeder: 100 zones, 2 hosts, ~8 events (several in zone 45 and its neighbours), 6 attendees with known passwords.