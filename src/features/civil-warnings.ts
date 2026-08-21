/**
 * Fähigkeit `civil-warnings` — amtliche Zivilschutz-Warnungen des Bundes
 * für den eigenen Landkreis (Spec §5, §10, §38.1).
 *
 * BBK-Dashboard-API, kein Schlüssel nötig, aggregiert bereits alle Quellen
 * (MOWAS/KATWARN/DWD/BIWAPP/Polizei) pro Kreis. Ohne Netz/Timeout: leere
 * Liste, kein Fehlertext — konsistent mit weather.ts (§10).
 */

import type { GeoLocation } from '../core/astro-engine';
import { arsFromAgs, nearestKreis, normalizeWarnings, severityColor, type CivilWarning } from '../core/civil-warnings';
import { icon } from '../icons';
import type { Lang, Translator } from '../i18n';

const WARN_API = 'https://warnung.bund.de/api31/dashboard';

// Titel & Co. kommen von einer externen API (warnung.bund.de) — anders als
// die übrigen Panels, die nur aus dem eigenen i18n-Wörterbuch interpolieren,
// ist das hier echter Fremd-Content und muss vor dem Einsetzen in innerHTML
// escaped werden (XSS-Härtung).
const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const KNOWN_SEVERITIES = ['Minor', 'Moderate', 'Severe', 'Extreme'] as const;

/** Aktive Warnungen für den Kreis am Standort. `type: 'Cancel'` (Entwarnung) wird herausgefiltert. */
export async function fetchCivilWarnings(loc: GeoLocation): Promise<CivilWarning[]> {
  const kreis = nearestKreis(loc);
  if (!kreis) return [];
  const ars = arsFromAgs(kreis.ags);
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(`${WARN_API}/${ars}.json`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = await res.json();
    return normalizeWarnings(data);
  } catch {
    return [];
  }
}

export function openCivilWarnings(
  warnings: CivilWarning[],
  kreisName: string | null,
  lang: Lang,
  t: Translator,
): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card outdoor'; // reicht: gleiche Breite/Ausrichtung wie das Outdoor-Panel
  const items = warnings
    .map((w) => {
      const title = w.i18nTitle[lang] ?? w.i18nTitle.de ?? w.id;
      // Laufzeit-Absicherung: `as CivilWarning[]` beim Parsen ist nur eine
      // Type-Assertion, kein Schutz gegen unerwartete API-Werte. Ein
      // unbekannter severity-Wert würde sonst als roher i18n-Key-String
      // (Fallback in createTranslator()) ungeescaped ins DOM gelangen.
      const severity = KNOWN_SEVERITIES.includes(w.severity as (typeof KNOWN_SEVERITIES)[number])
        ? w.severity
        : 'Moderate';
      return `
      <p class="warn__item">
        <span class="warn__ic" aria-hidden="true">${icon('triangle-alert')}</span>
        <span class="warn__body">
          <span class="warn__sev" style="background:${severityColor(severity)}">${t(`warn.severity.${severity.toLowerCase()}`)}</span>
          <span class="warn__title">${escapeHtml(title)}</span>
        </span>
      </p>`;
    })
    .join('');
  card.innerHTML = `
    <h2 class="onboard__title">${t('warn.title')}</h2>
    ${kreisName ? `<p class="chrono__intro">${escapeHtml(kreisName)}</p>` : ''}
    ${
      warnings.length
        ? items
        : kreisName
          ? `<p class="chrono__intro">${t('warn.empty')}</p>`
          : `<p class="chrono__intro">${t('warn.outsideDe')}</p>`
    }
    <p class="solar__note">${t('warn.disclaimer')}</p>
    <div class="onboard__actions">
      <button class="btn btn--primary" id="warn-close">${t('warn.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('#warn-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
