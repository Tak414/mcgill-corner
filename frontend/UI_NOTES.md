# UI notes

`CodeInput` is required by `EventSheet`, but the provided `types.ts` contract does not define a props type for it. Proposed component-local props: `{ isSubmitting: boolean; onSubmitCode: (code: string) => void }`. The component uses local input state and submits exactly four numeric digits.

## Integration requests (Tak)

### Logout control (needs a decision)

No component offers a way to log out. Proposal: add an optional `onLogout?: () => void` to `TopBarProps` (for example, a menu on the avatar), and a host equivalent, either a small host top bar or `onLogout` on `HostEventListProps`.

Until then, the pages render a temporary control outside `components/`: a round "⎋" button above the bottom-right corner of the attendee map and leaderboard, and a "Signed in as … · Log out" row on the host pages (`pages/HostHeader.tsx`). These will be removed once a component provides logout.
