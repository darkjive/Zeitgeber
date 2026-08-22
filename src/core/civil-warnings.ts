/**
 * civil-warnings — Kreis-Zuordnung, ARS-Formatierung und Datentypen für
 * amtliche Zivilschutz-Warnungen (Spec §10, §38.1). Reine Funktionen, kein
 * Netzwerk hier — der Abruf liegt in features/civil-warnings.ts.
 */

import type { GeoLocation } from './astro-engine.js';
import { distanceKm } from './location.js';
import { KREISE_PACKED } from '../data/kreise.js';

export interface Kreis {
  ags: string;
  name: string;
  latitude: number;
  longitude: number;
}

let kreise: Kreis[] | null = null;

/** Die gepackte Liste wird erst beim ersten Bedarf zerlegt (402 Zeilen). */
function allKreise(): Kreis[] {
  if (kreise) return kreise;
  kreise = KREISE_PACKED.split('\n').map((line) => {
    const [ags, name, lat, lon] = line.split('|');
    return { ags, name, latitude: +lat, longitude: +lon };
  });
  return kreise;
}

export interface NearestKreis extends Kreis {
  distanceKm: number;
}

/**
 * Kreise decken ganz Deutschland lückenlos ab — jenseits dieser Distanz ist
 * der „nächste" Kreis keine ehrliche Zuordnung mehr (z. B. jenseits der
 * Grenze). Grosszügiger als LABEL_MAX_KM in location.ts, weil
 * Kreis-Schwerpunkte (statt einzelner Städte) deutlich weiter auseinander
 * liegen können.
 */
const KREIS_MAX_KM = 80;

// Gleiches Cache-Muster wie nearestCity() in location.ts — der Standort
// ändert sich fast nie, ein Ergebnis zurückzuhalten spart den vollen
// Durchlauf über alle 402 Kreise.
let lastKreisQuery: { lat: number; lon: number; hit: NearestKreis | null } | null = null;

/** Nächstgelegener bekannter Kreis, oder null wenn keiner näher als `KREIS_MAX_KM` liegt. */
export function nearestKreis(loc: GeoLocation): NearestKreis | null {
  if (lastKreisQuery && lastKreisQuery.lat === loc.latitude && lastKreisQuery.lon === loc.longitude) {
    return lastKreisQuery.hit;
  }
  let best: NearestKreis | null = null;
  for (const k of allKreise()) {
    if (Math.abs(k.latitude - loc.latitude) > 1) continue;
    const d = distanceKm(loc, k);
    if (d <= KREIS_MAX_KM && (!best || d < best.distanceKm)) best = { ...k, distanceKm: d };
  }
  lastKreisQuery = { lat: loc.latitude, lon: loc.longitude, hit: best };
  return best;
}

/** Kreis-AGS (5-stellig) → ARS (12-stellig), wie von der BBK-Warn-API gefordert. */
export function arsFromAgs(ags: string): string {
  return ags.padEnd(12, '0');
}

export type Severity = 'Minor' | 'Moderate' | 'Severe' | 'Extreme';

export interface CivilWarning {
  id: string;
  version: number;
  startDate: string;
  severity: Severity;
  urgency: string;
  type: 'Alert' | 'Update' | 'Cancel';
  i18nTitle: Record<string, string>;
}

const SEVERITY_COLOR: Record<Severity, string> = {
  Minor: '#D8A24A',
  Moderate: '#E0793C',
  Severe: '#C94F3D',
  Extreme: '#8B2F3A',
};

/** Farbe je Schweregrad — dieselbe Staffelung wie beim Wetter-Badge (fair/poor). */
export function severityColor(severity: Severity): string {
  return SEVERITY_COLOR[severity];
}

/**
 * Bereinigt eine BBK-API-Antwort auf verlässlich nutzbare Warnungen. Die
 * Antwort ist nur typisiert (`as CivilWarning[]`), keine Laufzeit-Garantie —
 * ein kaputter Datensatz darf weder das Panel noch den Cron-Durchlauf für
 * alle anderen Abos mitreissen (§10).
 */
export function normalizeWarnings(raw: unknown): CivilWarning[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((w): w is CivilWarning => {
    if (typeof w !== 'object' || w === null) return false;
    const rec = w as Record<string, unknown>;
    if (typeof rec.id !== 'string') return false;
    if (typeof rec.i18nTitle !== 'object' || rec.i18nTitle === null) return false;
    return rec.type !== 'Cancel';
  });
}
