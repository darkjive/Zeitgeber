/**
 * Provider `aircraft` — optional, standardmäßig deaktiviert (Spec §7.4, §20).
 * Höchster Netzbedarf; Livedaten vom OpenSky Network (features/aircraft.ts).
 * Offline (keine Daten) liefert der Provider einfach nichts.
 */

import { aircraftLookAngle, getAircraft } from '../core/aircraft';
import type { ObjectProvider } from '../core/types';

export const aircraftProvider: ObjectProvider = {
  id: 'aircraft',
  updateInterval: 12_000, // moderate Aktualisierung, Rate-Limits beachten (§20)
  requiresNetwork: true,
  getObjects({ location }) {
    return getAircraft().map((ac) => {
      const look = aircraftLookAngle(location, ac);
      return {
        id: `ac:${ac.id}`,
        providerId: 'aircraft',
        nameKey: 'object.aircraft',
        kind: 'aircraft' as const,
        horizontal: { elevation: look.elevation, azimuth: look.azimuth },
        metadata: { name: ac.callsign || ac.id, altitudeKm: Math.round(ac.altitudeKm), distanceKm: Math.round(look.distanceKm) },
      };
    });
  },
};
