/**
 * Validierung der Outdoor-Ableitungen (Spec §29).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { goldenBlueWindows, moonlightForecast, sunDirection, usableLight } from './outdoor';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };

describe('usableLight', () => {
  it('gibt am Mittag Restlicht zurück, das bis zur bürgerlichen Dämmerung reicht', () => {
    const noon = new Date('2026-06-21T10:00:00Z'); // hoch am Himmel
    const l = usableLight(noon, KA);
    expect(l.state).toBe('day');
    expect(l.minutes).toBeGreaterThan(0);
    expect(l.until).not.toBeNull();
  });

  it('meldet Nacht, wenn die Sonne tief unter dem Horizont steht', () => {
    const night = new Date('2026-01-15T23:00:00Z');
    expect(usableLight(night, KA).state).toBe('night');
  });

  it('erkennt Polartag jenseits des Polarkreises', () => {
    const northCape: GeoLocation = { latitude: 71.17, longitude: 25.78 };
    expect(usableLight(new Date('2026-06-21T12:00:00Z'), northCape).state).toBe('polar-day');
  });
});

describe('goldenBlueWindows', () => {
  it('goldene Stunde liegt vor der blauen Stunde am Abend', () => {
    const w = goldenBlueWindows(new Date('2026-09-21T12:00:00Z'), KA);
    expect(w.eveningGolden.start).not.toBeNull();
    expect(w.eveningBlue.start).not.toBeNull();
    // Abendliche goldene Stunde beginnt vor der blauen Stunde.
    expect(w.eveningGolden.start!.getTime()).toBeLessThan(w.eveningBlue.start!.getTime());
  });
});

describe('moonlightForecast & sunDirection', () => {
  it('liefert eine Helligkeitsstufe und einen Beleuchtungsgrad', () => {
    const m = moonlightForecast(new Date('2026-08-11T22:00:00Z'), KA);
    expect(['dark', 'dim', 'bright']).toContain(m.level);
    expect(m.illumination).toBeGreaterThanOrEqual(0);
    expect(m.illumination).toBeLessThanOrEqual(1);
  });

  it('gibt einen gültigen Sonnenazimut zurück', () => {
    const d = sunDirection(new Date('2026-08-11T12:00:00Z'), KA);
    expect(d.azimuth).toBeGreaterThanOrEqual(0);
    expect(d.azimuth).toBeLessThanOrEqual(360);
    expect(d.above).toBe(true);
  });
});
