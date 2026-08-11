/**
 * Validierung der Meteorschauer-Logik (Spec §4, §21).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { SHOWERS, isActive, showerOverview, showerStatus } from './meteor-showers';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const perseids = SHOWERS.find((s) => s.key === 'meteor.perseids')!;
const quadrantids = SHOWERS.find((s) => s.key === 'meteor.quadrantids')!;

describe('isActive', () => {
  it('Perseiden sind Mitte August aktiv', () => {
    expect(isActive(perseids, new Date(2026, 7, 11))).toBe(true);
  });

  it('Perseiden sind im März nicht aktiv', () => {
    expect(isActive(perseids, new Date(2026, 2, 1))).toBe(false);
  });

  it('Quadrantiden (über den Jahreswechsel) sind Anfang Januar aktiv', () => {
    expect(isActive(quadrantids, new Date(2026, 0, 2))).toBe(true);
    expect(isActive(quadrantids, new Date(2026, 11, 30))).toBe(true);
    expect(isActive(quadrantids, new Date(2026, 5, 1))).toBe(false);
  });
});

describe('showerStatus & overview', () => {
  it('liefert eine endliche Radiant-Höhe', () => {
    const s = showerStatus(perseids, new Date('2026-08-11T22:00:00Z'), KA);
    expect(Number.isFinite(s.radiantAltitude)).toBe(true);
    expect(s.radiantAltitude).toBeGreaterThanOrEqual(-90);
    expect(s.radiantAltitude).toBeLessThanOrEqual(90);
  });

  it('zeigt Mitte August die Perseiden als aktiv und ganz oben', () => {
    const overview = showerOverview(new Date(2026, 7, 11), KA);
    expect(overview[0].shower.key).toBe('meteor.perseids');
    expect(overview[0].active).toBe(true);
    expect(overview[0].daysToPeak).toBeGreaterThanOrEqual(0);
    expect(overview[0].daysToPeak).toBeLessThanOrEqual(2);
  });
});
