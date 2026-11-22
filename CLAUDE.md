# CLAUDE.md — UNLOCK (CodeJam 16)

Read this first in every session.

## Project

UNLOCK is a mobile web app that gets newly arrived, shy McGill students out to events and talking to someone. Montreal is split into a 10×10 grid of fogged zones. Attendees RSVP to events; at the event, two people enter each other's 4-digit code to complete an exchange, which earns points and unlocks zones. Hosts (clubs) create events and earn no points.

Hackathon: CodeJam 16, McGill. **No edits after Sunday 12:00 (Montreal time).** Submission is through GitHub.

## Stack (one stack only — never change it)

- Backend: PHP + Laravel JSON API under `/api`, Sanctum bearer tokens, SQLite (single file). No Docker.
- Frontend: TypeScript + React + Vite in `/frontend`, React Router, TanStack Query, Leaflet + react-leaflet with OpenStreetMap tiles, Tailwind CSS.
- NOT used: Next.js, Supabase, Docker, Mapbox, Google Maps, Postgres/MySQL, GraphQL.
- Deployment exception: production on Laravel Cloud uses Postgres (Cloud's disk is wiped on every deploy, so a SQLite file can't survive); local dev and tests stay on SQLite. Frontend is deployed on Vercel.

## Source of truth

- `/contract/openapi.yaml` — every request and response shape (currently v0.2.3).
- `/contract/api-contract.md` — the rules (zones, code window, exchange, points) and why.
- Never edit `/contract` without the team agreeing. If code and contract disagree, the contract wins; if the contract seems wrong, stop and report it.
- The server decides every rule (code window, exchange result, points, unlocks, zone of an event). The frontend only displays results.

## Repository layout

Tak now owns the whole repository (backend and frontend). Any folder may be edited.

```
/contract                 shared contract — change only deliberately, bump the version
/backend                  Laravel API
/frontend
  src/components/         presentational components; props in components/types.ts
  src/fixtures/           fake data for the gallery
  src/gallery/            component gallery (dev page at /gallery)
  src/api/                API client, generated schema.d.ts, error messages
  src/auth/               login state and token
  src/hooks/              data fetching, polling, mutations
  src/pages/              screens: fetch data and pass it into components
  src/lib/                shared pure helpers, e.g. zone math
  src/App.tsx             app root and routes
```

- Keep the separation anyway: components stay presentational (data in through props, actions out through callbacks); pages and hooks do the data work.
- When a component needs a new prop, update `components/types.ts`, the component, its gallery fixture and every page that uses it in the same change, and keep `npm run build` passing.
- Replace any remaining stubs in `src/pages/_stubs/` with real components and delete the stubs.

## Dependency direction (frontend)

- `pages/` → `hooks/` → `api/`
- `pages/` → `components/`
- `components/` → `components/types.ts` → `api/schema.d.ts` (types only, `import type`)
- `gallery/` → `components/` + `fixtures/`
- Components never import from `api/`, `hooks/`, `pages/`, `auth/`, `fixtures/` or `gallery/`.

## Key rules to remember

- Coordinates are always `{ lat, lng }` objects. Leaflet takes `[lat, lng]`; never `[lng, lat]`. Montreal `lng` is negative.
- Zone math uses **integer micro-degrees** (see api-contract.md "Zones"). Never compute a zone with float division or by comparing against the float bounds from `GET /zones` (those are for drawing only).
- Errors always look like `{ "error": { "code", "message", "fields"? } }`. Switch on `error.code`, never on the message.
- Polling: `/me/exchanges?since=` every 5 s app-wide, `/events/{id}` every 5 s while open, `/events` and `/me` every 15 s, `/zones` once.
- Address search (Nominatim): only on Search button press, at most 1 request per second, no autocomplete, `bounded=1` with the grid viewbox, `Accept-Language: en,fr`. Tapping the map must always work as a fallback.
- Keep the "© OpenStreetMap contributors" credit on every map.
- Do not add features that are not in the contract or the requirements (no chat, profiles, interests, achievements).

## Commands (Windows, PowerShell)

Backend (in `/backend`):
- `php artisan serve` — API on http://localhost:8000
- `php artisan migrate:fresh --seed` — reset and load demo data
- `php artisan test` — backend tests
- `& 'C:\Program Files\Git\bin\bash.exe' scripts/smoke.sh` — end-to-end exchange check (from `/backend`, or `backend/scripts/smoke.sh` from the root)
- `DEMO_MODE=true` in `backend/.env` keeps every event's code window open (restart `php artisan serve` after changing it).

Frontend (in `/frontend`):
- `npm run dev` — http://localhost:5173
- `npm run build` — must pass with no TypeScript errors
- `npm run gen:api` — regenerate `src/api/schema.d.ts` from the contract
- `frontend/.env`: `VITE_API_URL=http://localhost:8000/api`

Demo accounts: `attendee1`…`attendee6@unlock.test` / `unlock123`; `host1`, `host2@unlock.test` / `host12345`.

## How to work

- Work on a branch, never directly on `main`. Small commits with clear messages.
- Run the relevant checks (`npm run build`, `php artisan test`) before every commit.
- Ask before pushing, before deleting files, and before any large change.
- The user's machine is Windows 11 with PowerShell, PHP 8.5 via Laravel Herd, Node 24, Git for Windows. Give commands in PowerShell syntax.