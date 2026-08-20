/**
 * Validierung der Kreis-Zuordnung und Severity-Einordnung für Zivilschutz-
 * Warnungen (Spec §10, §38.1). Rein lokal, kein Netzwerk hier.
 */

import { describe, expect, test } from 'vitest';
import { arsFromAgs, nearestKreis, severityColor } from './civil-warnings';

const FRANKFURT = { latitude: 50.119, longitude: 8.645 };
const NORDATLANTIK = { latitude: 45.0, longitude: -30.0 };

describe('nearestKreis', () => {
  test('findet Frankfurt am Main für Frankfurter Koordinaten', () => {
    const hit = nearestKreis(FRANKFURT);
    expect(hit?.name).toBe('Frankfurt am Main');
    expect(hit?.ags).toBe('06412');
    expect(hit!.distanceKm).toBeLessThan(5);
  });

  test('liefert null weit ausserhalb Deutschlands', () => {
    expect(nearestKreis(NORDATLANTIK)).toBeNull();
  });
});

describe('arsFromAgs', () => {
  test('füllt den 5-stelligen Kreis-AGS auf die von der BBK-API geforderte 12-stellige ARS auf', () => {
    // Live gegen warnung.bund.de geprüft (2026-08-20): .../064120000000.json
    // antwortet HTTP 200, .../06412.json mit HTTP 400.
    expect(arsFromAgs('06412')).toBe('064120000000');
  });
});

describe('severityColor', () => {
  test('liefert für jede Stufe eine eigene Farbe', () => {
    const colors = new Set((['Minor', 'Moderate', 'Severe', 'Extreme'] as const).map(severityColor));
    expect(colors.size).toBe(4);
  });
});
