import type { DemoPanelProps } from './types';

/** Login-page card for the no-backend demo: one tap into a seeded account. */
export function DemoPanel({ isSubmitting, onExplore, onReset, wasReset }: DemoPanelProps) {
  return (
    <section className="demo-panel ui-card" aria-labelledby="demo-panel-title">
      <p className="ui-kicker">Demo mode</p>
      <h2 id="demo-panel-title">Try it without a server</h2>
      <p>Everything runs in your browser. You start as <strong>Alex Chen, #9</strong>. Tap an event, press “I’m going”, and enter the code of the person you meet there. Watch the fog lift and your rank climb.</p>
      <div className="demo-panel-actions">
        <button className="ui-button" type="button" disabled={isSubmitting} onClick={() => onExplore('attendee')}>Explore as Alex Chen<span aria-hidden="true">→</span></button>
        <button className="ui-button secondary" type="button" disabled={isSubmitting} onClick={() => onExplore('host')}>See the host side</button>
      </div>
      <p className="demo-panel-foot">
        Or sign in with any account from the README (password <code>unlock123</code>).{' '}
        <button className="demo-reset" type="button" onClick={onReset}>{wasReset ? 'Demo reset ✓' : 'Reset demo'}</button>
      </p>
    </section>
  );
}
