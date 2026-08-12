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
 * Hält eine (gedämpfte) Farbe lesbar: reicht der Kontrast zum Grund nicht,
 * wird sie schrittweise zum kräftigen Anker gezogen, bis das Ziel erreicht ist.
 */
const ensureContrast = (color: string, bg: string, min: number, anchor: string): string => {
  let out = color;
  for (let t = 0.1; t <= 1 && contrast(out, bg) < min; t += 0.1) {
    out = mixHex(color, anchor, t);
  }
  return out;
};

/**
 * Kontinuierliche Palette: Anteil `nightness` (0 = voller Tag, 1 = tiefe Nacht)
 * aus der Sonnenhöhe. Der Übergang atmet weich (§11.4), statt abrupt zu kippen.
 *
 * Wichtig: Flächen (bg, surface, Akzente, Ringe) werden weich gemischt, damit
 * das Zifferblatt atmet. Die Schriftfarben dürfen jedoch nicht durch dasselbe
 * Mittelgrau laufen wie der Grund — sonst kreuzen sich Text und Hintergrund bei
 * Dämmerung und werden unlesbar. Sie kippen deshalb kontrastbasiert auf die
 * lesbare Seite, statt linear gemischt zu werden.
 */
export function paletteForElevation(elevation: number): { palette: Palette; nightness: number } {
  // Über +6° voll Tag, unter −6° voll Nacht, dazwischen linear gemischt.
  const nightness = elevation >= 6 ? 0 : elevation <= -6 ? 1 : (6 - elevation) / 12;
  const keys = Object.keys(DAY) as (keyof Palette)[];
  const palette = Object.fromEntries(
    keys.map((k) => [k, mixHex(DAY[k], NIGHT[k], nightness)]),
  ) as unknown as Palette;

  // Textseite nach Hintergrundhelligkeit wählen (kein Durchmischen durch Grau).
  const side = contrast(DAY.text, palette.bg) >= contrast(NIGHT.text, palette.bg) ? DAY : NIGHT;
  // Am Dämmerungspunkt (Grund im Mittelgrau) reicht die Basisfarbe knapp nicht
  // für AA — dort minimal Richtung Rein-Schwarz/-Weiß nachziehen. Tag/Nacht
  // bleiben unberührt, weil ihr Kontrast dort ohnehin weit über der Schwelle liegt.
  palette.text = ensureContrast(side.text, palette.bg, 4.5, side === DAY ? '#000000' : '#FFFFFF');
  // Gedämpfter Text bleibt gedämpft, aber garantiert lesbar (Ziel ~AA für Fließtext).
  palette.textDim = ensureContrast(side.textDim, palette.bg, 4, side.text);
  // Text auf Akzentflächen an die tatsächlich gemischte Akzentfarbe koppeln.
  palette.onAccent =
    contrast(DAY.onAccent, palette.accent) >= contrast(NIGHT.onAccent, palette.accent)
      ? DAY.onAccent
      : NIGHT.onAccent;

  return { palette, nightness };
}
