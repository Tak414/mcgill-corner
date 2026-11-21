import { useState, type FormEvent } from 'react';
import { LocationPicker } from './LocationPicker';
import type { EventCreateRequest, EventFormProps } from './types';

type FormValues = Omit<EventCreateRequest, 'lat' | 'lng'>;

function isoDate(value: string) {
  return new Date(value).toISOString();
}

export function EventForm({ isSubmitting, errorMessage, fieldErrors, location, onSubmit, onCancel }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [locationName, setLocationName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!location.value) return;
    const values: FormValues = {
      title: title.trim(),
      location_name: locationName.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
      starts_at: isoDate(startsAt),
      ends_at: isoDate(endsAt),
    };
    onSubmit(values);
  }

  return (
    <form className="event-form ui-card" onSubmit={submit}>
      <div className="event-form-head"><button className="form-back" type="button" onClick={onCancel} aria-label="Cancel event creation">←</button><div><p className="ui-kicker">Make a little space to meet</p><h2>New event</h2></div></div>
      <div className="event-form-fields">
        <label><span className="ui-label">Event name</span><input className="ui-field" value={title} onChange={(event) => setTitle(event.target.value)} minLength={1} maxLength={80} required placeholder="Board game night" />{fieldErrors.title?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label>
        <label><span className="ui-label">Place name</span><input className="ui-field" value={locationName} onChange={(event) => setLocationName(event.target.value)} minLength={1} maxLength={120} required placeholder="Trottier Lobby" />{fieldErrors.location_name?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label>
        <div><span className="ui-label">Choose a pin</span><LocationPicker {...location} />{[...(fieldErrors.lat ?? []), ...(fieldErrors.lng ?? [])].map((message) => <small className="ui-error" key={message}>{message}</small>)}</div>
        <label><span className="ui-label">Address <small>(optional)</small></span><input className="ui-field" value={address} onChange={(event) => setAddress(event.target.value)} maxLength={200} placeholder="3630 Rue University" />{fieldErrors.address?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label>
        <label><span className="ui-label">A little about it <small>(optional)</small></span><textarea className="ui-field event-description" value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} placeholder="Come as you are. Games provided." />{fieldErrors.description?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label>
        <div className="event-time-fields"><label><span className="ui-label">Starts</span><input className="ui-field" type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required />{fieldErrors.starts_at?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label><label><span className="ui-label">Ends</span><input className="ui-field" type="datetime-local" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} required />{fieldErrors.ends_at?.map((message) => <small className="ui-error" key={message}>{message}</small>)}</label></div>
      </div>
      {errorMessage && <p className="event-form-error" role="alert">{errorMessage}</p>}
      <div className="event-form-actions"><button className="ui-button secondary" type="button" onClick={onCancel}>Cancel</button><button className="ui-button" type="submit" disabled={isSubmitting || location.value === null}>{isSubmitting ? 'Creating…' : 'Create event'}<span aria-hidden="true">→</span></button></div>
    </form>
  );
}
