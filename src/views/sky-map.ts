/**
 * Ansicht `sky-map` — 2D-Himmelskarte (Spec §24).
 *
 * Auf Web die vollwertige Hauptansicht (§38.2), nicht ein Ersatz für die
 * Kamera. Azimutal-äquidistante Projektion der Himmelskuppel: Zenit in der
 * Mitte, Horizont am Rand. Blick nach oben — daher Nord oben, Ost links.
 * Zeigt alle aktiven Provider-Objekte an ihrer realen Alt/Az-Position; kennt
 * keine einzelnen Provider (Achse B).
 */

import { paletteForElevation } from '../core/theme-engine';
import type { CelestialObject } from '../core/types';
import { azimuthDirKey, type Translator } from '../i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 400;
const C = SIZE / 2;
const R = 180;

const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** Alt/Az → Kartenpunkt. Nord oben, Ost links (Blick nach oben). */
function project(elevation: number, azimuth: number): [number, number] {
  const r = ((90 - elevation) / 90) * R;
  const a = azimuth * (Math.PI / 180);
  return [C - r * Math.sin(a), C - r * Math.cos(a)];
}

const objName = (o: CelestialObject, t: Translator): string =>
  (o.metadata?.name as string) ?? t(o.nameKey);

export function renderSkyMap(objects: CelestialObject[], t: Translator): { svg: SVGElement; a11yLabel: string } {
  const sun = objects.find((o) => o.kind === 'sun');
  const { palette, nightness } = paletteForElevation(sun?.horizontal.elevation ?? -90);

  const svg = el('svg', { viewBox: `0 0 ${SIZE} ${SIZE}`, width: '100%', height: '100%', role: 'img', class: 'skymap' });

  // Himmelshintergrund: nachts dunkel, tags hell — folgt der Theme-Engine.
  svg.appendChild(el('circle', { cx: C, cy: C, r: R, fill: nightness > 0.5 ? palette.ringNight : palette.ringDay, opacity: 0.35 }));

  // Höhenringe 30° / 60° und Horizont.
  for (const alt of [30, 60]) {
    svg.appendChild(el('circle', { cx: C, cy: C, r: ((90 - alt) / 90) * R, fill: 'none', stroke: palette.textDim, 'stroke-width': 0.75, 'stroke-dasharray': '2 5', opacity: 0.6 }));
  }
  svg.appendChild(el('circle', { cx: C, cy: C, r: R, fill: 'none', stroke: palette.textDim, 'stroke-width': 1.25 }));

  // Himmelsrichtungen am Horizont (N oben, O links, S unten, W rechts).
  for (const [dir, az] of [['N', 0], ['O', 90], ['S', 180], ['W', 270]] as const) {
    const [x, y] = project(-4, az);
    const label = el('text', { x, y, fill: palette.text, 'font-size': 12, 'font-weight': '600', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    label.textContent = dir;
    svg.appendChild(label);
  }
  // Zenit-Markierung.
  svg.appendChild(el('circle', { cx: C, cy: C, r: 1.5, fill: palette.textDim }));

  // Nur Objekte über dem Horizont zeichnen.
  const visible = objects.filter((o) => o.horizontal.elevation > 0);

  // Sterne zuerst (Hintergrund), dann Planeten, dann Sonne/Mond obenauf.
  const order: Record<string, number> = { star: 0, dso: 0, planet: 1, satellite: 1, aircraft: 1, moon: 2, sun: 3 };
  visible.sort((a, b) => (order[a.kind] ?? 1) - (order[b.kind] ?? 1));

  for (const o of visible) {
    const [x, y] = project(o.horizontal.elevation, o.horizontal.azimuth);
    if (o.kind === 'star') {
      const rad = Math.max(0.8, 2.6 - (o.magnitude ?? 2) * 0.7);
      svg.appendChild(el('circle', { cx: x, cy: y, r: rad, fill: palette.text, opacity: 0.85 }));
    } else if (o.kind === 'sun') {
      svg.appendChild(el('circle', { cx: x, cy: y, r: 9, fill: palette.accent }));
      addLabel(svg, x, y, objName(o, t), palette.text);
    } else if (o.kind === 'moon') {
      const illum = (o.metadata?.illumination as number) ?? 0.5;
      const g = el('g', {});
      g.appendChild(el('circle', { cx: x, cy: y, r: 7, fill: palette.secondary }));
      g.appendChild(el('circle', { cx: x - (1 - illum) * 7, cy: y, r: 7, fill: palette.surface, opacity: 0.55 }));
      svg.appendChild(g);
      addLabel(svg, x, y, objName(o, t), palette.text);
    } else {
      svg.appendChild(el('circle', { cx: x, cy: y, r: 4, fill: palette.secondary }));
      addLabel(svg, x, y, objName(o, t), palette.textDim);
    }
  }

  const visNames = visible
    .filter((o) => o.kind !== 'star')
    .map((o) => objName(o, t))
    .slice(0, 6)
    .join(', ');
  const brightestStar = visible.find((o) => o.kind === 'star');
  const dir = sun ? t(azimuthDirKey(sun.horizontal.azimuth)) : '';
  const a11yLabel = t('map.a11y', {
    count: String(visible.length),
    objects: visNames || '—',
    star: brightestStar ? objName(brightestStar, t) : '—',
    dir,
  });
  svg.setAttribute('aria-label', a11yLabel);

  return { svg, a11yLabel };
}

function addLabel(svg: SVGElement, x: number, y: number, text: string, color: string): void {
  const label = el('text', { x: x + 10, y, fill: color, 'font-size': 10, 'dominant-baseline': 'central' });
  label.textContent = text;
  svg.appendChild(label);
}
