/**
 * planets — geozentrische Planetenpositionen (Spec §18), reine Funktionen.
 *
 * Keplersche Bahnelemente nach Paul Schlyter, geozentrische Umrechnung über
 * die Sonnenposition. Genauigkeit ~1–2' für die inneren, wenige Bogenminuten
 * für die äusseren Planeten (Störungen von Jupiter/Saturn nicht modelliert) —
 * ausreichend für Marker und Sichtbarkeitsfenster. Uranus/Neptun nur mit
 * Optik sichtbar, werden aber angezeigt und entsprechend markiert (§18).
 */

import type { GeoLocation, HorizontalCoords } from './astro-engine';
import { julianDay } from './astro-engine';

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const mod360 = (x: number): number => ((x % 360) + 360) % 360;
const clamp = (x: number, lo = -1, hi = 1): number => Math.min(hi, Math.max(lo, x));

export type PlanetId = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune';

interface Elements {
  N: [number, number];
  i: [number, number];
  w: [number, number];
  a: [number, number];
  e: [number, number];
  M: [number, number];
  /** Basishelligkeit für die Magnitudenformel. */
  H: number;
  /** Phasenkoeffizient (× Phasenwinkel). */
  phaseK: number;
  needsOptics: boolean;
}

// Elemente als [Konstante, Rate pro Tag d] (d = JD − 2451543.5).
const EL: Record<PlanetId, Elements> = {
  mercury: { N: [48.3313, 3.24587e-5], i: [7.0047, 5.0e-8], w: [29.1241, 1.01444e-5], a: [0.387098, 0], e: [0.205635, 5.59e-10], M: [168.6562, 4.0923344368], H: -0.36, phaseK: 0.027, needsOptics: false },
  venus: { N: [76.6799, 2.4659e-5], i: [3.3946, 2.75e-8], w: [54.891, 1.38374e-5], a: [0.72333, 0], e: [0.006773, -1.302e-9], M: [48.0052, 1.6021302244], H: -4.34, phaseK: 0.013, needsOptics: false },
  mars: { N: [49.5574, 2.11081e-5], i: [1.8497, -1.78e-8], w: [286.5016, 2.92961e-5], a: [1.523688, 0], e: [0.093405, 2.516e-9], M: [18.6021, 0.5240207766], H: -1.51, phaseK: 0.016, needsOptics: false },
  jupiter: { N: [100.4542, 2.76854e-5], i: [1.303, -1.557e-7], w: [273.8777, 1.64505e-5], a: [5.20256, 0], e: [0.048498, 4.469e-9], M: [19.895, 0.0830853001], H: -9.25, phaseK: 0.014, needsOptics: false },
  saturn: { N: [113.6634, 2.3898e-5], i: [2.4886, -1.081e-7], w: [339.3939, 2.97661e-5], a: [9.55475, 0], e: [0.055546, -9.499e-9], M: [316.967, 0.0334442282], H: -9.0, phaseK: 0.044, needsOptics: false },
  uranus: { N: [74.0005, 1.3978e-5], i: [0.7733, 1.9e-8], w: [96.6612, 3.0565e-5], a: [19.18171, -1.55e-8], e: [0.047318, 7.45e-9], M: [142.5905, 0.011725806], H: -7.15, phaseK: 0.001, needsOptics: true },
  neptune: { N: [131.7806, 3.0173e-5], i: [1.77, -2.55e-7], w: [272.8461, -6.027e-6], a: [30.05826, 3.313e-8], e: [0.008606, 2.15e-9], M: [260.2471, 0.005995147], H: -6.9, phaseK: 0, needsOptics: true },
};

const at = (p: [number, number], d: number): number => p[0] + p[1] * d;

function eccentricAnomaly(Mdeg: number, e: number): number {
  const M = mod360(Mdeg) * RAD;
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));
  for (let k = 0; k < 5; k++) {
    E = E - (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  }
  return E;
}

function gmst(date: Date): number {
  const d = julianDay(date) - 2_451_545.0;
  return mod360(280.46061837 + 360.98564736629 * d);
}

/** Heliozentrische Sonnen-Rechteckskoordinaten (ekliptikal) für die Umrechnung. */
function sunRect(d: number): { xs: number; ys: number; lonsun: number } {
  const w = 282.9404 + 4.70935e-5 * d;
  const e = 0.016709 - 1.151e-9 * d;
  const M = 356.047 + 0.9856002585 * d;
  const E = eccentricAnomaly(M, e);
  const xv = Math.cos(E) - e;
  const yv = Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv) * DEG;
  const r = Math.hypot(xv, yv);
  const lonsun = mod360(v + w);
  return { xs: r * Math.cos(lonsun * RAD), ys: r * Math.sin(lonsun * RAD), lonsun };
}

export interface PlanetInfo extends HorizontalCoords {
  magnitude: number;
  /** Elongation (Winkelabstand zur Sonne), Grad — bestimmt Beobachtbarkeit. */
  elongation: number;
  needsOptics: boolean;
}

export function planetPosition(id: PlanetId, date: Date, loc: GeoLocation): PlanetInfo {
  const d = julianDay(date) - 2_451_543.5;
  const el = EL[id];

  const N = at(el.N, d);
  const i = at(el.i, d);
  const w = at(el.w, d);
  const a = at(el.a, d);
  const e = at(el.e, d);
  const M = at(el.M, d);

  const E = eccentricAnomaly(M, e);
  const xv = a * (Math.cos(E) - e);
  const yv = a * Math.sqrt(1 - e * e) * Math.sin(E);
  const v = Math.atan2(yv, xv);
  const r = Math.hypot(xv, yv);

  // Heliozentrisch ekliptikal.
  const Nr = N * RAD;
  const ir = i * RAD;
  const vw = v + w * RAD;
  const xh = r * (Math.cos(Nr) * Math.cos(vw) - Math.sin(Nr) * Math.sin(vw) * Math.cos(ir));
  const yh = r * (Math.sin(Nr) * Math.cos(vw) + Math.cos(Nr) * Math.sin(vw) * Math.cos(ir));
  const zh = r * Math.sin(vw) * Math.sin(ir);

  // Geozentrisch ekliptikal (+ Sonnenvektor).
  const sun = sunRect(d);
  const xg = xh + sun.xs;
  const yg = yh + sun.ys;
  const zg = zh;

  // Ekliptik → Äquator.
  const ecl = (23.4393 - 3.563e-7 * d) * RAD;
  const xe = xg;
  const ye = yg * Math.cos(ecl) - zg * Math.sin(ecl);
  const ze = yg * Math.sin(ecl) + zg * Math.cos(ecl);
  const ra = mod360(Math.atan2(ye, xe) * DEG);
  const dec = Math.atan2(ze, Math.hypot(xe, ye)) * DEG;

  // Äquator → Horizont.
  const lst = mod360(gmst(date) + loc.longitude);
  const ha = mod360(lst - ra) * RAD;
  const latR = loc.latitude * RAD;
  const decR = dec * RAD;
  const elev = Math.asin(clamp(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(ha))) * DEG;
  const az = mod360(Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decR) * Math.cos(latR)) * DEG + 180);

  // Distanz Erde–Planet und Phasenwinkel für die Helligkeit.
  const R = Math.sqrt(xg * xg + yg * yg + zg * zg);
  const cosFV = clamp((r * r + R * R - 1) / (2 * r * R));
  const FV = Math.acos(cosFV) * DEG; // Phasenwinkel
  const magnitude = el.H + 5 * Math.log10(r * R) + el.phaseK * FV;

  // Elongation: Winkel Sonne–Erde–Planet.
  const sunDist = Math.hypot(sun.xs, sun.ys);
  const cosElong = clamp((R * R + sunDist * sunDist - r * r) / (2 * R * sunDist));
  const elongation = Math.acos(cosElong) * DEG;

  return {
    elevation: elev,
    azimuth: az,
    magnitude: Math.round(magnitude * 10) / 10,
    elongation: Math.round(elongation),
    needsOptics: el.needsOptics,
  };
}

export const PLANET_IDS: PlanetId[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
