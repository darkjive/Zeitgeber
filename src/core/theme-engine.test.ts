import { describe, it, expect } from 'vitest';
import { paletteForElevation, zoneForElevation } from './theme-engine';

/** Kontrastverhältnis nach WCAG 2.1 (Duplikat der internen Formel für den Test). */
function contrast(a: string, b: string): number {
  const lum = (h: string): number => {
    const parts = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const lin = (c: number): number => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, bl] = parts;
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const la = lum(a);
  const lb = lum(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe('paletteForElevation — Lesbarkeit über den ganzen Tageslauf', () => {
  // Von hoch am Himmel bis tiefe Nacht, in feinen Schritten durch die Dämmerung.
  const elevations = [45, 12, 6, 4, 2, 1, 0, -1, -2, -4, -6, -12, -18, -45];

  it('Fließtext bleibt bei jeder Sonnenhöhe gut lesbar (>= AA)', () => {
    for (const el of elevations) {
      const { palette } = paletteForElevation(el);
      expect(contrast(palette.text, palette.bg), `text@${el}°`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('gedämpfter Text bleibt auch in der Dämmerung lesbar', () => {
    for (const el of elevations) {
      const { palette } = paletteForElevation(el);
      // Grund und Fläche prüfen — Dim-Text erscheint auf beiden.
      expect(contrast(palette.textDim, palette.bg), `dim/bg@${el}°`).toBeGreaterThanOrEqual(3.5);
      expect(contrast(palette.textDim, palette.surface), `dim/surface@${el}°`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Text auf Akzentflächen bleibt lesbar', () => {
    for (const el of elevations) {
      const { palette } = paletteForElevation(el);
      expect(contrast(palette.onAccent, palette.accent), `onAccent@${el}°`).toBeGreaterThanOrEqual(3);
    }
  });

  it('Tag- und Nacht-Extreme behalten ihre Basisfarben', () => {
    expect(paletteForElevation(45).palette.text).toBe('#1A1A1A');
    expect(paletteForElevation(-45).palette.text).toBe('#ECECEC');
  });

  it('nightness läuft monoton von Tag (0) nach Nacht (1)', () => {
    expect(paletteForElevation(20).nightness).toBe(0);
    expect(paletteForElevation(0).nightness).toBeCloseTo(0.5, 5);
    expect(paletteForElevation(-20).nightness).toBe(1);
  });

  it('zoneForElevation trifft die Dämmerungszonen', () => {
    expect(zoneForElevation(30).id).toBe('day');
    expect(zoneForElevation(2).id).toBe('goldenHour');
    expect(zoneForElevation(-3).id).toBe('civil');
    expect(zoneForElevation(-30).id).toBe('night');
  });
});
