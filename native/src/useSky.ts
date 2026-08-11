/**
 * useSky — verdrahtet die geteilte, UI-freie Engine (aus ../../src) für React
 * Native. Beweist die Portabilität aus Spec §6.3: Provider, object-bus, Astro-
 * und Time-Engine werden unverändert aus dem Web-Target übernommen.
 */

import { useEffect, useMemo, useState } from 'react';
import type { GeoLocation } from '../../src/core/astro-engine';
import { sunTimes } from '../../src/core/astro-engine';
import { ObjectBus } from '../../src/core/object-bus';
import { paletteForElevation } from '../../src/core/theme-engine';
import { solarOffset, utcOffsetMinutes } from '../../src/core/time-engine';
import type { CelestialObject } from '../../src/core/types';
import { sunProvider } from '../../src/providers/sun';
import { moonProvider } from '../../src/providers/moon';
import { planetsProvider } from '../../src/providers/planets';
import { starsProvider } from '../../src/providers/stars';
import { deepSkyProvider } from '../../src/providers/deep-sky';

export interface Layers {
  planets: boolean;
  stars: boolean;
  deepSky: boolean;
}

export interface SkyState {
  now: Date;
  objects: CelestialObject[];
  sun?: CelestialObject;
  moon?: CelestialObject;
  offset: ReturnType<typeof solarOffset>;
  times: ReturnType<typeof sunTimes>;
  palette: ReturnType<typeof paletteForElevation>['palette'];
  nightness: number;
  tzOffsetMinutes: number;
}

export function useSky(location: GeoLocation, layers: Layers): SkyState {
  const bus = useMemo(() => {
    const b = new ObjectBus();
    b.register(sunProvider);
    b.register(moonProvider);
    b.register(planetsProvider);
    b.register(starsProvider);
    b.register(deepSkyProvider);
    return b;
  }, []);

  bus.setEnabled('planets', layers.planets);
  bus.setEnabled('stars', layers.stars);
  bus.setEnabled('deep-sky', layers.deepSky);

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const objects = bus.collect({ time: now, location });
    const sun = objects.find((o) => o.kind === 'sun');
    const moon = objects.find((o) => o.kind === 'moon');
    const { palette, nightness } = paletteForElevation(sun?.horizontal.elevation ?? -90);
    return {
      now,
      objects,
      sun,
      moon,
      offset: solarOffset(now, location),
      times: sunTimes(now, location),
      palette,
      nightness,
      tzOffsetMinutes: utcOffsetMinutes(now),
    };
  }, [bus, now, location, layers.planets, layers.stars, layers.deepSky]);
}
