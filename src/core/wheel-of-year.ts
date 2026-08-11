/**
 * wheel-of-year — Jahreskreis (Spec §32.2).
 *
 * Sonnenwenden, Tagundnachtgleichen und die vier Zwischenfeste als **exakter
 * astronomischer Zeitpunkt**, nicht als kalendarisches Näherungsdatum. Definiert
 * über die Ekliptiklänge der Sonne: Tagundnachtgleichen und Sonnenwenden bei
 * 0/90/180/270°, die Zwischenfeste bei 45/135/225/315°.
 *
 * Reine Zeitangabe, keine Deutung (§5.4).
 */

import { sunEclipticLongitude } from './astro-engine';

export interface WheelEvent {
  key: string;
  /** Ziel-Ekliptiklänge der Sonne, Grad. */
  longitude: number;
  date: Date;
}

// Zielwinkel + grobe Startnäherung (Monat/Tag) für die Nullstellensuche.
const TARGETS: Array<{ key: string; deg: number; month: number; day: number }> = [
  { key: 'wheel.imbolc', deg: 315, month: 1, day: 4 },
  { key: 'wheel.springEquinox', deg: 0, month: 2, day: 20 },
  { key: 'wheel.beltane', deg: 45, month: 4, day: 5 },
  { key: 'wheel.summerSolstice', deg: 90, month: 5, day: 21 },
  { key: 'wheel.lughnasadh', deg: 135, month: 7, day: 7 },
  { key: 'wheel.autumnEquinox', deg: 180, month: 8, day: 22 },
  { key: 'wheel.samhain', deg: 225, month: 10, day: 7 },
  { key: 'wheel.winterSolstice', deg: 270, month: 11, day: 21 },
];

/** Kürzeste vorzeichenbehaftete Winkeldifferenz in Grad, [−180, 180). */
const signedDelta = (target: number, value: number): number => ((target - value + 540) % 360) - 180;

/** Zeitpunkt, zu dem die Sonne die Ziel-Ekliptiklänge erreicht (Newton). */
function solveLongitude(year: number, targetDeg: number, seedMonth: number, seedDay: number): Date {
  let date = new Date(Date.UTC(year, seedMonth, seedDay, 12, 0, 0));
  for (let i = 0; i < 8; i++) {
    const diff = signedDelta(targetDeg, sunEclipticLongitude(date));
    // mittlere Sonnenbewegung ≈ 0.98565°/Tag
    date = new Date(date.getTime() + (diff / 0.98565) * 86_400_000);
  }
  return date;
}

/** Die acht Jahreskreis-Ereignisse eines Jahres, chronologisch. */
export function wheelOfYear(year: number): WheelEvent[] {
  return TARGETS.map(({ key, deg, month, day }) => ({
    key,
    longitude: deg,
    date: solveLongitude(year, deg, month, day),
  })).sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Das nächste anstehende Ereignis ab `now` (auch ins Folgejahr). */
export function nextWheelEvent(now: Date): WheelEvent {
  const all = [...wheelOfYear(now.getUTCFullYear()), ...wheelOfYear(now.getUTCFullYear() + 1)];
  return all.find((e) => e.date.getTime() > now.getTime()) ?? all[0];
}
