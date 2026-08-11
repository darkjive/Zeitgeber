/**
 * meteor-showers — die acht Hauptströme (Spec §21).
 *
 * Statische, kleine Datenbasis: Radiant, Aktivitätszeitraum, Peak und
 * ZHR (zenithal hourly rate). Die Radiant-Höhe wird über die vorhandene
 * Koordinatentransformation (astro-engine) bestimmt — vollständig offline.
 */

import type { GeoLocation } from './astro-engine';
import { equatorialToHorizontal } from './astro-engine';

export interface MeteorShower {
  key: string;
  radiantRA: number; // Grad (J2000)
  radiantDec: number; // Grad
  peak: [number, number]; // [Monat 0-basiert, Tag]
  start: [number, number];
  end: [number, number];
  zhr: number; // typische Rate am Maximum
}

export const SHOWERS: MeteorShower[] = [
  { key: 'meteor.quadrantids', radiantRA: 230, radiantDec: 49, peak: [0, 3], start: [11, 28], end: [0, 12], zhr: 120 },
  { key: 'meteor.lyrids', radiantRA: 271, radiantDec: 34, peak: [3, 22], start: [3, 16], end: [3, 25], zhr: 18 },
  { key: 'meteor.etaAquariids', radiantRA: 338, radiantDec: -1, peak: [4, 6], start: [3, 19], end: [4, 28], zhr: 50 },
  { key: 'meteor.perseids', radiantRA: 48, radiantDec: 58, peak: [7, 12], start: [6, 17], end: [7, 24], zhr: 100 },
  { key: 'meteor.orionids', radiantRA: 95, radiantDec: 16, peak: [9, 21], start: [9, 2], end: [10, 7], zhr: 20 },
  { key: 'meteor.leonids', radiantRA: 152, radiantDec: 22, peak: [10, 17], start: [10, 6], end: [10, 30], zhr: 15 },
  { key: 'meteor.geminids', radiantRA: 112, radiantDec: 33, peak: [11, 14], start: [11, 4], end: [11, 17], zhr: 120 },
  { key: 'meteor.ursids', radiantRA: 217, radiantDec: 76, peak: [11, 22], start: [11, 17], end: [11, 26], zhr: 10 },
];

const dayOfYear = (month: number, day: number): number => {
  const cum = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return cum[month] + day;
};
const dateDoy = (d: Date): number => dayOfYear(d.getMonth(), d.getDate());

/** Ist der Strom am Datum aktiv? (Behandelt Zeiträume über den Jahreswechsel.) */
export function isActive(shower: MeteorShower, date: Date): boolean {
  const doy = dateDoy(date);
  const s = dayOfYear(...shower.start);
  const e = dayOfYear(...shower.end);
  return s <= e ? doy >= s && doy <= e : doy >= s || doy <= e;
}

export interface ShowerStatus {
  shower: MeteorShower;
  active: boolean;
  daysToPeak: number; // negativ = Peak vorbei (in Tagen)
  radiantAltitude: number;
  radiantUp: boolean;
}

/** Nächstes Peak-Datum (dieses oder nächstes Jahr) relativ zu `date`. */
function nextPeak(shower: MeteorShower, date: Date): Date {
  const [m, d] = shower.peak;
  const thisYear = new Date(date.getFullYear(), m, d, 2, 0, 0);
  if (thisYear.getTime() >= date.getTime() - 2 * 86_400_000) return thisYear;
  return new Date(date.getFullYear() + 1, m, d, 2, 0, 0);
}

export function showerStatus(shower: MeteorShower, date: Date, loc: GeoLocation): ShowerStatus {
  const peak = nextPeak(shower, date);
  const daysToPeak = Math.round((peak.getTime() - date.getTime()) / 86_400_000);
  const h = equatorialToHorizontal(shower.radiantRA, shower.radiantDec, date, loc);
  return {
    shower,
    active: isActive(shower, date),
    daysToPeak,
    radiantAltitude: Math.round(h.elevation),
    radiantUp: h.elevation > 0,
  };
}

/** Aktive Ströme zuerst, dann nach Nähe zum Peak sortiert. */
export function showerOverview(date: Date, loc: GeoLocation): ShowerStatus[] {
  return SHOWERS.map((s) => showerStatus(s, date, loc)).sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1;
    return Math.abs(a.daysToPeak) - Math.abs(b.daysToPeak);
  });
}
