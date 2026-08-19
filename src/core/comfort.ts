/**
 * comfort — Hitzeschutz-Geometrie: Verschattung (Rolläden) und Lüften.
 *
 * Nicht in der Spezifikation vorgesehen, folgt aber deren Logik: Sun Clock
 * kennt Sonnenstand und (über das Wetter-Modul) die Aussentemperatur ohnehin.
 * Reine Komfort-/Energie-Aussagen über Licht und Wärme — **keine Gesundheits-
 * aussagen** (§5): es geht ums Kühlhalten und Verschatten, nicht um Gesundheit.
 */

import type { GeoLocation } from './astro-engine.js';
import { sunPosition, sunTimes } from './astro-engine.js';
import { irradianceFactor } from './solar-geometry.js';

export interface Window {
  start: Date | null;
  end: Date | null;
  peak: Date | null;
}

/**
 * Zeitfenster, in dem direkte Sonne stark auf eine senkrechte Fassade fällt –
 * dann Rolläden/Verschattung schließen, um Wärmeeintrag zu vermeiden.
 */
export function shutterWindow(date: Date, loc: GeoLocation, facadeAzimuth: number, threshold = 0.35, stepMin = 10): Window {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  let first: Date | null = null;
  let last: Date | null = null;
  let peak: Date | null = null;
  let peakF = 0;
  for (let m = 0; m < 24 * 60; m += stepMin) {
    const time = new Date(start.getTime() + m * 60_000);
    const f = irradianceFactor(sunPosition(time, loc), facadeAzimuth, 90); // senkrecht
    if (f >= threshold) {
      if (!first) first = time;
      last = time;
    }
    if (f > peakF) {
      peakF = f;
      peak = time;
    }
  }
  return { start: first, end: last, peak: peakF >= threshold ? peak : null };
}

/**
 * Geometrie-Empfehlung fürs Lüften ohne Temperaturdaten: kühl ist es, wenn die
 * Sonne weg ist. Fenster abends ab Sonnenuntergang, morgens bis kurz nach
 * Sonnenaufgang.
 */
export function ventilationByGeometry(date: Date, loc: GeoLocation, morningBufferMin = 120): { eveningFrom: Date | null; morningUntil: Date | null } {
  const times = sunTimes(date, loc);
  return {
    eveningFrom: times.sunset,
    morningUntil: times.sunrise ? new Date(times.sunrise.getTime() + morningBufferMin * 60_000) : null,
  };
}

export interface HourTemp {
  time: Date;
  temp: number;
}

export interface TempVentilation {
  coolStart: Date | null;
  coolEnd: Date | null;
  minTemp: number;
  maxTemp: number;
  peakHeat: Date | null;
}

/**
 * Verfeinerung mit stündlichen Temperaturen (falls online): bestes Lüftfenster
 * um das Tagesminimum, plus Zeitpunkt der größten Hitze.
 */
export function ventilationByTemperature(temps: HourTemp[], toleranceC = 2): TempVentilation | null {
  if (temps.length === 0) return null;
  let min = temps[0];
  let max = temps[0];
  for (const h of temps) {
    if (h.temp < min.temp) min = h;
    if (h.temp > max.temp) max = h;
  }
  // Zusammenhängendes Fenster um das Minimum, in dem temp <= min + Toleranz.
  const minIdx = temps.indexOf(min);
  let lo = minIdx;
  let hi = minIdx;
  while (lo - 1 >= 0 && temps[lo - 1].temp <= min.temp + toleranceC) lo--;
  while (hi + 1 < temps.length && temps[hi + 1].temp <= min.temp + toleranceC) hi++;
  return {
    coolStart: temps[lo].time,
    coolEnd: temps[hi].time,
    minTemp: Math.round(min.temp),
    maxTemp: Math.round(max.temp),
    peakHeat: max.time,
  };
}
