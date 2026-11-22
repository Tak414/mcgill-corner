import { useEffect, useRef, useState } from 'react';
import { divIcon, latLngBounds, type DivIcon, type LatLngExpression } from 'leaflet';
import { MapContainer, Marker, Pane, Polygon, Rectangle, TileLayer, useMap, useMapEvents, ZoomControl } from 'react-leaflet';
import { CloudFogOverlay } from './CloudFogOverlay';
import pinIconUrl from '../assets/pin.png';
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
/* Unlock reveal: fly to the zone, then let the fog drift away slowly enough to watch. */
const FLY_SECONDS = 1.2;
const REVEAL_MS = 3600;
/* The gold outline and label pop stay a little after the fog is gone. */
const GLOW_MS = REVEAL_MS + 1600;

const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function eventIcon(event: EventSummary, selected: boolean) {
  const label = event.going_count > 0 ? String(event.going_count) : '';
  return divIcon({
    className: '',
    html: `<div class="event-marker${selected ? ' selected' : ''}" aria-hidden="true"><img class="event-marker-pin" src="${pinIconUrl}" alt="" /><span class="event-marker-badge">${label}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 40],
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
function zoneLabelIcon(zoneId: number, friends: string, unlocked: boolean, size: 'sm' | 'md' | 'lg', full: boolean, justOpened = false) {
  const key = `${zoneId}|${friends}|${unlocked}|${size}|${full}|${justOpened}`;
  let icon = labelIcons.get(key);
  if (!icon) {
    const name = escapeHtml(full ? zoneFullName(zoneId) : zoneShortName(zoneId));
    icon = divIcon({
      className: '',
      html: `<div class="zone-label ${size}${unlocked ? ' open' : ''}${justOpened ? ' just-opened' : ''}"><span>${name}</span><span>Friends ${friends}</span></div>`,
      iconSize: [0, 0],
    });
    labelIcons.set(key, icon);
  }
  return icon;
}

/** Text inside every cell, so phones (no hover) can read each zone's progress. */
function ZoneLabels({ zones, progressByZone, justOpenedId }: { zones: Zones; progressByZone: Map<number, ZoneProgress>; justOpenedId: number | null }) {
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
        return <Marker key={cell.id} position={center} icon={zoneLabelIcon(cell.id, friends, unlocked, size, full, cell.id === justOpenedId)} interactive={false} keyboard={false} />;
      })}
    </Pane>
  );
}

/** Flies the map to a zone (zoomed so it fills most of the screen) and reports when it has arrived. */
function FlyToZone({ bounds, flightKey, onArrive }: { bounds: Zones['cells'][number]['bounds']; flightKey: number; onArrive: () => void }) {
  const map = useMap();
  const onArriveRef = useRef(onArrive);
  useEffect(() => {
    onArriveRef.current = onArrive;
  });
  useEffect(() => {
    const target = latLngBounds([bounds.south, bounds.west], [bounds.north, bounds.east]).pad(0.3);
    let arrived = false;
    const arrive = () => {
      if (arrived) return;
      arrived = true;
      onArriveRef.current();
    };
    map.once('moveend', arrive);
    if (prefersReducedMotion()) map.fitBounds(target, { animate: false, maxZoom: 16 });
    else map.flyToBounds(target, { duration: FLY_SECONDS, maxZoom: 16 });
    // moveend may not fire when the map is already there.
    const fallback = setTimeout(arrive, FLY_SECONDS * 1000 + 500);
    return () => {
      arrived = true;
      map.off('moveend', arrive);
      clearTimeout(fallback);
    };
  }, [map, flightKey, bounds.south, bounds.west, bounds.north, bounds.east]);
  return null;
}

export function FogMap({ zones, zoneProgress, events, selectedEventId, onPinClick, heldZoneIds = [], reveal = null, onRevealStart, onRevealEnd }: FogMapProps) {
  // Reveal: fly there first (fog still held), then clear the fog slowly, then glow a little longer.
  const [arrivedKey, setArrivedKey] = useState<number | null>(null);
  const [glowKey, setGlowKey] = useState<number | null>(null);
  const clearing = reveal !== null && arrivedKey === reveal.key;
  const onRevealEndRef = useRef(onRevealEnd);
  useEffect(() => {
    onRevealEndRef.current = onRevealEnd;
  });
  useEffect(() => {
    if (!clearing || reveal === null) return;
    const zoneId = reveal.zoneId;
    const end = setTimeout(() => onRevealEndRef.current?.(zoneId), REVEAL_MS);
    const glowOff = setTimeout(() => setGlowKey(null), GLOW_MS);
    return () => {
      clearTimeout(end);
      clearTimeout(glowOff);
    };
  }, [clearing, reveal]);
  const arrive = () => {
    if (reveal === null) return;
    setArrivedKey(reveal.key);
    setGlowKey(reveal.key);
    onRevealStart?.(reveal.zoneId);
  };

  // Held zones look as they did before the exchange until their fog starts clearing.
  const held = new Set(heldZoneIds.filter((id) => !(clearing && reveal?.zoneId === id)));
  const shownProgress = zoneProgress.map((progress) =>
    held.has(progress.zone_id) ? { ...progress, unlocked: false, exchange_count: Math.max(0, progress.exchange_count - 1) } : progress,
  );
  const progressByZone = new Map(shownProgress.map((progress) => [progress.zone_id, progress]));
  const unlockedCount = shownProgress.filter((progress) => progress.unlocked).length;
  const revealCell = reveal === null ? undefined : zones.cells.find((cell) => cell.id === reveal.zoneId);
  const glowing = glowKey !== null && revealCell !== undefined;
  const cloudZones = zones.cells.map((cell) => {
    const progress = progressByZone.get(cell.id);
    return {
      id: cell.id,
      bounds: [
        [cell.bounds.south, cell.bounds.west],
        [cell.bounds.north, cell.bounds.east],
      ] as [[number, number], [number, number]],
      completed: progress?.exchange_count ?? 0,
      required: progress?.required_count ?? cell.required_count,
      unlocked: progress?.unlocked === true,
    };
  });

  return (
    <div className="fog-map-wrap">
      <MapContainer className="fog-map" center={mcgill} zoom={START_ZOOM} zoomSnap={ZOOM_SNAP} zoomControl={false} maxBoundsViscosity={1.0} scrollWheelZoom aria-label="Map of McGill and nearby event zones">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <GridOnly bounds={zones.bounds} rows={zones.rows} cols={zones.cols} />
        <CloudFogOverlay zones={cloudZones} theme="shadow" revealMs={prefersReducedMotion() ? 900 : REVEAL_MS} />
        {reveal !== null && revealCell !== undefined && <FlyToZone bounds={revealCell.bounds} flightKey={reveal.key} onArrive={arrive} />}
        {glowing && (
          <Rectangle
            key={`glow-${glowKey}`}
            bounds={[[revealCell.bounds.south, revealCell.bounds.west], [revealCell.bounds.north, revealCell.bounds.east]]}
            interactive={false}
            pathOptions={{ className: 'zone-reveal-glow', color: '#f2c66d', weight: 4, fillColor: '#c9f2da', fillOpacity: 0 }}
          />
        )}
        {/* top-left is taken by the progress card */}
        <ZoomControl position="bottomright" />
        {zones.cells.map((cell) => {
          return (
            <Rectangle
              key={cell.id}
              bounds={[[cell.bounds.south, cell.bounds.west], [cell.bounds.north, cell.bounds.east]]}
              pathOptions={{
                color: 'transparent',
                weight: 0,
                opacity: 0,
                fillOpacity: 0,
              }}
            />
          );
        })}
        <ZoneLabels zones={zones} progressByZone={progressByZone} justOpenedId={glowing ? revealCell.id : null} />
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
        <div><span className="map-eyebrow">Your map</span><strong key={unlockedCount} className={glowing ? 'count-bump' : undefined}>{unlockedCount} {unlockedCount === 1 ? 'zone' : 'zones'} open</strong></div>
        <span className="map-progress-empty">Meet someone to begin clearing the fog.</span>
      </div>
      <div className="map-compass" aria-hidden="true">N <span>↑</span></div>
    </div>
  );
}
