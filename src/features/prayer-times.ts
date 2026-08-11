/**
 * Fähigkeit `prayer-times` — islamische Gebetszeiten (Spec §32.1).
 *
 * Optional, standardmässig nicht sichtbar (§7.4). Methode und Rechtsschule
 * auswählbar (§38.5) mit Quellenangabe. Reine Zeitangabe, keine Deutung
 * (§5.4). Der Hinweis auf den empfohlenen lokalen Abgleich (§38.5) ist Teil
 * des Panels.
 */

import type { GeoLocation } from '../core/astro-engine';
import { METHODS, prayerTimes, type AsrMadhab } from '../core/prayer-times';
import type { Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';

export function openPrayerTimes(location: GeoLocation, date: Date, t: Translator): void {
  let methodId = METHODS[0].id;
  let madhab: AsrMadhab = 'standard';

  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card prayer';
  card.innerHTML = `
    <h2 class="onboard__title">${t('prayer.title')}</h2>
    <div class="prayer__controls">
      <label class="prayer__field">
        <span>${t('prayer.method')}</span>
        <select id="pt-method">
          ${METHODS.map((m) => `<option value="${m.id}">${m.id} — ${m.source}</option>`).join('')}
        </select>
      </label>
      <label class="prayer__field">
        <span>${t('prayer.madhab')}</span>
        <select id="pt-madhab">
          <option value="standard">${t('prayer.standard')}</option>
          <option value="hanafi">${t('prayer.hanafi')}</option>
        </select>
      </label>
    </div>
    <ul class="prayer__list" id="pt-list"></ul>
    <p class="prayer__ramadan" id="pt-ramadan"></p>
    <p class="solar__note" id="pt-source"></p>
    <p class="solar__note">${t('prayer.disclaimer')}</p>
    <div class="onboard__actions">
      <span></span>
      <button class="btn btn--primary" id="pt-close">${t('prayer.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const $ = (sel: string) => card.querySelector(sel) as HTMLElement;
  const methodSel = $('#pt-method') as HTMLSelectElement;
  const madhabSel = $('#pt-madhab') as HTMLSelectElement;

  const ROWS: Array<{ key: keyof ReturnType<typeof prayerTimes>; label: string }> = [
    { key: 'fajr', label: t('prayer.fajr') },
    { key: 'sunrise', label: t('prayer.sunrise') },
    { key: 'dhuhr', label: t('prayer.dhuhr') },
    { key: 'asr', label: t('prayer.asr') },
    { key: 'maghrib', label: t('prayer.maghrib') },
    { key: 'isha', label: t('prayer.isha') },
  ];

  const update = (): void => {
    methodId = methodSel.value;
    madhab = madhabSel.value as AsrMadhab;
    const method = METHODS.find((m) => m.id === methodId) ?? METHODS[0];
    const pt = prayerTimes(date, location, method, madhab);

    $('#pt-list').innerHTML = ROWS.map(
      (r) => `<li class="prayer__row"><span>${r.label}</span><b>${fmt(pt[r.key] as Date | null)}</b></li>`,
    ).join('');
    $('#pt-ramadan').textContent = t('prayer.ramadan', { suhur: fmt(pt.fajr), iftar: fmt(pt.maghrib) });
    $('#pt-source').textContent = t('prayer.sourceLine', { source: method.source });
  };

  methodSel.addEventListener('change', update);
  madhabSel.addEventListener('change', update);
  $('#pt-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  update();
}
