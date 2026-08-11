/**
 * Fähigkeit `kids` — Kinder & Familie (Spec §30).
 *
 * Vereinfachte, fragengeführte Ansicht: große Formen, minimale Zahlen, kurze
 * Erklärungen (zwei Sätze) beim Antippen, eine Beobachtungsaufgabe. Keine
 * Gamification, kein Konto, keine Datenerhebung (§30).
 */

import type { GeoLocation } from '../core/astro-engine';
import { moonInfo, sunPosition } from '../core/astro-engine';
import { usableLight } from '../core/outdoor';
import { visibleBrightPlanet } from '../core/kids';
import { azimuthDirKey, type Translator } from '../i18n';

interface KidQuestion {
  q: string;
  answer: () => string;
  why: string;
}

export function openKids(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard kids';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const friendlyDuration = (min: number): string => {
    if (min >= 90) return t('kids.aboutHours', { n: String(Math.round(min / 60)) });
    return t('kids.aboutMinutes', { n: String(Math.max(5, Math.round(min / 5) * 5)) });
  };

  const questions: KidQuestion[] = [
    {
      q: t('kids.q.sun'),
      answer: () => {
        const s = sunPosition(date, location);
        return s.elevation > -0.833
          ? t('kids.a.sunUp', { dir: t(azimuthDirKey(s.azimuth)) })
          : t('kids.a.sunDown');
      },
      why: t('kids.exp.sun'),
    },
    {
      q: t('kids.q.light'),
      answer: () => {
        const ul = usableLight(date, location);
        return ul.minutes > 0 && ul.state !== 'night' && Number.isFinite(ul.minutes)
          ? t('kids.a.lightHours', { dur: friendlyDuration(ul.minutes) })
          : t('kids.a.lightDark');
      },
      why: t('kids.exp.light'),
    },
    {
      q: t('kids.q.moonDay'),
      answer: () => {
        const m = moonInfo(date, location);
        return m.elevation > 0 ? t('kids.a.moonUp') : t('kids.a.moonDown');
      },
      why: t('kids.exp.moonDay'),
    },
    {
      q: t('kids.q.moonShape'),
      answer: () => {
        const m = moonInfo(date, location);
        return t('kids.a.moonShape', { phase: t(m.phaseKey), pct: String(Math.round(m.illumination * 100)) });
      },
      why: t('kids.exp.moonShape'),
    },
  ];

  let index = 0;
  const sunUpNow = sunPosition(date, location).elevation > -0.833;

  const bp = visibleBrightPlanet(date, location);
  const task = bp
    ? t('kids.task', { planet: t(bp.nameKey), dir: t(azimuthDirKey(bp.azimuth)) })
    : t('kids.taskNone');

  const card = document.createElement('div');
  card.className = 'onboard__card kids__card';
  card.innerHTML = `
    <div class="kids__glyph">${sunUpNow ? '☀️' : '🌙'}</div>
    <p class="kids__q" id="kids-q"></p>
    <p class="kids__a" id="kids-a"></p>
    <p class="kids__why" id="kids-why" hidden></p>
    <div class="kids__btns">
      <button class="btn btn--ghost" id="kids-why-btn"></button>
      <button class="btn btn--primary" id="kids-next"></button>
    </div>
    <p class="kids__task">🔭 ${task}</p>
    <button class="kids__close" id="kids-close" aria-label="${t('kids.close')}">✕</button>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const $ = (s: string) => card.querySelector(s) as HTMLElement;

  const paint = (): void => {
    const cur = questions[index];
    $('#kids-q').textContent = cur.q;
    $('#kids-a').textContent = cur.answer();
    const why = $('#kids-why');
    why.textContent = cur.why;
    why.hidden = true;
    $('#kids-why-btn').textContent = t('kids.why');
    $('#kids-next').textContent = t('kids.next');
  };

  $('#kids-why-btn').addEventListener('click', () => {
    const why = $('#kids-why');
    why.hidden = !why.hidden;
  });
  $('#kids-next').addEventListener('click', () => {
    index = (index + 1) % questions.length;
    paint();
  });
  $('#kids-close').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  paint();
}
