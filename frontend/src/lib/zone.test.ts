import { describe, expect, it } from 'vitest';
import { zoneOf } from './zone';

// Golden test points: api-contract.md section 6. Backend tests must agree with these.
describe('zoneOf (integer micro-degree grid)', () => {
  it('McGill (45.5048, -73.5772) → zone 45, required 1', () => {
    expect(zoneOf(45.5048, -73.5772)).toMatchObject({ zoneId: 45, row: 4, col: 5, ring: 0, requiredCount: 1 });
  });

  it('SW corner (45.44, -73.68) → zone 0, required 5', () => {
    expect(zoneOf(45.44, -73.68)).toMatchObject({ zoneId: 0, requiredCount: 5 });
  });

  it('NE corner (45.58, -73.50) → zone 99 (clamped), required 5', () => {
    expect(zoneOf(45.58, -73.5)).toMatchObject({ zoneId: 99, row: 9, col: 9, requiredCount: 5 });
  });

  it('(45.60, -73.70) → outside the grid (server: OUTSIDE_GRID)', () => {
    expect(zoneOf(45.6, -73.7)).toBeNull();
  });

  it('positive lng (45.5048, 73.5772) → not in the grid (server: VALIDATION_FAILED)', () => {
    expect(zoneOf(45.5048, 73.5772)).toBeNull();
  });

  it('row boundary (45.51, -73.58) → zone 55', () => {
    expect(zoneOf(45.51, -73.58)).toMatchObject({ zoneId: 55, row: 5, col: 5 });
  });

  it('row boundary (45.538, -73.60) → zone 74 (float math wrongly gives row 6)', () => {
    expect(zoneOf(45.538, -73.6)).toMatchObject({ zoneId: 74, row: 7, col: 4 });
  });

  it('row and column boundary (45.454, -73.662) → zone 11', () => {
    expect(zoneOf(45.454, -73.662)).toMatchObject({ zoneId: 11, row: 1, col: 1 });
  });
});
