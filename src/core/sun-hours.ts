/**
 * sun-hours — direkte Sonnenstunden, Fassaden- und Verschattungsgeometrie
 * (Spec §31.2 Garten, §31.3 Architektur).
 *
 * Nutzt ausschliesslich die vorhandene Sonnenberechnung. Zwei Anwendungen aus
 * einer Geometrie: Fassadenbesonnung (Ausrichtung eines Fensters) und
 * Verschattung durch ein Hindernis (Gebäude/Baum mit Höhe und Abstand).
 */

import type { GeoLocation } from './astro-engine';
import { sunPosition, sunTimes } from './astro-engine';

const DEG = 180 / Math.PI;

export interface Obstacle {
  /** Richtung des Hindernisses, Grad von Nord. */
  azimuth: number;
  /** Halbe Winkelbreite des Hindernisses, Grad. */
  halfWidth: number;
  /** Höhe und Abstand in derselben Einheit (nur das Verhältnis zählt). */
  height: number;
  distance: number;
}

export interface SunHoursOptions {
  /** Fassaden-/Fensterausrichtung, Grad von Nord. Ohne Angabe: freier Himmel. */
  facadeAzimuth?: number;
  /** Verschattendes Hindernis. */
  obstacle?: Obstacle;
  stepMin?: number;
}

export interface SunHours {
  totalMin: number;
  morningMin: number; // vor dem Sonnenhöchststand
  afternoonMin: number; // nach dem Sonnenhöchststand
}

const angularDelta = (a: number, b: number): number => {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
};

/** Direkte Sonnenstunden an einem Ort für den lokalen Kalendertag. */
export function directSunHours(date: Date, loc: GeoLocation, opts: SunHoursOptions = {}): SunHours {
  const { facadeAzimuth, obstacle, stepMin = 10 } = opts;
  const noon = sunTimes(date, loc).solarNoon.getTime();

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  let morning = 0;
  let afternoon = 0;

  for (let m = 0; m < 24 * 60; m += stepMin) {
    const time = new Date(start.getTime() + m * 60_000);
    const sun = sunPosition(time, loc);
    if (sun.elevation <= 0) continue;

    // Fassade: Sonne muss vor dem Fenster stehen (±90°).
    if (facadeAzimuth != null && Math.cos((sun.azimuth - facadeAzimuth) / DEG) <= 0) continue;

    // Hindernis: blockt, wenn azimutal innerhalb der Breite und tiefer als
    // der Abschattungswinkel atan(Höhe/Abstand).
    if (obstacle) {
      const blockAngle = Math.atan2(obstacle.height, obstacle.distance) * DEG;
      if (angularDelta(sun.azimuth, obstacle.azimuth) < obstacle.halfWidth && sun.elevation < blockAngle) continue;
    }

    if (time.getTime() < noon) morning += stepMin;
    else afternoon += stepMin;
  }

  return { totalMin: morning + afternoon, morningMin: morning, afternoonMin: afternoon };
}

/** Sonnenstunden an Sommer- und Wintersonnenwende zum Vergleich. */
export function seasonSunHours(year: number, loc: GeoLocation, opts: SunHoursOptions = {}): { summer: number; winter: number } {
  return {
    summer: directSunHours(new Date(year, 5, 21, 12), loc, opts).totalMin,
    winter: directSunHours(new Date(year, 11, 21, 12), loc, opts).totalMin,
  };
}
