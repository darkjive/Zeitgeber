/**
 * theme-engine — Tag/Nacht als Kontinuum entlang der Sonnenhöhe (Spec §12).
 *
 * Tag und Nacht sind nicht binär, sondern werden kontinuierlich zwischen den
 * Dämmerungszonen interpoliert. Eigene Core-Ebene, von allen Modulen
 * konsumierbar — Overlays leiten ihre Kontrastfarbe hieraus ab.
 */

export type ZoneId = 'day' | 'goldenHour' | 'civil' | 'nautical' | 'astronomical' | 'night';

export interface Zone {
  id: ZoneId;
  /** Untere Sonnenhöhen-Grenze in Grad (inklusive). */
  min: number;
  /** Obere Grenze in Grad. */
  max: number;
  nameKey: string;
}

/** Zonen nach Sonnenhöhe (Spec §12, 5-Zonen-Modell erweitert um Golden Hour). */
export const ZONES: Zone[] = [
  { id: 'day', min: 6, max: 90, nameKey: 'zone.day' },
  { id: 'goldenHour', min: -0.833, max: 6, nameKey: 'zone.goldenHour' },
  { id: 'civil', min: -6, max: -0.833, nameKey: 'zone.civil' },
  { id: 'nautical', min: -12, max: -6, nameKey: 'zone.nautical' },
  { id: 'astronomical', min: -18, max: -12, nameKey: 'zone.astronomical' },
  { id: 'night', min: -90, max: -18, nameKey: 'zone.night' },
];

export function zoneForElevation(elevation: number): Zone {
  return ZONES.find((z) => elevation >= z.min && elevation < z.max) ?? ZONES[ZONES.length - 1];
}

export interface Palette {
  bg: string;
  surface: string;
  accent: string;
  secondary: string;
  text: string;
  textDim: string;
  /** Textfarbe auf Akzent-Flächen (Buttons) — kontraststark in beiden Themes. */
  onAccent: string;
  /** Ringfarbe der Zone auf dem Zifferblatt. */
  ringDay: string;
  ringGolden: string;
  ringCivil: string;
  ringNautical: string;
  ringAstro: string;
  ringNight: string;
}

// Tag- und Nacht-Basispaletten aus Spec §11.2.
const DAY: Palette = {
  bg: '#F7F5F0',
  surface: '#FFFFFF',
  // Etwas dunkleres Vermillion: Akzent-Text auf hellem Grund erreicht WCAG AA.
  accent: '#B23A2A',
  secondary: '#2B3A42',
  text: '#1A1A1A',
  textDim: '#5E5E5E',
  onAccent: '#FFFFFF',
  ringDay: '#FBD07A',
  ringGolden: '#F0A05A',
  ringCivil: '#C97A8C',
  ringNautical: '#6C6FA0',
  ringAstro: '#343A6B',
  ringNight: '#1A1E33',
};

const NIGHT: Palette = {
  // Echter Nachtsicht-Gedanke (§11.2): reduzierte Blauanteile, gedimmt.
  bg: '#0B0D12',
  surface: '#12151C',
  accent: '#6FE0C9',
  secondary: '#8D6FE7',
  text: '#ECECEC',
  textDim: '#A6ACBA',
  onAccent: '#08221D',
  // Natürlicher Sonnenuntergangs-Verlauf (Gold → Amber → Rosé → Violett →
  // Indigo → Nachtblau), gedimmt für den dunklen Grund. Kein Grün.
  ringDay: '#C9A94B',
  ringGolden: '#BE7B41',
  ringCivil: '#9A5570',
  ringNautical: '#5A5490',
  ringAstro: '#333765',
  ringNight: '#1E2140',
};

const hex = (h: string): [number, number, number] => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const toHex = (c: number): string => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0');
const mixHex = (a: string, b: string, t: number): string => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  return `#${toHex(ar + (br - ar) * t)}${toHex(ag + (bg - ag) * t)}${toHex(ab + (bb - ab) * t)}`;
};

/** Relative Leuchtdichte nach WCAG 2.1 (0 = Schwarz, 1 = Weiß). */
const relLuminance = (h: string): number => {
  const lin = (c: number): number => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hex(h);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

/** Kontrastverhältnis zweier Farben nach WCAG (1 = identisch, 21 = max). */
const contrast = (a: string, b: string): number => {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

/**
 * Kleinstes t in [0,1], für das `test(t)` erfüllt ist (test ist monoton in t
 * von false auf true) — Bisektion statt fester 10%-Schritte, damit das
 * Ergebnis mit der Eingabe stetig mitwandert statt in Stufen zu springen.
 */
const smallestPassing = (test: (t: number) => boolean): number => {
  if (test(0)) return 0;
  if (!test(1)) return 1;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (test(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
};

/**
 * Hält eine (gedämpfte) Farbe lesbar: reicht der Kontrast zum Grund nicht,
 * wird sie fein zum kräftigen Anker gezogen, bis das Ziel erreicht ist.
 */
const ensureContrast = (color: string, bg: string, min: number, anchor: string): string => {
  if (contrast(color, bg) >= min) return color;
  const t = smallestPassing((t) => contrast(mixHex(color, anchor, t), bg) >= min);
  return mixHex(color, anchor, t);
};

/**
 * Gegenstück zu ensureContrast: statt die Textfarbe aufzuhellen, wird hier
 * der (bunte) Hintergrund fein Richtung Schwarz gezogen, bis weißer Text
 * darauf lesbar ist. So bleibt der Farbton der Dämmerungszone erkennbar,
 * statt ihn durch reines Aufhellen des Texts zu verlieren.
 */
const darkenForContrast = (bg: string, fg: string, min: number): string => {
  if (contrast(fg, bg) >= min) return bg;
  const t = smallestPassing((t) => contrast(fg, mixHex(bg, '#000000', t)) >= min);
  const out = mixHex(bg, '#000000', t);
  return out;
};

/**
 * Hintergrund entlang der Dämmerungszonen (§12): dieselben Ringfarben, die
 * auch auf dem Zifferblatt erscheinen, statt einer generischen Aufhellung/
 * Abdunklung. Zwischen den Zonengrenzen wird weich gemischt (kein Kippen).
 */
const NIGHT_BLACK = '#000000';

const zoneBackground = (elevation: number, palette: Palette): string => {
  const stops: [number, string][] = [
    [6, palette.ringGolden],
    [-0.833, palette.ringCivil],
    [-6, palette.ringNautical],
    [-12, palette.ringAstro],
    [-18, palette.ringNight],
    // In tiefer Nacht verliert sich die Ringfarbe zu reinem Schwarz — kein
    // Navi-Grund mehr, sondern die Nacht selbst.
    [-30, NIGHT_BLACK],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [hiElev, hiColor] = stops[i];
    const [loElev, loColor] = stops[i + 1];
    if (elevation >= loElev) {
      const t = (hiElev - elevation) / (hiElev - loElev);
      return mixHex(hiColor, loColor, t);
    }
  }
  return NIGHT_BLACK;
};

/** Sonnenaufgang/-untergang als vertikaler Verlauf: warmer Horizont unten,
 * kühlerer Zenit oben — beide Enden derselben Dämmerungskurve, nur an leicht
 * verschobenen "Sonnenhöhen" abgegriffen, statt einer Fläche in Einheitsfarbe. */
const SKY_SPREAD = 9;

const skyGradient = (
  elevation: number,
  palette: Palette,
  nightness: number,
  textColor: string,
): { top: string; bottom: string } => {
  // Auch tagsüber kein flaches Weiß: horizontnah (niedrige Sonnenhöhe) ein
  // blasses Gold, im Zenit reines Grundweiß — dieselbe Ringfarbe wie in der
  // Golden Hour, nur stark verdünnt, damit der Übergang an der Zonengrenze
  // nicht abrupt kippt.
  const warmth = Math.min(1, Math.max(0, (30 - elevation) / 24));
  const daySky = {
    top: mixHex(DAY.bg, palette.ringGolden, warmth * 0.08),
    bottom: mixHex(DAY.bg, palette.ringGolden, warmth * 0.22),
  };
  const nightSky = {
    top: darkenForContrast(zoneBackground(elevation - SKY_SPREAD, palette), textColor, 4.5),
    bottom: darkenForContrast(
      zoneBackground(Math.min(elevation + SKY_SPREAD, 6), palette),
      textColor,
      4.5,
    ),
  };
  // Stetig statt eines harten Kippens an der Tag/Nacht-Grenze (elevation = 6°):
  // dieselbe `nightness`-Rampe wie beim Rest der Palette blendet zwischen der
  // blassen Tagesformel und der kontrastgezwungenen Nachtformel.
  return {
    top: mixHex(daySky.top, nightSky.top, nightness),
    bottom: mixHex(daySky.bottom, nightSky.bottom, nightness),
  };
};

/** Kubische Ease-Kurve (glatte Enden) für den Tag/Nacht-Übergang. */
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * Kontinuierliche Palette: Anteil `nightness` (0 = voller Tag, 1 = tiefe Nacht)
 * aus der Sonnenhöhe. Der Übergang atmet weich (§11.4), statt abrupt zu kippen.
 *
 * Flächen (bg, surface, Akzente, Ringe) werden weich gemischt, damit das
 * Zifferblatt atmet. Bei der Textfarbe ist echtes Weichmischen zwischen
 * Schwarz und Weiß dagegen unmöglich, ohne die Lesbarkeit zu verlieren: laut
 * WCAG-Kontrastformel kann ein Mischton in der Mitte (Grau) auf einem
 * mittelhellen Grund nie AA erreichen — dort schafft nur reines Schwarz
 * *oder* reines Weiß genug Kontrast, nie beides gleichzeitig und nie ein
 * Grauton dazwischen. Der Kippunkt selbst lässt sich also nicht wegrechnen,
 * nur an die richtige Stelle legen: statt an einer fest verdrahteten
 * Sonnenhöhe (6°) unabhängig vom tatsächlichen (weich gemischten)
 * Hintergrund zu kippen, entscheidet hier der tatsächliche Kontrast gegen
 * den aktuellen Grund — dadurch fällt der Kippunkt exakt dorthin, wo Text
 * sonst unlesbar würde, nicht früher. Den verbleibenden Sprung selbst blendet
 * die CSS-`transition` auf `color`/`background-color` weich ein (styles.css).
 */
export function paletteForElevation(
  elevation: number,
): { palette: Palette; nightness: number; sky: { top: string; bottom: string } } {
  // Über +6° voll Tag, unter −6° voll Nacht, dazwischen linear gemischt.
  const nightness = elevation >= 6 ? 0 : elevation <= -6 ? 1 : (6 - elevation) / 12;
  const ease = smoothstep(nightness);
  const keys = (Object.keys(DAY) as (keyof Palette)[]).filter((k) => k !== 'bg');
  const palette = Object.fromEntries(
    keys.map((k) => [k, mixHex(DAY[k], NIGHT[k], nightness)]),
  ) as unknown as Palette;

  // Tagsüber bleibt der Hintergrund das helle Grundweiß; ab der Dämmerung
  // übernimmt er weich die Zonenfarbe des Zifferblatt-Rings statt zu vergrauen
  // oder bei 6° hart umzuschalten.
  const twilightBg = zoneBackground(elevation, palette);
  const dayBg = mixHex(DAY.bg, twilightBg, ease);
  // Bunte Zonenfarben (v.a. Golden Hour) reichen an Helligkeit oft nicht aus,
  // um mit weißem Text AA zu erreichen — dieses Nachdunkeln ebenfalls weich
  // einblenden statt abrupt zuzuschlagen.
  const darkBg = darkenForContrast(dayBg, NIGHT.text, 4.5);
  palette.bg = mixHex(dayBg, darkBg, ease);

  // Textfarbe: Schwarz oder Weiß, je nachdem was gegen den tatsächlichen
  // Hintergrund mehr Kontrast bringt — nicht an einer festen Sonnenhöhe
  // festgemacht (siehe Funktionskommentar oben).
  const preferWhite = contrast('#FFFFFF', palette.bg) > contrast('#000000', palette.bg);
  palette.text = ensureContrast(
    preferWhite ? NIGHT.text : DAY.text,
    palette.bg,
    4.5,
    preferWhite ? '#FFFFFF' : '#000000',
  );
  // Gedämpfter Text bleibt gedämpft, aber garantiert lesbar (Ziel ~AA für Fließtext).
  palette.textDim = ensureContrast(preferWhite ? NIGHT.textDim : DAY.textDim, palette.bg, 4, palette.text);

  // Karten/Flächen (surface) folgen demselben weichen Kurs wie der Grund —
  // sonst bleibt die Fläche zu hell für den gedämpften Text.
  const darkSurface = darkenForContrast(palette.surface, palette.textDim, 3);
  palette.surface = mixHex(palette.surface, darkSurface, ease);

  // Text auf Akzentflächen an die tatsächlich gemischte Akzentfarbe koppeln.
  palette.onAccent =
    contrast(DAY.onAccent, palette.accent) >= contrast(NIGHT.onAccent, palette.accent)
      ? DAY.onAccent
      : NIGHT.onAccent;

  const sky = skyGradient(elevation, palette, nightness, palette.text);

  return { palette, nightness, sky };
}
