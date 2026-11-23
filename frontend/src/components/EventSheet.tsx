import { CodeInput } from './CodeInput';
import { ZoneLabel } from './ZoneLabel';
import { formatStart, formatWindow } from './time';
import type { EventSheetProps } from './types';

export function EventSheet({ event, viewerRole, isSubmitting, errorMessage, onRsvp, onCancelRsvp, onSubmitCode, onClose, demoPartner = null }: EventSheetProps) {
  const hostView = viewerRole === 'host';

  return (
    <div className="sheet-backdrop" role="presentation" onMouseDown={(click) => { if (click.target === click.currentTarget) onClose(); }}>
      <section className="event-sheet" role="dialog" aria-modal="true" aria-labelledby="event-sheet-title">
        <div className="sheet-handle" aria-hidden="true" />
        <button className="sheet-close" type="button" onClick={onClose} aria-label="Close event details">×</button>
        <div className="sheet-scroll">
          <div className="event-cover"><span className="event-cover-mark">U</span><span className="event-cover-zone"><ZoneLabel zoneId={event.zone_id} /></span><span className="event-cover-orbit orbit-one" /><span className="event-cover-orbit orbit-two" /></div>
          <div className="event-sheet-main">
            <div className="event-title-row"><div><p className="ui-kicker">{event.location_name}</p><h2 id="event-sheet-title">{event.title}</h2></div><span className={`window-pill ${event.code_window}`}>{event.code_window}</span></div>
            <p className="event-sheet-desc">{event.description}</p>
            <div className="event-facts"><div><span>When</span><strong>{formatWindow(event.starts_at, event.ends_at)}</strong></div><div><span>Hosted by</span><strong>{event.host.name}</strong></div><div><span>Going</span><strong>{event.going_count} people</strong></div></div>
            {event.address && <p className="event-address"><span aria-hidden="true">⌖</span>{event.address}</p>}

            {hostView ? <div className="host-view-note"><span aria-hidden="true">◌</span><span>Host view · event details only</span></div> : <div className="event-actions">
              {!event.is_going && event.code_window !== 'closed' && <div className="rsvp-card"><div><strong>Come say hello</strong><span>Small moments make a new place feel like home.</span></div><button className="ui-button" type="button" disabled={isSubmitting} onClick={onRsvp}>{isSubmitting ? 'Joining…' : 'I’m going'}<span aria-hidden="true">→</span></button></div>}
              {!event.is_going && event.code_window === 'closed' && <div className="event-state-note"><strong>This gathering has ended.</strong><span>Look for another event nearby.</span></div>}
              {event.is_going && event.code_window === 'before' && <div className="event-state-note before-note"><span className="state-icon" aria-hidden="true">◷</span><div><strong>You’re on the list</strong><span>Your personal code appears at {formatStart(event.code_available_at)}.</span></div></div>}
              {event.is_going && event.code_window === 'open' && <div className="exchange-panel"><div className="your-code"><span>Your code</span><strong>{event.my_code ?? '····'}</strong><small>Share it with someone you meet here</small></div><div className="exchange-divider"><span>and they share theirs</span></div>{demoPartner && <p className="demo-hint"><span className="ui-kicker">Demo</span><span><strong>{demoPartner.name}</strong> is here too. Their code is <strong className="demo-hint-code">{demoPartner.code}</strong></span></p>}<CodeInput isSubmitting={isSubmitting} onSubmitCode={onSubmitCode} />{event.pending_from.length > 0 && <div className="pending-list"><p className="ui-kicker">Waiting for you</p>{event.pending_from.map((person) => <div className="pending-person" key={person.id}><span className="person-initial">{person.name.charAt(0)}</span><span><strong>{person.name}</strong> entered your code — enter theirs to finish</span></div>)}</div>}</div>}
              {event.is_going && event.code_window === 'closed' && <div className="event-state-note"><strong>Thanks for being there.</strong><span>The exchange window is now closed.</span></div>}
              {event.is_going && !event.can_cancel && <p className="cancel-locked-note">You’ve met someone here, so your RSVP is confirmed.</p>}
              {event.is_going && event.can_cancel && <button className="cancel-link" type="button" disabled={isSubmitting} onClick={onCancelRsvp}>{isSubmitting ? 'Updating…' : 'Cancel RSVP'}</button>}
              {errorMessage && <p className="event-api-error" role="alert">{errorMessage}</p>}
            </div>}

            {event.people_met_here.length > 0 && <div className="met-here"><div className="section-heading"><h3>People you met here</h3><span>{event.people_met_here.length}</span></div><div className="met-people">{event.people_met_here.map((person) => <span className="met-person" key={person.id}><span className="person-initial">{person.name.charAt(0)}</span>{person.name}</span>)}</div></div>}
          </div>
        </div>
      </section>
    </div>
  );
}
