/**
 * Onboarding — kritischster Punkt für die Akzeptanz (Spec §14).
 * Vier überspringbare Bildschirme, jederzeit erneut aufrufbar. Erklärt, warum
 * das Zifferblatt anders funktioniert als jede gewohnte Uhr.
 */

import type { Translator } from '../i18n';

const STORAGE_KEY = 'sunclock.onboarded';

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markOnboarded(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch {
    /* ignore */
  }
}

const SLIDES = [
  { titleKey: 'onboard.1.title', bodyKey: 'onboard.1.body', glyph: '☀' },
  { titleKey: 'onboard.2.title', bodyKey: 'onboard.2.body', glyph: '🕛' },
  { titleKey: 'onboard.3.title', bodyKey: 'onboard.3.body', glyph: '📍' },
  { titleKey: 'onboard.4.title', bodyKey: 'onboard.4.body', glyph: '🌙' },
];

/** Zeigt das Onboarding; löst auf, wenn der Nutzer fertig ist. */
export function showOnboarding(t: Translator): Promise<void> {
  return new Promise((resolve) => {
    let index = 0;

    const overlay = document.createElement('div');
    overlay.className = 'onboard';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const card = document.createElement('div');
    card.className = 'onboard__card';

    const glyph = document.createElement('div');
    glyph.className = 'onboard__glyph';
    const title = document.createElement('h2');
    title.className = 'onboard__title';
    const body = document.createElement('p');
    body.className = 'onboard__body';

    const dots = document.createElement('div');
    dots.className = 'onboard__dots';

    const actions = document.createElement('div');
    actions.className = 'onboard__actions';
    const skip = document.createElement('button');
    skip.className = 'btn btn--ghost';
    const next = document.createElement('button');
    next.className = 'btn btn--primary';

    const finish = () => {
      markOnboarded();
      overlay.remove();
      resolve();
    };

    const paint = () => {
      const s = SLIDES[index];
      glyph.textContent = s.glyph;
      title.textContent = t(s.titleKey);
      body.textContent = t(s.bodyKey);
      skip.textContent = t('onboard.skip');
      next.textContent = index === SLIDES.length - 1 ? t('onboard.start') : t('onboard.next');
      dots.innerHTML = '';
      SLIDES.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = 'onboard__dot' + (i === index ? ' is-active' : '');
        dots.appendChild(dot);
      });
    };

    skip.addEventListener('click', finish);
    next.addEventListener('click', () => {
      if (index === SLIDES.length - 1) finish();
      else {
        index += 1;
        paint();
      }
    });

    actions.append(skip, next);
    card.append(glyph, title, body, dots, actions);
    overlay.append(card);
    document.body.append(overlay);
    paint();
  });
}
