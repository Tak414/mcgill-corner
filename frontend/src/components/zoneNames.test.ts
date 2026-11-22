import { describe, expect, it } from 'vitest';
import { zoneOf } from '../lib/zone';
import { ZONE_NAME_COUNT, zoneFullName, zoneName, zoneShortName } from './zoneNames';

describe('zone names', () => {
  it('names every one of the 100 zones', () => {
    expect(ZONE_NAME_COUNT).toBe(100);
    for (let id = 0; id < 100; id++) {
      const name = zoneName(id);
      expect(name?.short.length, `zone ${id} short name`).toBeGreaterThan(0);
      expect(name?.full.length, `zone ${id} full name`).toBeGreaterThan(0);
    }
  });

  it('keeps short names short enough to fit inside a cell on a phone', () => {
    for (let id = 0; id < 100; id++) expect(zoneShortName(id).length, zoneShortName(id)).toBeLessThanOrEqual(12);
  });

  it('falls back to the zone number for unknown ids', () => {
    expect(zoneShortName(100)).toBe('Zone 100');
    expect(zoneFullName(-1)).toBe('Zone -1');
    expect(zoneName(100)).toBeUndefined();
  });

  // The demo seeder's event coordinates, through the same integer grid math the app uses.
  it.each([
    ['Board Games at McGill', 45.5048, -73.5772, 'McGill', 'McGill / Downtown'],
    ['Coffee and Conversation', 45.5, -73.56, 'Old Montréal', 'Old Montréal / Chinatown'],
    ['Campus Walk', 45.511, -73.58, 'Milton-Parc', 'Milton-Parc'],
    ['Puzzle Night', 45.518, -73.594, 'Mile End', 'Mile End'],
    ['Study Break Meetup', 45.52, -73.56, 'UQAM', 'Quartier Latin / UQAM'],
    ['Outdoor Chess', 45.49, -73.58, 'Concordia', 'Concordia / Atwater'],
    ['Neighbourhood Picnic', 45.536, -73.61, 'Little Italy', 'Little Italy / Jean-Talon'],
    ['Sunday Social', 45.47, -73.54, 'Pointe-Nord', "Pointe-Nord (Nuns' Island)"],
  ])('%s lands in %s', (_title, lat, lng, short, full) => {
    const zone = zoneOf(lat, lng);
    expect(zone).not.toBeNull();
    expect(zoneShortName(zone!.zoneId)).toBe(short);
    expect(zoneFullName(zone!.zoneId)).toBe(full);
  });
});
