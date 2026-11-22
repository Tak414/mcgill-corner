import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';

export interface FogZoneInput {
  id: number;
  bounds: [[number, number], [number, number]];
  completed: number;
  required: number;
  unlocked: boolean;
}

interface CloudFogOverlayProps {
  zones: FogZoneInput[];
  theme?: 'shadow' | 'mist';
  /** How long the fog takes to clear when a zone turns unlocked (ms). */
  revealMs?: number;
}

interface PuffSeed {
  latRatio: number;
  lngRatio: number;
  radiusPx: number;
  phase: number;
  speed: number;
  driftPx: number;
  burstX: number;
  burstY: number;
  wispyFactor: number;
}

interface ZoneRuntimeState {
  thinFactor: number;
  wasUnlocked: boolean;
  unlockStartMs: number | null;
  puffs: PuffSeed[];
}

interface ZoneBridge {
  firstZoneId: number;
  secondZoneId: number;
  position: [number, number];
}

function hasStructureChanged(prev: FogZoneInput[], next: FogZoneInput[]): boolean {
  if (prev.length !== next.length) return true;
  for (let i = 0; i < prev.length; i++) {
    const a = prev[i];
    const b = next[i];
    if (a.id !== b.id) return true;
    if (
      a.bounds[0][0] !== b.bounds[0][0] ||
      a.bounds[0][1] !== b.bounds[0][1] ||
      a.bounds[1][0] !== b.bounds[1][0] ||
      a.bounds[1][1] !== b.bounds[1][1]
    ) {
      return true;
    }
  }
  return false;
}

function findZoneBridges(zones: FogZoneInput[]): ZoneBridge[] {
  const bridges: ZoneBridge[] = [];
  const epsilon = 1e-8;

  for (let first = 0; first < zones.length; first++) {
    const [[firstSouth, firstWest], [firstNorth, firstEast]] = zones[first].bounds;
    for (let second = first + 1; second < zones.length; second++) {
      const [[secondSouth, secondWest], [secondNorth, secondEast]] = zones[second].bounds;
      const south = Math.max(firstSouth, secondSouth);
      const north = Math.min(firstNorth, secondNorth);
      const west = Math.max(firstWest, secondWest);
      const east = Math.min(firstEast, secondEast);

      if (
        north - south > epsilon &&
        (Math.abs(firstEast - secondWest) < epsilon || Math.abs(secondEast - firstWest) < epsilon)
      ) {
        bridges.push({
          firstZoneId: zones[first].id,
          secondZoneId: zones[second].id,
          position: [
            (south + north) / 2,
            Math.abs(firstEast - secondWest) < epsilon
              ? (firstEast + secondWest) / 2
              : (secondEast + firstWest) / 2,
          ],
        });
      } else if (
        east - west > epsilon &&
        (Math.abs(firstNorth - secondSouth) < epsilon || Math.abs(secondNorth - firstSouth) < epsilon)
      ) {
        bridges.push({
          firstZoneId: zones[first].id,
          secondZoneId: zones[second].id,
          position: [
            Math.abs(firstNorth - secondSouth) < epsilon
              ? (firstNorth + secondSouth) / 2
              : (secondNorth + firstSouth) / 2,
            (west + east) / 2,
          ],
        });
      }
    }
  }

  return bridges;
}

function getZoneFogRemaining(zone: FogZoneInput): number {
  if (zone.unlocked) return 0;
  if (zone.required <= 0) return 0;
  const progress = Math.min(1, Math.max(0, zone.completed / zone.required));
  // 0/1 -> 1.0, 1/1 -> 0.0, 1/2 -> 0.5, 1/5 -> 0.8
  return 1 - progress;
}

/** Density actually on screen: during a reveal it fades with the same easing as the puffs. */
function visibleThin(zone: FogZoneInput, state: ZoneRuntimeState, now: number, revealMs = 1350): number {
  if (!zone.unlocked) return state.thinFactor;
  if (state.unlockStartMs === null) return state.thinFactor;
  const p = Math.min(1, (now - state.unlockStartMs) / revealMs);
  return state.thinFactor * (1 - p);
}

function createCloudSprite(theme: 'shadow' | 'mist'): HTMLCanvasElement {
  const size = 160;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const lobes = [
    { dx: 0, dy: 0, r: 46, a: 0.52 },
    { dx: -18, dy: 5, r: 35, a: 0.43 },
    { dx: 18, dy: 4, r: 35, a: 0.43 },
    { dx: -9, dy: -14, r: 30, a: 0.37 },
    { dx: 10, dy: -12, r: 28, a: 0.37 },
  ];

  lobes.forEach((lobe) => {
    const cx = half + lobe.dx;
    const cy = half + lobe.dy;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, lobe.r);

    if (theme === 'shadow') {
      grad.addColorStop(0, `rgba(30, 41, 59, ${lobe.a})`);
      grad.addColorStop(0.35, `rgba(40, 52, 70, ${lobe.a * 0.7})`);
      grad.addColorStop(0.65, `rgba(51, 65, 85, ${lobe.a * 0.25})`);
      grad.addColorStop(0.88, `rgba(51, 65, 85, ${lobe.a * 0.03})`);
      grad.addColorStop(1, 'rgba(30, 41, 59, 0)');
    } else {
      grad.addColorStop(0, `rgba(241, 245, 249, ${lobe.a * 1.15})`);
      grad.addColorStop(0.35, `rgba(226, 232, 240, ${lobe.a * 0.8})`);
      grad.addColorStop(0.65, `rgba(203, 213, 225, ${lobe.a * 0.3})`);
      grad.addColorStop(0.88, `rgba(203, 213, 225, ${lobe.a * 0.03})`);
      grad.addColorStop(1, 'rgba(241, 245, 249, 0)');
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, lobe.r, 0, Math.PI * 2);
    ctx.fill();
  });

  return canvas;
}

function makePuffsForZone(zoneId: number): PuffSeed[] {
  let seed = (zoneId + 1) * 9301 + 49297;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };

  const columns = 4;
  const rows = 4;
  const puffs: PuffSeed[] = [];
  const minRatio = -0.12;
  const maxRatio = 1.12;
  const span = maxRatio - minRatio;

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const angle = (puffs.length / (columns * rows)) * Math.PI * 2 + rand() * 0.6;
      const latJitter = (rand() - 0.5) * 0.06;
      const lngJitter = (rand() - 0.5) * 0.06;
      puffs.push({
        latRatio: minRatio + (span * row) / (rows - 1) + latJitter,
        lngRatio: minRatio + (span * column) / (columns - 1) + lngJitter,
        radiusPx: 40 + rand() * 12,
        phase: rand() * Math.PI * 2,
        speed: 0.35 + rand() * 0.35,
        driftPx: 5 + rand() * 7,
        burstX: Math.cos(angle),
        burstY: Math.sin(angle),
        wispyFactor: 0.92 + rand() * 0.08,
      });
    }
  }

  return puffs;
}

export const CloudFogOverlay: React.FC<CloudFogOverlayProps> = ({
  zones,
  theme = 'shadow',
  revealMs = 1350,
}) => {
  const revealMsRef = useRef(revealMs);
  useEffect(() => {
    revealMsRef.current = revealMs;
  }, [revealMs]);
  const map = useMap();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zonesRef = useRef<FogZoneInput[]>(zones);
  const prevZonesRef = useRef<FogZoneInput[]>([]);
  const bridgesRef = useRef<ZoneBridge[]>([]);
  const zonesByIdRef = useRef<Map<number, FogZoneInput>>(new Map());
  const stateMapRef = useRef<Map<number, ZoneRuntimeState>>(new Map());
  const spriteRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    spriteRef.current = createCloudSprite(theme);
  }, [theme]);

  useEffect(() => {
    zonesRef.current = zones;
    if (hasStructureChanged(prevZonesRef.current, zones)) {
      bridgesRef.current = findZoneBridges(zones);
      prevZonesRef.current = zones;
    }

    const zonesById = zonesByIdRef.current;
    zonesById.clear();
    for (const zone of zones) {
      zonesById.set(zone.id, zone);
    }

    const now = performance.now();
    zones.forEach((zone) => {
      const initialFog = getZoneFogRemaining(zone);
      let entry = stateMapRef.current.get(zone.id);
      if (!entry) {
        entry = {
          thinFactor: initialFog,
          wasUnlocked: zone.unlocked,
          unlockStartMs: null,
          puffs: makePuffsForZone(zone.id),
        };
        stateMapRef.current.set(zone.id, entry);
      }

      if (!entry.wasUnlocked && zone.unlocked) {
        entry.unlockStartMs = now;
      } else if (entry.wasUnlocked && !zone.unlocked) {
        entry.unlockStartMs = null;
        entry.thinFactor = initialFog;
      }

      entry.wasUnlocked = zone.unlocked;
    });
  }, [zones]);

  useEffect(() => {
    const container = map.getContainer();
    const mapPane = map.getPanes().mapPane;
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.width = '0px';
    canvas.style.height = '0px';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '350';
    mapPane.appendChild(canvas);
    canvasRef.current = canvas;

    if (!spriteRef.current) {
      spriteRef.current = createCloudSprite(theme);
    }

    let rafId = 0;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);

    const render = (now: number) => {
      const ctx = canvas.getContext('2d');
      const sprite = spriteRef.current;

      if (ctx && sprite) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewW = canvas.width / dpr;
        const viewH = canvas.height / dpr;
        const layerOrigin = map.containerPointToLayerPoint([0, 0]);
        canvas.style.left = `${layerOrigin.x}px`;
        canvas.style.top = `${layerOrigin.y}px`;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, viewW, viewH);

        const t = now * 0.001;
        const zonesById = zonesByIdRef.current;

        for (const zone of zonesRef.current) {
          const targetThin = getZoneFogRemaining(zone);
          let entry = stateMapRef.current.get(zone.id);
          if (!entry) {
            entry = {
              thinFactor: targetThin,
              wasUnlocked: zone.unlocked,
              unlockStartMs: null,
              puffs: makePuffsForZone(zone.id),
            };
            stateMapRef.current.set(zone.id, entry);
          }

          const revealing = zone.unlocked && entry.unlockStartMs !== null;
          if (!revealing) entry.thinFactor += (targetThin - entry.thinFactor) * 0.1;

          let revealProgress = 0;
          if (zone.unlocked) {
            if (entry.unlockStartMs !== null) {
              const elapsed = now - entry.unlockStartMs;
              revealProgress = Math.min(1, elapsed / revealMsRef.current);
              if (revealProgress >= 1) {
                entry.unlockStartMs = null;
                entry.thinFactor = 0;
              }
            } else {
              revealProgress = 1;
            }
          }

          if (revealProgress >= 1 || (entry.thinFactor <= 0.005 && targetThin === 0)) {
            continue;
          }

          const [[south, west], [north, east]] = zone.bounds;
          const topLeft = map.latLngToLayerPoint([north, west]).subtract(layerOrigin);
          const bottomRight = map.latLngToLayerPoint([south, east]).subtract(layerOrigin);
          const boxW = bottomRight.x - topLeft.x;
          const boxH = bottomRight.y - topLeft.y;

          if (
            bottomRight.x < -120 ||
            topLeft.x > viewW + 120 ||
            bottomRight.y < -120 ||
            topLeft.y > viewH + 120
          ) {
            continue;
          }

          const easeOut =
            revealProgress < 0.5
              ? 4 * revealProgress * revealProgress * revealProgress
              : 1 - Math.pow(-2 * revealProgress + 2, 3) / 2;
          const dispersePx = easeOut * Math.max(64, Math.min(boxW, boxH) * 0.45) + (1 - entry.thinFactor) * 16;

          for (const puff of entry.puffs) {
            const alpha = (1 - easeOut) * puff.wispyFactor * entry.thinFactor;
            if (alpha <= 0.01) continue;

            const anchorX = topLeft.x + boxW * puff.lngRatio;
            const anchorY = topLeft.y + boxH * puff.latRatio;
            const driftX = Math.cos(t * puff.speed + puff.phase) * puff.driftPx;
            const driftY = Math.sin(t * puff.speed * 0.85 + puff.phase) * puff.driftPx;
            const px = anchorX + driftX + puff.burstX * dispersePx;
            const py = anchorY + driftY + puff.burstY * dispersePx;
            const progressScale = 0.8 + 0.2 * Math.sqrt(Math.max(0, entry.thinFactor));
            const zoneScale = Math.sqrt(Math.max(1, boxW * boxH)) * 0.62;
            const radius = zoneScale * progressScale * (puff.radiusPx / 46);

            ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
            ctx.drawImage(sprite, px - radius, py - radius, radius * 2, radius * 2);
          }
        }

        for (const bridge of bridgesRef.current) {
          const firstZone = zonesById.get(bridge.firstZoneId);
          const secondZone = zonesById.get(bridge.secondZoneId);
          const firstState = stateMapRef.current.get(bridge.firstZoneId);
          const secondState = stateMapRef.current.get(bridge.secondZoneId);
          if (!firstZone || !secondZone || !firstState || !secondState) continue;

          const strength = (visibleThin(firstZone, firstState, now, revealMsRef.current) + visibleThin(secondZone, secondState, now, revealMsRef.current)) / 2;
          if (strength <= 0.01) continue;

          const point = map.latLngToLayerPoint(bridge.position).subtract(layerOrigin);
          if (
            point.x < -viewW * 0.1 ||
            point.x > viewW * 1.1 ||
            point.y < -viewH * 0.1 ||
            point.y > viewH * 1.1
          ) {
            continue;
          }

          const [[firstSouth, firstWest], [firstNorth, firstEast]] = firstZone.bounds;
          const firstTopLeft = map.latLngToLayerPoint([firstNorth, firstWest]);
          const firstBottomRight = map.latLngToLayerPoint([firstSouth, firstEast]);
          const [[secondSouth, secondWest], [secondNorth, secondEast]] = secondZone.bounds;
          const secondTopLeft = map.latLngToLayerPoint([secondNorth, secondWest]);
          const secondBottomRight = map.latLngToLayerPoint([secondSouth, secondEast]);
          const firstArea =
            Math.abs(firstBottomRight.x - firstTopLeft.x) *
            Math.abs(firstBottomRight.y - firstTopLeft.y);
          const secondArea =
            Math.abs(secondBottomRight.x - secondTopLeft.x) *
            Math.abs(secondBottomRight.y - secondTopLeft.y);
          const radius =
            Math.sqrt((firstArea + secondArea) / 2) *
            0.62 *
            (0.8 + 0.2 * Math.sqrt(Math.max(0, strength)));

          ctx.globalAlpha = Math.max(0, Math.min(1, strength));
          ctx.drawImage(sprite, point.x - radius, point.y - radius, radius * 2, radius * 2);
        }

        ctx.restore();
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      if (canvas.parentNode === mapPane) {
        mapPane.removeChild(canvas);
      }
    };
  }, [map, theme]);

  return null;
};