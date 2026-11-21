import type { HostEventListProps } from './types';

function formatStart(value: string) {
  return new Date(value).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function HostEventList({ events, onCreate, onSelect }: HostEventListProps) {
  return (
    <section className="host-events" aria-labelledby="host-events-title">
      <div className="host-events-head"><div><p className="ui-kicker">Bring people together</p><h2 id="host-events-title">Your events</h2><p className="ui-muted">A good gathering starts with a place to meet.</p></div><button className="ui-button" type="button" onClick={onCreate}><span aria-hidden="true">＋</span>Create event</button></div>
      {events.length === 0 ? <div className="host-empty ui-card"><div className="host-empty-mark" aria-hidden="true">⌖</div><h3>Your first event is waiting.</h3><p>Choose a place around McGill and invite your community.</p><button className="ui-button" type="button" onClick={onCreate}>Create an event</button></div> : <div className="host-event-grid">{events.map((event) => <button className="host-event-card ui-card" type="button" key={event.id} onClick={() => onSelect(event.id)}>
        <div className="host-event-art"><span className="host-event-zone">ZONE {event.zone_id}</span><span className={`window-pill ${event.code_window}`}>{event.code_window}</span><span className="host-orbit" /></div>
        <div className="host-event-content"><p className="ui-kicker">{event.location_name}</p><h3>{event.title}</h3><span className="host-event-date">{formatStart(event.starts_at)}</span><div className="host-event-stats"><span><strong>{event.going_count}</strong> going</span><span><strong>{event.completed_exchange_count}</strong> completed exchanges</span></div></div>
      </button>)}</div>}
    </section>
  );
}
