/**
 * Fähigkeit `wildlife` — Dämmerungsaktivität (Spec §31.5).
 *
 * Dämmerungsfenster, Mondlicht, jahreszeitliche Verschiebung. **Bewusste
 * Abgrenzung:** die Solunar-Theorie wird nicht umgesetzt (§31.5, §4) — nur die
 * gut dokumentierte erhöhte Dämmerungsaktivität wird dargestellt. Panel bei
 * Bedarf (§7.4).
 */

import type { GeoLocation } from '../core/astro-engine';
import { sunTimes } from '../core/astro-engine';
import { moonlightForecast } from '../core/outdoor';
import type { Translator } from '../i18n';

const fmt = (d: Date | null): string =>
  d ? new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d) : '—';
const range = (a: Date | null, b: Date | null): string => (a && b ? `${fmt(a)} – ${fmt(b)}` : '—');

export function renderWildlifeCard(location: GeoLocation, date: Date, t: Translator): string {
  const times = sunTimes(date, location);
  const moon = moonlightForecast(date, location);

  return `
    <dl class="comfort__rows">
      <div><dt>${t('wildlife.dawn')}</dt><dd>${range(times.civilDawn, times.sunrise)}</dd></div>
      <div><dt>${t('wildlife.dusk')}</dt><dd>${range(times.sunset, times.civilDusk)}</dd></div>
      <div><dt>${t('wildlife.moonlight')}</dt><dd>${t(`outdoor.moon.${moon.level}`)} · ${Math.round(moon.illumination * 100)} %</dd></div>
    </dl>
    <p class="comfort__v">${t('wildlife.hint')}</p>
    <p class="solar__note">${t('wildlife.note')}</p>
  `;
}
