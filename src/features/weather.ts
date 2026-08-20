/**
 * Fähigkeit `weather` — Beobachtungseignung (Spec §28).
 *
 * Open-Meteo: kostenlos, kein Schlüssel, datenschutzfreundlich. Kernwerte
 * Bewölkung, Niederschlagswahrscheinlichkeit, Sichtweite. Offline zeigt das
 * Modul den letzten bekannten Stand mit Zeitstempel — nie eine leere Ansicht
 * (§28, §10). Ruhige, icon-basierte Darstellung ohne Unwetter-Dramatik.
 */

import type { GeoLocation } from '../core/astro-engine';
import type { HourTemp } from '../core/comfort';
import { pressureTrend, type PressureChange, type PressurePoint } from '../core/pressure';

export interface WeatherNow {
  cloudCover: number; // %
  precipitationProbability: number; // %
  visibilityKm: number;
  fetchedAt: number; // epoch ms
}

export type ObservationRating = 'good' | 'fair' | 'poor';

const STORAGE_KEY = 'sunclock.weather';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

function cache(loc: GeoLocation, w: WeatherNow): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ loc, w }));
  } catch {
    /* optional */
  }
}

function readCache(loc: GeoLocation): WeatherNow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { loc: cl, w } = JSON.parse(raw) as { loc: GeoLocation; w: WeatherNow };
    // Nur verwenden, wenn grob am selben Ort.
    if (Math.abs(cl.latitude - loc.latitude) < 0.5 && Math.abs(cl.longitude - loc.longitude) < 0.5) return w;
    return null;
  } catch {
    return null;
  }
}

/**
 * Aktuelles Wetter holen. Bei Netzfehler/Rate-Limit Rückfall auf den Cache
 * (mit Zeitstempel), damit die Ansicht nie leer bleibt (§10, §28).
 */
export async function fetchWeather(loc: GeoLocation): Promise<WeatherNow | null> {
  const url =
    `${OPEN_METEO}?latitude=${loc.latitude.toFixed(4)}&longitude=${loc.longitude.toFixed(4)}` +
    `&current=cloud_cover,precipitation_probability,visibility`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as { current?: Record<string, number> };
    const c = data.current;
    if (!c) throw new Error('no current');
    const w: WeatherNow = {
      cloudCover: c.cloud_cover ?? 0,
      precipitationProbability: c.precipitation_probability ?? 0,
      visibilityKm: (c.visibility ?? 0) / 1000,
      fetchedAt: Date.now(),
    };
    cache(loc, w);
    return w;
  } catch {
    return readCache(loc); // letzter Stand, evtl. null
  }
}

export interface TemperatureForecast {
  hours: HourTemp[];
  maxToday: number | null;
}

/**
 * Stündliche Temperaturen des Tages für das Hitze-Modul (comfort.ts). Wie oben
 * datenschutzfreundlich über Open-Meteo; bei Netzfehler null (Modul fällt auf
 * reine Geometrie zurück).
 */
export async function fetchTemperatures(loc: GeoLocation): Promise<TemperatureForecast | null> {
  const url =
    `${OPEN_METEO}?latitude=${loc.latitude.toFixed(4)}&longitude=${loc.longitude.toFixed(4)}` +
    `&hourly=temperature_2m&daily=temperature_2m_max&forecast_days=1&timezone=auto`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as {
      hourly?: { time: string[]; temperature_2m: number[] };
      daily?: { temperature_2m_max: number[] };
    };
    if (!data.hourly) throw new Error('no hourly');
    const hours: HourTemp[] = data.hourly.time.map((iso, i) => ({
      time: new Date(iso),
      temp: data.hourly!.temperature_2m[i],
    }));
    return { hours, maxToday: data.daily?.temperature_2m_max?.[0] ?? null };
  } catch {
    return null;
  }
}

/**
 * Luftdruck-Verlauf des Tages, verdichtet auf den Trend der letzten ~3 h
 * (§26, §28). Wie die anderen Abrufe über Open-Meteo, ohne Schlüssel und ohne
 * Nutzerkennung. Ohne Netz null — die Anzeige blendet die Zeile dann aus,
 * statt einen Fehlertext zu zeigen (§10).
 */
export async function fetchPressureTrend(loc: GeoLocation, now = new Date()): Promise<PressureChange | null> {
  const url =
    `${OPEN_METEO}?latitude=${loc.latitude.toFixed(4)}&longitude=${loc.longitude.toFixed(4)}` +
    `&hourly=surface_pressure&forecast_days=1&timezone=auto`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = (await res.json()) as { hourly?: { time: string[]; surface_pressure: (number | null)[] } };
    if (!data.hourly) throw new Error('no hourly');
    // timezone=auto liefert lokale Zeitstempel ohne Offset — new Date() legt sie
    // auf die Gerätezeit, wie schon bei fetchTemperatures.
    const points: PressurePoint[] = [];
    data.hourly.time.forEach((iso, i) => {
      const hpa = data.hourly?.surface_pressure[i];
      if (typeof hpa === 'number') points.push({ time: new Date(iso), hpa });
    });
    return pressureTrend(points, now);
  } catch {
    return null;
  }
}

/**
 * Beobachtungseignung als abgeleiteter Indikator aus Bewölkung, Niederschlag
 * und (falls über dem Horizont) Mondhelligkeit (§28).
 */
export function observationRating(w: WeatherNow, moonIllumination = 0, moonUp = false): ObservationRating {
  const moonPenalty = moonUp ? moonIllumination * 30 : 0;
  const score = w.cloudCover + w.precipitationProbability * 0.5 + moonPenalty;
  if (score < 40) return 'good';
  if (score < 90) return 'fair';
  return 'poor';
}
