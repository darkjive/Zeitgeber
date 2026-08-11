/**
 * Validierung der Hitzeschutz-Geometrie (Spec §4-nah; Modul außerhalb der Spec).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { shutterWindow, ventilationByGeometry, ventilationByTemperature, type HourTemp } from './comfort';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const JUN = new Date(2026, 5, 21, 12);

describe('shutterWindow', () => {
  it('Südfassade wird um die Mittagszeit besonnt', () => {
    const w = shutterWindow(JUN, KA, 180);
    expect(w.start).not.toBeNull();
    expect(w.peak).not.toBeNull();
    const peakHour = w.peak!.getHours();
    expect(peakHour).toBeGreaterThanOrEqual(10);
    expect(peakHour).toBeLessThanOrEqual(14);
  });

  it('Westfassade wird am Nachmittag besonnt (Peak nach Süd)', () => {
    const south = shutterWindow(JUN, KA, 180).peak!;
    const west = shutterWindow(JUN, KA, 270).peak!;
    expect(west.getTime()).toBeGreaterThan(south.getTime());
  });
});

describe('ventilationByGeometry', () => {
  it('empfiehlt abends ab Sonnenuntergang', () => {
    const v = ventilationByGeometry(JUN, KA);
    expect(v.eveningFrom).not.toBeNull();
    expect(v.morningUntil).not.toBeNull();
  });
});

describe('ventilationByTemperature', () => {
  it('findet das kühle Fenster um das Tagesminimum', () => {
    const base = new Date(2026, 6, 1, 0, 0, 0);
    const temps: HourTemp[] = Array.from({ length: 24 }, (_, h) => ({
      time: new Date(base.getTime() + h * 3_600_000),
      // Minimum um 5 Uhr, Maximum um 16 Uhr
      temp: 20 + 8 * Math.sin(((h - 9) / 24) * 2 * Math.PI),
    }));
    const tv = ventilationByTemperature(temps)!;
    expect(tv.coolStart).not.toBeNull();
    expect(tv.peakHeat!.getHours()).toBeGreaterThanOrEqual(14);
    expect(tv.maxTemp).toBeGreaterThan(tv.minTemp);
  });
});
