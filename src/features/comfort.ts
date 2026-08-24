/**
 * Fähigkeit `comfort` — Hitze & Lüften (Home-Assistenz).
 *
 * Wann Rolläden runter (Verschattung senkrechter Fassaden) und wann lüften
 * (kühle Zeiten). Reine Geometrie offline; mit Temperaturdaten (Open-Meteo)
 * verfeinert. Komfort-/Energieaussagen über Wärme, keine Gesundheitsaussagen
 * (§5). Panel bei Bedarf (§7.4).
 */

import type { GeoLocation } from '../core/astro-engine';
import { shutterWindow, ventilationByGeometry, ventilationByTemperature } from '../core/comfort';
import { fetchTemperatures, type TemperatureForecast } from './weather';
import type { Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
const range = (a: Date | null, b: Date | null): string => (a && b ? `${fmt(a)} – ${fmt(b)}` : '—');

// Temperaturdaten (Open-Meteo) werden separat vom allgemeinen Wetter-Cache
// gehalten und nur nachgeladen, solange die Comfort-Karte eingeschaltet ist.
let tempForecast: TemperatureForecast | null = null;

export async function refreshComfortTemps(location: GeoLocation): Promise<void> {
  tempForecast = await fetchTemperatures(location);
}

export function renderComfortCard(location: GeoLocation, date: Date, t: Translator): string {
  const south = shutterWindow(date, location, 180);
  const west = shutterWindow(date, location, 270);
  const vent = ventilationByGeometry(date, location);

  const tv = tempForecast ? ventilationByTemperature(tempForecast.hours) : null;
  const ventText = tv
    ? t('comfort.ventTemp', { window: range(tv.coolStart, tv.coolEnd), min: String(tv.minTemp) })
    : t('comfort.ventGeometry', { evening: fmt(vent.eveningFrom), morning: fmt(vent.morningUntil) });
  const tempLine =
    tempForecast && tv
      ? `<p class="comfort__temp">${t('comfort.today', { max: String(tempForecast.maxToday ?? tv.maxTemp), peak: fmt(tv.peakHeat) })}</p>`
      : '';

  return `
    <div class="comfort__section">
      <span class="comfort__k">${t('comfort.ventilate')}</span>
      <p class="comfort__v">${ventText}</p>
      ${tempLine}
    </div>

    <div class="comfort__section">
      <span class="comfort__k">${t('comfort.shutters')}</span>
      <dl class="comfort__rows">
        <div><dt>${t('comfort.facadeSouth')}</dt><dd>${range(south.start, south.end)}</dd></div>
        <div><dt>${t('comfort.facadeWest')}</dt><dd>${range(west.start, west.end)}</dd></div>
      </dl>
    </div>

    <p class="solar__note">${t('comfort.note')}</p>
  `;
}
