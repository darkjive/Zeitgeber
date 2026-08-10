/**
 * location — GPS, manuelle Eingabe, Persistenz (Spec §7, §10, §38.1).
 *
 * Fehlerfall "Kein GPS / verweigert" fällt auf manuelle Ortseingabe zurück,
 * die Kernuhr bleibt voll funktionsfähig (§10). Standort wird ausschliesslich
 * lokal gehalten (§38.1) — hier über localStorage; nativ MMKV (§6.4).
 */

import type { GeoLocation } from './astro-engine';

const STORAGE_KEY = 'sunclock.location';

/** Fallback (Karlsruhe) — nur bis der Nutzer Standort wählt. */
export const DEFAULT_LOCATION: GeoLocation = {
  latitude: 49.0069,
  longitude: 8.4037,
  label: 'Karlsruhe',
};

export function loadLocation(): GeoLocation | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as GeoLocation) : null;
  } catch {
    return null;
  }
}

export function saveLocation(loc: GeoLocation): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
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
 * Minimaler Reverse-Geocoding-Ersatz ohne Netz: nächste bekannte Stadt als
 * Label. Rein kosmetisch; die Berechnung nutzt die Koordinaten direkt.
 */
const CITIES: Array<GeoLocation & { label: string }> = [
  { label: 'Berlin', latitude: 52.52, longitude: 13.405 },
  { label: 'Hamburg', latitude: 53.55, longitude: 9.993 },
  { label: 'München', latitude: 48.137, longitude: 11.575 },
  { label: 'Köln', latitude: 50.938, longitude: 6.96 },
  { label: 'Karlsruhe', latitude: 49.0069, longitude: 8.4037 },
  { label: 'Wien', latitude: 48.208, longitude: 16.373 },
  { label: 'Zürich', latitude: 47.377, longitude: 8.54 },
  { label: 'London', latitude: 51.507, longitude: -0.128 },
  { label: 'Paris', latitude: 48.857, longitude: 2.352 },
  { label: 'New York', latitude: 40.713, longitude: -74.006 },
  { label: 'Reykjavík', latitude: 64.147, longitude: -21.94 },
  { label: 'Tromsø', latitude: 69.649, longitude: 18.956 },
];

export function nearestCityLabel(loc: GeoLocation): string {
  let best = CITIES[0];
  let bestD = Infinity;
  for (const c of CITIES) {
    const d = (c.latitude - loc.latitude) ** 2 + (c.longitude - loc.longitude) ** 2;
    if (d < bestD) {
      bestD = d;
      best = c;
    }
  }
  return best.label;
}

export function findCity(query: string): (GeoLocation & { label: string }) | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  return CITIES.find((c) => c.label.toLowerCase().startsWith(q)) ?? null;
}

export const KNOWN_CITIES = CITIES;
