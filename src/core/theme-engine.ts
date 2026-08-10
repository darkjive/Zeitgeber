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
  accent: '#C94F3D',
  secondary: '#2B3A42',
  text: '#1A1A1A',
  textDim: '#6B6B6B',
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
  text: '#E8E8E8',
  textDim: '#8A8F9C',
  ringDay: '#3A4A2E',
  ringGolden: '#5A4A2E',
  ringCivil: '#4A3550',
  ringNautical: '#2E3358',
  ringAstro: '#1B2044',
  ringNight: '#0E1224',
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

/**
 * Kontinuierliche Palette: Anteil `nightness` (0 = voller Tag, 1 = tiefe Nacht)
 * aus der Sonnenhöhe. Der Übergang atmet weich (§11.4), statt abrupt zu kippen.
 */
export function paletteForElevation(elevation: number): { palette: Palette; nightness: number } {
  // Über +6° voll Tag, unter −6° voll Nacht, dazwischen linear gemischt.
  const nightness = elevation >= 6 ? 0 : elevation <= -6 ? 1 : (6 - elevation) / 12;
  const keys = Object.keys(DAY) as (keyof Palette)[];
  const palette = Object.fromEntries(
    keys.map((k) => [k, mixHex(DAY[k], NIGHT[k], nightness)]),
  ) as unknown as Palette;
  return { palette, nightness };
}
