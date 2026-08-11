/**
 * Validierung des Fixstern-Providers und der Koordinatentransformation (§4).
 * Stärkste Invariante: Die Höhe des Polarsterns entspricht (bis auf seinen
 * kleinen Abstand vom Himmelspol und Refraktion) der geografischen Breite des
 * Beobachters — unabhängig von der Uhrzeit.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { equatorialToHorizontal } from './astro-engine';
import { BRIGHT_STARS } from './stars';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const polaris = BRIGHT_STARS.find((s) => s.name === 'Polaris')!;

describe('equatorialToHorizontal — Polaris-Invariante', () => {
  it('Polaris-Höhe ≈ geografische Breite, zu jeder Tageszeit', () => {
    for (let h = 0; h < 24; h += 3) {
      const date = new Date(Date.UTC(2026, 5, 1, h, 0, 0));
      const pos = equatorialToHorizontal(polaris.ra, polaris.dec, date, KA);
      expect(Math.abs(pos.elevation - KA.latitude)).toBeLessThan(1.5);
    }
  });

  it('Polaris steht nahezu exakt im Norden', () => {
    const pos = equatorialToHorizontal(polaris.ra, polaris.dec, new Date('2026-06-01T22:00:00Z'), KA);
    const dAz = Math.min(pos.azimuth, 360 - pos.azimuth); // Abstand zu 0°/360°
    expect(dAz).toBeLessThan(2);
  });
});

describe('Fixstern-Katalog', () => {
  it('liefert für alle hellen Sterne gültige Horizontalkoordinaten', () => {
    const now = new Date('2026-01-15T22:00:00Z');
    for (const s of BRIGHT_STARS) {
      const pos = equatorialToHorizontal(s.ra, s.dec, now, KA);
      expect(pos.azimuth).toBeGreaterThanOrEqual(0);
      expect(pos.azimuth).toBeLessThanOrEqual(360);
      expect(pos.elevation).toBeGreaterThanOrEqual(-90);
      expect(pos.elevation).toBeLessThanOrEqual(90);
    }
  });

  it('hat mindestens einen sichtbaren hellen Stern in einer Winternacht', () => {
    const now = new Date('2026-01-15T22:00:00Z');
    const visible = BRIGHT_STARS.filter((s) => equatorialToHorizontal(s.ra, s.dec, now, KA).elevation > 0);
    expect(visible.length).toBeGreaterThan(5);
  });
});
