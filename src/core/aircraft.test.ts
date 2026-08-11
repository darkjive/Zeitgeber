/**
 * Validierung der Flugzeug-Topozentrik (Spec §4, §20). Netzunabhängig.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { aircraftLookAngle } from './aircraft';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };

describe('aircraftLookAngle', () => {
  it('direkt über dem Beobachter → Höhe nahe 90°', () => {
    const look = aircraftLookAngle(KA, { latitude: KA.latitude, longitude: KA.longitude, altitudeKm: 11 });
    expect(look.elevation).toBeGreaterThan(89);
    expect(look.distanceKm).toBeGreaterThan(10);
    expect(look.distanceKm).toBeLessThan(12);
  });

  it('ein Flugzeug im Norden steht im Norden (Azimut nahe 0/360°)', () => {
    const look = aircraftLookAngle(KA, { latitude: KA.latitude + 0.8, longitude: KA.longitude, altitudeKm: 10 });
    const dAz = Math.min(look.azimuth, 360 - look.azimuth);
    expect(dAz).toBeLessThan(5);
    expect(look.above).toBe(true);
  });

  it('ein Flugzeug im Osten steht im Osten (Azimut nahe 90°)', () => {
    const look = aircraftLookAngle(KA, { latitude: KA.latitude, longitude: KA.longitude + 0.8, altitudeKm: 10 });
    expect(Math.abs(look.azimuth - 90)).toBeLessThan(5);
  });
});
