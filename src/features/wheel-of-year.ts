/**
 * Fähigkeit `wheel-of-year` — Jahreskreis (Spec §32.2).
 * Panel bei Bedarf (§7.4). Exakte astronomische Zeitpunkte, reine Zeitangabe
 * ohne Deutung (§5.4). Standardmässig nicht sichtbar.
 */

import { nextWheelEvent, wheelOfYear } from '../core/wheel-of-year';
import type { Translator } from '../i18n';

const fmtDate = (d: Date): string =>
  new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

export function openWheelOfYear(date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const year = date.getUTCFullYear();
  const events = wheelOfYear(year);
  const next = nextWheelEvent(date);

  const card = document.createElement('div');
  card.className = 'onboard__card wheel';
  card.innerHTML = `
    <h2 class="onboard__title">${t('wheel.title')}</h2>
    <p class="chrono__intro">${t('wheel.subtitle', { year: String(year) })}</p>
    <ul class="wheel__list">
      ${events
        .map((e) => {
          const isNext = e.key === next.key && e.date.getUTCFullYear() === next.date.getUTCFullYear();
          return `<li class="wheel__row${isNext ? ' is-next' : ''}">
            <span class="wheel__name">${t(e.key)}</span>
            <span class="wheel__date">${fmtDate(e.date)}</span>
          </li>`;
        })
        .join('')}
    </ul>
    <p class="solar__note">${t('wheel.note')}</p>
    <div class="onboard__actions">
      <span></span>
      <button class="btn btn--primary" id="woy-close">${t('wheel.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('#woy-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
