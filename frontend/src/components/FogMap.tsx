import { divIcon } from 'leaflet';
import { MapContainer, Marker, Popup, Rectangle, TileLayer, Tooltip, ZoomControl } from 'react-leaflet';
import type { FogMapProps, EventSummary } from './types';

const mcgill: [number, number] = [45.5048, -73.5772];

function eventIcon(event: EventSummary, selected: boolean) {
  const label = event.going_count > 0 ? String(event.going_count) : '·';
  return divIcon({
    className: '',
    html: `<div class="event-marker${selected ? ' selected' : ''}" aria-hidden="true">${label}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

export function FogMap({ zones, zoneProgress, events, selectedEventId, onPinClick }: FogMapProps) {
  const progressByZone = new Map(zoneProgress.map((progress) => [progress.zone_id, progress]));
  const unlockedCount = zoneProgress.filter((progress) => progress.unlocked).length;

  return (
    <div className="fog-map-wrap">
      <MapContainer className="fog-map" center={mcgill} zoom={12} zoomControl={false} scrollWheelZoom aria-label="Map of McGill and nearby event zones">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {/* top-left is taken by the progress card */}
        <ZoomControl position="bottomright" />
        {zones.cells.map((cell) => {
          const progress = progressByZone.get(cell.id);
          const unlocked = progress?.unlocked === true;
          return (
            <Rectangle
              key={cell.id}
              bounds={[[cell.bounds.south, cell.bounds.west], [cell.bounds.north, cell.bounds.east]]}
              pathOptions={{
                color: unlocked ? '#288765' : '#213d39',
                weight: unlocked ? 1.5 : 1,
                opacity: unlocked ? 0.62 : 0.44,
                fillColor: unlocked ? '#79c6a1' : '#1a302e',
                fillOpacity: unlocked ? 0.13 : 0.38,
              }}
            >
              <Tooltip sticky>{`Zone ${cell.id} · ${progress?.exchange_count ?? 0}/${cell.required_count}`}</Tooltip>
            </Rectangle>
          );
        })}
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={eventIcon(event, event.id === selectedEventId)}
            title={event.title}
            eventHandlers={{ click: () => onPinClick(event.id) }}
          >
            <Popup>
              <div className="map-popup"><strong>{event.title}</strong><span>{event.location_name}</span><small>{event.going_count} going</small></div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="map-progress-card">
        <div><span className="map-eyebrow">Your map</span><strong>{unlockedCount} zones open</strong></div>
        {zoneProgress.length > 0 ? <div className="map-progress-list">{zoneProgress.slice(0, 4).map((progress) => <span key={progress.zone_id} className={progress.unlocked ? 'open' : ''}>Z{progress.zone_id} <b>{progress.exchange_count}/{zones.cells[progress.zone_id]?.required_count ?? '—'}</b></span>)}</div> : <span className="map-progress-empty">Meet someone to begin clearing the fog.</span>}
      </div>
      <div className="map-compass" aria-hidden="true">N <span>↑</span></div>
    </div>
  );
}
