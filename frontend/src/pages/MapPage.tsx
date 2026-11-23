import { useEffect, useState } from 'react';
import { EventSheet, FogMap } from '../components';
import { DEMO_MODE, messageFor } from '../api';
import { demoPartnerFor } from '../api/demo/demoServer';
import { useCancelRsvp, useEvent, useEvents, useExchange, useMe, useRsvp, useZones } from '../hooks';
import { useAttendeeShell } from './attendeeContext';

export function MapPage() {
  const { showToast, showResult, heldZoneIds, reveal, onRevealStart, onRevealEnd } = useAttendeeShell();
  const zones = useZones();
  const events = useEvents();
  const me = useMe();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const event = useEvent(selectedId);

  const rsvp = useRsvp();
  const cancelRsvp = useCancelRsvp();
  const exchange = useExchange();
  const isSubmitting = rsvp.isPending || cancelRsvp.isPending || exchange.isPending;

  // The open event disappeared (unknown id) or can't be loaded: close the sheet and say why.
  useEffect(() => {
    if (selectedId !== null && event.isError && !event.data) {
      showToast(messageFor(event.error), 'error');
      setSelectedId(null);
    }
  }, [selectedId, event.isError, event.data, event.error, showToast]);

  // When a zone's fog starts to lift, get the event sheet out of the way so the map is visible.
  const revealKey = reveal?.key ?? null;
  useEffect(() => {
    if (revealKey !== null) setSelectedId(null);
  }, [revealKey]);

  function selectEvent(id: number | null) {
    setSelectedId(id);
    setSheetError(null);
  }

  function handleRsvp() {
    if (selectedId === null || isSubmitting) return;
    setSheetError(null);
    rsvp.mutate(selectedId, { onError: (e) => setSheetError(messageFor(e)) });
  }

  function handleCancelRsvp() {
    if (selectedId === null || isSubmitting) return;
    setSheetError(null);
    cancelRsvp.mutate(selectedId, { onError: (e) => setSheetError(messageFor(e)) });
  }

  function handleSubmitCode(code: string) {
    if (selectedId === null || isSubmitting) return;
    setSheetError(null);
    exchange.mutate(
      { eventId: selectedId, code },
      {
        // Shown by the layout, which also shows the partner's side and the unlock celebration after it.
        onSuccess: (res) => {
          const exchangeOf = { eventId: selectedId, partnerId: res.partner.id, partnerName: res.partner.name };
          if (res.status === 'pending') {
            showResult({ ...exchangeOf, status: 'pending' });
          } else {
            showResult({ ...exchangeOf, status: 'completed', pointsGained: res.points_gained, zone: res.zone, totalPoints: res.total_points });
          }
        },
        onError: (e) => setSheetError(messageFor(e)),
      },
    );
  }

  if (!zones.data) {
    return (
      <div className="page-center map-loading" role="status">
        <span className="ui-muted">{zones.isError ? messageFor(zones.error) : 'Loading the map…'}</span>
      </div>
    );
  }

  return (
    <>
      <FogMap
        zones={zones.data}
        zoneProgress={me.data?.zone_progress ?? []}
        events={events.data ?? []}
        selectedEventId={selectedId}
        onPinClick={selectEvent}
        heldZoneIds={heldZoneIds}
        reveal={reveal}
        onRevealStart={onRevealStart}
        onRevealEnd={onRevealEnd}
      />
      {selectedId !== null && event.data && (
        <EventSheet
          event={event.data}
          viewerRole="attendee"
          isSubmitting={isSubmitting}
          errorMessage={sheetError}
          onRsvp={handleRsvp}
          onCancelRsvp={handleCancelRsvp}
          onSubmitCode={handleSubmitCode}
          onClose={() => selectEvent(null)}
          demoPartner={DEMO_MODE ? metOrNull(event.data, demoPartnerFor(event.data.id)) : null}
        />
      )}
    </>
  );
}

/** The demo partner's hint, until the visitor has met them at this event. */
function metOrNull(event: { people_met_here: { name: string }[] }, partner: { name: string; code: string } | null) {
  return partner && !event.people_met_here.some((person) => person.name === partner.name) ? partner : null;
}
