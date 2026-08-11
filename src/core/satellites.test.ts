/**
 * Validierung der SGP4-Verdrahtung (Spec §4, §20).
 * Netzunabhängig: Am TLE-Epochenzeitpunkt ist das Bahnelement gültig, die ISS
 * fliegt in ~400–420 km Höhe. Das prüft die Propagation, ohne auf frische
 * Daten oder die (simulierte) Systemuhr angewiesen zu sein.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { FALLBACK_TLES, nextPass, satellitePosition } from './satellites';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const iss = FALLBACK_TLES.find((t) => t.name.startsWith('ISS'))!;

// TLE-Epoche: 2024, Tag 79.077… → in ein Datum umrechnen.
function epochDate(): Date {
  const start = new Date(Date.UTC(2024, 0, 1));
  return new Date(start.getTime() + (79.07757601 - 1) * 86_400_000);
}

describe('satellitePosition (ISS am Epochenzeitpunkt)', () => {
  it('liefert eine Bahnhöhe im ISS-Bereich (~400–420 km)', () => {
    const s = satellitePosition(iss, epochDate(), KA);
    expect(s).not.toBeNull();
    expect(s!.altitudeKm).toBeGreaterThan(380);
    expect(s!.altitudeKm).toBeLessThan(440);
  });

  it('liefert gültige topozentrische Winkel und ein junges TLE-Alter am Epoch', () => {
    const s = satellitePosition(iss, epochDate(), KA)!;
    expect(s.azimuth).toBeGreaterThanOrEqual(0);
    expect(s.azimuth).toBeLessThanOrEqual(360);
    expect(s.elevation).toBeGreaterThanOrEqual(-90);
    expect(s.elevation).toBeLessThanOrEqual(90);
    expect(Math.abs(s.tleAgeDays)).toBeLessThan(1);
  });
});

describe('nextPass', () => {
  it('findet innerhalb von 24 h einen Überflug oder gibt sauber null zurück', () => {
    const pass = nextPass(iss, epochDate(), KA, 24);
    if (pass) {
      expect(pass.maxElevation).toBeGreaterThanOrEqual(10);
      expect(pass.rise.getTime()).toBeLessThanOrEqual(pass.max.getTime());
      expect(pass.max.getTime()).toBeLessThanOrEqual(pass.set.getTime());
    } else {
      expect(pass).toBeNull();
    }
  });
});
