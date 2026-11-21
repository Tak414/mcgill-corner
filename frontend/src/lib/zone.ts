/**
 * Grid math in integer micro-degrees, exactly as api-contract.md "Zones".
 * A UX hint only: the server computes the real zone_id. Never use the float bounds from GET /zones for this.
 */
export type ZoneInfo = { zoneId: number; row: number; col: number; ring: number; requiredCount: number };

const SOUTH_U = 45_440_000;
const NORTH_U = 45_580_000;
const WEST_U = -73_680_000;
const EAST_U = -73_500_000;
const CELL_LAT_U = 14_000;
const CELL_LNG_U = 18_000;

/** The zone containing the point, or null when it is outside the grid. */
export function zoneOf(lat: number, lng: number): ZoneInfo | null {
  const latU = Math.round(lat * 1_000_000);
  const lngU = Math.round(lng * 1_000_000);
  const inside = latU >= SOUTH_U && latU <= NORTH_U && lngU >= WEST_U && lngU <= EAST_U;
  if (!inside) return null;
  // Both operands are integers, so Math.floor of the quotient is exact here.
  const row = Math.min(9, Math.floor((latU - SOUTH_U) / CELL_LAT_U));
  const col = Math.min(9, Math.floor((lngU - WEST_U) / CELL_LNG_U));
  const zoneId = row * 10 + col;
  const ring = Math.max(Math.abs(row - 4), Math.abs(col - 5));
  const requiredCount = ring <= 1 ? 1 : Math.min(ring, 5);
  return { zoneId, row, col, ring, requiredCount };
}
