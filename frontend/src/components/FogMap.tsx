import { useEffect, useState } from 'react';
import { divIcon, latLngBounds, type DivIcon, type LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Pane, Polygon, Rectangle, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import type { FogMapProps, EventSummary, ZoneProgress, Zones } from './types';
import { zoneFullName, zoneShortName } from './zoneNames';

const mcgill: [number, number] = [45.5048, -73.5772];

/* The furthest zoom-out still shows this many cells across and down (about 2 × 3 = 6 zones on a phone). */
const MIN_VIEW_COLS = 2;
const MIN_VIEW_ROWS = 3;
/* Fine zoom steps so the minimum can sit between whole levels (e.g. 13.9 on a 390 px wide phone). */
const ZOOM_SNAP = 0.1;
/* Starts here; GridOnly raises it if the screen needs a higher minimum. */
const START_ZOOM = 14;

function eventIcon(event: EventSummary, selected: boolean) {
  const label = event.going_count > 0 ? String(event.going_count) : '·';
  return divIcon({
    className: '',
    html: `<div class="event-marker${selected ? ' selected' : ''}" aria-hidden="true">${label}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

const WORLD_RING: LatLngExpression[] = [[-85, -180], [85, -180], [85, 180], [-85, 180]];

/**
 * Shows only the playable grid: panning is held to the grid (maxBounds, viscosity 1 on the
 * MapContainer), and the furthest zoom-out still only shows about MIN_VIEW_COLS × MIN_VIEW_ROWS cells.
 * The minimum is worked out from the cell size and the screen, so it also holds on wider screens.
 * The mask with a grid-shaped hole stays as a backstop in case the view is ever larger than the grid.
 */
function GridOnly({ bounds, rows, cols }: { bounds: Zones['bounds']; rows: number; cols: number }) {
  const map = useMap();
  useEffect(() => {
    const grid = latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]);
    const cellLat = (bounds.north - bounds.south) / rows;
    const cellLng = (bounds.east - bounds.west) / cols;
    const fitMinZoom = () => {
      // Largest zoom at which a MIN_VIEW_COLS × MIN_VIEW_ROWS block around the view centre still fits.
      // Worked out exactly (map.getBoundsZoom would round down to the next ZOOM_SNAP step and show more cells).
      const c = map.getCenter();
      const z = map.getZoom();
      const nw = map.project([c.lat + (cellLat * MIN_VIEW_ROWS) / 2, c.lng - (cellLng * MIN_VIEW_COLS) / 2], z);
      const se = map.project([c.lat - (cellLat * MIN_VIEW_ROWS) / 2, c.lng + (cellLng * MIN_VIEW_COLS) / 2], z);
      const size = map.getSize();
      if (size.x === 0 || size.y === 0) return;
      const minZoom = map.getScaleZoom(Math.min(size.x / (se.x - nw.x), size.y / (se.y - nw.y)), z);
      map.setMinZoom(minZoom);
      if (map.getZoom() < minZoom) map.setZoom(minZoom, { animate: false });
    };
    map.setMaxBounds(grid);
    fitMinZoom();
    map.on('resize', fitMinZoom);
    return () => {
      map.off('resize', fitMinZoom);
    };
  }, [map, bounds.south, bounds.west, bounds.north, bounds.east, rows, cols]);

  const hole: LatLngExpression[] = [[bounds.south, bounds.west], [bounds.north, bounds.west], [bounds.north, bounds.east], [bounds.south, bounds.east]];
  return <Polygon positions={[WORLD_RING, hole]} interactive={false} pathOptions={{ stroke: false, fillColor: '#e9efeb', fillOpacity: 1 }} />;
}

/* Below this zoom a cell is too small on a phone for two lines of text. */
const LABEL_MIN_ZOOM = 12;
/* A cell is about 105 px wide at zoom 13, 210 px at 14 and 420 px at 15: full names (up to ~30 characters) need 15. */
const FULL_NAME_ZOOM = 15;
const labelIcons = new Map<string, DivIcon>();

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** "McGill" / "Friends 0/1" while locked, "McGill" / "Friends 10" once unlocked; the full name when zoomed in. */
function zoneLabelIcon(zoneId: number, friends: string, unlocked: boolean, size: 'sm' | 'md' | 'lg', full: boolean) {
  const key = `${zoneId}|${friends}|${unlocked}|${size}|${full}`;
  let icon = labelIcons.get(key);
  if (!icon) {
    const name = escapeHtml(full ? zoneFullName(zoneId) : zoneShortName(zoneId));
    icon = divIcon({
      className: '',
      html: `<div class="zone-label ${size}${unlocked ? ' open' : ''}"><span>${name}</span><span>Friends ${friends}</span></div>`,
      iconSize: [0, 0],
    });
    labelIcons.set(key, icon);
  }
  return icon;
}

/** Text inside every cell, so phones (no hover) can read each zone's progress. */
function ZoneLabels({ zones, progressByZone }: { zones: Zones; progressByZone: Map<number, ZoneProgress> }) {
  const [zoom, setZoom] = useState<number | null>(null);
  const map = useMapEvents({ zoomend: () => setZoom(map.getZoom()) });
  const current = zoom ?? map.getZoom();
  if (current < LABEL_MIN_ZOOM) return null;
  // Zoom can be fractional (ZOOM_SNAP), so compare with ranges, never with ===.
  const size = current >= 14 ? 'lg' : current >= 13 ? 'md' : 'sm';
  const full = current >= FULL_NAME_ZOOM;

  return (
    <Pane name="zone-labels" style={{ zIndex: 450, pointerEvents: 'none' }}>
      {zones.cells.map((cell) => {
        const progress = progressByZone.get(cell.id);
        const unlocked = progress?.unlocked === true;
        const count = progress?.exchange_count ?? 0;
        const friends = unlocked ? String(count) : `${count}/${cell.required_count}`;
        const center: [number, number] = [(cell.bounds.south + cell.bounds.north) / 2, (cell.bounds.west + cell.bounds.east) / 2];
        return <Marker key={cell.id} position={center} icon={zoneLabelIcon(cell.id, friends, unlocked, size, full)} interactive={false} keyboard={false} />;
      })}
    </Pane>
  );
}

export function FogMap({ zones, zoneProgress, events, selectedEventId, onPinClick }: FogMapProps) {
  const progressByZone = new Map(zoneProgress.map((progress) => [progress.zone_id, progress]));
  const unlockedCount = zoneProgress.filter((progress) => progress.unlocked).length;

  return (
    <div className="fog-map-wrap">
      <MapContainer className="fog-map" center={mcgill} zoom={START_ZOOM} zoomSnap={ZOOM_SNAP} zoomControl={false} maxBoundsViscosity={1.0} scrollWheelZoom aria-label="Map of McGill and nearby event zones">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GridOnly bounds={zones.bounds} rows={zones.rows} cols={zones.cols} />
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
            />
          );
        })}
        <ZoneLabels zones={zones} progressByZone={progressByZone} />
        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.lat, event.lng]}
            icon={eventIcon(event, event.id === selectedEventId)}
            title={event.title}
            eventHandlers={{ click: () => onPinClick(event.id) }}
          />
        ))}
      </MapContainer>
      <div className="map-progress-card">
        <div><span className="map-eyebrow">Your map</span><strong>{unlockedCount} zones open</strong></div>
        <span className="map-progress-empty">Meet someone to begin clearing the fog.</span>
      </div>
      <div className="map-compass" aria-hidden="true">N <span>↑</span></div>
    </div>
  );
}
