/**
 * dial-overlay — Beitrag eines Moduls (Achse C) an das Zifferblatt (Achse B).
 *
 * So wie ein Provider (Achse A) automatisch Objekte an alle Ansichten liefert,
 * kann ein Modul „Overlays" ans Zifferblatt heften: Bögen (Zeitfenster) und
 * Marker (Zeitpunkte), stets in absoluter Zeit (Date). Die Projektion auf den
 * 24-Stunden-Ring — inklusive Zeitzone — macht ausschließlich die Ansicht, damit
 * die Zeitlogik an einer Stelle bleibt.
 *
 * Bewusst schlank gehalten (§11): ein Overlay auf einmal, Default aus.
 */

import type { GeoLocation } from './astro-engine';
import { goldenBlueWindows, usableLight } from './outdoor';

/** Ein Zeitfenster als Bogen auf dem Ring. */
export interface DialArc {
  from: Date | null;
  to: Date | null;
  color: string;
  /** i18n-Schlüssel für die Legende (gleiche Schlüssel werden zusammengefasst). */
  labelKey: string;
}

/** Ein einzelner Zeitpunkt als Marker auf dem Ring. */
export interface DialMarker {
  at: Date | null;
  color: string;
  labelKey: string;
  /** Gefüllt (Standard) oder als hohler Ring gezeichnet. */
  hollow?: boolean;
}

export interface DialOverlay {
  id: string;
  arcs: DialArc[];
  markers: DialMarker[];
}

// Semantische Farben, unabhängig von der Tag/Nacht-Palette, aber so gewählt,
// dass sie auf hellem wie dunklem Grund lesbar bleiben.
const GOLD = '#E0A93C';
const BLUE = '#5B78C0';
const LIGHT_END = '#D0603C';

/**
 * Outdoor-Overlay (§29): goldene & blaue Stunde als Bögen, Ende des Restlichts
 * (bürgerliche Dämmerung, Sonne −6°) als hohler Marker. Rein sonnenbasiert,
 * damit ohne Netz und Wetter verfügbar.
 */
export function outdoorOverlay(now: Date, loc: GeoLocation): DialOverlay {
  const w = goldenBlueWindows(now, loc);
  const light = usableLight(now, loc);
  return {
    id: 'outdoor',
    arcs: [
      { from: w.morningGolden.start, to: w.morningGolden.end, color: GOLD, labelKey: 'outdoor.goldenHour' },
      { from: w.eveningGolden.start, to: w.eveningGolden.end, color: GOLD, labelKey: 'outdoor.goldenHour' },
      { from: w.morningBlue.start, to: w.morningBlue.end, color: BLUE, labelKey: 'outdoor.blueHour' },
      { from: w.eveningBlue.start, to: w.eveningBlue.end, color: BLUE, labelKey: 'outdoor.blueHour' },
    ],
    markers: light.until ? [{ at: light.until, color: LIGHT_END, labelKey: 'outdoor.lightEnds', hollow: true }] : [],
  };
}

export type OverlayId = 'outdoor';

/** Baut das gewählte Overlay für den aktuellen Zeitpunkt. */
export function buildOverlay(id: OverlayId | null, now: Date, loc: GeoLocation): DialOverlay | null {
  if (id === 'outdoor') return outdoorOverlay(now, loc);
  return null;
}
