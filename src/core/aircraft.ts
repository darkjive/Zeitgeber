/**
 * aircraft — Flugzeuge über ADS-B (Spec §20).
 *
 * Rechnet aus Position und Höhe eines Flugzeugs die topozentrischen Winkel
 * (Azimut, Höhe) für den Beobachter. Die Livedaten kommen vom OpenSky Network
 * (features/aircraft.ts) — höchster Netzbedarf aller Provider, deshalb zuletzt
 * priorisiert und nur bei aktiver Ansicht (§20). Die Geometrie selbst ist rein
 * und offline testbar.
 */

import type { GeoLocation, HorizontalCoords } from './astro-engine';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const A = 6378.137; // WGS84 große Halbachse, km
const F = 1 / 298.257223563;
const E2 = F * (2 - F);

export interface Aircraft {
  id: string;
  callsign: string;
  latitude: number;
  longitude: number;
  altitudeKm: number;
}

function ecef(latDeg: number, lonDeg: number, hKm: number): [number, number, number] {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  const n = A / Math.sqrt(1 - E2 * Math.sin(lat) ** 2);
  return [
    (n + hKm) * Math.cos(lat) * Math.cos(lon),
    (n + hKm) * Math.cos(lat) * Math.sin(lon),
    (n * (1 - E2) + hKm) * Math.sin(lat),
  ];
}

export interface AircraftLook extends HorizontalCoords {
  distanceKm: number;
  above: boolean;
}

/** Topozentrische Blickrichtung vom Beobachter zum Flugzeug. */
export function aircraftLookAngle(observer: GeoLocation, ac: Pick<Aircraft, 'latitude' | 'longitude' | 'altitudeKm'>): AircraftLook {
  const [ox, oy, oz] = ecef(observer.latitude, observer.longitude, 0);
  const [ax, ay, az] = ecef(ac.latitude, ac.longitude, ac.altitudeKm);
  const dx = ax - ox;
  const dy = ay - oy;
  const dz = az - oz;

  const lat = observer.latitude * RAD;
  const lon = observer.longitude * RAD;
  const east = -Math.sin(lon) * dx + Math.cos(lon) * dy;
  const north = -Math.sin(lat) * Math.cos(lon) * dx - Math.sin(lat) * Math.sin(lon) * dy + Math.cos(lat) * dz;
  const up = Math.cos(lat) * Math.cos(lon) * dx + Math.cos(lat) * Math.sin(lon) * dy + Math.sin(lat) * dz;

  const distanceKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const elevation = Math.asin(up / distanceKm) * DEG;
  return {
    elevation,
    azimuth: (Math.atan2(east, north) * DEG + 360) % 360,
    distanceKm,
    above: elevation > 0,
  };
}

// Aktive Flugzeugliste (von der Live-Abfrage gefüllt, offline leer).
let activeAircraft: Aircraft[] = [];
export const getAircraft = (): Aircraft[] => activeAircraft;
export const setAircraft = (list: Aircraft[]): void => {
  activeAircraft = list;
};
