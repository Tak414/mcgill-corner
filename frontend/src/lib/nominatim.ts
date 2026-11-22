import type { LatLng } from '../components';

const BASE = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&bounded=1&viewbox=-73.68,45.58,-73.50,45.44&q=';

export type GeocodeResult = { kind: 'found'; point: LatLng } | { kind: 'none' } | { kind: 'error' };

/** One Nominatim lookup. Call only on a Search button press (the caller enforces 1 request/second). */
export async function geocode(query: string): Promise<GeocodeResult> {
  try {
    const res = await fetch(BASE + encodeURIComponent(query), { headers: { 'Accept-Language': 'en,fr' } });
    if (!res.ok) return { kind: 'error' };
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    const first = data[0];
    if (!first) return { kind: 'none' };
    const lat = Number.parseFloat(first.lat);
    const lng = Number.parseFloat(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { kind: 'none' };
    return { kind: 'found', point: { lat, lng } };
  } catch {
    return { kind: 'error' };
  }
}
