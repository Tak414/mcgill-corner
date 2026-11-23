# UNLOCK

> Events and places are the excuse; people are the point.

A mobile web app that gets newly arrived, shy McGill students out of their rooms and talking to someone. Montreal starts covered in fog. You clear it by going to real events and meeting people there in person: two people enter each other's 4-digit code, both earn points, and the fog over that part of the city lifts.

Built at **CodeJam 16** (McGill, November 2026), People First track.

**[Try the live demo →](https://mcgill-corner.vercel.app)** No sign-up: tap **Explore as Alex Chen**, RSVP to the choir concert at Pollack Hall, and enter Sophie's code `2468`. A few seconds later Sophie "enters" yours, the fog lifts over McGill / Downtown, and you climb from #9 to #6. The demo runs entirely in your browser (see [Demo mode](#demo-mode)).

### Demo videos

Recorded on an iPhone against the live app during CodeJam 16. Both are in the [UNLOCK playlist](https://www.youtube.com/playlist?list=PLYCcY2kaLh4o).

| Student side | Host side |
| :---: | :---: |
| [![Student side: RSVP, code exchange, fog reveal and rank-up](https://img.youtube.com/vi/hcjOoFPeGw0/hqdefault.jpg)](https://youtube.com/shorts/hcjOoFPeGw0) | [![Host side: creating an event and picking its location](https://img.youtube.com/vi/Hs12N6lxkLw/hqdefault.jpg)](https://youtube.com/shorts/Hs12N6lxkLw) |
| RSVP, meet someone, enter their code, watch the fog lift and your rank climb | Create an event, pick its place on the map, and see which zone it unlocks |

## My role

UNLOCK was a team project. I owned the parts that make it work end to end:

- **API contract.** I designed the contract between the frontend and backend ([`openapi.yaml`](contract/openapi.yaml) and [`api-contract.md`](contract/api-contract.md)): every request and response shape, every error code, and every game rule, written before either side was built so both could work in parallel.
- **Backend.** I implemented the Laravel JSON API: auth with Sanctum, events, RSVPs, the code exchange, points, zone unlocks and the leaderboard, with feature tests.
- **Frontend integration.** I connected the React app to the API: TanStack Query data fetching, polling, mutations, and error handling by `error.code`.
- **Reward moments.** I built the feedback that makes meeting someone feel good: the result card with a count-up, confetti and progress bar; the map flying to the zone while its fog clears; the rank-up slide on the leaderboard; sounds generated with the Web Audio API; vibration; and toast notifications.

The UI design is by my CodeJam teammate.

## Technical highlights

- **Contract first.** One OpenAPI file is the source of truth. The frontend's TypeScript types are generated from it (`npm run gen:api`), so a shape change breaks the build instead of the app.
- **The server decides every rule.** The code window, whether an exchange completed, points, unlocks and an event's zone are all computed by the API; the client only displays results.
- **No lost exchanges.** Both people must enter each other's code. The exchange is one row per pair, written in a single transaction that re-reads the row with a lock, so two people entering at the same moment still complete exactly once.
- **Exact zone math.** Montreal is a 10×10 grid. Zones are computed in integer micro-degrees, not floating point, so a point on a boundary lands in the same zone on the server, in the browser and in the seeder.
- **A reliable live feed.** Completed exchanges are polled every 5 s with a `since` cursor based on the server's clock, and both players get their result card whoever entered their code first.
- **Motion with care.** The fog reveal, the rank-up slide (a FLIP animation) and the count-ups all respect `prefers-reduced-motion`, and the celebration buttons take focus for keyboard and screen-reader users.
- **Demo mode.** With `VITE_DEMO_MODE=true`, the app swaps the network for an in-browser implementation of the same contract and rules, so the deployed demo needs no server.

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

### Demo mode

Build or run the frontend with `VITE_DEMO_MODE=true` and every API request is answered in the browser by [`frontend/src/api/demo/demoServer.ts`](frontend/src/api/demo/demoServer.ts). It follows the same contract and rules and uses the same accounts and events as the seeder. State is kept in `localStorage` and starts over after 6 hours, or when you press **Reset demo** on the login page. At each event, one explorer plays the person you meet: their code is shown in the event sheet, and they enter yours 4 seconds after you enter theirs.

```bash
cd frontend
VITE_DEMO_MODE=true npm run dev        # PowerShell: $env:VITE_DEMO_MODE='true'; npm run dev
```

### Working without the backend (mock server)

```bash
npx @stoplight/prism-cli mock contract/openapi.yaml -p 4010
```

Then point the frontend at `VITE_API_URL=http://localhost:4010`. Responses follow the examples in `openapi.yaml`. Add the header `Prefer: example=completed` (or `pending`) to pick an exchange response.

## Demo accounts

These accounts exist both in demo mode and after `php artisan migrate:fresh --seed`.

**Two-phone demo:** log in as `attendee1` and `attendee2` on two phones, RSVP to an open event, and enter each other's codes. Pollack Concert Hall (zone 45) or Upstairs Jazz Bar (zone 35) is the best choice: neither account has opened that zone yet, so each earns +300 (100 for meeting + 200 zone bonus), the fog clears, and both climb the leaderboard (attendee1 #9 → #6, attendee2 #10 → #7).

| Role | Email | Password | Start |
|---|---|---|---|
| Host | `host1@unlock.test` | `host12345` | Hosts all 6 demo events |
| Host | `host2@unlock.test` | `host12345` | No events yet |
| Attendee | `attendee1@unlock.test` (Alex Chen) | `unlock123` | #9 · 400 pts · 1 zone open |
| Attendee | `attendee2@unlock.test` (Maya Singh) | `unlock123` | #10 · 300 pts · 1 zone open |

### Explorers

Every explorer's password is `unlock123`. Ranks are the starting ranks; tied points share a rank.

| Rank | Name | Email | Points | Zones open |
|---|---|---|---|---|
| 1 | Sophie Tremblay | `sophie.tremblay@unlock.test` | 1,300 | 3 |
| 2 | Daniel Okafor | `daniel.okafor@unlock.test` | 1,100 | 3 |
| 3 | Priya Raman | `priya.raman@unlock.test` | 1,000 | 3 |
| 4 | Lucas Gagnon | `lucas.gagnon@unlock.test` | 900 | 3 |
| 5 | Mei Lin | `mei.lin@unlock.test` | 800 | 2 |
| 6 | Omar Haddad | `omar.haddad@unlock.test` | 500 | 1 |
| 6 | Chloé Bouchard | `chloe.bouchard@unlock.test` | 500 | 1 |
| 6 | Ethan Wright | `ethan.wright@unlock.test` | 500 | 1 |
| 10 | Gabriel Roy | `gabriel.roy@unlock.test` | 300 | 1 |
| 10 | Aisha Mohamed | `aisha.mohamed@unlock.test` | 300 | 1 |
| 13 | Julien Lefebvre | `julien.lefebvre@unlock.test` | 200 | 0 |
| 13 | Hana Kim | `hana.kim@unlock.test` | 200 | 0 |
| 13 | Mateo Garcia | `mateo.garcia@unlock.test` | 200 | 0 |
| 13 | Amélie Côté | `amelie.cote@unlock.test` | 200 | 0 |
| 13 | Ravi Patel | `ravi.patel@unlock.test` | 200 | 0 |
| 18 | Nora Lindqvist | `nora.lindqvist@unlock.test` | 100 | 0 |
| 18 | Samuel Nguyen | `samuel.nguyen@unlock.test` | 100 | 0 |
| 18 | Inès Benali | `ines.benali@unlock.test` | 100 | 0 |
| 18 | Liam O'Connor | `liam.oconnor@unlock.test` | 100 | 0 |
| 18 | Zoé Morin | `zoe.morin@unlock.test` | 100 | 0 |

Ranks 9 and 10 are attendee1 and attendee2 (above). Points follow the game's rules: +100 per completed exchange, plus the zone's bonus when it opens.

### Demo events

Real McGill events at their real venues. Times are set relative to the moment of seeding: the first three are open for code exchange right away, the rest start later the same day.

| Event | Venue | Zone | When (from seeding) |
|---|---|---|---|
| Grand Chœur de McGill et Chœur universitaire de McGill | Pollack Concert Hall, 555 Sherbrooke St W | 45 | Started 30 min ago, 2 h |
| McGill Jazz Combos | Upstairs Jazz Bar & Grill, 1254 Rue Mackay | 35 | Started 1 h ago, 3 h |
| McGill Infant Mental Health Day (CA$90) | MUHC Glen Site, 1001 Bd Décarie | 24 | Started 2 h ago, 7 h |
| Noël jazzé - Rémi Bolduc | Maison de la culture NDG – Botrel, 3755 Rue Botrel | 23 | In 5 h, 2 h |
| Basketball - MCGILL @ UQAM | UQAM Sports Center, 1212 Rue Sanguinet | 56 | In 6 h, 2 h |
| McGill University vs Université de Montréal | McConnell Arena, 3883 Rue University | 55 | In 8 h, 2.5 h |

With `DEMO_MODE=true` (as in production), every event's code window is open.


## Built with

Laravel · Sanctum · React · Vite · TypeScript · Leaflet · OpenStreetMap · Nominatim · TanStack Query · Tailwind

## Deployment

- Frontend: Vercel, built with `VITE_DEMO_MODE=true`, so the public demo needs no backend.
- Backend: ran on Laravel Cloud with Postgres during the hackathon. Locally and in tests it uses SQLite. To run the full stack, follow [Running locally](#running-locally).
