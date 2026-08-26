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
import { icon } from '../icons';

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

let inFlight: Promise<boolean> | null = null;

/**
 * Frische TLEs holen; bei Fehler Fallback behalten.
 * Ruft main.ts diese Funktion mehrfach kurz hintereinander auf (z. B. weil
 * Info-Karte "sat" und Layer "satellites" im selben Zug aktiviert werden),
 * teilen sich die Aufrufe einen laufenden Request statt doppelt zu fetchen.
 */
export function refreshTles(): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = fetchTles().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchTles(): Promise<boolean> {
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

export function renderSatCard(location: GeoLocation, date: Date, t: Translator): string {
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

  return `
    <div class="comfort__section">
      <span class="comfort__k">${t('sat.issNow')}</span>
      <p class="comfort__v">${now && now.above ? t('sat.visible', { elev: String(Math.round(now.elevation)) }) : t('sat.below')}</p>
    </div>
    <div class="comfort__section">
      <span class="comfort__k">${t('sat.nextPass')}</span>
      ${passLine}
    </div>
    ${ageWarn ? `<p class="solar__note solar__note--warn">${icon('triangle-alert')} ${t('sat.stale', { days: String(Math.round(Math.abs(now!.tleAgeDays))) })}</p>` : ''}
    <p class="solar__note">${t('sat.note')}</p>
  `;
}
