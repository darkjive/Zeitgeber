/**
 * reminders — der „dynamische Wecker": zeitpunktgenaue, empfehlende Hinweise
 * aus den Modul-Ableitungen (Spec-nah zu §5, §29, §31.4).
 *
 * Reine Funktionen: sie erzeugen aus Sonnenstand/Geometrie eine Liste anstehen-
 * der Ereignisse mit Vorlauf und einem menschlich formulierten Textschlüssel.
 * Ob und wie zugestellt wird, entscheidet der Notifier (features/reminders.ts).
 *
 * Keine Befehle, nur Empfehlungen (§5): die Texte sind bewusst freundlich.
 */

import type { GeoLocation } from './astro-engine.js';
import { shutterWindow, ventilationByGeometry } from './comfort.js';
import { goldenBlueWindows, usableLight } from './outdoor.js';

export interface ReminderEvent {
  /** Stabil je Tag & Art — der Notifier entdoppelt darüber. */
  id: string;
  /** Zeitpunkt des eigentlichen Ereignisses. */
  at: Date;
  /** Vorlauf in Minuten: benachrichtigt wird bei `at − leadMin`. */
  leadMin: number;
  /** i18n-Schlüssel des empfehlenden Textes. */
  msgKey: string;
}

export type ReminderCategory = 'comfort' | 'outdoor';

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Warme Jahreszeit grob nach Hemisphäre — Hitze-Hinweise nur dann. */
export function isWarmSeason(date: Date, latitude: number): boolean {
  const m = date.getMonth(); // 0 = Jan
  return latitude >= 0 ? m >= 4 && m <= 8 : m <= 2 || m >= 10;
}

/** Hitzeschutz-Hinweise: Fassaden verschatten, abends lüften (§comfort). */
export function comfortReminders(now: Date, loc: GeoLocation): ReminderEvent[] {
  if (!isWarmSeason(now, loc.latitude)) return [];
  const dk = dayKey(now);
  const events: ReminderEvent[] = [];
  const south = shutterWindow(now, loc, 180);
  if (south.start) events.push({ id: `comfort-south-${dk}`, at: south.start, leadMin: 20, msgKey: 'remind.comfort.south' });
  const west = shutterWindow(now, loc, 270);
  if (west.start) events.push({ id: `comfort-west-${dk}`, at: west.start, leadMin: 20, msgKey: 'remind.comfort.west' });
  const vent = ventilationByGeometry(now, loc);
  if (vent.eveningFrom) events.push({ id: `comfort-vent-${dk}`, at: vent.eveningFrom, leadMin: 0, msgKey: 'remind.comfort.ventilate' });
  return events;
}

/** Outdoor-Hinweise: goldene Stunde, schwindendes Restlicht (§outdoor). */
export function outdoorReminders(now: Date, loc: GeoLocation): ReminderEvent[] {
  const dk = dayKey(now);
  const events: ReminderEvent[] = [];
  const w = goldenBlueWindows(now, loc);
  if (w.eveningGolden.start) events.push({ id: `outdoor-golden-${dk}`, at: w.eveningGolden.start, leadMin: 15, msgKey: 'remind.outdoor.golden' });
  const light = usableLight(now, loc);
  if (light.until) events.push({ id: `outdoor-lastlight-${dk}`, at: light.until, leadMin: 30, msgKey: 'remind.outdoor.lastlight' });
  return events;
}

const SOURCES: Record<ReminderCategory, (now: Date, loc: GeoLocation) => ReminderEvent[]> = {
  comfort: comfortReminders,
  outdoor: outdoorReminders,
};

/** Alle anstehenden Ereignisse der aktiven Kategorien für den Tag von `now`. */
export function collectReminders(now: Date, loc: GeoLocation, cats: ReminderCategory[]): ReminderEvent[] {
  return cats.flatMap((c) => SOURCES[c](now, loc));
}
