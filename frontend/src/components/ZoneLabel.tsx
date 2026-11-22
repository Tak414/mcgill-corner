import type { ZoneLabelProps } from './types';
import { zoneName } from './zoneNames';

/** "McGill / Downtown (Zone 45)", with the zone number in smaller text. */
export function ZoneLabel({ zoneId }: ZoneLabelProps) {
  const name = zoneName(zoneId);
  if (!name) return <span className="zone-name">Zone {zoneId}</span>;
  return (
    <span className="zone-name">
      {name.full} <small className="zone-num">(Zone {zoneId})</small>
    </span>
  );
}
