/**
 * Validierung des Zifferblatt-Overlays (Spec §22, §29).
 *
 * Das Overlay ist ein Mapping vorhandener Ableitungen auf Bögen/Marker; geprüft
 * werden die strukturellen Invarianten, damit die Ansicht sich darauf verlassen
 * kann.
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { sunTimes } from './astro-engine';
import { buildOverlay, outdoorOverlay } from './dial-overlay';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const DAY = new Date('2026-06-21T10:00:00Z'); // Sonne hoch über Karlsruhe

describe('outdoorOverlay', () => {
  it('liefert je zwei goldene und blaue Bögen, alle mit from < to', () => {
    const ov = outdoorOverlay(DAY, KA);
    expect(ov.id).toBe('outdoor');
    const golden = ov.arcs.filter((a) => a.labelKey === 'outdoor.goldenHour');
    const blue = ov.arcs.filter((a) => a.labelKey === 'outdoor.blueHour');
    expect(golden).toHaveLength(2);
    expect(blue).toHaveLength(2);
    for (const a of [...golden, ...blue]) {
      expect(a.from).not.toBeNull();
      expect(a.to).not.toBeNull();
      expect(a.from!.getTime()).toBeLessThan(a.to!.getTime());
    }
  });

  it('setzt den Restlicht-Marker auf das Ende der bürgerlichen Dämmerung', () => {
    const ov = outdoorOverlay(DAY, KA);
    expect(ov.markers).toHaveLength(1);
    const mk = ov.markers[0];
    expect(mk.labelKey).toBe('outdoor.lightEnds');
    expect(mk.hollow).toBe(true);
    const civilDusk = sunTimes(DAY, KA).civilDusk;
    expect(mk.at!.getTime()).toBe(civilDusk!.getTime());
  });

  it('buildOverlay gibt für null kein Overlay zurück', () => {
    expect(buildOverlay(null, DAY, KA)).toBeNull();
    expect(buildOverlay('outdoor', DAY, KA)?.id).toBe('outdoor');
  });
});
