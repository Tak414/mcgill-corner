import { describe, expect, it } from 'vitest';
import { formatStart, formatWindow } from './time';

describe('event time formatting (America/Toronto)', () => {
  it('shows a same-day window as "Sat 20:00 – 23:00"', () => {
    expect(formatWindow('2026-11-21T20:00:00-05:00', '2026-11-21T23:00:00-05:00')).toBe('Sat 20:00 – 23:00');
  });

  it('converts UTC input to Montreal time', () => {
    expect(formatWindow('2026-11-22T01:00:00Z', '2026-11-22T04:00:00Z')).toBe('Sat 20:00 – 23:00');
  });

  it('names both days when the event ends after midnight', () => {
    expect(formatWindow('2026-11-21T22:00:00-05:00', '2026-11-22T01:00:00-05:00')).toBe('Sat 22:00 – Sun 01:00');
  });

  it('uses daylight time in summer (UTC−4)', () => {
    expect(formatStart('2026-07-04T18:00:00Z')).toBe('Sat 14:00');
  });

  it('formats a start time for the map popup', () => {
    expect(formatStart('2026-11-21T20:00:00-05:00')).toBe('Sat 20:00');
  });
});
