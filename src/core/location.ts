/**
 * location — GPS, manuelle Eingabe, Persistenz (Spec §7, §10, §38.1).
 *
 * Leitsatz: **Die Koordinaten sind die Wahrheit, das Label ist Dekoration.**
 * Jede Berechnung (Sonnenstand, Auf-/Untergang, Dämmerung) läuft über
 * `latitude`/`longitude`; der Ortsname wird ausschliesslich zur Anzeige aus
 * ihnen abgeleitet und nie gespeichert — ein einmal falsch geratener Name
 * kann sich so nicht festsetzen.
 *
 * Ebenso wichtig: `source` hält fest, woher der Standort stammt. Ein bloss
 * angenommener Vorgabeort darf in der Oberfläche nie wie ein gemessener
 * aussehen, sonst kann der Nutzer richtige nicht von falschen Werten
 * unterscheiden.
 *
 * Fehlerfall "Kein GPS / verweigert" fällt auf manuelle Ortseingabe zurück,
 * die Kernuhr bleibt voll funktionsfähig (§10). Standort wird ausschliesslich
 * lokal gehalten (§38.1) — hier über localStorage; nativ MMKV (§6.4). Auch die
 * Ortsnamen kommen aus einer mitgelieferten Liste, nicht aus dem Netz.
 */

import type { GeoLocation } from './astro-engine.js';
import { CITIES_PACKED } from '../data/cities.js';

const STORAGE_KEY = 'zeitgeber.location';

/** Woher der aktuelle Standort stammt — entscheidend für die Darstellung. */
export type LocationSource = 'gps' | 'manual' | 'default';

export interface StoredLocation extends GeoLocation {
  source: LocationSource;
}

/**
 * Vorgabe, bis der Nutzer einen Standort wählt. `source: 'default'` markiert
 * sie als geraten — die Oberfläche weist darauf hin, statt den Ort als
 * gesicherte Angabe zu zeigen.
 */
export const DEFAULT_LOCATION: StoredLocation = {
  latitude: 49.0069,
  longitude: 8.4037,
  source: 'default',
};

/**
 * Ab dieser Entfernung ist der nächste Stadtname keine ehrliche Beschreibung
 * des Standorts mehr — dann zeigt die App lieber Koordinaten.
 */
const LABEL_MAX_KM = 25;

export function loadLocation(): StoredLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredLocation> & { label?: string };
    const { latitude, longitude } = parsed;
    if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
    // Altbestand ohne `source` stammt aus GPS oder manueller Wahl — beides vom
    // Nutzer veranlasst. Ein mitgespeichertes Label wird bewusst verworfen:
    // frühere Versionen konnten dort einen falsch geratenen Ort ablegen.
    return { latitude, longitude, source: parsed.source ?? 'manual' };
  } catch {
    return null;
  }
}

export function saveLocation(loc: StoredLocation): void {
  try {
    const { latitude, longitude, source } = loc;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ latitude, longitude, source }));
  } catch {
    /* Persistenz optional — Kernuhr läuft auch ohne. */
  }
}

/** Browser-Geolocation als Promise; wirft bei Verweigerung/Fehlen. */
export function requestGeolocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('geolocation-unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
    );
  });
}

/**
 * Wurde die Standortfreigabe bereits erteilt? Nur dann darf beim Start still
 * abgefragt werden — sonst bekäme jeder neue Besucher ungefragt einen
 * Berechtigungsdialog vor die Uhr gesetzt.
 */
export async function geolocationGranted(): Promise<boolean> {
  try {
    if (!('permissions' in navigator)) return false;
    const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
    return status.state === 'granted';
  } catch {
    return false; // Safari < 16 u. a. kennen die Abfrage nicht.
  }
}

// --- Ortsnamen (offline) ----------------------------------------------------

export interface City extends GeoLocation {
  label: string;
  country: string;
}

let cities: City[] | null = null;

/** Die gepackte Liste wird erst beim ersten Bedarf zerlegt (~4000 Zeilen). */
function allCities(): City[] {
  if (cities) return cities;
  cities = CITIES_PACKED.split('\n').map((line) => {
    const [label, lat, lon, country] = line.split('|');
    return { label, latitude: +lat, longitude: +lon, country };
  });
  return cities;
}

const RAD = Math.PI / 180;
const EARTH_R_KM = 6371;

/**
 * Grosskreis-Entfernung (Haversine) in km. Nötig, weil ein Grad Länge je nach
 * Breite zwischen 111 km (Äquator) und fast null (Pol) misst — eine Rechnung
 * in Grad-Quadraten würde die nächste Stadt in hohen Breiten falsch bestimmen.
 */
export function distanceKm(a: GeoLocation, b: GeoLocation): number {
  const dLat = (b.latitude - a.latitude) * RAD;
  const dLon = (b.longitude - a.longitude) * RAD;
  const la1 = a.latitude * RAD;
  const la2 = b.latitude * RAD;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface NearestCity extends City {
  distanceKm: number;
}

// Das Zifferblatt zeichnet im Sekundentakt neu, der Standort ändert sich fast
// nie — ein Ergebnis zurückzuhalten spart den Durchlauf über alle Orte.
let lastQuery: { lat: number; lon: number; hit: NearestCity | null } | null = null;

/** Nächstgelegene bekannte Stadt, oder null wenn keine näher als `LABEL_MAX_KM` liegt. */
export function nearestCity(loc: GeoLocation): NearestCity | null {
  if (lastQuery && lastQuery.lat === loc.latitude && lastQuery.lon === loc.longitude) {
    return lastQuery.hit;
  }
  let best: NearestCity | null = null;
  for (const c of allCities()) {
    // Grobfilter vor der teuren Trigonometrie: was über 1° Breite entfernt
    // liegt, ist mindestens 111 km weg und kann nie gewinnen.
    if (Math.abs(c.latitude - loc.latitude) > 1) continue;
    const d = distanceKm(loc, c);
    if (d <= LABEL_MAX_KM && (!best || d < best.distanceKm)) best = { ...c, distanceKm: d };
  }
  lastQuery = { lat: loc.latitude, lon: loc.longitude, hit: best };
  return best;
}

const fmtCoord = (v: number, pos: string, neg: string): string =>
  `${Math.abs(v).toFixed(2)}° ${v >= 0 ? pos : neg}`;

/**
 * Anzeigename für einen Standort: der nächste Ort, wenn er wirklich nah ist,
 * sonst die Koordinaten. Lieber eine nüchterne Zahl als ein Ortsname, an dem
 * der Nutzer gar nicht ist.
 */
export function placeLabel(loc: GeoLocation): string {
  const city = nearestCity(loc);
  if (city) return city.label;
  return `${fmtCoord(loc.latitude, 'N', 'S')}, ${fmtCoord(loc.longitude, 'E', 'W')}`;
}

/**
 * Manuelle Ortssuche. Die Liste ist nach Einwohnerzahl sortiert, damit bei
 * mehrdeutigen Namen die grössere Stadt zuerst kommt.
 */
export function findCity(query: string): City | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  const list = allCities();
  return (
    list.find((c) => c.label.toLowerCase() === q) ??
    list.find((c) => c.label.toLowerCase().startsWith(q)) ??
    null
  );
}

/** Vorschläge für die Eingabehilfe der Ortssuche. */
export function suggestCities(query: string, limit = 8): City[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const out: City[] = [];
  for (const c of allCities()) {
    if (c.label.toLowerCase().startsWith(q)) out.push(c);
    if (out.length >= limit) break;
  }
  return out;
}
