/**
 * time-engine — gesetzliche Zeit vs. echte Sonnenzeit (Spec §7.1, §26.1 A).
 *
 * Der Sonnenzeit-Versatz ist der Kern des Alleinstellungsmerkmals (§2):
 * die Differenz zwischen gesetzlichem Mittag und tatsächlichem
 * Sonnenhöchststand. Reine Berechnung, keine Nutzerdaten (§26.1 A) —
 * gehört deshalb vollständig in den MVP.
 */

import type { GeoLocation } from './astro-engine';
import { equationOfTime, julianDay } from './astro-engine';

export interface SolarOffset {
  /** Versatz in Minuten: positiv = die Uhr geht der Sonne voraus. */
  minutes: number;
  /** Anteil aus geografischer Länge relativ zum Zeitzonen-Meridian, Minuten. */
  geographicMinutes: number;
  /** Anteil aus der Zeitgleichung, Minuten. */
  equationOfTimeMinutes: number;
  /** Gesetzlicher Mittag am Ort (12:00 Ortszeit) als Zeitpunkt. */
  legalNoon: Date;
  /** Tatsächlicher Sonnenhöchststand als Zeitpunkt. */
  solarNoon: Date;
}

/**
 * UTC-Offset des Ortes in Minuten für einen Zeitpunkt, ermittelt über die
 * IANA-Zeitzone (Spec §4: Intl nativ). Fällt auf die Geräte-Zeitzone zurück.
 */
export function utcOffsetMinutes(date: Date, timeZone?: string): number {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
    const asUTC = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    return Math.round((asUTC - date.getTime()) / 60_000);
  } catch {
    return -date.getTimezoneOffset();
  }
}

/**
 * Sonnenzeit-Versatz für Zeitpunkt und Ort.
 * `timeZone` ist eine IANA-Kennung; ohne Angabe gilt die Gerätezeitzone.
 */
export function solarOffset(date: Date, loc: GeoLocation, timeZone?: string): SolarOffset {
  const tzMin = utcOffsetMinutes(date, timeZone);
  const eotMin = equationOfTime((julianDay(date) - 2_451_545) / 36_525);

  // Geografischer Anteil: Der Zeitzonen-Meridian liegt bei tz/60 * 15° Ost.
  // Die Sonne kulminiert 4 min je Grad Ost *früher* → Versatz.
  const tzMeridian = (tzMin / 60) * 15;
  const geographicMinutes = (tzMeridian - loc.longitude) * 4;

  // Echter Sonnenhöchststand in UTC-Minuten und als Zeitpunkt.
  const solarNoonUTCmin = 720 - 4 * loc.longitude - eotMin;
  const dayStart = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const solarNoon = new Date(dayStart.getTime() + solarNoonUTCmin * 60_000);

  // Gesetzlicher Mittag (12:00 Ortszeit) als UTC-Zeitpunkt.
  const legalNoon = new Date(dayStart.getTime() + (720 - tzMin) * 60_000);

  const minutes = Math.round((legalNoon.getTime() - solarNoon.getTime()) / 60_000);

  return {
    minutes,
    geographicMinutes: Math.round(geographicMinutes),
    equationOfTimeMinutes: Math.round(eotMin),
    legalNoon,
    solarNoon,
  };
}
