/**
 * Fähigkeit `about` — Info- & Unterstützen-Bereich (Spec §36, §38.3).
 * Dezente Platzierung der Spenden-Hinweise, nie in der Hauptoberfläche.
 */

import { APP_VERSION, support } from '../config/support';
import type { Translator } from '../i18n';

export function openAbout(t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const links = `<a class="about__link" href="${support.paypal}" target="_blank" rel="noopener">PayPal</a>`;

  const card = document.createElement('div');
  card.className = 'onboard__card about';
  card.innerHTML = `
    <div class="about__mark">☀</div>
    <h2 class="onboard__title">${t('app.title')}</h2>
    <p class="about__tag">${t('app.tagline')}</p>
    <p class="about__body">${t('about.opensource')}</p>

    <div class="about__support">
      <span class="about__support-k">${t('about.support')}</span>
      <div class="about__links">${links}</div>
    </div>

    <p class="about__meta">
      <a class="about__link" href="${support.repo}" target="_blank" rel="noopener">${t('about.repo')}</a>
      · v${APP_VERSION} · MIT
    </p>

    <div class="onboard__actions">
      <span></span>
      <button class="btn btn--primary" id="about-close">${t('about.close')}</button>
    </div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  (card.querySelector('#about-close') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
