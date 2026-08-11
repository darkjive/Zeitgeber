/**
 * Ansicht `object-list` — „Heute Nacht sichtbar" (Spec §24).
 * Die zugänglichste Ansicht für Einsteiger. Sortiert nach Höhe, zeigt nur
 * Objekte über dem Horizont; kennt keine einzelnen Provider (Achse B).
 */

import type { CelestialObject } from '../core/types';
import { azimuthDirKey, type Translator } from '../i18n';

const KIND_GLYPH: Record<string, string> = {
  sun: '☀',
  moon: '🌙',
  planet: '🪐',
  star: '★',
};

export function renderObjectList(objects: CelestialObject[], t: Translator): HTMLElement {
  const list = document.createElement('ul');
  list.className = 'objlist';

  const visible = objects
    .filter((o) => o.horizontal.elevation > -0.833)
    .sort((a, b) => b.horizontal.elevation - a.horizontal.elevation);

  if (visible.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'objlist__empty';
    empty.textContent = t('list.empty');
    list.appendChild(empty);
    return list;
  }

  for (const o of visible) {
    const li = document.createElement('li');
    li.className = 'objlist__row';

    const glyph = document.createElement('span');
    glyph.className = 'objlist__glyph';
    glyph.textContent = KIND_GLYPH[o.kind] ?? '•';

    const name = document.createElement('span');
    name.className = 'objlist__name';
    name.textContent = t(o.nameKey);
    if (o.metadata?.needsOptics) {
      const optics = document.createElement('span');
      optics.className = 'objlist__tag';
      optics.textContent = t('list.optics');
      name.appendChild(optics);
    }

    const meta = document.createElement('span');
    meta.className = 'objlist__meta';
    const dir = t(azimuthDirKey(o.horizontal.azimuth));
    const elev = Math.round(o.horizontal.elevation);
    const mag = o.magnitude != null ? ` · ${o.magnitude > 0 ? '+' : ''}${o.magnitude.toFixed(1)} mag` : '';
    meta.textContent = `${elev}° · ${dir}${mag}`;

    li.append(glyph, name, meta);
    list.appendChild(li);
  }

  return list;
}
