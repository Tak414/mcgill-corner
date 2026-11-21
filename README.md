# UNLOCK

Mobile-first campus discovery MVP. The root directory contains the Next.js app; `backend/` is the original Laravel starter and is preserved as-is.

## Start locally

1. Install Node.js 20.9 or newer.
2. Copy `.env.example` to `.env.local` and add a Supabase project URL and publishable key. Add a Mapbox public token to enable the interactive map; without it, a campus map preview and the seeded demo journey remain available.
3. Install dependencies with `npm install`.
4. Apply the SQL migration in `supabase/migrations/202611200001_initial_schema.sql` to the Supabase project.
5. Run `npm run dev` and open <http://localhost:3000>.

The Supabase migration seeds campus interests and achievements. The visible events and profile in the UI are demo fixtures; demo RSVPs and hosted events are held in the browser, while authentication uses Supabase email magic links when configured.

## Environment

- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: Supabase publishable key (safe to expose to the browser; database access is controlled by RLS)
- `NEXT_PUBLIC_MAPBOX_TOKEN`: public Mapbox token restricted to the app's origins

Never put a Supabase service-role key in a `NEXT_PUBLIC_` variable or browser code.
