/**
 * Provider `sun` — Core-Provider, immer aktiv (Spec §17).
 * Liefert die Sonne als CelestialObject; Ereigniszeiten holt sich die
 * Zifferblatt-Ansicht separat über `sunTimes`.
 */

import { sunPosition } from '../core/astro-engine';
import type { ObjectProvider } from '../core/types';

export const sunProvider: ObjectProvider = {
  id: 'sun',
  updateInterval: 60_000, // Zifferblatt-Neuberechnung 1×/min (§8)
  requiresNetwork: false,
  core: true,
  getObjects({ time, location }) {
    const horizontal = sunPosition(time, location);
    return [
      {
        id: 'sun',
        providerId: 'sun',
        nameKey: 'object.sun',
        kind: 'sun',
        horizontal,
        magnitude: -26.7,
      },
    ];
  },
};
