/**
 * Fähigkeit `kids` — Kinder & Familie (Spec §30).
 *
 * Vereinfachte, fragengeführte Ansicht: große Formen, minimale Zahlen, kurze
 * Erklärungen (zwei Sätze) beim Antippen, eine Beobachtungsaufgabe. Keine
 * Gamification, kein Konto, keine Datenerhebung (§30).
 */

import type { GeoLocation } from '../core/astro-engine';
import { moonInfo, sunPosition, sunTimes } from '../core/astro-engine';
import { usableLight } from '../core/outdoor';
import { visibleBrightPlanet } from '../core/kids';
import { azimuthDirKey, type Translator } from '../i18n';
import { icon } from '../icons';

interface KidQuestion {
  q: string;
  answer: () => string;
  why: string;
}

const fmtTime = (d: Date): string =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(d);

export function openKids(location: GeoLocation, date: Date, t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard onboard--sheet kids';
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
    {
      q: t('kids.q.sunset'),
      answer: () => {
        const times = sunTimes(date, location);
        return times.sunset ? t('kids.a.sunset', { time: fmtTime(times.sunset) }) : t('kids.a.sunsetNone');
      },
      why: t('kids.exp.sunset'),
    },
    {
      q: t('kids.q.sky'),
      answer: () => {
        const s = sunPosition(date, location);
        return s.elevation > -0.833 ? t('kids.a.skyBlue') : t('kids.a.skyDark');
      },
      why: t('kids.exp.sky'),
    },
    {
      q: t('kids.q.sameSize'),
      answer: () => t('kids.a.sameSize'),
      why: t('kids.exp.sameSize'),
    },
    {
      q: t('kids.q.sleep'),
      answer: () => {
        const s = sunPosition(date, location);
        return s.elevation > -0.833 ? t('kids.a.sleepDay') : t('kids.a.sleepNight');
      },
      why: t('kids.exp.sleep'),
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
    <div class="onboard__handle" aria-hidden="true"></div>
    <div class="kids__glyph">${icon(sunUpNow ? 'sun' : 'moon')}</div>
    <p class="kids__q" id="kids-q"></p>
    <p class="kids__a" id="kids-a"></p>
    <p class="kids__why" id="kids-why" hidden></p>
    <div class="kids__btns">
      <button class="btn btn--ghost" id="kids-why-btn"></button>
      <button class="btn btn--primary" id="kids-next"></button>
    </div>
    <p class="kids__task"><span class="kids__task-ic" aria-hidden="true">${icon('telescope')}</span> ${task}</p>
    <button class="kids__close" id="kids-close" aria-label="${t('kids.close')}">${icon('x')}</button>
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
  card.querySelector('.onboard__handle')?.addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  paint();
}
