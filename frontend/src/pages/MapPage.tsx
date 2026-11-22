import { useEffect, useState } from 'react';
import { EventSheet, ExchangeResult, FogMap } from '../components';
import type { ExchangeResultProps } from '../components';
import { messageFor } from '../api';
import { useCancelRsvp, useEvent, useEvents, useExchange, useMe, useRsvp, useZones } from '../hooks';
import { useAttendeeShell } from './attendeeContext';

type ResultState =
  | { status: 'pending'; partnerName: string }
  | (Omit<Extract<ExchangeResultProps, { status: 'completed' }>, 'onClose'> & { celebrateZone: number | null });

export function MapPage() {
  const { showToast, celebrate } = useAttendeeShell();
  const zones = useZones();
  const events = useEvents();
  const me = useMe();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetError, setSheetError] = useState<string | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
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
        onSuccess: (res) => {
          if (res.status === 'pending') {
            setResult({ status: 'pending', partnerName: res.partner.name });
          } else {
            setResult({
              status: 'completed',
              partnerName: res.partner.name,
              pointsGained: res.points_gained,
              zone: res.zone,
              totalPoints: res.total_points,
              celebrateZone: res.zone.unlocked_now ? res.zone.zone_id : null,
            });
          }
        },
        onError: (e) => setSheetError(messageFor(e)),
      },
    );
  }

  function closeResult() {
    if (result?.status === 'completed' && result.celebrateZone !== null) celebrate(result.celebrateZone);
    setResult(null);
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
        />
      )}
      {result &&
        (result.status === 'pending' ? (
          <ExchangeResult status="pending" partnerName={result.partnerName} onClose={closeResult} />
        ) : (
          <ExchangeResult
            status="completed"
            partnerName={result.partnerName}
            pointsGained={result.pointsGained}
            zone={result.zone}
            totalPoints={result.totalPoints}
            onClose={closeResult}
          />
        ))}
    </>
  );
}
