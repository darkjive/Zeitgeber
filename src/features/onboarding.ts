/**
 * Onboarding — kritischster Punkt für die Akzeptanz (Spec §14).
 * Vier überspringbare Bildschirme, jederzeit erneut aufrufbar. Erklärt, warum
 * das Zifferblatt anders funktioniert als jede gewohnte Uhr.
 */

import type { Translator } from '../i18n';
import { requestGeolocation } from '../core/location';
import type { GeoLocation } from '../core/astro-engine';
import { icon, type IconName } from '../icons';

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

const SLIDES: { titleKey: string; bodyKey: string; glyph: IconName }[] = [
  { titleKey: 'onboard.1.title', bodyKey: 'onboard.1.body', glyph: 'sun' },
  { titleKey: 'onboard.2.title', bodyKey: 'onboard.2.body', glyph: 'clock' },
  { titleKey: 'onboard.3.title', bodyKey: 'onboard.3.body', glyph: 'map-pin' },
  { titleKey: 'onboard.4.title', bodyKey: 'onboard.4.body', glyph: 'moon' },
];

export type OnboardProfile = 'outdoor' | 'space' | 'solar' | 'sleep';

const PROFILES: { key: OnboardProfile; labelKey: string; glyph: IconName }[] = [
  { key: 'outdoor', labelKey: 'onboard.profile.outdoor', glyph: 'footprints' },
  { key: 'space', labelKey: 'onboard.profile.space', glyph: 'telescope' },
  { key: 'solar', labelKey: 'onboard.profile.solar', glyph: 'zap' },
  { key: 'sleep', labelKey: 'onboard.profile.sleep', glyph: 'bed' },
];

/**
 * Zeigt das Onboarding; löst mit dem gewählten Bedürfnis-Profil auf (oder
 * `null`, wenn übersprungen bzw. keine Auswahl getroffen wurde). Die erste
 * Slide fragt das Profil ab, damit main.ts die passenden Module vorauswählen
 * kann — ohne die restlichen, generischen Erklär-Slides zu verändern.
 *
 * Die Standort-Slide (§onboard.3) fragt hier auch gleich die GPS-Freigabe ab
 * — der Berechtigungsdialog gehört an den Moment, in dem erklärt wird, wofür
 * er gebraucht wird. `onLocation` meldet einen erfolgreichen GPS-Treffer an
 * main.ts zurück. Überspringt der Nutzer (oder verweigert er GPS), bleibt die
 * manuelle Ortseingabe in der Datenzeile über dem Zifferblatt der Rückfall.
 */
export function showOnboarding(t: Translator, onLocation: (loc: GeoLocation) => void): Promise<OnboardProfile | null> {
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

    const locate = document.createElement('button');
    locate.type = 'button';
    locate.className = 'btn btn--ghost onboard__locate';
    const locateMsg = document.createElement('p');
    locateMsg.className = 'onboard__locate-msg';
    locateMsg.hidden = true;
    let locateState: 'idle' | 'pending' | 'granted' | 'denied' = 'idle';

    const paintLocate = () => {
      locate.disabled = locateState === 'pending' || locateState === 'granted';
      locate.innerHTML =
        locateState === 'granted'
          ? `${icon('circle-check')} ${t('onboard.location.granted')}`
          : locateState === 'pending'
            ? t('onboard.location.pending')
            : t('loc.useGps');
      locateMsg.textContent = t('loc.denied');
    };

    locate.addEventListener('click', async () => {
      locateState = 'pending';
      paintLocate();
      try {
        const geo = await requestGeolocation();
        onLocation(geo);
        locateState = 'granted';
      } catch {
        locateState = 'denied'; // §10: Rückfall auf manuelle Eingabe im Hauptbildschirm.
      }
      paintLocate();
    });

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
        optGlyph.innerHTML = icon(p.glyph);
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
      const isLocationSlide = !isProfileSlide && SLIDES[index - 1] === SLIDES[2];
      glyph.hidden = isProfileSlide;
      profileList.hidden = !isProfileSlide;
      locate.hidden = !isLocationSlide;

      if (isProfileSlide) {
        title.textContent = t('onboard.profile.title');
        body.textContent = t('onboard.profile.body');
        paintProfiles();
      } else {
        const s = SLIDES[index - 1];
        glyph.innerHTML = icon(s.glyph);
        title.textContent = t(s.titleKey);
        body.textContent = t(s.bodyKey);
      }

      paintLocate();
      locateMsg.hidden = !isLocationSlide || locateState !== 'denied';
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
    card.append(glyph, title, body, profileList, locate, locateMsg, dots, actions);
    overlay.append(card);
    document.body.append(overlay);
    paint();
  });
}
