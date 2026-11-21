import { useState, type ReactNode } from 'react';
import {
  AuthForm,
  BottomTabs,
  EventForm,
  EventSheet,
  ExchangeResult,
  FogMap,
  HostEventList,
  Leaderboard,
  LocationPicker,
  ToastStack,
  TopBar,
  UnlockCelebration,
  type EventDetail,
} from '../components';
import {
  eventCannotCancel,
  eventClosed,
  eventGoingBefore,
  eventGoingOpen,
  eventNotGoing,
  events,
  hostEvents,
  meInTop,
  meOutsideTop,
  resultZone,
  top,
  toasts,
  zoneProgress,
  zones,
} from '../fixtures/uiFixtures';

type Story = {
  id: string;
  label: string;
  render: () => ReactNode;
};

const noFieldErrors = {};
const noOp = () => undefined;
const eventForMap: Record<number, EventDetail> = {
  12: eventGoingOpen,
  13: eventNotGoing,
  14: eventGoingBefore,
};

export function Gallery() {
  const [scene, setScene] = useState('map');
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [tab, setTab] = useState<'map' | 'leaderboard'>('map');
  const [shownToasts, setShownToasts] = useState(toasts);

  const stories: Story[] = [
    { id: 'map', label: 'FogMap · pins and zone progress', render: () => <div className="map-demo-phone gallery-phone"><FogMap zones={zones} zoneProgress={zoneProgress} events={events} selectedEventId={selectedEventId} onPinClick={setSelectedEventId} /><TopBar name="Alex Chen" points={2600} unlockedCount={2} /><BottomTabs active={tab} onChange={setTab} />{selectedEventId !== null && <EventSheet event={eventForMap[selectedEventId] ?? eventNotGoing} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={() => setSelectedEventId(null)} />}</div> },
    { id: 'auth-login', label: 'AuthForm · sign in', render: () => <AuthForm mode="login" isSubmitting={false} errorMessage={null} fieldErrors={noFieldErrors} onSubmit={noOp} onSwitchMode={noOp} /> },
    { id: 'auth-register', label: 'AuthForm · register', render: () => <AuthForm mode="register" isSubmitting={false} errorMessage={null} fieldErrors={noFieldErrors} onSubmit={noOp} onSwitchMode={noOp} /> },
    { id: 'auth-error', label: 'AuthForm · validation error', render: () => <AuthForm mode="login" isSubmitting={false} errorMessage="We couldn’t find an account with those details." fieldErrors={{ email: ['Enter a valid McGill email address.'] }} onSubmit={noOp} onSwitchMode={noOp} /> },
    { id: 'auth-loading', label: 'AuthForm · submitting', render: () => <AuthForm mode="register" isSubmitting errorMessage={null} fieldErrors={noFieldErrors} onSubmit={noOp} onSwitchMode={noOp} /> },
    { id: 'topbar', label: 'TopBar', render: () => <div className="gallery-wide"><TopBar name="Alex Chen" points={2600} unlockedCount={2} /></div> },
    { id: 'tabs', label: 'BottomTabs', render: () => <div className="tabs-preview"><BottomTabs active={tab} onChange={setTab} /></div> },
    { id: 'event-not-going', label: 'EventSheet · not going', render: () => <EventSheet event={eventNotGoing} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-before', label: 'EventSheet · going, before window', render: () => <EventSheet event={eventGoingBefore} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-open', label: 'EventSheet · code and pending partner', render: () => <EventSheet event={eventGoingOpen} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-closed', label: 'EventSheet · closed', render: () => <EventSheet event={eventClosed} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-host', label: 'EventSheet · host view', render: () => <EventSheet event={eventNotGoing} viewerRole="host" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-cannot-cancel', label: 'EventSheet · cancel locked, people met', render: () => <EventSheet event={eventCannotCancel} viewerRole="attendee" isSubmitting={false} errorMessage={null} onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'event-error', label: 'EventSheet · submitting and error', render: () => <EventSheet event={eventGoingOpen} viewerRole="attendee" isSubmitting errorMessage="That code belongs to someone else at this event." onRsvp={noOp} onCancelRsvp={noOp} onSubmitCode={noOp} onClose={noOp} /> },
    { id: 'result-pending', label: 'ExchangeResult · pending', render: () => <ExchangeResult status="pending" partnerName="Ana" onClose={noOp} /> },
    { id: 'result-complete', label: 'ExchangeResult · complete', render: () => <ExchangeResult status="completed" partnerName="Léa" pointsGained={300} zone={resultZone} totalPoints={2900} onClose={noOp} /> },
    { id: 'unlock', label: 'UnlockCelebration', render: () => <UnlockCelebration zoneId={45} bonusPoints={200} onDone={() => setScene('map')} /> },
    { id: 'toasts', label: 'ToastStack · all variants', render: () => <ToastStack toasts={shownToasts} onDismiss={(id) => setShownToasts((current) => current.filter((toast) => toast.id !== id))} /> },
    { id: 'leaderboard-top', label: 'Leaderboard · tied ranks, me in top 20', render: () => <Leaderboard top={top} me={meInTop} /> },
    { id: 'leaderboard-outside', label: 'Leaderboard · me outside top 20', render: () => <Leaderboard top={top} me={meOutsideTop} /> },
    { id: 'host-events', label: 'HostEventList · populated', render: () => <HostEventList events={hostEvents} onCreate={noOp} onSelect={noOp} /> },
    { id: 'host-events-empty', label: 'HostEventList · empty', render: () => <HostEventList events={[]} onCreate={noOp} onSelect={noOp} /> },
    { id: 'location-inside', label: 'LocationPicker · inside zone', render: () => <LocationPicker value={{ lat: 45.5048, lng: -73.5772 }} onChange={noOp} onSearch={noOp} isSearching={false} searchError={null} zonePreview={{ kind: 'inside', zoneId: 45, requiredCount: 1 }} /> },
    { id: 'location-outside', label: 'LocationPicker · outside grid', render: () => <LocationPicker value={{ lat: 45.60, lng: -73.70 }} onChange={noOp} onSearch={noOp} isSearching={false} searchError={null} zonePreview={{ kind: 'outside' }} /> },
    { id: 'location-searching', label: 'LocationPicker · searching', render: () => <LocationPicker value={null} onChange={noOp} onSearch={noOp} isSearching searchError={null} zonePreview={null} /> },
    { id: 'location-error', label: 'LocationPicker · search error', render: () => <LocationPicker value={null} onChange={noOp} onSearch={noOp} isSearching={false} searchError="Search is taking a break. Tap the map to place your pin." zonePreview={null} /> },
    { id: 'event-form', label: 'EventForm · ready', render: () => <EventForm isSubmitting={false} errorMessage={null} fieldErrors={noFieldErrors} location={{ value: { lat: 45.5048, lng: -73.5772 }, onChange: noOp, onSearch: noOp, isSearching: false, searchError: null, zonePreview: { kind: 'inside', zoneId: 45, requiredCount: 1 } }} onSubmit={noOp} onCancel={noOp} /> },
    { id: 'event-form-error', label: 'EventForm · validation errors', render: () => <EventForm isSubmitting={false} errorMessage="Some fields need another look." fieldErrors={{ title: ['The title may not be greater than 80 characters.'], ends_at: ['End time must be after the start time.'] }} location={{ value: null, onChange: noOp, onSearch: noOp, isSearching: false, searchError: null, zonePreview: null }} onSubmit={noOp} onCancel={noOp} /> },
  ];
  const activeStory = stories.find((story) => story.id === scene) ?? stories[0];
  const isMap = activeStory.id === 'map';

  return (
    <main className="gallery-shell">
      <header className="gallery-head"><div><span className="ui-kicker">UNLOCK · UI gallery</span><h1 className="gallery-title">Small moments, open map.</h1></div><label className="gallery-story-select"><span className="sr-only">Choose a component state</span><select className="gallery-select" value={activeStory.id} onChange={(event) => setScene(event.target.value)}>{stories.map((story) => <option value={story.id} key={story.id}>{story.label}</option>)}</select></label></header>
      <section className={`gallery-stage ${isMap ? 'map-story-stage' : ''}`} aria-label={activeStory.label}>{activeStory.render()}</section>
      <footer className="gallery-footer"><span>Fake data · presentational components</span><span>OpenStreetMap · Leaflet</span></footer>
    </main>
  );
}
