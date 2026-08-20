/**
 * Fähigkeit `chronobiology` — sozialer Jetlag & Chronotyp (Spec §26).
 *
 * Vier Zeitangaben (§26.1 B) genügen. Alles ausschliesslich lokal (§26.5):
 * kein Konto, kein Server. Export als JSON und Löschung mit einem Tippen.
 * Rein beschreibend, keine Handlungsanweisung (§5, §26.6).
 */

import type { GeoLocation } from '../core/astro-engine';
import { fullMoonDistance, moonInfo } from '../core/astro-engine';
import { analyzeSleep, combinedOffset, minutesToHHMM, type ChronoResult, type SleepLog } from '../core/chronobiology';
import { icon } from '../icons';
import type { Translator } from '../i18n';
import { fetchPressureTrend } from './weather';

const STORAGE_KEY = 'sunclock.chrono';

const DEFAULT_LOG: SleepLog = { workOnset: '23:30', workWake: '06:30', freeOnset: '00:30', freeWake: '08:30' };

export function loadChronoLog(): SleepLog | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SleepLog) : null;
  } catch {
    return null;
  }
}

export function currentChrono(): ChronoResult | null {
  const log = loadChronoLog();
  return log ? analyzeSleep(log) : null;
}

function saveLog(log: SleepLog): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    /* rein lokal, optional */
  }
}

function clearLog(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

const fmtDur = (min: number, t: Translator): string => {
  const h = Math.floor(Math.abs(min) / 60);
  const m = Math.abs(min) % 60;
  return h === 0 ? `${m} ${t('unit.min')}` : `${h} ${t('unit.hour')} ${m} ${t('unit.min')}`;
};

export function openChronobiology(
  solarOffsetMin: number,
  location: GeoLocation,
  now: Date,
  t: Translator,
  onChange: () => void,
): void {
  const log: SleepLog = loadChronoLog() ?? { ...DEFAULT_LOG };

  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card chrono';
  card.innerHTML = `
    <h2 class="onboard__title">${t('chrono.title')}</h2>
    <p class="chrono__intro">${t('chrono.intro')}</p>
    <div class="chrono__grid">
      <div></div><div class="chrono__h">${t('chrono.onset')}</div><div class="chrono__h">${t('chrono.wake')}</div>
      <div class="chrono__rowlabel">${t('chrono.workdays')}</div>
      <input type="time" id="c-wo" value="${log.workOnset}" aria-label="${t('chrono.workdays')} – ${t('chrono.onset')}" />
      <input type="time" id="c-ww" value="${log.workWake}" aria-label="${t('chrono.workdays')} – ${t('chrono.wake')}" />
      <div class="chrono__rowlabel">${t('chrono.freedays')}</div>
      <input type="time" id="c-fo" value="${log.freeOnset}" aria-label="${t('chrono.freedays')} – ${t('chrono.onset')}" />
      <input type="time" id="c-fw" value="${log.freeWake}" aria-label="${t('chrono.freedays')} – ${t('chrono.wake')}" />
    </div>

    <dl class="chrono__stats">
      <div><dt>${t('chrono.chronotype')}</dt><dd id="c-type">–</dd></div>
      <div><dt>${t('chrono.socialJetlag')}</dt><dd id="c-sjl">–</dd></div>
      <div><dt>${t('chrono.combined')}</dt><dd id="c-combined">–</dd></div>
    </dl>
    <p class="chrono__explain" id="c-explain"></p>
    <p class="solar__note">${t('chrono.disclaimer')}</p>

    <section class="chrono__cycles">
      <h3 class="chrono__subh">${t('chrono.cycles.title')}</h3>
      <p class="chrono__cycle">
        <span class="chrono__cycle-ic" aria-hidden="true">${icon('moon')}</span>
        <span id="c-moon">–</span>
      </p>
      <p class="chrono__cycle" id="c-pressure-row" hidden>
        <span class="chrono__cycle-ic" id="c-pressure-arrow" aria-hidden="true">→</span>
        <span id="c-pressure">–</span>
      </p>
      <p class="solar__note">${t('chrono.moon.disclaimer')}</p>
    </section>

    <div class="chrono__actions">
      <button class="btn btn--ghost" id="c-delete">${t('chrono.delete')}</button>
      <button class="btn btn--ghost" id="c-export">${t('chrono.export')}</button>
      <button class="btn btn--primary" id="c-close">${t('chrono.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const $ = (sel: string) => card.querySelector(sel) as HTMLElement;
  const inputs = {
    wo: $('#c-wo') as HTMLInputElement,
    ww: $('#c-ww') as HTMLInputElement,
    fo: $('#c-fo') as HTMLInputElement,
    fw: $('#c-fw') as HTMLInputElement,
  };

  const readLog = (): SleepLog => ({
    workOnset: inputs.wo.value || DEFAULT_LOG.workOnset,
    workWake: inputs.ww.value || DEFAULT_LOG.workWake,
    freeOnset: inputs.fo.value || DEFAULT_LOG.freeOnset,
    freeWake: inputs.fw.value || DEFAULT_LOG.freeWake,
  });

  const update = (): void => {
    const current = readLog();
    saveLog(current);
    const r = analyzeSleep(current);
    $('#c-type').textContent = t(r.chronotypeKey);
    $('#c-sjl').textContent = fmtDur(r.socialJetlagMin, t);
    const combined = combinedOffset(solarOffsetMin, r.socialJetlagMin);
    $('#c-combined').textContent = fmtDur(combined, t);
    $('#c-explain').textContent = t('chrono.explain', {
      solar: fmtDur(solarOffsetMin, t),
      sjl: fmtDur(r.socialJetlagMin, t),
      ideal: `${minutesToHHMM(r.idealOnsetMin)}–${minutesToHHMM(r.idealWakeMin)}`,
    });
    onChange();
  };

  for (const el of Object.values(inputs)) el.addEventListener('change', update);

  $('#c-delete').addEventListener('click', () => {
    clearLog();
    overlay.remove();
    onChange();
  });

  $('#c-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(readLog(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sunclock-chronobiology.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });

  $('#c-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // Mond braucht kein Netz und steht deshalb sofort (§17).
  const m = moonInfo(now, location);
  const dist = fullMoonDistance(m.ageDays);
  const fullKey =
    dist.days === 0
      ? 'chrono.moon.fullToday'
      : dist.days === 1
        ? dist.direction === 'to'
          ? 'chrono.moon.dayToFull'
          : 'chrono.moon.daySinceFull'
        : dist.direction === 'to'
          ? 'chrono.moon.daysToFull'
          : 'chrono.moon.daysSinceFull';
  $('#c-moon').textContent = [
    t(m.phaseKey),
    t('chrono.moon.illuminated', { p: Math.round(m.illumination * 100) }),
    t(fullKey, { d: dist.days }),
  ].join(' · ');

  // Luftdruck nur, wenn das Netz etwas liefert; sonst bleibt die Zeile aus (§10).
  const ARROW: Record<string, string> = { rising: '↑', falling: '↓', stable: '→' };
  void fetchPressureTrend(location, now).then((change) => {
    if (!change || !overlay.isConnected) return;
    $('#c-pressure-arrow').textContent = ARROW[change.trend];
    // Das Vorzeichen trägt schon das Trendwort — die Zahl bleibt positiv.
    $('#c-pressure').textContent =
      `${t('chrono.pressure.title')}: ${t(`chrono.pressure.${change.trend}`, { d: Math.abs(change.deltaHpa).toFixed(1) })}`;
    $('#c-pressure-row').hidden = false;
  });

  update();
}
