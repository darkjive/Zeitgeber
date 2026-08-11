/**
 * Validierung der Einstrahlungsgeometrie (Spec §4, §31.1).
 * Physikalische Invarianten statt Einzelwerte.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation, HorizontalCoords } from './astro-engine';
import { irradianceFactor, seasonComparison, yieldSummary } from './solar-geometry';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const sun = (elevation: number, azimuth: number): HorizontalCoords => ({ elevation, azimuth });

describe('irradianceFactor', () => {
  it('ist 0, wenn die Sonne unter dem Horizont steht', () => {
    expect(irradianceFactor(sun(-5, 180), 180, 30)).toBe(0);
  });

  it('flaches Modul entspricht dem Sinus der Sonnenhöhe', () => {
    expect(irradianceFactor(sun(30, 123), 180, 0)).toBeCloseTo(Math.sin(30 * (Math.PI / 180)), 5);
  });

  it('senkrechte Einstrahlung ergibt Faktor 1', () => {
    // Sonne bei 40° Höhe im Süden, Modul nach Süden mit 50° Neigung → Normale
    // zeigt genau zur Sonne (90° − 40° = 50°).
    expect(irradianceFactor(sun(40, 180), 180, 50)).toBeCloseTo(1, 6);
  });

  it('Südmodul schlägt Nordmodul bei Südsonne', () => {
    const south = irradianceFactor(sun(30, 180), 180, 40);
    const north = irradianceFactor(sun(30, 180), 0, 40);
    expect(south).toBeGreaterThan(north);
  });
});

describe('yieldSummary', () => {
  it('Ertragsfenster liegt tagsüber und der Peak nahe dem Sonnenhöchststand', () => {
    const s = yieldSummary(new Date(2026, 5, 21, 12), KA, 180, 30);
    expect(s.peak).not.toBeNull();
    expect(s.windowStart).not.toBeNull();
    expect(s.windowEnd).not.toBeNull();
    const peakHour = s.peak!.time.getHours();
    expect(peakHour).toBeGreaterThanOrEqual(11);
    expect(peakHour).toBeLessThanOrEqual(15);
  });
});

describe('seasonComparison', () => {
  it('Südmodul liefert im Sommer mehr als im Winter', () => {
    const cmp = seasonComparison(2026, KA, 180, 30);
    expect(cmp.summer).toBeGreaterThan(cmp.winter);
  });
});
