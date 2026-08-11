/**
 * Live-Abruf Flugzeuge über OpenSky Network (Spec §20).
 * Nur bei aktiver Ansicht abrufen, Rate-Limits beachten. Offline/Netzfehler →
 * leere Liste (Provider zeigt dann nichts).
 */

import type { GeoLocation } from '../core/astro-engine';
import { setAircraft, type Aircraft } from '../core/aircraft';

const OPENSKY = 'https://opensky-network.org/api/states/all';

/** Flugzeuge im Umkreis (~±1,5°) des Standorts holen. */
export async function fetchAircraft(loc: GeoLocation): Promise<boolean> {
  const d = 1.5;
  const url = `${OPENSKY}?lamin=${(loc.latitude - d).toFixed(3)}&lomin=${(loc.longitude - d).toFixed(3)}&lamax=${(loc.latitude + d).toFixed(3)}&lomax=${(loc.longitude + d).toFixed(3)}`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as { states?: unknown[][] };
    const states = data.states ?? [];
    const list: Aircraft[] = [];
    for (const s of states) {
      const onGround = s[8] as boolean;
      const lon = s[5] as number | null;
      const lat = s[6] as number | null;
      const altM = (s[7] as number | null) ?? (s[13] as number | null);
      if (onGround || lon == null || lat == null || !altM || altM <= 0) continue;
      list.push({
        id: String(s[0]),
        callsign: String(s[1] ?? '').trim(),
        latitude: lat,
        longitude: lon,
        altitudeKm: altM / 1000,
      });
    }
    setAircraft(list);
    return true;
  } catch {
    setAircraft([]);
    return false;
  }
}
