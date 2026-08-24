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

/** Card wird bei jedem Tick neu gerendert — die Pin-Checkbox meldet sich daher
 * per Event-Delegation (`data-action="outdoor-pin"`) statt per eigenem Listener. */
export function renderOutdoorCard(location: GeoLocation, date: Date, t: Translator, pin?: OutdoorPin): string {
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

  return `
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

    ${pin ? `<label class="pin-toggle"><input type="checkbox" data-action="outdoor-pin" ${pin.pinned ? 'checked' : ''} /><span>${t('overlay.pin')}</span></label>` : ''}

    <p class="solar__note">${t('outdoor.note')}</p>
  `;
}
