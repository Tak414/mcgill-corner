import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { divIcon, type Marker as LeafletMarker } from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import type { LatLng, LocationPickerProps } from './types';

const center: LatLng = { lat: 45.5048, lng: -73.5772 };
const pinIcon = divIcon({ className: '', html: '<span class="picker-marker" aria-hidden="true"></span>', iconSize: [24, 32], iconAnchor: [12, 29] });

function ClickToPlace({ onChange }: Pick<LocationPickerProps, 'onChange'>) {
  useMapEvents({ click: (event) => onChange({ lat: event.latlng.lat, lng: event.latlng.lng }) });
  return null;
}

function MapUpdater({ value }: { value: LatLng | null }) {
  const map = useMap();
  useEffect(() => {
    const point = value ?? center;
    map.setView([point.lat, point.lng], map.getZoom(), { animate: true });
  }, [map, value?.lat, value?.lng]);
  return null;
}

function DragPin({ value, onChange }: { value: LatLng; onChange: LocationPickerProps['onChange'] }) {
  return <Marker
    position={[value.lat, value.lng]}
    icon={pinIcon}
    draggable
    eventHandlers={{ dragend: (event) => {
      const marker = event.target as LeafletMarker;
      const point = marker.getLatLng();
      onChange({ lat: point.lat, lng: point.lng });
    } }}
  />;
}

export function LocationPicker({ value, onChange, onSearch, isSearching, searchError, zonePreview }: LocationPickerProps) {
  const [query, setQuery] = useState('');
  const [coolingDown, setCoolingDown] = useState(false);
  const cooldownTimer = useRef<number | null>(null);
  const mapCenter = value ?? center;

  useEffect(() => () => {
    if (cooldownTimer.current !== null) window.clearTimeout(cooldownTimer.current);
  }, []);

  // Not a <form>: LocationPicker renders inside EventForm's <form>, and nested forms break submission.
  function runSearch() {
    const search = query.trim();
    if (search && !isSearching && !coolingDown) {
      onSearch(search);
      setCoolingDown(true);
      cooldownTimer.current = window.setTimeout(() => setCoolingDown(false), 1000);
    }
  }

  // A tapped or dragged pin no longer matches the searched text, so clear it.
  // (No reverse geocoding: Nominatim is called only on a Search press.)
  function placeManually(point: LatLng) {
    setQuery('');
    onChange(point);
  }

  function searchOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return;
    event.preventDefault(); // Enter here must search, not submit the surrounding event form
    runSearch();
  }

  return (
    <section className="location-picker" aria-label="Choose the event pin">
      <div className="location-search" role="search">
        <label className="location-search-input"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={searchOnEnter} placeholder="Search an address" aria-label="Search an address" /></label>
        <button className="ui-button" type="button" onClick={runSearch} disabled={isSearching || coolingDown || query.trim().length === 0}>{isSearching ? 'Searching…' : coolingDown ? 'Wait a moment' : 'Search'}</button>
      </div>
      {searchError && <p className="location-error" role="alert">{searchError}</p>}
      <div className="location-map-frame">
        <MapContainer className="location-map" center={[mapCenter.lat, mapCenter.lng]} zoom={14} scrollWheelZoom aria-label="Tap or drag to place the event pin">
          <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapUpdater value={value} />
          <ClickToPlace onChange={placeManually} />
          {value && <DragPin value={value} onChange={placeManually} />}
        </MapContainer>
        <span className="location-map-hint">Tap map to drop a pin · drag to adjust</span>
      </div>
      {zonePreview && <div className={`zone-preview ${zonePreview.kind}`} aria-live="polite">{zonePreview.kind === 'inside' ? <><span className="preview-dot" />Zone {zonePreview.zoneId} · needs {zonePreview.requiredCount} {zonePreview.requiredCount === 1 ? 'meetup' : 'meetups'}</> : <><span className="preview-warning">!</span>Outside the map — pick a spot inside the grid</>}</div>}
    </section>
  );
}
