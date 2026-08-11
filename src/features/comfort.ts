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
import { fetchTemperatures } from './weather';
import type { Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
const range = (a: Date | null, b: Date | null): string => (a && b ? `${fmt(a)} – ${fmt(b)}` : '—');

export function openComfort(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const south = shutterWindow(date, location, 180);
  const west = shutterWindow(date, location, 270);
  const vent = ventilationByGeometry(date, location);

  const card = document.createElement('div');
  card.className = 'onboard__card comfort';
  card.innerHTML = `
    <h2 class="onboard__title">${t('comfort.title')}</h2>

    <div class="comfort__section">
      <span class="comfort__k">${t('comfort.ventilate')}</span>
      <p class="comfort__v" id="cf-vent">${t('comfort.ventGeometry', { evening: fmt(vent.eveningFrom), morning: fmt(vent.morningUntil) })}</p>
      <p class="comfort__temp" id="cf-temp" hidden></p>
    </div>

    <div class="comfort__section">
      <span class="comfort__k">${t('comfort.shutters')}</span>
      <dl class="comfort__rows">
        <div><dt>${t('comfort.facadeSouth')}</dt><dd>${range(south.start, south.end)}</dd></div>
        <div><dt>${t('comfort.facadeWest')}</dt><dd>${range(west.start, west.end)}</dd></div>
      </dl>
    </div>

    <p class="solar__note">${t('comfort.note')}</p>
    <div class="onboard__actions"><span></span><button class="btn btn--primary" data-close>${t('comfort.close')}</button></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Verfeinerung mit Temperaturdaten, sobald verfügbar (online).
  void fetchTemperatures(location).then((forecast) => {
    if (!forecast || !overlay.isConnected) return;
    const tv = ventilationByTemperature(forecast.hours);
    if (!tv) return;
    const ventEl = card.querySelector('#cf-vent') as HTMLElement;
    ventEl.textContent = t('comfort.ventTemp', { window: range(tv.coolStart, tv.coolEnd), min: String(tv.minTemp) });
    const tempEl = card.querySelector('#cf-temp') as HTMLElement;
    tempEl.hidden = false;
    tempEl.textContent = t('comfort.today', { max: String(forecast.maxToday ?? tv.maxTemp), peak: fmt(tv.peakHeat) });
  });
}
