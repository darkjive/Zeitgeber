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

// warnung.bund.de sendet kein Access-Control-Allow-Origin — ein Browser-Fetch
// scheitert dort immer an CORS. Der eigene Server (api/warnings.ts) holt die
// Daten deshalb stellvertretend, genau wie api/cron.ts es für Push-Zustellung
// bereits tut.
const WARN_API = `${import.meta.env.BASE_URL}api/warnings`;

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
    const res = await fetch(`${WARN_API}?ars=${ars}`, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const data = await res.json();
    return normalizeWarnings(data);
  } catch {
    return [];
  }
}

export function renderWarnCard(warnings: CivilWarning[], kreisName: string | null, lang: Lang, t: Translator): string {
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
  return `
    ${kreisName ? `<p class="chrono__intro">${escapeHtml(kreisName)}</p>` : ''}
    ${
      warnings.length
        ? items
        : kreisName
          ? `<p class="chrono__intro">${t('warn.empty')}</p>`
          : `<p class="chrono__intro">${t('warn.outsideDe')}</p>`
    }
    <p class="solar__note">${t('warn.disclaimer')}</p>
  `;
}
