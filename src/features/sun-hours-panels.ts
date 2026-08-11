/**
 * Fähigkeiten `garden` (§31.2) und `architecture` (§31.3).
 * Panels bei Bedarf (§7.4). Reine Geometrie auf der vorhandenen Sonnen-
 * berechnung — Sonnenstunden, Fassadenbesonnung, Verschattung.
 */

import type { GeoLocation } from '../core/astro-engine';
import { directSunHours, seasonSunHours } from '../core/sun-hours';
import { azimuthDirKey, type Translator } from '../i18n';

function fmtH(min: number, t: Translator): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h === 0 ? `${m} ${t('unit.min')}` : `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
}

function shell(titleKey: string, t: Translator): { overlay: HTMLElement; body: HTMLElement } {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  const card = document.createElement('div');
  card.className = 'onboard__card sunhours';
  card.innerHTML = `<h2 class="onboard__title">${t(titleKey)}</h2><div class="sunhours__body"></div>
    <div class="onboard__actions"><span></span><button class="btn btn--primary" data-close>${t('sunhours.close')}</button></div>`;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
  return { overlay, body: card.querySelector('.sunhours__body') as HTMLElement };
}

/** §31.3 — Fassadenbesonnung: „Wohnung mit Nachmittagssonne?" wird prüfbar. */
export function openArchitecture(location: GeoLocation, date: Date, t: Translator): void {
  let facade = 180; // Süd
  const { body } = shell('arch.title', t);
  body.innerHTML = `
    <label class="solar__field">
      <span>${t('arch.facade')}: <b id="ar-val"></b></span>
      <input id="ar-facade" type="range" min="0" max="359" step="5" value="${facade}" />
    </label>
    <dl class="sunhours__stats">
      <div><dt>${t('arch.total')}</dt><dd id="ar-total">–</dd></div>
      <div><dt>${t('arch.morning')}</dt><dd id="ar-morning">–</dd></div>
      <div><dt>${t('arch.afternoon')}</dt><dd id="ar-afternoon">–</dd></div>
    </dl>
    <p class="sunhours__season" id="ar-season"></p>
    <p class="solar__note">${t('arch.note')}</p>
  `;
  const input = body.querySelector('#ar-facade') as HTMLInputElement;
  const update = () => {
    facade = Number(input.value);
    const opts = { facadeAzimuth: facade };
    const h = directSunHours(date, location, opts);
    (body.querySelector('#ar-val') as HTMLElement).textContent = `${facade}° (${t(azimuthDirKey(facade))})`;
    (body.querySelector('#ar-total') as HTMLElement).textContent = fmtH(h.totalMin, t);
    (body.querySelector('#ar-morning') as HTMLElement).textContent = fmtH(h.morningMin, t);
    (body.querySelector('#ar-afternoon') as HTMLElement).textContent = fmtH(h.afternoonMin, t);
    const s = seasonSunHours(date.getFullYear(), location, opts);
    (body.querySelector('#ar-season') as HTMLElement).textContent = t('sunhours.season', {
      summer: fmtH(s.summer, t),
      winter: fmtH(s.winter, t),
    });
  };
  input.addEventListener('input', update);
  update();
}

/** §31.2 — Garten: Sonnenstunden am Standort inkl. Verschattung. */
export function openGarden(location: GeoLocation, date: Date, t: Translator): void {
  const { body } = shell('garden.title', t);
  body.innerHTML = `
    <label class="solar__field">
      <span>${t('garden.direction')}: <b id="ga-dirval"></b></span>
      <input id="ga-dir" type="range" min="0" max="359" step="5" value="180" />
    </label>
    <div class="sunhours__pair">
      <label class="solar__field"><span>${t('garden.height')}</span><input id="ga-h" type="number" min="0" value="8" /></label>
      <label class="solar__field"><span>${t('garden.distance')}</span><input id="ga-d" type="number" min="1" value="10" /></label>
    </div>
    <dl class="sunhours__stats sunhours__stats--2">
      <div><dt>${t('garden.open')}</dt><dd id="ga-open">–</dd></div>
      <div><dt>${t('garden.shaded')}</dt><dd id="ga-shaded">–</dd></div>
    </dl>
    <p class="sunhours__season" id="ga-season"></p>
    <p class="solar__note">${t('garden.note')}</p>
  `;
  const dir = body.querySelector('#ga-dir') as HTMLInputElement;
  const hh = body.querySelector('#ga-h') as HTMLInputElement;
  const dd = body.querySelector('#ga-d') as HTMLInputElement;
  const update = () => {
    const obstacle = {
      azimuth: Number(dir.value),
      halfWidth: 30,
      height: Math.max(0, Number(hh.value)),
      distance: Math.max(1, Number(dd.value)),
    };
    (body.querySelector('#ga-dirval') as HTMLElement).textContent = `${obstacle.azimuth}° (${t(azimuthDirKey(obstacle.azimuth))})`;
    const open = directSunHours(date, location).totalMin;
    const shaded = directSunHours(date, location, { obstacle }).totalMin;
    (body.querySelector('#ga-open') as HTMLElement).textContent = fmtH(shaded, t);
    (body.querySelector('#ga-shaded') as HTMLElement).textContent = fmtH(Math.max(0, open - shaded), t);
    const s = seasonSunHours(date.getFullYear(), location, { obstacle });
    (body.querySelector('#ga-season') as HTMLElement).textContent = t('sunhours.season', {
      summer: fmtH(s.summer, t),
      winter: fmtH(s.winter, t),
    });
  };
  for (const el of [dir, hh, dd]) el.addEventListener('input', update);
  update();
}
