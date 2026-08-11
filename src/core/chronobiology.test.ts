/**
 * Validierung der Chronobiologie-Berechnung (Spec §26).
 * MCTQ-Invarianten nach Roenneberg/Wittmann.
 */

import { describe, expect, it } from 'vitest';
import { analyzeSleep, combinedOffset, type SleepLog } from './chronobiology';

describe('analyzeSleep — sozialer Jetlag', () => {
  it('ist 0, wenn Arbeits- und freie Tage identisch sind', () => {
    const log: SleepLog = { workOnset: '23:00', workWake: '07:00', freeOnset: '23:00', freeWake: '07:00' };
    expect(analyzeSleep(log).socialJetlagMin).toBe(0);
  });

  it('wird positiv, wenn an freien Tagen später geschlafen wird', () => {
    const log: SleepLog = { workOnset: '23:00', workWake: '06:00', freeOnset: '01:00', freeWake: '09:00' };
    const r = analyzeSleep(log);
    expect(r.socialJetlagMin).toBeGreaterThan(60);
  });
});

describe('analyzeSleep — Chronotyp & ideales Fenster', () => {
  it('früher Schläfer wird als Frühtyp eingeordnet', () => {
    const log: SleepLog = { workOnset: '21:30', workWake: '05:00', freeOnset: '21:30', freeWake: '05:00' };
    expect(analyzeSleep(log).chronotypeKey.toLowerCase()).toContain('early');
  });

  it('später Schläfer wird als Spättyp eingeordnet', () => {
    const log: SleepLog = { workOnset: '02:00', workWake: '10:00', freeOnset: '02:00', freeWake: '10:00' };
    expect(analyzeSleep(log).chronotypeKey.toLowerCase()).toContain('late');
  });

  it('ideales Schlaffenster hat die Länge des Freitagsschlafs', () => {
    const log: SleepLog = { workOnset: '23:00', workWake: '06:00', freeOnset: '23:30', freeWake: '08:00' };
    const r = analyzeSleep(log);
    let dur = r.idealWakeMin - r.idealOnsetMin;
    if (dur <= 0) dur += 1440;
    expect(dur).toBeCloseTo(r.sleepDurationFreeMin, 0);
  });
});

describe('combinedOffset', () => {
  it('addiert die Beträge von Sonnenzeit-Versatz und sozialem Jetlag', () => {
    expect(combinedOffset(85, 45)).toBe(130);
    expect(combinedOffset(-85, 45)).toBe(130);
  });
});
