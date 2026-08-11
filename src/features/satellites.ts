/**
 * Fähigkeit `satellites` — TLE-Nachladung & ISS-Überflüge (Spec §20).
 *
 * Lädt aktuelle TLEs von CelesTrak (kostenlos). Bei Netzfehler bleiben die
 * Fallback-TLEs aktiv; ist das Bahnelement älter als 7 Tage, wird die
 * reduzierte Genauigkeit gemeldet (§10). Panel zeigt den nächsten ISS-Überflug.
 */

import type { GeoLocation } from '../core/astro-engine';
import { FALLBACK_TLES, getTles, nextPass, satellitePosition, setTles, type Tle } from '../core/satellites';
import type { Translator } from '../i18n';

const CELESTRAK = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=TLE';

/** TLE-Textblock (3 Zeilen je Satellit) in Objekte parsen. */
function parseTle(text: string): Tle[] {
  const lines = text.split(/\r?\n/).map((l) => l.trimEnd()).filter(Boolean);
  const out: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    if (lines[i + 1].startsWith('1 ') && lines[i + 2].startsWith('2 ')) {
      out.push({ name: lines[i].trim(), line1: lines[i + 1], line2: lines[i + 2] });
    }
  }
  return out;
}

/** Frische TLEs holen; bei Fehler Fallback behalten. */
export async function refreshTles(): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(CELESTRAK, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`http ${res.status}`);
    const tles = parseTle(await res.text());
    if (tles.length === 0) throw new Error('empty');
    // ISS-Namensschlüssel erhalten, Rest übernehmen.
    setTles(tles.map((t) => (t.name.includes('ZARYA') ? { ...t, nameKey: 'sat.iss' } : t)));
    return true;
  } catch {
    return false;
  }
}

const fmt = (d: Date): string =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(d);

export function openSatellites(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card comfort';
  card.innerHTML = `
    <h2 class="onboard__title">${t('sat.title')}</h2>
    <div class="sat__body" id="sat-body"></div>
    <div class="onboard__actions"><span></span><button class="btn btn--primary" data-close>${t('sat.close')}</button></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  const render = (): void => {
    const iss = getTles().find((s) => s.nameKey === 'sat.iss') ?? FALLBACK_TLES[0];
    const now = satellitePosition(iss, date, location);
    const pass = nextPass(iss, date, location, 48);
    const ageWarn = now && Math.abs(now.tleAgeDays) > 7;

    const passLine = pass
      ? `<dl class="comfort__rows">
          <div><dt>${t('sat.rise')}</dt><dd>${fmt(pass.rise)}</dd></div>
          <div><dt>${t('sat.max')}</dt><dd>${fmt(pass.max)} · ${pass.maxElevation}°</dd></div>
          <div><dt>${t('sat.set')}</dt><dd>${fmt(pass.set)}</dd></div>
        </dl>`
      : `<p class="comfort__v">${t('sat.noPass')}</p>`;

    (card.querySelector('#sat-body') as HTMLElement).innerHTML = `
      <div class="comfort__section">
        <span class="comfort__k">${t('sat.issNow')}</span>
        <p class="comfort__v">${now && now.above ? t('sat.visible', { elev: String(Math.round(now.elevation)) }) : t('sat.below')}</p>
      </div>
      <div class="comfort__section">
        <span class="comfort__k">${t('sat.nextPass')}</span>
        ${passLine}
      </div>
      ${ageWarn ? `<p class="solar__note">⚠︎ ${t('sat.stale', { days: String(Math.round(Math.abs(now!.tleAgeDays))) })}</p>` : ''}
      <p class="solar__note">${t('sat.note')}</p>
    `;
  };

  render();
  // Frische Daten holen; danach neu rendern (auf dem Gerät mit Netz).
  void refreshTles().then((ok) => {
    if (ok && overlay.isConnected) render();
  });
}
