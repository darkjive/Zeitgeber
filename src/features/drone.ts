/**
 * Fähigkeit `drone` — Flugfenster für Drohnen (Spec §31.4).
 *
 * EU-Betriebsregeln knüpfen an Tageslicht bzw. bürgerliche Dämmerung an. Zeigt
 * das Lichtfenster für heute und einen Countdown. **Es gilt §5.3: zeigt
 * Lichtverhältnisse, keine Rechtsauskunft** — der Hinweis ist verpflichtend.
 * Panel bei Bedarf (§7.4).
 */

import type { GeoLocation } from '../core/astro-engine';
import { sunPosition, sunTimes } from '../core/astro-engine';
import type { Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
const range = (a: Date | null, b: Date | null): string => (a && b ? `${fmt(a)} – ${fmt(b)}` : '—');

export function openDrone(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const times = sunTimes(date, location);
  const sun = sunPosition(date, location);

  // Lichtfenster: bürgerliche Dämmerung morgens bis abends (Sonne ≥ −6°).
  const from = times.civilDawn;
  const to = times.civilDusk;
  const withinLight = sun.elevation >= -6;
  let statusKey = 'drone.night';
  let countdown = '';
  if (withinLight && to) {
    statusKey = 'drone.open';
    const mins = Math.max(0, Math.round((to.getTime() - date.getTime()) / 60_000));
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    countdown = h === 0 ? `${m} ${t('unit.min')}` : `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
  }

  const card = document.createElement('div');
  card.className = 'onboard__card comfort';
  card.innerHTML = `
    <h2 class="onboard__title">${t('drone.title')}</h2>
    <div class="comfort__section">
      <span class="comfort__k">${t('drone.status')}</span>
      <p class="comfort__v">${t(statusKey)}${countdown ? ` · ${t('drone.remaining', { dur: countdown })}` : ''}</p>
    </div>
    <dl class="comfort__rows">
      <div><dt>${t('drone.lightWindow')}</dt><dd>${range(from, to)}</dd></div>
      <div><dt>${t('drone.daylight')}</dt><dd>${range(times.sunrise, times.sunset)}</dd></div>
    </dl>
    <p class="solar__note">${t('drone.legal')}</p>
    <div class="onboard__actions"><span></span><button class="btn btn--primary" data-close>${t('drone.close')}</button></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
