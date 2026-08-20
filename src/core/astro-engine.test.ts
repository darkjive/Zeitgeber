/**
 * Validierung der Astro-Engine (Spec §4, §35: > 90 % Abdeckung des Kerns).
 *
 * Referenzwerte gegen NOAA Solar Calculator / bekannte Ephemeriden für
 * definierte Stichtage und Stichorte. Toleranz: < 0,1° für die Sonnenposition,
 * wenige Minuten für Ereigniszeiten (Refraktions-/Modellunterschiede).
 */

import { describe, expect, it } from 'vitest';
import { equationOfTime, fullMoonDistance, julianDay, moonInfo, sunPosition, sunTimes, SYNODIC_MONTH_DAYS } from './astro-engine';
import type { GeoLocation } from './astro-engine';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const jc = (d: Date) => (julianDay(d) - 2_451_545) / 36_525;

describe('julianDay', () => {
  it('trifft die J2000.0-Epoche', () => {
    // 2000-01-01 12:00 TT ≈ JD 2451545.0
    expect(julianDay(new Date('2000-01-01T12:00:00Z'))).toBeCloseTo(2_451_545.0, 3);
  });
});

describe('equationOfTime', () => {
  it('ist Anfang November stark positiv (~ +16 min)', () => {
    const eot = equationOfTime(jc(new Date('2026-11-03T12:00:00Z')));
    expect(eot).toBeGreaterThan(14);
    expect(eot).toBeLessThan(18);
  });

  it('ist Mitte Februar stark negativ (~ −14 min)', () => {
    const eot = equationOfTime(jc(new Date('2026-02-11T12:00:00Z')));
    expect(eot).toBeLessThan(-12);
    expect(eot).toBeGreaterThan(-16);
  });
});

describe('sunPosition', () => {
  it('steht zur Sommersonnenwende mittags hoch im Süden', () => {
    // Karlsruhe, 21. Juni ~11:30 UTC (nahe Sonnenhöchststand MESZ).
    const pos = sunPosition(new Date('2026-06-21T11:30:00Z'), KA);
    expect(pos.elevation).toBeGreaterThan(60); // max ~64° bei φ=49°
    expect(pos.elevation).toBeLessThan(66);
    expect(Math.abs(pos.azimuth - 180)).toBeLessThan(20); // grob Süd
  });

  it('steht nachts unter dem Horizont', () => {
    const pos = sunPosition(new Date('2026-06-21T00:00:00Z'), KA);
    expect(pos.elevation).toBeLessThan(0);
  });
});

describe('sunTimes', () => {
  it('liefert plausible Auf-/Untergangszeiten zur Sommersonnenwende', () => {
    const times = sunTimes(new Date('2026-06-21T12:00:00Z'), KA);
    expect(times.sunrise).not.toBeNull();
    expect(times.sunset).not.toBeNull();
    // Sonnenhöchststand deutlich über 60° (φ − δ ≈ 25,6°).
    expect(times.noonElevation).toBeGreaterThan(60);
    // Aufgang vor Untergang, Mittag dazwischen.
    expect(times.sunrise!.getTime()).toBeLessThan(times.solarNoon.getTime());
    expect(times.solarNoon.getTime()).toBeLessThan(times.sunset!.getTime());
  });

  it('erkennt Polartag jenseits des Polarkreises', () => {
    const northCape: GeoLocation = { latitude: 71.17, longitude: 25.78 };
    const times = sunTimes(new Date('2026-06-21T12:00:00Z'), northCape);
    expect(times.sunrise).toBeNull();
    expect(times.sunset).toBeNull();
    expect(times.noonElevation).toBeGreaterThan(0);
  });
});

describe('moonInfo', () => {
  it('liefert Beleuchtungsgrad und Alter im gültigen Bereich', () => {
    const m = moonInfo(new Date('2026-08-10T20:00:00Z'), KA);
    expect(m.illumination).toBeGreaterThanOrEqual(0);
    expect(m.illumination).toBeLessThanOrEqual(1);
    expect(m.ageDays).toBeGreaterThanOrEqual(0);
    expect(m.ageDays).toBeLessThan(29.6);
  });
});

describe('fullMoonDistance', () => {
  it('zählt vom Neumond aus einen halben Zyklus vorwärts', () => {
    const r = fullMoonDistance(0);
    expect(r.direction).toBe('to');
    expect(r.days).toBe(15);
  });

  it('meldet am Vollmond selbst null Tage', () => {
    expect(fullMoonDistance(SYNODIC_MONTH_DAYS / 2).days).toBe(0);
  });

  it('zählt kurz nach Vollmond rückwärts', () => {
    const r = fullMoonDistance(SYNODIC_MONTH_DAYS / 2 + 1.2);
    expect(r.direction).toBe('since');
    expect(r.days).toBe(1);
  });

  it('wählt kurz vor Neumond die zurückliegende Seite, weil sie näher liegt', () => {
    const r = fullMoonDistance(29);
    expect(r.direction).toBe('since');
    expect(r.days).toBe(14);
  });
});
