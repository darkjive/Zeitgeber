/**
 * Validierung des Jahreskreises (Spec §4, §32.2).
 * Der Solver muss die Sonne exakt auf die Ziel-Ekliptiklänge bringen, und die
 * Ereignisse müssen in den korrekten Monaten liegen.
 */

import { describe, expect, it } from 'vitest';
import { sunEclipticLongitude } from './astro-engine';
import { nextWheelEvent, wheelOfYear } from './wheel-of-year';

describe('wheelOfYear — Genauigkeit', () => {
  const events = wheelOfYear(2026);

  it('trifft jede Ziel-Ekliptiklänge auf < 0,02°', () => {
    for (const e of events) {
      const lon = sunEclipticLongitude(e.date);
      const diff = Math.min(Math.abs(lon - e.longitude), 360 - Math.abs(lon - e.longitude));
      expect(diff).toBeLessThan(0.02);
    }
  });

  it('legt die Sonnenwenden und Tagundnachtgleichen in die richtigen Monate', () => {
    const by = (key: string) => events.find((e) => e.key === key)!.date.getUTCMonth();
    expect(by('wheel.springEquinox')).toBe(2); // März
    expect(by('wheel.summerSolstice')).toBe(5); // Juni
    expect(by('wheel.autumnEquinox')).toBe(8); // September
    expect(by('wheel.winterSolstice')).toBe(11); // Dezember
  });

  it('liefert acht chronologisch geordnete Ereignisse', () => {
    expect(events).toHaveLength(8);
    for (let i = 1; i < events.length; i++) {
      expect(events[i].date.getTime()).toBeGreaterThan(events[i - 1].date.getTime());
    }
  });
});

describe('nextWheelEvent', () => {
  it('liegt in der Zukunft', () => {
    const now = new Date('2026-08-11T12:00:00Z');
    expect(nextWheelEvent(now).date.getTime()).toBeGreaterThan(now.getTime());
  });
});
