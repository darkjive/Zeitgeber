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
import type { DialOverlay } from '../core/dial-overlay';
import { paletteForElevation, zoneForElevation } from '../core/theme-engine';
import type { CelestialObject } from '../core/types';
import { azimuthDirKey, type Translator } from '../i18n';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SIZE = 420;
const C = SIZE / 2;
const R_TIME_OUT = 190;
const R_TIME_IN = 150;
const R_OVERLAY = 136;
const R_COMPASS = 120;

/**
 * Planetenfarben, an den realen Farbeindruck angelehnt und gedämpft (§11).
 * Schlüssel = Objekt-ID des planetsProvider.
 */
const PLANET_COLOR: Record<string, string> = {
  mercury: '#9A9086',
  venus: '#E8D9A8',
  mars: '#C1603F',
  jupiter: '#D9A468',
  saturn: '#C9B27A',
  uranus: '#7FC4C8',
  neptune: '#5E7FC6',
};

/**
 * Radius nach Helligkeit — dieselbe Staffelung wie bei den Sternen in
 * sky-map.ts, nur mit größerem Basiswert: Planeten sollen vor dem Sternfeld
 * erkennbar bleiben. Gedeckelt, damit Venus den Kompassring nicht sprengt.
 */
const planetRadius = (magnitude = 2): number => Math.min(6.5, Math.max(2, 4.6 - magnitude * 0.7));

export interface DialState {
  time: Date;
  location: GeoLocation;
  tzOffsetMinutes: number;
  objects: CelestialObject[];
  t: Translator;
  /** Persönlicher Rhythmus (§26.4) — innerer Ring, wenn Chronobiologie aktiv. */
  chrono?: { idealOnsetMin: number; idealWakeMin: number; msfScMin: number } | null;
  /** Angeheftetes Modul-Overlay (Bögen/Marker), wenn eines gewählt ist. */
  overlay?: DialOverlay | null;
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

/** Gestrichener Bogen (nur Außenkante) zwischen zwei Winkeln. */
function arcStroke(r: number, a0: number, a1: number): string {
  const large = a1 - a0 > 180 ? 1 : 0;
  const [x0, y0] = polar(r, a0);
  const [x1, y1] = polar(r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
}

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
      const [lx, ly] = polar(R_TIME_OUT + 20, a);
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

  // --- Modul-Overlay: Bögen (Zeitfenster) + Marker (Zeitpunkte) -----------
  if (state.overlay) {
    const ov = el('g', { class: 'dial__overlay' });
    for (const arc of state.overlay.arcs) {
      const fromH = localHour(arc.from, tz);
      let toH = localHour(arc.to, tz);
      if (fromH == null || toH == null) continue;
      if (toH <= fromH) toH += 24; // Fenster über Mitternacht
      ov.appendChild(
        el('path', {
          d: arcStroke(R_OVERLAY, hourToAngle(fromH), hourToAngle(toH)),
          fill: 'none',
          stroke: arc.color,
          'stroke-width': 5,
          'stroke-linecap': 'round',
          opacity: 0.9,
        }),
      );
    }
    for (const mk of state.overlay.markers) {
      const h = localHour(mk.at, tz);
      if (h == null) continue;
      const [mx, my] = polar(R_OVERLAY, hourToAngle(h));
      if (mk.hollow) {
        ov.appendChild(el('circle', { cx: mx, cy: my, r: 4.5, fill: palette.bg, stroke: mk.color, 'stroke-width': 2 }));
      } else {
        ov.appendChild(el('circle', { cx: mx, cy: my, r: 4.5, fill: mk.color }));
      }
    }
    svg.appendChild(ov);
  }

  // --- Sonnenhöchststand-Marker (der Versatz, sichtbar) -------------------
  const solarNoonHour = localHour(times.solarNoon, tz);
  if (solarNoonHour != null) {
    const a = hourToAngle(solarNoonHour);
    const [sx, sy] = polar((R_TIME_OUT + R_TIME_IN) / 2, a);
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: 9, fill: palette.accent }));
    svg.appendChild(el('circle', { cx: sx, cy: sy, r: 9, fill: 'none', stroke: palette.bg, 'stroke-width': 1 }));
    // dünne Linie von 12:00-Position zum Marker verdeutlicht die Abweichung
    const [nx, ny] = polar((R_TIME_OUT + R_TIME_IN) / 2, hourToAngle(12));
    svg.appendChild(el('circle', { cx: nx, cy: ny, r: 3, fill: palette.textDim }));
  }

  // --- Kompassring innen: Sonne & Mond an ihrer Azimut-Position -----------
  svg.appendChild(el('circle', { cx: C, cy: C, r: R_COMPASS, fill: 'none', stroke: palette.textDim, 'stroke-width': 1, 'stroke-dasharray': '2 4' }));
  for (const [dir, ang] of [['N', 0], ['O', 90], ['S', 180], ['W', 270]] as const) {
    const [dx, dy] = polar(R_COMPASS + 14, ang);
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

  // --- Analoge Stunden-/Minuten-/Sekundenzeiger ---------------------------
  // Klassische 12-h-Uhr-Geometrie (0 = oben, im Uhrzeigersinn) als
  // vertrauter Lesehilfe-Layer — bewusst blass, damit Sonnenstand und
  // Zonenring optisch führend bleiben. Vor Sonne/Mond gezeichnet, damit
  // deren Marker im Überlappungsfall darüberliegen.
  const nowHour = ((time.getTime() + tz * 60_000) / 3_600_000 % 24 + 24) % 24;
  const minuteOfHour = (nowHour - Math.floor(nowHour)) * 60;
  const secondOfMinute = (minuteOfHour - Math.floor(minuteOfHour)) * 60;
  const hourAngle = (nowHour % 12) * 30;
  const minuteAngle = minuteOfHour * 6;
  const secondAngle = secondOfMinute * 6;
  const hands = el('g', { opacity: 0.32 });
  const [hhx, hhy] = polar(65, hourAngle);
  hands.appendChild(el('line', { x1: C, y1: C, x2: hhx, y2: hhy, stroke: palette.text, 'stroke-width': 3, 'stroke-linecap': 'round' }));
  const [mhx, mhy] = polar(100, minuteAngle);
  hands.appendChild(el('line', { x1: C, y1: C, x2: mhx, y2: mhy, stroke: palette.text, 'stroke-width': 2, 'stroke-linecap': 'round' }));
  const [shx, shy] = polar(128, secondAngle);
  hands.appendChild(el('line', { x1: C, y1: C, x2: shx, y2: shy, stroke: palette.accent, 'stroke-width': 1, 'stroke-linecap': 'round' }));
  svg.appendChild(hands);

  // Planeten (nur wenn der Layer aktiv ist, §7.4): Größe nach Helligkeit,
  // eigene Farbe. Der Name steht nicht mehr dauerhaft am Ring (überlagerte
  // sich mit Himmelsrichtungen und anderen Markern), sondern nur als Tooltip:
  // natives <title> für Maus-Hover, data-name für den Touch-Tooltip in main.ts.
  for (const p of objects.filter((o) => o.kind === 'planet')) {
    if (p.horizontal.elevation <= -0.833) continue;
    const [px, py] = polar(R_COMPASS, p.horizontal.azimuth);
    const dot = el('circle', {
      cx: px,
      cy: py,
      r: planetRadius(p.magnitude),
      fill: PLANET_COLOR[p.id] ?? palette.secondary,
      class: 'dial__planet',
      'data-name': t(p.nameKey),
    });
    const title = el('title', {});
    title.textContent = t(p.nameKey);
    dot.appendChild(title);
    svg.appendChild(dot);
  }

  const sun = objects.find((o) => o.kind === 'sun');
  const moon = objects.find((o) => o.kind === 'moon');
  for (const obj of [moon, sun]) {
    if (!obj) continue;
    const above = obj.horizontal.elevation > -0.833;
    const [ox, oy] = polar(R_COMPASS, obj.horizontal.azimuth);
    if (obj.kind === 'sun') {
      // Warmes Gold statt des Rot-Akzents (der bei Nacht sogar türkis wäre) —
      // dieselbe Farbe wie der Tagesring, dazu kurze Strahlen für den Sonnen-Look.
      const r = above ? 9 : 6;
      // Blende die Kompass-Linie hinter dem Marker aus, damit dieser bei
      // reduzierter Deckkraft (unter dem Horizont) trotzdem darüber liegt.
      svg.appendChild(el('circle', { cx: ox, cy: oy, r, fill: palette.bg }));
      const g = el('g', { opacity: above ? 1 : 0.35, class: 'dial__planet', 'data-name': t('object.sun') });
      for (let i = 0; i < 8; i++) {
        const rad = (i / 8) * 2 * Math.PI;
        g.appendChild(
          el('line', {
            x1: ox + Math.cos(rad) * (r + 3),
            y1: oy + Math.sin(rad) * (r + 3),
            x2: ox + Math.cos(rad) * (r + 7),
            y2: oy + Math.sin(rad) * (r + 7),
            stroke: palette.ringDay,
            'stroke-width': 2,
            'stroke-linecap': 'round',
          }),
        );
      }
      g.appendChild(el('circle', { cx: ox, cy: oy, r, fill: palette.ringDay }));
      const title = el('title', {});
      title.textContent = t('object.sun');
      g.appendChild(title);
      svg.appendChild(g);
    } else {
      // Blende die Kompass-Linie hinter dem Marker aus, damit dieser bei
      // reduzierter Deckkraft (unter dem Horizont) trotzdem darüber liegt.
      svg.appendChild(el('circle', { cx: ox, cy: oy, r: 8, fill: palette.bg }));
      const g = el('g', { opacity: above ? 1 : 0.3, class: 'dial__planet', 'data-name': t('object.moon') });
      g.appendChild(el('circle', { cx: ox, cy: oy, r: 8, fill: palette.secondary }));
      // Beleuchtungsgrad als Sichel andeuten
      const illum = (obj.metadata?.illumination as number) ?? 0.5;
      g.appendChild(el('circle', { cx: ox - (1 - illum) * 8, cy: oy, r: 8, fill: palette.surface, opacity: 0.55 }));
      const title = el('title', {});
      title.textContent = t('object.moon');
      g.appendChild(title);
      svg.appendChild(g);
    }
  }

  // --- Innerer Ring: persönlicher Rhythmus (§26.4) ------------------------
  if (state.chrono) {
    const R_SLEEP = 92;
    const onsetH = state.chrono.idealOnsetMin / 60;
    let wakeH = state.chrono.idealWakeMin / 60;
    if (wakeH <= onsetH) wakeH += 24; // Schlaffenster über Mitternacht
    svg.appendChild(
      el('path', {
        d: annularSector(R_SLEEP + 5, R_SLEEP - 5, hourToAngle(onsetH), hourToAngle(wakeH)),
        fill: palette.secondary,
        opacity: 0.5,
      }),
    );
    const [mx, my] = polar(R_SLEEP, hourToAngle(state.chrono.msfScMin / 60));
    svg.appendChild(el('circle', { cx: mx, cy: my, r: 4, fill: palette.secondary }));
  }

  // --- Zeiger auf die aktuelle gesetzliche Zeit ---------------------------
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
