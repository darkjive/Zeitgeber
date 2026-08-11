/**
 * Fähigkeit `solar-yield` — Balkonkraftwerk & Photovoltaik (Spec §31.1).
 *
 * Größte deutschsprachige Zielgruppe (§31.7). Modulausrichtung und -neigung
 * eingebbar, Ertragsfenster und günstigster Zeitraum über den Tag,
 * Sommer/Winter-Vergleich. **Reine Geometrie, keine kWh** (§31.1). Optional,
 * standardmäßig nicht sichtbar (§7.4) — wird als Panel bei Bedarf geöffnet.
 */

import type { GeoLocation } from '../core/astro-engine';
import { seasonComparison, yieldSummary, type YieldSample } from '../core/solar-geometry';
import { azimuthDirKey, type Translator } from '../i18n';

const fmtTime = (d: Date): string => new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d);

export function openSolarYield(location: GeoLocation, date: Date, t: Translator): void {
  let azimuth = 180; // Süd
  let tilt = 30;

  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card solar';
  card.innerHTML = `
    <h2 class="onboard__title">${t('solar.title')}</h2>
    <div class="solar__controls">
      <label class="solar__field">
        <span><span data-k="azLabel">${t('solar.azimuth')}</span>: <b id="sy-az-val"></b></span>
        <input id="sy-az" type="range" min="90" max="270" step="5" value="${azimuth}" />
      </label>
      <label class="solar__field">
        <span>${t('solar.tilt')}: <b id="sy-tilt-val"></b></span>
        <input id="sy-tilt" type="range" min="0" max="90" step="5" value="${tilt}" />
      </label>
    </div>
    <svg id="sy-curve" class="solar__curve" viewBox="0 0 300 90" role="img"></svg>
    <dl class="solar__stats">
      <div><dt>${t('solar.window')}</dt><dd id="sy-window">–</dd></div>
      <div><dt>${t('solar.peak')}</dt><dd id="sy-peak">–</dd></div>
      <div><dt>${t('solar.summerWinter')}</dt><dd id="sy-season">–</dd></div>
    </dl>
    <p class="solar__note">${t('solar.note')}</p>
    <div class="onboard__actions">
      <span></span>
      <button class="btn btn--primary" id="sy-close">${t('solar.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const $ = (sel: string) => card.querySelector(sel) as HTMLElement;
  const azInput = $('#sy-az') as HTMLInputElement;
  const tiltInput = $('#sy-tilt') as HTMLInputElement;

  const drawCurve = (curve: YieldSample[], windowStart: Date | null, windowEnd: Date | null, peak: YieldSample | null): void => {
    const W = 300;
    const H = 90;
    const x = (i: number) => (i / (curve.length - 1)) * W;
    const y = (f: number) => H - 6 - f * (H - 14);
    const line = curve.map((s, i) => `${i === 0 ? 'M' : 'L'} ${x(i).toFixed(1)} ${y(s.factor).toFixed(1)}`).join(' ');
    const area = `${line} L ${W} ${H} L 0 ${H} Z`;
    const peakIdx = peak ? curve.indexOf(peak) : -1;
    const winFrom = windowStart ? curve.findIndex((s) => s.time.getTime() === windowStart.getTime()) : -1;
    const winTo = windowEnd ? curve.findIndex((s) => s.time.getTime() === windowEnd.getTime()) : -1;
    const svg = $('#sy-curve');
    svg.innerHTML =
      (winFrom >= 0 && winTo >= 0
        ? `<rect x="${x(winFrom).toFixed(1)}" y="0" width="${(x(winTo) - x(winFrom)).toFixed(1)}" height="${H}" fill="var(--accent)" opacity="0.12" />`
        : '') +
      `<path d="${area}" fill="var(--accent)" opacity="0.22" />` +
      `<path d="${line}" fill="none" stroke="var(--accent)" stroke-width="2" />` +
      (peakIdx >= 0 ? `<circle cx="${x(peakIdx).toFixed(1)}" cy="${y(peak!.factor).toFixed(1)}" r="3" fill="var(--accent)" />` : '') +
      [6, 12, 18].map((h) => `<line x1="${((h * 60) / (24 * 60)) * W}" y1="${H - 4}" x2="${((h * 60) / (24 * 60)) * W}" y2="${H}" stroke="var(--text-dim)" stroke-width="1" />`).join('');
  };

  const update = (): void => {
    azimuth = Number(azInput.value);
    tilt = Number(tiltInput.value);
    $('#sy-az-val').textContent = `${azimuth}° (${t(azimuthDirKey(azimuth))})`;
    $('#sy-tilt-val').textContent = `${tilt}°`;

    const s = yieldSummary(date, location, azimuth, tilt);
    $('#sy-window').textContent = s.windowStart && s.windowEnd ? `${fmtTime(s.windowStart)} – ${fmtTime(s.windowEnd)}` : '—';
    $('#sy-peak').textContent = s.peak && s.peak.factor > 0 ? fmtTime(s.peak.time) : '—';

    const cmp = seasonComparison(date.getFullYear(), location, azimuth, tilt);
    const ratio = cmp.winter > 0 ? cmp.summer / cmp.winter : Infinity;
    $('#sy-season').textContent = Number.isFinite(ratio) ? `${ratio.toFixed(1)}×` : '∞';

    drawCurve(s.curve, s.windowStart, s.windowEnd, s.peak);
  };

  azInput.addEventListener('input', update);
  tiltInput.addEventListener('input', update);
  $('#sy-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  update();
}
