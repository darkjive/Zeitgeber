/**
 * Provider `stars` — optional, standardmäßig deaktiviert (Spec §7.4, §19).
 * Helle benannte Fixsterne, sehr langes Aktualisierungsintervall.
 */

import { equatorialToHorizontal } from '../core/astro-engine';
import { BRIGHT_STARS } from '../core/stars';
import type { ObjectProvider } from '../core/types';

export const starsProvider: ObjectProvider = {
  id: 'stars',
  updateInterval: 600_000, // Sterne ändern sich langsam — sehr seltener Takt (§7.2, §19)
  requiresNetwork: false,
  getObjects({ time, location }) {
    return BRIGHT_STARS.map((s) => ({
      id: `star:${s.name}`,
      providerId: 'stars',
      nameKey: 'object.star',
      kind: 'star' as const,
      horizontal: equatorialToHorizontal(s.ra, s.dec, time, location),
      magnitude: s.mag,
      metadata: { name: s.name },
    }));
  },
};
