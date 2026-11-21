# UNLOCK — CodeJam 16

> Events and places are the excuse; people are the point.

A mobile web app that gets newly arrived, shy McGill students out of their rooms and talking to someone. Montreal starts covered in fog. You clear it by going to events and meeting other users there in person.

**Track:** People First (CodeJam 16, McGill, November 2026)

## The problem

Many McGill students arrive in Montreal completely alone. They want to make friends, but going out alone and starting a conversation with strangers feels too hard, so they stay in. There's no shortage of events. What's missing is a low-pressure reason to go, and a reason to talk to someone once you're there.

## How it works

1. **Explore:** the map of Montreal is split into 100 fogged zones, with event pins on top.
2. **Go:** tap a pin, see how many people are going, and press "I'm going".
3. **Meet:** at the event, two people enter each other's 4-digit code.
4. **Unlock:** both earn points, and the zone's fog clears once enough people have met there.
5. **Compete:** climb the all-time leaderboard.

Hosts (clubs, organizers) create the events. They don't earn points.

## Docs

| Doc | What it holds |
|---|---|
| [Requirements](https://claude.ai/artifact/F7xUKJgSB1oa12SR8VXNSw) | Problem, target user, value, scope, flows, architecture, open issues (shared with the team) |
| [`contract/openapi.yaml`](contract/openapi.yaml) | **Source of truth** for every request and response shape |
| [`contract/api-contract.md`](contract/api-contract.md) | The rules (zones, codes, points) and the reasons behind them |

Changing the API? Edit `contract/` in a PR, bump the version in both files, and tell the team.

## Repository layout

```
/contract   openapi.yaml + api-contract.md   (shared by both sides)
/backend    PHP + Laravel JSON API           (decides every rule)
/frontend   TypeScript + React (Vite)        (displays results only)
```

## Running locally

No Docker. You only need **PHP 8.2+**, **Composer** and **Node.js 20+**. The database is a single SQLite file.

### Backend (Laravel) — http://localhost:8000

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
touch database/database.sqlite   # DB_CONNECTION=sqlite in .env
php artisan install:api        # Sanctum + routes/api.php, if not done yet
php artisan migrate --seed     # 100 zones, demo hosts, events and attendees
php artisan serve
```

Set `DEMO_MODE=true` in `backend/.env` to keep every event's code window open for the demo.

### Frontend (React + Vite) — http://localhost:5173

```bash
cd frontend
npm install
npm run gen:api   # generates src/api/schema.d.ts from ../contract/openapi.yaml
npm run dev
```

`frontend/.env`:

```
VITE_API_URL=http://localhost:8000/api
```

Suggested scripts in `frontend/package.json`:

```json
"scripts": {
  "gen:api": "openapi-typescript ../contract/openapi.yaml -o src/api/schema.d.ts",
  "mock": "prism mock ../contract/openapi.yaml -p 4010"
}
```

### Working without the backend (mock server)

```bash
npx @stoplight/prism-cli mock contract/openapi.yaml -p 4010
```

Then point the frontend at `VITE_API_URL=http://localhost:4010`. Responses follow the examples in `openapi.yaml`. Add the header `Prefer: example=completed` (or `pending`) to pick an exchange response.

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Host | _[fill in after seeding]_ | |
| Attendee | _[fill in after seeding]_ | |

## Team

- _[Name]_ — _[role]_
- _[Name]_ — _[role]_
- _[Name]_ — _[role]_
- _[Name]_ — _[role]_

## Built with

Laravel · Sanctum · React · Vite · TypeScript · Leaflet · OpenStreetMap · Nominatim · TanStack Query · Tailwind