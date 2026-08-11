/**
 * Validierung der Planeten-Engine (Spec §4).
 * Starke Invarianten statt Einzelpunkte: Die maximale Elongation der inneren
 * Planeten ist physikalisch begrenzt (Merkur ~28°, Venus ~47°). Hält die
 * Rechnung diese Schranke über ein ganzes Jahr ein, ist die geozentrische
 * Umrechnung im Kern korrekt.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { PLANET_IDS, planetPosition } from './planets';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };

function samplesOverYear(): Date[] {
  const out: Date[] = [];
  for (let day = 0; day < 365; day += 5) out.push(new Date(2026, 0, 1 + day, 21, 0, 0));
  return out;
}

describe('planetPosition — Elongationsschranken innerer Planeten', () => {
  it('Merkur bleibt unter ~28° Elongation', () => {
    const max = Math.max(...samplesOverYear().map((d) => planetPosition('mercury', d, KA).elongation));
    expect(max).toBeLessThan(29);
    expect(max).toBeGreaterThan(15);
  });

  it('Venus bleibt unter ~47° Elongation', () => {
    const max = Math.max(...samplesOverYear().map((d) => planetPosition('venus', d, KA).elongation));
    expect(max).toBeLessThan(48);
    expect(max).toBeGreaterThan(30);
  });
});

describe('planetPosition — Grundplausibilität', () => {
  it('liefert für alle Planeten endliche Werte im gültigen Bereich', () => {
    const now = new Date('2026-08-11T21:00:00Z');
    for (const id of PLANET_IDS) {
      const p = planetPosition(id, now, KA);
      expect(Number.isFinite(p.elevation)).toBe(true);
      expect(p.azimuth).toBeGreaterThanOrEqual(0);
      expect(p.azimuth).toBeLessThanOrEqual(360);
      expect(p.elongation).toBeGreaterThanOrEqual(0);
      expect(p.elongation).toBeLessThanOrEqual(180);
      expect(Number.isFinite(p.magnitude)).toBe(true);
    }
  });

  it('markiert Uranus und Neptun als optikpflichtig (§18)', () => {
    const now = new Date('2026-08-11T21:00:00Z');
    expect(planetPosition('uranus', now, KA).needsOptics).toBe(true);
    expect(planetPosition('neptune', now, KA).needsOptics).toBe(true);
    expect(planetPosition('jupiter', now, KA).needsOptics).toBe(false);
  });
});
