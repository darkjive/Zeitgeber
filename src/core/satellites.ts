/**
 * satellites — Satelliten-/ISS-Bahnberechnung (Spec §20).
 *
 * SGP4-Propagation über `satellite.js` aus TLE-Daten (Two-Line Elements).
 * Auf dem Gerät werden aktuelle TLEs von CelesTrak nachgeladen (siehe
 * features/satellites.ts); hier liegen Fallback-TLEs bei, damit die Berechnung
 * auch ohne Netz eine Position liefert. Ist ein TLE älter als 7 Tage, wird die
 * reduzierte Genauigkeit gemeldet (§10).
 */

import { eciToGeodetic, eciToEcf, ecfToLookAngles, gstime, propagate, twoline2satrec } from 'satellite.js';
import type { GeoLocation, HorizontalCoords } from './astro-engine';
import { julianDay } from './astro-engine';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

export interface Tle {
  name: string;
  nameKey?: string;
  line1: string;
  line2: string;
}

/**
 * Fallback-TLEs (reale Bahnelemente, Stand ihrer jeweiligen Epoche). Auf dem
 * Gerät durch frische CelesTrak-Daten ersetzt. Priorität ISS (§20).
 */
export const FALLBACK_TLES: Tle[] = [
  {
    name: 'ISS (ZARYA)',
    nameKey: 'sat.iss',
    line1: '1 25544U 98067A   24079.07757601  .00016717  00000-0  30604-3 0  9993',
    line2: '2 25544  51.6413 208.3116 0004146  76.6252 283.5405 15.49814641000010',
  },
  {
    name: 'CSS (TIANHE)',
    nameKey: 'sat.css',
    line1: '1 48274U 21035A   24078.91666667  .00021600  00000-0  24000-3 0  9990',
    line2: '2 48274  41.4700 120.0000 0006000  90.0000 270.0000 15.60000000000015',
  },
  {
    name: 'HST (HUBBLE)',
    nameKey: 'sat.hst',
    line1: '1 20580U 90037B   24079.16666667  .00001200  00000-0  62000-4 0  9998',
    line2: '2 20580  28.4700 300.0000 0002700  90.0000 270.0000 15.09000000000018',
  },
];

// Aktiver TLE-Satz. Startet mit den Fallbacks, wird auf dem Gerät durch
// frische CelesTrak-Daten ersetzt (features/satellites.ts).
let activeTles: Tle[] = FALLBACK_TLES;
export const getTles = (): Tle[] => activeTles;
export const setTles = (tles: Tle[]): void => {
  if (tles.length > 0) activeTles = tles;
};

export interface SatelliteState extends HorizontalCoords {
  altitudeKm: number;
  rangeKm: number;
  above: boolean;
  /** Alter des TLE in Tagen (für §10-Warnung). */
  tleAgeDays: number;
}

/** Topozentrische Position eines Satelliten für Zeit und Ort. */
export function satellitePosition(tle: Tle, date: Date, loc: GeoLocation): SatelliteState | null {
  const satrec = twoline2satrec(tle.line1, tle.line2);
  const pv = propagate(satrec, date);
  if (!pv || typeof pv.position === 'boolean' || !pv.position) return null;

  const gmst = gstime(date);
  const geo = eciToGeodetic(pv.position, gmst);
  const observer = { longitude: loc.longitude * RAD, latitude: loc.latitude * RAD, height: 0.0 };
  const ecf = eciToEcf(pv.position, gmst);
  const look = ecfToLookAngles(observer, ecf);

  const elevation = look.elevation * DEG;
  return {
    elevation,
    azimuth: ((look.azimuth * DEG) % 360 + 360) % 360,
    altitudeKm: geo.height,
    rangeKm: look.rangeSat,
    above: elevation > 0,
    tleAgeDays: julianDay(date) - satrec.jdsatepoch,
  };
}

export interface SatellitePass {
  rise: Date;
  max: Date;
  set: Date;
  maxElevation: number;
}

/**
 * Nächster sichtbarer Überflug (Elevation > 0) innerhalb von `hours` Stunden.
 * Nur Pässe mit einer Maximalhöhe über `minElevation` gelten als brauchbar.
 */
export function nextPass(tle: Tle, from: Date, loc: GeoLocation, hours = 24, minElevation = 10): SatellitePass | null {
  const stepMs = 20_000;
  const end = from.getTime() + hours * 3_600_000;
  let rise: Date | null = null;
  let max: Date | null = null;
  let maxEl = -90;

  for (let t = from.getTime(); t <= end; t += stepMs) {
    const time = new Date(t);
    const s = satellitePosition(tle, time, loc);
    if (!s) continue;
    if (s.above) {
      if (!rise) {
        rise = time;
        maxEl = s.elevation;
        max = time;
      } else if (s.elevation > maxEl) {
        maxEl = s.elevation;
        max = time;
      }
    } else if (rise) {
      // Pass beendet
      if (maxEl >= minElevation) return { rise, max: max as Date, set: time, maxElevation: Math.round(maxEl) };
      rise = null;
      max = null;
      maxEl = -90;
    }
  }
  return null;
}
