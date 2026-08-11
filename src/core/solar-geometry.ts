/**
 * solar-geometry — Einstrahlungsgeometrie für PV/Balkonkraftwerk (Spec §31.1).
 *
 * Reine Funktionen auf Basis der vorhandenen Sonnenberechnung. Ergebnis ist ein
 * dimensionsloser Geometriefaktor (Kosinus des Einfallswinkels auf die
 * Modulebene, 0…1) — **keine Ertragsangabe in kWh** (§31.1: hängt von Modul,
 * Wechselrichter, Verschmutzung und Wetter ab).
 */

import type { GeoLocation, HorizontalCoords } from './astro-engine';
import { sunPosition } from './astro-engine';

const RAD = Math.PI / 180;

/**
 * Geometriefaktor der Einstrahlung auf eine geneigte Fläche.
 * @param sun     Sonnenstand (Azimut/Höhe)
 * @param azimuthDeg Modulausrichtung, Grad von Nord im Uhrzeigersinn (180 = Süd)
 * @param tiltDeg    Modulneigung gegen die Horizontale (0 = flach, 90 = senkrecht)
 * @returns 0…1; 0 wenn die Sonne unter dem Horizont steht oder hinter das Modul fällt
 */
export function irradianceFactor(sun: HorizontalCoords, azimuthDeg: number, tiltDeg: number): number {
  if (sun.elevation <= 0) return 0;
  const elev = sun.elevation * RAD;
  const daz = (sun.azimuth - azimuthDeg) * RAD;
  const beta = tiltDeg * RAD;
  const cosInc = Math.cos(elev) * Math.sin(beta) * Math.cos(daz) + Math.sin(elev) * Math.cos(beta);
  return Math.max(0, cosInc);
}

export interface YieldSample {
  time: Date;
  factor: number;
}

/** Tageskurve des Geometriefaktors, in lokaler Kalendertag-Auflösung. */
export function dayYieldCurve(
  date: Date,
  loc: GeoLocation,
  azimuthDeg: number,
  tiltDeg: number,
  stepMin = 10,
): YieldSample[] {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0); // lokale Mitternacht (Gerätezeitzone)
  const out: YieldSample[] = [];
  for (let m = 0; m < 24 * 60; m += stepMin) {
    const time = new Date(start.getTime() + m * 60_000);
    out.push({ time, factor: irradianceFactor(sunPosition(time, loc), azimuthDeg, tiltDeg) });
  }
  return out;
}

export interface YieldSummary {
  peak: YieldSample | null;
  windowStart: Date | null;
  windowEnd: Date | null;
  /** Relativer Tagesertrag (Fläche unter der Kurve), dimensionslos. */
  relativeDaily: number;
  curve: YieldSample[];
}

/** Kennzahlen aus der Tageskurve; `threshold` bestimmt das Ertragsfenster. */
export function yieldSummary(
  date: Date,
  loc: GeoLocation,
  azimuthDeg: number,
  tiltDeg: number,
  threshold = 0.15,
  stepMin = 10,
): YieldSummary {
  const curve = dayYieldCurve(date, loc, azimuthDeg, tiltDeg, stepMin);
  let peak: YieldSample | null = null;
  let windowStart: Date | null = null;
  let windowEnd: Date | null = null;
  let relativeDaily = 0;

  for (const s of curve) {
    relativeDaily += s.factor * stepMin;
    if (!peak || s.factor > peak.factor) peak = s;
    if (s.factor >= threshold) {
      if (!windowStart) windowStart = s.time;
      windowEnd = s.time;
    }
  }
  if (!peak || peak.factor < threshold) {
    windowStart = null;
    windowEnd = null;
  }
  return { peak, windowStart, windowEnd, relativeDaily, curve };
}

/** Relativer Tagesertrag an Sommer- und Wintersonnenwende zum Vergleich (§31.1). */
export function seasonComparison(
  year: number,
  loc: GeoLocation,
  azimuthDeg: number,
  tiltDeg: number,
): { summer: number; winter: number } {
  const summer = yieldSummary(new Date(year, 5, 21, 12), loc, azimuthDeg, tiltDeg).relativeDaily;
  const winter = yieldSummary(new Date(year, 11, 21, 12), loc, azimuthDeg, tiltDeg).relativeDaily;
  return { summer, winter };
}
