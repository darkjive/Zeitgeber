/**
 * kids — Hilfslogik für den Kinder-Layer (Spec §30).
 *
 * Verknüpft den Bildschirm mit dem Rausgehen: Wenn abends ein heller Planet
 * sichtbar ist, entsteht daraus eine Beobachtungsaufgabe. Reine Funktion.
 * Keine Datenerhebung, keine Gamification (§30).
 */

import type { GeoLocation } from './astro-engine';
import { sunPosition } from './astro-engine';
import { PLANET_IDS, planetPosition } from './planets';

export interface BrightPlanet {
  /** i18n-Schlüssel des Planeten, z. B. 'object.venus'. */
  nameKey: string;
  azimuth: number;
  elevation: number;
  magnitude: number;
}

/**
 * Hellster, gut sichtbarer Planet, wenn die Sonne (fast) weg ist — sonst null.
 * „Gut sichtbar": über 10° Höhe und heller als Magnitude 1,5.
 */
export function visibleBrightPlanet(date: Date, loc: GeoLocation): BrightPlanet | null {
  const sun = sunPosition(date, loc);
  if (sun.elevation > 3) return null; // am Tag nicht sinnvoll

  let best: BrightPlanet | null = null;
  for (const id of PLANET_IDS) {
    const p = planetPosition(id, date, loc);
    if (p.elevation < 10 || p.magnitude > 1.5) continue;
    if (!best || p.magnitude < best.magnitude) {
      best = { nameKey: `object.${id}`, azimuth: p.azimuth, elevation: p.elevation, magnitude: p.magnitude };
    }
  }
  return best;
}
