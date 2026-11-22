# UI notes

`CodeInput` is required by `EventSheet`, but the provided `types.ts` contract does not define a props type for it. Proposed component-local props: `{ isSubmitting: boolean; onSubmitCode: (code: string) => void }`. The component uses local input state and submits exactly four numeric digits.

## Integration requests (Tak)

### Logout control — resolved

`TopBarProps` now has `role` and `onLogout`. Tapping the avatar opens a small menu with name, role, points and "Log out". The temporary round logout button on the attendee screens has been removed. The host pages (which have no TopBar) still use the "Signed in as … · Log out" row in `pages/HostHeader.tsx`.

### Address search reloaded the page — fixed

`LocationPicker` rendered its own `<form>` inside `EventForm`'s `<form>`. Nested forms broke submission: pressing Search did a native GET to `/host/new?` and cleared the form. The search bar is now a `div` with a `type="button"` Search button. Enter in the search box searches and does not submit the event form. Checked in headless Chrome: search drops the pin (zone 45 preview), and a second Search press or Enter creates no event.

### FogMap progress card covered the zoom control — fixed

The zoom control is now at the bottom right (`zoomControl={false}` plus `<ZoomControl position="bottomright" />`).

### CodeInput props

`CodeInputProps` now lives in `types.ts` with the other props types.
