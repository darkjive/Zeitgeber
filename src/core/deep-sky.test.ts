/**
 * Validierung des Deep-Sky-Katalogs (Spec §4, §19).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { equatorialToHorizontal } from './astro-engine';
import { DEEP_SKY } from './deep-sky';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };

describe('deep-sky catalogue', () => {
  it('liefert für alle Objekte gültige Horizontalkoordinaten', () => {
    const now = new Date('2026-01-15T22:00:00Z');
    for (const o of DEEP_SKY) {
      const h = equatorialToHorizontal(o.ra, o.dec, now, KA);
      expect(h.azimuth).toBeGreaterThanOrEqual(0);
      expect(h.azimuth).toBeLessThanOrEqual(360);
      expect(h.elevation).toBeGreaterThanOrEqual(-90);
      expect(h.elevation).toBeLessThanOrEqual(90);
    }
  });

  it('zeigt den Orionnebel (M42) in einer Winternacht über dem Horizont', () => {
    const m42 = DEEP_SKY.find((o) => o.name.startsWith('M42'))!;
    const h = equatorialToHorizontal(m42.ra, m42.dec, new Date('2026-01-15T22:00:00Z'), KA);
    expect(h.elevation).toBeGreaterThan(0);
  });

  it('enthält Galaxien, Nebel und Sternhaufen', () => {
    const types = new Set(DEEP_SKY.map((o) => o.type));
    expect(types.has('galaxy')).toBe(true);
    expect(types.has('nebula')).toBe(true);
    expect(types.has('cluster')).toBe(true);
  });
});
