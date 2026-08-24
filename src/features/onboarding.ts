/**
 * Onboarding — kritischster Punkt für die Akzeptanz (Spec §14).
 * Vier überspringbare Bildschirme, jederzeit erneut aufrufbar. Erklärt, warum
 * das Zifferblatt anders funktioniert als jede gewohnte Uhr.
 */

import type { Translator } from '../i18n';

const STORAGE_KEY = 'zeitgeber.onboarded';

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

export type OnboardProfile = 'outdoor' | 'space' | 'solar' | 'sleep';

const PROFILES: { key: OnboardProfile; labelKey: string; glyph: string }[] = [
  { key: 'outdoor', labelKey: 'onboard.profile.outdoor', glyph: '🥾' },
  { key: 'space', labelKey: 'onboard.profile.space', glyph: '🔭' },
  { key: 'solar', labelKey: 'onboard.profile.solar', glyph: '⚡' },
  { key: 'sleep', labelKey: 'onboard.profile.sleep', glyph: '😴' },
];

/**
 * Zeigt das Onboarding; löst mit dem gewählten Bedürfnis-Profil auf (oder
 * `null`, wenn übersprungen bzw. keine Auswahl getroffen wurde). Die erste
 * Slide fragt das Profil ab, damit main.ts die passenden Module vorauswählen
 * kann — ohne die restlichen, generischen Erklär-Slides zu verändern.
 */
export function showOnboarding(t: Translator): Promise<OnboardProfile | null> {
  return new Promise((resolve) => {
    let index = 0;
    let selectedProfile: OnboardProfile | null = null;
    const totalSlides = SLIDES.length + 1;

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

    const profileList = document.createElement('div');
    profileList.className = 'onboard__profiles';
    profileList.setAttribute('role', 'radiogroup');

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
      resolve(selectedProfile);
    };

    const paintProfiles = () => {
      profileList.innerHTML = '';
      PROFILES.forEach((p) => {
        const opt = document.createElement('button');
        opt.type = 'button';
        opt.className = 'onboard__profile' + (selectedProfile === p.key ? ' is-selected' : '');
        opt.setAttribute('role', 'radio');
        opt.setAttribute('aria-checked', String(selectedProfile === p.key));
        const optGlyph = document.createElement('span');
        optGlyph.className = 'onboard__profile-glyph';
        optGlyph.textContent = p.glyph;
        const optLabel = document.createElement('span');
        optLabel.textContent = t(p.labelKey);
        opt.append(optGlyph, optLabel);
        opt.addEventListener('click', () => {
          selectedProfile = p.key;
          paintProfiles();
        });
        profileList.appendChild(opt);
      });
    };

    const paint = () => {
      const isProfileSlide = index === 0;
      glyph.hidden = isProfileSlide;
      profileList.hidden = !isProfileSlide;

      if (isProfileSlide) {
        title.textContent = t('onboard.profile.title');
        body.textContent = t('onboard.profile.body');
        paintProfiles();
      } else {
        const s = SLIDES[index - 1];
        glyph.textContent = s.glyph;
        title.textContent = t(s.titleKey);
        body.textContent = t(s.bodyKey);
      }

      skip.textContent = t('onboard.skip');
      next.textContent = index === totalSlides - 1 ? t('onboard.start') : t('onboard.next');
      dots.innerHTML = '';
      for (let i = 0; i < totalSlides; i += 1) {
        const dot = document.createElement('span');
        dot.className = 'onboard__dot' + (i === index ? ' is-active' : '');
        dots.appendChild(dot);
      }
    };

    skip.addEventListener('click', finish);
    next.addEventListener('click', () => {
      if (index === totalSlides - 1) finish();
      else {
        index += 1;
        paint();
      }
    });

    actions.append(skip, next);
    card.append(glyph, title, body, profileList, dots, actions);
    overlay.append(card);
    document.body.append(overlay);
    paint();
  });
}
