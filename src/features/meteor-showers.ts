/**
 * Fähigkeit `meteor-showers` — Meteorschauer (Spec §21).
 * Panel bei Bedarf (§7.4). Zeigt aktive und kommende Ströme mit Peak, Rate und
 * Radiant-Höhe; Mondlicht als Störfaktor. Vollständig offline.
 */

import type { GeoLocation } from '../core/astro-engine';
import { showerOverview } from '../core/meteor-showers';
import { moonlightForecast } from '../core/outdoor';
import type { Translator } from '../i18n';

const fmtDate = (d: Date): string => new Intl.DateTimeFormat(undefined, { day: '2-digit', month: 'short' }).format(d);

export function openMeteorShowers(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const overview = showerOverview(date, location).slice(0, 5);
  const moon = moonlightForecast(date, location);

  const peakLabel = (days: number): string => {
    if (days === 0) return t('meteor.peakToday');
    if (days > 0) return t('meteor.peakIn', { days: String(days) });
    return t('meteor.peakPast', { days: String(-days) });
  };

  const rows = overview
    .map((s) => {
      const badge = s.active ? `<span class="meteor__badge">${t('meteor.active')}</span>` : '';
      const alt = s.radiantUp ? `${s.radiantAltitude}°` : t('meteor.radiantDown');
      return `<li class="meteor__row${s.active ? ' is-active' : ''}">
        <div class="meteor__head"><span class="meteor__name">${t(s.shower.key)}</span>${badge}</div>
        <div class="meteor__meta">${peakLabel(s.daysToPeak)} · ${fmtDate(nextPeakDate(s.shower.peak, date))} · ZHR ~${s.shower.zhr} · ${t('meteor.radiant')} ${alt}</div>
      </li>`;
    })
    .join('');

  const card = document.createElement('div');
  card.className = 'onboard__card meteor';
  card.innerHTML = `
    <h2 class="onboard__title">${t('meteor.title')}</h2>
    <ul class="meteor__list">${rows}</ul>
    <p class="comfort__temp">${t('meteor.moon', { level: t(`outdoor.moon.${moon.level}`), pct: String(Math.round(moon.illumination * 100)) })}</p>
    <p class="solar__note">${t('meteor.note')}</p>
    <div class="onboard__actions"><span></span><button class="btn btn--primary" data-close>${t('meteor.close')}</button></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

function nextPeakDate(peak: [number, number], date: Date): Date {
  const [m, d] = peak;
  const thisYear = new Date(date.getFullYear(), m, d);
  return thisYear.getTime() >= date.getTime() - 2 * 86_400_000 ? thisYear : new Date(date.getFullYear() + 1, m, d);
}
