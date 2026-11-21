import { useState, type FormEvent } from 'react';

export type CodeInputProps = {
  isSubmitting: boolean;
  onSubmitCode: (code: string) => void;
};

export function CodeInput({ isSubmitting, onSubmitCode }: CodeInputProps) {
  const [code, setCode] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (/^[0-9]{4}$/.test(code) && !isSubmitting) onSubmitCode(code);
  }

  return (
    <form className="code-input" onSubmit={submit}>
      <label htmlFor="unlock-code" className="ui-label">Enter their 4-digit code</label>
      <div className="code-entry-row">
        <input
          id="unlock-code"
          className="ui-field code-entry"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{4}"
          maxLength={4}
          minLength={4}
          placeholder="0000"
          value={code}
          onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 4))}
          aria-label="Four digit event code"
          required
        />
        <button className="ui-button code-submit" type="submit" disabled={isSubmitting || code.length !== 4} aria-label="Submit code">
          {isSubmitting ? <span className="button-spinner" /> : <span aria-hidden="true">↗</span>}
        </button>
      </div>
    </form>
  );
}
