/**
 * Fähigkeit `outdoor` — Outdoor & Survival (Spec §29).
 * Panel bei Bedarf (§7.4), vollständig offline. Reine Anzeige der
 * outdoor-relevanten Ableitungen aus Sonnen- und Mondstand.
 */

import type { GeoLocation } from '../core/astro-engine';
import { goldenBlueWindows, moonlightForecast, sunDirection, usableLight, type LightWindow } from '../core/outdoor';
import { azimuthDirKey, type Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';

const win = (w: LightWindow): string => (w.start && w.end ? `${fmt(w.start)} – ${fmt(w.end)}` : '—');

export interface OutdoorPin {
  pinned: boolean;
  onPin: (on: boolean) => void;
}

export function openOutdoor(location: GeoLocation, date: Date, t: Translator, pin?: OutdoorPin): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const light = usableLight(date, location);
  const windows = goldenBlueWindows(date, location);
  const moon = moonlightForecast(date, location);
  const dir = sunDirection(date, location);

  const lightText = (() => {
    if (light.state === 'polar-day') return t('outdoor.polarDay');
    if (light.state === 'polar-night') return t('outdoor.polarNight');
    if (light.state === 'night') return t('outdoor.dark');
    const h = Math.floor(light.minutes / 60);
    const m = light.minutes % 60;
    const dur = h === 0 ? `${m} ${t('unit.min')}` : `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
    return t('outdoor.remaining', { dur });
  })();

  const card = document.createElement('div');
  card.className = 'onboard__card outdoor';
  card.innerHTML = `
    <h2 class="onboard__title">${t('outdoor.title')}</h2>

    <div class="outdoor__hero">
      <span class="outdoor__hero-k">${t('outdoor.usableLight')}</span>
      <span class="outdoor__hero-v">${lightText}</span>
    </div>

    <dl class="outdoor__block">
      <div><dt>${t('outdoor.morningGolden')}</dt><dd>${win(windows.morningGolden)}</dd></div>
      <div><dt>${t('outdoor.eveningGolden')}</dt><dd>${win(windows.eveningGolden)}</dd></div>
      <div><dt>${t('outdoor.morningBlue')}</dt><dd>${win(windows.morningBlue)}</dd></div>
      <div><dt>${t('outdoor.eveningBlue')}</dt><dd>${win(windows.eveningBlue)}</dd></div>
    </dl>

    <dl class="outdoor__block">
      <div><dt>${t('outdoor.moonlight')}</dt><dd>${t(`outdoor.moon.${moon.level}`)} · ${Math.round(moon.illumination * 100)} %</dd></div>
      <div><dt>${t('outdoor.direction')}</dt><dd>${dir.above ? `${t('outdoor.sunIn')} ${t(azimuthDirKey(dir.azimuth))} (${Math.round(dir.azimuth)}°)` : t('outdoor.sunDown')}</dd></div>
    </dl>

    ${pin ? `<label class="pin-toggle"><input type="checkbox" id="od-pin" ${pin.pinned ? 'checked' : ''} /><span>${t('overlay.pin')}</span></label>` : ''}

    <p class="solar__note">${t('outdoor.note')}</p>
    <div class="onboard__actions">
      <span></span>
      <button class="btn btn--primary" id="od-close">${t('outdoor.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  if (pin) {
    (card.querySelector('#od-pin') as HTMLInputElement).addEventListener('change', (e) => {
      pin.onPin((e.target as HTMLInputElement).checked);
    });
  }

  (card.querySelector('#od-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
