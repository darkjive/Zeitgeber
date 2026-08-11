/**
 * Validierung der Sonnenstunden-/Verschattungsgeometrie (Spec §4, §31.2/3).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { directSunHours, seasonSunHours } from './sun-hours';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const JUN = new Date(2026, 5, 21, 12);

describe('directSunHours — Fassade', () => {
  it('Südfassade bekommt tagsüber Sonne, Nordfassade im Sommer nur wenig', () => {
    const south = directSunHours(JUN, KA, { facadeAzimuth: 180 }).totalMin;
    const north = directSunHours(JUN, KA, { facadeAzimuth: 0 }).totalMin;
    expect(south).toBeGreaterThan(north);
    expect(south).toBeGreaterThan(6 * 60);
  });

  it('Ostfassade hat mehr Vormittags- als Nachmittagssonne', () => {
    const east = directSunHours(JUN, KA, { facadeAzimuth: 90 });
    expect(east.morningMin).toBeGreaterThan(east.afternoonMin);
  });

  it('Westfassade hat mehr Nachmittags- als Vormittagssonne', () => {
    const west = directSunHours(JUN, KA, { facadeAzimuth: 270 });
    expect(west.afternoonMin).toBeGreaterThan(west.morningMin);
  });
});

describe('directSunHours — Verschattung', () => {
  it('ein hohes nahes Hindernis reduziert die Sonnenstunden', () => {
    const open = directSunHours(JUN, KA).totalMin;
    const shaded = directSunHours(JUN, KA, { obstacle: { azimuth: 180, halfWidth: 40, height: 30, distance: 5 } }).totalMin;
    expect(shaded).toBeLessThan(open);
  });
});

describe('seasonSunHours', () => {
  it('freier Himmel: Sommer hat mehr Sonnenstunden als Winter', () => {
    const s = seasonSunHours(2026, KA);
    expect(s.summer).toBeGreaterThan(s.winter);
  });
});
