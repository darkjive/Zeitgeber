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
import type { IconName } from '../icons';

export interface WeatherNow {
  cloudCover: number; // %
  precipitationProbability: number; // %
  visibilityKm: number;
  weatherCode: number; // WMO-Wettercode (Open-Meteo `weather_code`)
  temperatureC: number;
  isDay: boolean;
  fetchedAt: number; // epoch ms
}

export type ObservationRating = 'good' | 'fair' | 'poor';

const STORAGE_KEY = 'zeitgeber.weather';
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
    `&current=cloud_cover,precipitation_probability,visibility,weather_code,temperature_2m,is_day`;
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
      weatherCode: c.weather_code ?? 0,
      temperatureC: c.temperature_2m ?? 0,
      isDay: (c.is_day ?? 1) === 1,
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

export interface WeatherCondition {
  icon: IconName;
  labelKey: string;
}

/**
 * WMO-Wettercode (Open-Meteo `weather_code`) auf Icon + i18n-Label abgebildet.
 * Tag/Nacht wählt bei Klarsicht/Teilbewölkung zwischen Sonne/Mond-Varianten.
 */
export function weatherCondition(code: number, isDay: boolean): WeatherCondition {
  if (code === 0) return { icon: isDay ? 'sun' : 'moon', labelKey: 'weather.cond.clear' };
  if (code <= 2) return { icon: isDay ? 'cloud-sun' : 'cloud-moon', labelKey: 'weather.cond.partlyCloudy' };
  if (code === 3) return { icon: 'cloud', labelKey: 'weather.cond.overcast' };
  if (code === 45 || code === 48) return { icon: 'cloud-fog', labelKey: 'weather.cond.fog' };
  if (code >= 51 && code <= 57) return { icon: 'cloud-drizzle', labelKey: 'weather.cond.drizzle' };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return { icon: 'cloud-rain', labelKey: 'weather.cond.rain' };
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return { icon: 'cloud-snow', labelKey: 'weather.cond.snow' };
  }
  if (code >= 95) return { icon: 'cloud-lightning', labelKey: 'weather.cond.thunderstorm' };
  return { icon: 'cloud', labelKey: 'weather.cond.overcast' };
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
