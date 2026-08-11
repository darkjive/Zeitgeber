/**
 * outdoor — Outdoor- & Survival-Kennzahlen (Spec §29).
 *
 * Überschneidet sich technisch fast vollständig mit vorhandenen Berechnungen:
 * Restlicht-Countdown, blaue/goldene Stunde, Mondlicht-Prognose und
 * Himmelsrichtung ohne Kompass — alles aus Sonnen-/Mondstand ableitbar und
 * vollständig offline (§29). Reine Funktionen.
 */

import type { GeoLocation } from './astro-engine';
import { moonInfo, sunPosition, sunTimeAtAltitude, sunTimes } from './astro-engine';

/** Restlicht bis zum Ende der bürgerlichen Dämmerung (Sonne −6°). */
export interface UsableLight {
  /** Minuten bis Ende der bürgerlichen Dämmerung; 0, wenn bereits Nacht. */
  minutes: number;
  until: Date | null;
  state: 'day' | 'twilight' | 'night' | 'polar-day' | 'polar-night';
}

export function usableLight(now: Date, loc: GeoLocation): UsableLight {
  const times = sunTimes(now, loc);
  const sun = sunPosition(now, loc);

  if (!times.sunrise && !times.sunset) {
    // Polartag/-nacht: kein Auf-/Untergang.
    const polar = times.noonElevation > 0 ? 'polar-day' : 'polar-night';
    return { minutes: polar === 'polar-day' ? Infinity : 0, until: null, state: polar };
  }

  const civilDusk = times.civilDusk;
  if (civilDusk && now < civilDusk && sun.elevation > -6) {
    return {
      minutes: Math.max(0, Math.round((civilDusk.getTime() - now.getTime()) / 60_000)),
      until: civilDusk,
      state: sun.elevation > -0.833 ? 'day' : 'twilight',
    };
  }
  return { minutes: 0, until: null, state: 'night' };
}

export interface LightWindow {
  start: Date | null;
  end: Date | null;
}

/**
 * Blaue und goldene Stunde (fotografische Definitionen):
 * golden −4°…+6°, blau −6°…−4°. Jeweils morgens und abends.
 */
export function goldenBlueWindows(date: Date, loc: GeoLocation): {
  morningBlue: LightWindow;
  morningGolden: LightWindow;
  eveningGolden: LightWindow;
  eveningBlue: LightWindow;
} {
  const at = (alt: number, side: 'rise' | 'set') => sunTimeAtAltitude(date, loc, alt, side);
  return {
    morningBlue: { start: at(-6, 'rise'), end: at(-4, 'rise') },
    morningGolden: { start: at(-4, 'rise'), end: at(6, 'rise') },
    eveningGolden: { start: at(6, 'set'), end: at(-4, 'set') },
    eveningBlue: { start: at(-4, 'set'), end: at(-6, 'set') },
  };
}

export type MoonlightLevel = 'dark' | 'dim' | 'bright';

export interface MoonlightForecast {
  illumination: number;
  altitude: number;
  /** Effektive nächtliche Helligkeit ohne Kunstlicht, 0…1. */
  brightness: number;
  level: MoonlightLevel;
}

export function moonlightForecast(now: Date, loc: GeoLocation): MoonlightForecast {
  const m = moonInfo(now, loc);
  const above = Math.max(0, Math.sin(m.elevation * (Math.PI / 180)));
  const brightness = m.illumination * above;
  const level: MoonlightLevel = brightness < 0.05 ? 'dark' : brightness < 0.3 ? 'dim' : 'bright';
  return { illumination: m.illumination, altitude: m.elevation, brightness, level };
}

/** Himmelsrichtung über den Sonnenazimut — funktioniert ohne Kompass (§29). */
export function sunDirection(now: Date, loc: GeoLocation): { azimuth: number; elevation: number; above: boolean } {
  const sun = sunPosition(now, loc);
  return { azimuth: sun.azimuth, elevation: sun.elevation, above: sun.elevation > -0.833 };
}
