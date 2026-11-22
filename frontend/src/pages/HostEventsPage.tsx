import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { EventSheet, HostEventList } from '../components';
import { messageFor } from '../api';
import { useAuth } from '../auth';
import { useEvent, useHostEvents } from '../hooks';
import { HostHeader } from './HostHeader';

const noop = () => {};

export function HostEventsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hostEvents = useHostEvents();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const event = useEvent(selectedId);

  return (
    <div className="host-shell">
      <HostHeader name={user?.name ?? ''} />
      {hostEvents.data ? (
        <HostEventList events={hostEvents.data} onCreate={() => navigate('/host/new')} onSelect={setSelectedId} />
      ) : (
        <div className="page-status" role="status">
          <span className="ui-muted">{hostEvents.isError ? messageFor(hostEvents.error) : 'Loading your events…'}</span>
        </div>
      )}
      {selectedId !== null && event.data && (
        <EventSheet
          event={event.data}
          viewerRole="host"
          isSubmitting={false}
          errorMessage={null}
          onRsvp={noop}
          onCancelRsvp={noop}
          onSubmitCode={noop}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
