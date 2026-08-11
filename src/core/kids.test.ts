/**
 * Validierung der Kinder-Layer-Hilfslogik (Spec §30).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { visibleBrightPlanet } from './kids';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };

describe('visibleBrightPlanet', () => {
  it('gibt tagsüber (hohe Sonne) nichts zurück', () => {
    expect(visibleBrightPlanet(new Date('2026-06-21T11:00:00Z'), KA)).toBeNull();
  });

  it('liefert – wenn überhaupt – einen hellen, hoch stehenden Planeten', () => {
    // Über ein Jahr abends prüfen: jedes Ergebnis erfüllt die Kriterien.
    for (let d = 0; d < 365; d += 11) {
      const when = new Date(2026, 0, 1 + d, 22, 0, 0);
      const bp = visibleBrightPlanet(when, KA);
      if (bp) {
        expect(bp.elevation).toBeGreaterThanOrEqual(10);
        expect(bp.magnitude).toBeLessThanOrEqual(1.5);
        expect(bp.nameKey.startsWith('object.')).toBe(true);
      }
    }
  });
});
