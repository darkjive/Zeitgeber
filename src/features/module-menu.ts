/**
 * Modul-Menü — Sammelstelle für die optionalen Fähigkeits-Panels.
 *
 * Hält die Hauptoberfläche ruhig (Spec §11, §7.4): statt einer wachsenden
 * Knopfleiste öffnet ein einziger Eintrag ein Raster aller Module. Wer nichts
 * sucht, sieht nichts davon.
 */

import type { Translator } from '../i18n';

export interface ModuleEntry {
  labelKey: string;
  glyph: string;
  open: () => void;
}

export function openModuleMenu(entries: ModuleEntry[], t: Translator): void {
  const overlay = document.createElement('div');
  overlay.className = 'onboard';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  const card = document.createElement('div');
  card.className = 'onboard__card modmenu';
  card.innerHTML = `
    <h2 class="onboard__title">${t('modules.title')}</h2>
    <p class="chrono__intro">${t('modules.subtitle')}</p>
    <div class="modmenu__grid"></div>
    <div class="onboard__actions"><span></span><button class="btn btn--ghost" data-close>${t('modules.close')}</button></div>
  `;
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  const grid = card.querySelector('.modmenu__grid') as HTMLElement;
  for (const entry of entries) {
    const btn = document.createElement('button');
    btn.className = 'modmenu__item';
    btn.innerHTML = `<span class="modmenu__glyph">${entry.glyph}</span><span>${t(entry.labelKey)}</span>`;
    btn.addEventListener('click', () => {
      overlay.remove();
      entry.open();
    });
    grid.appendChild(btn);
  }

  (card.querySelector('[data-close]') as HTMLElement).addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}
