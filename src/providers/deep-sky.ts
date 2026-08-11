/**
 * Provider `deep-sky` — optional, standardmäßig deaktiviert (Spec §7.4, §19).
 * Messier-Highlights; erscheinen automatisch in Himmelskarte und Objektliste.
 */

import { equatorialToHorizontal } from '../core/astro-engine';
import { DEEP_SKY } from '../core/deep-sky';
import type { ObjectProvider } from '../core/types';

export const deepSkyProvider: ObjectProvider = {
  id: 'deep-sky',
  updateInterval: 600_000, // sehr langsam veränderlich (§7.2)
  requiresNetwork: false,
  getObjects({ time, location }) {
    return DEEP_SKY.map((o) => ({
      id: `dso:${o.name}`,
      providerId: 'deep-sky',
      nameKey: 'object.dso',
      kind: 'dso' as const,
      horizontal: equatorialToHorizontal(o.ra, o.dec, time, location),
      magnitude: o.mag,
      metadata: { name: o.name, dsoType: o.type },
    }));
  },
};
