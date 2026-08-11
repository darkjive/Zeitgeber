/**
 * Provider `planets` — optional, standardmäßig deaktiviert (Spec §7.4, §18).
 * Merkur…Neptun; Uranus/Neptun als „nur mit Optik" markiert.
 */

import { PLANET_IDS, planetPosition } from '../core/planets';
import type { ObjectProvider } from '../core/types';

export const planetsProvider: ObjectProvider = {
  id: 'planets',
  updateInterval: 300_000, // Planeten wandern langsam — seltener Takt genügt (§7.2)
  requiresNetwork: false,
  getObjects({ time, location }) {
    return PLANET_IDS.map((id) => {
      const p = planetPosition(id, time, location);
      return {
        id,
        providerId: 'planets',
        nameKey: `object.${id}`,
        kind: 'planet' as const,
        horizontal: { elevation: p.elevation, azimuth: p.azimuth },
        magnitude: p.magnitude,
        metadata: { elongation: p.elongation, needsOptics: p.needsOptics },
      };
    });
  },
};
