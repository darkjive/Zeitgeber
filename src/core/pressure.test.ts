/**
 * Validierung der Luftdruck-Einordnung (Spec §26, §28).
 * Qualitative Aussage in drei Stufen, Schwelle 1 hPa über ~3 h.
 */

import { describe, expect, it } from 'vitest';
import { pressureTrend, type PressurePoint } from './pressure';

/** Stündliche Reihe ab 00:00 UTC am 20.08.2026. */
const series = (values: number[]): PressurePoint[] =>
  values.map((hpa, i) => ({ time: new Date(Date.UTC(2026, 7, 20, i)), hpa }));

const at = (hour: number): Date => new Date(Date.UTC(2026, 7, 20, hour));

describe('pressureTrend', () => {
  it('meldet fallend bei deutlichem Abfall über 3 h', () => {
    const r = pressureTrend(series([1015, 1014, 1013, 1011]), at(3));
    expect(r?.trend).toBe('falling');
    expect(r?.deltaHpa).toBeCloseTo(-4, 1);
  });

  it('meldet steigend bei deutlichem Anstieg über 3 h', () => {
    const r = pressureTrend(series([1000, 1001, 1002, 1004]), at(3));
    expect(r?.trend).toBe('rising');
    expect(r?.deltaHpa).toBeCloseTo(4, 1);
  });

  it('meldet stabil, solange die Änderung unter 1 hPa bleibt', () => {
    const r = pressureTrend(series([1012, 1012.4, 1011.8, 1012.3]), at(3));
    expect(r?.trend).toBe('stable');
  });

  it('liefert null, wenn die Reihe keine zwei Stützstellen hergibt', () => {
    expect(pressureTrend([], at(3))).toBeNull();
    expect(pressureTrend(series([1013]), at(3))).toBeNull();
  });
});
