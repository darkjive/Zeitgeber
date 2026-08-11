/**
 * Validierung der Gebetszeiten (Spec §4, §32.1).
 * Invarianten: korrekte Reihenfolge über den Tag, Dhuhr am Sonnenhöchststand,
 * grössere Fajr-Winkel ergeben frühere Fajr-Zeiten, Hanafi-Asr liegt später.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { sunTimes } from './astro-engine';
import { METHODS, prayerTimes } from './prayer-times';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const DAY = new Date(2026, 3, 15, 12); // 15. April, mittlere Breiten unkritisch
const mwl = METHODS.find((m) => m.id === 'MWL')!;
const egypt = METHODS.find((m) => m.id === 'Egypt')!;

describe('prayerTimes — Reihenfolge', () => {
  it('Fajr < Aufgang < Dhuhr < Asr < Maghrib < Isha', () => {
    const p = prayerTimes(DAY, KA, mwl);
    const seq = [p.fajr, p.sunrise, p.dhuhr, p.asr, p.maghrib, p.isha];
    for (const d of seq) expect(d).not.toBeNull();
    for (let i = 1; i < seq.length; i++) {
      expect(seq[i]!.getTime()).toBeGreaterThan(seq[i - 1]!.getTime());
    }
  });

  it('Dhuhr entspricht dem Sonnenhöchststand', () => {
    const p = prayerTimes(DAY, KA, mwl);
    expect(p.dhuhr!.getTime()).toBe(sunTimes(DAY, KA).solarNoon.getTime());
  });
});

describe('prayerTimes — Methoden & Rechtsschule', () => {
  it('grösserer Fajr-Winkel ergibt eine frühere Fajr-Zeit', () => {
    const fMwl = prayerTimes(DAY, KA, mwl).fajr!; // 18°
    const fEgypt = prayerTimes(DAY, KA, egypt).fajr!; // 19,5°
    expect(fEgypt.getTime()).toBeLessThan(fMwl.getTime());
  });

  it('Hanafi-Asr liegt später als Standard-Asr', () => {
    const std = prayerTimes(DAY, KA, mwl, 'standard').asr!;
    const han = prayerTimes(DAY, KA, mwl, 'hanafi').asr!;
    expect(han.getTime()).toBeGreaterThan(std.getTime());
  });

  it('Umm-al-Qura setzt Isha als festes Intervall nach Maghrib', () => {
    const makkah = METHODS.find((m) => m.id === 'Makkah')!;
    const p = prayerTimes(DAY, KA, makkah);
    expect(p.isha!.getTime() - p.maghrib!.getTime()).toBe(90 * 60_000);
  });
});
