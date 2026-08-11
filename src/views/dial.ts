/**
 * Ansicht `dial` — das Zifferblatt, Kern der Anwendung (Spec §22).
 *
 * Zwei überlagerte Ringe (§26.4 als MVP-Vorstufe):
 *  · aussen  ein 24-Stunden-Zeitring, eingefärbt nach den Dämmerungszonen
 *            des Tages (§12). Sonnenmittag oben; der Sonnenhöchststand-Marker
 *            weicht sichtbar von 12:00 ab — der Sonnenzeit-Versatz (§2).
 *  · innen   ein Kompassring (Nord oben) mit Sonne und Mond an ihrer
 *            Azimut-Position (§22: dezente Marker der Provider).
 *
 * Reine Funktion von Zustand zu Bild, nicht an den Lebenszyklus gekoppelt —
 * Voraussetzung für Widgets und Wandmodus (§25).
 */

import type { GeoLocation } from '../core/astro-engine';
import { sunTimes } from '../core/astro-engine';
import { paletteForElevation, zoneForElevation } from '../core/theme-engine';
import type { CelestialObject } from '../core/types';
import { azimuthDirKey, type Translator } from '../i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 400;
const C = SIZE / 2;
const R_TIME_OUT = 190;
const R_TIME_IN = 150;
const R_COMPASS = 120;

export interface DialState {
  time: Date;
  location: GeoLocation;
  tzOffsetMinutes: number;
  objects: CelestialObject[];
  t: Translator;
}

const el = (tag: string, attrs: Record<string, string | number>): SVGElement => {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
};

/** Punkt auf Kreis; Winkel in Grad, 0 = oben, im Uhrzeigersinn. */
function polar(r: number, angleDeg: number): [number, number] {
  const a = (angleDeg - 90) * (Math.PI / 180);
  return [C + r * Math.cos(a), C + r * Math.sin(a)];
}

/** Pfad eines Ringsegments (annularer Sektor) zwischen zwei Winkeln. */
function annularSector(rOut: number, rIn: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0o, y0o] = polar(rOut, a0);
  const [x1o, y1o] = polar(rOut, a1);
  const [x1i, y1i] = polar(rIn, a1);
  const [x0i, y0i] = polar(rIn, a0);
  return (
    `M ${x0o} ${y0o} A ${rOut} ${rOut} 0 ${large} 1 ${x1o} ${y1o} ` +
    `L ${x1i} ${y1i} A ${rIn} ${rIn} 0 ${large} 0 ${x0i} ${y0i} Z`
  );
}

const localHour = (date: Date | null, tzOff: number): number | null => {
  if (!date) return null;
  return (((date.getTime() + tzOff * 60_000) / 3_600_000) % 24 + 24) % 24;
};

/** Legale Tagesstunde → Winkel: 12:00 oben, im Uhrzeigersinn über 24 h. */
const hourToAngle = (h: number): number => ((h - 12) / 24) * 360;

export function renderDial(state: DialState): { svg: SVGElement; a11yLabel: string } {
  const { time, location, tzOffsetMinutes: tz, objects, t } = state;
  const times = sunTimes(time, location);
  const { palette } = paletteForElevation(objects.find((o) => o.kind === 'sun')?.horizontal.elevation ?? -90);

  const svg = el('svg', {
    viewBox: `0 0 ${SIZE} ${SIZE}`,
    width: '100%',
    height: '100%',
    role: 'img',
    class: 'dial',
  });

  // --- Zonenbänder auf dem Zeitring ---------------------------------------
  const zoneColor: Record<string, string> = {
    night: palette.ringNight,
    astronomical: palette.ringAstro,
    nautical: palette.ringNautical,
    civil: palette.ringCivil,
    day: palette.ringDay,
  };

  // Grenzen des Tages als legale Stunden (null = Polartag/-nacht).
  const b = {
    astroDawn: localHour(times.astroDawn, tz),
    nautDawn: localHour(times.nauticalDawn, tz),
    civilDawn: localHour(times.civilDawn, tz),
    sunrise: localHour(times.sunrise, tz),
    sunset: localHour(times.sunset, tz),
    civilDusk: localHour(times.civilDusk, tz),
    nautDusk: localHour(times.nauticalDusk, tz),
    astroDusk: localHour(times.astroDusk, tz),
  };

  type Seg = { from: number; to: number; zone: string };
  const segs: Seg[] = [];
  const push = (from: number | null, to: number | null, zone: string) => {
    if (from == null || to == null) return;
    if (to <= from) return;
    segs.push({ from, to, zone });
  };

  if (times.sunrise && times.sunset) {
    push(0, b.astroDawn, 'night');
    push(b.astroDawn, b.nautDawn, 'astronomical');
    push(b.nautDawn, b.civilDawn, 'nautical');
    push(b.civilDawn, b.sunrise, 'civil');
    push(b.sunrise, b.sunset, 'day');
    push(b.sunset, b.civilDusk, 'civil');
    push(b.civilDusk, b.nautDusk, 'nautical');
    push(b.nautDusk, b.astroDusk, 'astronomical');
    push(b.astroDusk, 24, 'night');
  } else {
    // Polartag/-nacht: ganzer Ring in einer Zone (§10-nahe Sonderfälle).
    const zone = times.noonElevation > 0 ? 'day' : 'night';
    segs.push({ from: 0, to: 24, zone });
  }

  const zoneLayer = el('g', {});
  for (const s of segs) {
    zoneLayer.appendChild(
      el('path', {
        d: annularSector(R_TIME_OUT, R_TIME_IN, hourToAngle(s.from), hourToAngle(s.to)),
        fill: zoneColor[s.zone] ?? palette.ringNight,
      }),
    );
  }
  svg.appendChild(zoneLayer);

  // Stundenmarken (alle 3 h) + Beschriftung 0/6/12/18.
  const ticks = el('g', {});
  for (let h = 0; h < 24; h += 3) {
    const a = hourToAngle(h);
    const [x0, y0] = polar(R_TIME_OUT, a);
    const [x1, y1] = polar(R_TIME_OUT - 10, a);
    ticks.appendChild(el('line', { x1: x0, y1: y0, x2: x1, y2: y1, stroke: palette.textDim, 'stroke-width': 1 }));
    if (h % 6 === 0) {
      const [lx, ly] = polar(R_TIME_OUT - 24, a);
      const label = el('text', {
        x: lx,
        y: ly,
        fill: palette.text,
        'font-size': 13,
        'font-family': 'JetBrains Mono, monospace',
        'text-anchor': 'middle',
        'dominant-baseline': 'central',
      });
      label.textContent = String(h).padStart(2, '0');
      ticks.appendChild(label);
    }
  }
  svg.appendChild(ticks);

  // --- Sonnenhöchststand-Marker (der Versatz, sichtbar) -------------------
  const solarNoonHour = localHour(times.solarNoon, tz);
  if (solarNoonHour != null) {
    const a = hourToAngle(solarNoonHour);
    const [sx, sy] = polar((R_TIME_OUT + R_TIME_IN) / 2, a);
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: 9, fill: palette.accent }));
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: 9, fill: 'none', stroke: palette.bg, 'stroke-width': 2 }));
    // dünne Linie von 12:00-Position zum Marker verdeutlicht die Abweichung
    const [nx, ny] = polar((R_TIME_OUT + R_TIME_IN) / 2, hourToAngle(12));
    svg.appendChild(el('circle', { cx: nx, cy: ny, r: 3, fill: palette.textDim }));
  }

  // --- Kompassring innen: Sonne & Mond an ihrer Azimut-Position -----------
  svg.appendChild(el('circle', { cx: C, cy: C, r: R_COMPASS, fill: 'none', stroke: palette.textDim, 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
  for (const [dir, ang] of [['N', 0], ['O', 90], ['S', 180], ['W', 270]] as const) {
    const [dx, dy] = polar(R_COMPASS + 0, ang);
    const label = el('text', {
      x: dx,
      y: dy,
      fill: palette.textDim,
      'font-size': 10,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
    });
    label.textContent = dir;
    svg.appendChild(label);
  }

  // Planeten als dezente Marker (nur wenn der Layer aktiv ist, §7.4).
  for (const p of objects.filter((o) => o.kind === 'planet')) {
    if (p.horizontal.elevation <= -0.833) continue;
    const [px, py] = polar(R_COMPASS, p.horizontal.azimuth);
    svg.appendChild(el('circle', { cx: px, cy: py, r: 3.5, fill: palette.secondary, opacity: 0.9 }));
  }

  const sun = objects.find((o) => o.kind === 'sun');
  const moon = objects.find((o) => o.kind === 'moon');
  for (const obj of [moon, sun]) {
    if (!obj) continue;
    const above = obj.horizontal.elevation > -0.833;
    const [ox, oy] = polar(R_COMPASS, obj.horizontal.azimuth);
    if (obj.kind === 'sun') {
      svg.appendChild(el('circle', { cx: ox, cy: oy, r: above ? 11 : 7, fill: palette.accent, opacity: above ? 1 : 0.35 }));
    } else {
      const g = el('g', { opacity: above ? 1 : 0.3 });
      g.appendChild(el('circle', { cx: ox, cy: oy, r: 8, fill: palette.secondary }));
      // Beleuchtungsgrad als Sichel andeuten
      const illum = (obj.metadata?.illumination as number) ?? 0.5;
      g.appendChild(el('circle', { cx: ox - (1 - illum) * 8, cy: oy, r: 8, fill: palette.surface, opacity: 0.55 }));
      svg.appendChild(g);
    }
  }

  // --- Zeiger auf die aktuelle gesetzliche Zeit ---------------------------
  const nowHour = ((time.getTime() + tz * 60_000) / 3_600_000 % 24 + 24) % 24;
  const [hx, hy] = polar(R_TIME_OUT - 4, hourToAngle(nowHour));
  svg.appendChild(el('circle', { cx: C, cy: C, r: 4, fill: palette.text }));
  svg.appendChild(el('line', { x1: C, y1: C, x2: hx, y2: hy, stroke: palette.text, 'stroke-width': 2.5, 'stroke-linecap': 'round' }));

  // --- Barrierefreie Zustandsbeschreibung (§13) ---------------------------
  const sunElev = sun ? Math.round(sun.horizontal.elevation) : 0;
  const zone = t(zoneForElevation(sun?.horizontal.elevation ?? -90).nameKey);
  const dir = t(azimuthDirKey(sun?.horizontal.azimuth ?? 0));
  const timeStr = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(time);
  const a11yLabel = t('a11y.dialState', { elev: sunElev, dir, time: timeStr, zone });
  svg.setAttribute('aria-label', a11yLabel);

  return { svg, a11yLabel };
}
