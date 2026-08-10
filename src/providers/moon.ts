/**
 * Provider `moon` — Core-Provider, immer aktiv (Spec §17).
 * Position, Phase, Beleuchtungsgrad, Alter im Zyklus.
 */

import { moonInfo } from '../core/astro-engine';
import type { ObjectProvider } from '../core/types';

export const moonProvider: ObjectProvider = {
  id: 'moon',
  updateInterval: 60_000,
  requiresNetwork: false,
  core: true,
  getObjects({ time, location }) {
    const m = moonInfo(time, location);
    return [
      {
        id: 'moon',
        providerId: 'moon',
        nameKey: 'object.moon',
        kind: 'moon',
        horizontal: { elevation: m.elevation, azimuth: m.azimuth },
        magnitude: -12.7,
        metadata: {
          illumination: m.illumination,
          ageDays: m.ageDays,
          phaseKey: m.phaseKey,
        },
      },
    ];
  },
};
