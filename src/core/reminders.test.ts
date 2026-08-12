/**
 * Validierung des Erinnerungs-Kerns (§reminders).
 */

import { describe, expect, it } from 'vitest';
import type { GeoLocation } from './astro-engine';
import { shutterWindow } from './comfort';
import { collectReminders, comfortReminders, isWarmSeason, outdoorReminders } from './reminders';

const KA: GeoLocation = { latitude: 49.0069, longitude: 8.4037 };
const SUMMER = new Date('2026-07-15T09:00:00Z');
const WINTER = new Date('2026-01-15T09:00:00Z');

describe('isWarmSeason', () => {
  it('erkennt Nord-Sommer und Nord-Winter', () => {
    expect(isWarmSeason(SUMMER, KA.latitude)).toBe(true);
    expect(isWarmSeason(WINTER, KA.latitude)).toBe(false);
  });

  it('ist auf der Südhalbkugel gespiegelt', () => {
    const sydney = -33.87;
    expect(isWarmSeason(new Date('2026-01-15T00:00:00Z'), sydney)).toBe(true);
    expect(isWarmSeason(new Date('2026-07-15T00:00:00Z'), sydney)).toBe(false);
  });
});

describe('comfortReminders', () => {
  it('liefert im Sommer Fassaden- und Lüft-Hinweise, im Winter keine', () => {
    expect(comfortReminders(WINTER, KA)).toHaveLength(0);
    const summer = comfortReminders(SUMMER, KA);
    const keys = summer.map((e) => e.msgKey);
    expect(keys).toContain('remind.comfort.south');
    expect(keys).toContain('remind.comfort.ventilate');
  });

  it('setzt den Südfassaden-Hinweis mit 20 min Vorlauf auf den Verschattungsbeginn', () => {
    const south = comfortReminders(SUMMER, KA).find((e) => e.msgKey === 'remind.comfort.south');
    expect(south).toBeDefined();
    expect(south!.leadMin).toBe(20);
    const expected = shutterWindow(SUMMER, KA, 180).start;
    expect(south!.at.getTime()).toBe(expected!.getTime());
    // ids enden auf den Tagesschlüssel (für die Entdopplung).
    expect(south!.id.endsWith('2026-07-15')).toBe(true);
  });
});

describe('outdoorReminders & collectReminders', () => {
  it('outdoor meldet die goldene Stunde am Abend', () => {
    const keys = outdoorReminders(SUMMER, KA).map((e) => e.msgKey);
    expect(keys).toContain('remind.outdoor.golden');
  });

  it('collectReminders bündelt nur die gewählten Kategorien', () => {
    const onlyComfort = collectReminders(SUMMER, KA, ['comfort']);
    expect(onlyComfort.every((e) => e.msgKey.startsWith('remind.comfort'))).toBe(true);
    const both = collectReminders(SUMMER, KA, ['comfort', 'outdoor']);
    expect(both.length).toBeGreaterThan(onlyComfort.length);
  });
});
