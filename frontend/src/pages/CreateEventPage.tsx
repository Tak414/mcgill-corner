import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventForm } from '../components';
import type { EventCreateRequest, FieldErrors, LatLng, LocationPickerProps } from '../components';
import { errorMessages, isApiError, messageFor } from '../api';
import { useAuth } from '../auth';
import { useCreateEvent } from '../hooks';
import { geocode } from '../lib/nominatim';
import { zoneOf } from '../lib/zone';
import { HostHeader } from './HostHeader';

const SEARCH_GAP_MS = 1_000;

export function CreateEventPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const createEvent = useCreateEvent();

  const [pin, setPin] = useState<LatLng | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const lastSearchAt = useRef(0);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function handleSearch(query: string) {
    const now = Date.now();
    if (isSearching || now - lastSearchAt.current < SEARCH_GAP_MS) {
      setSearchError('One search per second, please — try again in a moment.');
      return;
    }
    lastSearchAt.current = now;
    setIsSearching(true);
    setSearchError(null);
    const res = await geocode(query);
    setIsSearching(false);
    if (res.kind === 'found') setPin(res.point);
    else if (res.kind === 'none') setSearchError('No match inside the map. Try another address, or tap the map to drop the pin.');
    else setSearchError("Address search isn't available right now. Tap the map to drop the pin.");
  }

  function handlePinChange(value: LatLng) {
    setPin(value);
    setSearchError(null);
  }

  const zone = pin ? zoneOf(pin.lat, pin.lng) : null;
  const zonePreview: LocationPickerProps['zonePreview'] = !pin
    ? null
    : zone
      ? { kind: 'inside', zoneId: zone.zoneId, requiredCount: zone.requiredCount }
      : { kind: 'outside' };

  function handleSubmit(values: Omit<EventCreateRequest, 'lat' | 'lng'>) {
    if (!pin || createEvent.isPending) return;
    setErrorMessage(null);
    setFieldErrors({});
    createEvent.mutate(
      { ...values, lat: pin.lat, lng: pin.lng },
      {
        onSuccess: () => navigate('/host'),
        onError: (e) => {
          if (isApiError(e) && e.code === 'VALIDATION_FAILED') {
            setFieldErrors(e.fields);
            setErrorMessage(errorMessages.VALIDATION_FAILED);
          } else {
            setErrorMessage(messageFor(e));
          }
        },
      },
    );
  }

  return (
    <div className="host-shell">
      <HostHeader name={user?.name ?? ''} />
      <EventForm
        isSubmitting={createEvent.isPending}
        errorMessage={errorMessage}
        fieldErrors={fieldErrors}
        location={{
          value: pin,
          onChange: handlePinChange,
          onSearch: (q) => void handleSearch(q),
          isSearching,
          searchError,
          zonePreview,
        }}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/host')}
      />
    </div>
  );
}
