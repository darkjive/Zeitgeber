/**
 * Provider `satellites` — optional, standardmäßig deaktiviert (Spec §7.4, §20).
 * ISS und weitere über SGP4; erscheinen automatisch in Karte und Liste.
 * Höchster Aktualisierungsbedarf: schnelle Objekte (§7.2).
 */

import { getTles, satellitePosition } from '../core/satellites';
import type { ObjectProvider } from '../core/types';

export const satellitesProvider: ObjectProvider = {
  id: 'satellites',
  updateInterval: 5_000, // Satelliten bewegen sich schnell (§7.2)
  requiresNetwork: false, // Berechnung lokal; TLE-Nachladung separat
  getObjects({ time, location }) {
    const out = [];
    for (const tle of getTles()) {
      const s = satellitePosition(tle, time, location);
      if (!s) continue;
      out.push({
        id: `sat:${tle.name}`,
        providerId: 'satellites',
        nameKey: tle.nameKey ?? 'object.satellite',
        kind: 'satellite' as const,
        horizontal: { elevation: s.elevation, azimuth: s.azimuth },
        metadata: { name: tle.name, altitudeKm: Math.round(s.altitudeKm), tleAgeDays: Math.round(s.tleAgeDays) },
      });
    }
    return out;
  },
};
