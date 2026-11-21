# UI notes

`CodeInput` is required by `EventSheet`, but the provided `types.ts` contract does not define a props type for it. Proposed component-local props: `{ isSubmitting: boolean; onSubmitCode: (code: string) => void }`. The component uses local input state and submits exactly four numeric digits.

## Integration requests (Tak)

### Logout control — resolved

`TopBarProps` now has `role` and `onLogout`. Tapping the avatar opens a small menu with name, role, points and "Log out". The temporary round logout button on the attendee screens has been removed. The host pages (which have no TopBar) still use the "Signed in as … · Log out" row in `pages/HostHeader.tsx`.

### Bug: address search reloads the page (blocks "create by address search")

`EventForm` renders `<LocationPicker>` inside its `<form>`, and `LocationPicker` renders its own `<form className="location-search">`. Nested forms are invalid HTML, and React warns about them in the console ("`<form>` cannot be a descendant of `<form>`"). In the real app (headless Chrome, found during the step 7 walkthrough), pressing **Search** does a native GET submit to `/host/new?`. The page reloads, every field is cleared, and `onSearch` is never called. Tap/drag still works.

Proposed fix (inside `LocationPicker`, no prop changes):
- Replace `<form className="location-search" onSubmit={submitSearch}>` with `<div className="location-search" role="search">`.
- Make the Search button `type="button"` with `onClick={runSearch}`.
- On the input, add `onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); runSearch(); } }}`. The `preventDefault` stops Enter from submitting the outer event form.

The integration side is ready: `CreateEventPage.onSearch` → `lib/nominatim.ts` was checked in the browser ("3630 Rue University" → zone 45; a Toronto query → "no match").

### Minor: FogMap progress card covers the zoom control

In the full-screen map, `.map-progress-card` ("Your map · N zones open") sits over Leaflet's top-left +/− zoom control, so the control can't be clicked. Suggest moving the zoom control (`zoomControl={false}` plus `<ZoomControl position="bottomright" />`) or offsetting the card.
