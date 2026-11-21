# UI notes

`CodeInput` is required by `EventSheet`, but the provided `types.ts` contract does not define a props type for it. Proposed component-local props: `{ isSubmitting: boolean; onSubmitCode: (code: string) => void }`. The component uses local input state and submits exactly four numeric digits.
