/**
 * prayer-times — islamische Gebetszeiten (Spec §32.1).
 *
 * Direkt über Sonnenhöhe und Schattenlänge definiert — mathematisch identisch
 * zu dem, was die App ohnehin leistet. **Reine Zeitangabe, keine Deutung oder
 * Anleitung** (§5.4).
 *
 * §38.5: keine eigene Herleitung, sondern etablierte, dokumentierte
 * Berechnungskonventionen mehrerer Institutionen — samt Quellenangabe und
 * auswählbar. Vor Veröffentlichung ist ein praktischer Abgleich mit einem
 * lokalen Gebetszeitenplan vorgesehen.
 */

import type { GeoLocation } from './astro-engine';
import { solarDeclination, sunTimeAtAltitude, sunTimes } from './astro-engine';

export type AsrMadhab = 'standard' | 'hanafi';

export interface CalcMethod {
  id: string;
  source: string;
  /** Sonnentiefe für Fajr, Grad unter dem Horizont. */
  fajrAngle: number;
  /** Sonnentiefe für Isha, Grad — oder null bei festem Intervall. */
  ishaAngle: number | null;
  /** Isha als festes Intervall nach Maghrib, Minuten (statt Winkel). */
  ishaInterval?: number;
}

/** Etablierte Konventionen mit Quelle (§38.5). */
export const METHODS: CalcMethod[] = [
  { id: 'MWL', source: 'Muslim World League', fajrAngle: 18, ishaAngle: 17 },
  { id: 'ISNA', source: 'Islamic Society of North America', fajrAngle: 15, ishaAngle: 15 },
  { id: 'Egypt', source: 'Egyptian General Authority of Survey', fajrAngle: 19.5, ishaAngle: 17.5 },
  { id: 'Makkah', source: 'Umm al-Qura University, Makkah', fajrAngle: 18.5, ishaAngle: null, ishaInterval: 90 },
  { id: 'Karachi', source: 'University of Islamic Sciences, Karachi', fajrAngle: 18, ishaAngle: 18 },
  { id: 'Diyanet', source: 'Diyanet İşleri Başkanlığı (Türkiye)', fajrAngle: 18, ishaAngle: 17 },
];

export interface PrayerTimes {
  fajr: Date | null;
  sunrise: Date | null;
  dhuhr: Date | null;
  asr: Date | null;
  maghrib: Date | null;
  isha: Date | null;
  method: CalcMethod;
  madhab: AsrMadhab;
}

const RAD = Math.PI / 180;

/**
 * Gebetszeiten für Datum, Ort, Methode und Rechtsschule (Asr-Schattenfaktor).
 * Standard/Shafiʿi/Maliki/Hanbali → Faktor 1; Hanafi → Faktor 2.
 */
export function prayerTimes(
  date: Date,
  loc: GeoLocation,
  method: CalcMethod = METHODS[0],
  madhab: AsrMadhab = 'standard',
): PrayerTimes {
  const times = sunTimes(date, loc);
  const maghrib = times.sunset; // Maghrib zu Sonnenuntergang (gängige Konvention)

  // Asr: Schattenlänge = Faktor + tan|φ − δ|  →  Sonnenhöhe.
  const decl = solarDeclination(date);
  const factor = madhab === 'hanafi' ? 2 : 1;
  const asrAltitude = Math.atan(1 / (factor + Math.tan(Math.abs(loc.latitude - decl) * RAD))) / RAD;

  let isha: Date | null;
  if (method.ishaAngle == null && method.ishaInterval != null) {
    isha = maghrib ? new Date(maghrib.getTime() + method.ishaInterval * 60_000) : null;
  } else {
    isha = sunTimeAtAltitude(date, loc, -(method.ishaAngle ?? 17), 'set');
  }

  return {
    fajr: sunTimeAtAltitude(date, loc, -method.fajrAngle, 'rise'),
    sunrise: times.sunrise,
    dhuhr: times.solarNoon,
    asr: sunTimeAtAltitude(date, loc, asrAltitude, 'set'),
    maghrib,
    isha,
    method,
    madhab,
  };
}
